import { API_CONFIG, API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';
import type { VendorProfileResponse, VendorRegistrationRequest } from '../../types/vendor';
import { apiClient } from '../api/apiClient';
import { UI_PREVIEW_MODE } from '../../constants/preview';
import {
  MOCK_VENDOR_DASHBOARD,
  MOCK_VENDOR_STATUS,
} from '../../data/mockPartnerData';

function getAuthTokenSafe(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../redux/store').store?.getState()?.auth?.accessToken ?? null;
  } catch {
    return null;
  }
}

export async function saveVendorDraft(
  payload: Partial<VendorRegistrationRequest> & { vendorType: VendorRegistrationRequest['vendorType'] },
): Promise<VendorProfileResponse> {
  try {
    const { data } = await apiClient.post<ApiSuccessResponse<VendorProfileResponse>>(
      `${API_ENDPOINTS.vendorDraft}`,
      payload,
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      return MOCK_VENDOR_STATUS;
    }
    throw error;
  }
}

export async function registerVendor(
  payload: VendorRegistrationRequest,
): Promise<VendorProfileResponse> {
  try {
    const { data } = await apiClient.post<ApiSuccessResponse<VendorProfileResponse>>(
      API_ENDPOINTS.vendorRegister,
      payload,
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      return MOCK_VENDOR_STATUS;
    }
    throw error;
  }
}

export async function updateVendor(
  payload: Partial<VendorRegistrationRequest>,
): Promise<VendorProfileResponse> {
  try {
    const { data } = await apiClient.put<ApiSuccessResponse<VendorProfileResponse>>(
      API_ENDPOINTS.vendorUpdate,
      payload,
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      return MOCK_VENDOR_STATUS;
    }
    throw error;
  }
}

export async function getVendorProfile(): Promise<VendorProfileResponse> {
  try {
    const { data } = await apiClient.get<ApiSuccessResponse<VendorProfileResponse>>(
      API_ENDPOINTS.vendorProfile,
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      return MOCK_VENDOR_STATUS;
    }
    throw error;
  }
}

export async function getVendorStatus(): Promise<VendorProfileResponse> {
  try {
    const { data } = await apiClient.get<ApiSuccessResponse<VendorProfileResponse>>(
      API_ENDPOINTS.vendorStatus,
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      return MOCK_VENDOR_STATUS;
    }
    throw error;
  }
}

export interface VendorDashboardStats {
  jobsToday: number;
  earningsToday: number;
  earningsTotal: number;
}

export async function getVendorDashboard(): Promise<VendorDashboardStats> {
  try {
    const { data } = await apiClient.get<ApiSuccessResponse<VendorDashboardStats>>(
      API_ENDPOINTS.vendorDashboard,
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      return MOCK_VENDOR_DASHBOARD;
    }
    throw error;
  }
}

export interface UploadProgressHandler {
  (progress: number): void;
}

export async function uploadVendorDocument(
  documentType: string,
  file: { uri: string; name: string; mimeType: string },
  onProgress?: UploadProgressHandler,
): Promise<VendorProfileResponse> {
  try {
    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob);

    const token = getAuthTokenSafe();

    const { data } = await apiClient.post<ApiSuccessResponse<VendorProfileResponse>>(
      API_ENDPOINTS.vendorUploadDocument,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        onUploadProgress: (event) => {
          if (!event.total || !onProgress) return;
          onProgress(Math.round((event.loaded / event.total) * 100));
        },
      },
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      onProgress?.(100);
      return MOCK_VENDOR_STATUS;
    }
    throw error;
  }
}

export async function uploadVendorSelfie(
  file: { uri: string; name: string; mimeType: string },
  onProgress?: UploadProgressHandler,
): Promise<VendorProfileResponse> {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob);

    const token = getAuthTokenSafe();

    const { data } = await apiClient.post<ApiSuccessResponse<VendorProfileResponse>>(
      API_ENDPOINTS.vendorSelfie,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        onUploadProgress: (event) => {
          if (!event.total || !onProgress) return;
          onProgress(Math.round((event.loaded / event.total) * 100));
        },
      },
    );
    return data.data;
  } catch (error) {
    if (UI_PREVIEW_MODE) {
      onProgress?.(100);
      return MOCK_VENDOR_STATUS;
    }
    throw error;
  }
}

export { API_CONFIG };
