import type { QuestCompletion } from '../types/quest';
import { percent } from '../utils/progress';
import { clearedQuestIds, questState } from '../utils/quests';
import { mockPilot } from './mockData';
import { mockSectors } from './mockSectors';

// Stand-in for POST /api/quests/:id/complete while there's no backend for it.
// Mutates the mock pilot and sectors so the dashboard and sector map show the
// new progress. The real endpoint must do all of this server-side, including
// checking the quest was actually unlocked and every objective was passed.

// Gear handed out the first time a quest is cleared (a nice-to-have feature)
const GEAR_REWARDS: Record<number, QuestCompletion['gearFound']> = {
  5: { slot: 'armour', name: 'Scout Plating' },
};

// Each level needs a bit more XP than the last
const LEVEL_XP_STEP = 250;

export function mockCompleteQuest(questId: number): QuestCompletion {
  const sector = mockSectors.find((s) => s.quests.some((q) => q.questId === questId));
  const quest = sector?.quests.find((q) => q.questId === questId);
  if (!sector || !quest) throw new Error('Quest not found.');

  const firstClear = !quest.cleared;
  const statesBefore = new Map(sector.quests.map((q) => [q.questId, questState(q, clearedQuestIds(sector.quests))]));
  const percentBefore = percent(clearedQuestIds(sector.quests).size, sector.quests.length);

  quest.cleared = true;
  sector.shipQuestId = questId;
  const cleared = clearedQuestIds(sector.quests);

  // XP, with the active buff applied and one charge used
  const buff = mockPilot.activeBuff;
  const xpEarned = quest.xpReward * (buff?.xpMultiplier ?? 1);
  if (buff) {
    buff.questsRemaining -= 1;
    if (buff.questsRemaining <= 0) mockPilot.activeBuff = undefined;
  }

  const before = { level: mockPilot.level, levelXp: mockPilot.levelXp, levelXpRequired: mockPilot.levelXpRequired };
  mockPilot.totalXp += xpEarned;
  mockPilot.levelXp += xpEarned;
  while (mockPilot.levelXp >= mockPilot.levelXpRequired) {
    mockPilot.levelXp -= mockPilot.levelXpRequired;
    mockPilot.level += 1;
    mockPilot.levelXpRequired += LEVEL_XP_STEP;
  }
  const after = { level: mockPilot.level, levelXp: mockPilot.levelXp, levelXpRequired: mockPilot.levelXpRequired };

  // Gear and unlocks only count on the first clear
  let gearFound: QuestCompletion['gearFound'];
  if (firstClear) {
    mockPilot.questsCleared += 1;
    const gear = GEAR_REWARDS[questId];
    if (gear && !mockPilot.loadout?.[gear.slot]) {
      gearFound = gear;
      mockPilot.loadout = { ...mockPilot.loadout, [gear.slot]: { rewardId: 100 + questId, name: gear.name } };
    }
  }

  const unlocked = sector.quests
    .filter((q) => statesBefore.get(q.questId) === 'locked' && questState(q, cleared) === 'available')
    .map((q) => ({ questId: q.questId, title: q.title, concept: q.concept }));

  const available = sector.quests.filter((q) => questState(q, cleared) === 'available');
  const next = available.find((q) => !q.isSideQuest) ?? available[0];

  return {
    baseXp: quest.xpReward,
    xpEarned,
    buff: buff && { name: buff.name, xpMultiplier: buff.xpMultiplier },
    before,
    after,
    sector: {
      displayName: sector.displayName,
      percentBefore,
      percentAfter: percent(cleared.size, sector.quests.length),
    },
    unlocked,
    gearFound,
    nextQuestId: next?.questId ?? null,
  };
}
