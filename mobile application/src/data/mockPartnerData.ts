import type { DriverJobBooking } from '../services/driver/driverApi';
import type { FleetVehicle } from '../services/vendor/vendorVehiclesApi';
import type { VendorDriver } from '../services/vendor/vendorDriversApi';
import type { VendorBookingItem } from '../services/vendor/vendorBookingsApi';
import type { VendorDashboardStats } from '../services/vendor/vendorApi';
import type { VendorProfileResponse } from '../types/vendor';
import type { AuthUser } from '../types/auth';
import type { Profile } from '../types/models';
import { UI_PREVIEW_DRIVER_STATUS } from '../constants/preview';

const previewDriverApproved = UI_PREVIEW_DRIVER_STATUS === 'APPROVED';

export const MOCK_DRIVER_USER: AuthUser = {
  id: 'mock-driver-001',
  mobileNumber: '+918888880001',
  fullName: 'Om Singh',
  email: 'om.singh@raceservice.com',
  role: 'driver',
  gender: 'male',
  isVerified: true,
  isProfileCompleted: true,
};

export const MOCK_DRIVER_PROFILE: Profile = {
  id: 'mock-driver-001',
  mobileNumber: '+918888880001',
  fullName: 'Om Singh',
  email: 'om.singh@raceservice.com',
  gender: 'male',
  role: 'driver',
  isVerified: true,
  isProfileCompleted: true,
  isAvailable: true,
  address: {
    line1: 'Plot 22, Master Canteen Area',
    city: 'Bhubaneswar',
    state: 'Odisha',
    pincode: '751001',
    country: 'India',
  },
  // Preview-only driver record, shaped exactly like GET /api/v1/profile returns
  // it. The reference journey is approved by default; set
  // EXPO_PUBLIC_UI_PREVIEW_DRIVER_STATUS=PENDING to exercise the gate.
  driverProfile: {
    status: UI_PREVIEW_DRIVER_STATUS,
    driverCode: 'DRV0042',
    driverType: 'Tow Driver',
    licenseNo: 'OD-0220190012345',
    city: 'Bhubaneswar',
    state: 'Odisha',
    vehicleRegistration: 'OD 02 AB 1234',
    policeVerificationStatus: previewDriverApproved ? 'VERIFIED' : 'PENDING',
    documents: previewDriverApproved
      ? [
          { type: 'driving_license', status: 'VERIFIED', uploadedAt: '2026-10-09T09:12:00.000Z' },
          { type: 'vehicle_insurance', status: 'VERIFIED', uploadedAt: '2026-10-09T09:12:00.000Z' },
          { type: 'rc', status: 'VERIFIED', uploadedAt: '2026-10-09T09:12:00.000Z' },
        ]
      : [
          { type: 'driving_license', status: 'VERIFIED', uploadedAt: '2026-10-09T09:12:00.000Z' },
          { type: 'vehicle_insurance', status: 'PENDING', uploadedAt: '2026-10-09T09:12:00.000Z' },
          { type: 'rc', status: 'PENDING', uploadedAt: '2026-10-09T09:12:00.000Z' },
        ],
    statusHistory: [{ status: UI_PREVIEW_DRIVER_STATUS, changedAt: '2026-10-09T09:12:00.000Z' }],
    submittedAt: '2026-10-09T09:12:00.000Z',
  },
};

export const MOCK_VENDOR_USER: AuthUser = {
  id: 'mock-vendor-001',
  mobileNumber: '+919812345670',
  fullName: 'Bikram Keshari Rout',
  email: 'vendor@kalingatowing.com',
  role: 'vendor',
  gender: 'male',
  isVerified: true,
  isProfileCompleted: true,
};

export const MOCK_VENDOR_PROFILE: Profile = {
  id: 'mock-vendor-001',
  mobileNumber: '+919812345670',
  fullName: 'Bikram Keshari Rout',
  email: 'vendor@kalingatowing.com',
  gender: 'male',
  role: 'vendor',
  isVerified: true,
  isProfileCompleted: true,
  address: {
    line1: 'Plot 104, Rasulgarh Industrial Estate',
    city: 'Bhubaneswar',
    state: 'Odisha',
    pincode: '751010',
    country: 'India',
  },
};

const now = new Date();
const d1 = new Date(now.getTime() - 86400000 * 3).toISOString();
const d2 = new Date(now.getTime() - 86400000 * 2).toISOString();
const d3 = new Date(now.getTime() - 86400000 * 1).toISOString();

