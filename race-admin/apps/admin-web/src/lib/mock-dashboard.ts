import type { DashboardData } from '@race/types';

/**
 * Demo overlay used ONLY when Settings → Demo / mock data is enabled.
 * Default admin mode never imports these values into live charts.
 */
export const MOCK_DASHBOARD_OVERLAY: Pick<
  DashboardData,
  'alerts' | 'driverPerformance' | 'topServices' | 'revenueChart' | 'bookingsChart'
> = {
  alerts: [
    {
      id: 'mock-vendors',
      message: '18 vendor approvals pending review (demo)',
      href: '/vendors',
      urgent: true,
    },
    {
      id: 'mock-drivers',
      message: '26 driver verifications awaiting action (demo)',
      href: '/drivers',
      urgent: true,
    },
    {
      id: 'mock-subs',
      message: '87 subscriptions expiring this month (demo)',
      href: '/subscriptions',
      urgent: false,
    },
  ],
  driverPerformance: [
    { metric: 'On-time', value: 92 },
    { metric: 'Rating', value: 88 },
    { metric: 'Acceptance', value: 85 },
    { metric: 'Completion', value: 94 },
    { metric: 'Safety', value: 90 },
  ],
  topServices: [
    { name: 'Towing Service', value: 62, color: '#F5A623' },
    { name: 'Driver Service', value: 28, color: '#2563EB' },
    { name: 'Roadside', value: 10, color: '#16A34A' },
  ],
  revenueChart: [
    { label: 'Week 1', current: 120000, previous: 98000 },
    { label: 'Week 2', current: 145000, previous: 110000 },
    { label: 'Week 3', current: 132000, previous: 125000 },
    { label: 'Week 4', current: 168000, previous: 140000 },
  ],
  bookingsChart: [
    { label: 'Week 1', current: 42, previous: 35 },
    { label: 'Week 2', current: 55, previous: 40 },
    { label: 'Week 3', current: 48, previous: 44 },
    { label: 'Week 4', current: 61, previous: 50 },
  ],
};

export function applyMockDashboardOverlay(
  data: DashboardData,
  useMockData: boolean,
): DashboardData {
  if (!useMockData) return data;
  return {
    ...data,
    ...MOCK_DASHBOARD_OVERLAY,
  };
}
