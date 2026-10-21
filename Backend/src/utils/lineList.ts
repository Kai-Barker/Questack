// code_challenge_details.alt_bug_lines holds line numbers as text, e.g. '1,7'

// Anything that isn't a positive whole number is ignored
export function parseLineList(value: string | null): number[] {
  return (value ?? '')
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((line) => Number.isInteger(line) && line > 0);
}

// NULL when there are none
export function formatLineList(lines: number[]): string | null {
  return lines.length > 0 ? lines.join(',') : null;
}
