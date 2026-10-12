import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SettingsPage from '../../src/pages/SettingsPage';
import { DASHBOARD } from '../helpers/fixtures';
import { currentLocation, fakePilot, renderRoute } from '../helpers/render';
import { respond } from '../helpers/server';

describe('SettingsPage', () => {
  function renderSettings() {
    respond('get', '/dashboard', 200, DASHBOARD);
    return renderRoute(<SettingsPage />, { path: '/settings', pilot: fakePilot({ reload: vi.fn(async () => {}) }) });
  }

  it('shows the account and links to the profile editor', () => {
    renderSettings();

    expect(screen.getByText('Callsign').nextElementSibling).toHaveTextContent('Vega-7');
    expect(screen.getByText('Email').nextElementSibling).toHaveTextContent('vega@example.com');
    expect(screen.getByRole('link', { name: 'Edit profile' })).toHaveAttribute('href', '/profile');
  });

  it('changes the class in a sector and refreshes the nav', async () => {
    const calls = respond('patch', '/sectors/2/rank', 204);
    const { user, pilot } = renderSettings();

    const js = (await screen.findByText('JavaScript Sector')).parentElement!;
    await user.click(within(js).getByRole('button', { name: 'cadet' }));

    await waitFor(() => expect(pilot.reload).toHaveBeenCalled());
    expect(calls[0]!.body).toEqual({ proficiencyLevel: 'cadet' });
    expect(within(js).getByRole('button', { name: 'cadet' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('signs out', async () => {
    const { user, auth } = renderSettings();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(auth.logout).toHaveBeenCalled();
    await waitFor(() => expect(currentLocation()).toBe('/login'));
  });
});
