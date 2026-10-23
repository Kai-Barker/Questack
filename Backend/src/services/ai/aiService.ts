import { AsyncLocalStorage } from 'node:async_hooks';
import { z } from 'zod';
import type { GenerateContentConfig, GenerateContentResponse } from '@google/genai';
import { generate, logGenerateEvent, type GenerateEvent, type ModelName } from '../../config/gemini.js';
import type { ChallengeContent, Proficiency } from '../../types/content.js';
import {
  chatPrompt,
  debriefPrompt,
  decoderChatPrompt,
  decoderCheckPrompt,
  decoderPrompt,
  decodePrompt,
  evaluatePrompt,
  hintPrompt,
  systemInstruction,
  withoutPromptTags,
  type ChatMessage,
  type DebriefObjective,
} from '../../prompts/shipsAi.js';

// =====================================================================
// Ship's AI service: every Gemini feature in the app goes through here.
// Prompts are built in src/prompts/shipsAi.ts; retries and the fallback
// through the model list come from generate() in src/config/gemini.ts.
// Pasted code is never logged or stored. (Answers are saved with the
// pilot's progress by questService, never written to the server log.)
// =====================================================================

// ---------------------------------------------------------------------
// Usage tracking. withUsage() runs a feature and collects the model and
// token counts of every Gemini call it made (retries included), and every
// attempt that failed, so the controller can write them to ai_usage_logs.
// AsyncLocalStorage keeps each request's calls separate without passing a
// collector through every function.
// ---------------------------------------------------------------------
export interface AiUsage {
  model: ModelName;
  inputTokens: number;
  outputTokens: number;
}

// A Gemini attempt that got no reply: rate limited, busy, timed out or a network error
export interface AiFailure {
  model: string; // the exact model, e.g. gemini-3.7-flash
  status: number | null;
}

// Everything one feature asked of Gemini, filled in as it goes
export interface AiCalls {
  usage: AiUsage[];
  failures: AiFailure[];
}

const usageStore = new AsyncLocalStorage<AiCalls>();

function recordUsage(model: ModelName, response: GenerateContentResponse) {
  usageStore.getStore()?.usage.push({
    model,
    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: (response.usageMetadata?.candidatesTokenCount ?? 0) + (response.usageMetadata?.thoughtsTokenCount ?? 0),
  });
}

// Passed to generate(): failed attempts are recorded, and every event still
// gets its usual console line
function onGenerateEvent(event: GenerateEvent) {
  if (event.type === 'failed') usageStore.getStore()?.failures.push({ model: event.model, status: event.status });
  logGenerateEvent(event);
}

// Pass your own `calls` to keep what was collected even if `run` throws (see trackUsage.ts)
export async function withUsage<T>(
  run: () => Promise<T>,
  calls: AiCalls = { usage: [], failures: [] },
): Promise<{ result: T } & AiCalls> {
  const result = await usageStore.run(calls, run);
  return { result, ...calls };
}

// Gemini replied, but not with something usable (empty, or JSON in the wrong shape)
export class AiReplyError extends Error {
  constructor(message = 'The Ship\'s AI sent back a garbled transmission.') {
    super(message);
    this.name = 'AiReplyError';
  }
}

async function askForText(model: ModelName, contents: string, config: GenerateContentConfig): Promise<string> {
  const { response, modelUsed } = await generate(model, contents, config, onGenerateEvent);
  recordUsage(modelUsed, response);
  const text = withoutPromptTags(response.text ?? '');
  if (!text) throw new AiReplyError();
  return text;
}

// Every string in a JSON reply, cleaned the same way as a text reply
function cleanStrings<T>(value: T): T {
  if (typeof value === 'string') return withoutPromptTags(value) as T;
  if (Array.isArray(value)) return value.map(cleanStrings) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanStrings(v)])) as T;
  }
  return value;
}