export const MOCK_VENDOR_STATUS: VendorProfileResponse = {
  id: 'mock-vendor-001',
  userId: 'mock-vendor-001',
  vendorType: 'towing_company',
  status: 'approved',
  verificationStage: 'approved',
  businessName: 'Kalinga Towing & Logistics Services',
  ownerName: 'Bikram Keshari Rout',
  mobileNumber: '+919812345670',
  email: 'vendor@kalingatowing.com',
  address: 'Plot 104, Rasulgarh Industrial Estate, Bhubaneswar',
  bankDetails: {
    accountHolderName: 'Kalinga Towing Services',
    accountNumber: '91881234567890',
    ifsc: 'SBIN0001234',
    bankName: 'State Bank of India',
  },
  statusHistory: [
    { status: 'submitted', changedAt: d1, note: 'Registration documents submitted' },
    { status: 'document_review', changedAt: d2, note: 'Document verification completed' },
    { status: 'approved', changedAt: d3, note: 'Partner verified & approved for dispatch' },
  ],
  documents: [
    {
      id: 'doc-1',
      documentType: 'shop_license',
      fileUrl: 'https://placehold.co/600x400/png',
      verificationStatus: 'approved',
      uploadedAt: d1,
    },
    {
      id: 'doc-2',
      documentType: 'pan',
      fileUrl: 'https://placehold.co/600x400/png',
      verificationStatus: 'approved',
      uploadedAt: d1,
    },
    {
      id: 'doc-3',
      documentType: 'gst',
      fileUrl: 'https://placehold.co/600x400/png',
      verificationStatus: 'approved',
      uploadedAt: d1,
    },
    {
      id: 'doc-4',
      documentType: 'aadhaar',
      fileUrl: 'https://placehold.co/600x400/png',
      verificationStatus: 'approved',
      uploadedAt: d1,
    },
  ],
  submittedAt: d1,
  approvedAt: d3,
  createdAt: d1,
  updatedAt: d3,
};

export const MOCK_VENDOR_DASHBOARD: VendorDashboardStats = {
  jobsToday: 3,
  earningsToday: 4250,
  earningsTotal: 48200,
};

/**
 * Preview starts on the request-first Dashboard board. The active trip is
 * created by accepting a request (or explicitly by the UI QA jump), matching
 * the real driver journey instead of showing an active card on first launch.
 */
export let mockActiveJobState: DriverJobBooking | null = null;

const MOCK_ACTIVE_JOB_TEMPLATE: DriverJobBooking = {
  bookingType: 'towing',
  id: 'RACE-TOW-MOCK-004',
  bookingNumber: 'TOW-10048',
  status: 'DRIVER_EN_ROUTE',
  serviceLabel: 'Accident recovery tow',
  pickup: {
    label: 'Saheed Nagar Commercial Center',
    address: 'Janpath Road, Saheed Nagar, Bhubaneswar',
    latitude: 20.2891,
    longitude: 85.8412,
  },
  dropoff: {
    label: 'Mancheswar Industrial Workshop',
    address: 'Sector B, Mancheswar, Bhubaneswar',
    latitude: 20.3204,
    longitude: 85.8678,
  },
  customer: {
    name: 'Rohit Sharma',
    mobileNumber: '+919876543210',
  },
  estimatedFare: 1650,
  distanceKm: 5.4,
  statusHistory: [
    {
      status: 'DRIVER_ASSIGNED',
      timestamp: new Date(now.getTime() - 1000 * 60 * 44).toISOString(),
    },
    {
      status: 'DRIVER_EN_ROUTE',
      timestamp: new Date(now.getTime() - 1000 * 60 * 42).toISOString(),
    },
  ],
  createdAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
  vendorId: 'mock-vendor-001',
  assignedFleetVehicleLabel: 'Tata 407 (OD-02-TOW-1001)',
  vendorApproved: true,
};

export function updateMockActiveJobStatus(nextStatus: string): DriverJobBooking | null {
  if (mockActiveJobState) {
    const statusHistory = [
      ...(mockActiveJobState.statusHistory ?? []),
      { status: nextStatus, timestamp: new Date().toISOString() },
    ];
    mockActiveJobState = {
      ...mockActiveJobState,
      status: nextStatus,
      statusHistory,
      ...(nextStatus === 'COMPLETED'
        ? { finalFare: mockActiveJobState.finalFare ?? mockActiveJobState.estimatedFare }
        : {}),
    };
  }
  return mockActiveJobState;
}

