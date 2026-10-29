import {
  DriverBookingModel,
  type IDriverBooking,
} from '../../models/src/driverBooking';
import type { UnifiedBookingStatus } from './bookingStatusConstants';

export class DriverBookingRepository {
  async create(data: Partial<IDriverBooking>): Promise<IDriverBooking> {
    return DriverBookingModel.create(data);
  }

  async findById(id: string): Promise<IDriverBooking | null> {
    return DriverBookingModel.findById(id);
  }

  async findByIdForCustomer(id: string, customerId: string): Promise<IDriverBooking | null> {
    return DriverBookingModel.findOne({ _id: id, customerId });
  }

  async findByCustomer(
    customerId: string,
    options?: { status?: UnifiedBookingStatus },
  ): Promise<IDriverBooking[]> {
    const filter: Record<string, unknown> = { customerId };
    if (options?.status) {
      filter.status = options.status;
    }
    return DriverBookingModel.find(filter).sort({ createdAt: -1 });
  }

  async findByDriver(
    driverId: string,
    options?: { status?: UnifiedBookingStatus },
  ): Promise<IDriverBooking[]> {
    const filter: Record<string, unknown> = { driverId };
    if (options?.status) {
      filter.status = options.status;
    }
    return DriverBookingModel.find(filter).sort({ createdAt: -1 });
  }

  async findByIdWithOtp(id: string): Promise<IDriverBooking | null> {
    return DriverBookingModel.findById(id).select('+tripStartOtpEncrypted +completionOtpEncrypted');
  }

  async findByCustomerWithOtp(
    customerId: string,
    options?: { status?: UnifiedBookingStatus },
  ): Promise<IDriverBooking[]> {
    const filter: Record<string, unknown> = { customerId };
    if (options?.status) filter.status = options.status;
    return DriverBookingModel.find(filter)
      .select('+tripStartOtpEncrypted +completionOtpEncrypted')
      .sort({ createdAt: -1 });
  }

  async findByDriverWithOtp(
    driverId: string,
    options?: { status?: UnifiedBookingStatus },
  ): Promise<IDriverBooking[]> {
    const filter: Record<string, unknown> = { driverId };
    if (options?.status) filter.status = options.status;
    return DriverBookingModel.find(filter)
      .select('+tripStartOtpEncrypted +completionOtpEncrypted')
      .sort({ createdAt: -1 });
  }

  async updateById(
    id: string,
    update: Partial<IDriverBooking>,
  ): Promise<IDriverBooking | null> {
    return DriverBookingModel.findByIdAndUpdate(id, update, { new: true });
  }

  async updateStatus(
    id: string,
    expectedStatus: UnifiedBookingStatus,
    status: UnifiedBookingStatus,
    extra?: Partial<IDriverBooking>,
    expectedFields: Record<string, unknown> = {},
  ): Promise<IDriverBooking | null> {
    return DriverBookingModel.findOneAndUpdate(
      { _id: id, status: expectedStatus, ...expectedFields },
      {
        $set: { status, ...(extra ?? {}) },
        $push: { statusHistory: { status, timestamp: new Date() } },
      },
      { new: true, runValidators: true },
    );
  }

  async countAll(): Promise<number> {
    return DriverBookingModel.countDocuments();
  }
}

export const driverBookingRepository = new DriverBookingRepository();

