import { api } from '../api';
import { API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';
import { UI_PREVIEW_MODE, UI_PREVIEW_MUTATIONS_ENABLED } from '../../constants/preview';

export type VendorMembership = {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'DECLINED' | 'REVOKED' | 'EXPIRED';
  invitedAt: string;
  acceptedAt?: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    driverCode?: string;
    driverStatus?: string;
    driverType?: string;
    city?: string;
    rating?: number;
    isAvailable: boolean;
    isBusy: boolean;
  };
};

export type DriverVendorInvitation = {
  id: string;
  invitedAt: string;
  vendor: {
    id: string;
    name: string;
    ownerName?: string;
    address?: { line1?: string; line2?: string; city?: string; state?: string };
  };
};

export type DriverVendorMembership = {
  id: string;
  acceptedAt?: string;
  vendor: {
    id: string;
    name: string;
    ownerName?: string;
    address?: { line1?: string; line2?: string; city?: string; state?: string };
  };
};

export type DriverSearchResult = {
  id: string;
  name: string;
  phone: string;
  rawPhone: string;
  driverCode?: string;
  city?: string;
  experienceYears?: number;
  driverType: 'Full-Time' | 'Tow Driver';
  rating: number;
  isAvailable: boolean;
  isBusy: boolean;
  membershipStatus:
    | 'AVAILABLE_FOR_INVITE'
    | 'INVITED_PENDING'
    | 'ALREADY_IN_FLEET'
    | 'IN_ANOTHER_FLEET';
};

/* ------------------------------------------------------------------ *
 * Preview fixtures (P1 QA): the membership UI previously had no demo  *
 * state at all, so every mock walkthrough showed honest errors. These *
 * fixtures mirror the real API contracts and flip together with the   *
 * rest of the preview system — real API responses always win.         *
 * ------------------------------------------------------------------ */

const MOCK_INVITED_AT = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();

const MOCK_VENDOR_MEMBERSHIPS: VendorMembership[] = [
  {
    id: 'mock-membership-active-1',
    status: 'ACTIVE',
    invitedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    acceptedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    driver: {
      id: 'mock-driver-bikram-team-1',
      name: 'Rakesh Sahoo',
      phone: '+919876123401',
      email: 'rakesh.sahoo@racepartner.test',
      driverCode: 'RC-DR-1042',
      driverStatus: 'APPROVED',
      driverType: 'Tow Driver',
      city: 'Bhubaneswar',
      rating: 4.8,
      isAvailable: true,
      isBusy: false,
    },
  },
  {
    id: 'mock-membership-active-2',
    status: 'ACTIVE',
    invitedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    acceptedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    driver: {
      id: 'mock-driver-bikram-team-2',
      name: 'Debasis Naik',
      phone: '+919876123402',
      email: 'debasis.naik@racepartner.test',
      driverCode: 'RC-DR-1057',
      driverStatus: 'APPROVED',
      driverType: 'Full-Time',
      city: 'Cuttack',
      rating: 4.6,
      isAvailable: false,
      isBusy: true,
    },
  },
  {
    id: 'mock-membership-pending-1',
    status: 'PENDING',
    invitedAt: MOCK_INVITED_AT,
    driver: undefined,
  },
];

const MOCK_DRIVER_INVITATIONS: DriverVendorInvitation[] = [
  {
    id: 'mock-invitation-1',
    invitedAt: MOCK_INVITED_AT,
    vendor: {
      id: 'mock-vendor-001',
      name: 'Kalinga Towing & Roadside Services',
      ownerName: 'Amit Pattnaik',
      address: {
        line1: 'Unit 4, Master Canteen Square',
        city: 'Bhubaneswar',
        state: 'Odisha',
      },
    },
  },
];

const MOCK_DRIVER_MEMBERSHIP: DriverVendorMembership = {
  id: 'mock-membership-active-1',
  acceptedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  vendor: {
    id: 'mock-vendor-001',
    name: 'Kalinga Towing & Roadside Services',
    ownerName: 'Amit Pattnaik',
    address: {
      line1: 'Unit 4, Master Canteen Square',
      city: 'Bhubaneswar',
      state: 'Odisha',
    },
  },
};

/** Mutated preview state — invite/accept flows update this so the UI responds. */
const previewMemberships = [...MOCK_VENDOR_MEMBERSHIPS];
let previewInvitations = [...MOCK_DRIVER_INVITATIONS];
const previewDriverMembership: { current: DriverVendorMembership | null } = { current: null };

