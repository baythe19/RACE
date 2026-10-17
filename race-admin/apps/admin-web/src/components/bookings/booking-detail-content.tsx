import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BookingDetail } from '@race/types';
import { Permission } from '@race/types';
import { assignServiceBookingDriver, getAvailableDrivers, updateBookingStatus } from '@race/api';
import { formatCurrency, formatDateTime } from '@race/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  LoadingState,
  StatusBadge,
} from '@race/ui';

import { BookingTimeline } from '@/components/shared/booking-timeline';
import { LocationMap } from '@/components/shared/location-map';
import { PermissionGuard } from '@/components/guards/permission-guard';
import { PageHeader } from '@/components/layout/page-header';
import { useBookingDetail } from '@/hooks/use-booking-detail';
import { useAuthStore } from '@/stores/auth.store';

const SERVICE_STATUS_OPTIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['DRIVER_ASSIGNED', 'CANCELLED'],
  DRIVER_ASSIGNED: ['CANCELLED'],
  DRIVER_EN_ROUTE: ['CANCELLED'],
  DRIVER_ARRIVED: ['CANCELLED'],
  IN_PROGRESS: ['CANCELLED'],
  COMPLETED: [],
  RATED: [],
  CANCELLED: [],
};

const LEGACY_STATUS_OPTIONS: Record<string, string[]> = {
  CREATED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['SERVICE_STARTED', 'CANCELLED'],
  SERVICE_STARTED: ['SERVICE_COMPLETED', 'CANCELLED'],
  SERVICE_COMPLETED: ['PAYMENT_PENDING', 'PAID', 'COMPLETED'],
  PAYMENT_PENDING: ['PAID', 'REFUNDED', 'CANCELLED'],
  PAID: ['REFUNDED'],
  CANCELLED: ['REFUNDED'],
  REFUNDED: [],
};

