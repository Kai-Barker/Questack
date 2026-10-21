import type { SeedChallenge } from './questContent.js';

// Content checks shared by the seed script (database/seedQuests.ts) and the
// curriculum importer (database/importCurriculum.ts). They catch authoring
// mistakes the quest editor can't: a bug line that doesn't point at the bug.

// Problems with one objective, each starting with its label (e.g. "objective 2")
export function objectiveProblems(c: SeedChallenge, label: string): string[] {
  const problems: string[] = [];
  if ((c.type === 'read_and_explain' || c.type === 'bug_hunt') && (!c.code || !c.fileName || !c.answerKey)) {
    problems.push(`${label} needs code, a file name and an answer key`);
  }
  if (c.type === 'bug_hunt') {
    const line = c.bugLine === undefined ? undefined : c.code?.split('\n')[c.bugLine - 1];
    if (!line || !c.bugLineContains || !line.includes(c.bugLineContains)) {
      problems.push(`${label}: bugLine ${c.bugLine} doesn't contain "${c.bugLineContains}" (it's "${line?.trim()}")`);
    }
    for (const alt of c.altBugLines ?? []) {
      if (alt === c.bugLine || !c.code?.split('\n')[alt - 1]?.trim()) {
        problems.push(`${label}: altBugLines ${alt} must be another line of code, not the bug line or a blank line`);
      }
    }
  }
  if (/\blines?\s*\d/i.test(`${c.answerKey ?? ''} ${c.markingCriteria}`)) {
    problems.push(`${label}: answer key or marking criteria mentions a line number`);
  }
  if (c.type === 'briefing' && !c.instructions.trim()) problems.push(`${label}: the briefing is empty`);
  return problems;
}
