import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { CustomerListItem } from '@race/types';
import { formatDate } from '@race/utils';
import { Card, CardContent, ErrorState, LoadingState, StatusBadge } from '@race/ui';

import { ConfirmDialog } from '@/components/shared/modal';
import { DataTable } from '@/components/shared/data-table';
import { EntityFormModal } from '@/components/shared/entity-form-modal';
import { ListToolbar } from '@/components/shared/list-toolbar';
import { Pagination } from '@/components/shared/pagination';
import { RowActionsMenu } from '@/components/shared/row-actions-menu';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useCustomerMutations } from '@/hooks/use-customer-mutations';
import { useCustomers } from '@/hooks/use-customers';

const CUSTOMER_FIELDS = [
  { name: 'name', label: 'Full Name', required: true, placeholder: 'Enter customer full name' },
  { name: 'email', label: 'Email', type: 'email' as const, placeholder: 'Enter email address' },
  { name: 'phone', label: 'Phone', type: 'tel' as const, required: true, placeholder: 'Enter 10-digit mobile number' },
  { name: 'gender', label: 'Gender', type: 'select' as const, placeholder: 'Select gender', options: [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
    { label: 'Prefer not to say', value: 'prefer_not_to_say' },
  ] },
  { name: 'dateOfBirth', label: 'Date of Birth', type: 'date' as const },
];

const CUSTOMER_ADDRESS_FIELDS = [
  { name: 'addressLine', label: 'Address', placeholder: 'House / street / area' },
  { name: 'city', label: 'City', required: true, placeholder: 'Enter city name' },
  { name: 'pincode', label: 'PIN Code', placeholder: '6-digit PIN code' },
  { name: 'state', label: 'State', placeholder: 'Odisha' },
];

const CUSTOMER_STATUS_FIELDS = [
  {
    name: 'status',
    label: 'Status',
    type: 'select' as const,
    placeholder: 'Select status',
    options: [
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Suspended', value: 'SUSPENDED' },
      { label: 'Inactive', value: 'INACTIVE' },
    ],
  },
];

const CUSTOMER_EMERGENCY_FIELDS = [
  { name: 'emergencyContactName', label: 'Emergency Contact Name', placeholder: "Contact person's name" },
  { name: 'emergencyContactPhone', label: 'Emergency Contact Phone', type: 'tel' as const, placeholder: '10-digit mobile number' },
  { name: 'emergencyContactRelation', label: 'Relationship', placeholder: 'e.g. Father, Spouse, Friend' },
];

export function CustomerList() {
  const navigate = useNavigate();
  const {
    data,
    isLoading,
    isError,
    refetch,
    search,
    setSearch,
    status,
    setStatus,
    city,
    setCity,
    setPage,
    pageSize,
    cities,
    handleExport,
  } = useCustomers();

  const { create, update, remove } = useCustomerMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerListItem | null>(null);

  const columns = useMemo<ColumnDef<CustomerListItem, unknown>[]>(
    () => [
      {
        accessorKey: 'customerId',
        header: 'Customer ID',
        cell: ({ row }) => (
          <span className="font-medium text-primary">{row.original.customerId}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <UserAvatar name={row.original.name} size="sm" />
            <div>
              <p className="font-medium">{row.original.name}</p>
              <p className="text-xs text-muted">
                {row.original.city}, {row.original.state}
              </p>
            </div>
          </div>
        ),
      },
      { accessorKey: 'phone', header: 'Phone' },
      { accessorKey: 'email', header: 'Email' },
      { accessorKey: 'totalBookings', header: 'Total Bookings' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'joinedAt',
        header: 'Joined Date',
        cell: ({ row }) => <span className="text-body">{formatDate(row.original.joinedAt)}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <RowActionsMenu
            onView={() => navigate(`/customers/${row.original.id}`)}
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

  const handleFormSubmit = async (values: Record<string, string>) => {
    const payload = {
      name: values.name,
      email: values.email || undefined,
      phone: values.phone,
      city: values.city || undefined,
      state: values.state || undefined,
      addressLine: values.addressLine || undefined,
      pincode: values.pincode || undefined,
      gender: values.gender || undefined,
      dateOfBirth: values.dateOfBirth || undefined,
      emergencyContactName: values.emergencyContactName || undefined,
      emergencyContactPhone: values.emergencyContactPhone || undefined,
      emergencyContactRelation: values.emergencyContactRelation || undefined,
      status: values.status as CustomerListItem['status'],
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    setFormOpen(false);
    setEditing(null);
  };

  if (isLoading && !data) return <LoadingState message="Loading customers..." />;
  if (isError) return <ErrorState message="Failed to load customers" onRetry={() => void refetch()} />;

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by name, mobile or email..."
            filters={[
              {
                id: 'status',
                label: 'Status',
                value: status,
                onChange: setStatus,
                options: [
                  { label: 'All Status', value: 'ALL' },
                  { label: 'Active', value: 'ACTIVE' },
                  { label: 'Suspended', value: 'SUSPENDED' },
                  { label: 'Inactive', value: 'INACTIVE' },
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
            onAdd={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            addLabel="Add Customer"
          />
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            emptyMessage="No customers found"
            onRowClick={(row) => navigate(`/customers/${row.id}`)}
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
        title={editing ? 'Edit Customer' : 'Add Customer'}
        description={editing ? 'Update customer details' : 'Create a new customer record'}
        sections={[
          { title: 'Personal Details', fields: CUSTOMER_FIELDS },
          { title: 'Address', description: 'Used for service location defaults.', fields: CUSTOMER_ADDRESS_FIELDS },
          {
            title: 'Emergency Contact',
            description: 'Optional — recommended for safety.',
            fields: CUSTOMER_EMERGENCY_FIELDS,
          },
          { title: 'Account', fields: CUSTOMER_STATUS_FIELDS },
        ]}
        initialValues={
          editing
            ? {
                name: editing.name,
                email: editing.email,
                phone: editing.phone,
                city: editing.city,
                status: editing.status,
              }
            : { status: 'ACTIVE', state: 'Odisha' }
        }
        onSubmit={handleFormSubmit}
        loading={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Customer"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
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
