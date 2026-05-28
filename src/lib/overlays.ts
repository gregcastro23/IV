// A tiny registry of open overlays (modals, drawers, full-screen views) so the
// global Escape→privacy-blind shortcut can stand down while an overlay is open
// and let that overlay handle Escape instead.

let openCount = 0;

export function pushOverlay(): void {
  openCount += 1;
}

export function popOverlay(): void {
  openCount = Math.max(0, openCount - 1);
}

export function anyOverlayOpen(): boolean {
  return openCount > 0;
}