// JSON mode, validated with zod. One retry if the reply doesn't fit the schema.
async function askForJson<T>(
  model: ModelName,
  contents: string,
  config: GenerateContentConfig,
  schema: z.ZodType<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { response, modelUsed } = await generate(
      model,
      contents,
      { ...config, responseMimeType: 'application/json' },
      onGenerateEvent,
    );
    recordUsage(modelUsed, response);
    try {
      const parsed = schema.safeParse(cleanStrings(JSON.parse(response.text ?? '')));
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
// The bug line and any other line where a fix also counts
function bugLines(challenge: ChallengeContent): number[] {
  if (challenge.challengeType !== 'bug_hunt' || challenge.bugLine === undefined) return [];
  return [challenge.bugLine, ...(challenge.altBugLines ?? [])];
}

function bugLinePattern(challenge: ChallengeContent): RegExp | null {
  const lines = bugLines(challenge);
  if (lines.length === 0) return null;
  // Matches "line 11", "Line #11", "lines 10 and 11", "lines 10-11", "L11"
  // String.raw keeps the regex backslashes (a normal template string turns \b into a backspace)
  const line = `(?:${lines.join('|')})`;
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
  // The second try can fail (out of time, comms down): the first reply,
  // redacted, is still worth sending
  const second = await ask().catch(() => null);
  if (second === null) return redactBugLine(challenge, first);
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
  // Flash-Lite: chat is the most frequent call, so it shouldn't use up Flash's
  // small free quota, which marking needs more
  return guardedText(challenge, () =>
    askForText('flashLite', chatPrompt(challenge, messages.slice(-CHAT_HISTORY_LIMIT), pastedCode), {
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
    // Temperature 0: marking should be as repeatable as the model allows
    { systemInstruction: systemInstruction(proficiency, challenge.language), temperature: 0 },
    evaluationSchema,
  );

  // Bug hunts: the marked line is checked here, not left to the model. Any
  // line where a fix would work counts (see code_challenge_details.alt_bug_lines).
  const lines = bugLines(challenge);
  const wrongLine = lines.length > 0 && (selectedLine === undefined || !lines.includes(selectedLine));
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

// ---------------------------------------------------------------------
// Standalone decoder (/decoder). Not a quest, so there's no objective
// content: just the sector's language, the pilot's rank and their code.
// ---------------------------------------------------------------------

const decoderSchema = z.object({
  sections: decodeSchema.shape.sections,
  question: z.string().trim().min(1).max(1000).nullish(),
});

export interface DecodedTransmission {
  sections: DecodedSection[];
  question: string | null; // null when the text wasn't code
}

export async function decodeStandalone(
  language: string,
  proficiency: Proficiency,
  code: string,
): Promise<DecodedTransmission> {
  const { sections, question } = await askForJson(
    'flash',
    decoderPrompt(code),
    { systemInstruction: systemInstruction(proficiency, language), temperature: 0.4 },
    decoderSchema,
  );
  return { sections, question: question ?? null };
}

export async function decoderChat(
  language: string,
  proficiency: Proficiency,
  code: string,
  messages: ChatMessage[],
  question?: string,
): Promise<string> {
  return askForText('flashLite', decoderChatPrompt(code, messages.slice(-CHAT_HISTORY_LIMIT), question), {
    systemInstruction: systemInstruction(proficiency, language),
    temperature: 0.7,
  });
}

export async function checkDecoderAnswer(
  language: string,
  proficiency: Proficiency,
  code: string,
  question: string,
  answer: string,
): Promise<Evaluation> {
  const result = await askForJson(
    'flash',
    decoderCheckPrompt(code, question, answer),
    { systemInstruction: systemInstruction(proficiency, language), temperature: 0.2 },
    evaluationSchema,
  );
  return {
    correct: result.correct,
    feedback: result.feedback,
    guidingQuestion: result.correct ? undefined : (result.guidingQuestion ?? undefined),
  };
}
