import { describe, expect, it } from 'vitest';
import { CENTRE, MAP_SIZE, minSweep, polar, RING, slotAngles, toPercent, wedgePath } from '../../../src/components/map/sectorGeometry';
import { layoutQuests } from '../../../src/components/sector/questLayout';
import { SECTOR, sectorQuest } from '../../helpers/fixtures';

describe('sectorGeometry', () => {
  it('centres the map', () => {
    expect(CENTRE).toBe(MAP_SIZE / 2);
  });

  it.each([
    [0, { x: 500, y: 400 }], // 3 o'clock
    [90, { x: 400, y: 500 }], // 6 o'clock (SVG's y points down)
    [-90, { x: 400, y: 300 }], // 12 o'clock
    [180, { x: 300, y: 400 }], // 9 o'clock
  ])('polar(100, %i°) is %o', (angle, expected) => {
    const point = polar(100, angle);
    expect(point.x).toBeCloseTo(expected.x);
    expect(point.y).toBeCloseTo(expected.y);
  });

  it('starts slot 0 at 12 o’clock and runs clockwise', () => {
    expect(slotAngles(0, 6)).toEqual({ start: -90, end: -30, mid: -60 });
    expect(slotAngles(5, 6)).toEqual({ start: 210, end: 270, mid: 240 });
    expect(slotAngles(0, 1)).toEqual({ start: -90, end: 270, mid: 90 });
  });

  it('minSweep is twice the edge trim plus a visible degree', () => {
    const trim = (Math.asin(RING.gap / 2 / RING.inner) * 180) / Math.PI;
    expect(minSweep(RING.inner)).toBeCloseTo(trim * 2 + 1);
  });

  it('minSweep stays finite when the gap is wider than the ring', () => {
    expect(Number.isFinite(minSweep(2, 100))).toBe(true);
  });

  it('wedgePath draws a closed ring segment', () => {
    const path = wedgePath(RING.inner, RING.outer, -90, -30);

    expect(path).toMatch(/^M [\d.]+ [\d.]+ A 350 350 0 0 1 [\d.]+ [\d.]+ L [\d.]+ [\d.]+ A 128 128 0 0 0 [\d.]+ [\d.]+ Z$/);
  });

  it('wedgePath uses the large arc for a sweep over 180°', () => {
    expect(wedgePath(RING.inner, RING.outer, -90, 150)).toContain('A 350 350 0 1 1');
  });

  it('toPercent turns map units into percentages of the box', () => {
    expect(toPercent({ x: 400, y: 200 })).toEqual({ left: 50, top: 25 });
  });
});

describe('layoutQuests', () => {
  const layout = layoutQuests(SECTOR.quests);
  const at = (id: number) => layout.positions.get(id)!;

  it('puts each quest in the column of its longest prerequisite chain', () => {
    expect(at(1).x).toBe(8);
    expect(at(2).x).toBe(50);
    expect(at(3).x).toBe(50);
    expect(at(4).x).toBe(92);
  });

  it('stacks a column around the centre, main quests above side quests', () => {
    expect(at(1).y).toBe(50);
    expect(at(2).y).toBe(35); // main
    expect(at(3).y).toBe(65); // side
  });

  it('lists quests column by column, top to bottom', () => {
    expect(layout.order.map((q) => q.questId)).toEqual([1, 2, 3, 4]);
  });

  it('draws an edge from each prerequisite', () => {
    expect(layout.edges).toEqual([
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 2, to: 4 },
    ]);
  });

  it('centres a single column', () => {
    expect(layoutQuests([sectorQuest({ questId: 9 })]).positions.get(9)).toEqual({ x: 50, y: 50 });
  });

  it('ignores prerequisites outside the sector', () => {
    const result = layoutQuests([sectorQuest({ questId: 9, prerequisiteIds: [99] })]);
    expect(result.edges).toEqual([]);
    expect(result.positions.get(9)!.x).toBe(50);
  });

  it('survives a circular chain instead of looping forever', () => {
    const result = layoutQuests([sectorQuest({ questId: 5, prerequisiteIds: [6] }), sectorQuest({ questId: 6, prerequisiteIds: [5] })]);
    expect(result.positions.size).toBe(2);
  });

  it('handles an empty sector', () => {
    expect(layoutQuests([])).toEqual({ positions: new Map(), edges: [], order: [], columnCount: 0 });
  });

  it('counts the columns the longest prerequisite chain needs', () => {
    expect(layout.columnCount).toBe(3);
    const chain = Array.from({ length: 12 }, (_, i) => sectorQuest({ questId: i + 1, prerequisiteIds: i ? [i] : [] }));
    expect(layoutQuests(chain).columnCount).toBe(12);
  });
});
