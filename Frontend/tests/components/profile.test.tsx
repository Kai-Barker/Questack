import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AllInsigniaDialog from '../../src/components/profile/AllInsigniaDialog';
import FlightLog from '../../src/components/profile/FlightLog';
import InsigniaBadge, { InsigniaIcon, InsigniaStatus } from '../../src/components/profile/InsigniaBadge';
import InsigniaCollection from '../../src/components/profile/InsigniaCollection';
import LoadoutPanel from '../../src/components/profile/LoadoutPanel';
import ProfileHeader from '../../src/components/profile/ProfileHeader';
import SectorProgressPanel from '../../src/components/profile/SectorProgressPanel';
import ServiceRecord from '../../src/components/profile/ServiceRecord';
import StatTiles from '../../src/components/profile/StatTiles';
import XpHistoryChart from '../../src/components/profile/XpHistoryChart';
import { PROFILE } from '../helpers/fixtures';
import { renderRoute } from '../helpers/render';
import { respond } from '../helpers/server';

const live = () => document.querySelector('[aria-live="polite"].sr-only');

describe('ProfileHeader', () => {
  it('shows featured insignia and fills the empty slots', async () => {
    const onEdit = vi.fn();
    render(<ProfileHeader profile={PROFILE} onEdit={onEdit} />);

    expect(screen.getAllByText('Empty slot')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: /Edit profile/ }));
    expect(onEdit).toHaveBeenCalled();
  });

  it('prompts for a bio and shows the plain rank with no home sector', () => {
    render(<ProfileHeader profile={{ ...PROFILE, bio: null, homeSector: null, title: null }} onEdit={() => {}} />);

    expect(screen.getByText('No bio yet. Tell the fleet what you’re working on.')).toBeInTheDocument();
    expect(screen.getByText('Level 3 · Pilot · Enlisted Jan 2026')).toBeInTheDocument();
    expect(screen.queryByText('Title:')).not.toBeInTheDocument();
  });
});

describe('StatTiles', () => {
  it('shows each stat with its label', () => {
    render(<StatTiles profile={PROFILE} />);
    const tiles = within(screen.getByRole('list', { name: 'Pilot stats' })).getAllByRole('listitem').map((li) => li.textContent);

    expect(tiles).toEqual(['Total XP1,300', 'Quests cleared4', 'Bugs squashed3', 'Transmissions decoded1']);
  });
});

describe('ServiceRecord', () => {
  it('shows the record and the current goal’s progress', async () => {
    const onChangeGoal = vi.fn();
    render(<ServiceRecord profile={PROFILE} onChangeGoal={onChangeGoal} />);

    expect(screen.getByText('Home sector').nextElementSibling).toHaveTextContent('C#');
    expect(screen.getByText('Longest streak').nextElementSibling).toHaveTextContent('4 days');
    expect(screen.getByText('Favourite objective').nextElementSibling).toHaveTextContent('Bug hunt');
    expect(screen.getByText('Clear the C# Sector')).toBeInTheDocument();
    expect(screen.getByText('1 / 3 quests cleared')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Change\s*current goal$/ }));
    expect(onChangeGoal).toHaveBeenCalled();
  });

  it('fills the gaps for a new pilot', () => {
    render(
      <ServiceRecord
        profile={{ ...PROFILE, goal: null, homeSector: null, favouriteObjective: null, flightLog: { ...PROFILE.flightLog, longestStreak: 1 } }}
        onChangeGoal={() => {}}
      />,
    );

    expect(screen.getByText('Home sector').nextElementSibling).toHaveTextContent('—');
    expect(screen.getByText('Longest streak').nextElementSibling).toHaveTextContent('1 day');
    expect(screen.getByText('Pick a sector to work towards clearing.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Set goal/ })).toBeInTheDocument();
  });
});

