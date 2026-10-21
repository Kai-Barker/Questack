import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QuestListView from '../../src/components/sector/QuestListView';
import QuestMap from '../../src/components/sector/QuestMap';
import { layoutQuests } from '../../src/components/sector/questLayout';
import type { QuestState } from '../../src/utils/quests';
import { sectorQuest } from '../helpers/fixtures';

// The sector map's size and scroll position for long paths, such as the
// 19-column C# curriculum

// A straight chain: quest n needs quest n - 1
const chain = (length: number) =>
  Array.from({ length }, (_, i) => sectorQuest({ questId: i + 1, prerequisiteIds: i ? [i] : [] }));

function renderMap(length: number, shipQuestId: number | null) {
  const quests = chain(length);
  const states = new Map<number, QuestState>(quests.map((q) => [q.questId, 'available']));
  return render(
    <QuestMap layout={layoutQuests(quests)} states={states} selectedId={null} shipQuestId={shipQuestId} onSelect={() => {}} />,
  );
}

const mapBox = () => screen.getByRole('list', { name: 'Quests in this sector' }).parentElement!;

describe('QuestMap', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps its usual width for a short sector', () => {
    renderMap(4, null);
    // Read from the inline style: jsdom can't compute rem-based styles
    expect(mapBox().style.minWidth).toBe('52rem');
  });

  it('gives every column of a long path 10rem, so nodes never overlap', () => {
    renderMap(19, null);
    expect(mapBox().style.minWidth).toBe('190rem');
  });

  it('opens centred on the ship', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(3000);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    const scrollTo = vi.spyOn(Element.prototype, 'scrollTo');

    renderMap(19, 10);

    // Quest 10 is column 9 of 0-18, so it sits at 8% + 9/18 of the 84% span = 50%
    expect(scrollTo).toHaveBeenCalledWith({ left: 3000 * 0.5 - 1000 / 2 });
  });

  it('stays at the start when the ship isn’t in this sector', () => {
    const scrollTo = vi.spyOn(Element.prototype, 'scrollTo');
    renderMap(19, null);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe('QuestListView', () => {
  afterEach(() => vi.restoreAllMocks());

  function renderList(length: number, selectedId: number | null) {
    const quests = chain(length);
    const states = new Map<number, QuestState>(quests.map((q) => [q.questId, 'available']));
    return render(<QuestListView quests={quests} states={states} selectedId={selectedId} onSelect={() => {}} />);
  }

  const listBox = () => screen.getByRole('list', { name: 'Quests in this sector' }).parentElement!;

  it('scrolls inside a box no taller than the map, instead of stretching the page', () => {
    renderList(28, null);
    expect(listBox()).toHaveClass('overflow-y-auto', 'max-h-[30rem]', 'lg:max-h-[34rem]');
    expect(screen.getAllByRole('listitem')).toHaveLength(28);
  });

  it('opens with the selected quest in view', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockReturnValue(1200);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(60);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(480);
    const scrollTo = vi.spyOn(Element.prototype, 'scrollTo');

    renderList(28, 20);

    // The row's middle (1200 + 30) in the middle of the 480px box
    expect(scrollTo).toHaveBeenCalledWith({ top: 1200 + 30 - 240 });
  });
});
