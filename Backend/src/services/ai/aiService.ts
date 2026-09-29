import { z } from 'zod';
import type { GenerateContentConfig } from '@google/genai';
import { generate, type ModelName } from '../../config/gemini.js';
import type { ChallengeContent, Proficiency } from '../../data/questContent.js';
import {
  chatPrompt,
  debriefPrompt,
  decodePrompt,
  evaluatePrompt,
  hintPrompt,
  systemInstruction,
  type ChatMessage,
  type DebriefObjective,
} from '../../prompts/shipsAi.js';

// =====================================================================
// Ship's AI service: every Gemini feature in the app goes through here.
// Prompts are built in src/prompts/shipsAi.ts; retries and the Flash ->
// Flash-Lite fallback come from generate() in src/config/gemini.ts.
// Pilot answers and pasted code are never logged or stored.
// =====================================================================

// Gemini replied, but not with something usable (empty, or JSON in the wrong shape)
export class AiReplyError extends Error {
  constructor(message = 'The Ship\'s AI sent back a garbled transmission.') {
    super(message);
    this.name = 'AiReplyError';
  }
}

async function askForText(model: ModelName, contents: string, config: GenerateContentConfig): Promise<string> {
  const { response } = await generate(model, contents, config);
  const text = response.text?.trim();
  if (!text) throw new AiReplyError();
  return text;
}

// JSON mode, validated with zod. One retry if the reply doesn't fit the schema.
async function askForJson<T>(
  model: ModelName,
  contents: string,
  config: GenerateContentConfig,
  schema: z.ZodType<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { response } = await generate(model, contents, { ...config, responseMimeType: 'application/json' });
    try {
      const parsed = schema.safeParse(JSON.parse(response.text ?? ''));
      if (parsed.success) return parsed.data;
    } catch {
      // Not valid JSON: fall through and retry
    }
  }
  throw new AiReplyError();
}

// ---------------------------------------------------------------------
// Bug-line guard. On bug hunts, finding the faulty line is the challenge, so
// replies must never name it. The model is never told the line, but it can
// still work it out from the code, so replies are checked here as a backstop:
// one retry, then the mention is replaced.
// ---------------------------------------------------------------------
function bugLinePattern(challenge: ChallengeContent): RegExp | null {
  if (challenge.challengeType !== 'bug_hunt' || challenge.bugLine === undefined) return null;
  // Matches "line 11", "Line #11", "lines 10 and 11", "lines 10-11", "L11"
  // String.raw keeps the regex backslashes (a normal template string turns \b into a backspace)
  const line = challenge.bugLine;
  return new RegExp(String.raw`\b(?:lines?\s*#?\s*(?:\d+\s*(?:-|–|to|and|,)\s*)*${line}|L${line})\b`, 'gi');
}

function leaksBugLine(challenge: ChallengeContent, ...texts: (string | undefined)[]): boolean {
  const pattern = bugLinePattern(challenge);
  return pattern !== null && texts.some((text) => text !== undefined && text.search(pattern) !== -1);
}

function redactBugLine(challenge: ChallengeContent, text: string): string {
  const pattern = bugLinePattern(challenge);
  return pattern ? text.replace(pattern, 'the right line') : text;
}

async function guardedText(challenge: ChallengeContent, ask: () => Promise<string>): Promise<string> {
  const first = await ask();
  if (!leaksBugLine(challenge, first)) return first;
  const second = await ask();
  return leaksBugLine(challenge, second) ? redactBugLine(challenge, second) : second;
}

export async function getHint(
  challenge: ChallengeContent,
  proficiency: Proficiency,
  tier: 1 | 2 | 3,
  answerDraft?: string,
  pastedCode?: string,
): Promise<string> {
  return guardedText(challenge, () =>
    askForText('flashLite', hintPrompt(challenge, tier, answerDraft, pastedCode), {
      systemInstruction: systemInstruction(proficiency, challenge.language),
      temperature: 0.6,
    }),
  );
}

// Keep prompts small: the mentor only needs the recent conversation
const CHAT_HISTORY_LIMIT = 12;

export async function mentorChat(
  challenge: ChallengeContent,
  proficiency: Proficiency,
  messages: ChatMessage[],
  pastedCode?: string,
): Promise<string> {
  return guardedText(challenge, () =>
    askForText('flash', chatPrompt(challenge, messages.slice(-CHAT_HISTORY_LIMIT), pastedCode), {
      systemInstruction: systemInstruction(proficiency, challenge.language),
      temperature: 0.7,
    }),
  );
}

const evaluationSchema = z.object({
  correct: z.boolean(),
  feedback: z.string().min(1),
  guidingQuestion: z.string().nullish(),
});

export interface Evaluation {
  correct: boolean;
  feedback: string;
  guidingQuestion?: string;
}

export async function evaluateAnswer(
  challenge: ChallengeContent,
  proficiency: Proficiency,
  answer: string,
  selectedLine?: number,
  pastedCode?: string,
): Promise<Evaluation> {
  const result = await askForJson(
    'flash',
    evaluatePrompt(challenge, answer, selectedLine, pastedCode),
    { systemInstruction: systemInstruction(proficiency, challenge.language), temperature: 0.2 },
    evaluationSchema,
  );

  // Bug hunts: the marked line is checked here, not left to the model
  const wrongLine =
    challenge.challengeType === 'bug_hunt' && challenge.bugLine !== undefined && selectedLine !== challenge.bugLine;
  const correct = result.correct && !wrongLine;

  // The model liked the explanation but the line is wrong: its feedback would
  // read as a pass, so swap in a message that matches the result
  if (wrongLine && result.correct) {
    return {
      correct: false,
      feedback:
        selectedLine === undefined
          ? 'Your explanation is on target, Pilot. Now mark the line where it happens: click it in the code viewer.'
          : `Your explanation is on target, Pilot, but line ${selectedLine} isn't where the bug lives.`,
      guidingQuestion: 'Which line in the code actually causes the problem you described?',
    };
  }

  const guidingQuestion = correct ? undefined : (result.guidingQuestion ?? undefined);

  // Don't let feedback give the bug's line away to a pilot who hasn't found it
  // (no retry here: re-marking could change the result)
  if (!correct && selectedLine !== challenge.bugLine && leaksBugLine(challenge, result.feedback, guidingQuestion)) {
    return {
      correct,
      feedback: redactBugLine(challenge, result.feedback),
      guidingQuestion: guidingQuestion && redactBugLine(challenge, guidingQuestion),
    };
  }

  return { correct, feedback: result.feedback, guidingQuestion };
}

const decodeSchema = z.object({
  sections: z.array(z.object({ lines: z.string(), explanation: z.string().min(1) })).min(1).max(8),
});

export type DecodedSection = z.infer<typeof decodeSchema>['sections'][number];

export async function decodeTransmission(
  challenge: ChallengeContent,
  proficiency: Proficiency,
  code: string,
): Promise<DecodedSection[]> {
  const { sections } = await askForJson(
    'flash',
    decodePrompt(challenge, code),
    { systemInstruction: systemInstruction(proficiency, challenge.language), temperature: 0.4 },
    decodeSchema,
  );
  return sections;
}

export async function writeDebrief(
  questTitle: string,
  language: string,
  proficiency: Proficiency,
  objectives: DebriefObjective[],
): Promise<string> {
  return askForText('flashLite', debriefPrompt(questTitle, objectives), {
    systemInstruction: systemInstruction(proficiency, language),
    temperature: 0.8,
  });
}
