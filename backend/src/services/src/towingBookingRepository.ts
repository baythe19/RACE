import {
  TowingBookingModel,
  type ITowingBooking,
} from '../../models/src/towingBooking';
import type { UnifiedBookingStatus } from './bookingStatusConstants';

export class TowingBookingRepository {
  async create(data: Partial<ITowingBooking>): Promise<ITowingBooking> {
    return TowingBookingModel.create(data);
  }

  async findById(id: string): Promise<ITowingBooking | null> {
    return TowingBookingModel.findById(id);
  }

  async findByIdWithOtp(id: string): Promise<ITowingBooking | null> {
    return TowingBookingModel.findById(id).select('+tripStartOtpEncrypted +completionOtpEncrypted');
  }

  async findByIdForCustomer(id: string, customerId: string): Promise<ITowingBooking | null> {
    return TowingBookingModel.findOne({ _id: id, customerId });
  }

  async findByCustomer(
    customerId: string,
    options?: { status?: UnifiedBookingStatus },
  ): Promise<ITowingBooking[]> {
    const filter: Record<string, unknown> = { customerId };
    if (options?.status) {
      filter.status = options.status;
    }
    return TowingBookingModel.find(filter).sort({ createdAt: -1 });
  }

  async findByCustomerWithOtp(
    customerId: string,
    options?: { status?: UnifiedBookingStatus },
  ): Promise<ITowingBooking[]> {
    const filter: Record<string, unknown> = { customerId };
    if (options?.status) filter.status = options.status;
    return TowingBookingModel.find(filter)
      .select('+tripStartOtpEncrypted +completionOtpEncrypted')
      .sort({ createdAt: -1 });
  }

  async findByDriver(
    driverId: string,
    options?: { status?: UnifiedBookingStatus },
  ): Promise<ITowingBooking[]> {
    const filter: Record<string, unknown> = { driverId };
    if (options?.status) {
      filter.status = options.status;
    }
    return TowingBookingModel.find(filter).sort({ createdAt: -1 });
  }

  async findByDriverWithOtp(
    driverId: string,
    options?: { status?: UnifiedBookingStatus },
  ): Promise<ITowingBooking[]> {
    const filter: Record<string, unknown> = { driverId };
    if (options?.status) filter.status = options.status;
    return TowingBookingModel.find(filter)
      .select('+tripStartOtpEncrypted +completionOtpEncrypted')
      .sort({ createdAt: -1 });
  }

  async updateById(
    id: string,
    update: Partial<ITowingBooking>,
  ): Promise<ITowingBooking | null> {
    return TowingBookingModel.findByIdAndUpdate(id, update, { new: true });
  }

  async updateStatus(
    id: string,
    expectedStatus: UnifiedBookingStatus,
    status: UnifiedBookingStatus,
    extra?: Partial<ITowingBooking>,
    expectedFields: Record<string, unknown> = {},
  ): Promise<ITowingBooking | null> {
    return TowingBookingModel.findOneAndUpdate(
      { _id: id, status: expectedStatus, ...expectedFields },
      {
        $set: { status, ...(extra ?? {}) },
        $push: { statusHistory: { status, timestamp: new Date() } },
      },
      { new: true, runValidators: true },
    );
  }

  async countAll(): Promise<number> {
    return TowingBookingModel.countDocuments();
  }
}

export const towingBookingRepository = new TowingBookingRepository();
