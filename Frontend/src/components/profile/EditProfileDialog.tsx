import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useModalDialog } from '../../hooks/useModalDialog';
import { changeCallsign, updateProfile } from '../../services/profileService';
import { BIO_MAX, MAX_FEATURED, type PilotProfile, type ProfileUpdate } from '../../types/profile';
import { callsignError, withoutField } from '../../utils/authRules';
import { toRequestFailure } from '../../utils/requestFailure';
import AuthField from '../auth/AuthField';
import Button from '../ui/Button';
import ChamferFrame from '../ui/ChamferFrame';
import { CloseIcon } from '../ui/icons';
import InsigniaBadge from './InsigniaBadge';

export type EditSection = 'callsign' | 'featured' | 'goal';

const labelClasses =
  'flex items-center gap-2 font-display text-xs tracking-[0.2em] text-muted uppercase group-focus-within:text-accent';
const sectionHeading = 'font-display text-xs font-semibold tracking-[0.25em] text-accent uppercase';

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  const Tag = htmlFor ? 'label' : 'span';
  return (
    <Tag htmlFor={htmlFor} className={labelClasses}>
      <span aria-hidden="true" className="h-px w-2.5 bg-current" />
      {children}
    </Tag>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-swarm">
      {message}
    </p>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: number | null;
  options: { value: number; label: string }[];
  noneLabel: string;
  error?: string;
  onChange: (value: number | null) => void;
}

