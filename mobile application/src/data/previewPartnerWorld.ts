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
import { useDriverPresenceStore } from '../store/driverPresenceStore';
import {
  getDriverVendorPreviewScenario,
  setDriverVendorPreviewScenario,
  type DriverVendorPreviewScenario,
} from '../services/vendor/driverVendorPreview';

const now = new Date();

/**
 * Real Bhopal-region places for the live trip mocks (coordinates are approximate
 * map points, good enough for road routing). The active job runs
 * Mandideep → MP Nagar; the driver starts from a random Bhopal locality.
 */
export const PREVIEW_PLACES = {
  mandideepPickup: {
    address: 'Mandideep Bus Stand, Mandideep, Madhya Pradesh',
    latitude: 23.0833,
    longitude: 77.5167,
  },
  mpNagarDrop: {
    address: 'DB City Mall, Zone-I, MP Nagar, Bhopal',
    latitude: 23.2326,
    longitude: 77.4337,
  },
  junctionPickup: {
    address: 'Bhopal Junction Railway Station, Bhopal',
    latitude: 23.2683,
    longitude: 77.4121,
  },
  aiimsDrop: {
    address: 'AIIMS Bhopal, Saket Nagar, Bhopal',
    latitude: 23.2085,
    longitude: 77.4585,
  },
  habibganjPickup: {
    address: 'Rani Kamlapati Railway Station, Habibganj, Bhopal',
    latitude: 23.2294,
    longitude: 77.4388,
  },
  kolarDrop: {
    address: 'Kolar Road, Bhopal',
    latitude: 23.1752,
    longitude: 77.4171,
  },
} as const;

/** Random start points for the preview driver, all inside Bhopal. */
const PREVIEW_DRIVER_START_POINTS = [
  { name: 'Misrod', latitude: 23.1772, longitude: 77.4641 },
  { name: 'Bawadiya Kalan', latitude: 23.1948, longitude: 77.4592 },
  { name: 'Awadhpuri', latitude: 23.2113, longitude: 77.4846 },
  { name: 'Arera Colony', latitude: 23.2105, longitude: 77.4326 },
] as const;

let previewDriverStart: (typeof PREVIEW_DRIVER_START_POINTS)[number] =
  PREVIEW_DRIVER_START_POINTS[Math.floor(Math.random() * PREVIEW_DRIVER_START_POINTS.length)];

/** Where the preview driver begins the trip (re-rolled on every world reset). */
export function getPreviewDriverStart(): { name: string; latitude: number; longitude: number } {
  return previewDriverStart;
}

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

const PREVIEW_DRIVER_TWO = {
  id: 'preview-driver-sanjay-001',
  phone: '+919876112233',
  fullName: 'Sanjay Behera',
  email: 'sanjay.behera@kalingatowing.test',
  driverCode: 'RC-DR-1108',
  driverType: 'Tow Driver' as const,
  licenseNo: 'OD-02-DL-20210441',
  city: 'Bhubaneswar',
  rating: 4.7,
  loginId: 'DRV-SAN-1108',
} as const;

function driverMembershipSnapshot(isBusy = false): NonNullable<VendorMembership['driver']> {
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
    isBusy,
  };
}

