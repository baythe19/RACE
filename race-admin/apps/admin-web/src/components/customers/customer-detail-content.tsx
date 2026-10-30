import { Permission } from '@race/types';
import { ErrorState, LoadingState } from '@race/ui';
import { formatCurrency, formatDate } from '@race/utils';
import { Card, CardContent, CardHeader, CardTitle, StatusBadge } from '@race/ui';
import { useNavigate } from 'react-router-dom';

import { ActivityTimeline } from '@/components/shared/activity-timeline';
import { DataTable } from '@/components/shared/data-table';
import { UserAvatar } from '@/components/shared/user-avatar';
import { PermissionGuard } from '@/components/guards/permission-guard';
import { PageHeader } from '@/components/layout/page-header';
import { useCustomerDetail } from '@/hooks/use-customer-detail';
import { useAuthStore } from '@/stores/auth.store';
import { getApiErrorMessage } from '@race/api';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  CustomerBookingHistoryItem,
  CustomerDetail,
  CustomerPayment,
  CustomerSubscription,
} from '@race/types';

function ProfileCard({ customer }: { customer: CustomerDetail }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <UserAvatar name={customer.name} size="lg" className="h-16 w-16 text-lg" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-[#1A1A2E]">{customer.name}</h2>
            <StatusBadge status={customer.status} />
          </div>
          <p className="mt-1 text-sm text-[#555555]">{customer.customerId}</p>
          <div className="mt-3 grid gap-2 text-sm text-[#555555] sm:grid-cols-2 lg:grid-cols-4">
            <p>{customer.phone}</p>
            <p>{customer.email}</p>
            <p>{customer.city}, {customer.state}</p>
            <p>Joined {formatDate(customer.joinedAt)}</p>
          </div>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <p className="text-2xl font-bold text-[#1A1A2E]">{customer.vehicleCount}</p>
            <p className="text-xs text-[#9CA3AF]">Vehicles</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1A1A2E]">{customer.totalBookings}</p>
            <p className="text-xs text-[#9CA3AF]">Bookings</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoGrid({ customer }: { customer: CustomerDetail }) {
  const fields = [
    { label: 'Full Address', value: customer.address },
    { label: 'Date of Birth', value: customer.dateOfBirth ? formatDate(customer.dateOfBirth) : '—' },
    { label: 'Emergency Contact', value: customer.emergencyContact ?? '—' },
    { label: 'City', value: customer.city },
    { label: 'State', value: customer.state },
    { label: 'Status', value: customer.status },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Information</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
                {f.label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-[#1A1A2E]">{f.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

const bookingColumns: ColumnDef<CustomerBookingHistoryItem, unknown>[] = [
  {
    accessorKey: 'bookingNumber',
    header: 'Booking ID',
    cell: ({ row }) => (
      <span className="font-medium text-[#F5A623]">#{row.original.bookingNumber}</span>
    ),
  },
  { accessorKey: 'service', header: 'Service' },
  { accessorKey: 'vendorName', header: 'Vendor' },
  {
    accessorKey: 'driverName',
    header: 'Driver',
    cell: ({ row }) => row.original.driverName ?? '—',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => formatCurrency(row.original.amount),
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.date),
  },
];

const paymentColumns: ColumnDef<CustomerPayment, unknown>[] = [
  { accessorKey: 'reference', header: 'Reference' },
  { accessorKey: 'method', header: 'Method' },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => formatCurrency(row.original.amount),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.date),
  },
];

const subscriptionColumns: ColumnDef<CustomerSubscription, unknown>[] = [
  { accessorKey: 'planName', header: 'Plan' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => formatCurrency(row.original.amount),
  },
  { accessorKey: 'startDate', header: 'Start' },
  { accessorKey: 'endDate', header: 'End' },
];

export function CustomerDetailContent({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const { data: customer, isLoading, isError, error, refetch } = useCustomerDetail(customerId);

  if (!hasHydrated || isLoading) return <LoadingState message="Loading customer..." />;
  if (isError || !customer) {
    const message = getApiErrorMessage(error, 'Customer not found');
    return <ErrorState message={message} onRetry={() => void refetch()} />;
  }

  return (
    <PermissionGuard permission={Permission.CUSTOMERS_VIEW} permissions={user?.permissions}>
      <PageHeader
        title="Customer Details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Customers', href: '/customers' },
        ]}
      />

      <div className="space-y-6">
        <ProfileCard customer={customer} />
        <InfoGrid customer={customer} />

        <Card>
          <CardHeader>
            <CardTitle>Booking History</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <DataTable
              columns={bookingColumns}
              data={customer.bookings}
              emptyMessage="No bookings yet"
              onRowClick={(row) =>
                navigate(
                  `/bookings/${row.id}${row.bookingType ? `?type=${row.bookingType}` : ''}`,
                )
              }
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <DataTable
                columns={paymentColumns}
                data={customer.payments}
                emptyMessage="No payments"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscriptions</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <DataTable
                columns={subscriptionColumns}
                data={customer.subscriptions}
                emptyMessage="No subscriptions"
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline items={customer.activities} />
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
