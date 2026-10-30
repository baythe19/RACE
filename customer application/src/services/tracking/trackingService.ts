/**
 * Polls backend tracking endpoint and emits real updates only.
 */
import { getBookingTracking } from '../bookings/bookingApi';
import { getDriverBookingTracking, getTowingBookingTracking } from '../bookings/serviceBookingApi';
import {
  onSocketConnected,
  onBookingStatus,
  onDriverLocation,
  onDriverArrivedDropoff,
  trackBooking,
} from '../socketService';
import {
  alertDriverAssigned,
  alertDriverArrivedPickup,
  alertTripStarted,
  alertDriverArrivedDropoff,
  alertTripCompleted,
  requestCustomerNotificationPermissions,
} from '../notificationService';
import { resolveCustomerTrackStatus } from '../../utils/customerTrackStatus';

export interface TrackingUpdate {
  bookingId: string;
  etaMinutes?: number;
  status?: string;
  tripStartOtp?: string;
  assignedFleetVehicleLabel?: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating?: number;
  };
  driverLocation?: {
    latitude: number;
    longitude: number;
    updatedAt?: string;
    driverName?: string;
    driverPhone?: string;
  };
  /** P-UPI-01: assigned driver's saved UPI VPA for dropoff settlement. */
  driverUpiId?: string;
  arrivedAtDropoffAt?: string;
  completionOtp?: string;
  paymentCollectionMode?: 'CASH' | 'UPI' | 'ONLINE';
  paymentConfirmedByCustomer?: boolean;
  fare?: number;
  awaitingPartnerAccept?: boolean;
}

type TrackingListener = (update: TrackingUpdate) => void;
type BookingType = 'towing' | 'driver';

class TrackingService {
  private listeners = new Map<string, Set<TrackingListener>>();
  private intervals = new Map<string, ReturnType<typeof setInterval>>();
  private socketBound = new Set<string>();
  private socketCleanups = new Map<string, Array<() => void>>();
  private latestUpdates = new Map<string, TrackingUpdate>();

  private pushUpdate(bookingId: string, update: TrackingUpdate): void {
    const previous = this.latestUpdates.get(bookingId);
    const normalizedStatus =
      update.status != null
        ? resolveCustomerTrackStatus({
            status: update.status,
            awaitingPartnerAccept: update.awaitingPartnerAccept ?? previous?.awaitingPartnerAccept,
          })
        : undefined;
    const latest = {
      ...previous,
      ...update,
      ...(normalizedStatus ? { status: normalizedStatus } : {}),
    };
    this.latestUpdates.set(bookingId, latest);

    // Trigger outer-app lockscreen notifications on status transitions
    if (update.status && update.status !== previous?.status) {
      const s = update.status.toUpperCase();
      if (s === 'DRIVER_ASSIGNED' || s === 'DRIVER_EN_ROUTE') {
        void alertDriverAssigned(latest.driver?.name, latest.etaMinutes);
      } else if (s === 'DRIVER_ARRIVED' || s === 'DRIVER_ARRIVED_PICKUP') {
        void alertDriverArrivedPickup(latest.tripStartOtp);
      } else if (s === 'IN_PROGRESS') {
        void alertTripStarted();
      } else if (s === 'DRIVER_ARRIVED_DROPOFF') {
        void alertDriverArrivedDropoff(latest.fare);
      } else if (s === 'COMPLETED') {
        void alertTripCompleted();
      }
    }

    this.listeners.get(bookingId)?.forEach((cb) => cb(latest));
  }

  private bindSocket(bookingId: string, bookingType?: BookingType): void {
    if (this.socketBound.has(bookingId)) return;
    this.socketBound.add(bookingId);

    const cleanups: Array<() => void> = [];
    cleanups.push(onSocketConnected(() => trackBooking(bookingId, bookingType ?? 'towing')));

    cleanups.push(onDriverLocation((data) => {
      if (data.bookingId !== bookingId) return;
      this.pushUpdate(bookingId, {
        bookingId,
        driverLocation: {
          latitude: data.latitude,
          longitude: data.longitude,
          updatedAt: data.updatedAt,
        },
      });
    }));

    cleanups.push(onBookingStatus((data) => {
      if (data.bookingId !== bookingId) return;
      const status = resolveCustomerTrackStatus({
        status: data.status,
        internalStatus: data.internalStatus,
        driverAccepted: data.driverAccepted,
      });
      this.pushUpdate(bookingId, {
        bookingId,
        status,
        ...(data.arrivedAtDropoffAt ? { arrivedAtDropoffAt: data.arrivedAtDropoffAt } : {}),
        ...(typeof data.fare === 'number' ? { fare: data.fare } : {}),
        ...(data.paymentConfirmed != null
          ? { paymentConfirmedByCustomer: data.paymentConfirmed }
          : {}),
        ...(data.paymentMode ? { paymentCollectionMode: data.paymentMode } : {}),
      });
    }));

    cleanups.push(onDriverArrivedDropoff((data) => {
      if (data.bookingId !== bookingId) return;
      this.pushUpdate(bookingId, {
        bookingId,
        status: data.status,
        arrivedAtDropoffAt: data.arrivedAtDropoffAt,
        fare: data.fare,
      });
    }));

    this.socketCleanups.set(bookingId, cleanups);
  }

