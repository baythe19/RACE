import {
  AlarmClock,
  Building2,
  Car,
  CheckCircle2,
  ClipboardList,
  IndianRupee,
  List,
  Percent,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { StatMetric } from '@race/types';
import { formatNumber } from '@race/utils';
import { Card, CardContent } from '@race/ui';
import { cn } from '@race/utils';

const ICONS: Record<string, LucideIcon> = {
  Users,
  Building2,
  Car,
  ClipboardList,
  CheckCircle2,
  IndianRupee,
  Hourglass: AlarmClock,
  List,
  Percent,
  AlarmClock,
};

const VARIANT_STYLES = {
  default: 'from-primary/15 to-primary/5 text-primary-dark',
  warning: 'from-[#E23744]/15 to-[#E23744]/5 text-[#E23744]',
  success: 'from-success/15 to-success/5 text-success',
};

export function MetricCard({ metric }: { metric: StatMetric }) {
  const Icon = metric.icon ? ICONS[metric.icon] ?? ClipboardList : ClipboardList;
  const displayValue =
    typeof metric.value === 'number' ? formatNumber(metric.value) : metric.value;
  const variant = metric.variant ?? 'default';

  return (
    <Card className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
      <span
        className={cn(
          'absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-0 transition-opacity group-hover:opacity-100',
          variant === 'warning' ? 'from-[#E23744] to-[#E23744]/40' : 'from-primary to-primary/30',
        )}
      />
      <CardContent className="flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted">
              {metric.label}
            </p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight text-heading">{displayValue}</p>
          </div>
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br transition-transform group-hover:scale-105',
              VARIANT_STYLES[variant],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {metric.trend ? (
          <div className="mt-2.5 flex items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                metric.trend.direction === 'up' && 'bg-success/10 text-success',
                metric.trend.direction === 'down' && 'bg-error/10 text-error',
                metric.trend.direction === 'neutral' && 'bg-[#F4F5F7] text-muted',
              )}
            >
              {metric.trend.direction === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : metric.trend.direction === 'down' ? (
                <TrendingDown className="h-3 w-3" />
              ) : null}
              {metric.trend.value}
            </span>
            {metric.trend.label ? (
              <span className="truncate text-[11px] text-muted">{metric.trend.label}</span>
            ) : null}
          </div>
        ) : (
          <div className="mt-2.5" />
        )}
      </CardContent>
    </Card>
  );
}
