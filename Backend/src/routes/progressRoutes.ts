import { Router } from 'express';
import {
  getDashboard,
  getPilot,
  getQuest,
  getSector,
  postBriefingRead,
  postQuestComplete,
  updateSectorRank,
} from '../controllers/progressController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { appIpLimiter, pilotReadLimiter, progressWriteLimiter, questCompleteLimiter } from '../middleware/rateLimiters.js';

// The signed-in pilot's progress, mounted at /api:
//   GET   /pilot/me             nav and dashboard summary
//   GET   /dashboard            sectors and the mission to continue
//   GET   /sectors/:id          one sector's quests
//   PATCH /sectors/:id/rank     the pilot's rank in a sector
//   GET   /quests/:id           a quest to play (403 while locked)
//   POST  /quests/objectives/:id/read  clear a briefing objective
//   POST  /quests/:id/complete  clear a quest
// None takes a user id: everything is for the pilot in the session.
const progressRoutes = Router();

const paths = ['/pilot', '/dashboard', '/sectors', '/quests'];
// An IP limit first (before the session's database lookup), then the session
progressRoutes.use(paths, appIpLimiter, requireAuth, (_req, res, next) => {
  // Personal data: never let the browser or a proxy cache it
  res.set('Cache-Control', 'no-store');
  next();
});

progressRoutes.get('/pilot/me', pilotReadLimiter, getPilot);
progressRoutes.get('/dashboard', pilotReadLimiter, getDashboard);
progressRoutes.get('/sectors/:id', pilotReadLimiter, getSector);
progressRoutes.patch('/sectors/:id/rank', progressWriteLimiter, updateSectorRank);
progressRoutes.get('/quests/:id', pilotReadLimiter, getQuest);
progressRoutes.post('/quests/objectives/:id/read', progressWriteLimiter, postBriefingRead);
progressRoutes.post('/quests/:id/complete', questCompleteLimiter, postQuestComplete);

export default progressRoutes;
