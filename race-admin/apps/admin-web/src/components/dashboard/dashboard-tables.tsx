import type { ColumnDef } from '@tanstack/react-table';

import type { RecentBookingRow, RecentVendorRow } from '@race/types';
import { formatCurrency, formatRelativeTime } from '@race/utils';
import { Card, CardContent, CardHeader, CardTitle, StatusBadge } from '@race/ui';
import { useNavigate } from 'react-router-dom';

import { DataTable } from '@/components/shared/data-table';

const bookingColumns: ColumnDef<RecentBookingRow, unknown>[] = [
  {
    accessorKey: 'bookingNumber',
    header: 'Booking ID',
    cell: ({ row }) => <span className="font-medium">#{row.original.bookingNumber}</span>,
  },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'service', header: 'Service' },
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
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => (
      <span className="text-[#555555]">{formatRelativeTime(row.original.createdAt)}</span>
    ),
  },
];

const vendorColumns: ColumnDef<RecentVendorRow, unknown>[] = [
  { accessorKey: 'name', header: 'Vendor' },
  { accessorKey: 'type', header: 'Type' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  { accessorKey: 'city', header: 'City' },
  {
    accessorKey: 'submittedAt',
    header: 'Submitted',
    cell: ({ row }) => (
      <span className="text-[#555555]">{formatRelativeTime(row.original.submittedAt)}</span>
    ),
  },
];

export function RecentBookingsTable({ data }: { data: RecentBookingRow[] }) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Bookings</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <DataTable
          columns={bookingColumns}
          data={data}
          emptyMessage="No recent bookings"
          onRowClick={(row) =>
            navigate(
              `/bookings/${row.id}${row.bookingType ? `?type=${row.bookingType}` : ''}`,
            )
          }
        />
      </CardContent>
    </Card>
  );
}

export function RecentVendorsTable({ data }: { data: RecentVendorRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Vendors</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <DataTable columns={vendorColumns} data={data} emptyMessage="No recent vendors" />
      </CardContent>
    </Card>
  );
}
