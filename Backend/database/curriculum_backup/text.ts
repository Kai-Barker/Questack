import { readFileSync } from 'node:fs';

// Lets snippets start on the line after the opening backtick, like the seed file
export function code(snippet: string): string {
  return snippet.replace(/^\n/, '').trimEnd();
}

// Objective code kept as real files in a snippets/ folder (used where the code
// would clash with a TypeScript template string, e.g. JavaScript's own
// `${...}` template literals). Trimmed like code() above.
export function snippetFrom(moduleUrl: string) {
  return (name: string) => readFileSync(new URL(`./snippets/${name}`, moduleUrl), 'utf8').replace(/\r\n?/g, '\n').replace(/^\n+/, '').trimEnd();
}

// Briefings are Markdown files in a briefings/ folder next to the curriculum
// file that uses them (pass that file's import.meta.url), so they can be
// written and previewed as ordinary Markdown
export function briefingFrom(moduleUrl: string) {
  return (name: string) => readFileSync(new URL(`./briefings/${name}.md`, moduleUrl), 'utf8').trim();
}
