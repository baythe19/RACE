import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { AppSettings, SettingsCategory } from '@race/types';
import { cn } from '@race/utils';
import { Button, Card, CardContent, CardHeader, CardTitle, ErrorState, LoadingState } from '@race/ui';

import { useSettings, useSettingsAccess } from '@/hooks/use-settings';
import { useThemeStore } from '@/stores/theme.store';

const CATEGORIES: { key: SettingsCategory; label: string }[] = [
  { key: 'general', label: 'General Settings' },
  { key: 'notifications', label: 'Notification Settings' },
  { key: 'payment', label: 'Payment Settings' },
  { key: 'security', label: 'Security Settings' },
  { key: 'service', label: 'Service Settings' },
  { key: 'terms', label: 'Terms & Privacy' },
  { key: 'emailSms', label: 'Email/SMS Configuration' },
  { key: 'appearance', label: 'Appearance' },
];

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-heading">{label}</label>
      {description ? <p className="mb-2 text-xs text-muted">{description}</p> : null}
      {children}
    </div>
  );
}

function GeneralForm({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (partial: Partial<AppSettings>) => void;
}) {
  const g = settings.general;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="App Name" description="Displayed across the admin panel and customer-facing apps.">
        <input className="race-input" value={g.appName} onChange={(e) => onChange({ general: { ...g, appName: e.target.value } })} />
      </Field>
      <Field label="Support Email">
        <input className="race-input" type="email" value={g.supportEmail} onChange={(e) => onChange({ general: { ...g, supportEmail: e.target.value } })} />
      </Field>
      <Field label="Support Phone">
        <input className="race-input" value={g.supportPhone} onChange={(e) => onChange({ general: { ...g, supportPhone: e.target.value } })} />
      </Field>
      <Field label="Timezone">
        <select className="race-input" value={g.timezone} onChange={(e) => onChange({ general: { ...g, timezone: e.target.value } })}>
          <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
          <option value="UTC">UTC</option>
        </select>
      </Field>
      <Field label="Default Language">
        <select className="race-input" value={g.defaultLanguage} onChange={(e) => onChange({ general: { ...g, defaultLanguage: e.target.value } })}>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="or">Odia</option>
        </select>
      </Field>
      <label className="race-toggle-row cursor-pointer sm:col-span-2">
        <input
          type="checkbox"
          checked={settings.demo.useMockData}
          onChange={(e) =>
            onChange({ demo: { ...settings.demo, useMockData: e.target.checked } })
          }
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
        />
        <div>
          <span className="block text-sm font-medium text-heading">Demo / mock data</span>
          <span className="block text-xs text-muted">
            Off by default. When on, dashboard charts and alerts may show sample demo figures for
            presentations. Live partner, customer, booking, and finance lists stay API-backed.
          </span>
        </div>
      </label>
    </div>
  );
}

function NotificationForm({ settings, onChange }: { settings: AppSettings; onChange: (p: Partial<AppSettings>) => void }) {
  const n = settings.notifications;
  const toggles = [
    { key: 'emailAlerts' as const, label: 'Email Alerts' },
    { key: 'smsAlerts' as const, label: 'SMS Alerts' },
    { key: 'pushAlerts' as const, label: 'Push Alerts' },
    { key: 'bookingAlerts' as const, label: 'Booking Alerts' },
    { key: 'vendorAlerts' as const, label: 'Vendor Alerts' },
    { key: 'financeAlerts' as const, label: 'Finance Alerts' },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {toggles.map((t) => (
        <label key={t.key} className="race-toggle-row cursor-pointer">
          <input
            type="checkbox"
            checked={n[t.key]}
            onChange={(e) => onChange({ notifications: { ...n, [t.key]: e.target.checked } })}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
          />
          <span className="text-sm font-medium text-heading">{t.label}</span>
        </label>
      ))}
    </div>
  );
}

function PaymentForm({ settings, onChange }: { settings: AppSettings; onChange: (p: Partial<AppSettings>) => void }) {
  const p = settings.payment;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Currency">
        <select className="race-input" value={p.currency} onChange={(e) => onChange({ payment: { ...p, currency: e.target.value } })}>
          <option value="INR">INR (₹)</option>
        </select>
      </Field>
      <Field label="Commission Rate (%)">
        <input type="number" className="race-input" value={p.commissionRate} onChange={(e) => onChange({ payment: { ...p, commissionRate: Number(e.target.value) } })} />
      </Field>
      <Field label="Payout Cycle">
        <select className="race-input" value={p.payoutCycle} onChange={(e) => onChange({ payment: { ...p, payoutCycle: e.target.value } })}>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Bi-weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </Field>
      <Field label="Min Payout Amount (₹)">
        <input type="number" className="race-input" value={p.minPayoutAmount} onChange={(e) => onChange({ payment: { ...p, minPayoutAmount: Number(e.target.value) } })} />
      </Field>
      <label className="race-toggle-row cursor-pointer sm:col-span-2">
        <input type="checkbox" checked={p.enableWallet} onChange={(e) => onChange({ payment: { ...p, enableWallet: e.target.checked } })} className="h-4 w-4 rounded text-primary" />
        <span className="text-sm font-medium text-heading">Enable Wallet Payments</span>
      </label>
    </div>
  );
}

