import { z } from 'zod';
import { HttpError } from './httpError.js';

// Shared by enlisting and changing callsign. The same rules are shown live on
// the Enlist screen and in the profile editor; these are the ones that count.
export const callsign = z
  .string()
  .trim()
  .min(3, 'Use at least 3 characters.')
  .max(20, 'Use 20 characters or fewer.')
  .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, - and _ only.');

// zod's default wording describes the schema ("Unrecognized key: role",
// "Invalid input: expected number, received string"), so it's replaced with
// plain messages. Messages written in the schemas themselves are kept.
function friendlyMessage(issue: z.core.$ZodIssue): string {
  if (issue.code === 'unrecognized_keys') return 'This request includes fields that can’t be changed.';
  if (issue.code === 'invalid_type' && issue.message.startsWith('Invalid input')) return 'Enter a valid value.';
  return issue.message;
}

// Validates a request body. Errors come back as { error, fields: { fieldName: message } }.
// With fullPaths, nested fields keep their whole path (e.g. objectives.2.answerKey),
// so a form with repeated sections can mark the right one.
export function parse<T>(schema: z.ZodType<T>, body: unknown, { fullPaths = false } = {}): T {
  const result = schema.safeParse(body);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = (fullPaths ? issue.path.map(String).join('.') : String(issue.path[0] ?? '')) || 'form';
    fields[field] ??= friendlyMessage(issue);
  }
  throw new HttpError(400, 'Check the highlighted fields.', fields);
}
