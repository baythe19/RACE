import AppDialog, {
  type AppDialogAction,
  type AppDialogProps,
  type AppDialogTone,
} from '../components/common/AppDialog';
import { useCallback, useMemo, useState } from 'react';

export type ShowAppDialogInput = Partial<Omit<AppDialogProps, 'visible' | 'onClose'>> & {
  /** Convenience: primary button label. */
  primaryLabel?: string;
  /** Convenience: primary button handler. */
  onPrimary?: () => void;
  /** Convenience: secondary button label (adds Cancel-style row). */
  secondaryLabel?: string;
  /** Convenience: secondary button handler. */
  onSecondary?: () => void;
  /** Convenience: mark primary (or secondary when confirm) destructive. */
  destructive?: boolean;
};

/**
 * Replaces RN `Alert.alert` with the branded in-app dialog so every
 * confirmation / error / success popup matches the RACE customer UI.
 *
 * Usage:
 *   const { dialog, showDialog } = useAppDialog();
 *   showDialog({ tone: 'warning', title: 'Saved', message: '…' });
 *   return (<View>{dialog}…</View>);
 */
export function useAppDialog() {
  const [config, setConfig] = useState<ShowAppDialogInput | null>(null);
  const [visible, setVisible] = useState(false);

  const showDialog = useCallback((input: ShowAppDialogInput) => {
    setConfig(input);
    setVisible(true);
  }, []);

  const closeDialog = useCallback(() => setVisible(false), []);

  const dialog = useMemo(() => {
    if (!config || !visible) return null;

    const primaryAction: AppDialogAction | undefined = config.primaryAction ?? {
      label: config.primaryLabel ?? 'OK',
      onPress: config.onPrimary,
      destructive: config.destructive,
    };
    const secondaryAction: AppDialogAction | undefined =
      config.secondaryAction ??
      (config.secondaryLabel
        ? {
            label: config.secondaryLabel,
            onPress: config.onSecondary,
            destructive: config.destructive && !config.primaryAction,
          }
        : undefined);

    const props: AppDialogProps = {
      visible,
      onClose: closeDialog,
      tone: (config.tone ?? 'info') as AppDialogTone,
      icon: config.icon,
      title: config.title ?? '',
      message: config.message,
      primaryAction,
      secondaryAction,
    };

    return <AppDialog {...props} />;
  }, [config, visible, closeDialog]);

  return { dialog, showDialog, closeDialog };
}
