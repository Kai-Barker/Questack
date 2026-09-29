import { Router } from 'express';
import { chat, debrief, decode, evaluate, hint } from '../controllers/aiController.js';

// Ship's AI endpoints, mounted at /api/ai.
// No auth yet (week 3): once there is, these need the logged-in user so
// every call can be written to ai_usage_logs and rate limited.
const aiRoutes = Router();

aiRoutes.post('/hint', hint);
aiRoutes.post('/chat', chat);
aiRoutes.post('/evaluate', evaluate);
aiRoutes.post('/decode', decode);
aiRoutes.post('/debrief', debrief);

export default aiRoutes;
