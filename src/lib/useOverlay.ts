import { useEffect, useRef } from "react";
import { popOverlay, pushOverlay } from "./overlays.ts";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Makes an overlay accessible: registers it (so global Escape stands down),
 * moves focus inside on open, traps Tab within it, closes on Escape, and
 * restores focus to the trigger on unmount. Attach the returned ref to the
 * element that contains the overlay's focusable content (give it tabIndex={-1}).
 */
export function useOverlay<T extends HTMLElement = HTMLDivElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    pushOverlay();
    const node = ref.current;
    const prevFocus = document.activeElement as HTMLElement | null;

    const focusables = (): HTMLElement[] =>
      node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];

    // Respect an existing autoFocus inside the overlay; otherwise focus the
    // first focusable, falling back to the container itself.
    if (node && !node.contains(document.activeElement)) {
      const f = focusables();
      (f[0] ?? node).focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key === "Tab") {
        const f = focusables();
        if (f.length === 0) {
          e.preventDefault();
          return;
        }
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    node?.addEventListener("keydown", onKey);
    return () => {
      node?.removeEventListener("keydown", onKey);
      popOverlay();
      prevFocus?.focus?.();
    };
  }, []);

  return ref;
}
