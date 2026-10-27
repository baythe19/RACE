import { Permission, Role } from '@race/types';

export const BRAND = {
  name: 'RACE Service',
  tagline: '24/7 Roadside Assistance & Towing Service',
  copyright: '© 2025 RACE Service. All rights reserved.',
} as const;

export const THEME = {
  primary: '#F5A623',
  background: '#F4F5F7',
  content: '#FFFFFF',
  border: '#EEEEEE',
  heading: '#1A1A2E',
  body: '#555555',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  sidebarWidth: 260,
  sidebarCollapsedWidth: 80,
  cardRadius: 12,
  cardShadow: '0 4px 24px rgba(0, 0, 0, 0.05)',
  cardBorder: '#EAEAEA',
} as const;

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  [Role.OPERATIONS_ADMIN]: [
    Permission.DASHBOARD_VIEW,
    Permission.CUSTOMERS_VIEW,
    Permission.VENDORS_VIEW,
    Permission.DRIVERS_VIEW,
    Permission.BOOKINGS_VIEW,
    Permission.BOOKINGS_MANAGE,
    Permission.NOTIFICATIONS_VIEW,
  ],
  [Role.VERIFICATION_ADMIN]: [
    Permission.DASHBOARD_VIEW,
    Permission.VENDORS_VIEW,
    Permission.VENDORS_APPROVE,
    Permission.DRIVERS_VIEW,
    Permission.DRIVERS_APPROVE,
  ],
  [Role.FINANCE_ADMIN]: [
    Permission.DASHBOARD_VIEW,
    Permission.FINANCE_VIEW,
    Permission.FINANCE_MANAGE,
    Permission.REPORTS_VIEW,
    Permission.SUBSCRIPTIONS_VIEW,
  ],
  [Role.SUPPORT_ADMIN]: [
    Permission.DASHBOARD_VIEW,
    Permission.CUSTOMERS_VIEW,
    Permission.BOOKINGS_VIEW,
    Permission.NOTIFICATIONS_VIEW,
  ],
};

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', permission: Permission.DASHBOARD_VIEW },
  { label: 'Customer Management', href: '/customers', icon: 'Users', permission: Permission.CUSTOMERS_VIEW },
  { label: 'Vendor Management', href: '/vendors', icon: 'Building2', permission: Permission.VENDORS_VIEW },
  { label: 'Driver Management', href: '/drivers', icon: 'Car', permission: Permission.DRIVERS_VIEW },
  { label: 'Booking Management', href: '/bookings', icon: 'ClipboardList', permission: Permission.BOOKINGS_VIEW },
  { label: 'Financial Management', href: '/financial', icon: 'IndianRupee', permission: Permission.FINANCE_VIEW },
  { label: 'Reports & Analytics', href: '/reports', icon: 'BarChart3', permission: Permission.REPORTS_VIEW },
  { label: 'Subscription Management', href: '/subscriptions', icon: 'CreditCard', permission: Permission.SUBSCRIPTIONS_VIEW },
  { label: 'Settings', href: '/settings', icon: 'Settings', permission: Permission.SETTINGS_VIEW },
] as const;

export const NAV_SECTIONS = [
  {
    label: 'Overview',
    hrefs: ['/dashboard'] as const,
  },
  {
    label: 'Operations',
    hrefs: ['/customers', '/vendors', '/drivers', '/bookings'] as const,
  },
  {
    label: 'Business',
    hrefs: ['/financial', '/reports', '/subscriptions'] as const,
  },
  {
    label: 'Administration',
    hrefs: ['/settings'] as const,
  },
] as const;

/** RACE brand red (logo flame) — for comparison series, alerts, secondary accents */
export const BRAND_RED = '#E23744' as const;

export const CHART_COLORS = {
  primary: THEME.primary,
  secondary: BRAND_RED,
  towing: THEME.primary,
  driver: THEME.info,
  roadside: THEME.success,
  other: '#9CA3AF',
} as const;
