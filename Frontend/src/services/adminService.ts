import api from './api';
import type {
  AdminOverview,
  AdminQuest,
  AdminQuestInput,
  AdminQuestSummary,
  AdminSector,
  AdminSession,
  AdminUser,
  AiFailureRow,
  AiUsageRow,
} from '../types/admin';

// The admin console. The backend re-reads the account's role on every one of
// these and answers 403 for anyone who isn't an admin, whatever the frontend shows.

// Asked each time an admin tab opens (see RequireAdmin)
export async function verifyAdminSession(): Promise<AdminSession> {
  const res = await api.get<AdminSession>('/admin/session');
  return res.data;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const res = await api.get<AdminOverview>('/admin/overview');
  return res.data;
}

// Quest editor

export interface QuestEditorIndex {
  sectors: AdminSector[];
  quests: AdminQuestSummary[];
}

// The sectors and every quest (drafts included), for the editor's side list
export async function getQuestEditorIndex(): Promise<QuestEditorIndex> {
  const [sectors, quests] = await Promise.all([
    api.get<{ sectors: AdminSector[] }>('/admin/sectors'),
    api.get<{ quests: AdminQuestSummary[] }>('/admin/quests'),
  ]);
  return { sectors: sectors.data.sectors, quests: quests.data.quests };
}

export async function getAdminQuest(questId: number): Promise<AdminQuest> {
  const res = await api.get<{ quest: AdminQuest }>(`/admin/quests/${questId}`);
  return res.data.quest;
}

export async function createQuest(input: AdminQuestInput): Promise<AdminQuest> {
  const res = await api.post<{ quest: AdminQuest }>('/admin/quests', input);
  return res.data.quest;
}

export async function updateQuest(questId: number, input: AdminQuestInput): Promise<AdminQuest> {
  const res = await api.put<{ quest: AdminQuest }>(`/admin/quests/${questId}`, input);
  return res.data.quest;
}

// Drafts only: the backend refuses to delete a published or already-flown quest
export async function deleteQuest(questId: number): Promise<void> {
  await api.delete(`/admin/quests/${questId}`);
}

// Users and the Ship's AI

export async function getAdminUsers(): Promise<AdminUser[]> {
  const res = await api.get<{ users: AdminUser[] }>('/admin/users');
  return res.data.users;
}

export async function setUserActive(userId: number, isActive: boolean): Promise<AdminUser> {
  const res = await api.patch<{ user: AdminUser }>(`/admin/users/${userId}`, { isActive });
  return res.data.user;
}

// Recent answered calls, and the failed attempts kept apart from them
export async function getAiUsage(): Promise<{ usage: AiUsageRow[]; failures: AiFailureRow[] }> {
  const res = await api.get<{ usage: AiUsageRow[]; failures: AiFailureRow[] }>('/admin/ai-usage');
  return res.data;
}