function sanjayMembershipSnapshot(): NonNullable<VendorMembership['driver']> {
  return {
    id: PREVIEW_DRIVER_TWO.id,
    name: PREVIEW_DRIVER_TWO.fullName,
    phone: PREVIEW_DRIVER_TWO.phone,
    email: PREVIEW_DRIVER_TWO.email,
    driverCode: PREVIEW_DRIVER_TWO.driverCode,
    driverStatus: 'APPROVED',
    driverType: PREVIEW_DRIVER_TWO.driverType,
    city: PREVIEW_DRIVER_TWO.city,
    rating: PREVIEW_DRIVER_TWO.rating,
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
      id: 'RACE-VND-BKG-006',
      bookingNumber: 'TOW-10055',
      status: 'REQUESTED',
      serviceLabel: 'Flatbed Recovery',
      pickup: { ...PREVIEW_PLACES.habibganjPickup },
      dropoff: { ...PREVIEW_PLACES.kolarDrop },
      estimatedFare: 980,
      distanceKm: 6.1,
      createdAt: new Date(now.getTime() - 1000 * 60 * 6).toISOString(),
    },
    {
      bookingType: 'towing',
      id: PREVIEW_BOOKING_IDS.newLead,
      bookingNumber: 'TOW-10051',
      status: 'REQUESTED',
      serviceLabel: 'Accident Recovery',
      pickup: { ...PREVIEW_PLACES.junctionPickup },
      dropoff: { ...PREVIEW_PLACES.aiimsDrop },
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
      pickup: { ...PREVIEW_PLACES.mandideepPickup },
      dropoff: { ...PREVIEW_PLACES.mpNagarDrop },
      estimatedFare: 1650,
      finalFare: 1650,
      distanceKm: 24.6,
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
      id: 'RACE-VND-BKG-007',
      bookingNumber: 'TOW-10036',
      status: 'CANCELLED',
      serviceLabel: 'Battery Jumpstart',
      pickup: { address: 'Saheed Nagar, Bhubaneswar', latitude: 20.2955, longitude: 85.8392 },
      dropoff: { address: 'Saheed Nagar, Bhubaneswar', latitude: 20.2955, longitude: 85.8392 },
      estimatedFare: 640,
      distanceKm: 2.4,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 30).toISOString(),
      assignedFleetVehicleLabel: 'OD 02 TOW 1002 · Wheel-Lift Tow Truck · Mahindra Bolero Maxi Truck',
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
      latitude: booking.pickup?.latitude ?? PREVIEW_PLACES.mandideepPickup.latitude,
      longitude: booking.pickup?.longitude ?? PREVIEW_PLACES.mandideepPickup.longitude,
    },
    dropoff: booking.dropoff
      ? {
          label: booking.dropoff.address?.split(',')[0] ?? 'Drop',
          address: booking.dropoff.address ?? '',
          latitude: booking.dropoff.latitude ?? PREVIEW_PLACES.mpNagarDrop.latitude,
          longitude: booking.dropoff.longitude ?? PREVIEW_PLACES.mpNagarDrop.longitude,
        }
      : undefined,
    customer: {
      name: 'Rohit Sharma',
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

function hoursAgo(hours: number): string {
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
}

function createConnectedWorld(): PreviewWorldSnapshot {
  const driver = driverMembershipSnapshot(true);
  const vendorBookings = buildInitialVendorBookings();
  const openLeads = vendorBookings.filter(booking => booking.status === 'REQUESTED');
  const activeSource = vendorBookings.find(booking => booking.id === PREVIEW_BOOKING_IDS.inProgress);
  return {
    memberships: [
      {
        id: 'preview-membership-active-abhishek',
        status: 'ACTIVE',
        invitedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        acceptedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        driver,
      },
      {
        id: 'preview-membership-active-sanjay',
        status: 'ACTIVE',
        invitedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        acceptedAt: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000).toISOString(),
        driver: sanjayMembershipSnapshot(),
      },
    ],
    driverInvitations: [],
    driverVendorMembership: vendorMembershipSnapshot(),
    vendorBookings,
    driverJobOffers: openLeads.map(booking => buildDriverJobFromBooking(booking, 'DRIVER_ASSIGNED')),
    mockActiveJob: activeSource
      ? {
          ...buildDriverJobFromBooking(activeSource, 'DRIVER_EN_ROUTE'),
          customer: { name: 'Rohit Sharma', mobileNumber: '+919876543210' },
        }
      : null,
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
        isBusy: true,
        membershipStatus: 'ALREADY_IN_FLEET',
      },
      {
        id: PREVIEW_DRIVER_TWO.id,
        name: PREVIEW_DRIVER_TWO.fullName,
        phone: '+91 98*** 11223',
        rawPhone: PREVIEW_DRIVER_TWO.phone,
        driverCode: PREVIEW_DRIVER_TWO.driverCode,
        driverType: PREVIEW_DRIVER_TWO.driverType,
        city: PREVIEW_DRIVER_TWO.city,
        experienceYears: 3,
        rating: PREVIEW_DRIVER_TWO.rating,
        isAvailable: true,
        isBusy: false,
        membershipStatus: 'ALREADY_IN_FLEET',
      },
    ],
    vendorNotifications: [
      {
        id: 'pv-notif-lead-055',
        type: 'BOOKING_UPDATE',
        title: 'New booking lead',
        message: 'TOW-10055 · Flatbed Recovery\nRani Kamlapati Railway Station, Bhopal',
        isRead: false,
        createdAt: hoursAgo(0.1),
        metadata: { bookingId: 'RACE-VND-BKG-006', bookingType: 'towing', audience: 'vendor' },
      },
      {
        id: 'pv-notif-lead-051',
        type: 'BOOKING_UPDATE',
        title: 'New booking lead',
        message: 'TOW-10051 · Accident Recovery\nBhopal Junction Railway Station',
        isRead: false,
        createdAt: hoursAgo(0.2),
        metadata: { bookingId: PREVIEW_BOOKING_IDS.newLead, bookingType: 'towing', audience: 'vendor' },
      },
      {
        id: 'pv-notif-enroute',
        type: 'BOOKING_UPDATE',
        title: 'Driver en route',
        message: `${PREVIEW_DRIVER.fullName} is heading to pickup for TOW-10048`,
        isRead: false,
        createdAt: hoursAgo(0.6),
        metadata: { bookingId: PREVIEW_BOOKING_IDS.inProgress, bookingType: 'towing', audience: 'vendor' },
      },
      {
        id: 'pv-notif-completed-040',
        type: 'BOOKING_UPDATE',
        title: 'Job completed',
        message: 'TOW-10040 finished. ₹1,250 collected and logged.',
        isRead: false,
        createdAt: hoursAgo(21),
        metadata: { bookingId: PREVIEW_BOOKING_IDS.completed, bookingType: 'towing', audience: 'vendor' },
      },
      {
        id: 'pv-notif-doc-review',
        type: 'ACCOUNT',
        title: 'Document verified',
        message: 'Cancelled cheque uploaded for Kalinga Towing is now approved.',
        isRead: false,
        createdAt: hoursAgo(23),
        metadata: { audience: 'vendor' },
      },
      {
        id: 'pv-notif-payout',
        type: 'PAYMENT',
        title: 'Payout settled',
        message: '₹12,400 sent to State Bank of India · ****7890',
        isRead: false,
        createdAt: hoursAgo(20),
        metadata: { audience: 'vendor' },
      },
      {
        id: 'pv-notif-payment-week',
        type: 'PAYMENT_SUCCESS',
        title: 'Weekly statement ready',
        message: 'You earned ₹24,500 across 38 jobs last week.',
        isRead: true,
        createdAt: hoursAgo(30),
        metadata: { audience: 'vendor' },
      },
      {
        id: 'pv-notif-vehicle-1002',
        type: 'VEHICLE_ACTIVITY',
        title: 'Vehicle fitness certificate expires',
        message: 'OD-02-TOW-1002 fitness certificate expires on 20 Nov 2026. Renew to stay dispatchable.',
        isRead: false,
        createdAt: hoursAgo(4),
        metadata: { entityType: 'vehicle', vehicleId: 'preview-veh-002', audience: 'vendor' },
      },
      {
        id: 'pv-notif-driver-activity',
        type: 'DRIVER_ACTIVITY',
        title: 'Driver went offline',
        message: `${PREVIEW_DRIVER_TWO.fullName} ended their shift at 6:12 PM yesterday.`,
        isRead: true,
        createdAt: hoursAgo(16),
        metadata: { entityType: 'driver', driverId: PREVIEW_DRIVER_TWO.id, audience: 'vendor' },
      },
      {
        id: 'pv-notif-rating',
        type: 'SERVICE_RATING',
        title: 'New 5-star rating',
        message: 'A customer rated TOW-10040 ⭐ 5.0 — “Quick and careful with the car.”',
        isRead: true,
        createdAt: hoursAgo(25),
        metadata: { bookingId: PREVIEW_BOOKING_IDS.completed, audience: 'vendor' },
      },
      {
        id: 'pv-notif-001',
        type: 'FLEET_UPDATE',
        title: 'Driver connected',
        message: `${PREVIEW_DRIVER.fullName} joined your fleet`,
        isRead: true,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { driverId: PREVIEW_DRIVER.id, entityType: 'driver', audience: 'vendor' },
      },
    ],
    driverNotifications: [
      {
        id: 'pd-notif-job-055',
        type: 'JOB_OFFER',
        title: 'New fleet job',
        message: 'TOW-10055 · Flatbed Recovery\nHabibganj → Kolar Road',
        isRead: false,
        createdAt: hoursAgo(0.1),
        metadata: { bookingId: 'RACE-VND-BKG-006', bookingType: 'towing', audience: 'driver' },
      },
      {
        id: 'pd-notif-job-051',
        type: 'JOB_OFFER',
        title: 'New fleet job',
        message: 'TOW-10051 · Accident Recovery\nBhopal Junction → AIIMS',
        isRead: false,
        createdAt: hoursAgo(0.2),
        metadata: { bookingId: PREVIEW_BOOKING_IDS.newLead, bookingType: 'towing', audience: 'driver' },
      },
      {
        id: 'pd-notif-active',
        type: 'BOOKING_UPDATE',
        title: 'Trip in progress',
        message: 'TOW-10048 · Mandideep → MP Nagar. Customer Rohit Sharma is waiting.',
        isRead: false,
        createdAt: hoursAgo(0.7),
        metadata: { bookingId: PREVIEW_BOOKING_IDS.inProgress, bookingType: 'towing', audience: 'driver' },
      },
      {
        id: 'pd-notif-confirmed',
        type: 'BOOKING_CONFIRMED',
        title: 'Job confirmed',
        message: 'TOW-10033 payment confirmed. Start toward Master Canteen pickup.',
        isRead: false,
        createdAt: hoursAgo(2),
        metadata: { bookingId: 'RACE-TOW-HIST-TODAY', bookingType: 'towing', audience: 'driver' },
      },
      {
        id: 'pd-notif-completed-today',
        type: 'BOOKING_COMPLETED',
        title: 'Trip completed',
        message: 'TOW-10033 completed. ₹1,650 added to today’s earnings.',
        isRead: false,
        createdAt: hoursAgo(1.5),
        metadata: { bookingId: 'RACE-TOW-HIST-TODAY', bookingType: 'towing', audience: 'driver' },
      },
      {
        id: 'pd-notif-docs',
        type: 'ACCOUNT',
        title: 'Documents verified',
        message: 'Aadhaar, PAN and driving licence are approved. You are fully verified.',
        isRead: false,
        createdAt: hoursAgo(27),
        metadata: { audience: 'driver' },
      },
      {
        id: 'pd-notif-payout',
        type: 'PAYMENT',
        title: 'Earnings settled',
        message: '₹4,200 paid to your bank for last week’s trips',
        isRead: false,
        createdAt: hoursAgo(26),
        metadata: { audience: 'driver' },
      },
      {
        id: 'pd-notif-payment-success',
        type: 'PAYMENT_SUCCESS',
        title: 'Payout received',
        message: '₹5,400 weekly settlement landed in your State Bank account.',
        isRead: true,
        createdAt: hoursAgo(50),
        metadata: { audience: 'driver' },
      },
      {
        id: 'pd-notif-vehicle',
        type: 'VEHICLE_ACTIVITY',
        title: 'Vehicle insurance uploaded',
        message: 'Insurance for OD-02-TOW-1001 was verified for your profile.',
        isRead: true,
        createdAt: hoursAgo(40),
        metadata: { entityType: 'vehicle', audience: 'driver' },
      },
      {
        id: 'pd-notif-rating',
        type: 'SERVICE_RATING',
        title: 'New 5-star rating',
        message: 'Ananya Das rated your TOW-10033 trip ⭐ 5.0.',
        isRead: false,
        createdAt: hoursAgo(1.4),
        metadata: { bookingId: 'RACE-TOW-HIST-TODAY', audience: 'driver' },
      },
      {
        id: 'pd-notif-001',
        type: 'FLEET_UPDATE',
        title: 'Fleet connected',
        message: `You are now part of ${PREVIEW_VENDOR.businessName}`,
        isRead: true,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { vendorId: PREVIEW_VENDOR.id, entityType: 'driver', audience: 'driver' },
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
  previewDriverStart =
    PREVIEW_DRIVER_START_POINTS[Math.floor(Math.random() * PREVIEW_DRIVER_START_POINTS.length)];
  useDriverPresenceStore.getState().setDriverLocation(null);
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

/** Open customer leads the vendor home and jobs screens should show immediately. */
export function getPreviewVendorOpenLeads(): DriverJobBooking[] {
  return state.vendorBookings
    .filter(booking => booking.status === 'REQUESTED' || booking.status === 'CONFIRMED')
    .map(booking => ({
      ...buildDriverJobFromBooking(booking, booking.status),
      vendorApproved: false,
    }));
}

export function getPreviewDriverJobOffers(): DriverJobBooking[] {
  return [...state.driverJobOffers];
}

export function getPreviewMockActiveJob(): DriverJobBooking | null {
  return state?.mockActiveJob ?? null;
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
      documents: [
        { type: 'aadhaar', status: 'VERIFIED', uploadedAt: '2026-10-09T09:12:00.000Z' },
        { type: 'pan', status: 'VERIFIED', uploadedAt: '2026-10-09T09:14:00.000Z' },
        { type: 'driving_license', status: 'VERIFIED', uploadedAt: '2026-10-09T09:16:00.000Z' },
        { type: 'vehicle_rc', status: 'VERIFIED', uploadedAt: '2026-10-09T09:18:00.000Z' },
        { type: 'vehicle_insurance', status: 'VERIFIED', uploadedAt: '2026-10-09T09:20:00.000Z' },
        { type: 'selfie', status: previewDriverApproved ? 'VERIFIED' : 'PENDING', uploadedAt: '2026-10-09T09:22:00.000Z' },
      ],
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
    documents: [
      {
        id: 'preview-doc-gst',
        documentType: 'gst',
        fileUrl: 'https://example.com/kalinga-gst.pdf',
        fileName: 'GST-Kalinga-Towing.pdf',
        mimeType: 'application/pdf',
        verificationStatus: 'approved',
        uploadedAt: d1,
      },
      {
        id: 'preview-doc-pan',
        documentType: 'pan',
        fileUrl: 'https://example.com/kalinga-pan.pdf',
        fileName: 'PAN-Bikram-Rout.pdf',
        mimeType: 'application/pdf',
        verificationStatus: 'approved',
        uploadedAt: d1,
      },
      {
        id: 'preview-doc-shop',
        documentType: 'shop_license',
        fileUrl: 'https://example.com/kalinga-shop.pdf',
        fileName: 'Shop-License.pdf',
        mimeType: 'application/pdf',
        verificationStatus: 'approved',
        uploadedAt: d1,
      },
      {
        id: 'preview-doc-cheque',
        documentType: 'cancelled_cheque',
        fileUrl: 'https://example.com/kalinga-cheque.pdf',
        fileName: 'Cancelled-Cheque.pdf',
        mimeType: 'application/pdf',
        verificationStatus: 'under_review',
        uploadedAt: d3,
      },
    ],
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
    documents: [
      {
        type: 'vehicle_rc',
        url: 'https://example.com/rc-1001.pdf',
        fileName: 'RC-OD02TOW1001.pdf',
        status: 'VERIFIED',
        uploadedAt: d1,
      },
      {
        type: 'vehicle_insurance',
        url: 'https://example.com/ins-1001.pdf',
        fileName: 'Insurance-OD02TOW1001.pdf',
        status: 'VERIFIED',
        uploadedAt: d1,
      },
    ],
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
    documents: [
      {
        type: 'fitness_certificate',
        url: 'https://example.com/fitness-1002.pdf',
        fileName: 'Fitness-OD02TOW1002.pdf',
        status: 'PENDING',
        uploadedAt: d3,
      },
      {
        type: 'puc',
        url: 'https://example.com/puc-1002.pdf',
        fileName: 'PUC-OD02TOW1002.pdf',
        status: 'VERIFIED',
        uploadedAt: d1,
      },
    ],
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
    isBusy: true,
    rating: PREVIEW_DRIVER.rating,
    loginId: PREVIEW_DRIVER.loginId,
    hasPasswordLogin: true,
  },
  {
    id: PREVIEW_DRIVER_TWO.id,
    vendorId: PREVIEW_VENDOR.id,
    name: PREVIEW_DRIVER_TWO.fullName,
    phone: PREVIEW_DRIVER_TWO.phone,
    email: PREVIEW_DRIVER_TWO.email,
    driverType: PREVIEW_DRIVER_TWO.driverType,
    licenseNo: PREVIEW_DRIVER_TWO.licenseNo,
    city: PREVIEW_DRIVER_TWO.city,
    vehicleRegistration: 'OD-02-TOW-1002',
    status: 'APPROVED',
    isAvailable: true,
    isBusy: false,
    rating: PREVIEW_DRIVER_TWO.rating,
    loginId: PREVIEW_DRIVER_TWO.loginId,
    hasPasswordLogin: true,
  },
];

export const PREVIEW_DRIVER_HISTORY: DriverJobBooking[] = [
  {
    bookingType: 'towing',
    id: 'RACE-TOW-HIST-TODAY',
    bookingNumber: 'TOW-10033',
    status: 'COMPLETED',
    serviceLabel: 'Instant Towing',
    pickup: {
      label: 'Master Canteen',
      address: 'Master Canteen, Bhubaneswar',
      latitude: 20.2701,
      longitude: 85.8436,
    },
    dropoff: {
      label: 'Jaydev Vihar',
      address: 'Jaydev Vihar, Bhubaneswar',
      latitude: 20.3018,
      longitude: 85.8189,
    },
    customer: { name: 'Ananya Das', mobileNumber: '+919900112233' },
    estimatedFare: 1650,
    finalFare: 1650,
    distanceKm: 7.4,
    createdAt: new Date(now.getTime() - 1000 * 60 * 90).toISOString(),
    vendorId: PREVIEW_VENDOR.id,
    vendorApproved: true,
  },
  {
    bookingType: 'towing',
    id: 'RACE-TOW-HIST-YDAY',
    bookingNumber: 'TOW-10028',
    status: 'COMPLETED',
    serviceLabel: 'Battery Assist',
    pickup: {
      label: 'KIIT Square',
      address: 'KIIT Square, Bhubaneswar',
      latitude: 20.355,
      longitude: 85.818,
    },
    dropoff: {
      label: 'Nandankanan Road',
      address: 'Nandankanan Road, Bhubaneswar',
      latitude: 20.395,
      longitude: 85.816,
    },
    customer: { name: 'Manoj Pradhan', mobileNumber: '+919811009988' },
    estimatedFare: 980,
    finalFare: 980,
    distanceKm: 5.2,
    createdAt: new Date(now.getTime() - 86400000).toISOString(),
    vendorId: PREVIEW_VENDOR.id,
    vendorApproved: true,
  },
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
    finalFare: 1250,
    distanceKm: 9.2,
    createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
    vendorId: PREVIEW_VENDOR.id,
    vendorApproved: true,
    customer: { name: 'Sneha Mohanty', mobileNumber: '+919833445566' },
  },
  {
    bookingType: 'towing',
    id: 'RACE-TOW-HIST-004',
    bookingNumber: 'TOW-10021',
    status: 'COMPLETED',
    serviceLabel: 'Accident Recovery',
    pickup: {
      label: 'Kalpana Square',
      address: 'Kalpana Square, Bhubaneswar',
      latitude: 20.264,
      longitude: 85.839,
    },
    dropoff: {
      label: 'Baramunda',
      address: 'Baramunda, Bhubaneswar',
      latitude: 20.275,
      longitude: 85.792,
    },
    customer: { name: 'Debasis Nayak', mobileNumber: '+919822334455' },
    estimatedFare: 2100,
    finalFare: 2100,
    distanceKm: 8.8,
    createdAt: new Date(now.getTime() - 86400000 * 4).toISOString(),
    vendorId: PREVIEW_VENDOR.id,
    vendorApproved: true,
  },
  {
    bookingType: 'towing',
    id: 'RACE-TOW-HIST-CANCELLED',
    bookingNumber: 'TOW-10018',
    status: 'CANCELLED',
    serviceLabel: 'Fuel Delivery',
    pickup: {
      label: 'Acharya Vihar',
      address: 'Acharya Vihar, Bhubaneswar',
      latitude: 20.3025,
      longitude: 85.819,
    },
    dropoff: {
      label: 'Acharya Vihar',
      address: 'Acharya Vihar, Bhubaneswar',
      latitude: 20.3025,
      longitude: 85.819,
    },
    customer: { name: 'Rakesh Sahoo', mobileNumber: '+919877665544' },
    estimatedFare: 540,
    distanceKm: 1.2,
    createdAt: new Date(now.getTime() - 86400000 * 5).toISOString(),
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
  atPickup: {
    latitude: PREVIEW_PLACES.mandideepPickup.latitude,
    longitude: PREVIEW_PLACES.mandideepPickup.longitude,
  },
  /** Roughly midway along Hoshangabad Road, between pickup and drop. */
  enRouteToDrop: { latitude: 23.1581, longitude: 77.4752 },
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

  const start = getPreviewDriverStart();
  let driverLocation: { latitude: number; longitude: number } = {
    latitude: start.latitude,
    longitude: start.longitude,
  };
  if (status === 'DRIVER_ARRIVED' || status === 'IN_PROGRESS') {
    driverLocation =
      status === 'IN_PROGRESS' ? PREVIEW_TRACKING_COORDS.enRouteToDrop : PREVIEW_TRACKING_COORDS.atPickup;
  }
  // The driver app's simulated GPS is the live source: the vendor sees the very
  // same vehicle position, not a canned dot.
  const live = useDriverPresenceStore.getState();
  if (live.simulationActive && live.driverLocation && activeTrip) {
    driverLocation = {
      latitude: live.driverLocation.latitude,
      longitude: live.driverLocation.longitude,
    };
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
