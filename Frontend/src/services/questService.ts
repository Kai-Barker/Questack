import api from './api';
import type { QuestCompletion, QuestDetail } from '../types/quest';

// Locked quests come back 403; the message says why
export async function getQuest(questId: number): Promise<QuestDetail> {
  const res = await api.get<QuestDetail>(`/quests/${questId}`);
  return res.data;
}

// Clears a briefing objective: reading it is the whole objective
export async function markBriefingRead(challengeId: number): Promise<void> {
  await api.post(`/quests/objectives/${challengeId}/read`);
}

// Clears the quest and returns everything the Mission Debrief shows. No body:
// the server already recorded (and marked) every objective, so it decides.
export async function completeQuest(questId: number): Promise<QuestCompletion> {
  const res = await api.post<QuestCompletion>(`/quests/${questId}/complete`);
  return res.data;
}
