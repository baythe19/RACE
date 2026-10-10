import { api } from '../api';
import { API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';
import { UI_PREVIEW_MODE } from '../../config/uiPreviewMode';
import { MOCK_VENDOR_VEHICLES } from '../../data/mockPartnerData';

export type FleetVehicleStatus = 'ACTIVE' | 'UNDER_MAINTENANCE' | 'INACTIVE';

export type FleetVehicle = {
  id: string;
  vendorId: string;
  registrationNo: string;
  type: string;
  model: string;
  year?: number;
  status: FleetVehicleStatus | string;
  insuranceExpiry?: string;
  maintenanceNote?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateFleetVehicleInput = {
  registrationNo: string;
  type: string;
  model: string;
  year?: number;
  status?: FleetVehicleStatus;
  insuranceExpiry?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  rcNumber?: string;
};

export async function listVendorVehicles(): Promise<FleetVehicle[]> {
  try {
    const { data } = await api.get<ApiSuccessResponse<FleetVehicle[]>>(
      API_ENDPOINTS.vendorVehicles,
    );
    return data.data ?? [];
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      return MOCK_VENDOR_VEHICLES;
    }
    throw error;
  }
}

export type UpdateFleetVehicleInput = {
  type?: string;
  model?: string;
  year?: number;
  status?: FleetVehicleStatus;
  insuranceExpiry?: string;
  maintenanceNote?: string;
};

export async function createVendorVehicle(
  payload: CreateFleetVehicleInput,
): Promise<FleetVehicle> {
  try {
    const { data } = await api.post<ApiSuccessResponse<FleetVehicle>>(
      API_ENDPOINTS.vendorVehicles,
      payload,
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      const newVeh: FleetVehicle = {
        id: `veh-${Date.now()}`,
        vendorId: 'mock-vendor-001',
        registrationNo: payload.registrationNo,
        type: payload.type,
        model: payload.model,
        year: payload.year ?? new Date().getFullYear(),
        status: payload.status ?? 'ACTIVE',
        insuranceExpiry: payload.insuranceExpiry ?? '2027-01-01',
        createdAt: new Date().toISOString(),
      };
      MOCK_VENDOR_VEHICLES.unshift(newVeh);
      return newVeh;
    }
    throw error;
  }
}

export async function updateVendorVehicle(
  vehicleId: string,
  payload: UpdateFleetVehicleInput,
): Promise<FleetVehicle> {
  try {
    const { data } = await api.put<ApiSuccessResponse<FleetVehicle>>(
      API_ENDPOINTS.vendorVehicle(vehicleId),
      payload,
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      const found = MOCK_VENDOR_VEHICLES.find(v => v.id === vehicleId);
      if (found) {
        if (payload.type) found.type = payload.type;
        if (payload.model) found.model = payload.model;
        if (payload.status) found.status = payload.status;
      }
      return found ?? MOCK_VENDOR_VEHICLES[0]!;
    }
    throw error;
  }
}

export async function removeVendorVehicle(vehicleId: string): Promise<void> {
  try {
    await api.delete(API_ENDPOINTS.vendorVehicle(vehicleId));
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      const idx = MOCK_VENDOR_VEHICLES.findIndex(v => v.id === vehicleId);
      if (idx !== -1) MOCK_VENDOR_VEHICLES.splice(idx, 1);
      return;
    }
    throw error;
  }
}
