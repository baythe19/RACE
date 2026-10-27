import type { ColumnDef } from '@tanstack/react-table';
import {
  Car,
  ClipboardList,
  IndianRupee,
  Loader2,
  MapPin,
  Phone,
  Star,
  Truck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import type {
  VendorAssignedDriver,
  VendorBookingRow,
  VendorDetail,
  VendorDocument,
  VendorVehicle,
} from '@race/types';
import { Permission } from '@race/types';
import { formatCurrency, formatDate } from '@race/utils';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  LoadingState,
  StatusBadge,
} from '@race/ui';

import { ActivityTimeline } from '@/components/shared/activity-timeline';
import { DataTable } from '@/components/shared/data-table';
import { EntityFormModal } from '@/components/shared/entity-form-modal';
import { ConfirmDialog } from '@/components/shared/modal';
import { Modal } from '@/components/shared/modal';
import { RowActionsMenu } from '@/components/shared/row-actions-menu';
import { VerificationDocumentsCard } from '@/components/shared/verification-documents-card';
import { VendorAvatar } from '@/components/shared/user-avatar';
import { downloadDocument, openDocument } from '@/lib/document-actions';
import { getApiErrorMessage, getDrivers } from '@race/api';
import { PermissionGuard } from '@/components/guards/permission-guard';
import { PageHeader } from '@/components/layout/page-header';
import { useVendorActions, useVendorDetail, useVendorDocumentReview, useVendorDriverAssignmentMutations, useVendorVehicleMutations } from '@/hooks/use-vendor-detail';
import { useAuthStore } from '@/stores/auth.store';

const STAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Truck,
  ClipboardList,
  IndianRupee,
  Star,
  Car,
};

