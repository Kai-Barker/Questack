import { Router } from 'express';
import { overview } from '../controllers/adminController.js';
import { pilotReadLimiter } from '../middleware/rateLimiters.js';

// Admin-only endpoints, mounted at /api/admin behind requireAuth and
// requireAdmin. The quest editor will live here too.
const adminRoutes = Router();

adminRoutes.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

adminRoutes.get('/overview', pilotReadLimiter, overview);

export default adminRoutes;
