import { api } from '../api';
import { API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';

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

export async function listVendorMemberships(): Promise<VendorMembership[]> {
  const { data } = await api.get<ApiSuccessResponse<VendorMembership[]>>(
    API_ENDPOINTS.vendorDriverMemberships,
  );
  return data.data ?? [];
}

export async function inviteVendorDriver(phone: string): Promise<{ accepted: boolean; message: string }> {
  const { data } = await api.post<ApiSuccessResponse<{ accepted: boolean; message: string }>>(
    API_ENDPOINTS.vendorDriverInvite,
    { phone },
  );
  return data.data;
}

export async function revokeVendorDriverMembership(id: string): Promise<void> {
  await api.delete(API_ENDPOINTS.vendorDriverMembershipRevoke(id));
}

export async function listDriverVendorInvitations(): Promise<DriverVendorInvitation[]> {
  const { data } = await api.get<ApiSuccessResponse<DriverVendorInvitation[]>>(
    API_ENDPOINTS.vendorDriverInvitations,
  );
  return data.data ?? [];
}

export async function getDriverVendorMembership(): Promise<DriverVendorMembership | null> {
  const { data } = await api.get<ApiSuccessResponse<DriverVendorMembership | null>>(
    API_ENDPOINTS.driverVendorMembership,
  );
  return data.data ?? null;
}

export async function respondToVendorInvitation(
  id: string,
  decision: 'accept' | 'decline',
): Promise<{ id: string; status: string; decidedAt?: string }> {
  const { data } = await api.post<ApiSuccessResponse<{ id: string; status: string; decidedAt?: string }>>(
    API_ENDPOINTS.driverVendorInvitationRespond(id),
    { decision },
  );
  return data.data;
}
