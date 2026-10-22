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
import PilotAvatar from '../../src/components/ui/PilotAvatar';
import { updateProfile } from '../../src/services/profileService';
import type { ProfileUpdate } from '../../src/types/profile';
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
  const noEquip = async () => {};

  function renderLoadout(profile = PROFILE, onEquip: (update: ProfileUpdate) => Promise<void> = noEquip, onBoosterActivated = vi.fn()) {
    render(<LoadoutPanel profile={profile} onBoosterActivated={onBoosterActivated} onEquip={onEquip} />);
    return onBoosterActivated;
  }

  // Clicks a Loadout slot and returns the picker it opens
  async function openSlot(slot: string, dialogName: string) {
    await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${slot}`) }));
    return within(screen.getByRole('dialog', { name: dialogName }));
  }

  it('shows each slot, with the equipped visor’s perk', () => {
    renderLoadout();
    const slots = within(screen.getByRole('region', { name: 'Loadout' })).getAllByRole('listitem').map((li) => li.textContent);

    expect(slots).toEqual([
      'FrameStandard Issue',
      'VisorNova Visor+10% XP on first-time quest clears.',
      'InsigniaFirst Deploy',
      'BoosterEmpty',
    ]);
    expect(screen.getByRole('img', { name: 'Pilot avatar: Standard Issue frame, Nova Visor' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    ['Frame', 'Frames'],
    ['Visor', 'Visors'],
    ['Insignia', 'Title'],
    ['Booster', 'Boosters'],
  ])('the %s slot opens the %s picker, which closes again', async (slot, dialogName) => {
    renderLoadout();
    const picker = await openSlot(slot, dialogName);

    await userEvent.click(picker.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('frame and visor pickers', () => {
    it('list each item with how to unlock it and its state', async () => {
      renderLoadout();
      const frames = await openSlot('Frame', 'Frames');

      expect(frames.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
        'Standard IssueIssued to every pilot.Equipped',
        'CircuitClear 5 quests.Unlocked',
        'Bug HunterSquash 10 bugs.Locked',
      ]);
      expect(frames.getByRole('button', { name: /^Standard Issue/ })).toHaveAttribute('aria-pressed', 'true');
    });

    it('show each visor’s perk', async () => {
      renderLoadout();
      const visors = await openSlot('Visor', 'Visors');

      expect(visors.getByRole('button', { name: /^Ember Visor/ })).toHaveTextContent('Streak shield: one missed day a week won’t break your streak.');
      expect(visors.getByRole('button', { name: /^Nova Visor/ })).toHaveAttribute('aria-pressed', 'true');
    });

    it('equip an unlocked frame', async () => {
      const onEquip = vi.fn(async () => {});
      renderLoadout(PROFILE, onEquip);
      const frames = await openSlot('Frame', 'Frames');

      await userEvent.click(frames.getByRole('button', { name: /^Circuit/ }));
      expect(onEquip).toHaveBeenCalledWith({ frameId: 21 });
      expect(await frames.findByRole('status')).toHaveTextContent('Circuit equipped.');
    });

    it('equip a visor and say what its perk does', async () => {
      const onEquip = vi.fn(async () => {});
      renderLoadout({ ...PROFILE, loadout: { ...PROFILE.loadout, visor: { rewardId: 30, code: 'visor-standard', name: 'Standard Visor' } } }, onEquip);
      const visors = await openSlot('Visor', 'Visors');

      await userEvent.click(visors.getByRole('button', { name: /^Nova Visor/ }));
      expect(onEquip).toHaveBeenCalledWith({ visorId: 32 });
      expect(await visors.findByRole('status')).toHaveTextContent('Nova Visor equipped. Perk: +10% XP on first-time quest clears.');
    });

    it('say how to unlock a locked item, and equip nothing', async () => {
      const onEquip = vi.fn(async () => {});
      renderLoadout(PROFILE, onEquip);
      const visors = await openSlot('Visor', 'Visors');

      await userEvent.click(visors.getByRole('button', { name: /^Ember Visor/ }));
      expect(visors.getByRole('status')).toHaveTextContent('Ember Visor is locked. Deploy 3 days in a row.');
      await userEvent.click(visors.getByRole('button', { name: /^Nova Visor/ }));
      expect(visors.getByRole('status')).toHaveTextContent('Nova Visor is already equipped.');
      expect(onEquip).not.toHaveBeenCalled();
    });

    it('show why equipping failed', async () => {
      respond('patch', '/profile/me', 400, { error: 'Check the highlighted fields.', fields: { frameId: 'Choose a frame you have unlocked.' } });
      renderLoadout(PROFILE, async (update) => {
        await updateProfile(update);
      });
      const frames = await openSlot('Frame', 'Frames');

      await userEvent.click(frames.getByRole('button', { name: /^Circuit/ }));
      expect(await frames.findByRole('alert')).toHaveTextContent('Choose a frame you have unlocked.');
    });
  });

  describe('title picker', () => {
    it('lists earned insignia first and marks the current title', async () => {
      renderLoadout();
      const titles = await openSlot('Insignia', 'Title');

      expect(titles.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
        'First DeployClear your first quest.Your title',
        'CommanderReach Commander.Earned',
        'Bug HunterSquash 10 bugs.Locked',
      ]);
    });

    it('sets an earned insignia as the title, or none', async () => {
      const onEquip = vi.fn(async () => {});
      renderLoadout(PROFILE, onEquip);
      const titles = await openSlot('Insignia', 'Title');

      await userEvent.click(titles.getByRole('button', { name: /^Commander/ }));
      expect(onEquip).toHaveBeenCalledWith({ titleId: 8 });
      expect(await titles.findByRole('status')).toHaveTextContent('Commander is now your title.');

      await userEvent.click(titles.getByRole('button', { name: 'Show no title' }));
      expect(onEquip).toHaveBeenLastCalledWith({ titleId: null });
    });

    it('says how to earn a locked insignia', async () => {
      const onEquip = vi.fn(async () => {});
      renderLoadout({ ...PROFILE, title: null }, onEquip);
      const titles = await openSlot('Insignia', 'Title');

      await userEvent.click(titles.getByRole('button', { name: /^Bug Hunter/ }));
      expect(titles.getByRole('status')).toHaveTextContent('Bug Hunter isn’t earned yet. Squash 10 bugs.');
      expect(titles.queryByRole('button', { name: 'Show no title' })).not.toBeInTheDocument();
      expect(onEquip).not.toHaveBeenCalled();
    });
  });

  describe('booster picker', () => {
    it('activates a booster', async () => {
      const calls = respond('post', '/profile/me/boosters/5/activate', 200, { profile: PROFILE });
      const onBoosterActivated = renderLoadout();
      const boosters = await openSlot('Booster', 'Boosters');

      expect(boosters.getByText('2× XP · 3 quests')).toBeInTheDocument();
      await userEvent.click(boosters.getByRole('button', { name: /^Activate\s*Overdrive Core$/ }));

      await vi.waitFor(() => expect(onBoosterActivated).toHaveBeenCalledWith(PROFILE));
      expect(calls).toHaveLength(1);
    });

    it('shows why a booster couldn’t start', async () => {
      respond('post', '/profile/me/boosters/5/activate', 409, { error: 'A booster is already running. Use it up first, Pilot.' });
      renderLoadout();
      const boosters = await openSlot('Booster', 'Boosters');

      await userEvent.click(boosters.getByRole('button', { name: /^Activate/ }));
      expect(await boosters.findByRole('alert')).toHaveTextContent('A booster is already running.');
    });

    it('runs one booster at a time', async () => {
      const boosters = [
        { boosterId: 5, name: 'Overdrive Core', xpMultiplier: 2, chargesRemaining: 1, active: true },
        { boosterId: 6, name: 'Spare Core', xpMultiplier: 1.5, chargesRemaining: 2, active: false },
      ];
      renderLoadout({ ...PROFILE, boosters, loadout: { ...PROFILE.loadout, booster: 'Overdrive Core' } });
      const picker = await openSlot('Booster', 'Boosters');

      expect(picker.getByText('Running')).toBeInTheDocument();
      expect(picker.getByText('2× XP · 1 quest')).toBeInTheDocument();
      expect(picker.getByRole('button', { name: /^Activate\s*Spare Core$/ })).toBeDisabled();
      expect(picker.getByText(/One booster runs at a time/)).toBeInTheDocument();
    });

    it('explains how to get a booster', async () => {
      renderLoadout({ ...PROFILE, boosters: [] });
      const boosters = await openSlot('Booster', 'Boosters');
      expect(boosters.getByText('None yet. Some quests award a booster on their first clear.')).toBeInTheDocument();
    });
  });
});

describe('PilotAvatar', () => {
  it('names the frame and visor, using the Standard ones when nothing is equipped', () => {
    const { rerender } = render(<PilotAvatar frame={{ rewardId: 21, code: 'frame-circuit', name: 'Circuit' }} visor={null} />);
    expect(screen.getByRole('img', { name: 'Pilot avatar: Circuit frame, Standard Visor' })).toBeInTheDocument();

    rerender(<PilotAvatar />);
    expect(screen.getByRole('img', { name: 'Pilot avatar: Standard Issue frame, Standard Visor' })).toBeInTheDocument();
  });

  it('tints the glass by visor, with the Standard look for an unknown code', () => {
    const { container, rerender } = render(<PilotAvatar visor={{ rewardId: 31, code: 'visor-ember', name: 'Ember' }} />);
    expect(container.querySelector('svg')).toHaveClass('text-swarm');

    rerender(<PilotAvatar visor={{ rewardId: 99, code: 'visor-new', name: 'New' }} />);
    expect(container.querySelector('svg')).toHaveClass('text-accent');
  });

  it('can be hidden from screen readers', () => {
    render(<PilotAvatar decorative />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
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
  const noSave = async () => {};

  // A fourth earned insignia, so three can be featured with one left over
  const EARNED_FOUR = [
    ...PROFILE.insignia,
    { rewardId: 9, code: 'streak-5', name: 'Hot Streak', description: 'Five days in a row.', earned: true },
    { rewardId: 10, code: 'decoder', name: 'Decoder', description: 'Decode a transmission.', earned: true },
  ];

  it('lists earned insignia first with their status', () => {
    render(<InsigniaCollection insignia={PROFILE.insignia} featuredIds={[1]} onChooseFeatured={() => {}} onSetFeatured={noSave} />);

    expect(screen.getByText('2 of 3 earned · click an insignia to feature it (up to 3)')).toBeInTheDocument();
    const items = within(screen.getByRole('region', { name: 'Insignia collection' })).getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['First Deploy Featured', 'CommanderEarned', 'Bug HunterLocked']);
  });

  it('features an earned insignia straight away when there’s a free slot', async () => {
    const onSetFeatured = vi.fn(async () => {});
    render(<InsigniaCollection insignia={PROFILE.insignia} featuredIds={[1]} onChooseFeatured={() => {}} onSetFeatured={onSetFeatured} />);

    await userEvent.click(screen.getByRole('button', { name: /^Commander/ }));
    expect(onSetFeatured).toHaveBeenCalledWith([1, 8]);
    expect(await screen.findByRole('status')).toHaveTextContent('Commander is now featured.');
  });

  it('asks which one to replace when all three slots are taken', async () => {
    const onSetFeatured = vi.fn(async () => {});
    render(<InsigniaCollection insignia={EARNED_FOUR} featuredIds={[1, 8, 9]} onChooseFeatured={() => {}} onSetFeatured={onSetFeatured} />);

    await userEvent.click(screen.getByRole('button', { name: /^Decoder/ }));
    expect(onSetFeatured).not.toHaveBeenCalled();
    expect(screen.getByText(/All three slots are taken/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Replace Commander' }));
    expect(onSetFeatured).toHaveBeenCalledWith([1, 10, 9]); // same slot
    expect(await screen.findByRole('status')).toHaveTextContent('Decoder is now featured.');
  });

  it('offers to remove an insignia that’s already featured', async () => {
    const onSetFeatured = vi.fn(async () => {});
    render(<InsigniaCollection insignia={PROFILE.insignia} featuredIds={[1, 8]} onChooseFeatured={() => {}} onSetFeatured={onSetFeatured} />);

    await userEvent.click(screen.getByRole('button', { name: /^First Deploy/ }));
    expect(screen.getByText(/is featured in slot/)).toHaveTextContent('First Deploy is featured in slot 1.');
    await userEvent.click(screen.getByRole('button', { name: 'Remove from featured' }));
    expect(onSetFeatured).toHaveBeenCalledWith([8]);
  });

  it('says how to earn an insignia that isn’t earned yet, and features nothing', async () => {
    const onSetFeatured = vi.fn(async () => {});
    render(<InsigniaCollection insignia={PROFILE.insignia} featuredIds={[]} onChooseFeatured={() => {}} onSetFeatured={onSetFeatured} />);

    await userEvent.click(screen.getByRole('button', { name: /^Bug Hunter/ }));
    expect(screen.getByRole('region', { name: 'Bug Hunter insignia' })).toHaveTextContent("Bug Hunter isn't earned yet. Squash 10 bugs.");
    expect(onSetFeatured).not.toHaveBeenCalled();
  });

  it('shows why featuring failed', async () => {
    const onSetFeatured = vi.fn(async () => {
      throw new Error('Only earned insignia can be featured.');
    });
    render(<InsigniaCollection insignia={PROFILE.insignia} featuredIds={[]} onChooseFeatured={() => {}} onSetFeatured={onSetFeatured} />);

    await userEvent.click(screen.getByRole('button', { name: /^Commander/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Only earned insignia can be featured.');
  });

  it('opens the full collection, grouped, and closes it', async () => {
    render(<InsigniaCollection insignia={PROFILE.insignia} featuredIds={[1]} onChooseFeatured={() => {}} onSetFeatured={noSave} />);
    await userEvent.click(screen.getByRole('button', { name: /View all/ }));

    const dialog = screen.getByRole('dialog', { name: 'Insignia collection' });
    expect(within(dialog).getByText('Earned · 2')).toBeInTheDocument();
    expect(within(dialog).getByText('Locked · 1')).toBeInTheDocument();
    expect(within(dialog).getByText('Squash 10 bugs.')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('features from the full collection too', async () => {
    const onSetFeatured = vi.fn(async () => {});
    render(<AllInsigniaDialog insignia={PROFILE.insignia} featuredIds={[]} onSetFeatured={onSetFeatured} onClose={() => {}} />);

    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Commander/ }));
    expect(onSetFeatured).toHaveBeenCalledWith([8]);
  });

  it('asks to choose featured insignia', async () => {
    const onChooseFeatured = vi.fn();
    render(<InsigniaCollection insignia={PROFILE.insignia} featuredIds={[]} onChooseFeatured={onChooseFeatured} onSetFeatured={noSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Choose featured' }));
    expect(onChooseFeatured).toHaveBeenCalled();
  });

  it('closes the full collection with Escape and skips empty groups', () => {
    const onClose = vi.fn();
    render(<AllInsigniaDialog insignia={PROFILE.insignia.filter((i) => i.earned)} featuredIds={[]} onSetFeatured={noSave} onClose={onClose} />);

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
