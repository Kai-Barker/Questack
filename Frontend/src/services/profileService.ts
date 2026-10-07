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

// Needs the pilot's current access code, since a callsign is also a login name
export async function changeCallsign(callsign: string, password: string): Promise<PilotProfile> {
  const res = await api.patch<{ profile: PilotProfile }>('/profile/me/callsign', { callsign, password });
  return res.data.profile;
}
