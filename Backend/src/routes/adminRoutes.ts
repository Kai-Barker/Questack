import { Router } from 'express';
import {
  aiUsage,
  createQuest,
  deleteQuest,
  overview,
  quest,
  quests,
  sectors,
  session,
  updateQuest,
  updateUser,
  users,
} from '../controllers/adminController.js';
import { adminReadLimiter, adminWriteLimiter } from '../middleware/rateLimiters.js';

// Admin-only endpoints, mounted at /api/admin behind appIpLimiter,
// requireAuth and requireAdmin (see app.ts): every route here runs only after
// the account's role has been re-read from the database and found to be admin.
// Each route then has its own per-admin rate limit.
const adminRoutes = Router();

// Answer keys and pilots' details: never let the browser or a proxy cache them
adminRoutes.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

adminRoutes.get('/session', adminReadLimiter, session);
adminRoutes.get('/overview', adminReadLimiter, overview);

// Quest editor
adminRoutes.get('/sectors', adminReadLimiter, sectors);
adminRoutes.get('/quests', adminReadLimiter, quests);
adminRoutes.get('/quests/:questId', adminReadLimiter, quest);
adminRoutes.post('/quests', adminWriteLimiter, createQuest);
adminRoutes.put('/quests/:questId', adminWriteLimiter, updateQuest);
adminRoutes.delete('/quests/:questId', adminWriteLimiter, deleteQuest);

// Users and the Ship's AI
adminRoutes.get('/users', adminReadLimiter, users);
adminRoutes.patch('/users/:userId', adminWriteLimiter, updateUser);
adminRoutes.get('/ai-usage', adminReadLimiter, aiUsage);

export default adminRoutes;
