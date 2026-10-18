import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  approveVendorBooking,
  assignVendorBooking,
  getVendorBookingTracking,
  listVendorBookings,
  listVendorBookingOffers,
  type VendorBookingItem,
} from './vendorBookingsApi';
export type { VendorBookingItem };
import {
  createVendorVehicle,
  listVendorVehicles,
  removeVendorVehicle,
  updateVendorVehicle,
  uploadVendorVehicleDocument,
  type CreateFleetVehicleInput,
  type UpdateFleetVehicleInput,
  type VendorVehicleDocumentType,
} from './vendorVehiclesApi';
import {
  createVendorDriver,
  linkVendorDriverVehicle,
  listVendorDrivers,
  type CreateVendorDriverInput,
} from './vendorDriversApi';
import { driverQueryKeys } from '../driver/useDriverQueries';
import { vendorDriverKeys } from './useVendorDriversQueries';

export const vendorBookingQueryKeys = {
  offers: ['vendor', 'booking-offers'] as const,
  bookings: ['vendor', 'bookings'] as const,
  drivers: ['vendor', 'drivers'] as const,
  vehicles: ['vendor', 'vehicles'] as const,
};

/** Fleet bookings after assignment: awaiting driver, assigned, in progress, completed. */
export function useVendorBookingsQuery(enabled = true) {
  return useQuery<VendorBookingItem[]>({
    queryKey: vendorBookingQueryKeys.bookings,
    queryFn: listVendorBookings,
    enabled,
    refetchInterval: 15_000,
  });
}

export function useVendorBookingTrackingQuery(
  bookingId: string,
  bookingType: 'towing' | 'driver',
  enabled = true,
) {
  return useQuery({
    queryKey: ['vendor', 'booking-tracking', bookingType, bookingId] as const,
    queryFn: () => getVendorBookingTracking({ bookingId, bookingType }),
    enabled: enabled && Boolean(bookingId),
    refetchInterval: query => query.state.status === 'error' ? 15_000 : 5_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
  });
}

export function useVendorBookingOffersQuery(enabled = true) {
  return useQuery({
    queryKey: vendorBookingQueryKeys.offers,
    queryFn: listVendorBookingOffers,
    enabled,
    refetchInterval: 8_000,
  });
}

export function useVendorFleetDriversQuery(enabled = true) {
  return useQuery({
    queryKey: vendorBookingQueryKeys.drivers,
    queryFn: listVendorDrivers,
    enabled,
    refetchInterval: 15_000,
  });
}

export function useVendorFleetVehiclesQuery(enabled = true, activeOnly = true) {
  return useQuery({
    queryKey: [...vendorBookingQueryKeys.vehicles, activeOnly ? 'active' : 'all'] as const,
    queryFn: async () => {
      const vehicles = await listVendorVehicles();
      return activeOnly ? vehicles.filter(v => v.status === 'ACTIVE') : vehicles;
    },
    enabled,
    refetchInterval: 30_000,
  });
}

export function useCreateVendorVehicleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFleetVehicleInput) => createVendorVehicle(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorBookingQueryKeys.vehicles });
    },
  });
}

export function useUpdateVendorVehicleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      vehicleId,
      payload,
    }: {
      vehicleId: string;
      payload: UpdateFleetVehicleInput;
    }) => updateVendorVehicle(vehicleId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorBookingQueryKeys.vehicles });
    },
  });
}

export function useUploadVendorVehicleDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      vehicleId,
      documentType,
      file,
      onProgress,
    }: {
      vehicleId: string;
      documentType: VendorVehicleDocumentType;
      file: { uri: string; name: string; mimeType: string };
      onProgress?: (loaded: number, total?: number) => void;
    }) => uploadVendorVehicleDocument(vehicleId, documentType, file, onProgress),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorBookingQueryKeys.vehicles });
    },
  });
}

export function useRemoveVendorVehicleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: string) => removeVendorVehicle(vehicleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorBookingQueryKeys.vehicles });
    },
  });
}

export function useAssignDriverToVehicleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVendorDriverInput) => createVendorDriver(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorBookingQueryKeys.drivers });
      void queryClient.invalidateQueries({ queryKey: vendorDriverKeys.list });
    },
  });
}

export function useApproveVendorBookingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveVendorBooking,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorBookingQueryKeys.offers });
      void queryClient.invalidateQueries({ queryKey: vendorBookingQueryKeys.bookings });
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.offers });
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.jobs });
      void queryClient.invalidateQueries({ queryKey: vendorDriverKeys.list });
    },
  });
}

/** Link (or unlink, with empty registration) a fleet driver to a vehicle. */
export function useLinkVendorDriverVehicleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      driverId,
      vehicleRegistration,
    }: {
      driverId: string;
      vehicleRegistration?: string | null;
    }) => linkVendorDriverVehicle(driverId, vehicleRegistration),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorDriverKeys.list });
      void queryClient.invalidateQueries({ queryKey: vendorBookingQueryKeys.drivers });
    },
  });
}

/** @deprecated Use useApproveVendorBookingMutation */
export function useAssignVendorBookingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignVendorBooking,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorBookingQueryKeys.offers });
      void queryClient.invalidateQueries({ queryKey: vendorBookingQueryKeys.drivers });
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.jobs });
    },
  });
}
