import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ContinueMissionCard from '../../src/components/dashboard/ContinueMissionCard';
import DecodeTransmissionCard from '../../src/components/dashboard/DecodeTransmissionCard';
import PilotLoadoutPanel from '../../src/components/dashboard/PilotLoadoutPanel';
import PilotStatusPanel from '../../src/components/dashboard/PilotStatusPanel';
import AppLayout from '../../src/components/layout/AppLayout';
import SystemsStatusToast from '../../src/components/layout/SystemsStatusToast';
import TopNav from '../../src/components/layout/TopNav';
import GalaxyMap from '../../src/components/map/GalaxyMap';
import MapLegend from '../../src/components/map/MapLegend';
import SectorListView from '../../src/components/map/SectorListView';
import Button from '../../src/components/ui/Button';
import Panel from '../../src/components/ui/Panel';
import ProgressBar from '../../src/components/ui/ProgressBar';
import ViewToggle from '../../src/components/ui/ViewToggle';
import type { SectorSummary } from '../../src/types/dashboard';
import { DASHBOARD, PILOT } from '../helpers/fixtures';
import { currentLocation, fakeAuth, fakePilot, renderRoute } from '../helpers/render';
import { respond, unreachable } from '../helpers/server';

const [CSHARP, JS] = DASHBOARD.sectors as [SectorSummary, SectorSummary];

describe('PilotStatusPanel', () => {
  it('shows rank, level, XP, streak and counts', () => {
    renderRoute(<PilotStatusPanel pilot={PILOT} />);

    expect(screen.getByText('Rank').nextElementSibling).toHaveTextContent('pilot');
    expect(screen.getByText('50 / 1,000 XP to level 4')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'XP to level 4' })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('Deployment streak').nextElementSibling).toHaveTextContent('2 days');
    expect(screen.getByText('Quests cleared').nextElementSibling).toHaveTextContent('4');
  });

  it('says "1 day" and hides the streak when there isn’t one', () => {
    const { rerender } = render(<PilotStatusPanel pilot={{ ...PILOT, currentStreak: 1 }} />);
    expect(screen.getByText('1 day')).toBeInTheDocument();

    rerender(<PilotStatusPanel pilot={{ ...PILOT, currentStreak: undefined }} />);
    expect(screen.queryByText('Deployment streak')).not.toBeInTheDocument();
  });
});

describe('PilotLoadoutPanel', () => {
  it('shows the gear, callsign and a link to manage it', () => {
    renderRoute(<PilotLoadoutPanel pilot={PILOT} />);

    expect(screen.getByText('Navigator Visor')).toBeInTheDocument();
    expect(screen.getAllByText('empty')).toHaveLength(2);
    expect(screen.getByText('Vega-7')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Manage loadout/ })).toHaveAttribute('href', '/profile');
  });

  it('shows the running booster', () => {
    renderRoute(<PilotLoadoutPanel pilot={{ ...PILOT, activeBooster: { name: 'Overdrive Core', xpMultiplier: 2, questsRemaining: 1 } }} />);

    expect(screen.getByText('Overdrive Core')).toBeInTheDocument();
    expect(screen.getByText('2× XP · 1 more quest')).toBeInTheDocument();
  });

  it('hides itself with no loadout and no booster', () => {
    const { container } = renderRoute(<PilotLoadoutPanel pilot={{ ...PILOT, loadout: undefined }} />);
    expect(container.querySelector('section')).toBeNull();
  });
});

