import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useRef } from 'react';

import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { updateTokens, updateUser } from '../../redux/auth/authSlice';
import { refreshAuthSession } from '../authService';
import { useAuthStore } from '../../store/authStore';
import {
  getVendorDashboard,
  getVendorEarnings,
  getVendorProfile,
  getPayoutAccount,
  getVendorStatus,
  registerVendor,
  savePayoutAccount,
  saveVendorDraft,
  updateVendor,
  uploadVendorDocument,
  uploadVendorSelfie,
} from './vendorApi';
import type { VendorRegistrationRequest } from '../../types/vendor';

export function useVendorStatusQuery(enabled = true) {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const accessToken = useAppSelector(state => state.auth.accessToken);
  const lastSyncedStatusRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ['vendor', 'status'],
    queryFn: async () => {
      try {
        return await getVendorStatus();
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
    // While waiting on admin review, poll so dashboard updates after approve.
    refetchInterval: query => {
      const status = query.state.data?.status;
      if (!status || status === 'approved' || status === 'rejected') return false;
      return 15_000;
    },
  });

  useEffect(() => {
    if (!enabled || !query.data || !isAuthenticated || !accessToken) return;

    const status = query.data.status;
    if (lastSyncedStatusRef.current === status) return;
    lastSyncedStatusRef.current = status;

    void refreshAuthSession()
      .then(session => {
        if (!useAuthStore.getState().isAuthenticated) return;
        dispatch(
          updateTokens({
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
          }),
        );
        dispatch(updateUser(session.user));
      })
      .catch(() => {
        // Backend role middleware falls back to DB role if refresh fails.
      });
  }, [accessToken, dispatch, enabled, isAuthenticated, query.data]);

  return query;
}

export function useVendorDashboardQuery(enabled = true) {
  return useQuery({
    queryKey: ['vendor', 'dashboard'],
    queryFn: getVendorDashboard,
    enabled,
    refetchInterval: 30_000,
  });
}

/* ── Payout account & earnings — real backend, no mock fallbacks ── */

export function usePayoutAccountQuery(enabled = true) {
  return useQuery({
    queryKey: ['vendor', 'payout-account'],
    queryFn: async () => {
      try {
        return await getPayoutAccount();
      } catch (error) {
        // 404 = nothing saved yet → legitimate empty state, not an error.
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled,
    retry: false,
  });
}

export function useSavePayoutAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: savePayoutAccount,
    onSuccess: account => {
      queryClient.setQueryData(['vendor', 'payout-account'], account);
    },
  });
}

export function useVendorEarningsQuery(enabled = true) {
  return useQuery({
    queryKey: ['vendor', 'earnings'],
    queryFn: getVendorEarnings,
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}


export function useVendorProfileQuery(enabled = true) {
  return useQuery({
    queryKey: ['vendor', 'profile'],
    queryFn: getVendorProfile,
    enabled,
    retry: false,
  });
}

export function useSaveVendorDraftMutation() {
  return useMutation({
    mutationFn: saveVendorDraft,
  });
}

export function useUpdateVendorMutation() {
  return useMutation({
    mutationFn: updateVendor,
  });
}

export function useRegisterVendorMutation() {
  return useMutation({
    mutationFn: (payload: VendorRegistrationRequest) => registerVendor(payload),
  });
}

export function useUploadVendorDocumentMutation() {
  return useMutation({
    mutationFn: ({
      documentType,
      file,
      onProgress,
    }: {
      documentType: string;
      file: { uri: string; name: string; mimeType: string };
      onProgress?: (progress: number) => void;
    }) => uploadVendorDocument(documentType, file, onProgress),
  });
}

export function useUploadVendorSelfieMutation() {
  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: { uri: string; name: string; mimeType: string };
      onProgress?: (progress: number) => void;
    }) => uploadVendorSelfie(file, onProgress),
  });
}
