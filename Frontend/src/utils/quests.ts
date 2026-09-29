import type { ChallengeType, SectorQuest } from '../types/sector';

export type QuestState = 'cleared' | 'available' | 'locked';

// A quest is available once every prerequisite is cleared.
// The backend must still check this before letting a pilot deploy.
export function questState(quest: SectorQuest, clearedIds: ReadonlySet<number>): QuestState {
  if (quest.cleared) return 'cleared';
  return quest.prerequisiteIds.every((id) => clearedIds.has(id)) ? 'available' : 'locked';
}

export function clearedQuestIds(quests: SectorQuest[]): Set<number> {
  return new Set(quests.filter((q) => q.cleared).map((q) => q.questId));
}

const challengeLabels: Record<ChallengeType, string> = {
  read_and_explain: 'Read and explain',
  bug_hunt: 'Bug hunt',
  decode_transmission: 'Decode the transmission',
  architecture: 'Architecture design',
};

export function challengeLabel(type: ChallengeType): string {
  return challengeLabels[type];
}

export function questKind(quest: SectorQuest): string {
  if (quest.isHiveAssault) return 'Hive assault';
  return quest.isSideQuest ? 'Side quest' : 'Main quest';
}

// The quest the side panel opens on: the next main quest to do, else any
// available quest, else wherever the pilot's ship is parked.
export function defaultSelectedQuest(quests: SectorQuest[], shipQuestId: number | null): number | null {
  const cleared = clearedQuestIds(quests);
  const available = quests.filter((q) => questState(q, cleared) === 'available');
  return (
    available.find((q) => !q.isSideQuest)?.questId ?? available[0]?.questId ?? shipQuestId ?? quests[0]?.questId ?? null
  );
}
