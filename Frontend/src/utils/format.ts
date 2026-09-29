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

export function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    return err.response
      ? `Command responded with an error (${err.response.status}).`
      : 'Could not reach Questack command. Is the backend running?';
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}
