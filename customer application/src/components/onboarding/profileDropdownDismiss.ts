let activeCloser: (() => void) | null = null;
let keyboardOpen = false;

export function setProfileKeyboardOpen(open: boolean) {
  keyboardOpen = open;
}

export function isProfileKeyboardOpen() {
  return keyboardOpen;
}

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
