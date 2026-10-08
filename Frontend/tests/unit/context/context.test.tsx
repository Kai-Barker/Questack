import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../../../src/context/AuthProvider';
import { PilotProvider } from '../../../src/context/PilotProvider';
import GuestOnly from '../../../src/components/auth/GuestOnly';
import RequireAuth from '../../../src/components/auth/RequireAuth';
import { useAuth } from '../../../src/hooks/useAuth';
import { usePilot } from '../../../src/hooks/usePilot';
import api from '../../../src/services/api';
import { PILOT, USER } from '../../helpers/fixtures';
import { currentLocation, fakeAuth, renderRoute } from '../../helpers/render';
import { respond, unreachable } from '../../helpers/server';

// Who's signed in, the pilot summary, and the route guards

function AuthStatus() {
  const auth = useAuth();
  return (
    <>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="user">{auth.user?.username ?? 'nobody'}</p>
      <button type="button" onClick={() => auth.login({ identifier: 'Vega-7', password: 'access123', remember: false })}>
        Log in
      </button>
      <button type="button" onClick={() => auth.register({ callsign: 'Vega-7', email: 'v@x.io', password: 'access123', acceptTerms: true })}>
        Enlist
      </button>
      <button type="button" onClick={() => auth.logout()}>
        Log out
      </button>
      <button type="button" onClick={() => auth.refreshUser()}>
        Refresh
      </button>
    </>
  );
}

function renderAuth() {
  render(
    <AuthProvider>
      <AuthStatus />
    </AuthProvider>,
  );
  return userEvent.setup();
}

const status = () => screen.getByTestId('status').textContent;

describe('AuthProvider', () => {
  it('is loading until the session check answers, then signed in', async () => {
    respond('get', '/auth/me', 200, { user: USER });
    renderAuth();

    expect(status()).toBe('loading');
    await waitFor(() => expect(status()).toBe('authenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('Vega-7');
  });

  it('is signed out with no session (401)', async () => {
    respond('get', '/auth/me', 401, {});
    renderAuth();
    await waitFor(() => expect(status()).toBe('anonymous'));
  });

  it('is signed out when the backend can’t be reached', async () => {
    unreachable('get', '/auth/me');
    renderAuth();
    await waitFor(() => expect(status()).toBe('anonymous'));
  });

  it('signs in, enlists and signs out', async () => {
    respond('get', '/auth/me', 401, {});
    respond('post', '/auth/login', 200, { user: USER });
    respond('post', '/auth/register', 201, { user: { ...USER, username: 'Recruit' } });
    respond('post', '/auth/logout', 204);
    const user = renderAuth();
    await waitFor(() => expect(status()).toBe('anonymous'));

    await user.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(status()).toBe('authenticated'));

    await user.click(screen.getByRole('button', { name: 'Enlist' }));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Recruit'));

    await user.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(status()).toBe('anonymous'));
  });

  it('signs out locally, without rejecting, even if the logout request fails', async () => {
    respond('get', '/auth/me', 200, { user: USER });
    unreachable('post', '/auth/logout');
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.status).toBe('authenticated'));

    await act(async () => {
      await expect(result.current.logout()).resolves.toBeUndefined();
    });
    expect(result.current.status).toBe('anonymous');
  });

  it('signs out when any API call says the session has expired', async () => {
    respond('get', '/auth/me', 200, { user: USER });
    respond('get', '/dashboard', 401, { error: 'Sign in to continue, Pilot.' });
    renderAuth();
    await waitFor(() => expect(status()).toBe('authenticated'));

    await act(() => api.get('/dashboard').catch(() => {}));
    expect(status()).toBe('anonymous');
  });

  it('doesn’t sign out for a 401 from the auth endpoints (e.g. a wrong password)', async () => {
    respond('get', '/auth/me', 200, { user: USER });
    respond('patch', '/auth/something', 401, {});
    renderAuth();
    await waitFor(() => expect(status()).toBe('authenticated'));

    await act(() => api.patch('/auth/something').catch(() => {}));
    expect(status()).toBe('authenticated');
  });

  it('refreshUser picks up a changed callsign, and keeps the account when offline', async () => {
    respond('get', '/auth/me', 200, { user: USER });
    const user = renderAuth();
    await waitFor(() => expect(status()).toBe('authenticated'));

    respond('get', '/auth/me', 200, { user: { ...USER, username: 'Orion' } });
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Orion'));

    unreachable('get', '/auth/me');
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(screen.getByTestId('user')).toHaveTextContent('Orion');
  });
});

