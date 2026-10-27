import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { BookingListItem } from '@race/types';
import { cn, formatCurrency, formatDateTime } from '@race/utils';
import { Card, CardContent, ErrorState, LoadingState, StatusBadge } from '@race/ui';

import { ConfirmDialog } from '@/components/shared/modal';
import { DataTable } from '@/components/shared/data-table';
import { EntityFormModal } from '@/components/shared/entity-form-modal';
import { ListToolbar } from '@/components/shared/list-toolbar';
import { Pagination } from '@/components/shared/pagination';
import { RowActionsMenu } from '@/components/shared/row-actions-menu';
import { useBookingMutations } from '@/hooks/use-booking-mutations';
import { useBookings } from '@/hooks/use-bookings';

function bookingTypeBadge(type?: string) {
  if (type === 'towing') return 'bg-blue-100 text-blue-700';
  if (type === 'driver') return 'bg-green-100 text-green-700';
  return 'bg-slate-100 text-slate-700';
}

const TABS = [
  { key: 'ALL', label: 'All Bookings' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
] as const;

function assignmentLabel(row: BookingListItem): string {
  if (row.driverAssignment === 'Awaiting acceptance') {
    return row.driverName ? `${row.driverName} (awaiting accept)` : 'Awaiting driver accept';
  }
  return row.driverName ?? row.driverAssignment ?? 'Unassigned';
}

const BOOKING_FIELDS = [
  { name: 'customerName', label: 'Customer Name', required: true, placeholder: 'Enter customer name' },
  { name: 'vendorName', label: 'Vendor Name', required: true, placeholder: 'Enter vendor name' },
  { name: 'service', label: 'Service', required: true, placeholder: 'e.g. Towing, battery jump-start' },
  {
    name: 'serviceType',
    label: 'Service Type',
    type: 'select' as const,
    placeholder: 'Select service type',
    options: [
      { label: 'Towing', value: 'towing' },
      { label: 'Roadside', value: 'roadside' },
      { label: 'Battery', value: 'battery' },
      { label: 'Flat Tyre', value: 'tyre' },
      { label: 'Fuel', value: 'fuel' },
    ],
  },
  { name: 'amount', label: 'Amount (₹)', type: 'number' as const, required: true, placeholder: 'Enter amount in rupees' },
  { name: 'city', label: 'City', required: true, placeholder: 'Enter service city' },
  {
    name: 'status',
    label: 'Status',
    type: 'select' as const,
    placeholder: 'Select booking status',
    options: [
      { label: 'Created', value: 'CREATED' },
      { label: 'Assigned', value: 'ASSIGNED' },
      { label: 'En Route', value: 'EN_ROUTE' },
      { label: 'Completed', value: 'COMPLETED' },
      { label: 'Cancelled', value: 'CANCELLED' },
    ],
  },
];

export function BookingList() {
  const navigate = useNavigate();
  const {
    data,
    counts,
    isLoading,
    isError,
    refetch,
    search,
    setSearch,
    serviceType,
    setServiceType,
    bookingType,
    setBookingType,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    setPage,
    pageSize,
    serviceTypes,
    activeTab,
    setActiveTab,
    handleExport,
  } = useBookings();

  const { create, update, remove } = useBookingMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BookingListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BookingListItem | null>(null);

  const columns = useMemo<ColumnDef<BookingListItem, unknown>[]>(
    () => [
      {
        accessorKey: 'bookingType',
        header: 'Type',
        cell: ({ row }) => (
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${bookingTypeBadge(row.original.bookingType)}`}>
            {row.original.bookingType === 'towing'
              ? 'Towing'
              : row.original.bookingType === 'driver'
                ? 'Driver'
                : 'Legacy'}
          </span>
        ),
      },
      {
        accessorKey: 'bookingNumber',
        header: 'Booking ID',
        cell: ({ row }) => (
          <span className="font-medium text-primary">{row.original.bookingNumber}</span>
        ),
      },
      { accessorKey: 'customerName', header: 'Customer' },
      { accessorKey: 'vendorName', header: 'Vendor' },
      {
        accessorKey: 'driverName',
        header: 'Driver',
        cell: ({ row }) => row.original.driverName ?? '—',
      },
      {
        accessorKey: 'driverAssignment',
        header: 'Assignment',
        cell: ({ row }) => assignmentLabel(row.original),
      },
      { accessorKey: 'service', header: 'Service' },
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
        cell: ({ row }) => <span className="text-body">{formatDateTime(row.original.date)}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <RowActionsMenu
            onView={() =>
              navigate(
                `/bookings/${row.original.id}${row.original.bookingType ? `?type=${row.original.bookingType}` : ''}`,
              )
            }
            onEdit={
              row.original.bookingType === 'legacy'
                ? () => {
                    setEditing(row.original);
                    setFormOpen(true);
                  }
                : undefined
            }
            onDelete={
              row.original.bookingType === 'legacy'
                ? () => setDeleteTarget(row.original)
                : undefined
            }
          />
        ),
      },
    ],
    [navigate],
  );

  if (isLoading && !data) return <LoadingState message="Loading bookings..." />;
  if (isError) return <ErrorState message="Failed to load bookings" onRetry={() => void refetch()} />;

  const tabCounts: Record<string, number> = {
    ALL: counts?.all ?? 0,
    PENDING: counts?.pending ?? 0,
    ACTIVE: counts?.active ?? counts?.enRoute ?? 0,
    COMPLETED: counts?.completed ?? 0,
    CANCELLED: counts?.cancelled ?? 0,
  };

  return (
    <>
      <Card>
        <div className="flex flex-wrap gap-1 border-b border-border px-4 pt-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-body hover:text-heading',
              )}
            >
              {tab.label} ({tabCounts[tab.key]?.toLocaleString('en-IN')})
            </button>
          ))}
        </div>

        <CardContent className="p-0">
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by booking ID, customer, driver..."
            filters={[
              {
                id: 'bookingType',
                label: 'Booking Type',
                value: bookingType,
                onChange: setBookingType,
                options: [
                  { label: 'All', value: 'all' },
                  { label: 'Towing', value: 'towing' },
                  { label: 'Driver', value: 'driver' },
                  { label: 'Legacy', value: 'legacy' },
                ],
              },
              {
                id: 'serviceType',
                label: 'Service Type',
                value: serviceType,
                onChange: setServiceType,
                options: serviceTypes.map((s) => ({ label: s.label, value: s.value })),
              },
            ]}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onExport={() => void handleExport()}
            exportLabel="Export"
            onAdd={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            addLabel="Add Booking"
          />

          <DataTable
            columns={columns}
            data={data?.items ?? []}
            emptyMessage="No bookings found"
            onRowClick={(row) =>
              navigate(`/bookings/${row.id}${row.bookingType ? `?type=${row.bookingType}` : ''}`)
            }
            getRowId={(row) => row.id}
          />

          {data ? (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>

      <EntityFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        resetKey={editing?.id ?? 'create'}
        title={editing ? 'Edit Booking' : 'Add Booking'}
        fields={BOOKING_FIELDS}
        initialValues={
          editing
            ? {
                customerName: editing.customerName,
                vendorName: editing.vendorName,
                service: editing.service,
                serviceType: editing.serviceType,
                amount: String(editing.amount),
                city: editing.city,
                status: editing.status,
              }
            : { status: 'CREATED', serviceType: 'towing', city: 'Bhubaneswar' }
        }
        onSubmit={async (values) => {
          const payload = {
            customerName: values.customerName,
            vendorName: values.vendorName,
            service: values.service,
            serviceType: values.serviceType,
            amount: Number(values.amount),
            city: values.city,
            status: values.status as BookingListItem['status'],
          };
          if (editing) await update.mutateAsync({ id: editing.id, data: payload });
          else await create.mutateAsync(payload);
          setFormOpen(false);
          setEditing(null);
        }}
        loading={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Booking"
        message={`Delete booking ${deleteTarget?.bookingNumber}?`}
        onConfirm={async () => {
          if (deleteTarget) {
            await remove.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        loading={remove.isPending}
      />
    </>
  );
}
