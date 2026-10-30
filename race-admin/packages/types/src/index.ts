export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OPERATIONS_ADMIN = 'OPERATIONS_ADMIN',
  VERIFICATION_ADMIN = 'VERIFICATION_ADMIN',
  FINANCE_ADMIN = 'FINANCE_ADMIN',
  SUPPORT_ADMIN = 'SUPPORT_ADMIN',
}

export enum Permission {
  DASHBOARD_VIEW = 'DASHBOARD_VIEW',
  CUSTOMERS_VIEW = 'CUSTOMERS_VIEW',
  CUSTOMERS_MANAGE = 'CUSTOMERS_MANAGE',
  VENDORS_VIEW = 'VENDORS_VIEW',
  VENDORS_MANAGE = 'VENDORS_MANAGE',
  VENDORS_APPROVE = 'VENDORS_APPROVE',
  DRIVERS_VIEW = 'DRIVERS_VIEW',
  DRIVERS_MANAGE = 'DRIVERS_MANAGE',
  DRIVERS_APPROVE = 'DRIVERS_APPROVE',
  BOOKINGS_VIEW = 'BOOKINGS_VIEW',
  BOOKINGS_MANAGE = 'BOOKINGS_MANAGE',
  FINANCE_VIEW = 'FINANCE_VIEW',
  FINANCE_MANAGE = 'FINANCE_MANAGE',
  REPORTS_VIEW = 'REPORTS_VIEW',
  SUBSCRIPTIONS_VIEW = 'SUBSCRIPTIONS_VIEW',
  SUBSCRIPTIONS_MANAGE = 'SUBSCRIPTIONS_MANAGE',
  ADMIN_USERS_VIEW = 'ADMIN_USERS_VIEW',
  ADMIN_USERS_MANAGE = 'ADMIN_USERS_MANAGE',
  SETTINGS_VIEW = 'SETTINGS_VIEW',
  SETTINGS_MANAGE = 'SETTINGS_MANAGE',
  AUDIT_LOGS_VIEW = 'AUDIT_LOGS_VIEW',
  NOTIFICATIONS_VIEW = 'NOTIFICATIONS_VIEW',
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
  avatarUrl?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: AdminUser;
  tokens: AuthTokens;
}

export type TrendDirection = 'up' | 'down' | 'neutral';

export interface StatMetric {
  id: string;
  label: string;
  value: string | number;
  trend?: {
    value: string;
    direction: TrendDirection;
    label?: string;
  };
  icon?: string;
  variant?: 'default' | 'warning' | 'success';
}

export interface ChartDataPoint {
  label: string;
  current: number;
  previous: number;
}

export interface DonutSegment {
  name: string;
  value: number;
  color: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  type: 'vendor' | 'driver' | 'booking' | 'payment' | 'customer' | 'system';
}

export interface RecentBookingRow {
  id: string;
  bookingNumber: string;
  customerName: string;
  service: string;
  status: string;
  amount: number;
  createdAt: string;
  bookingType?: BookingType;
}

export interface RecentVendorRow {
  id: string;
  name: string;
  type: string;
  status: string;
  submittedAt: string;
  city: string;
}

export interface DashboardAlert {
  id: string;
  message: string;
  href: string;
  urgent: boolean;
}

export interface DriverPerformancePoint {
  metric: string;
  value: number;
}

