import { api } from '../api';
import { API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';
import { UI_PREVIEW_MODE, UI_PREVIEW_MUTATIONS_ENABLED } from '../../constants/preview';
import { getDriverVendorPreviewScenario } from './driverVendorPreview';
import {
  getPreviewDriverInvitations,
  getPreviewDriverVendorMembership,
  getPreviewMemberships,
  getPreviewSearchableDrivers,
  previewInviteDriverByPhone,
  previewRespondToVendorInvitation,
  previewRevokeMembership,
} from '../../data/previewPartnerWorld';

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
  maskedPhone?: string;
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

/* Preview: linked Bikram ↔ Abhishek world in `previewPartnerWorld.ts`. */

export async function listVendorMemberships(): Promise<VendorMembership[]> {
  if (UI_PREVIEW_MODE) return getPreviewMemberships();
  try {
    const { data } = await api.get<ApiSuccessResponse<VendorMembership[]>>(
      API_ENDPOINTS.vendorDriverMemberships,
    );
    return data.data ?? [];
  } catch (error) {
    if (UI_PREVIEW_MODE) return getPreviewMemberships();
    throw error;
  }
}

export async function searchVendorDrivers(query: string): Promise<DriverSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  if (UI_PREVIEW_MODE) {
    const q = trimmed.toLowerCase();
    const digits = trimmed.replace(/\D/g, '');
    return getPreviewSearchableDrivers().filter(d =>
      d.name.toLowerCase().includes(q) ||
      (d.driverCode && d.driverCode.toLowerCase().includes(q)) ||
      (digits.length >= 2 && d.rawPhone.includes(digits)),
    );
  }
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
      return getPreviewSearchableDrivers().filter(d =>
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
      const result = previewInviteDriverByPhone(phone);
      return { accepted: result.ok, message: result.message };
    }
    throw error;
  }
}

export async function revokeVendorDriverMembership(id: string): Promise<void> {
  try {
    await api.delete(API_ENDPOINTS.vendorDriverMembershipRevoke(id));
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      previewRevokeMembership(id);
      return;
    }
    throw error;
  }
}

export async function listDriverVendorInvitations(): Promise<DriverVendorInvitation[]> {
  if (UI_PREVIEW_MODE) {
    if (getDriverVendorPreviewScenario() !== 'request') return [];
    return getPreviewDriverInvitations();
  }
  try {
    const { data } = await api.get<ApiSuccessResponse<DriverVendorInvitation[]>>(
      API_ENDPOINTS.vendorDriverInvitations,
    );
    return data.data ?? [];
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      if (getDriverVendorPreviewScenario() !== 'request') return [];
      return getPreviewDriverInvitations();
    }
    throw error;
  }
}

export async function getDriverVendorMembership(): Promise<DriverVendorMembership | null> {
  if (UI_PREVIEW_MODE) {
    const previewScenario = getDriverVendorPreviewScenario();
    if (previewScenario === 'connected' || previewScenario === 'assignment') {
      return getPreviewDriverVendorMembership();
    }
    return null;
  }
  try {
    const { data } = await api.get<ApiSuccessResponse<DriverVendorMembership | null>>(
      API_ENDPOINTS.driverVendorMembership,
    );
    return data.data ?? null;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      const previewScenario = getDriverVendorPreviewScenario();
      if (previewScenario === 'connected' || previewScenario === 'assignment') {
        return getPreviewDriverVendorMembership();
      }
      return null;
    }
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
      previewRespondToVendorInvitation(id, decision);
      return {
        id,
        status: decision === 'accept' ? 'ACTIVE' : 'DECLINED',
        decidedAt: new Date().toISOString(),
      };
    }
    throw error;
  }
}
