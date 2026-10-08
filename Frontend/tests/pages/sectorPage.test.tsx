import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import QuestDetailPanel from '../../src/components/sector/QuestDetailPanel';
import RankSelector from '../../src/components/sector/RankSelector';
import SectorPage from '../../src/pages/SectorPage';
import { PILOT, SECTOR, sectorQuest } from '../helpers/fixtures';
import { fakePilot, renderRoute } from '../helpers/render';
import { respond } from '../helpers/server';

// The Sector Map: one sector's quests, the selected quest's details, and the rank

function renderSector(at = '/sector/1') {
  return renderRoute(<SectorPage />, { path: '/sector/:sectorId', at });
}

const node = (name: RegExp) => screen.getByRole('button', { name });
const detail = () => screen.getByRole('region', { name: 'Selected quest' });

describe('SectorPage', () => {
  it('shows a loading skeleton, then the sector', async () => {
    respond('get', '/sectors/1', 200, SECTOR);
    renderSector();

    expect(screen.getByText('Loading sector…')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('C# Sector');
    expect(screen.getByText('1 of 4 quests cleared')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Galaxy map' })).toHaveAttribute('href', '/');
  });

  it('labels every quest node with its kind and state, and parks the ship', async () => {
    respond('get', '/sectors/1', 200, SECTOR);
    renderSector();
    await screen.findByRole('heading', { level: 1 });

    expect(node(/^Signal Check/)).toHaveAccessibleName('Signal Check, main quest, cleared, your ship is here');
    expect(node(/^Loop Patrol/)).toHaveAccessibleName('Loop Patrol, main quest, Swarm infested, available');
    expect(node(/^Side Scan/)).toHaveAccessibleName('Side Scan, side quest, Swarm infested, available');
    expect(node(/^Deep Space/)).toHaveAccessibleName('Deep Space, main quest, locked');
  });

  it('opens on the next main quest to deploy on', async () => {
    respond('get', '/sectors/1', 200, SECTOR);
    renderSector();
    await screen.findByRole('heading', { level: 1 });

    expect(node(/^Loop Patrol/)).toHaveAttribute('aria-pressed', 'true');
    expect(within(detail()).getByRole('heading', { name: 'Loop Patrol' })).toBeInTheDocument();
    expect(within(detail()).getByText('Swarm infested · Available')).toBeInTheDocument();
    expect(within(detail()).getByRole('link', { name: 'Deploy' })).toHaveAttribute('href', '/quest/2');
  });

  it('explains what a locked quest is waiting for', async () => {
    respond('get', '/sectors/1', 200, SECTOR);
    const { user } = renderSector();
    await screen.findByRole('heading', { level: 1 });

    await user.click(node(/^Deep Space/));

    expect(within(detail()).getByRole('button', { name: 'Locked' })).toBeDisabled();
    expect(within(detail()).getByText('Clear Loop Patrol first.')).toBeInTheDocument();
    expect(within(detail()).getByText(/Loop Patrol ·/).closest('li')).toHaveTextContent('Locked');
  });

  it('offers a replay of a cleared quest at its replay XP', async () => {
    respond('get', '/sectors/1', 200, SECTOR);
    const { user } = renderSector();
    await screen.findByRole('heading', { level: 1 });

    await user.click(node(/^Signal Check/));

    expect(within(detail()).getByText('Swarm purged · Cleared')).toBeInTheDocument();
    expect(within(detail()).getByText('25 XP')).toBeInTheDocument();
    expect(within(detail()).getByRole('link', { name: 'Replay' })).toHaveAttribute('href', '/quest/1');
  });

  it('lists the quests in map order and selects from the list too', async () => {
    respond('get', '/sectors/1', 200, SECTOR);
    const { user } = renderSector();
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('button', { name: 'List view' }));
    const list = screen.getByRole('list', { name: 'Quests in this sector' });
    const rows = within(list).getAllByRole('button');
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Signal Check'),
      expect.stringContaining('Loop Patrol'),
      expect.stringContaining('Side Scan'),
      expect.stringContaining('Deep Space'),
    ]);
    expect(rows[2]).toHaveTextContent('Strings · Easy · Side quest');

    await user.click(rows[2]!);
    expect(rows[2]).toHaveAttribute('aria-pressed', 'true');
    expect(within(detail()).getByRole('heading', { name: 'Side Scan' })).toBeInTheDocument();
  });

  it('shows the server’s reason when a sector can’t be loaded, and retries', async () => {
    respond('get', '/sectors/99', 404, { error: 'This sector is uncharted.' });
    const { user } = renderSector('/sector/99');

    expect(await screen.findByRole('alert')).toHaveTextContent('This sector is uncharted.');
    expect(screen.getByRole('link', { name: 'Galaxy map' })).toHaveAttribute('href', '/');

    respond('get', '/sectors/99', 200, { ...SECTOR, languageId: 99 });
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});

describe('RankSelector', () => {
  const rank = (name: string) => screen.getByRole('button', { name });

  it('shows the current rank', () => {
    renderRoute(<RankSelector languageId={1} initialRank="pilot" />);

    expect(screen.getByRole('group', { name: 'Your rank in this sector' })).toBeInTheDocument();
    expect(rank('pilot')).toHaveAttribute('aria-pressed', 'true');
  });

  it('invites a pilot who hasn’t enlisted to choose', () => {
    renderRoute(<RankSelector languageId={1} />);
    expect(screen.getByText('Choose a rank to enlist')).toBeInTheDocument();
  });

  it('switches straight away and saves the new rank', async () => {
    const calls = respond('patch', '/sectors/1/rank', 204);
    const { user } = renderRoute(<RankSelector languageId={1} initialRank="pilot" />);

    await user.click(rank('commander'));

    expect(rank('commander')).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(calls[0]?.body).toEqual({ proficiencyLevel: 'commander' }));
  });

  it('rolls back and says so when saving fails', async () => {
    respond('patch', '/sectors/1/rank', 500, {});
    const { user } = renderRoute(<RankSelector languageId={1} initialRank="pilot" />);

    await user.click(rank('cadet'));

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save your rank. Try again.");
    expect(rank('pilot')).toHaveAttribute('aria-pressed', 'true');
  });

  it('doesn’t save when the current rank is clicked again', async () => {
    const calls = respond('patch', '/sectors/1/rank', 204);
    const { user } = renderRoute(<RankSelector languageId={1} initialRank="pilot" />);

    await user.click(rank('pilot'));
    expect(calls).toHaveLength(0);
  });
});

