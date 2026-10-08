import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createMemoryRouter, Outlet, RouterProvider, useLocation, type RouteObject } from 'react-router';
import { vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../../src/context/AuthContext';
import { NavSlotContext, type NavSlot } from '../../src/context/NavSlotContext';
import { PilotContext, type PilotContextValue } from '../../src/context/PilotContext';
import { PILOT, USER } from './fixtures';

// Renders a page or component the way the app would: inside the auth and
// pilot contexts and a router. The contexts are fakes, so a test controls
// who's signed in without any HTTP.

export function fakeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: 'authenticated',
    user: USER,
    login: vi.fn(async () => USER),
    register: vi.fn(async () => USER),
    logout: vi.fn(async () => {}),
    refreshUser: vi.fn(async () => {}),
    ...overrides,
  };
}

export function fakePilot(overrides: Partial<PilotContextValue> = {}): PilotContextValue {
  return { pilot: PILOT, loading: false, error: null, reload: vi.fn(), ...overrides };
}

// Shows where the router is, so tests can check redirects
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

interface Options {
  path?: string; // the route pattern, e.g. '/quest/:questId'
  at?: string; // the URL to open, e.g. '/quest/1'
  routes?: RouteObject[]; // other pages the test can navigate to
  auth?: AuthContextValue;
  pilot?: PilotContextValue;
  navSlot?: NavSlot | null;
}

export function renderRoute(ui: ReactNode, { path = '/', at = path, routes = [], auth = fakeAuth(), pilot = fakePilot(), navSlot = null }: Options = {}) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <Outlet />
            <LocationProbe />
          </>
        ),
        children: [{ path, element: ui }, ...routes, { path: '*', element: <p>Somewhere else</p> }],
      },
    ],
    { initialEntries: [at] },
  );
  const user = userEvent.setup();
  const view = render(
    <AuthContext value={auth}>
      <PilotContext value={pilot}>
        <NavSlotContext value={navSlot}>
          <RouterProvider router={router} />
        </NavSlotContext>
      </PilotContext>
    </AuthContext>,
  );
  return { ...view, user, router, auth, pilot };
}

export const currentLocation = () => document.querySelector('[data-testid="location"]')?.textContent;
