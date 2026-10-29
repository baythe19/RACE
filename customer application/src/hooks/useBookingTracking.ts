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
  const [arrivedAtDropoffAt, setArrivedAtDropoffAt] = useState<string | undefined>();
  const [completionOtp, setCompletionOtp] = useState<string | undefined>();
  const [paymentCollectionMode, setPaymentCollectionMode] = useState<
    'CASH' | 'UPI' | 'ONLINE' | undefined
  >();
  const [paymentConfirmedByCustomer, setPaymentConfirmedByCustomer] = useState<boolean>(false);
  const [fare, setFare] = useState<number | undefined>();
  const [driverUpiId, setDriverUpiId] = useState<string | undefined>();

  useEffect(() => {
    setStatus('PENDING');
    setEtaMinutes(null);
    setDriver(undefined);
    setDriverLocation(undefined);
    setTripStartOtp(undefined);
    setArrivedAtDropoffAt(undefined);
    setCompletionOtp(undefined);
    setPaymentCollectionMode(undefined);
    setPaymentConfirmedByCustomer(false);
    setFare(undefined);
    setDriverUpiId(undefined);
    if (!bookingId) return undefined;

    const unsubscribe = trackingService.subscribe(bookingId, (update) => {
      if (update.status) setStatus(update.status);
      if (update.etaMinutes != null) setEtaMinutes(update.etaMinutes);
      if (update.tripStartOtp) {
        setTripStartOtp(update.tripStartOtp);
      }
      if (update.arrivedAtDropoffAt) {
        setArrivedAtDropoffAt(update.arrivedAtDropoffAt);
      }
      if (update.completionOtp) {
        setCompletionOtp(update.completionOtp);
      }
      if (update.paymentCollectionMode) {
        setPaymentCollectionMode(update.paymentCollectionMode);
      }
      if (update.paymentConfirmedByCustomer != null) {
        setPaymentConfirmedByCustomer(update.paymentConfirmedByCustomer);
      }
      if (update.fare != null) {
        setFare(update.fare);
      }
      if (update.driverUpiId) {
        setDriverUpiId(update.driverUpiId);
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
    driverUpiId: driverUpiId ?? (undefined as string | undefined),
    tripStartOtp,
    arrivedAtDropoffAt,
    completionOtp,
    paymentCollectionMode,
    paymentConfirmedByCustomer,
    fare,
  };
}
