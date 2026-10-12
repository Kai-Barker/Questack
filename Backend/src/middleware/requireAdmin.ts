import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/httpError.js';

export const ADMIN_ONLY_MESSAGE = 'Command clearance required, Pilot.';

// Lets the request through only for admins. Runs after requireAuth, which has
// already re-loaded the user (and their role) from the database.
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') throw new HttpError(403, ADMIN_ONLY_MESSAGE);
  next();
}