export interface DashboardData {
  stats: StatMetric[];
  revenueChart: ChartDataPoint[];
  bookingsChart: ChartDataPoint[];
  topServices: DonutSegment[];
  recentActivities: ActivityItem[];
  recentBookings: RecentBookingRow[];
  recentVendors: RecentVendorRow[];
  alerts?: DashboardAlert[];
  driverPerformance?: DriverPerformancePoint[];
  useMockData?: boolean;
  activeBookings?: number;
  totalBookings?: number;
  totalRevenue?: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Customer Management ───────────────────────────────────────────────────

export type CustomerStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export interface CustomerListItem {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  vehicleCount: number;
  totalBookings: number;
  status: CustomerStatus;
  joinedAt: string;
}

export interface CustomerListFilters {
  search?: string;
  status?: CustomerStatus | 'ALL';
  city?: string;
  page?: number;
  pageSize?: number;
}

export interface CustomerBookingHistoryItem {
  id: string;
  bookingNumber: string;
  service: string;
  status: string;
  amount: number;
  date: string;
  vendorName?: string;
  driverName?: string;
  customerName?: string;
  bookingType?: 'legacy' | 'towing' | 'driver';
}

export interface CustomerPayment {
  id: string;
  amount: number;
  method: string;
  status: string;
  date: string;
  reference: string;
}

export interface CustomerSubscription {
  id: string;
  planName: string;
  status: string;
  startDate: string;
  endDate: string;
  amount: number;
}

export interface CustomerDetail extends CustomerListItem {
  address: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  bookings: CustomerBookingHistoryItem[];
  payments: CustomerPayment[];
  subscriptions: CustomerSubscription[];
  activities: ActivityItem[];
}

// ─── Vendor Management ─────────────────────────────────────────────────────

export type VendorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'REJECTED';

export interface VendorListItem {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  location: string;
  city: string;
  vehicleCount: number;
  driverCount: number;
  rating: number;
  reviewCount: number;
  status: VendorStatus;
  verificationStatus: VerificationStatus;
  documentsStatus: VerificationStatus;
}

export interface VendorListFilters {
  search?: string;
  status?: VendorStatus | 'ALL';
  verification?: VerificationStatus | 'ALL';
  city?: string;
  page?: number;
  pageSize?: number;
}

export interface VendorVehicle {
  id: string;
  registrationNo: string;
  type: string;
  model: string;
  year: number;
  status: 'ACTIVE' | 'UNDER_MAINTENANCE';
}

export interface VendorDocument {
  id: string;
  key?: string;
  name: string;
  status: VerificationStatus;
  url?: string;
  uploadedAt: string;
}

export interface VendorAssignedDriver {
  id: string;
  name: string;
  phone: string;
  status: 'ACTIVE' | 'ON_LEAVE';
  initials: string;
}

export interface VendorBookingRow {
  id: string;
  bookingNumber: string;
  customerName: string;
  service: string;
  driverName: string;
  amount: number;
  status: string;
  date: string;
  bookingType?: BookingType;
}

export interface VendorQuickStat {
  id: string;
  label: string;
  value: string;
  icon: string;
}

export interface VendorDetail extends VendorListItem {
  address: string;
  joinedAt: string;
  businessType: string;
  gstNumber: string;
  panNumber: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  serviceAreas: string[];
  workingHours: string;
  totalBookings: number;
  totalRevenue: number;
  vehicles: VendorVehicle[];
  recentBookings: VendorBookingRow[];
  documents: VendorDocument[];
  assignedDrivers: VendorAssignedDriver[];
  /** Vendor self-onboarded fleet (Partner app → My Drivers) */
  myDrivers?: VendorAssignedDriver[];
  activities: ActivityItem[];
  quickStats: VendorQuickStat[];
  verificationStage?: string;
  verificationStageLabel?: string;
  reviewNotes?: string;
}

export interface VendorStatusCounts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
}

// ─── Driver Management ─────────────────────────────────────────────────────

export type DriverStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface DriverListItem {
  id: string;
  name: string;
  phone: string;
  licenseNo: string;
  driverType: string;
  vendorId: string;
  vendorName: string;
  city: string;
  vehicleRegistration: string;
  rating: number;
  reviewCount: number;
  status: DriverStatus;
  verificationStatus: VerificationStatus;
  documentsStatus: VerificationStatus;
}

export interface DriverListFilters {
  search?: string;
  status?: DriverStatus | 'ALL';
  verification?: VerificationStatus | 'ALL';
  vendorId?: string;
  city?: string;
  page?: number;
  pageSize?: number;
}

export interface DriverReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface DriverDocument {
  id: string;
  key?: string;
  name: string;
  status: VerificationStatus;
  url?: string;
  uploadedAt: string;
}

export interface DriverAssignedVehicle {
  registrationNo: string;
  type: string;
  model: string;
  year: number;
  status: string;
}

export interface DriverDetail extends DriverListItem {
  email: string;
  address: string;
  joinedAt: string;
  licenseExpiry: string;
  licenseClass: string;
  aadhaarMasked: string;
  assignedVehicle: DriverAssignedVehicle;
  bookings: CustomerBookingHistoryItem[];
  reviews: DriverReview[];
  documents: DriverDocument[];
  activities: ActivityItem[];
}