  subscribe(bookingId: string, listener: TrackingListener, bookingType?: BookingType): () => void {
    void requestCustomerNotificationPermissions();
    if (!this.listeners.has(bookingId)) {
      this.listeners.set(bookingId, new Set());
    }
    this.listeners.get(bookingId)!.add(listener);
    this.bindSocket(bookingId, bookingType);

    if (!this.intervals.has(bookingId)) {
      let pollInFlight = false;
      const applyTyped = (result: {
        status: string;
        awaitingPartnerAccept?: boolean;
        driver?: TrackingUpdate['driver'];
        driverLocation?: TrackingUpdate['driverLocation'];
        driverUpiId?: string;
        tripStartOtp?: string;
        assignedFleetVehicleLabel?: string;
        arrivedAtDropoffAt?: string;
        completionOtp?: string;
        paymentCollectionMode?: TrackingUpdate['paymentCollectionMode'];
        paymentConfirmedByCustomer?: boolean;
        fare?: number;
      }) => {
        const status = resolveCustomerTrackStatus({
          status: result.status,
          awaitingPartnerAccept: result.awaitingPartnerAccept,
        });
        this.pushUpdate(bookingId, {
          bookingId,
          status,
          awaitingPartnerAccept: result.awaitingPartnerAccept,
          driver: result.driver,
          driverLocation: result.driverLocation,
          driverUpiId: result.driverUpiId,
          tripStartOtp: result.tripStartOtp,
          assignedFleetVehicleLabel: result.assignedFleetVehicleLabel,
          arrivedAtDropoffAt: result.arrivedAtDropoffAt,
          completionOtp: result.completionOtp,
          paymentCollectionMode: result.paymentCollectionMode,
          paymentConfirmedByCustomer: result.paymentConfirmedByCustomer,
          fare: result.fare,
        });
      };

      const poll = async () => {
        // Skip overlapping ticks — prevents stacked HTTP when a poll is slow.
        if (pollInFlight) return;
        pollInFlight = true;
        try {
          if (bookingType === 'towing') {
            applyTyped(await getTowingBookingTracking(bookingId));
            return;
          }
          if (bookingType === 'driver') {
            applyTyped(await getDriverBookingTracking(bookingId));
            return;
          }

          // Unknown type: one typed resolve path (no towing+driver double probe).
          const legacy = await getBookingTracking(bookingId);
          if (!legacy) return;
          this.pushUpdate(bookingId, {
            bookingId,
            ...(legacy.etaMinutes != null ? { etaMinutes: legacy.etaMinutes } : {}),
            status: legacy.status,
            driverLocation: legacy.driverLocation,
            tripStartOtp: legacy.tripStartOtp,
            assignedFleetVehicleLabel: legacy.assignedFleetVehicleLabel,
            arrivedAtDropoffAt: (legacy as { arrivedAtDropoffAt?: string }).arrivedAtDropoffAt,
            completionOtp: (legacy as { completionOtp?: string }).completionOtp,
            paymentCollectionMode: (legacy as { paymentCollectionMode?: TrackingUpdate['paymentCollectionMode'] })
              .paymentCollectionMode,
            paymentConfirmedByCustomer: (legacy as { paymentConfirmedByCustomer?: boolean })
              .paymentConfirmedByCustomer,
            fare: (legacy as { fare?: number }).fare,
          });
        } catch {
          // Keep last known state; next tick / socket may recover.
        } finally {
          pollInFlight = false;
        }
      };

      void poll();
      const interval = setInterval(() => {
        void poll();
      }, 8_000);
      this.intervals.set(bookingId, interval);
    }

    return () => {
      this.listeners.get(bookingId)?.delete(listener);
      if (this.listeners.get(bookingId)?.size === 0) {
        const interval = this.intervals.get(bookingId);
        if (interval) clearInterval(interval);
        this.intervals.delete(bookingId);
        this.listeners.delete(bookingId);
        this.socketBound.delete(bookingId);
        this.latestUpdates.delete(bookingId);
        this.socketCleanups.get(bookingId)?.forEach((cleanup) => cleanup());
        this.socketCleanups.delete(bookingId);
      }
    };
  }

  connect(_url?: string): void {
    // Reserved for future WebSocket
  }

  disconnect(): void {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
    this.listeners.clear();
    this.socketBound.clear();
    this.socketCleanups.forEach((cleanups) => cleanups.forEach((cleanup) => cleanup()));
    this.socketCleanups.clear();
    this.latestUpdates.clear();
  }
}

export const trackingService = new TrackingService();
