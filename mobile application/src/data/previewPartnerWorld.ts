/**
 * Single linked preview universe for vendor ↔ driver QA.
 *
 * Personas (consistent IDs everywhere):
 *   Vendor — Bikram Keshari Rout / Kalinga Towing
 *   Driver — Abhishek Sharma (fleet tow driver)
 */
import type { AuthUser } from '../types/auth';
import type { Profile } from '../types/models';
import type { DriverJobBooking } from '../services/driver/driverApi';
import type {
  VendorBookingItem,
  VendorBookingTracking,
} from '../services/vendor/vendorBookingsApi';
import type { FleetVehicle } from '../services/vendor/vendorVehiclesApi';
import type { VendorDriver } from '../services/vendor/vendorDriversApi';
import type { VendorDashboardStats } from '../services/vendor/vendorApi';
import type { VendorProfileResponse } from '../types/vendor';
import type {
  DriverSearchResult,
  DriverVendorInvitation,
  DriverVendorMembership,
  VendorMembership,
} from '../services/vendor/vendorMembershipApi';
import type { PartnerNotificationItem } from '../services/notificationService';
import { UI_PREVIEW_DRIVER_STATUS } from '../constants/preview';
import {
  getDriverVendorPreviewScenario,
  setDriverVendorPreviewScenario,
  type DriverVendorPreviewScenario,
} from '../services/vendor/driverVendorPreview';

const now = new Date();

export const PREVIEW_VENDOR = {
  id: 'preview-vendor-kalinga-001',
  userId: 'preview-vendor-kalinga-001',
  phone: '+919812345670',
  phoneDigits: '9812345670',
  fullName: 'Bikram Keshari Rout',
  email: 'vendor@kalingatowing.com',
  businessName: 'Kalinga Towing & Logistics Services',
  ownerName: 'Bikram Keshari Rout',
  addressLine: 'Plot 104, Rasulgarh Industrial Estate, Bhubaneswar',
  city: 'Bhubaneswar',
  state: 'Odisha',
  pincode: '751010',
} as const;

export const PREVIEW_DRIVER = {
  id: 'preview-driver-abhishek-001',
  userId: 'preview-driver-abhishek-001',
  phone: '+919876543210',
  phoneDigits: '9876543210',
  fullName: 'Abhishek Sharma',
  email: 'abhishek.sharma@kalingatowing.test',
  driverCode: 'RC-DR-1101',
  driverType: 'Tow Driver' as const,
  licenseNo: 'OD-02-DL-20190088',
  city: 'Bhubaneswar',
  state: 'Odisha',
  rating: 4.9,
  loginId: 'DRV-ABH-1101',
} as const;

export const PREVIEW_BOOKING_IDS = {
  newLead: 'RACE-VND-BKG-004',
  inProgress: 'RACE-VND-BKG-001',
  completed: 'RACE-VND-BKG-002',
} as const;

const previewDriverApproved = UI_PREVIEW_DRIVER_STATUS === 'APPROVED';

function driverMembershipSnapshot(): NonNullable<VendorMembership['driver']> {
  return {
    id: PREVIEW_DRIVER.id,
    name: PREVIEW_DRIVER.fullName,
    phone: PREVIEW_DRIVER.phone,
    email: PREVIEW_DRIVER.email,
    driverCode: PREVIEW_DRIVER.driverCode,
    driverStatus: 'APPROVED',
    driverType: PREVIEW_DRIVER.driverType,
    city: PREVIEW_DRIVER.city,
    rating: PREVIEW_DRIVER.rating,
    isAvailable: true,
    isBusy: false,
  };
}

function vendorInvitationSnapshot(): DriverVendorInvitation {
  return {
    id: 'preview-invitation-kalinga-abhishek',
    invitedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    vendor: {
      id: PREVIEW_VENDOR.id,
      name: PREVIEW_VENDOR.businessName,
      ownerName: PREVIEW_VENDOR.ownerName,
      address: {
        line1: 'Plot 104, Rasulgarh Industrial Estate',
        city: PREVIEW_VENDOR.city,
        state: PREVIEW_VENDOR.state,
      },
    },
  };
}

function vendorMembershipSnapshot(): DriverVendorMembership {
  return {
    id: 'preview-membership-kalinga-abhishek',
    acceptedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    vendor: {
      id: PREVIEW_VENDOR.id,
      name: PREVIEW_VENDOR.businessName,
      ownerName: PREVIEW_VENDOR.ownerName,
      address: {
        line1: 'Plot 104, Rasulgarh Industrial Estate',
        city: PREVIEW_VENDOR.city,
        state: PREVIEW_VENDOR.state,
      },
    },
  };
}

