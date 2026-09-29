// =====================================================================
// Ship's AI playground
// Edit the SETTINGS below, then run:  npm run ai:playground
// Every run uses a little of your Gemini free-tier quota.
// =====================================================================
import 'dotenv/config';
import { FinishReason } from '@google/genai';
import { generate, MAX_OUTPUT_TOKENS, MODELS, type ModelName } from '../src/config/gemini.js';
import { COMMS_DOWN_MESSAGE, commsMessage } from '../src/utils/commsMessages.js';

const SETTINGS = {
  // Which model to use: 'flash' (smarter, slower) or 'flashLite' (faster, cheaper)
  // model: 'flashLite' as ModelName,
  model: 'flash' as ModelName,

  // The AI's persona and rules. This is where the mentor behaviour is shaped.
  systemInstruction: `You are the Ship's AI, a mentor aboard a starship in Questack.
The learner is a Cadet (complete beginner): use everyday metaphors, short sentences.
Never write the full solution. Give hints and end with one guiding question.`,

  // What the learner sends to the AI
  prompt: `What is a sorting algorithm in C#? Like Selection Sort, how does that work?`,

  // Randomness. 0 = focused and repeatable, 2 = very creative. Try 0.2 vs 1.5.
  temperature: 0.7,

  // Only pick from the most likely words adding up to this probability (0-1).
  // Lower = safer wording. Usually leave at 0.95 and adjust temperature instead.
  topP: 0.95,

  // Maximum length of the reply in tokens (~4 characters each), including hidden "thinking".
  // Leave as undefined to use the per-model defaults in src/config/gemini.ts
  // (MAX_OUTPUT_TOKENS: flash 4096, flashLite 1024), or set a number to override for this run.
  maxOutputTokens: undefined as number | undefined,

  // true = ask for a JSON reply (useful later for grading answers)
  jsonMode: false,
};

// ---------------------------------------------------------------------
// You shouldn't need to edit below here
// ---------------------------------------------------------------------
console.log(`Opening channel to ${MODELS[SETTINGS.model]}...\n`);

try {
  const { response, modelUsed, usedFallback } = await generate(
    SETTINGS.model,
    SETTINGS.prompt,
    {
      systemInstruction: SETTINGS.systemInstruction,
      temperature: SETTINGS.temperature,
      topP: SETTINGS.topP,
      ...(SETTINGS.maxOutputTokens !== undefined && { maxOutputTokens: SETTINGS.maxOutputTokens }),
      ...(SETTINGS.jsonMode && { responseMimeType: 'application/json' }),
    },
    (event) => console.log(`[COMMS] ${commsMessage(event)}`),
  );
  console.log();

  const usage = response.usageMetadata;
  console.log(response.text ?? '(empty reply: try raising maxOutputTokens)');
  console.log('\n---');
  console.log(`Model:         ${response.modelVersion ?? MODELS[modelUsed]}${usedFallback ? ' (fallback)' : ''}`);
  console.log(`Input tokens:  ${usage?.promptTokenCount ?? '?'}`);
  console.log(`Output tokens: ${usage?.candidatesTokenCount ?? '?'}`);
  if (usage?.thoughtsTokenCount) {
    console.log(`Thinking tokens: ${usage.thoughtsTokenCount}`);
  }
  if (response.candidates?.[0]?.finishReason === FinishReason.MAX_TOKENS) {
    console.log(`\nWarning: reply was cut off at the token limit (${MAX_OUTPUT_TOKENS[modelUsed]} for ${modelUsed}).`);
  }
} catch (err) {
  console.error(`[COMMS] ${COMMS_DOWN_MESSAGE}`);
  console.error('Details:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
