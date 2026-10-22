import { useId, useRef, useState, type ReactNode } from 'react';
import { useModalDialog } from '../../hooks/useModalDialog';
import type { GearOption, Insignia, PilotProfile, ProfileUpdate } from '../../types/profile';
import { toRequestFailure } from '../../utils/requestFailure';
import ChamferFrame from '../ui/ChamferFrame';
import PilotAvatar from '../ui/PilotAvatar';
import { BoltIcon, CloseIcon, LockIcon } from '../ui/icons';
import BoosterInventory from './BoosterInventory';
import InsigniaBadge from './InsigniaBadge';

export type LoadoutSlot = 'frame' | 'visor' | 'insignia' | 'booster';

const HEADINGS: Record<LoadoutSlot, { title: string; intro: string }> = {
  frame: { title: 'Frames', intro: 'Frames go around your avatar. Choose one you’ve unlocked to equip it.' },
  visor: { title: 'Visors', intro: 'Visors tint your helmet’s glass. Visors with a bolt give a perk while equipped.' },
  insignia: { title: 'Title', intro: 'Show an earned insignia as your title on your profile.' },
  booster: { title: 'Boosters', intro: 'A running booster multiplies the XP from your next first-time quest clears.' },
};

// Saving a choice from a picker: one save at a time, with a line saying what
// happened. Locked items only get a line saying how to unlock them.
function useChoice(onEquip: (update: ProfileUpdate) => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const save = async (update: ProfileUpdate, done: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await onEquip(update);
      setMessage({ text: done });
    } catch (err) {
      // There's no form field to highlight in a picker, so show the field's message itself
      const failure = toRequestFailure(err);
      setMessage({ text: Object.values(failure.fields)[0] ?? failure.message, error: true });
    } finally {
      setBusy(false);
    }
  };

  return { busy, message, save, say: (text: string) => setMessage({ text }) };
}

function ChoiceMessage({ message }: { message: { text: string; error?: boolean } | null }) {
  return (
    <>
      <p role="status" className="mt-4 text-xs text-slate-300">
        {message && !message.error && message.text}
      </p>
      {message?.error && (
        <p role="alert" className="mt-2 text-xs text-swarm">
          {message.text}
        </p>
      )}
    </>
  );
}

// One row in a picker: a picture, the name, a line of detail and its state
function ChoiceButton({
  picture,
  name,
  detail,
  perk,
  state,
  current,
  earned,
  disabled,
  onClick,
}: {
  picture: ReactNode;
  name: string;
  detail: string;
  perk?: string | null;
  state: string;
  current: boolean;
  earned: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={current}
        className="group block h-full w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait"
      >
        <ChamferFrame
          as="span"
          size="md"
          grow="sm"
          className="h-full"
          borderClassName={current ? 'bg-accent/60' : 'bg-line group-hover:bg-line-bright'}
          innerClassName={`flex items-center gap-3 px-3 py-3 ${earned ? 'bg-space-950' : 'bg-panel'}`}
        >
          {picture}
          {/* Spans, not divs: this sits inside a button */}
          <span className="block min-w-0">
            <span
              className={`block font-display text-sm font-semibold tracking-[0.1em] uppercase ${earned ? 'text-slate-100' : 'text-muted'}`}
            >
              {name}
            </span>
            <span className="block text-xs text-muted">{detail}</span>
            {perk && <span className="mt-0.5 block text-xs text-buff">{perk}</span>}
            <span
              className={`mt-1 block font-display text-[0.6rem] tracking-[0.2em] uppercase ${
                current ? 'text-accent' : earned ? 'text-buff' : 'text-muted'
              }`}
            >
              {state}
            </span>
          </span>
        </ChamferFrame>
      </button>
    </li>
  );
}

const pickerList = 'mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2';

interface PickerProps {
  profile: PilotProfile;
  onEquip: (update: ProfileUpdate) => Promise<void>;
}

