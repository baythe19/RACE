import type { ColumnDef } from '@tanstack/react-table';
import { Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { DriverListItem } from '@race/types';
import { cn } from '@race/utils';
import { Card, CardContent, ErrorState, LoadingState, StatusBadge } from '@race/ui';

import { ConfirmDialog } from '@/components/shared/modal';
import { DataTable } from '@/components/shared/data-table';
import { EntityFormModal } from '@/components/shared/entity-form-modal';
import { ListToolbar } from '@/components/shared/list-toolbar';
import { Pagination } from '@/components/shared/pagination';
import { RowActionsMenu } from '@/components/shared/row-actions-menu';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useDriverMutations } from '@/hooks/use-driver-mutations';
import { useDrivers } from '@/hooks/use-drivers';

const TABS = [
  { key: 'ALL', label: 'All Drivers' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
] as const;

export function DriverList() {
  const navigate = useNavigate();
  const {
    data,
    counts,
    isLoading,
    isError,
    refetch,
    search,
    setSearch,
    vendorId,
    setVendorId,
    city,
    setCity,
    setPage,
    pageSize,
    cities,
    vendors,
    activeTab,
    setActiveTab,
    verification,
    setVerification,
  } = useDrivers();

  const { create, update, remove } = useDriverMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DriverListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriverListItem | null>(null);

  const driverSections = useMemo(
    () => [
      {
        title: 'Personal Details',
        fields: [
          { name: 'name', label: 'Driver Name', required: true, placeholder: 'Enter driver full name' },
          { name: 'phone', label: 'Phone', type: 'tel' as const, required: true, placeholder: 'Enter 10-digit mobile number' },
          { name: 'email', label: 'Email', type: 'email' as const, placeholder: 'Enter email address' },
          {
            name: 'experienceYears',
            label: 'Driving Experience (years)',
            type: 'number' as const,
            placeholder: 'e.g. 5',
          },
        ],
      },
      {
        title: 'Licence & Work',
        fields: [
          { name: 'licenseNo', label: 'Driving Licence No.', required: true, placeholder: 'e.g. OD-0220190012345' },
          {
            name: 'driverType',
            label: 'Driver Type',
            type: 'select' as const,
            required: true,
            placeholder: 'Select driver type',
            options: [
              { label: 'Tow Driver', value: 'Tow Driver' },
              { label: 'Full-Time', value: 'Full-Time' },
              { label: 'Part-Time', value: 'Part-Time' },
              { label: 'Roadside Assist', value: 'Roadside Assist' },
            ],
          },
          {
            name: 'vendorId',
            label: 'Vendor (Fleet)',
            type: 'select' as const,
            required: true,
            placeholder: 'Select vendor',
            options: vendors.map((v) => ({ label: v.name, value: v.id })),
          },
          { name: 'vehicleRegistration', label: 'Vehicle Registration No.', placeholder: 'e.g. OD-02-TOW-1001' },
          { name: 'city', label: 'Operating City', required: true, placeholder: 'Enter city name' },
        ],
      },
      {
        title: 'Emergency Contact',
        description: 'Optional — recommended for drivers on duty.',
        fields: [
          { name: 'emergencyContactName', label: 'Contact Name', placeholder: "Contact person's name" },
          { name: 'emergencyContactPhone', label: 'Contact Phone', type: 'tel' as const, placeholder: '10-digit mobile number' },
          { name: 'emergencyContactRelation', label: 'Relationship', placeholder: 'e.g. Father, Spouse' },
        ],
      },
      {
        title: 'Account',
        fields: [
          {
            name: 'status',
            label: 'Status',
            type: 'select' as const,
            placeholder: 'Select status',
            options: [
              { label: 'Pending', value: 'PENDING' },
              { label: 'Approved', value: 'APPROVED (requires verified documents)' },
              { label: 'Rejected', value: 'REJECTED' },
              { label: 'Suspended', value: 'SUSPENDED' },
            ],
          },
        ],
      },
    ],
    [vendors],
  );

  const columns = useMemo<ColumnDef<DriverListItem, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Driver Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <UserAvatar name={row.original.name} size="sm" />
            <div>
              <p className="font-medium">{row.original.name}</p>
              <p className="text-xs text-muted">{row.original.driverType}</p>
            </div>
          </div>
        ),
      },
      { accessorKey: 'phone', header: 'Phone' },
      { accessorKey: 'vendorName', header: 'Vendor' },
      { accessorKey: 'vehicleRegistration', header: 'Vehicle' },
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
            onView={() => navigate(`/drivers/${row.original.id}`)}
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

  if (isLoading && !data) return <LoadingState message="Loading drivers..." />;
  if (isError) return <ErrorState message="Failed to load drivers" onRetry={() => void refetch()} />;

  const tabCounts: Record<string, number> = {
    ALL: counts?.all ?? 0,
    PENDING: counts?.pending ?? 0,
    APPROVED: counts?.approved ?? 0,
    REJECTED: counts?.rejected ?? 0,
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
                'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
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
            searchPlaceholder="Search by name, mobile or license no..."
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
                id: 'vendor',
                label: 'Vendor',
                value: vendorId,
                onChange: setVendorId,
                options: [
                  { label: 'All Vendors', value: 'ALL' },
                  ...vendors.map((v) => ({ label: v.name, value: v.id })),
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
            onAdd={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            addLabel="Add Driver"
          />
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            emptyMessage="No drivers found"
            onRowClick={(row) => navigate(`/drivers/${row.id}`)}
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
        title={editing ? 'Edit Driver' : 'Add Driver'}
        description={editing ? 'Update driver details' : 'Create a driver under a vendor fleet'}
        sections={driverSections}
        initialValues={
          editing
            ? {
                name: editing.name,
                phone: editing.phone,
                licenseNo: editing.licenseNo,
                driverType: editing.driverType,
                vendorId: editing.vendorId,
                city: editing.city,
                status: editing.status,
              }
            : {
                status: 'PENDING',
                driverType: 'Tow Driver',
                vendorId: vendors[0]?.id ?? '',
                city: cities[0] ?? '',
              }
        }
        onSubmit={async (values) => {
          const payload = {
            name: values.name,
            phone: values.phone,
            email: values.email || undefined,
            licenseNo: values.licenseNo,
            driverType: values.driverType,
            vendorId: values.vendorId,
            city: values.city,
            vehicleRegistration: values.vehicleRegistration || undefined,
            experienceYears: values.experienceYears || undefined,
            emergencyContactName: values.emergencyContactName || undefined,
            emergencyContactPhone: values.emergencyContactPhone || undefined,
            emergencyContactRelation: values.emergencyContactRelation || undefined,
            status: values.status as DriverListItem['status'],
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
        title="Delete Driver"
        message={`Delete ${deleteTarget?.name}?`}
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
