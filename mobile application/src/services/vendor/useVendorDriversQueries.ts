import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  claimVendorDriver,
  createVendorDriver,
  listVendorDrivers,
  removeVendorDriver,
  resetVendorDriverPassword,
  type CreateVendorDriverInput,
} from './vendorDriversApi';

export const vendorDriverKeys = {
  list: ['vendor', 'drivers'] as const,
};

export function useVendorDriversQuery(enabled = true) {
  return useQuery({
    queryKey: vendorDriverKeys.list,
    queryFn: listVendorDrivers,
    enabled,
  });
}

export function useCreateVendorDriverMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVendorDriverInput) => createVendorDriver(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorDriverKeys.list });
    },
  });
}

export function useCreateVendorStaffDriverMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: import('./vendorDriversApi').CreateVendorStaffDriverInput) =>
      import('./vendorDriversApi').then(m => m.createVendorStaffDriver(payload)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorDriverKeys.list });
      void queryClient.invalidateQueries({ queryKey: ['vendor', 'driver-memberships'] });
    },
  });
}

export function useClaimVendorDriverMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (phone: string) => claimVendorDriver(phone),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorDriverKeys.list });
    },
  });
}

export function useRemoveVendorDriverMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (driverId: string) => removeVendorDriver(driverId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorDriverKeys.list });
    },
  });
}

export function useResetVendorDriverPasswordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ driverId, password }: { driverId: string; password: string }) =>
      resetVendorDriverPassword(driverId, password),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorDriverKeys.list });
    },
  });
}
