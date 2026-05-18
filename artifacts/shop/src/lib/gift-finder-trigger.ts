let _open: (() => void) | null = null;

export function registerGiftFinder(fn: () => void) {
  _open = fn;
}

export function triggerGiftFinder() {
  _open?.();
}
