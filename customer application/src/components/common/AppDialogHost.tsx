import React, { useEffect, useMemo, useState } from 'react';

import AppDialog, {
  type AppDialogAction,
  type AppDialogProps,
  type AppDialogTone,
} from './AppDialog';
import { registerAppDialogHost } from '../../utils/alertBus';

export interface AppDialogHostInput {
  tone?: AppDialogTone;
  icon?: AppDialogProps['icon'];
  title?: string;
  message?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  destructive?: boolean;
  primaryAction?: AppDialogAction;
  secondaryAction?: AppDialogAction;
}

/**
 * Mount once near the app root. Lets utils/hooks raise the branded dialog
 * through `getAppDialog()` (alertBus) without prop drilling.
 */
export default function AppDialogHost({ children }: { children?: React.ReactNode }) {
  const [config, setConfig] = useState<AppDialogHostInput | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    registerAppDialogHost({
      showDialog: input => {
        setConfig(input as AppDialogHostInput);
        setVisible(true);
      },
    });
    return () => registerAppDialogHost(null);
  }, []);

  const close = () => setVisible(false);

  const dialog = useMemo(() => {
    if (!config || !visible) return null;

    const primaryAction: AppDialogAction =
      config.primaryAction ?? {
        label: config.primaryLabel ?? 'OK',
        onPress: config.onPrimary,
        destructive: config.destructive && !config.secondaryAction && !config.secondaryLabel,
      };
    const secondaryAction: AppDialogAction | undefined =
      config.secondaryAction ??
      (config.secondaryLabel
        ? {
            label: config.secondaryLabel,
            onPress: config.onSecondary,
            destructive: config.destructive,
          }
        : undefined);

    const props: AppDialogProps = {
      visible,
      onClose: close,
      tone: config.tone ?? 'info',
      icon: config.icon,
      title: config.title ?? '',
      message: config.message,
      primaryAction,
      secondaryAction,
    };

    return <AppDialog {...props} />;
  }, [config, visible]);

  return (
    <>
      {children}
      {dialog}
    </>
  );
}
