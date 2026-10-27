import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { getSettings, resetSettings, saveSettings } from '@race/api';
import type { AppSettings, SettingsCategory } from '@race/types';
import { hasPermission } from '@race/utils';
import { Permission, Role } from '@race/types';

import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';

export function useSettingsAccess() {
  const user = useAuthStore((s) => s.user);
  const permissions = user?.permissions ?? [];
  const role = user?.role ?? Role.SUPPORT_ADMIN;

  const canAccess = useCallback(
    (category: SettingsCategory): boolean => {
      if (role === Role.SUPER_ADMIN) return true;
      if (['security', 'emailSms'].includes(category)) {
        return hasPermission(permissions, Permission.SETTINGS_MANAGE);
      }
      if (category === 'payment') {
        return hasPermission(permissions, [Permission.FINANCE_MANAGE, Permission.SETTINGS_VIEW]);
      }
      return hasPermission(permissions, Permission.SETTINGS_VIEW);
    },
    [permissions, role],
  );

  return { canAccess, role, permissions };
}

export function useSettings() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const query = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  useEffect(() => {
    if (query.data && !draft) {
      setDraft(structuredClone(query.data));
    }
  }, [query.data, draft]);

  const updateDraft = useCallback((partial: Partial<AppSettings>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      if (partial.general) next.general = { ...prev.general, ...partial.general };
      if (partial.notifications)
        next.notifications = { ...prev.notifications, ...partial.notifications };
      if (partial.payment) next.payment = { ...prev.payment, ...partial.payment };
      if (partial.security) next.security = { ...prev.security, ...partial.security };
      if (partial.service) next.service = { ...prev.service, ...partial.service };
      if (partial.terms) next.terms = { ...prev.terms, ...partial.terms };
      if (partial.emailSms) next.emailSms = { ...prev.emailSms, ...partial.emailSms };
      if (partial.appearance) next.appearance = { ...prev.appearance, ...partial.appearance };
      if (partial.demo) next.demo = { ...prev.demo, ...partial.demo };
      return next;
    });
    setIsDirty(true);
  }, []);

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error('No settings to save');
      return saveSettings(draft);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      setDraft(structuredClone(data));
      setIsDirty(false);
      useThemeStore.getState().setTheme(data.appearance.sidebarTheme);
    },
  });

  const cancel = useMutation({
    mutationFn: resetSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      setDraft(structuredClone(data));
      setIsDirty(false);
    },
  });

  const discardChanges = useCallback(() => {
    if (query.data) {
      setDraft(structuredClone(query.data));
      setIsDirty(false);
    }
  }, [query.data]);

  return {
    ...query,
    draft: draft ?? query.data,
    isDirty,
    updateDraft,
    save,
    cancel,
    discardChanges,
  };
}