export const MOCK_DRIVER_JOBS: DriverJobBooking[] = [
  {
    bookingType: 'towing',
    id: 'RACE-TOW-MOCK-002',
    bookingNumber: 'TOW-10042',
    status: 'COMPLETED',
    serviceLabel: 'Wheel-Lift Towing',
    pickup: {
      label: 'Station Square',
      address: 'Station Square, Bhubaneswar',
      latitude: 20.3012,
      longitude: 85.8234,
    },
    dropoff: {
      label: 'Patia',
      address: 'Patia, Bhubaneswar',
      latitude: 20.2911,
      longitude: 85.8567,
    },
    estimatedFare: 1400,
    distanceKm: 8.5,
    createdAt: new Date(now.getTime() - 86400000 * 3).toISOString(),
    vendorApproved: true,
  },
  {
    bookingType: 'driver',
    id: 'RACE-TOW-MOCK-003',
    bookingNumber: 'TOW-10039',
    status: 'COMPLETED',
    serviceLabel: 'Wheel-Lift Towing',
    pickup: {
      label: 'Jaydev Vihar',
      address: 'Jaydev Vihar, Bhubaneswar',
      latitude: 20.2789,
      longitude: 85.7981,
    },
    dropoff: {
      label: 'Rasulgarh',
      address: 'Rasulgarh, Bhubaneswar',
      latitude: 20.2845,
      longitude: 85.8456,
    },
    estimatedFare: 1200,
    distanceKm: 6.2,
    createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
    vendorApproved: true,
  },
];

export const MOCK_JOB_OFFERS: DriverJobBooking[] = [
  {
    bookingType: 'towing',
    id: 'RACE-TOW-MOCK-004',
    bookingNumber: 'TOW-10048',
    status: 'DRIVER_ASSIGNED',
    serviceLabel: 'Accident recovery tow',
    pickup: {
      label: 'Saheed Nagar Commercial Center',
      address: 'Janpath Road, Saheed Nagar, Bhubaneswar',
      latitude: 20.2891,
      longitude: 85.8412,
    },
    dropoff: {
      label: 'Mancheswar Industrial Workshop',
      address: 'Sector B, Mancheswar, Bhubaneswar',
      latitude: 20.3204,
      longitude: 85.8678,
    },
    customer: {
      name: 'Rohit Sharma',
      mobileNumber: '+919876543210',
    },
    estimatedFare: 1650,
    // Reference-board fixture: the first request is the same 5.4 km trip
    // shown on Dashboard, Jobs, and the en-route board.
    distanceKm: 5.4,
    createdAt: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
    vendorApproved: false,
  },
  {
    bookingType: 'towing',
    id: 'RACE-TOW-MOCK-005',
    bookingNumber: 'TOW-10049',
    status: 'DRIVER_ASSIGNED',
    serviceLabel: 'Flat Tyre & Wheel Tow',
    pickup: {
      label: 'Chandrasekharpur Petrol Pump',
      address: 'Damana Square, Chandrasekharpur, Bhubaneswar',
      latitude: 20.3341,
      longitude: 85.8198,
    },
    dropoff: {
      label: 'Patia Service Bay',
      address: 'KIIT Square, Patia, Bhubaneswar',
      latitude: 20.3542,
      longitude: 85.8182,
    },
    estimatedFare: 1200,
    distanceKm: 5.4,
    createdAt: new Date(now.getTime() - 1000 * 60 * 2).toISOString(),
    vendorApproved: false,
  },
];

let mockJobOffersState = [...MOCK_JOB_OFFERS];

/** Seed the active board only when a QA shortcut explicitly asks for it. */
export function ensureMockDriverActiveJob(): DriverJobBooking | null {
  if (mockActiveJobState && !['COMPLETED', 'RATED', 'PAID', 'CANCELLED'].includes(mockActiveJobState.status)) {
    return mockActiveJobState;
  }

  const offer = mockJobOffersState[0] ?? MOCK_ACTIVE_JOB_TEMPLATE;
  const acceptedAt = new Date().toISOString();
  mockActiveJobState = {
    ...offer,
    status: 'DRIVER_EN_ROUTE',
    statusHistory: [
      { status: 'DRIVER_ASSIGNED', timestamp: offer.createdAt },
      { status: 'DRIVER_EN_ROUTE', timestamp: acceptedAt },
    ],
  };
  mockJobOffersState = mockJobOffersState.filter(job => job.id !== offer.id);
  return mockActiveJobState;
}

/** Promote a preview offer into the same active-job state used by the trip flow. */
export function acceptMockDriverJob(
  bookingId: string,
  bookingType: DriverJobBooking['bookingType'],
): DriverJobBooking | null {
  // A driver cannot accept another job while an active trip is in progress
  if (
    mockActiveJobState &&
    !['COMPLETED', 'RATED', 'PAID', 'CANCELLED'].includes(mockActiveJobState.status)
  ) {
    return null;
  }

  const offer = mockJobOffersState.find(
    job => job.id === bookingId && job.bookingType === bookingType,
  );
  if (!offer) return null;

  const acceptedAt = new Date().toISOString();
  mockActiveJobState = {
    ...offer,
    status: 'DRIVER_EN_ROUTE',
    statusHistory: [
      { status: 'DRIVER_ASSIGNED', timestamp: offer.createdAt },
      { status: 'DRIVER_EN_ROUTE', timestamp: acceptedAt },
    ],
  };
  mockJobOffersState = mockJobOffersState.filter(job => job.id !== bookingId);
  return mockActiveJobState;
}