export interface DriverStatusCounts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface VendorOption {
  id: string;
  name: string;
}

// ─── Booking Management ────────────────────────────────────────────────────

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_EN_ROUTE'
  | 'DRIVER_ARRIVED'
  | 'CREATED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'RATED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PAID';

export type BookingType = 'legacy' | 'towing' | 'driver';

export interface BookingListItem {
  id: string;
  bookingType?: BookingType;
  bookingNumber: string;
  customerId: string;
  customerName: string;
  vendorId: string;
  vendorName: string;
  driverId?: string;
  driverName?: string;
  driverAssignment?: 'Assigned' | 'Unassigned' | 'Awaiting acceptance';
  service: string;
  serviceType: string;
  amount: number;
  status: BookingStatus;
  /** Raw DB status when display status is masked (e.g. DRIVER_ASSIGNED → PENDING). */
  internalStatus?: string;
  date: string;
  city: string;
  fareBreakdown?: Record<string, unknown>;
  vehicleCategory?: string;
  packageHours?: number;
  assignedFleetVehicleLabel?: string;
}

export interface BookingListFilters {
  search?: string;
  status?: BookingStatus | 'ALL';
  serviceType?: string;
  type?: 'towing' | 'driver' | 'all' | 'legacy';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface BookingTimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  status: string;
}

export interface BookingLocationPoint {
  address: string;
  lat: number;
  lng: number;
}

export interface BookingLocation {
  pickup: BookingLocationPoint;
  dropoff?: BookingLocationPoint;
}

export interface BookingPaymentInfo {
  amount: number;
  method: string;
  status: string;
  transactionId: string;
  paidAt?: string;
}

export interface BookingDetail extends BookingListItem {
  customerPhone: string;
  customerEmail: string;
  vendorPhone: string;
  driverPhone?: string;
  location: BookingLocation;
  payment: BookingPaymentInfo;
  timeline: BookingTimelineEvent[];
  statusHistory?: Array<{ id: string; status: string; timestamp: string; note?: string }>;
  paymentTransactions?: Array<{
    id: string;
    paymentType: string;
    amount: number;
    status: string;
    note?: string;
    createdAt: string;
  }>;
  customer?: { name: string; mobile: string; email?: string };
  driver?: { name: string; mobile: string; currentLocation?: { latitude?: number; longitude?: number; updatedAt?: string } | null };
  vehicle?: { brand?: string; model?: string; vehicleNumber?: string };
  fareBreakdown?: Record<string, unknown>;
  packageHours?: number;
  vehicleCategory?: string;
  cancellationInfo?: {
    cancelledAt?: string;
    cancelledBy?: string;
    cancellationReason?: string;
    refundAmount?: number;
    refundStatus?: string;
  };
  notes?: string;
}

export interface BookingStatusCounts {
  all: number;
  created: number;
  assigned: number;
  enRoute: number;
  active: number;
  completed: number;
  cancelled: number;
  pending?: number;
}

// ─── Financial Management ────────────────────────────────────────────────────

export type FinancialTab =
  | 'PAYMENTS'
  | 'VENDOR_PAYOUTS'
  | 'COMMISSIONS'
  | 'REFUNDS'
  | 'SUBSCRIPTION_REVENUE';

export type TransactionType = 'PAYMENT' | 'PAYOUT' | 'COMMISSION' | 'REFUND' | 'SUBSCRIPTION';

export interface FinancialMetric {
  id: string;
  label: string;
  value: string;
  trend?: { value: string; direction: TrendDirection; label?: string };
  icon: string;
}

export interface FinancialTransaction {
  id: string;
  transactionId: string;
  type: TransactionType;
  from: string;
  to: string;
  amount: number;
  status: string;
  date: string;
  tab: FinancialTab;
}

