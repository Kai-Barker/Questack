import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RequireAdmin from '../../src/components/auth/RequireAdmin';
import TopNav from '../../src/components/layout/TopNav';
import AdminPage from '../../src/pages/admin/AdminPage';
import { USER } from '../helpers/fixtures';
import { currentLocation, fakeAuth, renderRoute } from '../helpers/render';
import { respond } from '../helpers/server';

// The admin role in the frontend: the nav link, the route guard and the
// console. The backend enforces the role on its own (see Backend tests).

const ADMIN = { ...USER, role: 'admin' as const };

const OVERVIEW = {
  pilots: 12,
  activePilots: 11,
  publishedQuests: 10,
  draftQuests: 1,
  aiCallsToday: 40,
  aiTokensToday: 52000,
};

describe('Admin tab in the nav', () => {
  const renderNav = (auth = fakeAuth(), at = '/') =>
    renderRoute(<TopNav slotRef={() => {}} slotInUse={false} />, { path: '*', at, auth });

  it('is hidden from pilots without the admin role', () => {
    renderNav();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('is shown to admins, and marked current on the admin console', () => {
    renderNav(fakeAuth({ user: ADMIN }), '/admin');

    const tab = screen.getByRole('link', { name: 'Admin' });
    expect(tab).toHaveAttribute('href', '/admin');
    expect(tab).toHaveAttribute('aria-current', 'page');
  });
});

describe('RequireAdmin', () => {
  const routes = [{ element: <RequireAdmin />, children: [{ path: '/admin', element: <p>Console</p> }] }];

  it('sends pilots without the admin role back to the Galaxy Map', async () => {
    renderRoute(<p>Galaxy Map</p>, { path: '/', at: '/admin', routes });

    await waitFor(() => expect(currentLocation()).toBe('/'));
    expect(screen.queryByText('Console')).not.toBeInTheDocument();
  });

  it('lets admins through', () => {
    renderRoute(<p>Galaxy Map</p>, { path: '/', at: '/admin', routes, auth: fakeAuth({ user: ADMIN }) });

    expect(screen.getByText('Console')).toBeInTheDocument();
  });
});

describe('AdminPage', () => {
  it('shows the platform totals from the backend', async () => {
    respond('get', '/admin/overview', 200, OVERVIEW);
    renderRoute(<AdminPage />, { auth: fakeAuth({ user: ADMIN }) });

    expect(await screen.findByText('Pilots')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('11 active')).toBeInTheDocument();
    expect(screen.getByText('1 in draft')).toBeInTheDocument();
    expect(screen.getByText('52,000 tokens')).toBeInTheDocument();
  });

  it('explains a refused request and retries it', async () => {
    respond('get', '/admin/overview', 403, { error: 'Command clearance required, Pilot.' });
    const { user } = renderRoute(<AdminPage />, { auth: fakeAuth({ user: ADMIN }) });

    expect(await screen.findByRole('alert')).toHaveTextContent('Command clearance required, Pilot.');

    respond('get', '/admin/overview', 200, OVERVIEW);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('12')).toBeInTheDocument();
  });
});
