import { readFileSync } from 'node:fs';

// Lets snippets start on the line after the opening backtick, like the seed file
export function code(snippet: string): string {
  return snippet.replace(/^\n/, '').trimEnd();
}

// Briefings are Markdown files in a briefings/ folder next to the curriculum
// file that uses them (pass that file's import.meta.url), so they can be
// written and previewed as ordinary Markdown
export function briefingFrom(moduleUrl: string) {
  return (name: string) => readFileSync(new URL(`./briefings/${name}.md`, moduleUrl), 'utf8').trim();
}
