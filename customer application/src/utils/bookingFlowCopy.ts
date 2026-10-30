import type { Booking } from '../types/booking';

/**
 * Customer-facing booking channels (matches backend dispatch):
 * - Towing (TOW-*): vendor fleet / tow partners via towing pipeline
 * - Driver (DRV-*): independent & fleet drivers via driver offers
 * - Roadside on-site (RSV-*): same vendor dispatch as towing (`createRoadsideOnSiteBooking`)
 */
export type CustomerBookingKind = 'towing' | 'driver' | 'roadside';

export function inferCustomerBookingKind(booking: Pick<Booking, 'bookingType' | 'bookingNumber' | 'serviceLabel'>): CustomerBookingKind {
  if (booking.bookingType === 'driver') return 'driver';
  const num = booking.bookingNumber.toUpperCase();
  if (num.includes('RSV')) return 'roadside';
  const label = booking.serviceLabel.toLowerCase();
  if (
    /battery|tyre|tire|fuel|jump|minor repair|flat tyre|roadside|on-site assist/.test(label)
  ) {
    return 'roadside';
  }
  return 'towing';
}

export type BookingPhaseChip = 'searching' | 'assigned' | 'active' | 'done' | 'cancelled';

export function bookingPhaseChip(unifiedStatus: string): BookingPhaseChip {
  const s = unifiedStatus.toUpperCase();
  if (s === 'CANCELLED') return 'cancelled';
  if (s === 'COMPLETED' || s === 'RATED') return 'done';
  if (s === 'DRIVER_EN_ROUTE' || s === 'DRIVER_ARRIVED' || s === 'IN_PROGRESS') return 'active';
  if (s === 'DRIVER_ASSIGNED') return 'assigned';
  return 'searching';
}

export function formatCustomerBookingStatus(
  kind: CustomerBookingKind,
  unifiedStatus: string,
  hasNamedPartner: boolean,
): { statusPill: string; partnerLine: string; dispatchHint: string } {
  const s = unifiedStatus.toUpperCase();
  const chip = bookingPhaseChip(unifiedStatus);

  if (chip === 'done') {
    return {
      statusPill: 'Completed',
      partnerLine: hasNamedPartner ? 'Partner assigned' : 'Closed',
      dispatchHint: 'Rate or view receipt in booking details.',
    };
  }
  if (chip === 'cancelled') {
    return {
      statusPill: 'Cancelled',
      partnerLine: '—',
      dispatchHint: 'This request was cancelled.',
    };
  }

  if (kind === 'driver') {
    if (s === 'DRIVER_EN_ROUTE') {
      return {
        statusPill: 'Driver en route',
        partnerLine: hasNamedPartner ? 'Your driver is on the way' : 'Driver en route',
        dispatchHint: 'Share trip OTP when they arrive at pickup.',
      };
    }
    if (s === 'DRIVER_ARRIVED' || s === 'IN_PROGRESS') {
      return {
        statusPill: s === 'IN_PROGRESS' ? 'Trip in progress' : 'At pickup',
        partnerLine: hasNamedPartner ? 'Driver at pickup / on trip' : 'Driver assigned',
        dispatchHint:
          s === 'IN_PROGRESS'
            ? 'Pay balance after drop as shown in Track.'
            : 'Share OTP to start the trip.',
      };
    }
    if (s === 'DRIVER_ASSIGNED') {
      return {
        statusPill: 'Awaiting driver',
        partnerLine: hasNamedPartner ? 'Driver must accept' : 'Matching driver',
        dispatchHint: 'Sent to nearby drivers — first accept wins.',
      };
    }
    return {
      statusPill: s === 'CONFIRMED' ? 'Confirmed · finding driver' : 'Finding driver',
      partnerLine: hasNamedPartner ? 'Driver pending accept' : 'Matching driver',
      dispatchHint: 'Driver bookings go to available drivers, not tow vendors.',
    };
  }

  if (kind === 'roadside') {
    if (s === 'DRIVER_EN_ROUTE') {
      return {
        statusPill: 'Partner en route',
        partnerLine: hasNamedPartner ? 'Roadside partner on the way' : 'Partner en route',
        dispatchHint: 'On-site help — stay near your vehicle.',
      };
    }
    if (s === 'DRIVER_ARRIVED' || s === 'IN_PROGRESS') {
      return {
        statusPill: 'At your location',
        partnerLine: hasNamedPartner ? 'Partner on site' : 'Partner at location',
        dispatchHint: 'Help in progress at your breakdown spot.',
      };
    }
    if (s === 'DRIVER_ASSIGNED') {
      return {
        statusPill: 'Awaiting accept',
        partnerLine: hasNamedPartner ? 'Partner must accept' : 'Partner assigned',
        dispatchHint: 'Roadside jobs use vendor partner dispatch (same as tow network).',
      };
    }
    return {
      statusPill: s === 'CONFIRMED' ? 'Confirmed · finding partner' : 'Finding partner',
      partnerLine: hasNamedPartner ? 'Partner pending' : 'Matching roadside partner',
      dispatchHint: 'Battery, tyre & fuel jobs broadcast to vendor partners near you.',
    };
  }

  // Towing
  if (s === 'DRIVER_EN_ROUTE') {
    return {
      statusPill: 'Tow en route',
      partnerLine: hasNamedPartner ? 'Tow truck on the way' : 'En route to pickup',
      dispatchHint: 'Vendor-assigned tow — pickup then drop as booked.',
    };
  }
  if (s === 'DRIVER_ARRIVED' || s === 'IN_PROGRESS') {
    return {
      statusPill: s === 'IN_PROGRESS' ? 'Vehicle in tow' : 'At pickup',
      partnerLine: hasNamedPartner ? 'Tow partner on job' : 'Tow assigned',
      dispatchHint:
        s === 'IN_PROGRESS'
          ? 'After drop, confirm payment & completion OTP in Track.'
          : 'Share OTP when the truck arrives.',
    };
  }
  if (s === 'DRIVER_ASSIGNED') {
    return {
      statusPill: 'Awaiting tow accept',
      partnerLine: hasNamedPartner ? 'Vendor driver must accept' : 'Vendor matching',
      dispatchHint: 'Towing goes to vendor fleet — driver accepts from partner app.',
    };
  }
  return {
    statusPill: s === 'CONFIRMED' ? 'Confirmed · finding tow' : 'Finding tow vendor',
    partnerLine: hasNamedPartner ? 'Vendor pending' : 'Matching tow vendor',
    dispatchHint: 'Towing bookings route to tow vendors, not driver-hire pool.',
  };
}