function buildInitialVendorBookings(): VendorBookingItem[] {
  return [
    {
      bookingType: 'towing',
      id: PREVIEW_BOOKING_IDS.newLead,
      bookingNumber: 'TOW-10051',
      status: 'REQUESTED',
      serviceLabel: 'Accident Recovery',
      pickup: {
        address: 'Patia Square, Bhubaneswar',
        latitude: 20.3542,
        longitude: 85.8182,
      },
      dropoff: {
        address: 'Infocity, Bhubaneswar',
        latitude: 20.3488,
        longitude: 85.8047,
      },
      estimatedFare: 1899,
      distanceKm: 8.4,
      createdAt: new Date(now.getTime() - 1000 * 60 * 12).toISOString(),
    },
    {
      bookingType: 'towing',
      id: PREVIEW_BOOKING_IDS.inProgress,
      bookingNumber: 'TOW-10048',
      status: 'DRIVER_EN_ROUTE',
      serviceLabel: 'Instant Towing',
      pickup: {
        address: 'Janpath Road, Saheed Nagar, Bhubaneswar',
        latitude: 20.2891,
        longitude: 85.8412,
      },
      dropoff: {
        address: 'Sector B, Mancheswar, Bhubaneswar',
        latitude: 20.3204,
        longitude: 85.8678,
      },
      estimatedFare: 1650,
      finalFare: 1650,
      distanceKm: 12.5,
      createdAt: new Date(now.getTime() - 1000 * 60 * 40).toISOString(),
      assignedFleetVehicleLabel: 'OD 02 TOW 1001 · Flatbed Tow Truck · Tata 407 Recovery',
      driver: {
        id: PREVIEW_DRIVER.id,
        name: PREVIEW_DRIVER.fullName,
        phone: PREVIEW_DRIVER.phone,
        rating: PREVIEW_DRIVER.rating,
      },
    },
    {
      bookingType: 'towing',
      id: PREVIEW_BOOKING_IDS.completed,
      bookingNumber: 'TOW-10040',
      status: 'COMPLETED',
      serviceLabel: 'Instant Towing',
      pickup: { address: 'Vani Vihar Square, Bhubaneswar' },
      dropoff: { address: 'Rasulgarh Industrial Estate, Bhubaneswar' },
      estimatedFare: 1250,
      finalFare: 1250,
      distanceKm: 9.2,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 26).toISOString(),
      assignedFleetVehicleLabel: 'OD 02 TOW 1002 · Wheel-Lift Tow Truck · Mahindra Bolero Maxi Truck',
      driver: {
        id: PREVIEW_DRIVER.id,
        name: PREVIEW_DRIVER.fullName,
        phone: PREVIEW_DRIVER.phone,
        rating: PREVIEW_DRIVER.rating,
      },
    },
  ];
}

function buildDriverJobFromBooking(booking: VendorBookingItem, status: string): DriverJobBooking {
  return {
    bookingType: booking.bookingType,
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    status,
    serviceLabel: booking.serviceLabel,
    pickup: {
      label: booking.pickup?.address?.split(',')[0] ?? 'Pickup',
      address: booking.pickup?.address ?? '',
      latitude: 20.2891,
      longitude: 85.8412,
    },
    dropoff: booking.dropoff
      ? {
          label: booking.dropoff.address?.split(',')[0] ?? 'Drop',
          address: booking.dropoff.address ?? '',
          latitude: 20.3204,
          longitude: 85.8678,
        }
      : undefined,
    customer: {
      name: 'Priya Mishra',
      mobileNumber: '+919912345678',
    },
    estimatedFare: booking.estimatedFare,
    distanceKm: booking.distanceKm,
    createdAt: booking.createdAt,
    vendorId: PREVIEW_VENDOR.id,
    assignedFleetVehicleLabel: booking.assignedFleetVehicleLabel,
    vendorApproved: true,
    statusHistory: [{ status, timestamp: new Date().toISOString() }],
  };
}

type PreviewWorldSnapshot = {
  memberships: VendorMembership[];
  driverInvitations: DriverVendorInvitation[];
  driverVendorMembership: DriverVendorMembership | null;
  vendorBookings: VendorBookingItem[];
  driverJobOffers: DriverJobBooking[];
  mockActiveJob: DriverJobBooking | null;
  searchableDrivers: DriverSearchResult[];
  vendorNotifications: PartnerNotificationItem[];
  driverNotifications: PartnerNotificationItem[];
};

