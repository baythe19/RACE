import { api } from '../api';
import { API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';
import { UI_PREVIEW_MODE, UI_PREVIEW_MUTATIONS_ENABLED } from '../../constants/preview';
import { MOCK_VENDOR_DRIVERS } from '../../data/mockPartnerData';

/** @deprecated Prefer VendorDriver */
export type FleetDriver = VendorDriver;

export type VendorDriver = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  driverType: string;
  licenseNo: string;
  city: string;
  vehicleRegistration?: string;
  status: string;
  isAvailable: boolean;
  isBusy: boolean;
  rating: number;
  vendorId: string;
  loginId?: string;
  hasPasswordLogin?: boolean;
};

/** @deprecated Prefer CreateVendorDriverInput */
export type CreateFleetDriverInput = CreateVendorDriverInput;

export type CreateVendorDriverInput = {
  name: string;
  phone: string;
  licenseNo: string;
  driverType: 'Tow Driver' | 'Full-Time' | 'Part-Time';
  city?: string;
  vehicleRegistration?: string;
  email?: string;
  loginId: string;
  password: string;
};

export async function listVendorDrivers(): Promise<VendorDriver[]> {
  try {
    const { data } = await api.get<ApiSuccessResponse<VendorDriver[]>>(API_ENDPOINTS.vendorDrivers);
    return data.data ?? [];
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      return MOCK_VENDOR_DRIVERS;
    }
    throw error;
  }
}

export async function createVendorDriver(payload: CreateVendorDriverInput): Promise<VendorDriver> {
  try {
    const { data } = await api.post<ApiSuccessResponse<VendorDriver>>(
      API_ENDPOINTS.vendorDrivers,
      payload,
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      const newDriver: VendorDriver = {
        id: `mock-driver-${Date.now()}`,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        driverType: payload.driverType,
        licenseNo: payload.licenseNo,
        city: payload.city || 'Bhubaneswar',
        vehicleRegistration: payload.vehicleRegistration,
        status: 'PENDING',
        isAvailable: false,
        isBusy: false,
        rating: 5.0,
        vendorId: 'mock-vendor-001',
        loginId: payload.loginId,
        hasPasswordLogin: true,
      };
      MOCK_VENDOR_DRIVERS.unshift(newDriver);
      return newDriver;
    }
    throw error;
  }
}

export async function claimVendorDriver(phone: string): Promise<VendorDriver> {
  try {
    const { data } = await api.post<ApiSuccessResponse<VendorDriver>>(API_ENDPOINTS.vendorDriverClaim, {
      phone,
    });
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      return MOCK_VENDOR_DRIVERS[0]!;
    }
    throw error;
  }
}

/**
 * Link (or unlink with an empty registration) a vendor driver to one of the
 * vendor's fleet vehicles. Mirrors POST /vendor/drivers/:id/assign-vehicle.
 */
export async function linkVendorDriverVehicle(
  driverId: string,
  vehicleRegistration?: string | null,
): Promise<VendorDriver> {
  try {
    const { data } = await api.post<ApiSuccessResponse<VendorDriver>>(
      API_ENDPOINTS.vendorDriverAssignVehicle(driverId),
      { vehicleRegistration: vehicleRegistration ?? null },
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      const driver =
        MOCK_VENDOR_DRIVERS.find(d => d.id === driverId) ?? MOCK_VENDOR_DRIVERS[0];
      if (driver) {
        driver.vehicleRegistration = vehicleRegistration ?? undefined;
        return driver;
      }
    }
    throw error;
  }
}

export async function removeVendorDriver(driverId: string): Promise<void> {
  try {
    await api.delete(API_ENDPOINTS.vendorDriver(driverId));
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      const idx = MOCK_VENDOR_DRIVERS.findIndex(d => d.id === driverId);
      if (idx !== -1) MOCK_VENDOR_DRIVERS.splice(idx, 1);
      return;
    }
    throw error;
  }
}

/**
 * Vendor sets a new Login-ID password for a fleet driver.
 * Mirrors POST /vendor/drivers/:id/reset-password. The hash never leaves the backend.
 */
export async function resetVendorDriverPassword(
  driverId: string,
  password: string,
): Promise<void> {
  try {
    await api.post(API_ENDPOINTS.vendorDriverResetPassword(driverId), { password });
  } catch (error) {
    if (UI_PREVIEW_MUTATIONS_ENABLED) {
      const driver = MOCK_VENDOR_DRIVERS.find(d => d.id === driverId);
      if (driver) driver.hasPasswordLogin = true;
      return;
    }
    throw error;
  }
}

export async function uploadVendorDriverDocument(
  driverId: string,
  documentType: string,
  file: { uri: string; name: string; mimeType: string },
  onProgress?: (loaded: number, total?: number) => void,
): Promise<VendorDriver> {
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
    const { data } = await api.post<ApiSuccessResponse<VendorDriver>>(
      API_ENDPOINTS.vendorDriverUploadDocument(driverId),
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
      return MOCK_VENDOR_DRIVERS[0]!;
    }
    throw error;
  }
}
