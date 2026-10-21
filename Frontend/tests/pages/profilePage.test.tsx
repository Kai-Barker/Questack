import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import EditProfileDialog from '../../src/components/profile/EditProfileDialog';
import ProfilePage from '../../src/pages/ProfilePage';
import type { PilotProfile } from '../../src/types/profile';
import { PROFILE } from '../helpers/fixtures';
import { renderRoute } from '../helpers/render';
import { respond } from '../helpers/server';

// The pilot's own profile page and the profile editor

describe('ProfilePage', () => {
  it('shows a loading skeleton, then the profile', async () => {
    respond('get', '/profile/me', 200, { profile: PROFILE });
    renderRoute(<ProfilePage />);

    expect(screen.getByText('Loading pilot profile…')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Vega-7' })).toBeInTheDocument();
    expect(screen.getByText('Title:').parentElement).toHaveTextContent('First Deploy');
    expect(screen.getByText('Level 3 · Pilot in C# · Enlisted Jan 2026')).toBeInTheDocument();
    expect(screen.getByText('Reading code across the stars.')).toBeInTheDocument();
    for (const panel of ['Loadout', 'Service record', 'Flight log', 'XP history', 'Sector progress', 'Insignia collection']) {
      expect(screen.getByRole('region', { name: panel })).toBeInTheDocument();
    }
  });

  it('explains a failed load and retries it', async () => {
    respond('get', '/profile/me', 500, {});
    const { user } = renderRoute(<ProfilePage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Command responded with an error (500).');

    respond('get', '/profile/me', 200, { profile: PROFILE });
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Vega-7' })).toBeInTheDocument();
  });

  it.each([
    ['Edit profile', /New callsign/],
    ['Change current goal', /Current goal/],
  ])('"%s" opens the editor on the right field', async (button, field) => {
    respond('get', '/profile/me', 200, { profile: PROFILE });
    const { user } = renderRoute(<ProfilePage />);
    await screen.findByRole('heading', { level: 1, name: 'Vega-7' });

    await user.click(screen.getByRole('button', { name: new RegExp(button.replace(' current goal', '\\s*current goal')) }));

    expect(screen.getByRole('dialog', { name: 'Edit profile' })).toBeInTheDocument();
    expect(screen.getByLabelText(field)).toHaveFocus();
  });

  it('"Choose featured" opens the editor on the insignia picker', async () => {
    respond('get', '/profile/me', 200, { profile: PROFILE });
    const { user } = renderRoute(<ProfilePage />);
    await screen.findByRole('heading', { level: 1, name: 'Vega-7' });

    await user.click(screen.getByRole('button', { name: 'Choose featured' }));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /^First Deploy/ })).toHaveFocus();
  });

  it('clicking an earned insignia features it and shows it in the header', async () => {
    respond('get', '/profile/me', 200, { profile: PROFILE });
    const save = respond('patch', '/profile/me', 200, { profile: { ...PROFILE, featuredIds: [1, 8] } });
    const { user } = renderRoute(<ProfilePage />);
    await screen.findByRole('heading', { level: 1, name: 'Vega-7' });

    const collection = screen.getByRole('region', { name: 'Insignia collection' });
    await user.click(within(collection).getByRole('button', { name: /^Commander/ }));

    expect(save[0]!.body).toEqual({ featuredIds: [1, 8] });
    expect(await within(collection).findByRole('status')).toHaveTextContent('Commander is now featured.');
  });

  it('activating a booster updates the page and the nav', async () => {
    respond('get', '/profile/me', 200, { profile: PROFILE });
    const running = { ...PROFILE, boosters: [{ ...PROFILE.boosters[0]!, active: true }], loadout: { ...PROFILE.loadout, booster: 'Overdrive Core' } };
    respond('post', '/profile/me/boosters/5/activate', 200, { profile: running });
    const { user, pilot } = renderRoute(<ProfilePage />);
    await screen.findByRole('heading', { level: 1, name: 'Vega-7' });

    await user.click(screen.getByRole('button', { name: /^Activate\s*Overdrive Core$/ }));

    expect(await screen.findByText('Running')).toBeInTheDocument();
    expect(pilot.reload).toHaveBeenCalled();
  });

  it('a changed callsign refreshes the signed-in account', async () => {
    respond('get', '/profile/me', 200, { profile: PROFILE });
    respond('patch', '/profile/me/callsign', 200, { profile: { ...PROFILE, callsign: 'Orion' } });
    const { user, auth } = renderRoute(<ProfilePage />);
    await screen.findByRole('heading', { level: 1, name: 'Vega-7' });

    await user.click(screen.getByRole('button', { name: /Edit profile/ }));
    const callsign = screen.getByLabelText(/New callsign/);
    await user.clear(callsign);
    await user.type(callsign, 'Orion');
    await user.type(screen.getByLabelText(/^Access code/), 'access123');
    await user.click(screen.getByRole('button', { name: 'Update callsign' }));

    expect(await screen.findByText('Callsign updated. Sign in as Orion from now on.')).toBeInTheDocument();
    expect(auth.refreshUser).toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1, name: 'Orion' })).toBeInTheDocument();
  });
});