/** After drop: customer sees balance + completion OTP (towing/driver with drop). Roadside ends on-site. */
export function postTripCustomerStep(kind: CustomerBookingKind, unifiedStatus: string): string | null {
  const s = unifiedStatus.toUpperCase();
  if (s !== 'IN_PROGRESS' && s !== 'DRIVER_ARRIVED') return null;
  if (kind === 'roadside') {
    return 'Partner completes work on site — pay any balance shown in Track.';
  }
  if (kind === 'driver') {
    return 'After drop: pay remaining fare and confirm trip completion in Track.';
  }
  return 'After drop at destination: pay balance & confirm completion OTP in Track.';
}

export function bookingHasNamedPartner(
  driver?: { name?: string | null } | null,
): boolean {
  const name = driver?.name?.trim();
  if (!name || name.length <= 2) return false;
  return !/finding|matching|partner/i.test(name);
}

/** Live track header + partner row before accept. */
export function trackPartnerDisplayName(
  kind: CustomerBookingKind,
  unifiedStatus: string,
  partnerPending: boolean,
  resolvedName?: string | null,
): string {
  if (!partnerPending && resolvedName?.trim()) return resolvedName.trim();
  if (!partnerPending) {
    return resolvedName?.trim() || (kind === 'driver' ? 'Your driver' : 'Partner');
  }
  return formatCustomerBookingStatus(kind, unifiedStatus, false).partnerLine;
}

export function trackLocationHint(
  kind: CustomerBookingKind,
  unifiedStatus: string,
  hasLiveLocation: boolean,
  mockPreview: boolean,
): string | null {
  if (hasLiveLocation) {
    if (kind === 'driver') return 'Driver location updating live';
    if (kind === 'roadside') return 'Partner location updating live';
    return 'Tow partner location updating live';
  }
  if (mockPreview) return 'Preview mode · sample position on map';
  const s = unifiedStatus.toUpperCase();
  if (s === 'DRIVER_ASSIGNED') {
    return kind === 'driver'
      ? 'Driver assigned — waiting to accept'
      : 'Assigned — partner will accept shortly';
  }
  if (s === 'CONFIRMED' || s === 'PENDING') {
    return formatCustomerBookingStatus(kind, unifiedStatus, false).dispatchHint;
  }
  return null;
}

export function trackEtaForStage(
  kind: CustomerBookingKind,
  unifiedStatus: string,
  etaMinutes: number | null | undefined,
): string {
  const s = unifiedStatus.toUpperCase();
  if (s === 'DRIVER_EN_ROUTE' || s === 'DRIVER_ARRIVED' || s === 'IN_PROGRESS') {
    return etaMinutes != null ? `${etaMinutes} min` : 'Updating…';
  }
  if (s === 'DRIVER_ASSIGNED' || s === 'CONFIRMED') {
    if (kind === 'driver') return 'Waiting for driver accept';
    if (kind === 'roadside') return 'Partner approval pending';
    return 'Tow vendor approval pending';
  }
  if (s === 'PENDING') {
    return kind === 'driver' ? 'Once a driver accepts' : 'Once a partner accepts';
  }
  if (s === 'COMPLETED' || s === 'RATED') return 'Trip completed';
  return '—';
}

export function partnerSectionTitle(kind: CustomerBookingKind): string {
  if (kind === 'driver') return 'Your driver';
  if (kind === 'roadside') return 'Roadside partner';
  return 'Tow partner';
}
