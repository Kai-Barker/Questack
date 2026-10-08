import { Router } from 'express';
import { login, logout, me, register } from '../controllers/authController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { appIpLimiter, loginAccountLimiter, loginIpLimiter, registerLimiter } from '../middleware/rateLimiters.js';

// Account endpoints, mounted at /api/auth
const authRoutes = Router();

authRoutes.post('/register', registerLimiter, register);
authRoutes.post('/login', loginIpLimiter, loginAccountLimiter, login);
authRoutes.post('/logout', logout);
// IP limit first, as on every signed-in endpoint: the session check costs a database lookup
authRoutes.get('/me', appIpLimiter, requireAuth, me);

export default authRoutes;
