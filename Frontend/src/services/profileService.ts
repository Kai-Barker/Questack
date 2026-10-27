import api from './api';
import type { PilotProfile, ProfileUpdate } from '../types/profile';

// The signed-in pilot's own profile. There is no way to ask for anyone
// else's: the backend always uses the pilot from the session cookie.
// Edits reply with the updated profile, so the page doesn't need to refetch.

export async function getMyProfile(): Promise<PilotProfile> {
  const res = await api.get<{ profile: PilotProfile }>('/profile/me');
  return res.data.profile;
}

export async function updateProfile(update: ProfileUpdate): Promise<PilotProfile> {
  const res = await api.patch<{ profile: PilotProfile }>('/profile/me', update);
  return res.data.profile;
}

// Needs the pilot's current password, since a callsign is also a login name
export async function changeCallsign(callsign: string, password: string): Promise<PilotProfile> {
  const res = await api.patch<{ profile: PilotProfile }>('/profile/me/callsign', { callsign, password });
  return res.data.profile;
}

// Starts one of the pilot's boosters; only one can run at a time
export async function activateBooster(boosterId: number): Promise<PilotProfile> {
  const res = await api.post<{ profile: PilotProfile }>(`/profile/me/boosters/${boosterId}/activate`);
  return res.data.profile;
}
