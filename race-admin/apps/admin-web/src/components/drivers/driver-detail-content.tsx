import type { ColumnDef } from '@tanstack/react-table';
import { Loader2, Star } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type {
  CustomerBookingHistoryItem,
  DriverDetail,
  DriverDocument,
  DriverReview,
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
import { VerificationDocumentsCard } from '@/components/shared/verification-documents-card';
import { UserAvatar } from '@/components/shared/user-avatar';
import { downloadDocument, openDocument } from '@/lib/document-actions';
import { getApiErrorMessage } from '@race/api';
import { PermissionGuard } from '@/components/guards/permission-guard';
import { PageHeader } from '@/components/layout/page-header';
import { useDriverActions, useDriverDetail, useDriverDocumentReview } from '@/hooks/use-driver-detail';
import { useAuthStore } from '@/stores/auth.store';

function DriverProfileCard({
  driver,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  driver: DriverDetail;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const showApprovalActions =
    driver.status === 'PENDING' ||
    (driver.verificationStatus === 'PENDING' && driver.status !== 'REJECTED');

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <UserAvatar name={driver.name} size="lg" className="h-16 w-16 text-lg" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-[#1A1A2E]">{driver.name}</h2>
              <StatusBadge status={driver.status} />
              <StatusBadge status={driver.verificationStatus} />
            </div>
            <p className="mt-1 text-sm text-[#555555]">{driver.driverType}</p>
            <div className="mt-3 grid gap-2 text-sm text-[#555555] sm:grid-cols-2 lg:grid-cols-4">
              <p>{driver.phone}</p>
              <p>{driver.email}</p>
              <p>
                <Link to={`/vendors/${driver.vendorId}`} className="text-[#F5A623] hover:underline">
                  {driver.vendorName}
                </Link>
              </p>
              <p>{driver.city}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-center">
            <Star className="h-5 w-5 fill-[#F5A623] text-[#F5A623]" />
            <div>
              <p className="text-2xl font-bold text-[#1A1A2E]">{driver.rating}</p>
              <p className="text-xs text-[#9CA3AF]">{driver.reviewCount} reviews</p>
            </div>
          </div>

          {showApprovalActions ? (
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
      </CardContent>
    </Card>
  );
}

function LicenseDetailsCard({ driver }: { driver: DriverDetail }) {
  const fields = [
    { label: 'License Number', value: driver.licenseNo },
    { label: 'License Class', value: driver.licenseClass },
    { label: 'Expiry Date', value: formatDate(driver.licenseExpiry) },
    { label: 'Aadhaar', value: driver.aadhaarMasked },
    { label: 'Address', value: driver.address },
    { label: 'Joined', value: formatDate(driver.joinedAt) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>License Details</CardTitle>
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

function AssignedVehicleCard({ driver }: { driver: DriverDetail }) {
  const v = driver.assignedVehicle ?? {
    registrationNo: driver.vehicleRegistration ?? '—',
    type: driver.driverType,
    model: '—',
    year: new Date().getFullYear(),
    status: 'ACTIVE',
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned Vehicle</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Registration', value: v.registrationNo },
            { label: 'Type', value: v.type },
            { label: 'Model', value: v.model },
            { label: 'Year', value: String(v.year) },
            { label: 'Status', value: <StatusBadge status={v.status} /> },
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

const bookingColumns: ColumnDef<CustomerBookingHistoryItem, unknown>[] = [
  {
    accessorKey: 'bookingNumber',
    header: 'Booking ID',
    cell: ({ row }) => (
      <span className="font-medium text-[#F5A623]">#{row.original.bookingNumber}</span>
    ),
  },
  { accessorKey: 'service', header: 'Service' },
  {
    accessorKey: 'customerName',
    header: 'Customer',
    cell: ({ row }) => row.original.customerName ?? '—',
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

function ReviewsSection({ reviews }: { reviews: DriverReview[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ratings & Reviews</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-lg border border-[#F4F5F7] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-[#1A1A2E]">{review.customerName}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#F5A623]">
                  <Star className="h-3.5 w-3.5 fill-[#F5A623]" />
                  {review.rating}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#555555]">{review.comment}</p>
              <p className="mt-2 text-xs text-[#9CA3AF]">{formatDate(review.date)}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function DriverDetailContent({ driverId }: { driverId: string }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: driver, isLoading, isError, refetch } = useDriverDetail(driverId);
  const { approve, reject } = useDriverActions(driverId);
  const reviewDocument = useDriverDocumentReview(driverId);
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null);
  const [documentActionError, setDocumentActionError] = useState<string | null>(null);

  const handleOpenDocument = async (doc: DriverDocument) => {
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

  const handleDownloadDocument = async (doc: DriverDocument) => {
    if (!doc.url) return;
    setDocumentActionError(null);
    try {
      await downloadDocument(doc.url, doc.name);
    } catch (error) {
      setDocumentActionError(getApiErrorMessage(error, 'Failed to download document'));
    }
  };

  const handleReviewDocument = async (doc: DriverDocument, status: 'VERIFIED' | 'REJECTED') => {
    setReviewingDocId(doc.id);
    setDocumentActionError(null);
    try {
      await reviewDocument.mutateAsync({ documentId: doc.id, status });
    } catch (error) {
      setDocumentActionError(getApiErrorMessage(error, 'Failed to update document status'));
    } finally {
      setReviewingDocId(null);
    }
  };

  if (isLoading) return <LoadingState message="Loading driver..." />;
  if (isError || !driver) {
    return <ErrorState message="Driver not found" onRetry={() => void refetch()} />;
  }

  return (
    <PermissionGuard permission={Permission.DRIVERS_VIEW} permissions={user?.permissions}>
      <PageHeader
        title="Driver Details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Drivers', href: '/drivers' },
          { label: driver.name },
        ]}
        actions={
          <Link to="/drivers" className="text-sm font-medium text-[#F5A623] hover:underline">
            ← Back to Drivers
          </Link>
        }
      />

      <div className="space-y-6">
        <DriverProfileCard
          driver={driver}
          onApprove={() => approve.mutate()}
          onReject={() => reject.mutate()}
          isApproving={approve.isPending}
          isRejecting={reject.isPending}
        />

        <VerificationDocumentsCard
          verificationStatus={driver.verificationStatus}
          documentsStatus={driver.documentsStatus}
          documents={driver.documents ?? []}
          onOpenDocument={handleOpenDocument}
          onDownloadDocument={handleDownloadDocument}
          onVerifyDocument={(doc) => handleReviewDocument(doc, 'VERIFIED')}
          onRejectDocument={(doc) => handleReviewDocument(doc, 'REJECTED')}
          reviewingDocumentId={reviewingDocId}
          actionError={documentActionError}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <LicenseDetailsCard driver={driver} />
          <AssignedVehicleCard driver={driver} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Booking History</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <DataTable
              columns={bookingColumns}
              data={driver.bookings ?? []}
              emptyMessage="No bookings"
              onRowClick={(row) =>
                navigate(
                  `/bookings/${row.id}${row.bookingType ? `?type=${row.bookingType}` : ''}`,
                )
              }
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ReviewsSection reviews={driver.reviews ?? []} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline items={driver.activities ?? []} />
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
