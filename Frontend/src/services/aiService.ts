import { isAxiosError } from 'axios';
import api from './api';
import type {
  ChatRequest,
  DebriefRequest,
  DecodedSection,
  DecodedTransmission,
  DecodeRequest,
  DecoderChatRequest,
  DecoderCheckRequest,
  DecoderCheckResult,
  DecoderRequest,
  EvaluateRequest,
  Evaluation,
  HintRequest,
} from '../types/ai';

// =====================================================================
// Ship's AI: the only place the frontend talks to the AI endpoints.
// Everything goes through the backend (Backend/src/services/ai/aiService.ts),
// which holds the Gemini key and the answer keys. There are no mocks here,
// so the backend must be running for the Ship's AI to answer.
// =====================================================================

export const COMMS_DOWN_MESSAGE = "Ship's AI comms are down. Try again in a moment, Pilot.";

// Thrown for any failed AI call; `message` is safe to show in the comms panel
export class CommsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommsError';
  }
}

// Gemini can take a while (retries, fallback model), so allow longer than usual
const AI_TIMEOUT_MS = 60_000;

async function post<T>(path: string, body: unknown): Promise<T> {
  try {
    const res = await api.post<T>(`/ai/${path}`, body, { timeout: AI_TIMEOUT_MS });
    return res.data;
  } catch (err) {
    const serverMessage = isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
    throw new CommsError(serverMessage ?? COMMS_DOWN_MESSAGE);
  }
}

export async function requestHint(request: HintRequest): Promise<string> {
  const { hint } = await post<{ hint: string }>('hint', request);
  return hint;
}

export async function sendMentorMessage(request: ChatRequest): Promise<string> {
  const { reply } = await post<{ reply: string }>('chat', request);
  return reply;
}

export async function evaluateAnswer(request: EvaluateRequest): Promise<Evaluation> {
  return post<Evaluation>('evaluate', request);
}

export async function decodeTransmission(request: DecodeRequest): Promise<DecodedSection[]> {
  const { sections } = await post<{ sections: DecodedSection[] }>('decode', request);
  return sections;
}

export async function requestDebrief(request: DebriefRequest): Promise<string> {
  const { debrief } = await post<{ debrief: string }>('debrief', request);
  return debrief;
}

// The standalone decoder (/decoder). Not a quest: no progress or XP, and the
// pasted code is never saved.

export async function decodeStandalone(request: DecoderRequest): Promise<DecodedTransmission> {
  return post<DecodedTransmission>('decoder', request);
}

export async function sendDecoderMessage(request: DecoderChatRequest): Promise<string> {
  const { reply } = await post<{ reply: string }>('decoder/chat', request);
  return reply;
}

export async function checkDecoderAnswer(request: DecoderCheckRequest): Promise<DecoderCheckResult> {
  return post<DecoderCheckResult>('decoder/check', request);
}
