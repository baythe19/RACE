import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  setBookings,
  setBookingsLoading,
  updateBooking,
} from '../../redux/bookings/bookingsSlice';
import type { Booking, SubmitRatingRequest } from '../../types/booking';
import type { ServiceBookingType } from '../../types/serviceBooking';
import {
  getBooking,
  listBookings,
  submitBookingRating,
} from './bookingApi';
import { isBookingOngoing } from '../../utils/bookingDisplay';

export const bookingKeys = {
  all: ['bookings'] as const,
  detail: (id: string, bookingType?: ServiceBookingType) => ['bookings', bookingType ?? 'legacy', id] as const,
};

export function useBookingsQuery() {
  const dispatch = useAppDispatch();

  return useQuery({
    queryKey: bookingKeys.all,
    queryFn: async () => {
      dispatch(setBookingsLoading(true));
      try {
        const remote = await listBookings();
        dispatch(setBookings(remote));
        return remote;
      } finally {
        dispatch(setBookingsLoading(false));
      }
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 4000),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.some(isBookingOngoing)) {
        return 5_000;
      }
      return false;
    },
  });
}

export function useBookingQuery(bookingId: string, bookingType?: ServiceBookingType) {
  const dispatch = useAppDispatch();
  const localBooking = useAppSelector((state) => {
    const matches = state.bookings.items.filter(
      booking => booking.id === bookingId && (!bookingType || booking.bookingType === bookingType),
    );
    return matches.length === 1 ? matches[0] : undefined;
  });

  const query = useQuery({
    queryKey: bookingKeys.detail(bookingId, bookingType),
    queryFn: async () => {
      const remote = await getBooking(bookingId, bookingType);
      if (remote) {
        dispatch(updateBooking(remote));
        return remote;
      }
      if (localBooking) {
        return localBooking;
      }
      throw new Error('Failed to load booking');
    },
    enabled: Boolean(bookingId),
    initialData: localBooking,
    refetchOnMount: 'always',
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && isBookingOngoing(data)) {
        return 5_000;
      }
      return false;
    },
  });

  return query.data ?? null;
}

export function useCreateBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      throw new Error('Use the dedicated towing or driver booking flow from Home.');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

export function useSubmitRatingMutation() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      bookingId: string;
      bookingType?: 'towing' | 'driver';
      payload: SubmitRatingRequest;
    }) => {
      const bookingType = params.bookingType ?? 'towing';
      return submitBookingRating(params.bookingId, bookingType, params.payload);
    },
    onSuccess: (booking) => {
      dispatch(updateBooking(booking));
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      void queryClient.invalidateQueries({ queryKey: bookingKeys.detail(booking.id) });
    },
  });
}
