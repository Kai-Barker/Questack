import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RouteErrorPage from '../../src/pages/RouteErrorPage';

// The page shown when a screen crashes, instead of React Router's developer error

function Crash({ error }: { error: Error }): never {
  throw error;
}

function renderCrash(error: Error) {
  const router = createMemoryRouter([{ path: '/', element: <Crash error={error} />, errorElement: <RouteErrorPage /> }]);
  render(<RouterProvider router={router} />);
}

describe('RouteErrorPage', () => {
  // React logs every caught render error; these are expected
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  afterEach(() => consoleError.mockClear());

  it('explains a crash and offers a way out', () => {
    renderCrash(new Error('Something broke'));

    expect(screen.getByRole('heading', { name: 'Systems malfunction' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Your progress is saved on the server');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Galaxy map' })).toBeInTheDocument();
  });

  it.each([
    ['a chunk that can’t be loaded', 'Failed to fetch dynamically imported module: http://localhost:5173/src/pages/QuestPage.tsx'],
    ['two copies of React after a rebuild', "Cannot read properties of null (reading 'useId')"],
  ])('asks for a reload after %s', (_name, message) => {
    renderCrash(new TypeError(message));

    expect(screen.getByRole('heading', { name: 'Systems out of sync' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Reload to pick up the latest version.');
  });

  it('reloads the page', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    renderCrash(new Error('Something broke'));

    screen.getByRole('button', { name: 'Reload' }).click();
    expect(reload).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