describe('PilotProvider', () => {
  function PilotView() {
    const { pilot, loading, error, reload } = usePilot();
    return (
      <>
        <p data-testid="pilot">{loading ? 'loading' : error ? `error: ${error}` : `${pilot?.callsign} L${pilot?.level}`}</p>
        <button type="button" onClick={reload}>
          Reload
        </button>
      </>
    );
  }

  function renderPilot(username = USER.username) {
    renderRoute(
      <PilotProvider>
        <PilotView />
      </PilotProvider>,
      { auth: fakeAuth({ user: { ...USER, username } }) },
    );
  }

  const shown = () => screen.getByTestId('pilot').textContent;

  it('loads the pilot, using the account’s current callsign', async () => {
    respond('get', '/pilot/me', 200, { ...PILOT, callsign: 'Old-Name' });
    renderPilot('New-Name');
    await waitFor(() => expect(shown()).toBe('New-Name L3'));
  });

  it('refreshes quietly once loaded, and keeps the old data if that fails', async () => {
    respond('get', '/pilot/me', 200, PILOT);
    renderPilot();
    await waitFor(() => expect(shown()).toBe('Vega-7 L3'));

    respond('get', '/pilot/me', 200, { ...PILOT, level: 4 });
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(shown()).not.toBe('loading');
    await waitFor(() => expect(shown()).toBe('Vega-7 L4'));

    respond('get', '/pilot/me', 500, {});
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(shown()).toBe('Vega-7 L4');
  });

  it('shows the error, and reload tries again from scratch', async () => {
    respond('get', '/pilot/me', 500, {});
    renderPilot();
    await waitFor(() => expect(shown()).toBe('error: Command responded with an error (500).'));

    respond('get', '/pilot/me', 200, PILOT);
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(shown()).toBe('Vega-7 L3'));
  });
});

describe('RequireAuth', () => {
  const routes = (auth = fakeAuth()) => ({
    path: '/',
    at: '/quest/2?tab=code',
    auth,
    routes: [{ element: <RequireAuth />, children: [{ path: 'quest/:id', element: <p>Quest page</p> }] }],
  });

  it('shows the page to a signed-in pilot', () => {
    renderRoute(<p>Home</p>, routes());
    expect(screen.getByText('Quest page')).toBeInTheDocument();
  });

  it('shows a holding screen while the session is checked', () => {
    renderRoute(<p>Home</p>, routes(fakeAuth({ status: 'loading', user: null })));
    expect(screen.getByText('Establishing uplink…')).toHaveAttribute('role', 'status');
    expect(screen.queryByText('Quest page')).not.toBeInTheDocument();
  });

  it('sends a signed-out visitor to sign in, remembering where they were going', () => {
    renderRoute(<p>Home</p>, routes(fakeAuth({ status: 'anonymous', user: null })));
    expect(currentLocation()).toBe(`/login?next=${encodeURIComponent('/quest/2?tab=code')}`);
  });

  it('doesn’t add ?next= for the home page', () => {
    renderRoute(<p>Home</p>, {
      at: '/',
      path: '/login',
      auth: fakeAuth({ status: 'anonymous', user: null }),
      routes: [{ element: <RequireAuth />, children: [{ index: true, element: <p>Dashboard</p> }] }],
    });
    expect(currentLocation()).toBe('/login');
  });
});

describe('GuestOnly', () => {
  const guestRoutes = (at: string, auth = fakeAuth()) => ({
    path: '/profile',
    at,
    auth,
    routes: [{ element: <GuestOnly />, children: [{ path: 'login', element: <p>Login form</p> }] }],
  });

  it('shows the sign-in page to a visitor', () => {
    renderRoute(<p>Profile</p>, guestRoutes('/login', fakeAuth({ status: 'anonymous', user: null })));
    expect(screen.getByText('Login form')).toBeInTheDocument();
  });

  it('sends a signed-in pilot on to where they were going', () => {
    renderRoute(<p>Profile</p>, guestRoutes('/login?next=%2Fprofile'));
    expect(currentLocation()).toBe('/profile');
  });

  it('never follows ?next= off the site', () => {
    renderRoute(<p>Profile</p>, guestRoutes('/login?next=https%3A%2F%2Fevil.example'));
    expect(currentLocation()).toBe('/');
  });
});
