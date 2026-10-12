// The Ship's AI labels each decoded section with its lines, e.g. "1-4", "7",
// "10–12" or "lines 3 to 5". Returns the range to highlight, or undefined if
// the label has no line numbers in it.
export function parseLineRange(lines: string): { from: number; to: number } | undefined {
  const numbers = (lines.match(/\d+/g) ?? []).map(Number).filter((n) => n > 0);
  if (numbers.length === 0) return undefined;
  return { from: Math.min(...numbers), to: Math.max(...numbers) };
}