describe('QuestDetailPanel', () => {
  const quest = sectorQuest({
    questId: 7,
    title: 'Booster Run',
    xpReward: 100,
    objectives: [
      { challengeOrder: 1, challengeType: 'read_and_explain' },
      { challengeOrder: 2, challengeType: 'bug_hunt' },
    ],
  });

  it('lists the objectives and says there are no prerequisites', () => {
    renderRoute(<QuestDetailPanel quest={quest} state="available" quests={[quest]} />);

    expect(screen.getByText('Objectives (2)')).toBeInTheDocument();
    expect(screen.getByText('Bug hunt')).toBeInTheDocument();
    expect(screen.getByText('None. Open to every pilot.')).toBeInTheDocument();
    expect(screen.getByText('100 XP')).toBeInTheDocument();
  });

  it('shows boosted XP on a first clear while a booster runs', () => {
    const pilot = fakePilot({ pilot: { ...PILOT, activeBooster: { name: 'Overdrive Core', xpMultiplier: 2, questsRemaining: 1 } } });
    renderRoute(<QuestDetailPanel quest={quest} state="available" quests={[quest]} />, { pilot });

    expect(screen.getByText('200 XP')).toBeInTheDocument();
    expect(screen.getByText('(boosted from 100 by Overdrive Core)')).toBeInTheDocument();
    expect(screen.getByText('2× XP · 1 use left')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Change' })).toHaveAttribute('href', '/profile');
  });

  it('never boosts a replay', () => {
    const pilot = fakePilot({ pilot: { ...PILOT, activeBooster: { name: 'Overdrive Core', xpMultiplier: 2, questsRemaining: 3 } } });
    renderRoute(<QuestDetailPanel quest={{ ...quest, cleared: true }} state="cleared" quests={[quest]} />, { pilot });

    expect(screen.getByText('25 XP')).toBeInTheDocument();
    expect(screen.queryByText('200 XP')).not.toBeInTheDocument();
  });

  it('hides the loadout when the pilot has no gear or booster', () => {
    renderRoute(<QuestDetailPanel quest={quest} state="available" quests={[quest]} />, {
      pilot: fakePilot({ pilot: { ...PILOT, loadout: undefined } }),
    });
    expect(screen.queryByText('Loadout')).not.toBeInTheDocument();
  });
});