function SecurityForm({ settings, onChange }: { settings: AppSettings; onChange: (p: Partial<AppSettings>) => void }) {
  const s = settings.security;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Session Timeout (minutes)">
        <input type="number" className="race-input" value={s.sessionTimeout} onChange={(e) => onChange({ security: { ...s, sessionTimeout: Number(e.target.value) } })} />
      </Field>
      <Field label="Max Login Attempts">
        <input type="number" className="race-input" value={s.maxLoginAttempts} onChange={(e) => onChange({ security: { ...s, maxLoginAttempts: Number(e.target.value) } })} />
      </Field>
      <Field label="Password Expiry (days)">
        <input type="number" className="race-input" value={s.passwordExpiryDays} onChange={(e) => onChange({ security: { ...s, passwordExpiryDays: Number(e.target.value) } })} />
      </Field>
      <label className="race-toggle-row cursor-pointer">
        <input type="checkbox" checked={s.require2FA} onChange={(e) => onChange({ security: { ...s, require2FA: e.target.checked } })} className="h-4 w-4 rounded text-primary" />
        <span className="text-sm font-medium text-heading">Require 2FA for Admins</span>
      </label>
    </div>
  );
}

function ServiceForm({ settings, onChange }: { settings: AppSettings; onChange: (p: Partial<AppSettings>) => void }) {
  const s = settings.service;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Default Service Radius (km)">
        <input type="number" className="race-input" value={s.defaultServiceRadius} onChange={(e) => onChange({ service: { ...s, defaultServiceRadius: Number(e.target.value) } })} />
      </Field>
      <Field label="Max Booking Wait (minutes)">
        <input type="number" className="race-input" value={s.maxBookingWaitMinutes} onChange={(e) => onChange({ service: { ...s, maxBookingWaitMinutes: Number(e.target.value) } })} />
      </Field>
      <label className="race-toggle-row cursor-pointer">
        <input type="checkbox" checked={s.enableSOS} onChange={(e) => onChange({ service: { ...s, enableSOS: e.target.checked } })} className="h-4 w-4 rounded text-primary" />
        <span className="text-sm font-medium text-heading">Enable SOS</span>
      </label>
      <label className="race-toggle-row cursor-pointer">
        <input type="checkbox" checked={s.enableSubscriptions} onChange={(e) => onChange({ service: { ...s, enableSubscriptions: e.target.checked } })} className="h-4 w-4 rounded text-primary" />
        <span className="text-sm font-medium text-heading">Enable Subscriptions</span>
      </label>
    </div>
  );
}

function TermsForm({ settings, onChange }: { settings: AppSettings; onChange: (p: Partial<AppSettings>) => void }) {
  const t = settings.terms;
  return (
    <div className="grid gap-5">
      <Field label="Terms of Service URL">
        <input className="race-input" value={t.termsUrl} onChange={(e) => onChange({ terms: { ...t, termsUrl: e.target.value } })} />
      </Field>
      <Field label="Privacy Policy URL">
        <input className="race-input" value={t.privacyUrl} onChange={(e) => onChange({ terms: { ...t, privacyUrl: e.target.value } })} />
      </Field>
      <Field label="Refund Policy URL">
        <input className="race-input" value={t.refundPolicyUrl} onChange={(e) => onChange({ terms: { ...t, refundPolicyUrl: e.target.value } })} />
      </Field>
    </div>
  );
}

function EmailSmsForm({ settings, onChange }: { settings: AppSettings; onChange: (p: Partial<AppSettings>) => void }) {
  const e = settings.emailSms;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="SMTP Host">
        <input className="race-input" value={e.smtpHost} onChange={(ev) => onChange({ emailSms: { ...e, smtpHost: ev.target.value } })} />
      </Field>
      <Field label="SMTP Port">
        <input type="number" className="race-input" value={e.smtpPort} onChange={(ev) => onChange({ emailSms: { ...e, smtpPort: Number(ev.target.value) } })} />
      </Field>
      <Field label="SMTP User">
        <input className="race-input" value={e.smtpUser} onChange={(ev) => onChange({ emailSms: { ...e, smtpUser: ev.target.value } })} />
      </Field>
      <Field label="SMS Provider">
        <input className="race-input" value={e.smsProvider} onChange={(ev) => onChange({ emailSms: { ...e, smsProvider: ev.target.value } })} />
      </Field>
      <Field label="SMS API Key">
        <input type="password" className="race-input" value={e.smsApiKey} onChange={(ev) => onChange({ emailSms: { ...e, smsApiKey: ev.target.value } })} />
      </Field>
    </div>
  );
}

