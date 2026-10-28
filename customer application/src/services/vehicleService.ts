import { unwrapApi, api } from './api';
import type { Vehicle, VehicleInput, VehicleVerifyResponse } from '../types/vehicle';

export async function getVehicles(): Promise<Vehicle[]> {
  return unwrapApi(api.get('/api/v1/vehicles'));
}

export async function getVehicle(id: string): Promise<Vehicle> {
  return unwrapApi(api.get(`/api/v1/vehicles/${id}`));
}

export async function addVehicle(data: VehicleInput): Promise<Vehicle> {
  return unwrapApi(api.post('/api/v1/vehicles', data));
}

export async function uploadVehiclePhoto(
  id: string,
  file: { uri: string; name: string; mimeType: string },
): Promise<Vehicle> {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);
  return unwrapApi(api.post(`/api/v1/vehicles/${id}/photo`, formData));
}

export async function updateVehicle(id: string, data: Partial<VehicleInput>): Promise<Vehicle> {
  return unwrapApi(api.put(`/api/v1/vehicles/${id}`, data));
}

export async function deleteVehicle(id: string): Promise<void> {
  await unwrapApi(api.delete(`/api/v1/vehicles/${id}`));
}

export async function verifyVehicle(id: string): Promise<VehicleVerifyResponse> {
  return unwrapApi(api.get(`/api/v1/vehicles/${id}/verify`));
}