export interface FinancialListFilters {
  tab?: FinancialTab;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface FinancialOverview {
  metrics: FinancialMetric[];
}

// ─── Reports & Analytics ─────────────────────────────────────────────────────

export type ReportTab = 'REVENUE' | 'BOOKING' | 'DRIVER' | 'CUSTOMER';

export interface ReportMetric {
  id: string;
  label: string;
  value: string | number;
  icon: string;
}

export interface RevenueTrendPoint {
  label: string;
  revenue: number;
}

export interface MonthlyComparisonPoint {
  month: string;
  current: number;
  previous: number;
}

export interface ReportFilters {
  tab?: ReportTab;
  dateFrom?: string;
  dateTo?: string;
  period?: string;
}

export interface ReportData {
  metrics: ReportMetric[];
  revenueTrend: RevenueTrendPoint[];
  topServices: DonutSegment[];
  monthlyComparison: MonthlyComparisonPoint[];
}

// ─── Subscription Management ─────────────────────────────────────────────────

export type SubscriptionPlanTab = 'CUSTOMER' | 'VENDOR';

export interface SubscriptionMetric {
  id: string;
  label: string;
  value: string | number;
  icon: string;
}

export interface SubscriptionPlan {
  id: string;
  planName: string;
  type: 'Customer' | 'Vendor';
  activeSubscriptions: number;
  price: number;
  priceLabel: string;
  revenue: number;
  status: string;
  tab: SubscriptionPlanTab;
}

export interface SubscriptionListFilters {
  tab?: SubscriptionPlanTab;
  page?: number;
  pageSize?: number;
}

export interface SubscriptionOverview {
  metrics: SubscriptionMetric[];
}

// ─── Admin Users & Roles ─────────────────────────────────────────────────────

export type AdminUserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AdminUserStatus;
  lastLogin: string;
}

export interface RolePermissionCard {
  role: Role;
  title: string;
  permissions: string[];
}

export interface AdminUsersData {
  users: AdminUserListItem[];
  roles: RolePermissionCard[];
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationFilter = 'ALL' | 'UNREAD' | 'READ' | 'SYSTEM';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'SYSTEM' | 'BOOKING' | 'VENDOR' | 'PAYMENT' | 'ALERT';
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListFilters {
  filter?: NotificationFilter;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  avatarUrl?: string;
  department: string;
  joinedAt: string;
}

export interface LoginActivityItem {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED';
}

export interface ProfileDetail extends ProfileData {
  loginActivity: LoginActivityItem[];
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export type SettingsCategory =
  | 'general'
  | 'notifications'
  | 'payment'
  | 'security'
  | 'service'
  | 'terms'
  | 'emailSms'
  | 'appearance';

export interface GeneralSettings {
  appName: string;
  supportEmail: string;
  supportPhone: string;
  timezone: string;
  defaultLanguage: string;
}

export interface NotificationSettings {
  emailAlerts: boolean;
  smsAlerts: boolean;
  pushAlerts: boolean;
  bookingAlerts: boolean;
  vendorAlerts: boolean;
  financeAlerts: boolean;
}

export interface PaymentSettings {
  currency: string;
  commissionRate: number;
  payoutCycle: string;
  minPayoutAmount: number;
  enableWallet: boolean;
}

export interface SecuritySettings {
  sessionTimeout: number;
  maxLoginAttempts: number;
  require2FA: boolean;
  passwordExpiryDays: number;
}

export interface ServiceSettings {
  defaultServiceRadius: number;
  maxBookingWaitMinutes: number;
  enableSOS: boolean;
  enableSubscriptions: boolean;
}

/** Demo overlay for admin UI. Default OFF — live partner/customer data only. */
export interface DemoSettings {
  useMockData: boolean;
}

export interface TermsSettings {
  termsUrl: string;
  privacyUrl: string;
  refundPolicyUrl: string;
}

export interface EmailSmsSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smsProvider: string;
  smsApiKey: string;
}

export interface AppearanceSettings {
  primaryColor: string;
  sidebarTheme: 'light' | 'dark';
  compactMode: boolean;
}

export interface AppSettings {
  general: GeneralSettings;
  notifications: NotificationSettings;
  payment: PaymentSettings;
  security: SecuritySettings;
  service: ServiceSettings;
  terms: TermsSettings;
  emailSms: EmailSmsSettings;
  appearance: AppearanceSettings;
  demo: DemoSettings;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  user: string;
  category: string;
  timestamp: string;
  details: string;
}