function AppearanceForm({ settings, onChange }: { settings: AppSettings; onChange: (p: Partial<AppSettings>) => void }) {
  const a = settings.appearance;
  const setTheme = useThemeStore((s) => s.setTheme);

  const handleThemeChange = (value: 'light' | 'dark') => {
    onChange({ appearance: { ...a, sidebarTheme: value } });
    setTheme(value);
  };

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Primary Color" description="Accent color used across the admin panel.">
        <input type="color" className="h-11 w-full cursor-pointer rounded-xl border border-border bg-input" value={a.primaryColor} onChange={(e) => onChange({ appearance: { ...a, primaryColor: e.target.value } })} />
      </Field>
      <Field label="Theme" description="Switch between light and dark mode for the entire admin panel.">
        <div className="grid grid-cols-2 gap-2">
          {(['light', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleThemeChange(mode)}
              className={cn(
                'rounded-xl border px-4 py-3 text-sm font-medium capitalize transition',
                a.sidebarTheme === mode
                  ? 'border-primary bg-primary/10 text-primary-dark'
                  : 'border-border bg-surface-muted text-body hover:border-border hover:bg-surface-hover',
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </Field>
      <label className="race-toggle-row cursor-pointer sm:col-span-2">
        <input type="checkbox" checked={a.compactMode} onChange={(e) => onChange({ appearance: { ...a, compactMode: e.target.checked } })} className="h-4 w-4 rounded text-primary" />
        <span className="text-sm font-medium text-heading">Compact Mode</span>
      </label>
    </div>
  );
}

export function SettingsContent() {
  const { canAccess } = useSettingsAccess();
  const {
    draft,
    isLoading,
    isError,
    refetch,
    isDirty,
    updateDraft,
    save,
    discardChanges,
  } = useSettings();

  const accessibleCategories = CATEGORIES.filter((c) => canAccess(c.key));
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(
    accessibleCategories[0]?.key ?? 'general',
  );

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const switchCategory = (key: SettingsCategory) => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    if (isDirty) discardChanges();
    setActiveCategory(key);
  };

  if (isLoading) return <LoadingState message="Loading settings..." />;
  if (isError || !draft) {
    return <ErrorState message="Failed to load settings" onRetry={() => void refetch()} />;
  }

  const renderForm = () => {
    switch (activeCategory) {
      case 'general':
        return <GeneralForm settings={draft} onChange={updateDraft} />;
      case 'notifications':
        return <NotificationForm settings={draft} onChange={updateDraft} />;
      case 'payment':
        return <PaymentForm settings={draft} onChange={updateDraft} />;
      case 'security':
        return <SecurityForm settings={draft} onChange={updateDraft} />;
      case 'service':
        return <ServiceForm settings={draft} onChange={updateDraft} />;
      case 'terms':
        return <TermsForm settings={draft} onChange={updateDraft} />;
      case 'emailSms':
        return <EmailSmsForm settings={draft} onChange={updateDraft} />;
      case 'appearance':
        return <AppearanceForm settings={draft} onChange={updateDraft} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {isDirty ? (
        <div className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-sm font-medium text-warning">You have unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={discardChanges}>
              Discard
            </Button>
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Settings
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit shadow-card lg:sticky lg:top-[76px]">
          <CardHeader className="border-b border-border-subtle pb-3">
            <CardTitle className="text-sm">Settings</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <nav className="space-y-0.5">
              {accessibleCategories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => switchCategory(cat.key)}
                  className={cn(
                    'w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all',
                    activeCategory === cat.key
                      ? 'race-nav-active'
                      : 'text-body hover:bg-surface-hover hover:text-heading',
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-start justify-between border-b border-border-subtle pb-4">
            <div>
              <CardTitle>{CATEGORIES.find((c) => c.key === activeCategory)?.label}</CardTitle>
              <p className="mt-1 text-xs text-muted">
                Manage your platform configuration. Changes apply across all services.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={discardChanges} disabled={!isDirty}>
                Cancel Changes
              </Button>
              <Button size="sm" onClick={() => save.mutate()} disabled={!isDirty || save.isPending}>
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Settings
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5">{renderForm()}</CardContent>
        </Card>
      </div>
    </div>
  );
}
