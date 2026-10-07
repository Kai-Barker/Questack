import { isAxiosError } from 'axios';

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// 'VEGA-7' -> 'VE'
export function initials(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase();
}

// For a load that failed. A 4xx from our own API carries a message written
// for pilots (e.g. "This quest is still locked…"), so that's shown as is.
export function errorMessage(err: unknown): string {
  if (isAxiosError<{ error?: string }>(err)) {
    if (!err.response) return 'Could not reach Questack command. Is the backend running?';
    const { status, data } = err.response;
    if (status >= 400 && status < 500 && typeof data?.error === 'string') return data.error;
    return `Command responded with an error (${status}).`;
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}
