// The XP curve. Clearing level n takes 500 + 250 × (n − 1) XP, so each level
// asks a little more than the last (level 1 → 500, level 7 → 2,000).
// The level is always worked out from total XP, so the two can never disagree.

export function xpToClear(level: number): number {
  return 500 + 250 * (level - 1);
}

export interface LevelSnapshot {
  level: number;
  levelXp: number; // XP earned inside the current level
  levelXpRequired: number; // XP needed to finish the current level
}

export function levelFromXp(totalXp: number): LevelSnapshot {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (remaining >= xpToClear(level)) {
    remaining -= xpToClear(level);
    level++;
  }
  return { level, levelXp: remaining, levelXpRequired: xpToClear(level) };
}
