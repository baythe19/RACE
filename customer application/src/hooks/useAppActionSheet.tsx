import { useState } from 'react';

import AppActionSheet, {
  type AppActionSheetOption,
} from '../components/common/AppActionSheet';

/**
 * Branded bottom action sheet replacing native `Alert.alert` option menus
 * (photo source choosers, remove confirmations with multiple routes, …).
 *
 * Usage:
 *   const { sheet, showSheet } = useAppActionSheet();
 *   showSheet({ title: 'Attach photo', options: [...] });
 *   return (<View>{sheet}…</View>);
 */
export function useAppActionSheet() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    message?: string;
    options: AppActionSheetOption[];
  } | null>(null);

  const showSheet = (input: {
    title: string;
    message?: string;
    options: AppActionSheetOption[];
  }) => {
    setConfig(input);
    setVisible(true);
  };

  const closeSheet = () => setVisible(false);

  const sheet = config ? (
    <AppActionSheet
      visible={visible}
      title={config.title}
      message={config.message}
      options={config.options}
      onCancel={closeSheet}
    />
  ) : null;

  return { sheet, showSheet, closeSheet };
}
