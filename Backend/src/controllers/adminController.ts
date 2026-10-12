import type { Request, Response } from 'express';
import { getOverview } from '../models/adminModel.js';

// Admin console endpoints. requireAuth and requireAdmin run first.

export async function overview(_req: Request, res: Response) {
  res.json(await getOverview());
}