let state: PreviewWorldSnapshot = createConnectedWorld();

function createConnectedWorld(): PreviewWorldSnapshot {
  const driver = driverMembershipSnapshot();
  return {
    memberships: [
      {
        id: 'preview-membership-active-abhishek',
        status: 'ACTIVE',
        invitedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        acceptedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        driver,
      },
    ],
    driverInvitations: [],
    driverVendorMembership: vendorMembershipSnapshot(),
    vendorBookings: buildInitialVendorBookings(),
    driverJobOffers: [],
    mockActiveJob: null,
    searchableDrivers: [
      {
        id: PREVIEW_DRIVER.id,
        name: PREVIEW_DRIVER.fullName,
        phone: '+91 98*** 54321',
        rawPhone: PREVIEW_DRIVER.phone,
        driverCode: PREVIEW_DRIVER.driverCode,
        driverType: PREVIEW_DRIVER.driverType,
        city: PREVIEW_DRIVER.city,
        experienceYears: 5,
        rating: PREVIEW_DRIVER.rating,
        isAvailable: true,
        isBusy: false,
        membershipStatus: 'ALREADY_IN_FLEET',
      },
    ],
    vendorNotifications: [
      {
        id: 'pv-notif-001',
        type: 'FLEET_UPDATE',
        title: 'Driver connected',
        message: `${PREVIEW_DRIVER.fullName} joined your fleet`,
        isRead: true,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { driverId: PREVIEW_DRIVER.id, audience: 'vendor' },
      },
    ],
    driverNotifications: [
      {
        id: 'pd-notif-001',
        type: 'FLEET_UPDATE',
        title: 'Fleet connected',
        message: `You are now part of ${PREVIEW_VENDOR.businessName}`,
        isRead: true,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { vendorId: PREVIEW_VENDOR.id, audience: 'driver' },
      },
    ],
  };
}

function createInvitePendingWorld(): PreviewWorldSnapshot {
  const bookings = buildInitialVendorBookings();
  return {
    memberships: [
      {
        id: 'preview-membership-pending-abhishek',
        status: 'PENDING',
        invitedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        driver: driverMembershipSnapshot(),
      },
    ],
    driverInvitations: [vendorInvitationSnapshot()],
    driverVendorMembership: null,
    vendorBookings: bookings,
    driverJobOffers: [],
    mockActiveJob: null,
    searchableDrivers: [
      {
        id: PREVIEW_DRIVER.id,
        name: PREVIEW_DRIVER.fullName,
        phone: '+91 98*** 54321',
        rawPhone: PREVIEW_DRIVER.phone,
        driverCode: PREVIEW_DRIVER.driverCode,
        driverType: PREVIEW_DRIVER.driverType,
        city: PREVIEW_DRIVER.city,
        experienceYears: 5,
        rating: PREVIEW_DRIVER.rating,
        isAvailable: true,
        isBusy: false,
        membershipStatus: 'INVITED_PENDING',
      },
    ],
    vendorNotifications: [
      {
        id: 'pv-notif-invite-sent',
        type: 'FLEET_UPDATE',
        title: 'Invitation sent',
        message: `Waiting for ${PREVIEW_DRIVER.fullName} to accept`,
        isRead: false,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        metadata: { driverId: PREVIEW_DRIVER.id, audience: 'vendor' },
      },
    ],
    driverNotifications: [
      {
        id: 'pd-notif-invite',
        type: 'FLEET_INVITE',
        title: 'Fleet invitation',
        message: `${PREVIEW_VENDOR.businessName} invited you to join their fleet`,
        isRead: false,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        metadata: {
          invitationId: 'preview-invitation-kalinga-abhishek',
          vendorId: PREVIEW_VENDOR.id,
          audience: 'driver',
        },
      },
    ],
  };
}

/** Reset linked vendor/driver preview state (UI QA). */
export function resetPreviewPartnerWorld(
  mode: 'connected' | 'invite_pending' | 'assignment' = 'connected',
): void {
  if (mode === 'invite_pending') {
    state = createInvitePendingWorld();
    setDriverVendorPreviewScenario('request');
    return;
  }
  state = createConnectedWorld();
  if (mode === 'assignment') {
    setDriverVendorPreviewScenario('assignment');
    pushDriverAssignmentOffer(PREVIEW_BOOKING_IDS.newLead);
  } else {
    setDriverVendorPreviewScenario('connected');
  }
}

