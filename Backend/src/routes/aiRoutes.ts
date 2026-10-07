import { Router } from 'express';
import { chat, debrief, decode, evaluate, hint } from '../controllers/aiController.js';

// Ship's AI endpoints, mounted at /api/ai behind requireAuth and the AI rate
// limit. Every call is written to ai_usage_logs (see aiController).
const aiRoutes = Router();

aiRoutes.post('/hint', hint);
aiRoutes.post('/chat', chat);
aiRoutes.post('/evaluate', evaluate);
aiRoutes.post('/decode', decode);
aiRoutes.post('/debrief', debrief);

export default aiRoutes;
