import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RequireEnlisted from '../../src/components/auth/RequireEnlisted';
import OnboardingPage from '../../src/pages/OnboardingPage';
import { DASHBOARD, PILOT, SECTOR, sectorQuest } from '../helpers/fixtures';
import { currentLocation, fakePilot, renderRoute } from '../helpers/render';
import { respond } from '../helpers/server';

// Onboarding: enlistment steps 02-03 for a pilot with no sector yet

const NEW_SECTOR = {
  ...SECTOR,
  languageId: 2,
  name: 'javascript',
  displayName: 'JavaScript',
  proficiencyLevel: undefined,
  shipQuestId: null,
  quests: [
    sectorQuest({ questId: 11, title: 'Signal Relay', concept: 'Variables' }),
    sectorQuest({ questId: 12, title: 'Type Storm', concept: 'Data types', prerequisiteIds: [11] }),
  ],
};

describe('RequireEnlisted', () => {
  const routes = [{ element: <RequireEnlisted />, children: [{ path: '/sector/:id', element: <p>Sector</p> }] }];

  it('sends a pilot with no sector to onboarding, remembering where they were going', async () => {
    renderRoute(<p>Onboarding</p>, { path: '/onboarding', at: '/sector/1', routes, pilot: fakePilot({ pilot: { ...PILOT, sectorsEnlisted: 0 } }) });

    await waitFor(() => expect(currentLocation()).toBe('/onboarding?next=%2Fsector%2F1'));
  });

  it('lets an enlisted pilot through', () => {
    renderRoute(<p>Onboarding</p>, { path: '/onboarding', at: '/sector/1', routes });

    expect(screen.getByText('Sector')).toBeInTheDocument();
  });

  it('waits for the pilot to load before deciding', () => {
    renderRoute(<p>Onboarding</p>, { path: '/onboarding', at: '/sector/1', routes, pilot: fakePilot({ pilot: null, loading: true }) });

    expect(currentLocation()).toBe('/sector/1');
  });
});

describe('OnboardingPage', () => {
  function renderOnboarding(at = '/onboarding') {
    respond('get', '/dashboard', 200, DASHBOARD);
    const pilot = fakePilot({ pilot: { ...PILOT, sectorsEnlisted: 0 }, reload: vi.fn(async () => {}) });
    return renderRoute(<OnboardingPage />, { path: '/onboarding', at, pilot });
  }

  it('enlists in the chosen sector and class, then launches the chosen starting quest', async () => {
    respond('get', '/sectors/2', 200, NEW_SECTOR);
    const rankCalls = respond('patch', '/sectors/2/rank', 204);
    const { user, pilot } = renderOnboarding();

    await user.click(await screen.findByRole('button', { name: /JavaScript Sector/ }));
    await user.click(screen.getByRole('button', { name: /Commander/ }));

    // Only quests open to a new pilot are offered as a starting point
    await user.click(await screen.findByRole('button', { name: /Variables/ }));
    expect(screen.queryByRole('button', { name: /Data types/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Launch quest' }));

    await waitFor(() => expect(currentLocation()).toBe('/quest/11'));
    expect(rankCalls[0]!.body).toEqual({ proficiencyLevel: 'commander' });
    expect(pilot.reload).toHaveBeenCalled();
  });

  it('can enlist without picking a concept, going on to where the pilot was heading', async () => {
    respond('get', '/sectors/2', 200, NEW_SECTOR);
    respond('patch', '/sectors/2/rank', 204);
    const { user } = renderOnboarding('/onboarding?next=%2Fprofile');

    await user.click(await screen.findByRole('button', { name: /JavaScript Sector/ }));
    await user.click(screen.getByRole('button', { name: 'Enlist' }));

    await waitFor(() => expect(currentLocation()).toBe('/profile'));
  });

  it('cannot enlist before a sector is chosen', async () => {
    renderOnboarding();

    await screen.findByRole('button', { name: /JavaScript Sector/ });
    expect(screen.getByRole('button', { name: 'Enlist' })).toBeDisabled();
  });

  it('explains a failed enlistment', async () => {
    respond('get', '/sectors/2', 200, NEW_SECTOR);
    respond('patch', '/sectors/2/rank', 429, { error: 'Too many changes. Wait 15 minutes, then try again.' });
    const { user } = renderOnboarding();

    await user.click(await screen.findByRole('button', { name: /JavaScript Sector/ }));
    await user.click(screen.getByRole('button', { name: 'Enlist' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many changes');
    expect(currentLocation()).toBe('/onboarding');
  });
});
