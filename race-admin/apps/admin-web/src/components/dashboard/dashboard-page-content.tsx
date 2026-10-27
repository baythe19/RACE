import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, ArrowRight } from 'lucide-react';
import { Permission } from '@race/types';
import { Card, CardContent, CardHeader, CardTitle, ErrorState, LoadingState } from '@race/ui';

import { ActivityTimeline } from '@/components/shared/activity-timeline';
import { MetricCard } from '@/components/shared/stat-card';
import { ChartSkeleton } from '@/components/shared/chart-card';
import { RecentBookingsTable, RecentVendorsTable } from '@/components/dashboard/dashboard-tables';
import { AlertsPanel, WelcomeBanner } from '@/components/dashboard/welcome-banner';
import { PermissionGuard } from '@/components/guards/permission-guard';
import { useDashboardQuery } from '@/hooks/use-dashboard';
import { useSettings } from '@/hooks/use-settings';
import { applyMockDashboardOverlay } from '@/lib/mock-dashboard';
import { useAuthStore } from '@/stores/auth.store';

const RevenueChart = lazy(() =>
  import('@/components/dashboard/dashboard-charts').then((m) => ({ default: m.RevenueChart })),
);
const BookingsChart = lazy(() =>
  import('@/components/dashboard/dashboard-charts').then((m) => ({ default: m.BookingsChart })),
);
const TopServicesChart = lazy(() =>
  import('@/components/dashboard/dashboard-charts').then((m) => ({ default: m.TopServicesChart })),
);
const DriverPerformanceChart = lazy(() =>
  import('@/components/dashboard/dashboard-charts').then((m) => ({
    default: m.DriverPerformanceChart,
  })),
);

export function DashboardPageContent() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useDashboardQuery();
  const { draft: settings } = useSettings();

  if (isLoading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (isError || !data) {
    return <ErrorState message="Failed to load dashboard data" onRetry={() => void refetch()} />;
  }

  const useMockData = settings?.demo?.useMockData ?? data.useMockData ?? false;
  const view = applyMockDashboardOverlay(data, useMockData);

  // 10 backend metrics → 4 core + 4 ops + 2 action, har row full (no dangling gap)
  const coreStats = view.stats.slice(0, 4);
  const opsStats = view.stats.slice(4, 8);
  const actionStats = view.stats.slice(8, 10);
  const pendingVendors = data.stats.find((s) => s.id === 'pending_vendors')?.value ?? 0;
  const pendingDrivers = data.stats.find((s) => s.id === 'pending_drivers')?.value ?? 0;
  const hasPendingApprovals = Number(pendingVendors) + Number(pendingDrivers) > 0;

  return (
    <PermissionGuard permission={Permission.DASHBOARD_VIEW} permissions={user?.permissions}>
      <WelcomeBanner name={user?.name} />

      {useMockData ? (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-heading">
          Demo / mock data is <strong>ON</strong>. Charts and alerts may show sample figures. Turn it
          off in Settings → General.
        </div>
      ) : null}

      {/* Row 1 — core scale metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:gap-4">
        {coreStats.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Row 2 — booking ops + revenue */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:mt-4 xl:gap-4">
        {opsStats.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Row 3 — action items (1/4 + 1/4 + half-width CTA = full row, no gap) */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:mt-4 xl:grid-cols-4 xl:gap-4">
        {actionStats.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
        {hasPendingApprovals ? (
          <Link
            to="/vendors?status=PENDING"
            className="group flex items-center justify-between gap-3 rounded-card border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-card-hover sm:col-span-2 xl:col-span-2"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary-dark">
                <AlarmClock className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-heading">Approvals waiting</span>
                <span className="block truncate text-xs text-muted">
                  {Number(pendingVendors)} vendor{Number(pendingVendors) === 1 ? '' : 's'}
                  {' · '}
                  {Number(pendingDrivers)} driver{Number(pendingDrivers) === 1 ? '' : 's'}
                </span>
              </span>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary-dark transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <Link
            to="/reports"
            className="group flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover sm:col-span-2 xl:col-span-2"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-heading">All clear</span>
              <span className="block truncate text-xs text-muted">View business reports</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {/* Charts row 1 — revenue (2/3) + fleet quality (1/3) */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Suspense fallback={<ChartSkeleton height={300} />}>
            <RevenueChart data={view.revenueChart} />
          </Suspense>
        </div>
        <Suspense fallback={<ChartSkeleton height={260} />}>
          <DriverPerformanceChart data={view.driverPerformance} />
        </Suspense>
      </div>

      {/* Charts row 2 — volume + mix, equal halves */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <BookingsChart data={view.bookingsChart} />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <TopServicesChart data={view.topServices} />
        </Suspense>
      </div>

      {/* Activities (1/3) + alerts (2/3) */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
            <CardTitle className="text-[15px]">Recent Activities</CardTitle>
            <Link to="/reports" className="text-xs font-medium text-primary-dark hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            <ActivityTimeline items={view.recentActivities} />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <AlertsPanel alerts={view.alerts} />
        </div>
      </div>

      {/* Recent activity tables */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RecentBookingsTable data={view.recentBookings} />
        <RecentVendorsTable data={view.recentVendors} />
      </div>
    </PermissionGuard>
  );
}
