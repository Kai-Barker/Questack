import api from './api';
import type { ProficiencyLevel } from '../types/pilot';
import type { SectorDetail } from '../types/sector';

export async function getSector(languageId: number): Promise<SectorDetail> {
  const res = await api.get<SectorDetail>(`/sectors/${languageId}`);
  return res.data;
}

// Changes the pilot's proficiency class in one sector (enlists them if they weren't yet)
export async function updateSectorRank(languageId: number, rank: ProficiencyLevel): Promise<void> {
  await api.patch(`/sectors/${languageId}/rank`, { proficiencyLevel: rank });
}
