import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  setBookings,
  setBookingsLoading,
  updateBooking,
} from '../../redux/bookings/bookingsSlice';
import type { Booking, SubmitRatingRequest } from '../../types/booking';
import type { ServiceBookingType } from '../../types/serviceBooking';
import { isCustomerMockDataEnabled } from '../../config/customerQa';
import {
  getBooking,
  listBookings,
  submitBookingRating,
} from './bookingApi';
import { isBookingOngoing } from '../../utils/bookingDisplay';

export const bookingKeys = {
  all: ['bookings'] as const,
  detail: (id: string, bookingType?: ServiceBookingType) =>
    ['bookings', bookingType ?? 'legacy', id] as const,
};

/** List: avoid hammering API on every tab focus — pull-to-refresh still works. */
const LIST_STALE_MS = 20_000;
const LIST_GC_MS = 30 * 60 * 1000;
/** Detail: tracking socket/poll owns live location; HTTP refresh can be slower. */
const DETAIL_STALE_MS = 15_000;
const ONGOING_LIST_POLL_MS = 12_000;
const ONGOING_DETAIL_POLL_MS = 15_000;

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
    staleTime: LIST_STALE_MS,
    gcTime: LIST_GC_MS,
    placeholderData: previousData => previousData,
    refetchOnMount: true,
    retry: 2,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 4000),
    refetchInterval: query => {
      if (isCustomerMockDataEnabled()) return false;
      const data = query.state.data;
      if (data?.some(isBookingOngoing)) {
        return ONGOING_LIST_POLL_MS;
      }
      return false;
    },
  });
}

/**
 * D-16: full query object so Booking Detail can show error + retry.
 * Track/OnWay screens can use `.data` via useBookingQuery helper.
 */
export function useBookingDetailQuery(bookingId: string, bookingType?: ServiceBookingType) {
  const dispatch = useAppDispatch();
  const localBooking = useAppSelector(state => {
    const matches = state.bookings.items.filter(
      booking =>
        booking.id === bookingId && (!bookingType || booking.bookingType === bookingType),
    );
    return matches.length === 1 ? matches[0] : undefined;
  });

  return useQuery({
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
    staleTime: DETAIL_STALE_MS,
    refetchOnMount: true,
    retry: 2,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 4000),
    refetchInterval: query => {
      if (isCustomerMockDataEnabled()) return false;
      const data = query.state.data;
      if (data && isBookingOngoing(data)) {
        return ONGOING_DETAIL_POLL_MS;
      }
      return false;
    },
  });
}

/** Convenience wrapper — same query key as detail (deduped by TanStack Query). */
export function useBookingQuery(bookingId: string, bookingType?: ServiceBookingType) {
  const query = useBookingDetailQuery(bookingId, bookingType);
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
    onSuccess: (booking, vars) => {
      dispatch(updateBooking(booking));
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      void queryClient.invalidateQueries({
        queryKey: bookingKeys.detail(booking.id, vars.bookingType ?? booking.bookingType),
      });
    },
  });
}
