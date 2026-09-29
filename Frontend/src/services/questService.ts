import api from './api';
import { mockNotFound, mockResponse } from './mockResponse';
import { mockCompleteQuest } from '../data/mockProgress';
import { mockQuests } from '../data/mockQuests';
import { mockSectors } from '../data/mockSectors';
import type { ObjectiveResult, QuestCompletion, QuestDetail } from '../types/quest';

// Flip to false once GET /api/quests/:id and POST /api/quests/:id/complete exist
const USE_MOCKS = true;

export async function getQuest(questId: number): Promise<QuestDetail> {
  if (USE_MOCKS) {
    const quest = mockQuests.find((q) => q.questId === questId);
    if (!quest) return mockNotFound("This quest's transmission hasn't been written yet.");

    // The real endpoint would join these in from the sector and the pilot's progress
    const sector = mockSectors.find((s) => s.languageId === quest.languageId);
    const position = sector?.quests.findIndex((q) => q.questId === questId) ?? -1;
    return mockResponse({
      ...quest,
      questNumber: position >= 0 ? position + 1 : undefined,
      pilotRank: sector?.proficiencyLevel,
    });
  }

  const res = await api.get<QuestDetail>(`/quests/${questId}`);
  return res.data;
}

// Records a cleared quest and returns everything the Mission Debrief shows
export async function completeQuest(questId: number, objectives: ObjectiveResult[]): Promise<QuestCompletion> {
  if (USE_MOCKS) return mockResponse(mockCompleteQuest(questId), 300);

  const res = await api.post<QuestCompletion>(`/quests/${questId}/complete`, { objectives });
  return res.data;
}
