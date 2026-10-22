import { describe, expect, it } from 'vitest';
import { curriculumProblems, mapColumns, objectivesFor } from '../../../database/curriculum_backup/build.js';
import { javascript } from '../../../database/curriculum_backup/javascript/index.js';
import { isSeeded } from '../../../database/curriculum_backup/types.js';
import { quests as seedQuests } from '../../../database/seeds/questContent.js';

// The JavaScript curriculum (database/curriculum_backup/javascript), checked without
// a database, the same way as the C# one (csharp.test.ts)

const isSide = (q: (typeof javascript.quests)[number]) =>
  isSeeded(q) ? seedQuests.find((s) => s.questId === q.seededQuestId)!.isSideQuest : q.isSideQuest;

describe('the JavaScript curriculum', () => {
  it('passes every rule the quest editor checks, and the bug-line checks', () => {
    expect(curriculumProblems(javascript)).toEqual([]);
  });

  it('teaches 32 quests: 24 on the main path and 8 side quests, over 22 map columns', () => {
    expect(javascript.quests).toHaveLength(32);
    expect(javascript.quests.filter(isSide)).toHaveLength(8);
    expect(Math.max(...mapColumns(javascript.quests).values()) + 1).toBe(22);
  });

  it('starts with one quest and builds on all five seeded JavaScript quests', () => {
    const columns = mapColumns(javascript.quests);
    expect(javascript.quests.filter((q) => columns.get(q.key) === 0).map((q) => q.key)).toEqual(['hello-console']);
    const seeded = javascript.quests.flatMap((q) => (isSeeded(q) ? [q.seededQuestId] : []));
    expect(seeded.sort((a, b) => a - b)).toEqual([11, 12, 13, 14, 15]);
  });

  it('opens every quest with a briefing, including the seeded ones', () => {
    for (const quest of javascript.quests) {
      const objectives = objectivesFor(quest, null);
      expect(objectives[0], quest.key).toMatchObject({ type: 'briefing' });
      expect(objectives.filter((o) => o.type === 'briefing'), quest.key).toHaveLength(1);
    }
  });

  it('has no decode objectives left in any quest', () => {
    expect(seedQuests.flatMap((q) => q.challenges).filter((c) => c.type === 'decode_transmission')).toEqual([]);
    const fresh = javascript.quests.flatMap((q) => (isSeeded(q) ? [] : q.challenges));
    expect(fresh.filter((c) => c.type === 'decode_transmission')).toEqual([]);
  });

  it('covers every lesson in the C# path, in its JavaScript form', () => {
    const concepts = javascript.quests.flatMap((q) => (isSeeded(q) ? [] : [q.concept]));
    expect(concepts).toEqual(
      expect.arrayContaining([
        'Syntax basics',
        'Operators',
        'Strings',
        'Switch statements',
        'Enums',
        'Arrays',
        'Functions in depth',
        'Maps and sets',
        'Errors',
        'Objects',
        'Array methods',
        'References and copies',
        'Classes and objects',
        'Constructors',
        'Encapsulation',
        'Static members',
        'Inheritance',
        'Polymorphism',
        'Abstraction',
        'Interfaces and mixins',
        'Object communication',
        'Modules',
        'Callbacks and the event loop',
        'Events',
        'Promises and async/await',
      ]),
    );
  });

  it('keeps titles distinct from the C# path, so the admin quest list reads clearly', async () => {
    const { csharp } = await import('../../../database/curriculum_backup/csharp/index.js');
    const title = (q: (typeof javascript.quests)[number]) =>
      isSeeded(q) ? seedQuests.find((s) => s.questId === q.seededQuestId)!.title : q.title;
    const csharpTitles = new Set(csharp.quests.map(title));
    expect(javascript.quests.map(title).filter((t) => csharpTitles.has(t))).toEqual([]);
  });
});
