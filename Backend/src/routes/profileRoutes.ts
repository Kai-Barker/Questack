import { Router } from 'express';
import { getMyProfile, updateMyCallsign, updateMyProfile } from '../controllers/profileController.js';
import { callsignLimiter, profileReadLimiter, profileUpdateLimiter } from '../middleware/rateLimiters.js';

// The signed-in pilot's own profile, mounted at /api/profile behind requireAuth.
// There are deliberately no routes that take a user id: pilots can only ever
// see or change their own profile.
const profileRoutes = Router();

// Personal data: never let the browser or a proxy cache it
profileRoutes.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

profileRoutes.get('/me', profileReadLimiter, getMyProfile);
profileRoutes.patch('/me', profileUpdateLimiter, updateMyProfile);
profileRoutes.patch('/me/callsign', callsignLimiter, updateMyCallsign);

export default profileRoutes;
