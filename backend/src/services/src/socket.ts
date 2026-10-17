import { Server as SocketIOServer, type Socket } from 'socket.io';

import { env } from '../../config/env';
import { logger } from '../../utils/src/logger';
import { verifyAccessToken } from '../../utils/src/jwt';
import { DriverBookingModel } from '../../models/src/driverBooking';
import { TowingBookingModel } from '../../models/src/towingBooking';
import { UserModel } from '../../models/src/user';

let io: SocketIOServer | null = null;
const DRIVER_OFFER_ROOM = 'drivers:open-offers';

interface SocketPrincipal {
  userId: string;
  role: string;
  mobileNumber: string;
}

type SocketWithPrincipal = Socket & { data: { principal?: SocketPrincipal } };

/**
 * BUG-03 / VOC P0.3 fix — socket handshake now requires a valid user access
 * token (the same JWT the REST API uses). Admin tokens are rejected because
 * verifyAccessToken enforces the user token shape.
 */
function authenticateHandshake(socket: SocketWithPrincipal): boolean {
  const header =
    (socket.handshake.auth?.token as string | undefined) ??
    (socket.handshake.headers?.authorization as string | undefined);
  const token = header?.startsWith('Bearer ') ? header.slice(7) : header;

  if (!token) {
    logger.warn('Socket connection rejected: missing token', { socketId: socket.id });
    return false;
  }
  try {
    const payload = verifyAccessToken(token);
    socket.data.principal = {
      userId: payload.sub,
      role: payload.role,
      mobileNumber: payload.mobileNumber,
    };
    logger.info('Socket authenticated', {
      socketId: socket.id,
      userId: payload.sub,
      role: payload.role,
    });
    return true;
  } catch {
    logger.warn('Socket connection rejected: invalid token', { socketId: socket.id });
    return false;
  }
}

/**
 * Room membership is derived from the authenticated principal, never from
 * client-supplied ids alone:
 *  - drivers may join only their own driver room;
 *  - admins may join any room;
 *  - everyone else (customer/vendor) may join a booking room only if they are
 *    the booking's customer or own the booking's vendor.
 */
async function authorizeBookingRoom(
  principal: SocketPrincipal,
  bookingId: string,
): Promise<boolean> {
  if (principal.role === 'admin') return true;
  if (principal.role === 'driver') return false; // drivers use driver:join, not booking rooms

  try {
    const [driverBooking, towingBooking] = await Promise.all([
      DriverBookingModel.findById(bookingId)
        .select('customerId vendorId')
        .lean()
        .exec(),
      TowingBookingModel.findById(bookingId).select('customerId vendorId').lean().exec(),
    ]);
    const booking = driverBooking ?? towingBooking;
    if (!booking) return false;

    const customerId = booking.customerId?.toString();
    const vendorId = booking.vendorId?.toString();
    if (customerId && customerId === principal.userId) return true;
    if (vendorId && vendorId === principal.userId) return true;

    // Vendors also see bookings routed through their fleet drivers.
    if (principal.role === 'vendor') {
      const linked = await (
        driverBooking ? DriverBookingModel : TowingBookingModel
      )
        .countDocuments({ _id: bookingId, vendorId: principal.userId })
        .exec();
      return linked > 0;
    }
    return false;
  } catch {
    return false;
  }
}

async function authorizeDriverRoom(
  principal: SocketPrincipal,
  driverId: string,
): Promise<boolean> {
  if (principal.role === 'admin') return true;
  if (principal.userId !== driverId) {
    // A vendor may watch the driver room of a driver in their fleet.
    if (principal.role === 'vendor') {
      const linked = await UserModel.countDocuments({
        _id: driverId,
        role: 'driver',
        'driverProfile.vendorUserId': principal.userId,
      }).exec();
      return linked > 0;
    }
    return false;
  }
  return principal.role === 'driver';
}

export function initializeSocket(httpServer: import('http').Server): void {
  io = new SocketIOServer(httpServer, {
    cors: {
      // BUG-15: same production rule as the REST app — no wildcard reflect in
      // production; native apps (custom origins) are unaffected by CORS anyway.
      origin:
        env.NODE_ENV === 'production' && env.CORS_ORIGIN === '*'
          ? false
          : env.CORS_ORIGIN === '*'
            ? true
            : env.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    if (authenticateHandshake(socket as SocketWithPrincipal)) {
      next();
    } else {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as SocketWithPrincipal;
    const principal = socket.data.principal;
    if (!principal) return;

    socket.join(`user:${principal.userId}`);
    if (principal.role === 'driver') socket.join(DRIVER_OFFER_ROOM);

    socket.on('driver:join', async (data: { driverId: string }) => {
      const driverId = String(data?.driverId ?? '');
      if (!driverId) return;
      const allowed = await authorizeDriverRoom(principal, driverId);
      if (!allowed) {
        logger.warn('driver:join denied', { socketId: socket.id, userId: principal.userId, driverId });
        return;
      }
      socket.join(`driver:${driverId}`);
    });

    socket.on('booking:track', async (data: { bookingId: string; bookingType: string }) => {
      const bookingId = String(data?.bookingId ?? '');
      if (!bookingId) return;
      const allowed = await authorizeBookingRoom(principal, bookingId);
      if (!allowed) {
        logger.warn('booking:track denied', {
          socketId: socket.id,
          userId: principal.userId,
          bookingId,
        });
        return;
      }
      socket.join(`booking:${bookingId}`);
    });
  });
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

export function emitToDriver(driverId: string, event: string, data: unknown): void {
  if (!io) return;
  getIO().to(`driver:${driverId}`).emit(event, data);
}

/** Broadcast a data-free invalidation signal only to authenticated driver sessions. */
export function emitDriverOffersUpdated(): void {
  if (!io) return;
  io.to(DRIVER_OFFER_ROOM).emit('job:offer', { updatedAt: new Date().toISOString() });
}

/** Deliver a data-free notification refresh signal to one authenticated user. */
export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

async function emitAssignedDriverBookingUpdate(
  bookingId: string,
  status: string,
): Promise<void> {
  try {
    const [driverBooking, towingBooking] = await Promise.all([
      DriverBookingModel.findById(bookingId).select('driverId').lean().exec(),
      TowingBookingModel.findById(bookingId).select('driverId').lean().exec(),
    ]);
    const driverId = (driverBooking ?? towingBooking)?.driverId?.toString();
    if (!driverId) return;

    emitToDriver(driverId, 'booking:status', {
      bookingId,
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.warn('Could not emit booking update to assigned driver', {
      bookingId,
      status,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function emitToBooking(bookingId: string, event: string, data: unknown): void {
  if (!io) return;
  getIO().to(`booking:${bookingId}`).emit(event, data);
}

export function emitDriverLocation(
  bookingId: string,
  driverId: string,
  latitude: number,
  longitude: number,
): void {
  emitToBooking(bookingId, 'driver:location', {
    bookingId,
    driverId,
    latitude,
    longitude,
    updatedAt: new Date().toISOString(),
  });
}

export function emitBookingStatusUpdate(
  bookingId: string,
  status: string,
  data?: Record<string, unknown>,
): void {
  if (!io) return;
  emitToBooking(bookingId, 'booking:status', {
    bookingId,
    status,
    updatedAt: new Date().toISOString(),
    ...(data ?? {}),
  });
  if (status === 'CONFIRMED') emitDriverOffersUpdated();
  void emitAssignedDriverBookingUpdate(bookingId, status);
}
