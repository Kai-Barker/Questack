import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UplinkContext } from '../../src/hooks/useUplink';
import AuthInfoPage from '../../src/pages/AuthInfoPage';
import EnlistPage from '../../src/pages/EnlistPage';
import LoginPage from '../../src/pages/LoginPage';
import PlaceholderPage from '../../src/pages/PlaceholderPage';
import { axiosError } from '../helpers/axios';
import { USER } from '../helpers/fixtures';
import { currentLocation, fakeAuth, renderRoute } from '../helpers/render';

// The signed-out screens: Login, Enlist and the info pages

const statusLine = () => screen.getByText(/^>/);

describe('LoginPage', () => {
  function renderLogin(at = '/login', auth = fakeAuth({ status: 'anonymous', user: null })) {
    return renderRoute(<LoginPage />, { path: '/login', at, auth });
  }

  it('waits for credentials', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: 'Welcome back, Pilot' })).toBeInTheDocument();
    expect(statusLine()).toHaveTextContent('> awaiting credentials');
    expect(screen.getByRole('checkbox', { name: 'Keep this terminal signed in' })).toBeChecked();
  });

  it('asks for both fields before sending anything', async () => {
    const { user, auth } = renderLogin();
    await user.click(screen.getByRole('button', { name: 'Authenticate' }));

    expect(screen.getByText('Enter your callsign or email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your access code.')).toBeInTheDocument();
    expect(screen.getByLabelText('Pilot ID / email')).toHaveAttribute('aria-invalid', 'true');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('clears a field’s error as soon as it is edited', async () => {
    const { user } = renderLogin();
    await user.click(screen.getByRole('button', { name: 'Authenticate' }));
    await user.type(screen.getByLabelText('Pilot ID / email'), 'V');

    expect(screen.queryByText('Enter your callsign or email.')).not.toBeInTheDocument();
    expect(screen.getByText('Enter your access code.')).toBeInTheDocument();
  });

  it('signs in and goes where the pilot was heading', async () => {
    const { user, auth } = renderLogin('/login?next=%2Fprofile');
    await user.type(screen.getByLabelText('Pilot ID / email'), '  Vega-7  ');
    await user.type(screen.getByLabelText('Access code'), 'access123');
    await user.click(screen.getByRole('checkbox', { name: 'Keep this terminal signed in' }));
    await user.click(screen.getByRole('button', { name: 'Authenticate' }));

    expect(auth.login).toHaveBeenCalledWith({ identifier: 'Vega-7', password: 'access123', remember: false });
    await waitFor(() => expect(currentLocation()).toBe('/profile'));
  });

  it('goes to the galaxy map by default, and never off-site', async () => {
    const { user } = renderLogin('/login?next=https%3A%2F%2Fevil.example');
    await user.type(screen.getByLabelText('Pilot ID / email'), 'Vega-7');
    await user.type(screen.getByLabelText('Access code'), 'access123');
    await user.click(screen.getByRole('button', { name: 'Authenticate' }));

    await waitFor(() => expect(currentLocation()).toBe('/'));
  });

  it.each([
    [401, 'Pilot ID or access code is incorrect.', '> access denied'],
    [429, 'Too many access attempts from this terminal. Wait 15 minutes, then try again.', '> terminal locked: too many attempts'],
    [500, 'Something went wrong aboard the ship.', '> transmission failed'],
  ])('shows a %i, clears the access code and lets the pilot try again', async (status, message, line) => {
    const auth = fakeAuth({ status: 'anonymous', user: null, login: vi.fn().mockRejectedValue(axiosError(status, { error: message })) });
    const { user } = renderLogin('/login', auth);
    await user.type(screen.getByLabelText('Pilot ID / email'), 'Vega-7');
    await user.type(screen.getByLabelText('Access code'), 'wrong1234');
    await user.click(screen.getByRole('button', { name: 'Authenticate' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(statusLine()).toHaveTextContent(line);
    expect(screen.getByLabelText('Access code')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Authenticate' })).toBeEnabled();
  });

  it('says the uplink is lost when the backend can’t be reached', async () => {
    const auth = fakeAuth({ status: 'anonymous', user: null, login: vi.fn().mockRejectedValue(axiosError()) });
    const { user } = renderLogin('/login', auth);
    await user.type(screen.getByLabelText('Pilot ID / email'), 'Vega-7');
    await user.type(screen.getByLabelText('Access code'), 'access123');
    await user.click(screen.getByRole('button', { name: 'Authenticate' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach Questack command.');
    expect(statusLine()).toHaveTextContent('> uplink lost');
  });

  it('shows server field errors next to the fields, not as an alert', async () => {
    const error = axiosError(400, { error: 'Check the highlighted fields.', fields: { identifier: 'Too long.' } });
    const auth = fakeAuth({ status: 'anonymous', user: null, login: vi.fn().mockRejectedValue(error) });
    const { user } = renderLogin('/login', auth);
    await user.type(screen.getByLabelText('Pilot ID / email'), 'Vega-7');
    await user.type(screen.getByLabelText('Access code'), 'access123');
    await user.click(screen.getByRole('button', { name: 'Authenticate' }));

    expect(await screen.findByText('Too long.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows it is working while signing in', async () => {
    const auth = fakeAuth({ status: 'anonymous', user: null, login: vi.fn(() => new Promise<typeof USER>(() => {})) });
    const { user } = renderLogin('/login', auth);
    await user.type(screen.getByLabelText('Pilot ID / email'), 'Vega-7');
    await user.type(screen.getByLabelText('Access code'), 'access123');
    await user.click(screen.getByRole('button', { name: 'Authenticate' }));

    expect(screen.getByRole('button', { name: 'Authenticating…' })).toBeDisabled();
    expect(statusLine()).toHaveTextContent('> authenticating…');
  });

  it('reveals and hides the access code', async () => {
    const { user } = renderLogin();
    const field = screen.getByLabelText('Access code');
    expect(field).toHaveAttribute('type', 'password');

    // jsdom drops the space before the visually hidden " access code"
    await user.click(screen.getByRole('button', { name: /^Reveal\s*access code$/ }));
    expect(field).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /^Hide\s*access code$/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps ?next= on the Enlist link and links to recovery', () => {
    renderLogin('/login?next=%2Fprofile');

    expect(screen.getByRole('link', { name: 'Enlist instead' })).toHaveAttribute('href', '/enlist?next=%2Fprofile');
    expect(screen.getByRole('link', { name: 'Recover access' })).toHaveAttribute('href', '/recover');
  });

  it('shows the backend’s status in the fleet panel', () => {
    renderRoute(
      <UplinkContext value="offline">
        <LoginPage />
      </UplinkContext>,
      { path: '/login', auth: fakeAuth({ status: 'anonymous', user: null }) },
    );
    expect(screen.getByText('Uplink').nextElementSibling).toHaveTextContent('Offline');
  });
});

describe('EnlistPage', () => {
  function renderEnlist(at = '/enlist', auth = fakeAuth({ status: 'anonymous', user: null })) {
    return renderRoute(<EnlistPage />, { path: '/enlist', at, auth });
  }

  async function fillIn(user: ReturnType<typeof renderEnlist>['user'], values: Partial<Record<'callsign' | 'email' | 'password' | 'confirm', string>> = {}) {
    const all = { callsign: 'Nova_9', email: 'nova@example.com', password: 'launch2026', confirm: 'launch2026', ...values };
    if (all.callsign) await user.type(screen.getByLabelText('Callsign'), all.callsign);
    if (all.email) await user.type(screen.getByLabelText('Email'), all.email);
    if (all.password) await user.type(screen.getByLabelText('Access code'), all.password);
    if (all.confirm) await user.type(screen.getByLabelText('Confirm'), all.confirm);
  }

  const terms = () => screen.getByRole('checkbox', { name: /I accept the/ });
  const submit = () => screen.getByRole('button', { name: 'Create pilot' });

  it('checks every field before sending anything', async () => {
    const { user, auth } = renderEnlist();
    await user.click(submit());

    for (const message of ['Use at least 3 characters.', 'Enter a valid email address.', 'Use at least 8 characters.', 'Accept the terms to enlist.']) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('catches access codes that don’t match', async () => {
    const { user } = renderEnlist();
    await fillIn(user, { confirm: 'launch2027' });
    await user.click(terms());
    await user.click(submit());

    expect(screen.getByText("The codes don't match.")).toBeInTheDocument();
  });

  it('ticks a valid callsign', async () => {
    const { user } = renderEnlist();
    await user.type(screen.getByLabelText('Callsign'), 'ab');
    expect(screen.queryByText('Looks good')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Callsign'), 'c');
    expect(screen.getByText('Looks good')).toBeInTheDocument();
  });

  it('shows the access code checks as they are met', async () => {
    const { user } = renderEnlist();
    const check = (label: string) => screen.getByText(label).closest('li')!;
    expect(check('8 characters or more')).toHaveTextContent('(not met yet)');

    await fillIn(user, { callsign: '', email: '' });
    expect(check('8 characters or more')).toHaveTextContent('(met)');
    expect(check('Contains a number')).toHaveTextContent('(met)');
    expect(check('Codes match')).toHaveTextContent('(met)');
  });

  it('enlists the pilot and goes on', async () => {
    const { user, auth } = renderEnlist('/enlist?next=%2Fsector%2F1');
    await fillIn(user, { callsign: '  Nova_9 ', email: ' nova@example.com ' });
    await user.click(terms());
    await user.click(submit());

    expect(auth.register).toHaveBeenCalledWith({ callsign: 'Nova_9', email: 'nova@example.com', password: 'launch2026', acceptTerms: true });
    await waitFor(() => expect(currentLocation()).toBe('/sector/1'));
  });

  it('shows a taken callsign or email', async () => {
    const auth = fakeAuth({
      status: 'anonymous',
      user: null,
      register: vi.fn().mockRejectedValue(axiosError(409, { error: 'That callsign or email is already enlisted.' })),
    });
    const { user } = renderEnlist('/enlist', auth);
    await fillIn(user);
    await user.click(terms());
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('That callsign or email is already enlisted.');
    expect(statusLine()).toHaveTextContent('> enlistment rejected');
    expect(submit()).toBeEnabled();
  });

  it('puts the server’s field errors on the fields, and clears them on edit', async () => {
    const error = axiosError(400, { error: 'Check the highlighted fields.', fields: { email: 'That email is too long.' } });
    const auth = fakeAuth({ status: 'anonymous', user: null, register: vi.fn().mockRejectedValue(error) });
    const { user } = renderEnlist('/enlist', auth);
    await fillIn(user);
    await user.click(terms());
    await user.click(submit());

    expect(await screen.findByText('That email is too long.')).toBeInTheDocument();
    expect(statusLine()).toHaveTextContent('> record incomplete: check the highlighted fields');

    await user.type(screen.getByLabelText('Email'), 'x');
    expect(screen.queryByText('That email is too long.')).not.toBeInTheDocument();
  });

  it('opens the terms and privacy policy in a new tab', () => {
    renderEnlist();
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('rel', 'noopener');
  });

  it('keeps ?next= on the sign-in link', () => {
    renderEnlist('/enlist?next=%2Fprofile');
    expect(screen.getByRole('link', { name: 'Already enlisted' })).toHaveAttribute('href', '/login?next=%2Fprofile');
  });
});

describe('AuthInfoPage', () => {
  it.each([
    ['recover', 'Recover access', 'ask a Questack admin'],
    ['terms', 'Terms of service', 'never upload code you are not allowed to share'],
    ['privacy', 'Privacy policy', 'stored only as a bcrypt hash'],
  ] as const)('the %s page explains itself and links back to sign in', (page, title, text) => {
    renderRoute(<AuthInfoPage page={page} />);

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(text))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login');
  });
});

describe('PlaceholderPage', () => {
  it('names the screen, lists the URL’s parameters and links home', () => {
    renderRoute(<PlaceholderPage title="Decode a transmission" />, { path: '/decoder/:id', at: '/decoder/42' });

    expect(screen.getByRole('heading', { name: 'Decode a transmission' })).toBeInTheDocument();
    expect(screen.getByText('id:').nextElementSibling).toHaveTextContent('42');
    expect(screen.getByRole('link', { name: 'Back to galaxy map' })).toHaveAttribute('href', '/');
  });
});
