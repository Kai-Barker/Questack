import api from './api';
import { mockNotFound, mockResponse } from './mockResponse';
import { mockSectors } from '../data/mockSectors';
import type { ProficiencyLevel } from '../types/pilot';
import type { SectorDetail } from '../types/sector';

// Flip to false once GET /api/sectors/:id and PATCH /api/sectors/:id/rank exist
const USE_MOCKS = true;

export async function getSector(languageId: number): Promise<SectorDetail> {
  if (USE_MOCKS) {
    const sector = mockSectors.find((s) => s.languageId === languageId);
    return sector ? mockResponse(sector) : mockNotFound('This sector is uncharted.');
  }

  const res = await api.get<SectorDetail>(`/sectors/${languageId}`);
  return res.data;
}

// Changes the pilot's proficiency class in one sector (enlists them if they weren't yet)
export async function updateSectorRank(languageId: number, rank: ProficiencyLevel): Promise<void> {
  if (USE_MOCKS) {
    const sector = mockSectors.find((s) => s.languageId === languageId);
    if (sector) sector.proficiencyLevel = rank;
    await mockResponse(null, 200);
    return;
  }

  await api.patch(`/sectors/${languageId}/rank`, { proficiencyLevel: rank });
}