// Frames or visors. Each one is previewed on the avatar with the rest of the loadout.
function GearPicker({ slot, profile, onEquip }: PickerProps & { slot: 'frame' | 'visor' }) {
  const { loadout } = profile;
  const options = slot === 'frame' ? profile.gear.frames : profile.gear.visors;
  const { busy, message, save, say } = useChoice(onEquip);

  const choose = (option: GearOption) => {
    if (!option.earned) return say(`${option.name} is locked. ${option.description}`);
    if (loadout[slot]?.rewardId === option.rewardId) return say(`${option.name} is already equipped.`);
    const perk = option.perk ? ` Perk: ${option.perk}` : '';
    void save(slot === 'frame' ? { frameId: option.rewardId } : { visorId: option.rewardId }, `${option.name} equipped.${perk}`);
  };

  return (
    <>
      <ul className={pickerList}>
        {options.map((option) => {
          const current = loadout[slot]?.rewardId === option.rewardId;
          return (
            <ChoiceButton
              key={option.rewardId}
              picture={
                // Locked and perk items carry an icon, so their state isn't shown by colour alone
                <span className={`relative shrink-0 ${option.earned ? '' : 'opacity-50'}`}>
                  <PilotAvatar
                    frame={slot === 'frame' ? option : loadout.frame}
                    visor={slot === 'visor' ? option : loadout.visor}
                    decorative
                    className="size-14"
                  />
                  {(!option.earned || option.perk) && (
                    <span
                      className={`absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full border text-[0.65rem] ${
                        option.earned ? 'border-buff/60 bg-buff-deep text-buff' : 'border-line-bright bg-panel text-muted'
                      }`}
                    >
                      {option.earned ? <BoltIcon /> : <LockIcon />}
                    </span>
                  )}
                </span>
              }
              name={option.name}
              detail={option.description}
              perk={option.perk}
              state={current ? 'Equipped' : option.earned ? 'Unlocked' : 'Locked'}
              current={current}
              earned={option.earned}
              disabled={busy}
              onClick={() => choose(option)}
            />
          );
        })}
      </ul>
      <ChoiceMessage message={message} />
    </>
  );
}

// The title is one of the pilot's earned insignia, or none
function TitlePicker({ profile, onEquip }: PickerProps) {
  const { busy, message, save, say } = useChoice(onEquip);
  const titleId = profile.title?.rewardId ?? null;
  const ordered = [...profile.insignia].sort((a, b) => Number(b.earned) - Number(a.earned));

  const choose = (insignia: Insignia) => {
    if (!insignia.earned) return say(`${insignia.name} isn’t earned yet. ${insignia.description}`);
    if (insignia.rewardId === titleId) return say(`${insignia.name} is already your title.`);
    void save({ titleId: insignia.rewardId }, `${insignia.name} is now your title.`);
  };

  return (
    <>
      <ul className={pickerList}>
        {ordered.map((insignia) => (
          <ChoiceButton
            key={insignia.rewardId}
            picture={<InsigniaBadge code={insignia.code} earned={insignia.earned} size="sm" />}
            name={insignia.name}
            detail={insignia.description}
            state={insignia.rewardId === titleId ? 'Your title' : insignia.earned ? 'Earned' : 'Locked'}
            current={insignia.rewardId === titleId}
            earned={insignia.earned}
            disabled={busy}
            onClick={() => choose(insignia)}
          />
        ))}
      </ul>
      {titleId !== null && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void save({ titleId: null }, 'Title removed.')}
          className="mt-4 font-display text-xs font-semibold tracking-[0.2em] text-accent uppercase hover:text-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Show no title
        </button>
      )}
      <ChoiceMessage message={message} />
    </>
  );
}

interface LoadoutDialogProps extends PickerProps {
  slot: LoadoutSlot;
  onBoosterActivated: (profile: PilotProfile) => void;
  onClose: () => void;
}

// Opened from a Loadout slot. Stays open after a choice, so pilots can try a
// few; the Profile behind it updates as they go.
export default function LoadoutDialog({ slot, profile, onEquip, onBoosterActivated, onClose }: LoadoutDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useModalDialog(dialogRef);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onCancel={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-3xl bg-transparent p-0 text-slate-100 backdrop:bg-space-950/80 backdrop:backdrop-blur-[2px]"
    >
      <ChamferFrame size="lg" borderClassName="bg-accent/70" innerClassName="max-h-[90dvh] overflow-y-auto bg-panel px-5 py-6 sm:px-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-xs font-semibold tracking-[0.25em] text-accent uppercase">Loadout</p>
            <h2 id={headingId} className="mt-1 font-display text-2xl font-bold tracking-[0.1em] uppercase">
              {HEADINGS[slot].title}
            </h2>
            <p className="mt-1 text-xs text-muted">{HEADINGS[slot].intro}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-xl text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            <CloseIcon />
            <span className="sr-only">Close</span>
          </button>
        </header>

        {(slot === 'frame' || slot === 'visor') && <GearPicker slot={slot} profile={profile} onEquip={onEquip} />}
        {slot === 'insignia' && <TitlePicker profile={profile} onEquip={onEquip} />}
        {slot === 'booster' && (
          <div className="mt-3">
            <BoosterInventory boosters={profile.boosters} onActivated={onBoosterActivated} />
          </div>
        )}
      </ChamferFrame>
    </dialog>
  );
}
