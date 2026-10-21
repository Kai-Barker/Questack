import { useState } from 'react';
import { MAX_FEATURED, type Insignia } from '../types/profile';
import { errorMessage } from '../utils/format';

export interface FeaturingStatus {
  tone: 'done' | 'error';
  text: string;
}

// Clicking an insignia on the Profile:
// - earned, with a free slot: it's featured straight away
// - earned, with every slot taken: it's selected, so the pilot can pick which one to replace
// - already featured, or not earned yet: it's selected, to offer removing it or say how to earn it
// `save` stores the new featured list (in slot order).
export function useInsigniaFeaturing(featuredIds: number[], save: (featuredIds: number[]) => Promise<void>) {
  const [selected, setSelected] = useState<Insignia | null>(null);
  const [status, setStatus] = useState<FeaturingStatus | null>(null);
  const [saving, setSaving] = useState(false);

  async function apply(ids: number[], done: string) {
    setSaving(true);
    setStatus(null);
    try {
      await save(ids);
      setSelected(null);
      setStatus({ tone: 'done', text: done });
    } catch (err) {
      setStatus({ tone: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  function choose(item: Insignia) {
    if (saving) return;
    setStatus(null);
    if (item.earned && !featuredIds.includes(item.rewardId) && featuredIds.length < MAX_FEATURED) {
      void apply([...featuredIds, item.rewardId], `${item.name} is now featured.`);
      return;
    }
    setSelected(item);
  }

  // Swaps the selected insignia into the slot `outgoingId` was in
  function replace(outgoingId: number) {
    if (!selected) return;
    const ids = featuredIds.map((id) => (id === outgoingId ? selected.rewardId : id));
    void apply(ids, `${selected.name} is now featured.`);
  }

  function remove() {
    if (!selected) return;
    void apply(
      featuredIds.filter((id) => id !== selected.rewardId),
      `${selected.name} is no longer featured.`,
    );
  }

  return { selected, status, saving, choose, replace, remove, cancel: () => setSelected(null) };
}

export type InsigniaFeaturing = ReturnType<typeof useInsigniaFeaturing>;