describe('LoadoutPanel', () => {
  it('shows each gear slot', () => {
    render(<LoadoutPanel profile={PROFILE} onBoosterActivated={() => {}} />);
    const slots = within(screen.getByRole('region', { name: 'Loadout' })).getAllByRole('listitem').slice(0, 4).map((li) => li.textContent);

    expect(slots).toEqual(['HelmetNavigator Visor', 'ArmourEmpty', 'InsigniaFirst Deploy', 'BoosterEmpty']);
  });

  it('activates a booster', async () => {
    const calls = respond('post', '/profile/me/boosters/5/activate', 200, { profile: PROFILE });
    const onBoosterActivated = vi.fn();
    render(<LoadoutPanel profile={PROFILE} onBoosterActivated={onBoosterActivated} />);

    expect(screen.getByText('2× XP · 3 quests')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Activate\s*Overdrive Core$/ }));

    await vi.waitFor(() => expect(onBoosterActivated).toHaveBeenCalledWith(PROFILE));
    expect(calls).toHaveLength(1);
  });

  it('shows why a booster couldn’t start', async () => {
    respond('post', '/profile/me/boosters/5/activate', 409, { error: 'A booster is already running. Use it up first, Pilot.' });
    render(<LoadoutPanel profile={PROFILE} onBoosterActivated={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: /^Activate/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A booster is already running.');
  });

  it('runs one booster at a time', () => {
    const boosters = [
      { boosterId: 5, name: 'Overdrive Core', xpMultiplier: 2, chargesRemaining: 1, active: true },
      { boosterId: 6, name: 'Spare Core', xpMultiplier: 1.5, chargesRemaining: 2, active: false },
    ];
    render(<LoadoutPanel profile={{ ...PROFILE, boosters }} onBoosterActivated={() => {}} />);

    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('2× XP · 1 quest')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Activate\s*Spare Core$/ })).toBeDisabled();
    expect(screen.getByText(/One booster runs at a time/)).toBeInTheDocument();
  });

  it('explains how to get a booster', () => {
    render(<LoadoutPanel profile={{ ...PROFILE, boosters: [] }} onBoosterActivated={() => {}} />);
    expect(screen.getByText('None yet. Some quests award a booster on their first clear.')).toBeInTheDocument();
  });
});

describe('SectorProgressPanel', () => {
  it('links each sector with its rank and progress', () => {
    renderRoute(<SectorProgressPanel sectors={PROFILE.sectors} />);

    expect(screen.getByRole('link', { name: 'JavaScript Sector' })).toHaveAttribute('href', '/sector/2');
    expect(screen.getByRole('progressbar', { name: 'C# quests cleared' })).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByText('0 / 2 quests cleared')).toBeInTheDocument();
  });
});

