import { Router } from 'express';
import { chat, debrief, decode, evaluate, hint } from '../controllers/aiController.js';
import * as decoder from '../controllers/decoderController.js';

// Ship's AI endpoints, mounted at /api/ai behind requireAuth and the AI rate
// limit. Every call is written to ai_usage_logs (see aiController).
const aiRoutes = Router();

aiRoutes.post('/hint', hint);
aiRoutes.post('/chat', chat);
aiRoutes.post('/evaluate', evaluate);
aiRoutes.post('/decode', decode);
aiRoutes.post('/debrief', debrief);

// The standalone decoder: not a quest, so no objective or progress involved
aiRoutes.post('/decoder', decoder.decode);
aiRoutes.post('/decoder/chat', decoder.chat);
aiRoutes.post('/decoder/check', decoder.check);

export default aiRoutes;
