import { useEffect, useState } from 'react';

import { trackingService } from '../services/tracking/trackingService';

export interface TrackedDriver {
  id: string;
  name: string;
  phone: string;
  rating?: number;
}

export function useBookingTracking(bookingId?: string, bookingType?: 'towing' | 'driver') {
  const [status, setStatus] = useState<string>('CONFIRMED');
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [driver, setDriver] = useState<TrackedDriver | undefined>();
  const [driverLocation, setDriverLocation] = useState<
    { latitude: number; longitude: number; driverName?: string; driverPhone?: string } | undefined
  >();
  const [tripStartOtp, setTripStartOtp] = useState<string | undefined>();

  useEffect(() => {
    setStatus('PENDING');
    setEtaMinutes(null);
    setDriver(undefined);
    setDriverLocation(undefined);
    setTripStartOtp(undefined);
    if (!bookingId) return undefined;

    const unsubscribe = trackingService.subscribe(bookingId, (update) => {
      if (update.status) setStatus(update.status);
      if (update.etaMinutes != null) setEtaMinutes(update.etaMinutes);
      if (update.tripStartOtp) {
        setTripStartOtp(update.tripStartOtp);
      }
      if (update.driver) {
        setDriver(update.driver);
      } else if (update.driverLocation?.driverName) {
        setDriver(prev => ({
          id: prev?.id ?? '',
          name: update.driverLocation!.driverName!,
          phone: update.driverLocation?.driverPhone ?? prev?.phone ?? '',
          ...(prev?.rating != null ? { rating: prev.rating } : {}),
        }));
      }
      setDriverLocation(update.driverLocation);
    }, bookingType);

    return unsubscribe;
  }, [bookingId, bookingType]);

  const resolvedDriverName =
    driver?.name ?? driverLocation?.driverName ?? undefined;

  return {
    status,
    etaMinutes,
    etaLabel: etaMinutes == null ? 'updating' : etaMinutes + ' min',
    driver,
    driverName: resolvedDriverName,
    driverPhone: driver?.phone ?? driverLocation?.driverPhone,
    driverRating: driver?.rating,
    driverLocation,
    tripStartOtp,
  };
}
