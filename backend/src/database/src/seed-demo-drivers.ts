import dotenv from 'dotenv';

import { assertSeedAllowed } from './seed-guard';

import { connectDatabase, disconnectDatabase } from './connection';
import { driverRepository } from '../../services/src/driverRepository';
import { UserModel } from '../../models/src/user';
import { logger } from '../../utils/src/logger';

dotenv.config();

assertSeedAllowed("seed:demo-drivers");

const DEMO_DRIVERS = [
  {
    fullName: 'Om Singh',
    mobileNumber: '+918888880001',
    driverCode: 'DEMO001',
    licenseNo: 'OD-DEMO-0001',
    driverType: 'Tow Driver',
    city: 'Bhubaneswar',
    latitude: 20.2961,
    longitude: 85.8245,
  },
  {
    fullName: 'Ramesh',
    mobileNumber: '+918888880002',
    driverCode: 'DEMO002',
    licenseNo: 'OD-DEMO-0002',
    driverType: 'Full-Time',
    city: 'Bhubaneswar',
    latitude: 20.3012,
    longitude: 85.831,
  },
  {
    fullName: 'Vaibhav',
    mobileNumber: '+918888880003',
    driverCode: 'DEMO003',
    licenseNo: 'OD-DEMO-0003',
    driverType: 'Part-Time',
    city: 'Bhubaneswar',
    latitude: 20.2895,
    longitude: 85.8198,
  },
] as const;

async function upsertDemoDriver(driver: (typeof DEMO_DRIVERS)[number]): Promise<void> {
  const now = new Date();
  const existing = await UserModel.findOne({
    mobileNumber: driver.mobileNumber,
    role: 'driver',
  }).exec();

  if (existing) {
    existing.fullName = driver.fullName;
    existing.isAvailable = true;
    existing.activeBookingId = null;
    existing.activeBookingType = null;
    existing.currentLocation = {
      latitude: driver.latitude,
      longitude: driver.longitude,
      updatedAt: now,
    };
    if (existing.driverProfile) {
      existing.driverProfile.driverCode = driver.driverCode;
      existing.driverProfile.licenseNo = driver.licenseNo;
      existing.driverProfile.driverType = driver.driverType;
      existing.driverProfile.city = driver.city;
      existing.driverProfile.status = 'APPROVED';
      existing.driverProfile.rating = existing.driverProfile.rating || 4.8;
    }
    await existing.save();
    logger.info('Updated demo driver', { name: driver.fullName, id: existing.id });
    return;
  }

  const created = await driverRepository.create({
    fullName: driver.fullName,
    mobileNumber: driver.mobileNumber,
    driverCode: driver.driverCode,
    licenseNo: driver.licenseNo,
    driverType: driver.driverType,
    city: driver.city,
    state: 'Odisha',
    vehicleRegistration: `OD-DEMO-${driver.driverCode.slice(-3)}`,
    status: 'APPROVED',
    statusHistory: [{ status: 'APPROVED', changedAt: now }],
    isVerified: true,
  });

  await UserModel.findByIdAndUpdate(created.id, {
    isAvailable: true,
    activeBookingId: null,
    activeBookingType: null,
    currentLocation: {
      latitude: driver.latitude,
      longitude: driver.longitude,
      updatedAt: now,
    },
    'driverProfile.rating': 4.8,
  }).exec();

  logger.info('Created demo driver', { name: driver.fullName, id: created.id });
}

async function run(): Promise<void> {
  await connectDatabase();

  for (const driver of DEMO_DRIVERS) {
    await upsertDemoDriver(driver);
  }

  logger.info('Demo drivers ready', {
    drivers: DEMO_DRIVERS.map((d) => ({
      name: d.fullName,
      mobile: d.mobileNumber,
      type: d.driverType,
    })),
  });

  await disconnectDatabase();
}

run().catch(async (error: Error) => {
  logger.error('Demo driver seed failed', { error: error.message });
  await disconnectDatabase();
  process.exit(1);
});
