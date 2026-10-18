import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateDriverBookingRequest,
  CreateRoadsideBookingRequest,
  CreateTowingBookingRequest,
  ServiceBookingType,
} from '../../types/serviceBooking';
import {
  completeAdvancePayment,
  createDriverBooking,
  createRoadsideBooking,
  createTowingBooking,
  getRoadsideAvailability,
} from './serviceBookingApi';

export const serviceBookingKeys = {
  roadsideAvailability: ['roadside', 'availability'] as const,
  towing: ['bookings', 'towing'] as const,
  driver: ['bookings', 'driver'] as const,
};

export function useRoadsideAvailabilityQuery() {
  return useQuery({
    queryKey: serviceBookingKeys.roadsideAvailability,
    queryFn: getRoadsideAvailability,
    staleTime: 60_000,
  });
}

export function useCreateTowingBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTowingBookingRequest) => createTowingBooking(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: serviceBookingKeys.towing });
    },
  });
}

export function useCreateDriverBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateDriverBookingRequest) => createDriverBooking(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: serviceBookingKeys.driver });
    },
  });
}

export function useCreateRoadsideBookingMutation() {
  return useMutation({
    mutationFn: async (payload: CreateRoadsideBookingRequest) => createRoadsideBooking(payload),
  });
}

export function useCompleteAdvancePaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bookingId,
      bookingType,
    }: {
      bookingId: string;
      bookingType: ServiceBookingType;
    }) => completeAdvancePayment(bookingId, bookingType),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
