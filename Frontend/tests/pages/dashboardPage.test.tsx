import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DashboardPage from '../../src/pages/DashboardPage';
import { DASHBOARD } from '../helpers/fixtures';
import { fakePilot, renderRoute } from '../helpers/render';
import { respond } from '../helpers/server';

// The Galaxy Map (home screen)

describe('DashboardPage', () => {
  it('shows a loading skeleton first', () => {
    respond('get', '/dashboard', 200, DASHBOARD);
    renderRoute(<DashboardPage />, { pilot: fakePilot({ loading: true, pilot: null }) });

    expect(screen.getByText('Loading galaxy map…')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows the pilot, the sector map and the mission to continue', async () => {
    respond('get', '/dashboard', 200, DASHBOARD);
    renderRoute(<DashboardPage />);

    expect(await screen.findByRole('heading', { name: 'Galaxy Map' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Pilot status' })).toHaveTextContent('pilot');
    expect(screen.getByRole('button', { name: 'C# Sector, Swarm infested, 33% cleared' })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Uncharted sector, locked' })).toHaveLength(4);

    const mission = screen.getByRole('region', { name: 'Continue mission' });
    expect(within(mission).getByRole('heading', { name: 'Loop Patrol' })).toBeInTheDocument();
    expect(within(mission).getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '/quest/2');
  });

  it('switches between the map and a plain list', async () => {
    respond('get', '/dashboard', 200, DASHBOARD);
    const { user } = renderRoute(<DashboardPage />);
    await screen.findByRole('heading', { name: 'Galaxy Map' });

    await user.click(screen.getByRole('button', { name: 'List view' }));

    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('group', { name: 'Galaxy map of sectors' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'C# Sector' })).toBeInTheDocument();
    expect(screen.getByText('4 uncharted sectors: more languages are on the way')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Map view' }));
    expect(screen.getByRole('group', { name: 'Galaxy map of sectors' })).toBeInTheDocument();
  });

  it('explains a failed load and retries it', async () => {
    respond('get', '/dashboard', 500, {});
    const { user } = renderRoute(<DashboardPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Command responded with an error (500).');

    respond('get', '/dashboard', 200, DASHBOARD);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Galaxy Map' })).toBeInTheDocument();
  });

  it('retries the pilot summary when that is what failed', async () => {
    respond('get', '/dashboard', 200, DASHBOARD);
    const pilot = fakePilot({ pilot: null, error: 'Could not reach Questack command. Is the backend running?' });
    const { user } = renderRoute(<DashboardPage />, { pilot });

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach Questack command.');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(pilot.reload).toHaveBeenCalled());
  });
});
