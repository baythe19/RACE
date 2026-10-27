import { API_CONFIG, API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';
import type { VendorProfileResponse, VendorRegistrationRequest } from '../../types/vendor';
import { apiClient } from '../api/apiClient';
import { store } from '../../redux/store';

/** driverProfile.dateOfBirth arrives as DD/MM/YYYY from the wizard; the API wants ISO. */
function normalizeDriverProfile<T extends { driverProfile?: { dateOfBirth?: string } }>(
  payload: T,
): T {
  const dob = payload.driverProfile?.dateOfBirth;
  if (!dob || /^\d{4}-\d{2}-\d{2}$/.test(dob)) return payload;
  const dmy = dob.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!dmy) return payload;
  return {
    ...payload,
    driverProfile: {
      ...payload.driverProfile,
      dateOfBirth: `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`,
    },
  };
}

export async function saveVendorDraft(
  payload: Partial<VendorRegistrationRequest> & { vendorType: VendorRegistrationRequest['vendorType'] },
): Promise<VendorProfileResponse> {
  const { data } = await apiClient.post<ApiSuccessResponse<VendorProfileResponse>>(
    `${API_ENDPOINTS.vendorDraft}`,
    normalizeDriverProfile(payload),
  );
  return data.data;
}

export async function registerVendor(
  payload: VendorRegistrationRequest,
): Promise<VendorProfileResponse> {
  const { data } = await apiClient.post<ApiSuccessResponse<VendorProfileResponse>>(
    API_ENDPOINTS.vendorRegister,
    normalizeDriverProfile(payload),
  );
  return data.data;
}

export async function updateVendor(
  payload: Partial<VendorRegistrationRequest>,
): Promise<VendorProfileResponse> {
  const { data } = await apiClient.put<ApiSuccessResponse<VendorProfileResponse>>(
    API_ENDPOINTS.vendorUpdate,
    payload,
  );
  return data.data;
}

export async function getVendorProfile(): Promise<VendorProfileResponse> {
  const { data } = await apiClient.get<ApiSuccessResponse<VendorProfileResponse>>(
    API_ENDPOINTS.vendorProfile,
  );
  return data.data;
}

export async function getVendorStatus(): Promise<VendorProfileResponse> {
  const { data } = await apiClient.get<ApiSuccessResponse<VendorProfileResponse>>(
    API_ENDPOINTS.vendorStatus,
  );
  return data.data;
}

export interface VendorDashboardStats {
  jobsToday: number;
  earningsToday: number;
  earningsTotal: number;
}

export async function getVendorDashboard(): Promise<VendorDashboardStats> {
  const { data } = await apiClient.get<ApiSuccessResponse<VendorDashboardStats>>(
    API_ENDPOINTS.vendorDashboard,
  );
  return data.data;
}

export interface UploadProgressHandler {
  (progress: number): void;
}

export async function uploadVendorDocument(
  documentType: string,
  file: { uri: string; name: string; mimeType: string },
  onProgress?: UploadProgressHandler,
): Promise<VendorProfileResponse> {
  const formData = new FormData();
  formData.append('documentType', documentType);
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);

  const token = store.getState().auth.accessToken;

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
}

export async function uploadVendorSelfie(
  file: { uri: string; name: string; mimeType: string },
  onProgress?: UploadProgressHandler,
): Promise<VendorProfileResponse> {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);

  const token = store.getState().auth.accessToken;

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
}

export { API_CONFIG };
