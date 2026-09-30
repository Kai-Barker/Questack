import type { PublicUser } from '../models/userModel.js';

// requireAuth attaches the signed-in user to the request
declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export {};