function SummaryCard({ booking }: { booking: BookingDetail }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-[#9CA3AF]">Booking ID</p>
            <h2 className="text-2xl font-bold text-[#F5A623]">{booking.bookingNumber}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <StatusBadge status={booking.status} />
              {booking.internalStatus === 'DRIVER_ASSIGNED' ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  Driver allotted — waiting for accept
                </span>
              ) : null}
              <span className="text-sm text-[#555555]">{booking.service}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#9CA3AF]">Amount</p>
            <p className="text-2xl font-bold text-[#1A1A2E]">{formatCurrency(booking.amount)}</p>
            <p className="mt-1 text-sm text-[#555555]">{formatDateTime(booking.date)}</p>
          </div>
        </div>
        {booking.notes ? (
          <p className="mt-4 rounded-lg bg-[#F4F5F7] p-3 text-sm text-[#555555]">{booking.notes}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EntityCard({
  title,
  name,
  phone,
  email,
  linkTo,
}: {
  title: string;
  name: string;
  phone: string;
  email?: string;
  linkTo?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          <div>
            <dt className="text-xs text-[#9CA3AF]">Name</dt>
            <dd className="text-sm font-medium text-[#1A1A2E]">
              {linkTo ? (
                <Link to={linkTo} className="text-[#F5A623] hover:underline">
                  {name}
                </Link>
              ) : (
                name
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#9CA3AF]">Phone</dt>
            <dd className="text-sm font-medium text-[#1A1A2E]">{phone}</dd>
          </div>
          {email ? (
            <div>
              <dt className="text-xs text-[#9CA3AF]">Email</dt>
              <dd className="text-sm font-medium text-[#1A1A2E]">{email}</dd>
            </div>
          ) : null}
        </dl>
      </CardContent>
    </Card>
  );
}

function PaymentCard({ booking }: { booking: BookingDetail }) {
  const p = booking.payment;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Information</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Amount', value: formatCurrency(p.amount) },
            { label: 'Method', value: p.method },
            { label: 'Status', value: <StatusBadge status={p.status} /> },
            { label: 'Transaction ID', value: p.transactionId },
            {
              label: 'Paid At',
              value: p.paidAt ? formatDateTime(p.paidAt) : '—',
            },
          ].map((f) => (
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

export function BookingDetailContent({
  bookingId,
  bookingType,
}: {
  bookingId: string;
  bookingType?: 'towing' | 'driver' | 'legacy';
}) {
  const user = useAuthStore((s) => s.user);
  const { data: booking, isLoading, isError, refetch } = useBookingDetail(bookingId, bookingType);
  const qc = useQueryClient();
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [nextStatus, setNextStatus] = useState('');
  const resolvedBookingType = booking?.bookingType ?? bookingType ?? 'legacy';
  const currentStatus = booking?.internalStatus ?? booking?.status ?? '';
  const statusOptions =
    resolvedBookingType === 'legacy'
      ? LEGACY_STATUS_OPTIONS[currentStatus] ?? []
      : SERVICE_STATUS_OPTIONS[currentStatus] ?? [];

  const availableDriversQuery = useQuery({
    queryKey: ['available-drivers', resolvedBookingType],
    queryFn: () =>
      getAvailableDrivers(
        resolvedBookingType === 'towing' || resolvedBookingType === 'driver'
          ? { bookingType: resolvedBookingType }
          : undefined,
      ),
    enabled: resolvedBookingType === 'towing' || resolvedBookingType === 'driver',
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  const assignDriverMutation = useMutation({
    mutationFn: (driverId: string) => {
      if (resolvedBookingType !== 'towing' && resolvedBookingType !== 'driver') {
        throw new Error('Driver assignment is only available for service bookings');
      }
      return assignServiceBookingDriver(bookingId, {
        driverId,
        bookingType: resolvedBookingType,
      });
    },
    onSuccess: async () => {
      setSelectedDriverId('');
      await qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      await qc.invalidateQueries({ queryKey: ['bookings'] });
      await qc.invalidateQueries({ queryKey: ['booking-status-counts'] });
      await qc.invalidateQueries({ queryKey: ['available-drivers'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      updateBookingStatus(bookingId, status, {
        bookingType: resolvedBookingType,
      }),
    onSuccess: async () => {
      setNextStatus('');
      await qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      await qc.invalidateQueries({ queryKey: ['bookings'] });
      await qc.invalidateQueries({ queryKey: ['booking-status-counts'] });
      await qc.invalidateQueries({ queryKey: ['available-drivers'] });
    },
  });

  if (isLoading) return <LoadingState message="Loading booking..." />;
  if (isError || !booking) {
    return <ErrorState message="Booking not found" onRetry={() => void refetch()} />;
  }

  return (
    <PermissionGuard permission={Permission.BOOKINGS_VIEW} permissions={user?.permissions}>
      <PageHeader
        title="Booking Details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Bookings', href: '/bookings' },
          { label: booking.bookingNumber },
        ]}
        actions={
          <Link to="/bookings" className="text-sm font-medium text-[#F5A623] hover:underline">
            ← Back to Bookings
          </Link>
        }
      />

      <div className="space-y-6">
        <SummaryCard booking={booking} />

        <Card>
          <CardHeader>
            <CardTitle>Booking Meta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs text-[#9CA3AF]">Booking Type</p>
                <p className="text-sm font-semibold text-[#1A1A2E]">{booking.bookingType ?? 'legacy'}</p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF]">Vehicle Category</p>
                <p className="text-sm font-semibold text-[#1A1A2E]">{booking.vehicleCategory ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF]">Package Hours</p>
                <p className="text-sm font-semibold text-[#1A1A2E]">{booking.packageHours ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <EntityCard
            title="Customer Details"
            name={booking.customerName}
            phone={booking.customerPhone}
            email={booking.customerEmail}
            linkTo={`/customers/${booking.customerId}`}
          />
          <EntityCard
            title="Vendor Details"
            name={booking.vendorName}
            phone={booking.vendorPhone}
            linkTo={`/vendors/${booking.vendorId}`}
          />
          <EntityCard
            title="Driver Details"
            name={booking.driverName ?? 'Not assigned'}
            phone={booking.driverPhone ?? '—'}
            linkTo={booking.driverId ? `/drivers/${booking.driverId}` : undefined}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <LocationMap location={booking.location} />
          <PaymentCard booking={booking} />
        </div>

        {booking.fareBreakdown ? (
          <Card>
            <CardHeader>
              <CardTitle>Fare Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded-md bg-[#F8F8F8] p-3 text-xs">
                {JSON.stringify(booking.fareBreakdown, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ) : null}

        {(resolvedBookingType === 'towing' || resolvedBookingType === 'driver') &&
        currentStatus === 'CONFIRMED' &&
        !booking.driverId ? (
          <Card>
            <CardHeader>
              <CardTitle>Driver Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <select
                  className="rounded-md border border-border px-3 py-2 text-sm"
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                >
                  <option value="">Select available driver</option>
                  {(availableDriversQuery.data ?? []).map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.fullName} ({d.mobileNumber})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded-md bg-[#F5A623] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={!selectedDriverId || assignDriverMutation.isPending}
                  onClick={() => assignDriverMutation.mutate(selectedDriverId)}
                >
                  {assignDriverMutation.isPending ? 'Assigning...' : 'Assign Driver'}
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Status Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <select
                className="rounded-md border border-border px-3 py-2 text-sm"
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
              >
                <option value="">Select status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded-md bg-[#1A1A2E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={!nextStatus || updateStatusMutation.isPending}
                onClick={() => updateStatusMutation.mutate(nextStatus)}
              >
                {updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}
              </button>
            </div>
            {updateStatusMutation.isError ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {updateStatusMutation.error instanceof Error
                  ? updateStatusMutation.error.message
                  : 'Unable to update booking status.'}
              </p>
            ) : null}
            {assignDriverMutation.isError ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {assignDriverMutation.error instanceof Error
                  ? assignDriverMutation.error.message
                  : 'Unable to assign the driver.'}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingTimeline events={booking.timeline} />
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
