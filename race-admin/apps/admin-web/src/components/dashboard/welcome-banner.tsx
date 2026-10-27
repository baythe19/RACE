import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

import type { DashboardAlert } from '@race/types';
import { buttonVariants } from '@race/ui';
import { cn } from '@race/utils';

export function WelcomeBanner({ name }: { name?: string }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="relative mb-5 overflow-hidden rounded-card p-5 text-white shadow-card sm:p-6">
      {/* RACE brand: ink black base + yellow→red brand stripe */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#16161E] via-[#1E1E28] to-[#16161E]" />
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-[#E23744] to-[#16161E]" />
      <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-primary/25 blur-2xl" />
      <div className="absolute -bottom-10 left-1/4 h-28 w-28 rounded-full bg-[#E23744]/30 blur-2xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
            <Sparkles className="h-3 w-3" />
            Executive Dashboard
          </div>
          <h2 className="text-xl font-bold sm:text-2xl">
            {greeting}, {name?.split(' ')[0] ?? 'Admin'} 👋
          </h2>
          <p className="mt-1 max-w-xl text-sm text-white/70">
            Platform overview — revenue, bookings, and operations at a glance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/reports"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white',
            )}
          >
            View Reports
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/bookings"
            className={cn(
              buttonVariants({ size: 'sm' }),
              'bg-primary font-semibold text-[#16161E] hover:bg-[#e0960f]',
            )}
          >
            Manage Bookings
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AlertsPanel({ alerts = [] }: { alerts?: DashboardAlert[] }) {
  const urgentCount = alerts.filter((a) => a.urgent).length;

  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-heading">Alerts & Tasks</h3>
        {urgentCount > 0 ? (
          <span className="rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-semibold text-error">
            {urgentCount} urgent
          </span>
        ) : (
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
            Clear
          </span>
        )}
      </div>
      {alerts.length === 0 ? (
        <div className="flex items-start gap-2.5 rounded-xl bg-surface-muted p-3 text-sm text-body">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <span>No pending vendor, driver, or booking actions right now.</span>
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <Link
                to={alert.href}
                className="flex items-start gap-2.5 rounded-xl p-2.5 transition hover:bg-surface-hover"
              >
                <AlertTriangle
                  className={`mt-0.5 h-4 w-4 shrink-0 ${alert.urgent ? 'text-warning' : 'text-muted'}`}
                />
                <span className="text-sm text-body">{alert.message}</span>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