describe('EditProfileDialog', () => {
  function renderEditor(profile: PilotProfile = PROFILE, overrides: Partial<ComponentProps<typeof EditProfileDialog>> = {}) {
    const props = { profile, onSaved: vi.fn(), onClose: vi.fn(), ...overrides };
    render(<EditProfileDialog {...props} />);
    return { ...props, user: userEvent.setup() };
  }

  const updateCallsign = () => screen.getByRole('button', { name: 'Update callsign' });

  describe('callsign', () => {
    it('can only be updated once changed, and then asks for the access code', async () => {
      const { user } = renderEditor();
      expect(updateCallsign()).toBeDisabled();
      expect(screen.queryByLabelText(/^Access code/)).not.toBeInTheDocument();

      await user.type(screen.getByLabelText(/New callsign/), 'X');
      expect(updateCallsign()).toBeEnabled();
      expect(screen.getByLabelText(/^Access code/)).toBeInTheDocument();
      expect(screen.getByText('Looks good')).toBeInTheDocument();
    });

    it('checks the format and the access code before sending', async () => {
      const calls = respond('patch', '/profile/me/callsign', 200, { profile: PROFILE });
      const { user } = renderEditor();
      const field = screen.getByLabelText(/New callsign/);

      await user.clear(field);
      await user.type(field, 'no spaces');
      await user.click(updateCallsign());
      expect(screen.getByText('Use letters, numbers, - and _ only.')).toBeInTheDocument();

      await user.clear(field);
      await user.type(field, 'Orion');
      await user.click(updateCallsign());
      expect(screen.getByText('Enter your access code to confirm.')).toBeInTheDocument();
      expect(calls).toHaveLength(0);
    });

    it('saves with Enter and reports the change', async () => {
      const calls = respond('patch', '/profile/me/callsign', 200, { profile: { ...PROFILE, callsign: 'Orion' } });
      const { user, onSaved } = renderEditor();
      const field = screen.getByLabelText(/New callsign/);
      await user.clear(field);
      await user.type(field, 'Orion');
      await user.type(screen.getByLabelText(/^Access code/), 'access123{Enter}');

      expect(await screen.findByRole('status')).toHaveTextContent('Callsign updated. Sign in as Orion from now on.');
      expect(calls[0]!.body).toEqual({ callsign: 'Orion', password: 'access123' });
      expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ callsign: 'Orion' }), true);
      expect(updateCallsign()).toBeDisabled();
    });

    it.each([
      [400, { error: 'Check the highlighted fields.', fields: { password: 'That access code is incorrect.' } }, 'That access code is incorrect.', false],
      [409, { error: 'That callsign is already taken.', fields: { callsign: 'That callsign is already taken.' } }, 'That callsign is already taken.', false],
      [429, { error: 'Callsign changes are limited to 5 attempts a day. Try again tomorrow.' }, 'Callsign changes are limited to 5 attempts a day. Try again tomorrow.', true],
    ])('shows a %i from the server', async (status, body, message, asAlert) => {
      respond('patch', '/profile/me/callsign', status, body);
      const { user, onSaved } = renderEditor();
      const field = screen.getByLabelText(/New callsign/);
      await user.clear(field);
      await user.type(field, 'Orion');
      await user.type(screen.getByLabelText(/^Access code/), 'access123');
      await user.click(updateCallsign());

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(screen.queryByRole('alert') !== null).toBe(asAlert);
      expect(onSaved).not.toHaveBeenCalled();
    });
  });

  describe('profile fields', () => {
    const save = () => screen.getByRole('button', { name: 'Save changes' });

    it('counts the bio and turns pasted line breaks into spaces', () => {
      renderEditor();
      const bio = screen.getByLabelText('Bio');
      expect(screen.getByText('30 / 160')).toBeInTheDocument();

      fireEvent.change(bio, { target: { value: 'line one\r\nline two' } });
      expect(bio).toHaveValue('line one line two');
    });

    it('closes without a request when nothing changed', async () => {
      const calls = respond('patch', '/profile/me', 200, { profile: PROFILE });
      const { user, onClose } = renderEditor();

      await user.click(save());
      expect(onClose).toHaveBeenCalled();
      expect(calls).toHaveLength(0);
    });

    it('sends only what changed, then closes', async () => {
      const calls = respond('patch', '/profile/me', 200, { profile: PROFILE });
      const { user, onSaved, onClose } = renderEditor();

      const bio = screen.getByLabelText('Bio');
      await user.clear(bio);
      await user.type(bio, '  New bio  ');
      await user.selectOptions(screen.getByLabelText(/Current goal/), 'Clear the JavaScript Sector');
      await user.selectOptions(screen.getByLabelText(/Title/), 'No title');
      await user.click(save());

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(calls[0]!.body).toEqual({ bio: 'New bio', titleId: null, goalLanguageId: 2 });
      expect(onSaved).toHaveBeenCalledWith(PROFILE, false);
    });

    it('offers only earned insignia as a title', () => {
      renderEditor();
      const options = within(screen.getByLabelText(/Title/)).getAllByRole('option').map((o) => o.textContent);
      expect(options).toEqual(['No title', 'First Deploy', 'Commander']);
    });

    it('picks featured insignia in slot order', async () => {
      const calls = respond('patch', '/profile/me', 200, { profile: PROFILE });
      const { user } = renderEditor();
      const first = screen.getByRole('button', { name: /^First Deploy/ });
      const commander = screen.getByRole('button', { name: /^Commander/ });

      expect(first).toHaveAttribute('aria-pressed', 'true');
      expect(first).toHaveTextContent('featured in slot 1');
      expect(screen.getByText(/1 of 3 chosen\./)).toBeInTheDocument();

      await user.click(commander);
      await user.click(first);
      expect(commander).toHaveTextContent('featured in slot 1');
      expect(first).toHaveAttribute('aria-pressed', 'false');

      await user.click(save());
      await waitFor(() => expect(calls[0]?.body).toEqual({ featuredIds: [8] }));
    });

    it('stops at three featured insignia', () => {
      const insignia = [1, 2, 3, 4].map((rewardId) => ({ rewardId, code: `c${rewardId}`, name: `Badge ${rewardId}`, description: '', earned: true }));
      renderEditor({ ...PROFILE, insignia, featuredIds: [1, 2, 3], title: null });

      expect(screen.getByText(/Remove one to choose another\./)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Badge 4/ })).toBeDisabled();
    });

    it('explains there is nothing to feature yet', () => {
      renderEditor({ ...PROFILE, insignia: PROFILE.insignia.map((i) => ({ ...i, earned: false })), featuredIds: [], title: null });
      expect(screen.getByText('Clear quests to earn your first insignia.')).toBeInTheDocument();
    });

    it('puts server field errors beside the fields', async () => {
      respond('patch', '/profile/me', 400, { error: 'Check the highlighted fields.', fields: { bio: 'Your bio contains characters that can’t be shown.' } });
      const { user, onClose } = renderEditor();
      await user.type(screen.getByLabelText('Bio'), '!');
      await user.click(save());

      expect(await screen.findByText('Your bio contains characters that can’t be shown.')).toBeInTheDocument();
      expect(screen.getByLabelText('Bio')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('shows other failures as an alert', async () => {
      respond('patch', '/profile/me', 429, { error: 'Too many profile changes. Wait 15 minutes, then try again.' });
      const { user } = renderEditor();
      await user.type(screen.getByLabelText('Bio'), '!');
      await user.click(save());

      expect(await screen.findByRole('alert')).toHaveTextContent('Too many profile changes.');
    });
  });

  it.each([
    ['Cancel', () => userEvent.click(screen.getByRole('button', { name: 'Cancel' }))],
    ['the × button', () => userEvent.click(screen.getByRole('button', { name: 'Close' }))],
    ['Escape', async () => fireEvent(screen.getByRole('dialog'), new Event('cancel'))],
  ])('closes with %s', async (_name, close) => {
    const { onClose } = renderEditor();
    await close();
    expect(onClose).toHaveBeenCalled();
  });
});
