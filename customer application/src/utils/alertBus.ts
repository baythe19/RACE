/**
 * Module-level bridge so non-component helpers (utils, hooks) can raise the
 * branded dialog without threading React state through every caller.
 *
 * AppDialogHost mounts once inside the navigation tree and registers a
 * receiver via `registerAppDialogHost`; helpers call `getAppDialog()`.
 * Falls back to native Alert.alert only when the host is not mounted.
 */
import { Alert } from 'react-native';

export interface AppDialogHostBridge {
  showDialog: (input: Record<string, unknown>) => void;
}

let host: AppDialogHostBridge | null = null;

export function registerAppDialogHost(bridge: AppDialogHostBridge | null): void {
  host = bridge;
}

export function getAppDialog(): {
  showDialog: (input: {
    tone?: 'success' | 'info' | 'warning' | 'error' | 'danger' | 'confirm';
    icon?: unknown;
    title?: string;
    message?: string;
    primaryLabel?: string;
    onPrimary?: () => void;
    secondaryLabel?: string;
    onSecondary?: () => void;
    destructive?: boolean;
  }) => void;
  fallback: (title: string, message: string) => void;
} {
  if (host) {
    return {
      showDialog: input =>
        host!.showDialog(input as unknown as Record<string, unknown>),
      fallback: (title, message) => Alert.alert(title, message),
    };
  }
  return {
    // Host not mounted (deep utils before tree render) — native fallback.
    showDialog: input => Alert.alert(input.title ?? '', input.message),
    fallback: (title, message) => Alert.alert(title, message),
  };
}
