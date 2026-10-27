let activeCloser: (() => void) | null = null;

export function registerProfileDropdownCloser(close: () => void) {
  if (activeCloser && activeCloser !== close) {
    activeCloser();
  }
  activeCloser = close;
}

export function unregisterProfileDropdownCloser(close: () => void) {
  if (activeCloser === close) {
    activeCloser = null;
  }
}

export function dismissOpenProfileDropdown() {
  activeCloser?.();
  activeCloser = null;
}