function pushVendorNotification(item: Omit<PartnerNotificationItem, 'id'>): void {
  state.vendorNotifications.unshift({
    ...item,
    id: `pv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  });
}

function pushDriverNotification(item: Omit<PartnerNotificationItem, 'id'>): void {
  state.driverNotifications.unshift({
    ...item,
    id: `pd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  });
}

export function getPreviewVendorNotifications(): PartnerNotificationItem[] {
  return [...state.vendorNotifications];
}

export function getPreviewDriverNotifications(): PartnerNotificationItem[] {
  return [...state.driverNotifications];
}

export function setPreviewNotificationsForRole(
  role: 'vendor' | 'driver',
  next: PartnerNotificationItem[],
): void {
  if (role === 'vendor') state.vendorNotifications = [...next];
  else state.driverNotifications = [...next];
}

export function getPreviewMemberships(): VendorMembership[] {
  return [...state.memberships];
}

export function getPreviewSearchableDrivers(): DriverSearchResult[] {
  return [...state.searchableDrivers];
}

export function getPreviewDriverInvitations(): DriverVendorInvitation[] {
  if (getDriverVendorPreviewScenario() === 'request') {
    return [...state.driverInvitations];
  }
  return [];
}

export function getPreviewDriverVendorMembership(): DriverVendorMembership | null {
  return state.driverVendorMembership;
}

export function getPreviewVendorBookings(): VendorBookingItem[] {
  return [...state.vendorBookings];
}

export function getPreviewDriverJobOffers(): DriverJobBooking[] {
  return [...state.driverJobOffers];
}

export function getPreviewMockActiveJob(): DriverJobBooking | null {
  return state.mockActiveJob;
}

export function updatePreviewMockActiveJobStatus(nextStatus: string): DriverJobBooking | null {
  if (!state.mockActiveJob) return null;
  const statusHistory = [
    ...(state.mockActiveJob.statusHistory ?? []),
    { status: nextStatus, timestamp: new Date().toISOString() },
  ];
  state.mockActiveJob = {
    ...state.mockActiveJob,
    status: nextStatus,
    statusHistory,
    ...(nextStatus === 'COMPLETED'
      ? { finalFare: state.mockActiveJob.finalFare ?? state.mockActiveJob.estimatedFare }
      : {}),
  };
  syncVendorBookingStatus(state.mockActiveJob.id, nextStatus);
  return state.mockActiveJob;
}

function syncVendorBookingStatus(bookingId: string, status: string): void {
  const idx = state.vendorBookings.findIndex(b => b.id === bookingId);
  if (idx === -1) return;
  state.vendorBookings[idx] = {
    ...state.vendorBookings[idx],
    status,
    driver: {
      id: PREVIEW_DRIVER.id,
      name: PREVIEW_DRIVER.fullName,
      phone: PREVIEW_DRIVER.phone,
      rating: PREVIEW_DRIVER.rating,
    },
  };
}

function markSearchStatus(status: DriverSearchResult['membershipStatus']): void {
  const row = state.searchableDrivers.find(d => d.id === PREVIEW_DRIVER.id);
  if (row) row.membershipStatus = status;
}

export function previewInviteDriverByPhone(phone: string): { ok: boolean; message: string } {
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits !== PREVIEW_DRIVER.phoneDigits) {
    return {
      ok: true,
      message: `If a verified Driver matches +91 ${digits}, an invitation has been sent.`,
    };
  }
  const existing = state.memberships.find(
    m => m.driver?.phone.replace(/\D/g, '').endsWith(digits),
  );
  if (existing) {
    return {
      ok: false,
      message: 'This Driver is already on your fleet or has a pending invitation.',
    };
  }
  state.memberships.push({
    id: `preview-membership-pending-${Date.now()}`,
    status: 'PENDING',
    invitedAt: new Date().toISOString(),
    driver: driverMembershipSnapshot(),
  });
  state.driverInvitations = [vendorInvitationSnapshot()];
  markSearchStatus('INVITED_PENDING');
  setDriverVendorPreviewScenario('request');
  pushDriverNotification({
    type: 'FLEET_INVITE',
    title: 'Fleet invitation',
    message: `${PREVIEW_VENDOR.businessName} invited you to join their fleet`,
    isRead: false,
    createdAt: new Date().toISOString(),
    metadata: {
      invitationId: 'preview-invitation-kalinga-abhishek',
      vendorId: PREVIEW_VENDOR.id,
      audience: 'driver',
    },
  });
  pushVendorNotification({
    type: 'FLEET_UPDATE',
    title: 'Invitation sent',
    message: `Waiting for ${PREVIEW_DRIVER.fullName} to accept`,
    isRead: false,
    createdAt: new Date().toISOString(),
    metadata: { driverId: PREVIEW_DRIVER.id, audience: 'vendor' },
  });
  return {
    ok: true,
    message: `Invitation sent to ${PREVIEW_DRIVER.fullName}. They must accept in the driver app.`,
  };
}

