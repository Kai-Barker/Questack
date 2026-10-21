import type { SectorQuest } from '../../types/sector';

// Works out where every quest node sits on the sector map from its
// prerequisites alone, so admin-created quests never need coordinates.
//
// Column = length of the longest prerequisite chain leading to the quest.
// Within a column, main quests sit above side quests, then display order,
// stacked evenly around the vertical centre.

export interface NodePosition {
  x: number; // % of the map width
  y: number; // % of the map height
}

export interface QuestEdge {
  from: number; // prerequisite quest id
  to: number;
}

export interface QuestLayout {
  positions: Map<number, NodePosition>;
  edges: QuestEdge[];
  order: SectorQuest[]; // column by column, top to bottom (also used by the list view)
  columnCount: number; // the longest prerequisite chain, which sets how wide the map must be
}

const X_MIN = 8;
const X_MAX = 92;
const CENTRE_Y = 50;
const ROW_GAP = 30;

export function layoutQuests(quests: SectorQuest[]): QuestLayout {
  const byId = new Map(quests.map((q) => [q.questId, q]));
  const depths = new Map<number, number>();

  function depth(id: number, visiting: Set<number>): number {
    const cached = depths.get(id);
    if (cached !== undefined) return cached;
    const quest = byId.get(id);
    // Unknown prerequisite or a circular chain (the backend blocks these on save)
    if (!quest || visiting.has(id)) return 0;

    visiting.add(id);
    const prerequisites = quest.prerequisiteIds.filter((p) => byId.has(p));
    const result = prerequisites.length ? 1 + Math.max(...prerequisites.map((p) => depth(p, visiting))) : 0;
    visiting.delete(id);
    depths.set(id, result);
    return result;
  }

  const columns: SectorQuest[][] = [];
  quests.forEach((quest) => {
    const column = depth(quest.questId, new Set());
    (columns[column] ??= []).push(quest);
  });

  const maxColumn = columns.length - 1;
  const positions = new Map<number, NodePosition>();
  const order: SectorQuest[] = [];

  columns.forEach((column = [], columnIndex) => {
    // Array.sort is stable, so display order is kept within main and side groups
    const sorted = [...column].sort((a, b) => Number(a.isSideQuest) - Number(b.isSideQuest));
    const x = maxColumn === 0 ? 50 : X_MIN + (columnIndex * (X_MAX - X_MIN)) / maxColumn;

    sorted.forEach((quest, row) => {
      const y = CENTRE_Y + (row - (sorted.length - 1) / 2) * ROW_GAP;
      positions.set(quest.questId, { x, y });
      order.push(quest);
    });
  });

  const edges = quests.flatMap((quest) =>
    quest.prerequisiteIds.filter((id) => byId.has(id)).map((from) => ({ from, to: quest.questId })),
  );

  return { positions, edges, order, columnCount: columns.length };
}
