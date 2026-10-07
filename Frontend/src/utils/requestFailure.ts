import { isAxiosError } from 'axios';

// A failed request, ready to show on a form
export interface RequestFailure {
  kind: 'invalid' | 'denied' | 'limited' | 'conflict' | 'offline' | 'error';
  message: string;
  fields: Record<string, string>; // per-field messages from the server
}

// Turns any API error into something a form can show: the server's message,
// its per-field messages, and a kind for choosing how to present it
export function toRequestFailure(err: unknown): RequestFailure {
  if (!isAxiosError<{ error?: string; fields?: Record<string, string> }>(err) || !err.response) {
    return { kind: 'offline', message: 'Could not reach Questack command. Check your connection and try again.', fields: {} };
  }
  const { status, data } = err.response;
  const message = data?.error ?? 'Something went wrong. Try again.';
  const fields = data?.fields ?? {};
  if (status === 400) return { kind: 'invalid', message, fields };
  if (status === 401) return { kind: 'denied', message, fields };
  if (status === 409) return { kind: 'conflict', message, fields };
  if (status === 429) return { kind: 'limited', message, fields };
  return { kind: 'error', message, fields };
}
