import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AuthCheckbox from '../../src/components/auth/AuthCheckbox';
import AuthField from '../../src/components/auth/AuthField';
import AuthShell from '../../src/components/auth/AuthShell';
import FleetStatus from '../../src/components/auth/FleetStatus';
import BootGate from '../../src/components/boot/BootGate';
import SplashScreen from '../../src/components/boot/SplashScreen';
import { useBootSequence } from '../../src/hooks/useBootSequence';
import { useUplink } from '../../src/hooks/useUplink';
import { currentLocation, fakeAuth, renderRoute } from '../helpers/render';
import { respond, unreachable } from '../helpers/server';

vi.mock('../../src/hooks/useBootSequence', () => ({ useBootSequence: vi.fn() }));

describe('AuthField', () => {
  it('labels the input and reports changes', async () => {
    const onChange = vi.fn();
    render(<AuthField id="callsign" label="Callsign" value="" onChange={onChange} hint="Public" />);

    await userEvent.type(screen.getByLabelText('Callsign'), 'V');
    expect(onChange).toHaveBeenCalledWith('V');
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('links its error to the input for screen readers', () => {
    render(<AuthField id="email" label="Email" value="x" onChange={() => {}} error="Enter a valid email address." />);
    const input = screen.getByLabelText('Email');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email address.');
  });

  it('shows a tick when valid, but not alongside an error', () => {
    const { rerender } = render(<AuthField id="c" label="Callsign" value="Vega" onChange={() => {}} valid />);
    expect(screen.getByText('Looks good')).toBeInTheDocument();

    rerender(<AuthField id="c" label="Callsign" value="Vega" onChange={() => {}} valid error="Taken." />);
    expect(screen.queryByText('Looks good')).not.toBeInTheDocument();
  });

  it('has a reveal toggle for access codes', async () => {
    const onToggle = vi.fn();
    render(<AuthField id="pw" label="Access code" value="" onChange={() => {}} reveal={{ shown: false, onToggle }} />);

    await userEvent.click(screen.getByRole('button', { name: /^Reveal\s*access code$/ }));
    expect(onToggle).toHaveBeenCalled();
  });
});

describe('AuthCheckbox', () => {
  it('is a real, labelled checkbox', async () => {
    const onChange = vi.fn();
    render(
      <AuthCheckbox id="t" checked={false} onChange={onChange} error="Accept the terms to enlist.">
        I accept
      </AuthCheckbox>,
    );
    const box = screen.getByRole('checkbox', { name: 'I accept' });

    await userEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(box).toHaveAccessibleDescription('Accept the terms to enlist.');
  });
});

describe('FleetStatus', () => {
  it.each([
    ['checking', 'Checking'],
    ['online', 'Stable'],
    ['degraded', 'Degraded'],
    ['offline', 'Offline'],
  ] as const)('shows the uplink as %s', (uplink, text) => {
    render(<FleetStatus uplink={uplink} />);
    expect(screen.getByText('Uplink').nextElementSibling).toHaveTextContent(text);
    expect(screen.getByText('Sectors open').nextElementSibling).toHaveTextContent('02 / 06');
  });
});

describe('AuthShell', () => {
  function UplinkReader() {
    return <p data-testid="uplink">{useUplink()}</p>;
  }

  function renderShell() {
    renderRoute(<p>root</p>, {
      path: '/unused',
      at: '/login',
      routes: [{ element: <AuthShell />, children: [{ path: 'login', element: <UplinkReader /> }] }],
    });
  }

  it.each([
    ['online', () => respond('get', '/health', 200, { status: 'ok', database: 'connected', timestamp: '' }), 'Online'],
    ['degraded', () => respond('get', '/health', 503, { status: 'degraded', database: 'unreachable', timestamp: '' }), 'Degraded'],
    ['offline', () => unreachable('get', '/health'), 'Offline'],
  ])('checks the backend once and shares "%s" with the page', async (uplink, arrange, label) => {
    arrange();
    renderShell();

    expect(screen.getByTestId('uplink')).toHaveTextContent('checking');
    expect(screen.getByText('Connecting')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('uplink')).toHaveTextContent(uplink));
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('links the wordmark to sign in', () => {
    respond('get', '/health', 200, { status: 'ok', database: 'connected', timestamp: '' });
    renderShell();
    expect(screen.getByRole('link', { name: /QUESTACK/ })).toHaveAttribute('href', '/login');
  });
});

describe('SplashScreen', () => {
  const handlers = () => ({ onRetry: vi.fn(), onRegistered: vi.fn(), onRecruit: vi.fn() });

  it('holds the logo with no bar yet', () => {
    render(<SplashScreen phase="hold" progress={0} caption="Booting" diagnostic={null} showChoices={false} {...handlers()} />);

    expect(screen.getByRole('heading', { name: 'QUESTACK' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows loading progress and the caption', () => {
    render(<SplashScreen phase="loading" progress={0.42} caption="Syncing star charts…" diagnostic={null} showChoices={false} {...handlers()} />);

    expect(screen.getByRole('progressbar', { name: 'Loading Questack' })).toHaveAttribute('aria-valuenow', '42');
    expect(screen.getByRole('status')).toHaveTextContent('Syncing star charts…');
  });

  it('offers the sign-in choices once ready', async () => {
    const h = handlers();
    render(<SplashScreen phase="ready" progress={1} caption="" diagnostic={null} showChoices {...h} />);

    await userEvent.click(screen.getByRole('button', { name: 'Registered pilot' }));
    await userEvent.click(screen.getByRole('button', { name: 'New recruit' }));
    expect(h.onRegistered).toHaveBeenCalled();
    expect(h.onRecruit).toHaveBeenCalled();
  });

  it('shows no choices to a pilot who is already signed in', () => {
    render(<SplashScreen phase="ready" progress={1} caption="" diagnostic={null} showChoices={false} {...handlers()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('explains a failed boot and can retry', async () => {
    const h = handlers();
    render(<SplashScreen phase="error" progress={0.3} caption="" diagnostic="database" showChoices={false} {...h} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Cannot connect to Questack servers');
    expect(screen.getByText('diagnostic · database unreachable')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry uplink' }));
    expect(h.onRetry).toHaveBeenCalled();
  });
});

describe('BootGate', () => {
  function boot(phase: ReturnType<typeof useBootSequence>['phase']) {
    vi.mocked(useBootSequence).mockReturnValue({ phase, progress: phase === 'ready' ? 1 : 0.5, caption: 'Booting', diagnostic: null, retry: vi.fn() });
  }

  function renderGate(at: string, status: 'authenticated' | 'anonymous') {
    return renderRoute(<p>root</p>, {
      path: '/unused',
      at,
      auth: fakeAuth({ status, user: null }),
      routes: [
        {
          element: <BootGate />,
          children: [
            { index: true, element: <p>Galaxy map</p> },
            { path: 'quest/:id', element: <p>Quest page</p> },
            { path: 'login', element: <p>Login page</p> },
            { path: 'enlist', element: <p>Enlist page</p> },
          ],
        },
      ],
    });
  }

  it('plays the splash until the app has loaded', () => {
    boot('loading');
    renderGate('/quest/2', 'authenticated');

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('Quest page')).not.toBeInTheDocument();
  });

  it('takes a signed-in pilot straight to the page they opened', () => {
    boot('ready');
    renderGate('/quest/2', 'authenticated');
    expect(screen.getByText('Quest page')).toBeInTheDocument();
  });

  it('sends a visitor to sign in, then back to the page they opened', async () => {
    boot('ready');
    const { user } = renderGate('/quest/2', 'anonymous');

    await user.click(screen.getByRole('button', { name: 'Registered pilot' }));
    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(currentLocation()).toBe(`/login?next=${encodeURIComponent('/quest/2')}`);
  });

  it('sends a new recruit to enlist, with no ?next= from the home page', async () => {
    boot('ready');
    const { user } = renderGate('/', 'anonymous');

    await user.click(screen.getByRole('button', { name: 'New recruit' }));
    expect(await screen.findByText('Enlist page')).toBeInTheDocument();
    expect(currentLocation()).toBe('/enlist');
  });
});