const MOCK_SEARCHABLE_DRIVERS: DriverSearchResult[] = [
  {
    id: 'mock-driver-bikram-team-1',
    name: 'Rakesh Sahoo',
    phone: '+91 98*** 12345',
    rawPhone: '+919876123401',
    driverCode: 'RC-DR-1042',
    driverType: 'Tow Driver',
    city: 'Bhubaneswar',
    experienceYears: 4,
    rating: 4.8,
    isAvailable: true,
    isBusy: false,
    membershipStatus: 'ALREADY_IN_FLEET',
  },
  {
    id: 'mock-driver-bikram-team-2',
    name: 'Debasis Naik',
    phone: '+91 98*** 12346',
    rawPhone: '+919876123402',
    driverCode: 'RC-DR-1057',
    driverType: 'Full-Time',
    city: 'Cuttack',
    experienceYears: 6,
    rating: 4.6,
    isAvailable: false,
    isBusy: true,
    membershipStatus: 'ALREADY_IN_FLEET',
  },
  {
    id: 'mock-driver-ft-available-1',
    name: 'Manas Ranjan Jena',
    phone: '+91 94*** 98765',
    rawPhone: '+919437198765',
    driverCode: 'RC-DR-1088',
    driverType: 'Full-Time',
    city: 'Bhubaneswar',
    experienceYears: 5,
    rating: 4.9,
    isAvailable: true,
    isBusy: false,
    membershipStatus: 'AVAILABLE_FOR_INVITE',
  },
  {
    id: 'mock-driver-ft-available-2',
    name: 'Satyajit Mohanty',
    phone: '+91 82*** 54321',
    rawPhone: '+918249054321',
    driverCode: 'RC-DR-1094',
    driverType: 'Full-Time',
    city: 'Puri',
    experienceYears: 3,
    rating: 4.7,
    isAvailable: true,
    isBusy: false,
    membershipStatus: 'AVAILABLE_FOR_INVITE',
  },
];

export async function listVendorMemberships(): Promise<VendorMembership[]> {
  try {
    const { data } = await api.get<ApiSuccessResponse<VendorMembership[]>>(
      API_ENDPOINTS.vendorDriverMemberships,
    );
    return data.data ?? [];
  } catch (error) {
    if (UI_PREVIEW_MODE) return previewMemberships;
    throw error;
  }
}

export async function searchVendorDrivers(query: string): Promise<DriverSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  try {
    const { data } = await api.get<ApiSuccessResponse<DriverSearchResult[]>>(
      API_ENDPOINTS.vendorDriverSearch,
      { params: { q: trimmed } },
    );
    return data.data ?? [];
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      const q = trimmed.toLowerCase();
      const digits = trimmed.replace(/\D/g, '');
      return MOCK_SEARCHABLE_DRIVERS.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.driverCode && d.driverCode.toLowerCase().includes(q)) ||
        (digits.length >= 2 && d.rawPhone.includes(digits)),
      );
    }
    throw error;
  }
}

export async function inviteVendorDriver(phone: string): Promise<{ accepted: boolean; message: string }> {
  try {
    const { data } = await api.post<ApiSuccessResponse<{ accepted: boolean; message: string }>>(
      API_ENDPOINTS.vendorDriverInvite,
      { phone },
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      const normalized = phone.replace(/\D/g, '').slice(-10);
      const existing = previewMemberships.find(
        (membership) => membership.driver?.phone.endsWith(normalized),
      );
      if (existing) {
        return {
          accepted: false,
          message: 'This Driver is already on your fleet or has a pending invitation.',
        };
      }
      previewMemberships.push({
        id: `mock-membership-pending-${Date.now()}`,
        status: 'PENDING',
        invitedAt: new Date().toISOString(),
        driver: undefined,
      });
      return {
        accepted: true,
        message: `If a verified Driver matches +91 ${normalized}, an invitation has been sent.`,
      };
    }
    throw error;
  }
}

export async function revokeVendorDriverMembership(id: string): Promise<void> {
  try {
    await api.delete(API_ENDPOINTS.vendorDriverMembershipRevoke(id));
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      const index = previewMemberships.findIndex((membership) => membership.id === id);
      if (index >= 0) previewMemberships.splice(index, 1);
      return;
    }
    throw error;
  }
}

export async function listDriverVendorInvitations(): Promise<DriverVendorInvitation[]> {
  try {
    const { data } = await api.get<ApiSuccessResponse<DriverVendorInvitation[]>>(
      API_ENDPOINTS.vendorDriverInvitations,
    );
    return data.data ?? [];
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      // Once the driver accepts in preview, the invitation disappears —
      // matching the real lifecycle.
      return previewDriverMembership.current ? [] : previewInvitations;
    }
    throw error;
  }
}

export async function getDriverVendorMembership(): Promise<DriverVendorMembership | null> {
  try {
    const { data } = await api.get<ApiSuccessResponse<DriverVendorMembership | null>>(
      API_ENDPOINTS.driverVendorMembership,
    );
    return data.data ?? null;
  } catch (error) {
    if (UI_PREVIEW_MODE) return previewDriverMembership.current ?? MOCK_DRIVER_MEMBERSHIP;
    throw error;
  }
}

export async function respondToVendorInvitation(
  id: string,
  decision: 'accept' | 'decline',
): Promise<{ id: string; status: string; decidedAt?: string }> {
  try {
    const { data } = await api.post<ApiSuccessResponse<{ id: string; status: string; decidedAt?: string }>>(
      API_ENDPOINTS.driverVendorInvitationRespond(id),
      { decision },
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      previewInvitations = previewInvitations.filter((invitation) => invitation.id !== id);
      if (decision === 'accept') {
        previewDriverMembership.current = {
          ...MOCK_DRIVER_MEMBERSHIP,
          acceptedAt: new Date().toISOString(),
        };
      }
      return {
        id,
        status: decision === 'accept' ? 'ACTIVE' : 'DECLINED',
        decidedAt: new Date().toISOString(),
      };
    }
    throw error;
  }
}
