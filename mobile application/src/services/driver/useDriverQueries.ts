import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notificationQueryKeys } from '../useNotificationQueries';

import { getProfile } from '../profileService';
import {
  acceptDriverJob,
  getDriverActiveJob,
  listDriverJobOffers,
  listDriverJobs,
  driverArrivedAtDropoff,
  driverCompleteBooking,
  rejectDriverJob,
  setDriverAvailability,
  updateDriverBookingStatus,
  updateDriverLocation,
} from './driverApi';

export const driverQueryKeys = {
  jobs: ['driver', 'jobs'] as const,
  offers: ['driver', 'offers'] as const,
  active: ['driver', 'active'] as const,
  profile: ['driver', 'profile'] as const,
};

/**
 * Driver account profile — carries `driverProfile.status`, the approval field the
 * driver endpoints gate on. Shared by the verification screen (gate) and the
 * dashboard verification card so both read the same value.
 */
export function useDriverProfileQuery(enabled = true) {
  return useQuery({
    queryKey: driverQueryKeys.profile,
    queryFn: getProfile,
    enabled,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
}

export function useDriverJobsQuery(enabled = true) {
  return useQuery({
    queryKey: driverQueryKeys.jobs,
    queryFn: () => listDriverJobs(),
    enabled,
    refetchInterval: query => query.state.status === 'error' ? 30_000 : 10_000,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
}

export function useDriverJobOffersQuery(enabled = true) {
  return useQuery({
    queryKey: driverQueryKeys.offers,
    queryFn: listDriverJobOffers,
    enabled,
    refetchInterval: query => query.state.status === 'error' ? 20_000 : 5_000,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
}

export function useDriverActiveJobQuery(enabled = true) {
  return useQuery({
    queryKey: driverQueryKeys.active,
    queryFn: getDriverActiveJob,
    enabled,
    refetchInterval: query => query.state.status === 'error' ? 20_000 : 5_000,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
}

/** Refresh cached driver data immediately whenever a driver screen regains focus. */
export function useRefreshDriverDataOnFocus(enabled = true) {
  const queryClient = useQueryClient();
  useFocusEffect(
    useCallback(() => {
      if (enabled) {
        void queryClient.invalidateQueries({ queryKey: ['driver'], refetchType: 'active' });
      }
    }, [enabled, queryClient]),
  );
}

export function useDriverAvailabilityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isAvailable: boolean) => setDriverAvailability(isAvailable),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.jobs });
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.active });
    },
  });
}

export function useAcceptDriverJobMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { bookingId: string; bookingType: 'towing' | 'driver' }) =>
      acceptDriverJob(input.bookingId, input.bookingType),
    onSuccess: (data, input) => {
      console.log(`[JOB_ACCEPT_SUCCESS] Booking #${input.bookingId} (${input.bookingType}) accepted.`);
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.jobs });
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.offers });
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.active });
      void queryClient.invalidateQueries({ queryKey: ['vendor', 'bookings'] });
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list });
    },
    onError: (err, input) => {
      console.warn(`[JOB_ACCEPT_FAILED] Failed to accept booking #${input.bookingId}:`, err);
    },
  });
}

export function useRejectDriverJobMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { bookingId: string; bookingType: 'towing' | 'driver' }) =>
      rejectDriverJob(input.bookingId, input.bookingType),
    onSuccess: (data, input) => {
      console.log(`[JOB_REJECT_SUCCESS] Booking #${input.bookingId} rejected.`);
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.jobs });
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.offers });
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.active });
    },
    onError: (err, input) => {
      console.warn(`[JOB_REJECT_FAILED] Failed to decline booking #${input.bookingId}:`, err);
    },
  });
}

export function useUpdateDriverBookingStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      bookingId: string;
      bookingType: 'towing' | 'driver';
      status: string;
      tripOtp?: string;
    }) =>
      updateDriverBookingStatus(
        input.bookingId,
        input.bookingType,
        input.status,
        input.tripOtp,
      ),
    onSuccess: (data, input) => {
      console.log(`[JOB_STATUS_SUCCESS] Booking #${input.bookingId} -> ${input.status}`);
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.jobs });
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.active });
    },
    onError: (err, input) => {
      console.warn(`[JOB_STATUS_FAILED] Failed to update #${input.bookingId} to ${input.status}:`, err);
    },
  });
}

export function useUpdateDriverLocationMutation() {
  return useMutation({
    mutationFn: (coords: { latitude: number; longitude: number }) =>
      updateDriverLocation(coords.latitude, coords.longitude),
  });
}

export function useDriverArrivedAtDropoffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { bookingId: string; bookingType: 'towing' | 'driver' }) =>
      driverArrivedAtDropoff(input.bookingId, input.bookingType),
    onSuccess: (data, input) => {
      console.log(`[DROPOFF_ARRIVAL_SUCCESS] Marked arrival at dropoff for booking #${input.bookingId}`);
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.active });
    },
    onError: (err, input) => {
      console.warn(`[DROPOFF_ARRIVAL_FAILED] Failed to mark dropoff arrival for #${input.bookingId}:`, err);
    },
  });
}

export function useDriverCompleteBookingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      bookingId: string;
      bookingType: 'towing' | 'driver';
      completionOtp: string;
    }) =>
      driverCompleteBooking(input.bookingId, input.bookingType, input.completionOtp),
    onSuccess: (data, input) => {
      console.log(`[JOB_COMPLETE_SUCCESS] Booking #${input.bookingId} successfully completed with OTP.`);
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.jobs });
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.active });
    },
    onError: (err, input) => {
      console.warn(`[JOB_COMPLETE_FAILED] Failed to complete booking #${input.bookingId}:`, err);
    },
  });
}
