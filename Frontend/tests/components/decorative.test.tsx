import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';
import OrbitalRings from '../../src/components/auth/OrbitalRings';
import QuestMapLegend from '../../src/components/sector/QuestMapLegend';
import QuestNode from '../../src/components/sector/QuestNode';
import ChamferFrame from '../../src/components/ui/ChamferFrame';
import ChevronShape from '../../src/components/ui/ChevronShape';
import GalaxyBackdrop from '../../src/components/ui/GalaxyBackdrop';
import LogoMark from '../../src/components/ui/LogoMark';
import * as icons from '../../src/components/ui/icons';
import { sectorQuest } from '../helpers/fixtures';
import { respond } from '../helpers/server';

// Pieces with no behaviour to test beyond rendering: one smoke test each,
// checking they render and stay out of the accessibility tree

describe('decorative components', () => {
  it.each(['auth', 'app', 'splash'] as const)('OrbitalRings (%s) renders hidden from screen readers', (variant) => {
    const { container } = render(<OrbitalRings variant={variant} boost={variant === 'splash' ? 10 : undefined} />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it.each(['forwardFirst', 'forward', 'backward'] as const)('ChevronShape (%s) renders', (kind) => {
    const { container } = render(<ChevronShape kind={kind} inflate={2} className="fill-accent" />);
    expect(container.firstElementChild).not.toBeNull();
  });

  it('ChamferFrame renders its content as a div or span, growing or not', () => {
    render(
      <>
        <ChamferFrame size="sm">div frame</ChamferFrame>
        <ChamferFrame as="span" size="octagon" grow="md">
          span frame
        </ChamferFrame>
      </>,
    );
    expect(screen.getByText('div frame').closest('div')).not.toBeNull();
    expect(screen.getByText('span frame').closest('span')).not.toBeNull();
  });

  it('GalaxyBackdrop is hidden from screen readers', () => {
    const { container } = render(<GalaxyBackdrop deep />);
    expect([...container.children].every((el) => el.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('LogoMark is decorative (the wordmark beside it names it)', () => {
    const { container } = render(<LogoMark size={64} />);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('width', '64');
  });

  it('every icon is hidden from screen readers', () => {
    for (const [name, Icon] of Object.entries(icons)) {
      const { container, unmount } = render(<Icon />);
      expect(container.querySelector('svg'), name).toHaveAttribute('aria-hidden', 'true');
      unmount();
    }
  });
});

describe('sector map pieces', () => {
  it('QuestMapLegend names every node state and the side-quest size', () => {
    render(<QuestMapLegend />);
    const items = within(screen.getByRole('list', { name: 'Map legend' })).getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['Cleared', 'Swarm infested · available', 'Locked', 'Hive assault', 'Smaller node = side quest']);
  });

  it('QuestNode labels a hive assault and the ship’s position', () => {
    render(
      <ul>
        <QuestNode
          quest={sectorQuest({ questId: 9, title: 'Hive Core', isHiveAssault: true })}
          state="available"
          position={{ x: 50, y: 50 }}
          selected
          isShip
          onSelect={() => {}}
        />
      </ul>,
    );
    expect(screen.getByRole('button', { name: 'Hive Core, hive assault, Swarm infested, available, your ship is here' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('App', () => {
  it('boots to the splash screen', async () => {
    respond('get', '/auth/me', 401, {});
    respond('get', '/health', 200, { status: 'ok', database: 'connected', timestamp: '' });
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'QUESTACK' })).toBeInTheDocument();
  });
});
