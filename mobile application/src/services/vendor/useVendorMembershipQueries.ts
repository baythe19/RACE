import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getDriverVendorMembership,
  inviteVendorDriver,
  listDriverVendorInvitations,
  listVendorMemberships,
  respondToVendorInvitation,
  revokeVendorDriverMembership,
  searchVendorDrivers,
} from './vendorMembershipApi';

export const vendorMembershipKeys = {
  vendor: ['vendor', 'driver-memberships'] as const,
  driver: ['driver', 'vendor-membership'] as const,
  invitations: ['driver', 'vendor-invitations'] as const,
  search: (query: string) => ['vendor', 'search-drivers', query] as const,
};

export function useSearchVendorDriversQuery(query: string, enabled = true) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: vendorMembershipKeys.search(trimmed),
    queryFn: () => searchVendorDrivers(trimmed),
    enabled: enabled && trimmed.length >= 2,
    staleTime: 5_000,
  });
}

export function useVendorMembershipsQuery(enabled = true) {
  return useQuery({
    queryKey: vendorMembershipKeys.vendor,
    queryFn: listVendorMemberships,
    enabled,
    staleTime: 5_000,
    refetchInterval: enabled ? 20_000 : false,
  });
}

export function useDriverVendorMembershipQuery(enabled = true) {
  return useQuery({
    queryKey: vendorMembershipKeys.driver,
    queryFn: getDriverVendorMembership,
    enabled,
    staleTime: 5_000,
    refetchInterval: enabled ? 20_000 : false,
  });
}

export function useDriverVendorInvitationsQuery(enabled = true) {
  return useQuery({
    queryKey: vendorMembershipKeys.invitations,
    queryFn: listDriverVendorInvitations,
    enabled,
    staleTime: 5_000,
    refetchInterval: enabled ? 20_000 : false,
  });
}

export function useInviteVendorDriverMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inviteVendorDriver,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorMembershipKeys.vendor });
      void queryClient.invalidateQueries({ queryKey: ['vendor', 'search-drivers'] });
    },
  });
}

export function useRevokeVendorDriverMembershipMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeVendorDriverMembership,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorMembershipKeys.vendor });
      void queryClient.invalidateQueries({ queryKey: ['vendor', 'search-drivers'] });
    },
  });
}

export function useRespondToVendorInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'accept' | 'decline' }) =>
      respondToVendorInvitation(id, decision),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorMembershipKeys.vendor });
      void queryClient.invalidateQueries({ queryKey: vendorMembershipKeys.driver });
      void queryClient.invalidateQueries({ queryKey: vendorMembershipKeys.invitations });
    },
  });
}