function VendorProfileCard({
  vendor,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  vendor: VendorDetail;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="h-24 bg-gradient-to-r from-[#1A1A2E] via-[#2D2D44] to-primary/30" />
      <CardContent className="relative px-6 pb-6 pt-0">
        <div className="-mt-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex gap-5">
            <VendorAvatar name={vendor.businessName} size="xl" className="ring-4 ring-white" />
            <div className="pt-12 lg:pt-10">
              <h2 className="text-xl font-bold text-heading">{vendor.businessName}</h2>
              <p className="mt-1 text-sm text-body">{vendor.ownerName}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={vendor.status} />
                <StatusBadge status={vendor.verificationStatus} />
              </div>
            </div>
          </div>

          {vendor.status === 'PENDING' ||
          (vendor.verificationStatus === 'PENDING' && vendor.status !== 'REJECTED') ? (
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                className="border-error/30 text-error hover:bg-[#FEF2F2]"
                onClick={onReject}
                disabled={isRejecting || isApproving}
              >
                {isRejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Reject
              </Button>
              <Button onClick={onApprove} disabled={isApproving || isRejecting}>
                {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Approve
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 text-sm text-body sm:col-span-2">
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-muted" />
              {vendor.address}
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-muted" />
              {vendor.phone} · {vendor.email}
            </p>
            <p>Joined {formatDate(vendor.joinedAt)}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span className="font-semibold text-heading">{vendor.rating}</span>
            <span className="text-sm text-muted">({vendor.reviewCount} reviews)</span>
          </div>
          <div>
            <span className="font-semibold text-heading">{vendor.totalBookings}</span>
            <span className="text-sm text-muted"> Bookings served</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickStats({ stats }: { stats: VendorDetail['quickStats'] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = STAT_ICONS[stat.icon] ?? Truck;
        return (
          <Card key={stat.id}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F5A623]/15">
                <Icon className="h-5 w-5 text-[#F5A623]" />
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF]">{stat.label}</p>
                <p className="text-lg font-bold text-[#1A1A2E]">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

const VEHICLE_FIELDS = [
  { name: 'registrationNo', label: 'Registration No.', required: true, placeholder: 'e.g. OD05 AB 1234' },
  { name: 'type', label: 'Vehicle Type', required: true, placeholder: 'e.g. Tow Truck, Flatbed' },
  { name: 'model', label: 'Model', required: true, placeholder: 'e.g. Tata 407' },
  { name: 'year', label: 'Year', type: 'number' as const, placeholder: 'e.g. 2022' },
  {
    name: 'status',
    label: 'Status',
    type: 'select' as const,
    placeholder: 'Select vehicle status',
    options: [
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Under Maintenance', value: 'UNDER_MAINTENANCE' },
      { label: 'Inactive', value: 'INACTIVE' },
    ],
  },
];

const VEHICLE_EDIT_FIELDS = [
  { name: 'type', label: 'Vehicle Type', required: true, placeholder: 'e.g. Tow Truck, Flatbed' },
  { name: 'model', label: 'Model', required: true, placeholder: 'e.g. Tata 407' },
  { name: 'year', label: 'Year', type: 'number' as const, placeholder: 'e.g. 2022' },
  {
    name: 'status',
    label: 'Status',
    type: 'select' as const,
    placeholder: 'Select vehicle status',
    options: [
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Under Maintenance', value: 'UNDER_MAINTENANCE' },
      { label: 'Inactive', value: 'INACTIVE' },
    ],
  },
];

const bookingColumns: ColumnDef<VendorBookingRow, unknown>[] = [
  {
    accessorKey: 'bookingNumber',
    header: 'Booking ID',
    cell: ({ row }) => (
      <span className="font-medium text-[#F5A623]">#{row.original.bookingNumber}</span>
    ),
  },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'service', header: 'Service' },
  { accessorKey: 'driverName', header: 'Driver' },
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
  { accessorKey: 'date', header: 'Date' },
];

function VendorInfoCard({ vendor }: { vendor: VendorDetail }) {
  const fields = [
    { label: 'Business Type', value: vendor.businessType },
    { label: 'GST Number', value: vendor.gstNumber },
    { label: 'PAN Number', value: vendor.panNumber },
    { label: 'Bank Name', value: vendor.bankName },
    { label: 'Account Number', value: vendor.accountNumber },
    { label: 'IFSC Code', value: vendor.ifscCode },
    { label: 'Service Areas', value: (vendor.serviceAreas ?? []).filter(Boolean).join(', ') || 'Bhubaneswar, Odisha' },
    { label: 'Working Hours', value: vendor.workingHours },
    { label: 'Drivers Assigned', value: String(vendor.driverCount) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Information</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-4">
          {fields.map((f) => (
            <div key={f.label} className="flex justify-between gap-4 border-b border-[#F4F5F7] pb-3 last:border-0">
              <dt className="text-sm text-[#9CA3AF]">{f.label}</dt>
              <dd className="text-right text-sm font-medium text-[#1A1A2E]">{f.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function DriverListCard({
  title,
  description,
  drivers,
  actionLabel,
  onAction,
  onRemove,
  removingId,
  readOnly = false,
}: {
  title: string;
  description?: string;
  drivers: VendorAssignedDriver[];
  actionLabel?: string;
  onAction?: () => void;
  onRemove?: (driverId: string, driverName: string) => void;
  removingId?: string | null;
  readOnly?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <p className="mt-1 text-xs text-[#9CA3AF]">{description}</p> : null}
        </div>
        {!readOnly && actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="text-sm font-medium text-[#F5A623] hover:underline">
            {actionLabel}
          </button>
        ) : null}
      </CardHeader>
      <CardContent>
        {drivers.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">—</p>
        ) : (
          <ul className="space-y-3">
            {drivers.map((driver) => (
              <li key={driver.id} className="flex items-center justify-between gap-3">
                <Link to={`/drivers/${driver.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DBEAFE] text-xs font-semibold text-[#2563EB]">
                    {driver.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1A1A2E]">{driver.name}</p>
                    <p className="text-xs text-[#9CA3AF]">{driver.phone}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <StatusBadge status={driver.status} />
                  {onRemove ? (
                    <button
                      type="button"
                      onClick={() => onRemove(driver.id, driver.name)}
                      disabled={removingId === driver.id}
                      className="text-xs font-medium text-[#DC2626] hover:underline disabled:opacity-50">
                      {removingId === driver.id ? '…' : 'Remove'}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function VendorDetailContent({ vendorId }: { vendorId: string }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: vendor, isLoading, isError, refetch } = useVendorDetail(vendorId);
  const { approve, reject } = useVendorActions(vendorId);
  const reviewDocument = useVendorDocumentReview(vendorId);
  const { createVehicle, updateVehicle, removeVehicle } = useVendorVehicleMutations(vendorId);
  const { assignDrivers, unassignDriver } = useVendorDriverAssignmentMutations(vendorId);
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null);
  const [documentActionError, setDocumentActionError] = useState<string | null>(null);
  const [assignDriverOpen, setAssignDriverOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [removingDriverId, setRemovingDriverId] = useState<string | null>(null);

  const platformDriversQuery = useQuery({
    queryKey: ['platform-drivers-for-assign'],
    queryFn: () => getDrivers({ page: 1, pageSize: 500, status: 'APPROVED' }),
    enabled: assignDriverOpen,
  });

  const assignableDrivers = useMemo(() => {
    const assignedIds = new Set((vendor?.assignedDrivers ?? []).map((d) => d.id));
    return (platformDriversQuery.data?.items ?? []).filter((d) => !assignedIds.has(d.id));
  }, [platformDriversQuery.data?.items, vendor?.assignedDrivers]);

  const getVendorDocKey = (doc: VendorDocument) => {
    if (doc.key) return doc.key;
    const prefix = `${vendorId}-`;
    return doc.id.startsWith(prefix) ? doc.id.slice(prefix.length) : doc.id;
  };

  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VendorVehicle | null>(null);
  const [deleteVehicleTarget, setDeleteVehicleTarget] = useState<VendorVehicle | null>(null);

  const handleOpenDocument = async (doc: VendorDocument) => {
    if (!doc.url) return;
    setDocumentActionError(null);
    const preview = window.open('', '_blank');
    try {
      await openDocument(doc.url, doc.name, preview);
    } catch (error) {
      preview?.close();
      setDocumentActionError(getApiErrorMessage(error, 'Failed to open document'));
    }
  };

  const handleDownloadDocument = async (doc: VendorDocument) => {
    if (!doc.url) return;
    setDocumentActionError(null);
    try {
      await downloadDocument(doc.url, doc.name);
    } catch (error) {
      setDocumentActionError(getApiErrorMessage(error, 'Failed to download document'));
    }
  };

  const handleReviewDocument = async (doc: VendorDocument, status: 'VERIFIED' | 'REJECTED') => {
    setReviewingDocId(doc.id);
    setDocumentActionError(null);
    try {
      await reviewDocument.mutateAsync({ docKey: getVendorDocKey(doc), status });
    } catch (error) {
      setDocumentActionError(getApiErrorMessage(error, 'Failed to update document status'));
    } finally {
      setReviewingDocId(null);
    }
  };

  const vehicleColumns = useMemo<ColumnDef<VendorVehicle, unknown>[]>(
    () => [
      { accessorKey: 'registrationNo', header: 'Vehicle No.' },
      { accessorKey: 'type', header: 'Type' },
      { accessorKey: 'model', header: 'Model' },
      { accessorKey: 'year', header: 'Year' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <RowActionsMenu
            onEdit={() => {
              setEditingVehicle(row.original);
              setVehicleFormOpen(true);
            }}
            onDelete={() => setDeleteVehicleTarget(row.original)}
          />
        ),
      },
    ],
    [],
  );

  if (isLoading) return <LoadingState message="Loading vendor..." />;
  if (isError || !vendor) {
    return <ErrorState message="Vendor not found" onRetry={() => void refetch()} />;
  }

  return (
    <PermissionGuard permission={Permission.VENDORS_VIEW} permissions={user?.permissions}>
      <PageHeader
        title="Vendor Details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Vendor Management', href: '/vendors' },
          { label: vendor.businessName },
        ]}
        actions={
          <Link
            to="/vendors"
            className="text-sm font-medium text-[#F5A623] hover:underline"
          >
            ← Back to Vendors
          </Link>
        }
      />

      <div className="space-y-6">
        <VendorProfileCard
          vendor={vendor}
          onApprove={() =>
            approve.mutate(undefined, {
              onSuccess: () => navigate('/vendors?status=APPROVED'),
            })
          }
          onReject={() =>
            reject.mutate(undefined, {
              onSuccess: () => navigate('/vendors?status=REJECTED'),
            })
          }
          isApproving={approve.isPending}
          isRejecting={reject.isPending}
        />

        <VerificationDocumentsCard
          verificationStatus={vendor.verificationStatus}
          documentsStatus={vendor.documentsStatus}
          verificationStageLabel={vendor.verificationStageLabel}
          reviewNotes={vendor.reviewNotes}
          documents={vendor.documents}
          onOpenDocument={handleOpenDocument}
          onDownloadDocument={handleDownloadDocument}
          onVerifyDocument={(doc) => handleReviewDocument(doc, 'VERIFIED')}
          onRejectDocument={(doc) => handleReviewDocument(doc, 'REJECTED')}
          reviewingDocumentId={reviewingDocId}
          actionError={documentActionError}
        />

        <QuickStats stats={vendor.quickStats ?? []} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Vehicles Owned</CardTitle>
                <Button
                  size="sm"
                  type="button"
                  onClick={() => {
                    setEditingVehicle(null);
                    setVehicleFormOpen(true);
                  }}
                >
                  + Add Vehicle
                </Button>
              </CardHeader>
              <CardContent className="p-0 pb-2">
                <DataTable
                  columns={vehicleColumns}
                  data={vendor.vehicles ?? []}
                  emptyMessage="No vehicles"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Bookings</CardTitle>
                <button type="button" className="text-sm font-medium text-[#F5A623] hover:underline">
                  View All
                </button>
              </CardHeader>
              <CardContent className="p-0 pb-2">
                <DataTable
                  columns={bookingColumns}
                  data={vendor.recentBookings ?? []}
                  emptyMessage="No bookings"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <VendorInfoCard vendor={vendor} />
            <DriverListCard
              title="Assigned Drivers"
              drivers={vendor.assignedDrivers ?? []}
              actionLabel="Manage"
              onAction={() => setAssignDriverOpen(true)}
              onRemove={(driverId, driverName) => {
                if (!window.confirm(`Unassign ${driverName} from this vendor?`)) return;
                setRemovingDriverId(driverId);
                void unassignDriver.mutateAsync(driverId).finally(() => setRemovingDriverId(null));
              }}
              removingId={removingDriverId}
            />
            <DriverListCard
              title="My Drivers"
              drivers={vendor.myDrivers ?? []}
              readOnly
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline items={vendor.activities ?? []} />
          </CardContent>
        </Card>
      </div>

      <Modal
        open={assignDriverOpen}
        onClose={() => {
          setAssignDriverOpen(false);
          setSelectedDriverId('');
        }}
        title="Assign driver"
        description="Pick an approved platform driver to assign to this vendor."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setAssignDriverOpen(false);
                setSelectedDriverId('');
              }}>
              Cancel
            </Button>
            <Button
              disabled={!selectedDriverId || assignDrivers.isPending}
              onClick={() => {
                void assignDrivers
                  .mutateAsync([selectedDriverId])
                  .then(() => {
                    setAssignDriverOpen(false);
                    setSelectedDriverId('');
                  });
              }}>
              {assignDrivers.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </>
        }>
        {platformDriversQuery.isLoading ? (
          <p className="text-sm text-[#9CA3AF]">Loading drivers...</p>
        ) : assignableDrivers.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">No approved drivers available to assign.</p>
        ) : (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[#1A1A2E]">Driver</span>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm">
              <option value="">Select driver</option>
              {assignableDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} · {driver.phone}
                  {driver.vendorId ? ` (currently: ${driver.vendorName})` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </Modal>

      <EntityFormModal
        open={vehicleFormOpen}
        onClose={() => {
          setVehicleFormOpen(false);
          setEditingVehicle(null);
        }}
        resetKey={editingVehicle?.id ?? 'create'}
        title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
        description={
          editingVehicle
            ? `Update ${editingVehicle.registrationNo}`
            : `Add a vehicle to ${vendor.businessName}`
        }
        fields={editingVehicle ? VEHICLE_EDIT_FIELDS : VEHICLE_FIELDS}
        initialValues={
          editingVehicle
            ? {
                type: editingVehicle.type,
                model: editingVehicle.model,
                year: String(editingVehicle.year ?? ''),
                status: editingVehicle.status,
              }
            : { status: 'ACTIVE' }
        }
        onSubmit={async (values) => {
          if (editingVehicle) {
            await updateVehicle.mutateAsync({
              vehicleId: editingVehicle.id,
              input: {
                type: values.type.trim(),
                model: values.model.trim(),
                year: values.year ? Number(values.year) : undefined,
                status: values.status || 'ACTIVE',
              },
            });
          } else {
            await createVehicle.mutateAsync({
              registrationNo: values.registrationNo.trim(),
              type: values.type.trim(),
              model: values.model.trim(),
              year: values.year ? Number(values.year) : undefined,
              status: values.status || 'ACTIVE',
            });
          }
          setVehicleFormOpen(false);
          setEditingVehicle(null);
        }}
        loading={createVehicle.isPending || updateVehicle.isPending}
      />

      <ConfirmDialog
        open={!!deleteVehicleTarget}
        onClose={() => setDeleteVehicleTarget(null)}
        title="Delete Vehicle"
        message={`Remove ${deleteVehicleTarget?.registrationNo} from this vendor?`}
        onConfirm={async () => {
          if (deleteVehicleTarget) {
            await removeVehicle.mutateAsync(deleteVehicleTarget.id);
            setDeleteVehicleTarget(null);
          }
        }}
        loading={removeVehicle.isPending}
      />
    </PermissionGuard>
  );
}
