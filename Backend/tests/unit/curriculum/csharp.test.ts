import { describe, expect, it } from 'vitest';
import { curriculumProblems, inPrerequisiteOrder, mapColumns, objectivesFor } from '../../../database/curriculum/build.js';
import { csharp } from '../../../database/curriculum/csharp/index.js';
import { isSeeded, type CurriculumQuest } from '../../../database/curriculum/types.js';
import { quests as seedQuests } from '../../../database/seeds/questContent.js';
import type { AdminObjective, AdminQuest } from '../../../src/models/adminQuestModel.js';

// The C# curriculum (database/curriculum/csharp), checked without a database:
// the same rules the quest editor and the importer apply, plus its shape

describe('the C# curriculum', () => {
  it('passes every rule the quest editor checks, and the bug-line checks', () => {
    expect(curriculumProblems(csharp)).toEqual([]);
  });

  it('teaches 28 quests: 21 on the main path and 7 side quests, over 19 map columns', () => {
    const side = csharp.quests.filter((q) => (isSeeded(q) ? seedQuests.find((s) => s.questId === q.seededQuestId)!.isSideQuest : q.isSideQuest));
    expect(csharp.quests).toHaveLength(28);
    expect(side).toHaveLength(7);
    expect(Math.max(...mapColumns(csharp.quests).values()) + 1).toBe(19);
  });

  it('starts with one quest and ends with events', () => {
    const columns = mapColumns(csharp.quests);
    expect(csharp.quests.filter((q) => columns.get(q.key) === 0).map((q) => q.key)).toEqual(['first-contact']);
    expect(columns.get('distress-beacon')).toBe(18);
  });

  it('opens every new quest with a briefing, and briefs every seeded quest but Cargo Manifest (it has its own)', () => {
    for (const quest of csharp.quests) {
      const objectives = objectivesFor(quest, null);
      if (quest.key === 'cargo-manifest') continue;
      expect(objectives[0], quest.key).toMatchObject({ type: 'briefing' });
      expect(objectives.filter((o) => o.type === 'briefing'), quest.key).toHaveLength(1);
    }
  });

  it('has no decode objectives left in the C# sector', () => {
    const csharpSeeds = seedQuests.filter((q) => q.languageId === 1);
    expect(csharpSeeds.flatMap((q) => q.challenges).filter((c) => c.type === 'decode_transmission')).toEqual([]);
    const fresh = csharp.quests.flatMap((q) => (isSeeded(q) ? [] : q.challenges));
    expect(fresh.filter((c) => c.type === 'decode_transmission')).toEqual([]);
  });

  it('covers the four pillars of OOP and script communication', () => {
    const concepts = csharp.quests.flatMap((q) => (isSeeded(q) ? [] : [q.concept]));
    expect(concepts).toEqual(
      expect.arrayContaining(['Encapsulation', 'Inheritance', 'Polymorphism', 'Abstraction', 'Constructors', 'Interfaces', 'Events']),
    );
  });
});

describe('inPrerequisiteOrder', () => {
  const quest = (key: string, prerequisites: string[]): CurriculumQuest => ({ key, seededQuestId: 1, prerequisites });

  it('puts every quest after its prerequisites', () => {
    const order = inPrerequisiteOrder([quest('c', ['b']), quest('b', ['a']), quest('a', [])]).map((q) => q.key);
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('refuses a circular chain', () => {
    expect(() => inPrerequisiteOrder([quest('a', ['b']), quest('b', ['a'])])).toThrow('Circular prerequisites: a → b → a');
  });

  it('refuses an unknown prerequisite', () => {
    expect(() => inPrerequisiteOrder([quest('a', ['ghost'])])).toThrow('a needs unknown quest "ghost"');
  });
});

describe('objectivesFor', () => {
  const objective = (challengeId: number, type: AdminObjective['type'], instructions = 'x'): AdminObjective => ({
    challengeId,
    type,
    instructions,
    fileName: null,
    codeSnippet: null,
    answerKey: null,
    markingCriteria: '',
    bugLine: null,
    altBugLines: [],
  });
  const saved = (objectives: AdminObjective[]): AdminQuest => ({
    questId: 2,
    languageId: 1,
    title: 'Sensor Sweep',
    concept: 'Data types',
    difficulty: 'easy',
    status: 'published',
    isSideQuest: false,
    storyText: '',
    xpReward: 75,
    displayOrder: 2,
    prerequisiteIds: [1],
    objectives,
  });
  const byKey = (key: string) => csharp.quests.find((q) => q.key === key)!;

  it('puts a seeded quest’s briefing first, then its objectives from the seed file with their fixed ids', () => {
    const objectives = objectivesFor(byKey('sensor-sweep'), saved([objective(201, 'read_and_explain'), objective(202, 'bug_hunt')]));
    expect(objectives.map((o) => [o.type, o.challengeId])).toEqual([
      ['briefing', undefined],
      ['read_and_explain', 201],
      ['bug_hunt', 202],
      ['read_and_explain', 203],
    ]);
  });

  it('updates an existing briefing in place, and keeps anything else added in the editor', () => {
    const objectives = objectivesFor(
      byKey('sensor-sweep'),
      saved([objective(1000500, 'briefing', 'old'), objective(201, 'read_and_explain'), objective(1000501, 'bug_hunt')]),
    );
    expect(objectives[0]).toMatchObject({ type: 'briefing', challengeId: 1000500 });
    expect(objectives[0]!.instructions).not.toBe('old');
    expect(objectives.at(-1)).toMatchObject({ challengeId: 1000501 });
  });

  it('keeps a briefing written in the editor when the curriculum doesn’t give one', () => {
    const objectives = objectivesFor(byKey('cargo-manifest'), saved([objective(1000400, 'briefing', 'Written by hand')]));
    expect(objectives[0]).toMatchObject({ type: 'briefing', challengeId: 1000400, instructions: 'Written by hand' });
  });

  it('reuses a new quest’s objective ids by position on a re-run', () => {
    const first = objectivesFor(byKey('first-contact'), null);
    expect(first.every((o) => o.challengeId === undefined)).toBe(true);

    const again = objectivesFor(byKey('first-contact'), saved(first.map((o, i) => objective(1000600 + i, o.type))));
    expect(again.map((o) => o.challengeId)).toEqual([1000600, 1000601, 1000602, 1000603]);
  });
});