export function previewRespondToVendorInvitation(
  invitationId: string,
  decision: 'accept' | 'decline',
): void {
  state.driverInvitations = state.driverInvitations.filter(i => i.id !== invitationId);
  if (decision === 'accept') {
    state.driverVendorMembership = vendorMembershipSnapshot();
    const pendingIdx = state.memberships.findIndex(m => m.status === 'PENDING');
    if (pendingIdx >= 0) {
      state.memberships[pendingIdx] = {
        ...state.memberships[pendingIdx],
        status: 'ACTIVE',
        acceptedAt: new Date().toISOString(),
        driver: state.memberships[pendingIdx].driver ?? driverMembershipSnapshot(),
      };
    } else if (!state.memberships.some(m => m.status === 'ACTIVE')) {
      state.memberships.push({
        id: 'preview-membership-active-abhishek',
        status: 'ACTIVE',
        invitedAt: new Date().toISOString(),
        acceptedAt: new Date().toISOString(),
        driver: driverMembershipSnapshot(),
      });
    }
    markSearchStatus('ALREADY_IN_FLEET');
    setDriverVendorPreviewScenario('connected');
    pushVendorNotification({
      type: 'FLEET_UPDATE',
      title: 'Driver accepted',
      message: `${PREVIEW_DRIVER.fullName} joined your fleet`,
      isRead: false,
      createdAt: new Date().toISOString(),
      metadata: { driverId: PREVIEW_DRIVER.id, audience: 'vendor' },
    });
    pushDriverNotification({
      type: 'FLEET_UPDATE',
      title: 'Fleet connected',
      message: `You are now part of ${PREVIEW_VENDOR.businessName}`,
      isRead: false,
      createdAt: new Date().toISOString(),
      metadata: { vendorId: PREVIEW_VENDOR.id, audience: 'driver' },
    });
  } else {
    state.memberships = state.memberships.filter(m => m.status !== 'PENDING');
    markSearchStatus('AVAILABLE_FOR_INVITE');
    if (!state.driverVendorMembership) setDriverVendorPreviewScenario('none');
  }
}

export function previewRevokeMembership(membershipId: string): void {
  const removed = state.memberships.find(m => m.id === membershipId);
  state.memberships = state.memberships.filter(m => m.id !== membershipId);
  if (removed?.status === 'PENDING') markSearchStatus('AVAILABLE_FOR_INVITE');
  if (removed?.status === 'ACTIVE') {
    state.driverVendorMembership = null;
    markSearchStatus('AVAILABLE_FOR_INVITE');
    setDriverVendorPreviewScenario('none');
  }
}

function pushDriverAssignmentOffer(bookingId: string): void {
  const booking = state.vendorBookings.find(b => b.id === bookingId);
  if (!booking) return;
  const offer = buildDriverJobFromBooking(booking, 'DRIVER_ASSIGNED');
  if (!state.driverJobOffers.some(o => o.id === offer.id)) {
    state.driverJobOffers.unshift(offer);
  }
  pushDriverNotification({
    type: 'JOB_OFFER',
    title: 'New fleet job',
    message: `#${booking.bookingNumber} · ${booking.serviceLabel}\n${booking.pickup?.address ?? ''}`,
    isRead: false,
    createdAt: new Date().toISOString(),
    metadata: {
      bookingId: booking.id,
      bookingType: booking.bookingType,
      bookingNumber: booking.bookingNumber,
      audience: 'driver',
    },
  });
}

