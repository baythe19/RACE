/** UI status for track/list when backend masks ASSIGNED → PENDING but accept is pending. */
export function resolveCustomerTrackStatus(params: {
  status: string;
  awaitingPartnerAccept?: boolean;
  internalStatus?: string;
  driverAccepted?: boolean;
}): string {
  if (params.awaitingPartnerAccept) {
    return 'DRIVER_ASSIGNED';
  }
  const internal = params.internalStatus?.toUpperCase();
  if (internal === 'DRIVER_ASSIGNED' && params.driverAccepted === false) {
    return 'DRIVER_ASSIGNED';
  }
  return params.status;
}

export function customerUnifiedStatusFromApi(item: {
  status: string;
  awaitingPartnerAccept?: boolean;
}): string {
  return item.awaitingPartnerAccept ? 'DRIVER_ASSIGNED' : item.status;
}
