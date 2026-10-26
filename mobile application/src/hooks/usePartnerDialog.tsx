import PartnerDialog, { type PartnerDialogProps } from '../components/partner/dialogs/PartnerDialog';
import { useCallback, useMemo, useState } from 'react';

export interface ShowPartnerDialogInput
  extends Partial<Omit<PartnerDialogProps, 'visible' | 'onClose'>> {
  /** Fire-and-forget helper: dialog closes on button tap, no extra state needed. */
}

/**
 * Replaces RN `Alert.alert` with the designed in-app dialog so every
 * confirmation / error / success popup matches the partner UI boards.
 *
 * Usage:
 *   const { dialog, showAlert } = usePartnerDialog();
 *   showAlert({ tone: 'warning', title: 'Full name required', message: '…' });
 *   return (<View>{dialog}…</View>);
 */
export function usePartnerDialog() {
  const [config, setConfig] = useState<ShowPartnerDialogInput | null>(null);
  const [visible, setVisible] = useState(false);

  const showAlert = useCallback((input: ShowPartnerDialogInput) => {
    setConfig(input);
    setVisible(true);
  }, []);

  const close = useCallback(() => setVisible(false), []);

  const dialog = useMemo(() => {
    if (!config || !visible) return null;
    return (
      <PartnerDialog
        visible={visible}
        onClose={close}
        tone={config.tone}
        icon={config.icon}
        title={config.title ?? ''}
        message={config.message}
        primaryAction={config.primaryAction}
        secondaryAction={config.secondaryAction}
      />
    );
  }, [config, visible, close]);

  return { dialog, showAlert, closeDialog: close };
}
