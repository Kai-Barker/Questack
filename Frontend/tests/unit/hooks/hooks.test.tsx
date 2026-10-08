import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useRef, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NavSlotContext } from '../../../src/context/NavSlotContext';
import { useApiRequest } from '../../../src/hooks/useApiRequest';
import { useAuth } from '../../../src/hooks/useAuth';
import { useMediaQuery } from '../../../src/hooks/useMediaQuery';
import { useModalDialog } from '../../../src/hooks/useModalDialog';
import { useNavSlot } from '../../../src/hooks/useNavSlot';
import { usePilot } from '../../../src/hooks/usePilot';
import { UplinkContext, useUplink } from '../../../src/hooks/useUplink';
import { axiosError } from '../../helpers/axios';

describe('useApiRequest', () => {
  it('starts loading, then holds the data', async () => {
    const request = vi.fn().mockResolvedValue({ answer: 42 });
    const { result } = renderHook(() => useApiRequest(request));

    expect(result.current).toMatchObject({ loading: true, data: null, error: null });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ data: { answer: 42 }, error: null });
  });

  it('shows the server’s message when the request fails', async () => {
    const request = vi.fn().mockRejectedValue(axiosError(403, { error: 'This quest is still locked.' }));
    const { result } = renderHook(() => useApiRequest(request));

    await waitFor(() => expect(result.current.error).toBe('This quest is still locked.'));
    expect(result.current.data).toBeNull();
  });

  it('reload goes back to loading and asks again', async () => {
    const request = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('fresh');
    const { result } = renderHook(() => useApiRequest(request));
    await waitFor(() => expect(result.current.error).toBe('offline'));

    act(() => result.current.reload());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe('fresh'));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('replace swaps in new data without a loading state', async () => {
    const { result } = renderHook(() => useApiRequest(vi.fn().mockResolvedValue('old')));
    await waitFor(() => expect(result.current.data).toBe('old'));

    act(() => result.current.replace('new'));
    expect(result.current).toMatchObject({ data: 'new', loading: false });
  });

  it('ignores a reply that arrives after unmounting', async () => {
    let finish: (value: string) => void = () => {};
    const request = vi.fn(() => new Promise<string>((resolve) => (finish = resolve)));
    const consoleError = vi.spyOn(console, 'error');
    const { unmount } = renderHook(() => useApiRequest(request));

    unmount();
    await act(async () => finish('late'));
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('context hooks', () => {
  it('useAuth throws outside <AuthProvider>', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside <AuthProvider>');
  });

  it('usePilot throws outside <PilotProvider>', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => usePilot())).toThrow('usePilot must be used inside <PilotProvider>');
  });

  it('useUplink is "checking" until AuthShell provides it', () => {
    expect(renderHook(() => useUplink()).result.current).toBe('checking');

    const wrapper = ({ children }: { children: ReactNode }) => <UplinkContext value="offline">{children}</UplinkContext>;
    expect(renderHook(() => useUplink(), { wrapper }).result.current).toBe('offline');
  });
});

describe('useMediaQuery', () => {
  it('follows the media query as it changes', () => {
    let matches = false;
    const listeners = new Set<() => void>();
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          media: query,
          get matches() {
            return matches;
          },
          addEventListener: (_: string, fn: () => void) => listeners.add(fn),
          removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
        }) as unknown as MediaQueryList,
    );
    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);

    act(() => {
      matches = true;
      listeners.forEach((fn) => fn());
    });
    expect(result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1024px)');

    unmount();
    expect(listeners.size).toBe(0);
  });
});

describe('useModalDialog', () => {
  function Dialog() {
    const ref = useRef<HTMLDialogElement>(null);
    useModalDialog(ref);
    return <dialog ref={ref}>Hello</dialog>;
  }

  function Page({ open }: { open: boolean }) {
    return (
      <>
        <button type="button">Open</button>
        {open && <Dialog />}
      </>
    );
  }

  it('opens as a modal on mount, then closes and returns focus to the opener', () => {
    const { rerender } = render(<Page open={false} />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();

    rerender(<Page open />);
    const dialog = document.querySelector('dialog')!;
    expect(dialog).toHaveAttribute('open');

    const close = vi.spyOn(dialog, 'close');
    screen.getByText('Hello').setAttribute('tabindex', '-1');
    screen.getByText('Hello').focus();
    rerender(<Page open={false} />);

    expect(close).toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);
  });
});

describe('useNavSlot', () => {
  it('claims the slot while mounted and returns its element', () => {
    const element = document.createElement('div');
    const setInUse = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => <NavSlotContext value={{ element, setInUse }}>{children}</NavSlotContext>;
    const { result, unmount } = renderHook(() => useNavSlot(), { wrapper });

    expect(result.current).toBe(element);
    expect(setInUse).toHaveBeenLastCalledWith(true);
    unmount();
    expect(setInUse).toHaveBeenLastCalledWith(false);
  });

  it('returns null outside the app layout', () => {
    expect(renderHook(() => useNavSlot()).result.current).toBeNull();
  });
});
