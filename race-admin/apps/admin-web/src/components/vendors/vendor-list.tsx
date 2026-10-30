import type { ColumnDef } from '@tanstack/react-table';
import { Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { VendorListItem } from '@race/types';
import { cn } from '@race/utils';
import { Card, CardContent, ErrorState, LoadingState, StatusBadge } from '@race/ui';

import { ConfirmDialog } from '@/components/shared/modal';
import { DataTable } from '@/components/shared/data-table';
import { EntityFormModal } from '@/components/shared/entity-form-modal';
import { ListToolbar } from '@/components/shared/list-toolbar';
import { Pagination } from '@/components/shared/pagination';
import { RowActionsMenu } from '@/components/shared/row-actions-menu';
import { useVendorMutations } from '@/hooks/use-vendor-mutations';
import { useVendors } from '@/hooks/use-vendors';

const VENDOR_FIELDS = [
  { name: 'businessName', label: 'Business Name', required: true, placeholder: 'Enter business name' },
  { name: 'ownerName', label: 'Owner Name', required: true, placeholder: 'Enter owner name' },
  { name: 'phone', label: 'Phone', type: 'tel' as const, required: true, placeholder: 'Enter 10-digit mobile number' },
  { name: 'email', label: 'Email', type: 'email' as const, placeholder: 'Enter email address' },
  {
    name: 'vendorType',
    label: 'Vendor Type',
    type: 'select' as const,
    required: true,
    placeholder: 'Select vendor type',
    options: [
      { label: 'Towing Company', value: 'towing_company' },
      { label: 'Tow Truck Driver', value: 'tow_truck_driver' },
      { label: 'Full-Time Driver', value: 'full_time_driver' },
      { label: 'Part-Time Driver', value: 'part_time_driver' },
      { label: 'Mechanic', value: 'mechanic' },
    ],
  },
];

const VENDOR_ADDRESS_FIELDS = [
  { name: 'addressLine', label: 'Business Address', placeholder: 'Shop / plot / street' },
  { name: 'city', label: 'City', required: true, placeholder: 'Enter city name' },
  { name: 'pincode', label: 'PIN Code', placeholder: '6-digit PIN code' },
  { name: 'state', label: 'State', placeholder: 'Odisha' },
];

const VENDOR_STATUS_FIELDS = [
  {
    name: 'status',
    label: 'Status',
    type: 'select' as const,
    placeholder: 'Select status',
    options: [
      { label: 'Pending', value: 'PENDING' },
      { label: 'Approved', value: 'APPROVED' },
      { label: 'Rejected', value: 'REJECTED' },
      { label: 'Suspended', value: 'SUSPENDED' },
    ],
  },
];
const TABS = [
  { key: 'ALL', label: 'All Vendors' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
] as const;

export function VendorList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    data,
    counts,
    isLoading,
    isError,
    refetch,
    search,
    setSearch,
    verification,
    setVerification,
    city,
    setCity,
    setPage,
    pageSize,
    cities,
    activeTab,
    setActiveTab,
    handleExport,
  } = useVendors();

  const { create, update, remove } = useVendorMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VendorListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VendorListItem | null>(null);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status && TABS.some((tab) => tab.key === status)) {
      setActiveTab(status);
      const next = new URLSearchParams(searchParams);
      next.delete('status');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setActiveTab, setSearchParams]);

  const columns = useMemo<ColumnDef<VendorListItem, unknown>[]>(
    () => [
      {
        accessorKey: 'businessName',
        header: 'Vendor Name',
        cell: ({ row }) => <span className="font-medium">{row.original.businessName}</span>,
      },
      { accessorKey: 'ownerName', header: 'Owner' },
      { accessorKey: 'location', header: 'Location' },
      { accessorKey: 'vehicleCount', header: 'Vehicles' },
      { accessorKey: 'driverCount', header: 'Drivers' },
      {
        accessorKey: 'rating',
        header: 'Rating',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 font-medium">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            {row.original.rating}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'verificationStatus',
        header: 'Verification',
        cell: ({ row }) => <StatusBadge status={row.original.verificationStatus} />,
      },
      {
        accessorKey: 'documentsStatus',
        header: 'Documents',
        cell: ({ row }) => <StatusBadge status={row.original.documentsStatus} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <RowActionsMenu
            onView={() => navigate(`/vendors/${row.original.id}`)}
            onEdit={() => {
              setEditing(row.original);
              setFormOpen(true);
            }}
            onDelete={() => setDeleteTarget(row.original)}
          />
        ),
      },
    ],
    [navigate],
  );

  if (isLoading && !data) {
    return <LoadingState message="Loading vendors..." />;
  }

  if (isError) {
    return <ErrorState message="Failed to load vendors" onRetry={() => void refetch()} />;
  }

  const tabCounts: Record<string, number> = {
    ALL: counts?.all ?? 0,
    PENDING: counts?.pending ?? 0,
    APPROVED: counts?.approved ?? 0,
    REJECTED: counts?.rejected ?? 0,
  };

  return (
    <>
    <Card>
      <div className="flex flex-wrap gap-1 border-b border-[#EEEEEE] px-4 pt-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'border-[#F5A623] text-[#F5A623]'
                : 'border-transparent text-[#555555] hover:text-[#1A1A2E]',
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
          searchPlaceholder="Search by business name, owner name or mobile..."
          filters={[
            {
              id: 'verification',
              label: 'Verification',
              value: verification,
              onChange: setVerification,
              options: [
                { label: 'All', value: 'ALL' },
                { label: 'Verified', value: 'VERIFIED' },
                { label: 'Pending', value: 'PENDING' },
                { label: 'Rejected', value: 'REJECTED' },
              ],
            },
            {
              id: 'city',
              label: 'City',
              value: city,
              onChange: setCity,
              options: [
                { label: 'All Cities', value: 'ALL' },
                ...cities.map((c) => ({ label: c, value: c })),
              ],
            },
          ]}
          onExport={() => void handleExport()}
          exportLabel="Export"
          onAdd={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          addLabel="Add Vendor"
        />

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          emptyMessage="No vendors found"
          onRowClick={(row) => navigate(`/vendors/${row.id}`)}
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
      onClose={() => { setFormOpen(false); setEditing(null); }}
      resetKey={editing?.id ?? 'create'}
      title={editing ? 'Edit Vendor' : 'Add Vendor'}
      description={editing ? 'Update vendor details' : 'Create a vendor partner record'}
      sections={[
        { title: 'Business Details', fields: VENDOR_FIELDS },
        { title: 'Business Address', fields: VENDOR_ADDRESS_FIELDS },
        { title: 'Account', fields: VENDOR_STATUS_FIELDS },
      ]}
      initialValues={
        editing
          ? {
              businessName: editing.businessName,
              ownerName: editing.ownerName,
              email: editing.email,
              phone: editing.phone,
              city: editing.city,
              status: editing.status,
            }
          : { status: 'PENDING', state: 'Odisha', vendorType: 'towing_company' }
      }
      onSubmit={async (values) => {
        const payload = {
          businessName: values.businessName,
          ownerName: values.ownerName,
          email: values.email || undefined,
          phone: values.phone,
          vendorType: values.vendorType || undefined,
          city: values.city,
          state: values.state || undefined,
          addressLine: values.addressLine || undefined,
          pincode: values.pincode || undefined,
          status: values.status as VendorListItem['status'],
        };
        if (editing) {
          await update.mutateAsync({ id: editing.id, data: payload });
        } else {
          await create.mutateAsync(payload);
          setActiveTab(values.status === 'APPROVED' ? 'APPROVED' : 'PENDING');
          setPage(1);
        }
        setFormOpen(false);
        setEditing(null);
      }}
      loading={create.isPending || update.isPending}
    />

    <ConfirmDialog
      open={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      title="Delete Vendor"
      message={`Delete ${deleteTarget?.businessName}?`}
      onConfirm={async () => {
        if (!deleteTarget) return;
        try {
          await remove.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
        } catch (error) {
          alert(error instanceof Error ? error.message : 'Failed to delete vendor');
        }
      }}
      loading={remove.isPending}
    />
    </>
  );
}
