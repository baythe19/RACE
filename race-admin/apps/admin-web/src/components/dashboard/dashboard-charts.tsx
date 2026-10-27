import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { ChartDataPoint, DonutSegment } from '@race/types';
import { BRAND_RED, CHART_COLORS } from '@race/constants';
import { Select } from '@race/ui';

import { ChartCard } from '@/components/shared/chart-card';
import { useDashboardStore } from '@/stores/dashboard.store';

function formatLakhs(value: number) {
  return `₹${(value / 100000).toFixed(1)}L`;
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-card">
      <p className="mb-1.5 text-xs font-semibold text-heading">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-body">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-semibold text-heading">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: { data: ChartDataPoint[] }) {
  const period = useDashboardStore((s) => s.period);
  const setPeriod = useDashboardStore((s) => s.setPeriod);

  return (
    <ChartCard
      title="Revenue Overview"
      subtitle="Monthly revenue trend with comparison"
      action={
        <Select
          value={period}
          onChange={(e) => setPeriod(e.target.value as 'this_month')}
          className="h-8 w-[130px] text-xs"
        >
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
        </Select>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#EAEAEA" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={formatLakhs}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<ChartTooltip formatter={formatLakhs} />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="current"
            name="This Month"
            stroke={CHART_COLORS.primary}
            strokeWidth={2.5}
            fill="url(#revenueGradient)"
            dot={{ r: 3, fill: CHART_COLORS.primary }}
            activeDot={{ r: 5 }}
          />
          <Area
            type="monotone"
            dataKey="previous"
            name="Last Month"
            stroke={BRAND_RED}
            strokeWidth={2}
            fill="transparent"
            strokeDasharray="4 4"
            strokeOpacity={0.55}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function BookingsChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ChartCard title="Bookings Overview" subtitle="Multi-series booking volume">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EAEAEA" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="current" name="This Month" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} />
          <Bar dataKey="previous" name="Last Month" fill={BRAND_RED} fillOpacity={0.45} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TopServicesChart({ data }: { data: DonutSegment[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const topService = [...data].sort((a, b) => b.value - a.value)[0];

  if (data.length === 0) {
    return (
      <ChartCard title="Top Services" subtitle="Service mix distribution">
        <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-semibold text-heading">No service data yet</p>
          <p className="max-w-[220px] text-xs text-muted">
            Once customers start booking, the service mix will appear here.
          </p>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Top Services" subtitle="Service mix distribution">
      <div className="flex h-full flex-col items-center justify-center gap-4 lg:flex-row">
        <div className="relative w-full flex-1">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={62}
                outerRadius={88}
                paddingAngle={3}
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip formatter={(v) => `${v}%`} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-bold text-heading">{topService?.value ?? 0}%</p>
            <p className="max-w-[90px] truncate text-center text-[10px] text-muted">
              {topService?.name ?? 'Top'}
            </p>
          </div>
        </div>
        <ul className="w-full space-y-2.5 lg:w-44">
          {data.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-body">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.name}</span>
              </span>
              <span className="shrink-0 font-semibold text-heading">{item.value}%</span>
            </li>
          ))}
          <li className="border-t border-border pt-2 text-xs text-muted">
            {total}% total tracked services
          </li>
        </ul>
      </div>
    </ChartCard>
  );
}

export function DriverPerformanceChart({
  data = [],
}: {
  data?: Array<{ metric: string; value: number }>;
}) {
  const chartData =
    data.length > 0
      ? data
      : [
          { metric: 'On-time', value: 0 },
          { metric: 'Rating', value: 0 },
          { metric: 'Acceptance', value: 0 },
          { metric: 'Completion', value: 0 },
          { metric: 'Safety', value: 0 },
        ];

  return (
    <ChartCard title="Driver Performance" subtitle="Fleet quality index (live)" height={260}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#EAEAEA" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
          <Radar
            name="Score"
            dataKey="value"
            stroke={CHART_COLORS.primary}
            fill={CHART_COLORS.primary}
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Tooltip content={<ChartTooltip formatter={(v) => `${v}%`} />} />
        </RadarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
