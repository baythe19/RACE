import type { UnifiedBookingStatus } from './bookingStatusConstants';

/** Customer + admin list: searching / not accepted yet → pending (Ola/Uber style). */
export function mapPublicBookingStatus(status: string): string {
  if (status === 'DRIVER_ASSIGNED' || status === 'CONFIRMED') {
    return 'PENDING';
  }
  return status;
}

/** Driver details visible to customer only after accept (en route or later). */
export function isDriverVisibleToCustomer(status: string): boolean {
  return (
    status === 'DRIVER_EN_ROUTE' ||
    status === 'DRIVER_ARRIVED' ||
    status === 'IN_PROGRESS' ||
    status === 'COMPLETED' ||
    status === 'RATED'
  );
}

export function mapPublicBookingStatusForHistory(
  status: string,
): UnifiedBookingStatus | string {
  return mapPublicBookingStatus(status);
}

/** Partner allotted but has not accepted yet — safe to expose without PII. */
export function isAwaitingPartnerAccept(internalStatus: string): boolean {
  return internalStatus === 'DRIVER_ASSIGNED';
}

/** Customer API/list/tracking: mask status, hide driver until en route, flag accept window. */
export function applyCustomerBookingView<
  T extends {
    status: string;
    driver?: unknown;
    driverId?: string;
    statusHistory?: Array<{ status: string; timestamp: string; note?: string }>;
  },
>(dto: T, internalStatus: string): T & { awaitingPartnerAccept: boolean } {
  const awaitingPartnerAccept = isAwaitingPartnerAccept(internalStatus);
  const driverVisible = isDriverVisibleToCustomer(internalStatus);
  return {
    ...dto,
    status: mapPublicBookingStatus(internalStatus),
    awaitingPartnerAccept,
    driver: driverVisible ? dto.driver : undefined,
    driverId: driverVisible ? dto.driverId : undefined,
    statusHistory: dto.statusHistory?.map((entry) => ({
      ...entry,
      status: mapPublicBookingStatus(entry.status),
    })),
  };
}
