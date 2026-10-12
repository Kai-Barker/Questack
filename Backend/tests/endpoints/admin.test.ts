import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { app } from '../../src/app.js';
import * as admin from '../../src/models/adminModel.js';
import * as users from '../../src/models/userModel.js';
import { sessionCookie } from '../helpers/auth.js';
import { ADMIN_OVERVIEW } from '../helpers/defaults.js';
import { PILOT } from '../helpers/fixtures.js';

// Admin console (/api/admin/*). The role is re-read from the database on
// every request, so these tests change what findById returns.

const ADMIN_ID = PILOT.userId + 1;

function adminExists() {
  vi.mocked(users.findById).mockImplementation(async (id) => {
    if (id === PILOT.userId) return { ...PILOT };
    if (id === ADMIN_ID) return { ...PILOT, userId: ADMIN_ID, username: 'ADMIRAL', role: 'admin' };
    return null;
  });
}

describe('GET /api/admin/overview', () => {
  it('is 401 without a session', async () => {
    const res = await request(app).get('/api/admin/overview');

    expect(res.status).toBe(401);
    expect(admin.getOverview).not.toHaveBeenCalled();
  });

  it('is 403 for a pilot without the admin role, before any query', async () => {
    const res = await request(app).get('/api/admin/overview').set('Cookie', sessionCookie());

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Command clearance required, Pilot.');
    expect(admin.getOverview).not.toHaveBeenCalled();
  });

  it('returns the platform totals for an admin', async () => {
    adminExists();

    const res = await request(app).get('/api/admin/overview').set('Cookie', sessionCookie(ADMIN_ID));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(ADMIN_OVERVIEW);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('locks an admin out as soon as their role is taken away', async () => {
    adminExists();
    const cookie = sessionCookie(ADMIN_ID);
    vi.mocked(users.findById).mockResolvedValue({ ...PILOT, userId: ADMIN_ID, role: 'user' });

    const res = await request(app).get('/api/admin/overview').set('Cookie', cookie);

    expect(res.status).toBe(403);
  });
});
