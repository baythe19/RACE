import { logger } from '../../utils/src/logger';
import { UserModel } from '../../models/src/user';
import { BookingModel } from '../../models/src/booking';
import { DriverBookingModel } from '../../models/src/driverBooking';
import { TowingBookingModel } from '../../models/src/towingBooking';
import { PaymentTransactionModel } from '../../models/src/paymentTransaction';
import { TransactionModel } from '../../models/src/transaction';
import {
  SubscriptionPlanModel,
  UserSubscriptionModel,
} from '../../models/src/subscription';
import { ActivityLogModel } from '../../models/src/activityLog';
import { NotificationModel } from '../../models/src/notification';
import { VehicleModel } from '../../models/src/vehicle';
import { VendorVehicleModel } from '../../models/src/vendorVehicle';
import { DriverVendorMembershipModel } from '../../models/src/driverVendorMembership';

const MODELS = [
  UserModel,
  BookingModel,
  TowingBookingModel,
  DriverBookingModel,
  PaymentTransactionModel,
  TransactionModel,
  SubscriptionPlanModel,
  UserSubscriptionModel,
  ActivityLogModel,
  NotificationModel,
  VehicleModel,
  VendorVehicleModel,
  DriverVendorMembershipModel,
];

export async function ensureDatabaseIndexes(): Promise<void> {
  await Promise.all(MODELS.map((model) => model.syncIndexes()));
  logger.info('MongoDB indexes ensured', { collections: MODELS.map((m) => m.collection.name) });
}