export function previewApproveVendorBooking(input: {
  bookingId: string;
  bookingType: 'towing' | 'driver';
  driverId: string;
  vehicleLabel?: string;
}): void {
  const idx = state.vendorBookings.findIndex(b => b.id === input.bookingId);
  if (idx === -1) return;
  const booking = state.vendorBookings[idx];
  state.vendorBookings[idx] = {
    ...booking,
    status: 'DRIVER_ASSIGNED',
    assignedFleetVehicleLabel: input.vehicleLabel ?? booking.assignedFleetVehicleLabel,
    driver: {
      id: PREVIEW_DRIVER.id,
      name: PREVIEW_DRIVER.fullName,
      phone: PREVIEW_DRIVER.phone,
      rating: PREVIEW_DRIVER.rating,
    },
  };
  const driver = state.memberships.find(m => m.driver?.id === input.driverId)?.driver;
  if (driver) {
    driver.isBusy = true;
  }
  pushDriverAssignmentOffer(input.bookingId);
  pushVendorNotification({
    type: 'BOOKING_UPDATE',
    title: 'Driver assigned',
    message: `${PREVIEW_DRIVER.fullName} assigned to #${booking.bookingNumber}`,
    isRead: false,
    createdAt: new Date().toISOString(),
    metadata: {
      bookingId: booking.id,
      bookingType: input.bookingType,
      audience: 'vendor',
    },
  });
}

export function previewAcceptDriverJob(bookingId: string, bookingType: DriverJobBooking['bookingType']): boolean {
  if (
    state.mockActiveJob &&
    !['COMPLETED', 'RATED', 'PAID', 'CANCELLED'].includes(state.mockActiveJob.status)
  ) {
    return false;
  }
  const offerIdx = state.driverJobOffers.findIndex(
    j => j.id === bookingId && j.bookingType === bookingType,
  );
  const offer = offerIdx >= 0 ? state.driverJobOffers[offerIdx] : null;
  if (!offer) return false;
  const acceptedAt = new Date().toISOString();
  state.mockActiveJob = {
    ...offer,
    status: 'DRIVER_EN_ROUTE',
    statusHistory: [
      { status: 'DRIVER_ASSIGNED', timestamp: offer.createdAt },
      { status: 'DRIVER_EN_ROUTE', timestamp: acceptedAt },
    ],
  };
  state.driverJobOffers = state.driverJobOffers.filter(j => j.id !== bookingId);
  syncVendorBookingStatus(bookingId, 'DRIVER_EN_ROUTE');
  pushVendorNotification({
    type: 'BOOKING_UPDATE',
    title: 'Driver en route',
    message: `${PREVIEW_DRIVER.fullName} accepted #${offer.bookingNumber}`,
    isRead: false,
    createdAt: new Date().toISOString(),
    metadata: {
      bookingId: offer.id,
      bookingType: offer.bookingType,
      audience: 'vendor',
    },
  });
  return true;
}

export function previewRejectDriverJob(bookingId: string): void {
  state.driverJobOffers = state.driverJobOffers.filter(j => j.id !== bookingId);
}

export function buildPreviewVendorUser(): AuthUser {
  return {
    id: PREVIEW_VENDOR.userId,
    mobileNumber: PREVIEW_VENDOR.phone,
    fullName: PREVIEW_VENDOR.fullName,
    email: PREVIEW_VENDOR.email,
    role: 'vendor',
    gender: 'male',
    isVerified: true,
    isProfileCompleted: true,
  };
}

export function buildPreviewDriverUser(): AuthUser {
  return {
    id: PREVIEW_DRIVER.userId,
    mobileNumber: PREVIEW_DRIVER.phone,
    fullName: PREVIEW_DRIVER.fullName,
    email: PREVIEW_DRIVER.email,
    role: 'driver',
    gender: 'male',
    isVerified: true,
    isProfileCompleted: true,
  };
}

export function buildPreviewDriverProfile(): Profile {
  return {
    id: PREVIEW_DRIVER.userId,
    mobileNumber: PREVIEW_DRIVER.phone,
    fullName: PREVIEW_DRIVER.fullName,
    email: PREVIEW_DRIVER.email,
    gender: 'male',
    role: 'driver',
    isVerified: true,
    isProfileCompleted: true,
    isAvailable: true,
    address: {
      line1: 'Plot 22, Master Canteen Area',
      city: PREVIEW_DRIVER.city,
      state: PREVIEW_DRIVER.state,
      pincode: '751001',
      country: 'India',
    },
    driverProfile: {
      status: UI_PREVIEW_DRIVER_STATUS,
      driverCode: PREVIEW_DRIVER.driverCode,
      driverType: PREVIEW_DRIVER.driverType,
      licenseNo: PREVIEW_DRIVER.licenseNo,
      city: PREVIEW_DRIVER.city,
      state: PREVIEW_DRIVER.state,
      policeVerificationStatus: previewDriverApproved ? 'VERIFIED' : 'PENDING',
      documents: previewDriverApproved
        ? [{ type: 'driving_license', status: 'VERIFIED', uploadedAt: '2026-10-09T09:12:00.000Z' }]
        : [{ type: 'driving_license', status: 'VERIFIED', uploadedAt: '2026-10-09T09:12:00.000Z' }],
      statusHistory: [{ status: UI_PREVIEW_DRIVER_STATUS, changedAt: '2026-10-09T09:12:00.000Z' }],
      submittedAt: '2026-10-09T09:12:00.000Z',
    },
  };
}

