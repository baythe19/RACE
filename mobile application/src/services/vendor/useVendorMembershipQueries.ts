import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getDriverVendorMembership,
  inviteVendorDriver,
  listDriverVendorInvitations,
  listVendorMemberships,
  respondToVendorInvitation,
  revokeVendorDriverMembership,
} from './vendorMembershipApi';

export const vendorMembershipKeys = {
  vendor: ['vendor', 'driver-memberships'] as const,
  driver: ['driver', 'vendor-membership'] as const,
  invitations: ['driver', 'vendor-invitations'] as const,
};

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorMembershipKeys.vendor }),
  });
}

export function useRevokeVendorDriverMembershipMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeVendorDriverMembership,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorMembershipKeys.vendor }),
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