function SelectField({ id, label, value, options, noneLabel, error, onChange }: SelectFieldProps) {
  return (
    <div className="group">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <ChamferFrame
        size="md"
        className="mt-2"
        borderClassName={error ? 'bg-swarm/70' : 'bg-line group-focus-within:bg-accent/70'}
        innerClassName="relative bg-space-950 group-focus-within:shadow-[inset_3px_0_0_var(--color-accent)]"
      >
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="w-full appearance-none bg-transparent px-5 py-3 pr-10 text-sm text-slate-100 focus:outline-none"
        >
          <option value="" className="bg-space-950">
            {noneLabel}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-space-950">
              {option.label}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted">
          ▾
        </span>
      </ChamferFrame>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

const sameIds = (a: number[], b: number[]) => a.length === b.length && a.every((id, i) => id === b[i]);

interface EditProfileDialogProps {
  profile: PilotProfile;
  focusSection?: EditSection; // which field to start on (e.g. "Change goal" opens on the goal)
  onSaved: (profile: PilotProfile, callsignChanged: boolean) => void;
  onClose: () => void;
}

// Edits go straight to the backend, which checks the session, validates every
// field and rate limits changes. If the session has expired the request comes
// back 401, the pilot is signed out and sent to the login screen.
export default function EditProfileDialog({ profile, focusSection = 'callsign', onSaved, onClose }: EditProfileDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const baseId = useId();
  const ids = {
    callsign: `${baseId}-callsign`,
    bio: `${baseId}-bio`,
    title: `${baseId}-title`,
    featured: `${baseId}-featured`,
    goal: `${baseId}-goal`,
  };

  // Callsign (saved on its own: it's also a login name and more tightly limited)
  const [callsign, setCallsign] = useState(profile.callsign);
  const [callsignSaving, setCallsignSaving] = useState(false);
  const [callsignErrors, setCallsignErrors] = useState<Record<string, string>>({});
  const [callsignNotice, setCallsignNotice] = useState<string | null>(null);
  const [savedCallsign, setSavedCallsign] = useState(profile.callsign);
  const [password, setPassword] = useState('');
  const [passwordShown, setPasswordShown] = useState(false);

  // Everything else, saved together
  const [bio, setBio] = useState(profile.bio ?? '');
  const [titleRewardId, setTitleRewardId] = useState<number | null>(profile.title?.rewardId ?? null);
  const [featured, setFeatured] = useState<number[]>(profile.featuredIds);
  const [goal, setGoal] = useState<number | null>(profile.goal?.languageId ?? null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const earned = profile.insignia.filter((i) => i.earned);

  useModalDialog(dialogRef);

  useEffect(() => {
    const target = { callsign: ids.callsign, featured: ids.featured, goal: ids.goal }[focusSection];
    document.getElementById(target)?.focus();
    // Only on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const callsignTrimmed = callsign.trim();
  const callsignFormatError = callsignError(callsign);
  const callsignUnchanged = callsignTrimmed === savedCallsign;

  const saveCallsign = async () => {
    if (callsignUnchanged || callsignSaving) return;
    if (callsignFormatError) {
      setCallsignErrors({ callsign: callsignFormatError });
      return;
    }
    if (!password) {
      setCallsignErrors({ password: 'Enter your access code to confirm.' });
      return;
    }
    setCallsignSaving(true);
    setCallsignErrors({});
    setCallsignNotice(null);
    try {
      const updated = await changeCallsign(callsignTrimmed, password);
      setSavedCallsign(updated.callsign);
      setCallsign(updated.callsign);
      setPassword('');
      setCallsignNotice(`Callsign updated. Sign in as ${updated.callsign} from now on.`);
      onSaved(updated, true);
    } catch (err) {
      const failure = toRequestFailure(err);
      const { callsign: callsignField, password: passwordField } = failure.fields;
      setCallsignErrors(
        callsignField || passwordField
          ? { ...(callsignField && { callsign: callsignField }), ...(passwordField && { password: passwordField }) }
          : { form: failure.message },
      );
    } finally {
      setCallsignSaving(false);
    }
  };

  const toggleFeatured = (rewardId: number) => {
    setErrors((current) => withoutField(current, 'featuredIds'));
    setFeatured((current) =>
      current.includes(rewardId)
        ? current.filter((id) => id !== rewardId)
        : current.length < MAX_FEATURED
          ? [...current, rewardId]
          : current,
    );
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;

    // Only send what changed
    const update: ProfileUpdate = {};
    if (bio.trim() !== (profile.bio ?? '')) update.bio = bio.trim();
    if (titleRewardId !== (profile.title?.rewardId ?? null)) update.titleId = titleRewardId;
    if (!sameIds(featured, profile.featuredIds)) update.featuredIds = featured;
    if (goal !== (profile.goal?.languageId ?? null)) update.goalLanguageId = goal;
    if (Object.keys(update).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    setErrors({});
    setFormMessage(null);
    try {
      onSaved(await updateProfile(update), false);
      onClose();
    } catch (err) {
      const failure = toRequestFailure(err);
      setErrors(failure.fields);
      // Field errors show beside their fields; anything else goes in the alert
      const known = ['bio', 'titleId', 'featuredIds', 'goalLanguageId'];
      const fieldShown = Object.keys(failure.fields).some((field) => known.includes(field));
      setFormMessage(fieldShown ? null : failure.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl bg-transparent p-0 text-slate-100 backdrop:bg-space-950/80 backdrop:backdrop-blur-[2px]"
    >
      <ChamferFrame size="lg" borderClassName="bg-accent/70" innerClassName="max-h-[90dvh] overflow-y-auto bg-panel px-5 py-6 sm:px-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className={sectionHeading}>Pilot profile</p>
            <h2 id={titleId} className="mt-1 font-display text-2xl font-bold tracking-[0.1em] uppercase">
              Edit profile
            </h2>
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

        {/* ---- Callsign ---- */}
        <section aria-labelledby={`${ids.callsign}-heading`} className="mt-6">
          <h3 id={`${ids.callsign}-heading`} className={sectionHeading}>
            Callsign
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <AuthField
                id={ids.callsign}
                label="New callsign"
                value={callsign}
                onChange={(value) => {
                  setCallsign(value);
                  setCallsignErrors({});
                  setCallsignNotice(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void saveCallsign();
                  }
                }}
                autoComplete="username"
                maxLength={20}
                spellCheck={false}
                error={callsignErrors.callsign}
                valid={!callsignUnchanged && !callsignFormatError}
              />
            </div>
            {/* Asked for once the callsign has been changed */}
            {!callsignUnchanged && (
              <div className="min-w-0">
                <AuthField
                  id={`${ids.callsign}-password`}
                  label="Access code"
                  hint="To confirm"
                  type={passwordShown ? 'text' : 'password'}
                  value={password}
                  onChange={(value) => {
                    setPassword(value);
                    setCallsignErrors((current) => withoutField(withoutField(current, 'password'), 'form'));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void saveCallsign();
                    }
                  }}
                  autoComplete="current-password"
                  maxLength={200}
                  error={callsignErrors.password}
                  reveal={{ shown: passwordShown, onToggle: () => setPasswordShown((shown) => !shown) }}
                />
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              You sign in with your callsign, so changing it needs your access code and is limited to 5 attempts a
              day.
            </p>
            <Button
              variant="outline"
              onClick={() => void saveCallsign()}
              disabled={callsignUnchanged || callsignSaving}
              className="shrink-0"
            >
              {callsignSaving ? 'Updating…' : 'Update callsign'}
            </Button>
          </div>
          {callsignErrors.form && (
            <p role="alert" className="mt-2 text-sm text-swarm">
              {callsignErrors.form}
            </p>
          )}
          <p role="status" className="mt-2 text-sm text-buff empty:hidden">
            {callsignNotice}
          </p>
        </section>

        <hr className="my-6 border-line" />

        {/* ---- Everything else ---- */}
        <form onSubmit={save} noValidate>
          <h3 className={sectionHeading}>Profile</h3>

          <div className="group mt-3">
            <div className="flex items-baseline justify-between gap-3">
              <FieldLabel htmlFor={ids.bio}>Bio</FieldLabel>
              <span
                id={`${ids.bio}-count`}
                className={`font-mono text-xs ${bio.length >= BIO_MAX ? 'text-swarm' : 'text-muted'}`}
              >
                {bio.length} / {BIO_MAX}
              </span>
            </div>
            <ChamferFrame
              size="md"
              className="mt-2"
              borderClassName={errors.bio ? 'bg-swarm/70' : 'bg-line group-focus-within:bg-accent/70'}
              innerClassName="bg-space-950 group-focus-within:shadow-[inset_3px_0_0_var(--color-accent)]"
            >
              <textarea
                id={ids.bio}
                value={bio}
                onChange={(e) => {
                  // A bio is one line: pasted line breaks become spaces
                  setBio(e.target.value.replace(/[\r\n]+/g, ' '));
                  setErrors((current) => withoutField(current, 'bio'));
                }}
                rows={3}
                maxLength={BIO_MAX}
                placeholder="What are you working on, Pilot?"
                aria-invalid={errors.bio ? true : undefined}
                aria-describedby={`${ids.bio}-count${errors.bio ? ` ${ids.bio}-error` : ''}`}
                className="block w-full resize-none bg-transparent px-5 py-3 text-sm text-slate-100 placeholder:text-muted focus:outline-none"
              />
            </ChamferFrame>
            <FieldError id={`${ids.bio}-error`} message={errors.bio} />
          </div>

          <div className="mt-5">
            <SelectField
              id={ids.title}
              label="Title"
              value={titleRewardId}
              noneLabel="No title"
              options={earned.map((i) => ({ value: i.rewardId, label: i.name }))}
              error={errors.titleId}
              onChange={(value) => {
                setTitleRewardId(value);
                setErrors((current) => withoutField(current, 'titleId'));
              }}
            />
            <p className="mt-1.5 text-xs text-muted">Show one of your earned insignia beside your callsign.</p>
          </div>

          <fieldset className="mt-5" aria-describedby={`${ids.featured}-hint`}>
            <legend className="contents">
              <FieldLabel>Featured insignia</FieldLabel>
            </legend>
            <p id={`${ids.featured}-hint`} className="mt-1.5 text-xs text-muted">
              {featured.length} of {MAX_FEATURED} chosen.{' '}
              {featured.length >= MAX_FEATURED ? 'Remove one to choose another.' : 'Only earned insignia can be featured.'}
            </p>
            {earned.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Clear quests to earn your first insignia.</p>
            ) : (
              <ul className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                {earned.map((insignia, i) => {
                  const slot = featured.indexOf(insignia.rewardId);
                  const chosen = slot !== -1;
                  const full = !chosen && featured.length >= MAX_FEATURED;
                  return (
                    <li key={insignia.rewardId}>
                      <button
                        // The first button takes focus when the dialog opens on this section
                        id={i === 0 ? ids.featured : undefined}
                        type="button"
                        aria-pressed={chosen}
                        disabled={full}
                        onClick={() => toggleFeatured(insignia.rewardId)}
                        className="group/pick w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChamferFrame
                          as="span"
                          size="md"
                          borderClassName={chosen ? 'bg-accent' : 'bg-line group-hover/pick:bg-line-bright'}
                          innerClassName={`flex items-center gap-3 px-3 py-2 ${chosen ? 'bg-accent-deep' : 'bg-space-950'}`}
                        >
                          <InsigniaBadge code={insignia.code} size="xs" />
                          <span className="min-w-0 flex-1 font-display text-xs font-semibold tracking-[0.15em] uppercase">
                            {insignia.name}
                          </span>
                          <span
                            aria-hidden="true"
                            className={`grid size-6 shrink-0 place-items-center border font-mono text-xs ${
                              chosen ? 'border-accent text-accent' : 'border-line-bright text-transparent'
                            }`}
                          >
                            {chosen ? slot + 1 : ''}
                          </span>
                          {chosen && <span className="sr-only">, featured in slot {slot + 1}</span>}
                        </ChamferFrame>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <FieldError id={`${ids.featured}-error`} message={errors.featuredIds} />
          </fieldset>

          <div className="mt-5">
            <SelectField
              id={ids.goal}
              label="Current goal"
              value={goal}
              noneLabel="No goal"
              options={profile.sectors.map((s) => ({ value: s.languageId, label: `Clear the ${s.displayName} Sector` }))}
              error={errors.goalLanguageId}
              onChange={(value) => {
                setGoal(value);
                setErrors((current) => withoutField(current, 'goalLanguageId'));
              }}
            />
          </div>

          {formMessage && (
            <p role="alert" className="mt-5 border-l-2 border-swarm bg-swarm/10 px-3 py-2 text-sm text-slate-100">
              {formMessage}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton saving={saving} />
          </div>
        </form>
      </ChamferFrame>
    </dialog>
  );
}

// The shared Button is type="button", so the form's submit button is drawn here
function SubmitButton({ saving }: { saving: boolean }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="group hover-grow inline-block font-display text-sm font-semibold tracking-[0.2em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      <ChamferFrame
        as="span"
        size="md"
        borderClassName="bg-accent transition-colors group-hover:bg-accent-soft"
        innerClassName="px-4 py-2.5 text-center text-space-950"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </ChamferFrame>
    </button>
  );
}
