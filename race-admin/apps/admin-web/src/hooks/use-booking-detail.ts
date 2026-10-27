import { useQuery } from '@tanstack/react-query';

import { getBookingByIdWithType } from '@race/api';

export function useBookingDetail(id: string, type?: 'towing' | 'driver' | 'legacy') {
  return useQuery({
    queryKey: ['booking', id, type],
    queryFn: () => getBookingByIdWithType(id, type),
    enabled: Boolean(id),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });
}