export function rejectMockDriverJob(bookingId: string): void {
  mockJobOffersState = mockJobOffersState.filter(job => job.id !== bookingId);
}

export function getMockDriverJobOffers(): DriverJobBooking[] {
  return mockJobOffersState;
}

export const MOCK_VENDOR_VEHICLES: FleetVehicle[] = [
  {
    id: 'veh-001',
    vendorId: 'mock-vendor-001',
    registrationNo: 'OD-02-TOW-1001',
    type: 'Flatbed Tow Truck',
    model: 'Tata 407 Recovery',
    year: 2022,
    status: 'ACTIVE',
    insuranceExpiry: '2027-05-15',
    createdAt: d1,
  },
  {
    id: 'veh-002',
    vendorId: 'mock-vendor-001',
    registrationNo: 'OD-02-TOW-1002',
    type: 'Wheel-Lift Tow Truck',
    model: 'Mahindra Bolero Maxi Truck',
    year: 2021,
    status: 'ACTIVE',
    insuranceExpiry: '2026-11-20',
    createdAt: d1,
  },
];

/** Preview-only fleet bookings list (awaiting driver / assigned / completed states). */
export const MOCK_VENDOR_BOOKINGS: VendorBookingItem[] = [
  {
    bookingType: 'towing',
    id: 'RACE-VND-BKG-001',
    bookingNumber: 'TOW-10048',
    status: 'DRIVER_EN_ROUTE',
    serviceLabel: 'Instant Towing',
    pickup: {
      address: 'Janpath Road, Saheed Nagar, Bhubaneswar',
    },
    dropoff: {
      address: 'Sector B, Mancheswar, Bhubaneswar',
    },
    estimatedFare: 1650,
    createdAt: new Date(now.getTime() - 1000 * 60 * 40).toISOString(),
    assignedFleetVehicleLabel: 'OD 02 TOW 1001 · Flatbed Tow Truck · Tata 407 Recovery',
    driver: {
      id: 'mock-driver-001',
      name: 'Om Singh',
      phone: '+918888880001',
      rating: 4.9,
    },
  },
  {
    bookingType: 'towing',
    id: 'RACE-VND-BKG-002',
    bookingNumber: 'TOW-10040',
    status: 'COMPLETED',
    serviceLabel: 'Instant Towing',
    pickup: {
      address: 'Vani Vihar Square, Bhubaneswar',
    },
    dropoff: {
      address: 'Rasulgarh Industrial Estate, Bhubaneswar',
    },
    estimatedFare: 1250,
    finalFare: 1250,
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 26).toISOString(),
    assignedFleetVehicleLabel: 'OD 02 TOW 1002 · Wheel-Lift Tow Truck · Mahindra Bolero Maxi Truck',
    driver: {
      id: 'mock-driver-002',
      name: 'Ramesh Kumar',
      phone: '+918888880002',
      rating: 4.8,
    },
  },
  {
    bookingType: 'driver',
    id: 'RACE-VND-BKG-003',
    bookingNumber: 'DRV-1024',
    status: 'DRIVER_EN_ROUTE',
    serviceLabel: 'Full-Time Driver',
    pickup: {
      address: 'Khandagiri Square, Bhubaneswar',
    },
    estimatedFare: 2400,
    createdAt: new Date(now.getTime() - 1000 * 60 * 90).toISOString(),
    driver: {
      id: 'mock-driver-002',
      name: 'Ramesh Kumar',
      phone: '+918888880002',
      rating: 4.8,
    },
  },
];

export const MOCK_VENDOR_DRIVERS: VendorDriver[] = [
  {
    id: 'mock-driver-001',
    vendorId: 'mock-vendor-001',
    name: 'Om Singh',
    phone: '+918888880001',
    email: 'om.singh@raceservice.com',
    driverType: 'Tow Driver',
    licenseNo: 'OD-02-DL-20180001',
    city: 'Bhubaneswar',
    vehicleRegistration: 'OD-02-TOW-1001',
    status: 'APPROVED',
    isAvailable: true,
    isBusy: true,
    rating: 4.9,
    loginId: 'DRV-TOW-001',
    hasPasswordLogin: true,
  },
  {
    id: 'mock-driver-002',
    vendorId: 'mock-vendor-001',
    name: 'Ramesh Kumar',
    phone: '+918888880002',
    email: 'ramesh.kumar@raceservice.com',
    driverType: 'Full-Time',
    licenseNo: 'OD-02-DL-20190002',
    city: 'Bhubaneswar',
    vehicleRegistration: 'OD-02-TOW-1002',
    status: 'APPROVED',
    isAvailable: true,
    isBusy: false,
    rating: 4.8,
    loginId: 'DRV-CHF-002',
    hasPasswordLogin: true,
  },
];
