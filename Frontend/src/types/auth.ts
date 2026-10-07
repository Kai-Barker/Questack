import type { RequestFailure } from '../utils/requestFailure';

// Shapes for the /api/auth endpoints (Backend/src/routes/authRoutes.ts)

export interface AuthUser {
  userId: number;
  username: string; // the pilot's callsign
  email: string;
  role: 'user' | 'admin';
}

export interface LoginInput {
  identifier: string; // callsign or email
  password: string;
  remember: boolean;
}

export interface RegisterInput {
  callsign: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

// A failed auth request, ready to show on the form
export type AuthFailure = RequestFailure;
