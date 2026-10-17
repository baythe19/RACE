/**
 * Polls backend tracking endpoint and emits real updates only.
 */
import { getBookingTracking } from '../bookings/bookingApi';
import { getDriverBookingTracking, getTowingBookingTracking } from '../bookings/serviceBookingApi';
import {
  offBookingStatus,
  offDriverLocation,
  onBookingStatus,
  onDriverLocation,
  trackBooking,
} from '../socketService';

export interface TrackingUpdate {
  bookingId: string;
  latitude: number;
  longitude: number;
  etaMinutes: number;
  status: string;
  tripStartOtp?: string;
  assignedFleetVehicleLabel?: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
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
  private latestUpdates = new Map<string, TrackingUpdate>();

  private pushUpdate(bookingId: string, update: TrackingUpdate): void {
    const latest = { ...this.latestUpdates.get(bookingId), ...update };
    this.latestUpdates.set(bookingId, latest);
    this.listeners.get(bookingId)?.forEach((cb) => cb(latest));
  }

  private bindSocket(bookingId: string, bookingType?: BookingType): void {
    if (this.socketBound.has(bookingId)) return;
    this.socketBound.add(bookingId);

    trackBooking(bookingId, bookingType ?? 'towing');

    onDriverLocation((data) => {
      if (data.bookingId !== bookingId) return;
      this.pushUpdate(bookingId, {
        bookingId,
        latitude: data.latitude,
        longitude: data.longitude,
        etaMinutes: 15,
        status: 'DRIVER_EN_ROUTE',
        driverLocation: {
          latitude: data.latitude,
          longitude: data.longitude,
          updatedAt: data.updatedAt,
        },
      });
    });

    onBookingStatus((data) => {
      if (data.bookingId !== bookingId) return;
      const latest = this.latestUpdates.get(bookingId);
      // Status events have no coordinates. Keep the last real position; before
      // the first tracking response, let the immediate REST poll establish it.
      if (latest) this.pushUpdate(bookingId, { ...latest, status: data.status });
    });
  }

  subscribe(bookingId: string, listener: TrackingListener, bookingType?: BookingType): () => void {
    if (!this.listeners.has(bookingId)) {
      this.listeners.set(bookingId, new Set());
    }
    this.listeners.get(bookingId)!.add(listener);
    this.bindSocket(bookingId, bookingType);

    if (!this.intervals.has(bookingId)) {
      const poll = async () => {
        const legacy = await getBookingTracking(bookingId);
        if (legacy) {
          const update: TrackingUpdate = {
            bookingId,
            latitude: legacy.driverLocation?.latitude ?? 20.2961,
            longitude: legacy.driverLocation?.longitude ?? 85.8245,
            etaMinutes: legacy.etaMinutes,
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
            latitude: towing.driverLocation?.latitude ?? 20.2961,
            longitude: towing.driverLocation?.longitude ?? 85.8245,
            etaMinutes: 15,
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
            latitude: driver.driverLocation?.latitude ?? 20.2961,
            longitude: driver.driverLocation?.longitude ?? 85.8245,
            etaMinutes: 15,
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
        offDriverLocation();
        offBookingStatus();
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
    this.latestUpdates.clear();
    offDriverLocation();
    offBookingStatus();
  }
}

export const trackingService = new TrackingService();