describe('ContinueMissionCard and DecodeTransmissionCard', () => {
  it('shows the mission’s progress and a resume link', () => {
    renderRoute(<ContinueMissionCard mission={DASHBOARD.continueMission} />);

    expect(screen.getByText('C# Sector · Loops · Medium')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 objectives')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '/quest/2');
  });

  it('suggests picking a sector when there is no mission', () => {
    renderRoute(<ContinueMissionCard mission={null} />);
    expect(screen.getByText('No active mission. Pick a sector on the map to deploy.')).toBeInTheDocument();
  });

  it('links to the decoder', () => {
    renderRoute(<DecodeTransmissionCard />);
    expect(screen.getByRole('link', { name: 'Open decoder' })).toHaveAttribute('href', '/decoder');
  });
});

describe('GalaxyMap', () => {
  const wedge = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name} Sector`) });

  it('draws each sector and fills the rest of the ring with uncharted space', () => {
    renderRoute(<GalaxyMap sectors={DASHBOARD.sectors} />);

    expect(wedge('C#')).toHaveAccessibleName('C# Sector, Swarm infested, 33% cleared');
    expect(wedge('JavaScript')).toHaveAccessibleName('JavaScript Sector, Swarm infested, 0% cleared');
    expect(screen.getAllByRole('img', { name: 'Uncharted sector, locked' })).toHaveLength(4);
  });

  it('marks a fully cleared sector', () => {
    renderRoute(<GalaxyMap sectors={[{ ...CSHARP, questsCleared: 3 }]} />);
    expect(wedge('C#')).toHaveAccessibleName('C# Sector, cleared, 100% cleared');
  });

  it('grows the ring past six slots when needed', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ ...JS, languageId: i + 1, displayName: `Lang${i}` }));
    renderRoute(<GalaxyMap sectors={many} />);

    expect(screen.getAllByRole('button', { name: /Sector,/ })).toHaveLength(8);
    expect(screen.queryByRole('img', { name: 'Uncharted sector, locked' })).not.toBeInTheDocument();
  });

  it('opens a sector’s details on click, and closes them on a second click', async () => {
    const { user } = renderRoute(<GalaxyMap sectors={DASHBOARD.sectors} />);
    await user.click(wedge('C#'));

    const dialog = screen.getByRole('dialog', { name: 'C# Sector' });
    expect(wedge('C#')).toHaveAttribute('aria-expanded', 'true');
    expect(within(dialog).getByText('Swarm cleared').nextElementSibling).toHaveTextContent('33%');
    expect(within(dialog).getByText('1 / 3')).toBeInTheDocument();
    expect(within(dialog).getByText('(your rank)').closest('li')).toHaveTextContent('pilot');
    expect(within(dialog).getByRole('link', { name: 'Enter sector' })).toHaveAttribute('href', '/sector/1');
    expect(dialog).toHaveFocus();

    await user.click(wedge('C#'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('offers to enlist in a sector the pilot hasn’t joined', async () => {
    const { user } = renderRoute(<GalaxyMap sectors={DASHBOARD.sectors} />);
    await user.click(wedge('JavaScript'));

    expect(screen.getByText('Not enlisted yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enlist' })).toHaveAttribute('href', '/sector/2');
  });

  it('opens with Enter and Space, and Escape closes it and returns focus to the wedge', async () => {
    const { user } = renderRoute(<GalaxyMap sectors={DASHBOARD.sectors} />);
    wedge('C#').focus();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(wedge('C#')).toHaveFocus();

    await user.keyboard(' ');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes with the × button or a click outside', async () => {
    const { user } = renderRoute(<GalaxyMap sectors={DASHBOARD.sectors} />);
    await user.click(wedge('C#'));
    await user.click(screen.getByRole('button', { name: 'Close sector details' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(wedge('C#'));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('switches straight to another sector’s details', async () => {
    const { user } = renderRoute(<GalaxyMap sectors={DASHBOARD.sectors} />);
    await user.click(wedge('C#'));
    await user.click(wedge('JavaScript'));

    expect(screen.getByRole('dialog', { name: 'JavaScript Sector' })).toBeInTheDocument();
  });
});

describe('SectorListView, MapLegend and ViewToggle', () => {
  it('lists each sector with its status, rank and progress', () => {
    renderRoute(<SectorListView sectors={DASHBOARD.sectors} unchartedCount={1} />);

    expect(screen.getByText('C# · Swarm infested · Pilot')).toBeInTheDocument();
    expect(screen.getByText('JavaScript · Swarm infested · Not enlisted')).toBeInTheDocument();
    expect(screen.getByText('1 / 3 quests cleared (33%)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enter' })).toHaveAttribute('href', '/sector/1');
    expect(screen.getByRole('link', { name: 'Enlist' })).toHaveAttribute('href', '/sector/2');
    expect(screen.getByText('1 uncharted sector: more languages are on the way')).toBeInTheDocument();
  });

  it('leaves out the uncharted row when there are none', () => {
    renderRoute(<SectorListView sectors={DASHBOARD.sectors} unchartedCount={0} />);
    expect(screen.queryByText(/uncharted/)).not.toBeInTheDocument();
  });

  it('gives every map state an icon and a label', () => {
    render(<MapLegend />);
    expect(within(screen.getByRole('list', { name: 'Map legend' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Cleared',
      'Swarm infested',
      'Uncharted',
    ]);
  });

  it('marks the current view and reports changes', async () => {
    const changes: string[] = [];
    render(<ViewToggle view="map" onChange={(v) => changes.push(v)} />);

    expect(screen.getByRole('button', { name: 'Map view' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'List view' }));
    expect(changes).toEqual(['list']);
  });
});

describe('TopNav', () => {
  function renderNav(at = '/', pilot = fakePilot(), auth = fakeAuth(), slotInUse = false) {
    return renderRoute(<TopNav slotRef={() => {}} slotInUse={slotInUse} />, { path: '*', at, pilot, auth });
  }

  it.each([
    ['/', 'Galaxy Map'],
    ['/sector/1', 'Galaxy Map'],
    ['/quest/2', 'Galaxy Map'],
    ['/profile', 'Profile'],
    ['/settings', 'Settings'],
  ])('marks the current tab at %s', (at, tab) => {
    renderNav(at);
    expect(screen.getByRole('navigation', { name: 'Main' }).querySelector('[aria-current="page"]')).toHaveTextContent(tab);
  });

  it('shows the pilot’s rank, level and XP', () => {
    renderNav();

    expect(screen.getByText('pilot · Lvl 3')).toBeInTheDocument();
    expect(screen.getByText('50 / 1,000 XP')).toBeInTheDocument();
    expect(screen.getByText('Signed in as Vega-7')).toBeInTheDocument();
    expect(screen.getByText('VE')).toBeInTheDocument();
  });

  it('opens the Profile from the pilot’s badge', async () => {
    const { user } = renderNav('/settings');
    await user.click(screen.getByText('VE'));
    expect(currentLocation()).toBe('/profile');
  });

  it('shows a running booster', () => {
    renderNav('/', fakePilot({ pilot: { ...PILOT, activeBooster: { name: 'Overdrive Core', xpMultiplier: 2, questsRemaining: 3 } } }));
    expect(screen.getByText(/2× XP booster/)).toHaveTextContent('Overdrive Core active');
  });

  it('signs out and goes to the login screen', async () => {
    const { user, auth } = renderNav('/profile');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(auth.logout).toHaveBeenCalled();
    await waitFor(() => expect(currentLocation()).toBe('/login'));
  });

  it('hides the tabs while a page is using the middle slot', () => {
    renderNav('/quest/1', fakePilot(), fakeAuth(), true);
    expect(screen.getByRole('navigation', { name: 'Main', hidden: true })).toHaveClass('hidden');
  });

  it('shows no pilot details until the pilot has loaded', () => {
    renderNav('/', fakePilot({ pilot: null, loading: true }));
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });
});

describe('AppLayout', () => {
  it('wraps every signed-in page with the nav, loaded from the backend', async () => {
    respond('get', '/pilot/me', 200, PILOT);
    respond('get', '/health', 200, { status: 'ok', database: 'connected', timestamp: '' });
    renderRoute(<p>root</p>, {
      path: '/unused',
      at: '/profile',
      routes: [{ element: <AppLayout />, children: [{ path: 'profile', element: <p>Profile page</p> }] }],
    });

    expect(screen.getByText('Profile page')).toBeInTheDocument();
    expect(await screen.findByText('Signed in as Vega-7')).toBeInTheDocument();
  });
});

describe('SystemsStatusToast', () => {
  it('reports every system online', async () => {
    respond('get', '/health', 200, { status: 'ok', database: 'connected', timestamp: '' });
    render(<SystemsStatusToast />);

    expect(screen.getByText('Running systems check…')).toBeInTheDocument();
    expect(await screen.findByText('All systems online')).toBeInTheDocument();
    expect(screen.getByText('Database').nextElementSibling).toHaveTextContent('Connected');
  });

  it('reports the database being down', async () => {
    respond('get', '/health', 503, { status: 'degraded', database: 'unreachable', timestamp: '' });
    render(<SystemsStatusToast />);

    expect(await screen.findByText('Systems degraded')).toBeInTheDocument();
    expect(screen.getByText('Backend API').nextElementSibling).toHaveTextContent('Online');
    expect(screen.getByText('Database').nextElementSibling).toHaveTextContent('Unreachable');
  });

  it('reports the backend being down, and can check again', async () => {
    unreachable('get', '/health');
    render(<SystemsStatusToast />);
    expect(await screen.findByText(/Backend unreachable/)).toBeInTheDocument();

    respond('get', '/health', 200, { status: 'ok', database: 'connected', timestamp: '' });
    await userEvent.click(screen.getByRole('button', { name: 'Run systems check again' }));
    expect(await screen.findByText('All systems online')).toBeInTheDocument();
  });

  it('can be dismissed', async () => {
    respond('get', '/health', 200, { status: 'ok', database: 'connected', timestamp: '' });
    render(<SystemsStatusToast />);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss systems status' }));

    expect(screen.queryByRole('complementary', { name: 'Systems status' })).not.toBeInTheDocument();
  });
});

describe('UI building blocks', () => {
  it('ProgressBar reports its value to screen readers', () => {
    render(<ProgressBar value={3} max={4} label="Quests" />);
    const bar = screen.getByRole('progressbar', { name: 'Quests' });

    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemax', '4');
    expect(bar.firstElementChild).toHaveStyle({ width: '75%' });
  });

  it('Panel is a section named by its label', () => {
    render(<Panel label="Pilot status">x</Panel>);
    expect(screen.getByRole('region', { name: 'Pilot status' })).toBeInTheDocument();
  });

  it('Button is a link with `to`, otherwise a button that can be disabled', async () => {
    renderRoute(
      <>
        <Button to="/profile">Go</Button>
        <Button disabled onClick={() => {}}>
          Wait
        </Button>
      </>,
    );

    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('button', { name: 'Wait' })).toBeDisabled();
  });
});
