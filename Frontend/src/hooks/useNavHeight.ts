import { useLayoutEffect, type RefObject } from 'react';

// Publishes a top bar's height as --nav-h, so full-height screens can fill the rest
export function useNavHeight(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const header = ref.current;
    if (!header) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--nav-h', `${header.offsetHeight}px`);
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, [ref]);
}
