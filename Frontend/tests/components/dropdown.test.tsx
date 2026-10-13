import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import Dropdown from '../../src/components/ui/Dropdown';

// The HUD dropdown used across the admin console, in place of the browser's
// own <select> list. It follows the ARIA listbox pattern.

const SECTORS = [
  { value: 1, label: 'C# Sector' },
  { value: 2, label: 'JavaScript Sector' },
  { value: 3, label: 'Python Sector' },
];

function Harness({ initial = 1 }: { initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <>
      <span id="sector-label">Sector</span>
      <Dropdown id="sector" value={value} options={SECTORS} onChange={setValue} labelId="sector-label" placeholder="Pick one" />
      <output data-testid="value">{value ?? 'none'}</output>
      <button type="button">Elsewhere</button>
    </>
  );
}

function setup(initial?: number | null) {
  const user = userEvent.setup();
  render(<Harness initial={initial} />);
  const trigger = screen.getByLabelText('Sector');
  return { user, trigger, value: () => screen.getByTestId('value').textContent };
}

describe('Dropdown', () => {
  it('is named by its label and shows the chosen option', () => {
    const { trigger } = setup();

    expect(trigger).toHaveAccessibleName('Sector C# Sector');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the placeholder when nothing is chosen', () => {
    const { trigger } = setup(null);
    expect(trigger).toHaveTextContent('Pick one');
  });

  it('opens on click, marks the chosen option and picks another', async () => {
    const { user, trigger, value } = setup();

    await user.click(trigger);
    const listbox = screen.getByRole('listbox', { name: 'Sector' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(listbox).toHaveFocus();
    expect(screen.getByRole('option', { name: 'C# Sector' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('option', { name: 'JavaScript Sector' }));

    expect(value()).toBe('2');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('works from the keyboard', async () => {
    const { user, trigger, value } = setup();

    trigger.focus();
    await user.keyboard('{ArrowDown}');
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-activedescendant', 'sector-option-0');

    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(listbox).toHaveAttribute('aria-activedescendant', 'sector-option-2');
    await user.keyboard('{Home}');
    expect(listbox).toHaveAttribute('aria-activedescendant', 'sector-option-0');
    await user.keyboard('j'); // jumps to the next option starting with J
    await user.keyboard('{Enter}');

    expect(value()).toBe('2');
    expect(trigger).toHaveFocus();
  });

  it('closes without choosing on Escape or a click elsewhere', async () => {
    const { user, trigger, value } = setup();

    await user.click(trigger);
    await user.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(value()).toBe('1');
  });
});