describe('InsigniaCollection and AllInsigniaDialog', () => {
  it('lists earned insignia first with their status', () => {
    render(<InsigniaCollection insignia={PROFILE.insignia} featuredIds={[1]} onChooseFeatured={() => {}} />);

    expect(screen.getByText('2 of 3 earned · choose up to 3 to feature')).toBeInTheDocument();
    const items = within(screen.getByRole('region', { name: 'Insignia collection' })).getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['First Deploy Featured', 'CommanderEarned', 'Bug HunterLocked']);
  });

  it('opens the full collection, grouped, and closes it', async () => {
    render(<InsigniaCollection insignia={PROFILE.insignia} featuredIds={[1]} onChooseFeatured={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /View all/ }));

    const dialog = screen.getByRole('dialog', { name: 'Insignia collection' });
    expect(within(dialog).getByText('Earned · 2')).toBeInTheDocument();
    expect(within(dialog).getByText('Locked · 1')).toBeInTheDocument();
    expect(within(dialog).getByText('Squash 10 bugs.')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks to choose featured insignia', async () => {
    const onChooseFeatured = vi.fn();
    render(<InsigniaCollection insignia={PROFILE.insignia} featuredIds={[]} onChooseFeatured={onChooseFeatured} />);
    await userEvent.click(screen.getByRole('button', { name: 'Choose featured' }));
    expect(onChooseFeatured).toHaveBeenCalled();
  });

  it('closes the full collection with Escape and skips empty groups', () => {
    const onClose = vi.fn();
    render(<AllInsigniaDialog insignia={PROFILE.insignia.filter((i) => i.earned)} featuredIds={[]} onClose={onClose} />);

    expect(screen.queryByText(/^Locked ·/)).not.toBeInTheDocument();
    fireEvent(screen.getByRole('dialog'), new Event('cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('InsigniaBadge', () => {
  it('shows a lock on an unearned badge, and nothing in an empty slot', () => {
    const { container, rerender } = render(<InsigniaBadge code="bug-hunter" earned={false} />);
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(3); // hexagon, icon, lock

    rerender(<InsigniaBadge />);
    expect(container.querySelectorAll('svg')).toHaveLength(1); // just the hexagon
  });

  it('falls back to a diamond for an unknown code', () => {
    const { container: known } = render(<InsigniaIcon code="first-deploy" />);
    const { container: unknown } = render(<InsigniaIcon code="no-such-badge" />);
    expect(unknown.innerHTML).not.toBe(known.innerHTML);
  });

  it.each([
    [true, true, 'Featured'],
    [true, false, 'Earned'],
    [false, false, 'Locked'],
  ])('earned %s, featured %s says "%s"', (earned, featured, text) => {
    render(<InsigniaStatus earned={earned} featured={featured} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });
});

describe('FlightLog', () => {
  it('summarises activity and lists weekly totals for screen readers', () => {
    render(<FlightLog flightLog={PROFILE.flightLog} />);

    expect(screen.getByText('9 active days in the last 2 weeks')).toBeInTheDocument();
    expect(screen.getByText('Current streak').nextElementSibling).toHaveTextContent('2days');
    const rows = within(screen.getByRole('table', { name: 'Objectives cleared each week' })).getAllByRole('row').slice(1);
    // Newer ICU data writes September as "Sept" in en-GB
    expect(rows.map((r) => r.textContent)).toEqual([expect.stringMatching(/^28 Sept?64$/), '5 Oct75']);
  });

  it('moves between days with the keyboard and announces each one', async () => {
    render(<FlightLog flightLog={PROFILE.flightLog} />);
    const grid = screen.getByRole('group', { name: /Daily activity/ });

    grid.focus();
    await vi.waitFor(() => expect(live()).toHaveTextContent('1 objective cleared · Sun 11 Oct'));
    fireEvent.keyDown(grid, { key: 'ArrowLeft' });
    expect(live()).toHaveTextContent('No objectives cleared · Sun 4 Oct');
    fireEvent.keyDown(grid, { key: 'ArrowUp' });
    expect(live()).toHaveTextContent('2 objectives cleared · Sat 3 Oct');
    fireEvent.keyDown(grid, { key: 'Home' });
    expect(live()).toHaveTextContent('No objectives cleared · Mon 28 Sep');
    fireEvent.keyDown(grid, { key: 'ArrowLeft' });
    expect(live()).toHaveTextContent('Mon 28 Sep');
    fireEvent.keyDown(grid, { key: 'End' });
    expect(live()).toHaveTextContent('Sun 11 Oct');

    fireEvent.blur(grid);
    expect(live()).toBeEmptyDOMElement();
  });

  it('shows a day’s count when it’s hovered', () => {
    const { container } = render(<FlightLog flightLog={PROFILE.flightLog} />);
    const squares = container.querySelectorAll('[style*="grid-row"][class*="aspect-square"]');

    fireEvent.pointerEnter(squares[2]!);
    expect(squares[2]).toHaveTextContent('2 objectives · Wed 30 Sep');
  });
});

describe('XpHistoryChart', () => {
  it('summarises the weeks and lists every value for screen readers', () => {
    render(<XpHistoryChart weeks={PROFILE.xpHistory} />);

    expect(screen.getByText('1,400 XP earned in the last 8 weeks')).toBeInTheDocument();
    const rows = within(screen.getByRole('table', { name: 'XP earned each week' })).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(8);
    expect(rows.at(-1)).toHaveTextContent('5 Oct350');
  });

  it('moves between weeks with the keyboard and announces each one', () => {
    render(<XpHistoryChart weeks={PROFILE.xpHistory} />);
    const chart = screen.getByRole('group', { name: /XP earned per week/ });

    fireEvent.focus(chart);
    expect(live()).toHaveTextContent('350 XP, week of 5 Oct');
    fireEvent.keyDown(chart, { key: 'ArrowLeft' });
    expect(live()).toHaveTextContent('300 XP, week of 28 Sep');
    fireEvent.keyDown(chart, { key: 'Home' });
    expect(live()).toHaveTextContent('0 XP, week of 17 Aug');
    fireEvent.keyDown(chart, { key: 'End' });
    expect(live()).toHaveTextContent('350 XP, week of 5 Oct');
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(live()).toHaveTextContent('350 XP, week of 5 Oct');
  });
});
