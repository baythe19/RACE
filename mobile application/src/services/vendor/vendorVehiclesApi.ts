import { api } from '../api';
import { API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';
import { UI_PREVIEW_MODE, UI_PREVIEW_MUTATIONS_ENABLED } from '../../constants/preview';
import { MOCK_VENDOR_VEHICLES } from '../../data/mockPartnerData';

export type FleetVehicleStatus = 'ACTIVE' | 'UNDER_MAINTENANCE' | 'INACTIVE';
export type VendorVehicleDocumentType =
  | 'vehicle_rc'
  | 'vehicle_insurance'
  | 'fitness_certificate'
  | 'puc'
  | 'commercial_permit'
  | 'vehicle_photo';

export type FleetVehicleDocument = {
  type: VendorVehicleDocumentType;
  url: string;
  fileName: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  uploadedAt?: string;
};

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
  documents?: FleetVehicleDocument[];
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
  year?: number | null;
  status?: FleetVehicleStatus;
  insuranceExpiry?: string | null;
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
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      const newVeh: FleetVehicle = {
        id: `veh-${Date.now()}`,
        vendorId: 'mock-vendor-001',
        registrationNo: payload.registrationNo,
        type: payload.type,
        model: payload.model,
        year: payload.year ?? new Date().getFullYear(),
        status: payload.status ?? 'ACTIVE',
        insuranceExpiry: payload.insuranceExpiry ?? '2027-01-01',
        maintenanceNote: [
          payload.rcNumber ? `RC: ${payload.rcNumber}` : null,
          payload.insuranceProvider ? `Insurer: ${payload.insuranceProvider}` : null,
          payload.insurancePolicyNumber ? `Policy: ${payload.insurancePolicyNumber}` : null,
        ].filter(Boolean).join(' · ') || undefined,
        createdAt: new Date().toISOString(),
      };
      MOCK_VENDOR_VEHICLES.unshift(newVeh);
      return newVeh;
    }
    throw error;
  }
}

export async function uploadVendorVehicleDocument(
  vehicleId: string,
  documentType: VendorVehicleDocumentType,
  file: { uri: string; name: string; mimeType: string },
  onProgress?: (loaded: number, total?: number) => void,
): Promise<FleetVehicle> {
  try {
    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob);

    let token: string | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      token = require('../../redux/store').store?.getState()?.auth?.accessToken ?? null;
    } catch {
      // ignore
    }
    const { data } = await api.post<ApiSuccessResponse<FleetVehicle>>(
      API_ENDPOINTS.vendorVehicleUploadDocument(vehicleId),
      formData,
      {
        onUploadProgress: onProgress ? ({ loaded, total }) => onProgress(loaded, total) : undefined,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      const vehicle = MOCK_VENDOR_VEHICLES.find(item => item.id === vehicleId);
      if (vehicle) {
        const document: FleetVehicleDocument = {
          type: documentType,
          url: file.uri,
          fileName: file.name,
          status: 'PENDING',
          uploadedAt: new Date().toISOString(),
        };
        vehicle.documents = [
          ...(vehicle.documents ?? []).filter(item => item.type !== documentType),
          document,
        ];
        return vehicle;
      }
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
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      const found = MOCK_VENDOR_VEHICLES.find(v => v.id === vehicleId);
      if (found) {
        if (payload.type) found.type = payload.type;
        if (payload.model) found.model = payload.model;
        if (payload.status) found.status = payload.status;
        if (payload.year !== undefined) found.year = payload.year ?? undefined;
        if (payload.insuranceExpiry !== undefined) {
          found.insuranceExpiry = payload.insuranceExpiry ?? undefined;
        }
        if (payload.maintenanceNote !== undefined) {
          found.maintenanceNote = payload.maintenanceNote || undefined;
        }
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
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      const idx = MOCK_VENDOR_VEHICLES.findIndex(v => v.id === vehicleId);
      if (idx !== -1) MOCK_VENDOR_VEHICLES.splice(idx, 1);
      return;
    }
    throw error;
  }
}