export function buildPreviewVendorProfile(): Profile {
  return {
    id: PREVIEW_VENDOR.userId,
    mobileNumber: PREVIEW_VENDOR.phone,
    fullName: PREVIEW_VENDOR.fullName,
    email: PREVIEW_VENDOR.email,
    gender: 'male',
    role: 'vendor',
    isVerified: true,
    isProfileCompleted: true,
    address: {
      line1: 'Plot 104, Rasulgarh Industrial Estate',
      city: PREVIEW_VENDOR.city,
      state: PREVIEW_VENDOR.state,
      pincode: PREVIEW_VENDOR.pincode,
      country: 'India',
    },
  };
}

const d1 = new Date(now.getTime() - 86400000 * 3).toISOString();
const d3 = new Date(now.getTime() - 86400000 * 1).toISOString();

export function buildPreviewVendorStatus(): VendorProfileResponse {
  return {
    id: PREVIEW_VENDOR.id,
    userId: PREVIEW_VENDOR.userId,
    vendorType: 'towing_company',
    status: 'approved',
    verificationStage: 'approved',
    businessName: PREVIEW_VENDOR.businessName,
    ownerName: PREVIEW_VENDOR.ownerName,
    mobileNumber: PREVIEW_VENDOR.phone,
    email: PREVIEW_VENDOR.email,
    address: PREVIEW_VENDOR.addressLine,
    bankDetails: {
      accountHolderName: PREVIEW_VENDOR.businessName,
      accountNumber: '91881234567890',
      ifsc: 'SBIN0001234',
      bankName: 'State Bank of India',
    },
    statusHistory: [
      { status: 'submitted', changedAt: d1, note: 'Registration documents submitted' },
      { status: 'approved', changedAt: d3, note: 'Partner verified & approved for dispatch' },
    ],
    documents: [],
    submittedAt: d1,
    approvedAt: d3,
    createdAt: d1,
    updatedAt: d3,
  };
}

export const PREVIEW_VENDOR_DASHBOARD: VendorDashboardStats = {
  jobsToday: 3,
  earningsToday: 4250,
  earningsTotal: 48200,
};

export const PREVIEW_VENDOR_VEHICLES: FleetVehicle[] = [
  {
    id: 'preview-veh-001',
    vendorId: PREVIEW_VENDOR.id,
    registrationNo: 'OD-02-TOW-1001',
    type: 'Flatbed Tow Truck',
    model: 'Tata 407 Recovery',
    year: 2022,
    status: 'ACTIVE',
    insuranceExpiry: '2027-05-15',
    createdAt: d1,
  },
  {
    id: 'preview-veh-002',
    vendorId: PREVIEW_VENDOR.id,
    registrationNo: 'OD-02-TOW-1002',
    type: 'Wheel-Lift Tow Truck',
    model: 'Mahindra Bolero Maxi Truck',
    year: 2021,
    status: 'ACTIVE',
    insuranceExpiry: '2026-11-20',
    createdAt: d1,
  },
];

export const PREVIEW_VENDOR_LEGACY_DRIVERS: VendorDriver[] = [
  {
    id: PREVIEW_DRIVER.id,
    vendorId: PREVIEW_VENDOR.id,
    name: PREVIEW_DRIVER.fullName,
    phone: PREVIEW_DRIVER.phone,
    email: PREVIEW_DRIVER.email,
    driverType: PREVIEW_DRIVER.driverType,
    licenseNo: PREVIEW_DRIVER.licenseNo,
    city: PREVIEW_DRIVER.city,
    vehicleRegistration: 'OD-02-TOW-1001',
    status: 'APPROVED',
    isAvailable: true,
    isBusy: false,
    rating: PREVIEW_DRIVER.rating,
    loginId: PREVIEW_DRIVER.loginId,
    hasPasswordLogin: true,
  },
];

