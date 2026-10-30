import { API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';
import type { DriverFareEstimate, DriverPackageHours, DriverVehicleCategory, TowingFareEstimate } from '../../types/fare';
import { apiClient } from '../api/apiClient';

async function unwrap<T>(promise: Promise<{ data: ApiSuccessResponse<T> }>): Promise<T> {
  const { data } = await promise;
  return data.data;
}

export async function estimateTowingFare(params: {
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  scheduledAt?: string;
  towingMode?: 'instant' | 'scheduled' | 'emergency';
}): Promise<TowingFareEstimate> {
  return unwrap(
    apiClient.get<ApiSuccessResponse<TowingFareEstimate>>(API_ENDPOINTS.fareTowing, { params }),
  );
}

export async function estimateDriverFare(params: {
  packageHours: DriverPackageHours;
  vehicleType?: DriverVehicleCategory;
  vehicleCategory?: DriverVehicleCategory;
}): Promise<DriverFareEstimate> {
  return unwrap(
    apiClient.get<ApiSuccessResponse<DriverFareEstimate>>(API_ENDPOINTS.fareDriver, { params }),
  );
}
