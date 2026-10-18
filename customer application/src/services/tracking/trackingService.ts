/**
 * Polls backend tracking endpoint and emits real updates only.
 */
import { getBookingTracking } from '../bookings/bookingApi';
import { getDriverBookingTracking, getTowingBookingTracking } from '../bookings/serviceBookingApi';
import {
  onSocketConnected,
  onBookingStatus,
  onDriverLocation,
  trackBooking,
} from '../socketService';

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
    const latest = { ...this.latestUpdates.get(bookingId), ...update };
    this.latestUpdates.set(bookingId, latest);
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
      // Status is valid independently of GPS and may arrive before the first poll.
      this.pushUpdate(bookingId, { bookingId, status: data.status });
    }));

    this.socketCleanups.set(bookingId, cleanups);
  }

  subscribe(bookingId: string, listener: TrackingListener, bookingType?: BookingType): () => void {
    if (!this.listeners.has(bookingId)) {
      this.listeners.set(bookingId, new Set());
    }
    this.listeners.get(bookingId)!.add(listener);
    this.bindSocket(bookingId, bookingType);

    if (!this.intervals.has(bookingId)) {
      const poll = async () => {
        const legacy = await getBookingTracking(bookingId, bookingType);
        if (legacy) {
          const update: TrackingUpdate = {
            bookingId,
            ...(legacy.etaMinutes != null ? { etaMinutes: legacy.etaMinutes } : {}),
            status: legacy.status,
            driverLocation: legacy.driverLocation,
            tripStartOtp: legacy.tripStartOtp,
            assignedFleetVehicleLabel: legacy.assignedFleetVehicleLabel,
          };
          this.pushUpdate(bookingId, update);
          return;
        }

        try {
          const towing =
            bookingType === 'driver' ? null : await getTowingBookingTracking(bookingId);
          if (!towing) {
            throw new Error('Skip towing tracking lookup');
          }
          const update: TrackingUpdate = {
            bookingId,
            status: towing.status,
            driver: towing.driver,
            driverLocation: towing.driverLocation,
            tripStartOtp: towing.tripStartOtp,
            assignedFleetVehicleLabel: towing.assignedFleetVehicleLabel,
          };
          this.pushUpdate(bookingId, update);
          return;
        } catch {
          // try driver booking tracking next
        }

        try {
          const driver = await getDriverBookingTracking(bookingId);
          const update: TrackingUpdate = {
            bookingId,
            status: driver.status,
            driver: driver.driver,
            driverLocation: driver.driverLocation,
            tripStartOtp: driver.tripStartOtp,
            assignedFleetVehicleLabel: driver.assignedFleetVehicleLabel,
          };
          this.pushUpdate(bookingId, update);
          return;
        } catch {
          // no-op: keep previous known state and wait for next poll/socket event
        }
      };

      void poll();
      const interval = setInterval(() => {
        void poll();
      }, 5000);
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