export const PREVIEW_DRIVER_HISTORY: DriverJobBooking[] = [
  {
    bookingType: 'towing',
    id: 'RACE-TOW-HIST-001',
    bookingNumber: 'TOW-10040',
    status: 'COMPLETED',
    serviceLabel: 'Wheel-Lift Towing',
    pickup: {
      label: 'Vani Vihar',
      address: 'Vani Vihar Square, Bhubaneswar',
      latitude: 20.3012,
      longitude: 85.8234,
    },
    dropoff: {
      label: 'Rasulgarh',
      address: 'Rasulgarh Industrial Estate, Bhubaneswar',
      latitude: 20.2845,
      longitude: 85.8456,
    },
    estimatedFare: 1250,
    distanceKm: 9.2,
    createdAt: new Date(now.getTime() - 86400000 * 3).toISOString(),
    vendorId: PREVIEW_VENDOR.id,
    vendorApproved: true,
  },
];

/** When UI QA sets assignment scenario, ensure offer exists. */
export function ensurePreviewAssignmentOffer(): void {
  if (getDriverVendorPreviewScenario() === 'assignment') {
    pushDriverAssignmentOffer(PREVIEW_BOOKING_IDS.newLead);
  }
}

const PREVIEW_TRACKING_COORDS = {
  enRouteToPickup: { latitude: 20.2961, longitude: 85.852 },
  atPickup: { latitude: 20.2891, longitude: 85.8412 },
  enRouteToDrop: { latitude: 20.305, longitude: 85.855 },
};

/** Vendor read-only tracking — synced with preview bookings + active driver trip. */
export function getPreviewVendorBookingTracking(
  bookingId: string,
  bookingType: 'towing' | 'driver',
): VendorBookingTracking | null {
  const booking = state.vendorBookings.find(b => b.id === bookingId);
  if (!booking) return null;

  const activeTrip = state.mockActiveJob?.id === bookingId ? state.mockActiveJob : null;
  const status = activeTrip?.status ?? booking.status;
  const pickup = booking.pickup;
  const dropoff = booking.dropoff ?? undefined;

  let driverLocation = PREVIEW_TRACKING_COORDS.enRouteToPickup;
  if (status === 'DRIVER_ARRIVED' || status === 'IN_PROGRESS') {
    driverLocation =
      status === 'IN_PROGRESS' ? PREVIEW_TRACKING_COORDS.enRouteToDrop : PREVIEW_TRACKING_COORDS.atPickup;
  } else if (status === 'DRIVER_ASSIGNED') {
    driverLocation = PREVIEW_TRACKING_COORDS.atPickup;
  }

  const trackable = [
    'DRIVER_ASSIGNED',
    'DRIVER_EN_ROUTE',
    'DRIVER_ARRIVED',
    'IN_PROGRESS',
  ].includes(status);

  return {
    bookingType,
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    status,
    serviceLabel: booking.serviceLabel,
    pickup: pickup
      ? {
          address: pickup.address,
          latitude: pickup.latitude,
          longitude: pickup.longitude,
        }
      : undefined,
    dropoff: dropoff
      ? {
          address: dropoff.address,
          latitude: dropoff.latitude,
          longitude: dropoff.longitude,
        }
      : null,
    assignedFleetVehicleLabel: booking.assignedFleetVehicleLabel,
    driver: booking.driver
      ? {
          id: booking.driver.id,
          name: booking.driver.name,
          phone: booking.driver.phone,
        }
      : undefined,
    driverLocation: trackable ? { ...driverLocation, updatedAt: new Date().toISOString() } : null,
    isLocationFresh: trackable,
    statusHistory: activeTrip?.statusHistory?.map(entry => ({
      status: entry.status,
      timestamp: entry.timestamp,
    })) ?? [
      { status: 'CONFIRMED', timestamp: booking.createdAt, note: 'Job confirmed' },
      ...(status !== 'REQUESTED'
        ? [
            {
              status,
              timestamp: new Date().toISOString(),
              note:
                status === 'DRIVER_EN_ROUTE'
                  ? `${PREVIEW_DRIVER.fullName} is heading to pickup`
                  : status === 'IN_PROGRESS'
                    ? 'Service in progress toward drop-off'
                    : undefined,
            },
          ]
        : []),
    ],
  };
}
