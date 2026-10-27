import dotenv from 'dotenv';

import { connectDatabase, disconnectDatabase } from './connection';
import { ensureDatabaseIndexes } from './indexes';
import { brandRepository } from '../../services/src/brandRepository';
import { serviceRepository } from '../../services/src/serviceRepository';
import type { IService } from '../../models/src/service';
import { UserModel } from '../../models/src/user';
import { VehicleModel } from '../../models/src/vehicle';
import { VendorVehicleModel } from '../../models/src/vendorVehicle';
import { TowingBookingModel } from '../../models/src/towingBooking';
import { DriverBookingModel } from '../../models/src/driverBooking';
import { SubscriptionPlanModel } from '../../models/src/subscription';
import { PlatformSettingsModel } from '../../models/src/platformSettings';
import { OtpLogModel } from '../../models/src/otpLog';
import { logger } from '../../utils/src/logger';
import { seedAdminPlatform } from './admin-seed';

import brandData from '../seed-data/brand.json';
import colorsData from '../seed-data/colors.json';
import servicesData from '../seed-data/services.json';

dotenv.config();

export const MOCK_USERS = {
  admin: {
    email: 'admin@raceservice.com',
    password: 'Admin@123',
  },
  customer: {
    mobileNumber: '+919876543299',
    fullName: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    gender: 'male' as const,
    address: {
      line1: 'Flat 402, Royal Residency',
      city: 'Bhubaneswar',
      state: 'Odisha',
      pincode: '751024',
      country: 'India',
    },
    emergencyContact: {
      name: 'Pooja Sharma',
      mobileNumber: '+919999911111',
      relationship: 'Spouse',
    },
  },
  driverTow: {
    mobileNumber: '+918888880001',
    fullName: 'Om Singh (Tow Driver)',
    driverCode: 'DRV-TOW-001',
    licenseNo: 'OD-02-DL-20180001',
    driverType: 'Tow Driver',
    city: 'Bhubaneswar',
    latitude: 20.2961,
    longitude: 85.8245,
  },
  driverChauffeur: {
    mobileNumber: '+918888880002',
    fullName: 'Ramesh Kumar (Chauffeur)',
    driverCode: 'DRV-CHF-002',
    licenseNo: 'OD-02-DL-20190002',
    driverType: 'Full-Time',
    city: 'Bhubaneswar',
    latitude: 20.3012,
    longitude: 85.831,
  },
  vendor: {
    mobileNumber: '+919812345670',
    fullName: 'Kalinga Fleet Owner',
    email: 'vendor@kalingatowing.com',
    businessName: 'Kalinga Towing & Logistics Services',
    ownerName: 'Bikram Keshari Rout',
    address: 'Plot 104, Rasulgarh Industrial Estate, Bhubaneswar',
  },
};

async function seedServices(): Promise<number> {
  const categories = servicesData as any[];
  const records: Partial<IService>[] = [];
  let sortOrder = 0;

  for (const category of categories) {
    for (const service of category.services) {
      records.push({
        slug: service.id,
        category: category.id,
        categoryTitle: category.title,
        categoryIcon: category.icon,
        categoryDescription: category.description,
        title: service.label,
        description: service.description,
        icon: category.icon,
        isActive: true,
        sortOrder: sortOrder++,
      });
    }
  }

  await serviceRepository.upsertMany(records);
  return records.length;
}

async function seedBrand(): Promise<void> {
  await brandRepository.upsertBrand({
    appName: brandData.name,
    productName: brandData.productName,
    website: brandData.website,
    tagline: brandData.tagline,
    description: brandData.description,
    location: brandData.location,
    supportPhone: brandData.phone,
    email: brandData.email,
    company: brandData.company,
    highlights: brandData.highlights,
    features: brandData.features,
    logo: '/assets/logo.png',
    primaryColor: colorsData.primary,
    secondaryColor: colorsData.secondary,
    colors: colorsData,
    isActive: true,
  });
}

async function seedPlatformSettings(): Promise<void> {
  await PlatformSettingsModel.findOneAndUpdate(
    {},
    {
      commissionRate: 10,
      emergencyNumber: '+911080808080',
      supportNumber: '+911800123456',
      sosNotificationRadiusKm: 15,
      autoAssignDrivers: true,
      driverSearchRadiusKm: 25,
      cancellationGracePeriodMinutes: 5,
    },
    { upsert: true, new: true },
  );
}

async function seedSubscriptionPlans(): Promise<void> {
  const plans = [
    {
      slug: 'towing-gold',
      name: 'Towing Partner Gold',
      audience: 'vendor',
      category: 'towing',
      price: 1999,
      currency: 'INR',
      billingCycle: 'monthly',
      features: [
        { text: 'Priority Booking Dispatch', included: true },
        { text: 'Reduced 8% Commission', included: true },
        { text: '24/7 Dedicated Partner Hotline', included: true },
      ],
      benefits: {
        commissionRate: 8,
        priorityLeads: true,
        featuredListing: true,
        performanceBadge: true,
        reducedCommission: true,
      },
      isMostPopular: true,
      actionType: 'purchase',
      isActive: true,
    },
    {
      slug: 'driver-starter',
      name: 'Chauffeur Basic',
      audience: 'customer',
      category: 'driver',
      price: 499,
      currency: 'INR',
      billingCycle: 'monthly',
      features: [
        { text: '5 Free Driver Hours Monthly', included: true },
        { text: 'Free Vehicle Sanitization', included: true },
      ],
      isMostPopular: false,
      actionType: 'purchase',
      isActive: true,
    },
  ];

  for (const p of plans) {
    await SubscriptionPlanModel.findOneAndUpdate({ slug: p.slug }, p, { upsert: true, new: true });
  }
}

async function seedTestUsers(): Promise<void> {
  const now = new Date();

  // 1. Seed Customer
  let customer = await UserModel.findOne({ mobileNumber: MOCK_USERS.customer.mobileNumber });
  if (!customer) {
    customer = new UserModel({
      mobileNumber: MOCK_USERS.customer.mobileNumber,
      fullName: MOCK_USERS.customer.fullName,
      email: MOCK_USERS.customer.email,
      gender: MOCK_USERS.customer.gender,
      address: MOCK_USERS.customer.address,
      emergencyContact: MOCK_USERS.customer.emergencyContact,
      isVerified: true,
      isProfileCompleted: true,
      role: 'customer',
      accountStatus: 'ACTIVE',
    });
    await customer.save();
  } else {
    customer.fullName = MOCK_USERS.customer.fullName;
    customer.isVerified = true;
    customer.isProfileCompleted = true;
    await customer.save();
  }

  // Seed Customer Vehicles
  await VehicleModel.deleteMany({ customerId: customer._id });
  const vehicle1 = await VehicleModel.create({
    customerId: customer._id,
    vehicleType: 'car',
    vehicleNumber: 'OD-02-AB-1234',
    brand: 'Hyundai',
    vehicleModel: 'Creta SX (O)',
    color: 'Polar White',
    fuelType: 'diesel',
    qrCode: 'RACE-VEH-1234',
  });

  await VehicleModel.create({
    customerId: customer._id,
    vehicleType: 'bike',
    vehicleNumber: 'OD-02-XY-5678',
    brand: 'Honda',
    vehicleModel: 'Activa 6G',
    color: 'Matte Axis Grey',
    fuelType: 'petrol',
    qrCode: 'RACE-VEH-5678',
  });

  // 2. Seed Vendor
  let vendor = await UserModel.findOne({ mobileNumber: MOCK_USERS.vendor.mobileNumber });
  if (!vendor) {
    vendor = new UserModel({
      mobileNumber: MOCK_USERS.vendor.mobileNumber,
      fullName: MOCK_USERS.vendor.fullName,
      email: MOCK_USERS.vendor.email,
      isVerified: true,
      isProfileCompleted: true,
      role: 'vendor',
      accountStatus: 'ACTIVE',
      vendorProfile: {
        vendorType: 'towing_company',
        status: 'approved',
        verificationStage: 'approved',
        businessName: MOCK_USERS.vendor.businessName,
        ownerName: MOCK_USERS.vendor.ownerName,
        address: MOCK_USERS.vendor.address,
        bankDetails: {
          accountHolderName: 'Kalinga Towing Services',
          accountNumber: '91881234567890',
          ifsc: 'SBIN0001234',
          bankName: 'State Bank of India',
        },
        statusHistory: [{ status: 'approved', changedAt: now, note: 'Pre-approved mock vendor' }],
        submittedAt: now,
        approvedAt: now,
      },
    });
    await vendor.save();
  } else {
    vendor.role = 'vendor';
    vendor.isVerified = true;
    vendor.isProfileCompleted = true;
    vendor.vendorProfile = {
      vendorType: 'towing_company',
      status: 'approved',
      verificationStage: 'approved',
      businessName: MOCK_USERS.vendor.businessName,
      ownerName: MOCK_USERS.vendor.ownerName,
      address: MOCK_USERS.vendor.address,
      bankDetails: {
        accountHolderName: 'Kalinga Towing Services',
        accountNumber: '91881234567890',
        ifsc: 'SBIN0001234',
        bankName: 'State Bank of India',
      },
      statusHistory: [{ status: 'approved', changedAt: now, note: 'Pre-approved mock vendor' }],
      submittedAt: now,
      approvedAt: now,
    };
    await vendor.save();
  }

  // Seed Vendor Fleet Vehicles
  await VendorVehicleModel.deleteMany({ vendorId: vendor._id });
  const vendorVehicle1 = await VendorVehicleModel.create({
    vendorId: vendor._id,
    registrationNo: 'OD-02-TOW-1001',
    type: 'Flatbed Tow Truck',
    vehicleModel: 'Tata 407 Recovery',
    year: 2022,
    status: 'ACTIVE',
  });
  await VendorVehicleModel.create({
    vendorId: vendor._id,
    registrationNo: 'OD-02-TOW-1002',
    type: 'Wheel-Lift Tow Truck',
    vehicleModel: 'Mahindra Bolero Maxi Truck',
    year: 2021,
    status: 'ACTIVE',
  });

  // 3. Seed Tow Driver (Linked to Vendor)
  let towDriver = await UserModel.findOne({ mobileNumber: MOCK_USERS.driverTow.mobileNumber });
  if (!towDriver) {
    towDriver = new UserModel({
      mobileNumber: MOCK_USERS.driverTow.mobileNumber,
      fullName: MOCK_USERS.driverTow.fullName,
      role: 'driver',
      isVerified: true,
      isProfileCompleted: true,
      isAvailable: true,
      accountStatus: 'ACTIVE',
      currentLocation: {
        latitude: MOCK_USERS.driverTow.latitude,
        longitude: MOCK_USERS.driverTow.longitude,
        updatedAt: now,
      },
      driverProfile: {
        driverCode: MOCK_USERS.driverTow.driverCode,
        licenseNo: MOCK_USERS.driverTow.licenseNo,
        vendorUserId: vendor._id,
        fleetSource: 'vendor',
        driverType: 'Tow Driver',
        city: MOCK_USERS.driverTow.city,
        vehicleRegistration: vendorVehicle1.registrationNo,
        rating: 4.9,
        reviewCount: 42,
        status: 'APPROVED',
        totalTrips: 128,
        documents: [],
        statusHistory: [{ status: 'APPROVED', changedAt: now, note: 'Mock active driver' }],
      },
    });
    await towDriver.save();
  } else {
    towDriver.fullName = MOCK_USERS.driverTow.fullName;
    towDriver.role = 'driver';
    towDriver.isAvailable = true;
    towDriver.isVerified = true;
    towDriver.isProfileCompleted = true;
    towDriver.currentLocation = {
      latitude: MOCK_USERS.driverTow.latitude,
      longitude: MOCK_USERS.driverTow.longitude,
      updatedAt: now,
    };
    if (towDriver.driverProfile) {
      towDriver.driverProfile.vendorUserId = vendor._id;
      towDriver.driverProfile.status = 'APPROVED';
      towDriver.driverProfile.vehicleRegistration = vendorVehicle1.registrationNo;
    }
    await towDriver.save();
  }

  // 4. Seed Chauffeur Driver (Independent)
  let chauffeurDriver = await UserModel.findOne({ mobileNumber: MOCK_USERS.driverChauffeur.mobileNumber });
  if (!chauffeurDriver) {
    chauffeurDriver = new UserModel({
      mobileNumber: MOCK_USERS.driverChauffeur.mobileNumber,
      fullName: MOCK_USERS.driverChauffeur.fullName,
      role: 'driver',
      isVerified: true,
      isProfileCompleted: true,
      isAvailable: true,
      accountStatus: 'ACTIVE',
      currentLocation: {
        latitude: MOCK_USERS.driverChauffeur.latitude,
        longitude: MOCK_USERS.driverChauffeur.longitude,
        updatedAt: now,
      },
      driverProfile: {
        driverCode: MOCK_USERS.driverChauffeur.driverCode,
        licenseNo: MOCK_USERS.driverChauffeur.licenseNo,
        fleetSource: 'admin',
        driverType: 'Full-Time',
        city: MOCK_USERS.driverChauffeur.city,
        rating: 4.8,
        reviewCount: 36,
        status: 'APPROVED',
        totalTrips: 94,
        documents: [],
        statusHistory: [{ status: 'APPROVED', changedAt: now, note: 'Mock active driver' }],
      },
    });
    await chauffeurDriver.save();
  } else {
    chauffeurDriver.isAvailable = true;
    chauffeurDriver.isVerified = true;
    chauffeurDriver.isProfileCompleted = true;
    if (chauffeurDriver.driverProfile) {
      chauffeurDriver.driverProfile.status = 'APPROVED';
    }
    await chauffeurDriver.save();
  }

  // 5. Seed Pre-authenticated OTP logs so testing works immediately
  const mockNumbers = [
    MOCK_USERS.customer.mobileNumber,
    MOCK_USERS.driverTow.mobileNumber,
    MOCK_USERS.driverChauffeur.mobileNumber,
    MOCK_USERS.vendor.mobileNumber,
  ];

  for (const num of mockNumbers) {
    await OtpLogModel.deleteMany({ mobileNumber: num });
    await OtpLogModel.create({
      mobileNumber: num,
      mobileOtp: '123456',
      mobileOtpExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      mobileVerified: true,
      emailVerified: true,
      mobileAttempts: 0,
      emailAttempts: 0,
    });
  }

  // 6. Seed Sample Active Towing Booking for Live Tracking Test
  await TowingBookingModel.deleteMany({ customerId: customer._id });
  const activeTow = await TowingBookingModel.create({
    customerId: customer._id,
    bookingNumber: 'RACE-TOW-MOCK-001',
    vehicleId: vehicle1._id,
    pickup: {
      address: 'Master Canteen Square, Station Rd, Bhubaneswar',
      latitude: 20.2644,
      longitude: 85.8433,
    },
    dropoff: {
      address: 'Hyundai Service Center, Patia, Bhubaneswar',
      latitude: 20.3588,
      longitude: 85.8333,
    },
    distanceKm: 12.5,
    estimatedFare: 1250,
    advanceAmount: 300,
    advancePaid: true,
    remainingAmount: 950,
    remainingPaid: false,
    paymentStatus: 'ADVANCE_PAID',
    status: 'DRIVER_EN_ROUTE',
    vendorId: vendor._id,
    driverId: towDriver._id,
    assignedFleetVehicleId: vendorVehicle1._id,
    assignedFleetVehicleLabel: 'Tata 407 (OD-02-TOW-1001)',
    tripStartOtp: '4589',
    tripStartOtpVerified: false,
    driverLatitude: 20.275,
    driverLongitude: 85.839,
    statusHistory: [
      { status: 'PENDING', timestamp: new Date(Date.now() - 30 * 60 * 1000), note: 'Booking placed' },
      { status: 'CONFIRMED', timestamp: new Date(Date.now() - 28 * 60 * 1000), note: 'Booking confirmed' },
      { status: 'DRIVER_ASSIGNED', timestamp: new Date(Date.now() - 25 * 60 * 1000), note: 'Tow driver assigned' },
      { status: 'DRIVER_EN_ROUTE', timestamp: new Date(Date.now() - 10 * 60 * 1000), note: 'Driver is on the way' },
    ],
  });

  // Link active booking to customer and driver
  customer.activeBookingId = activeTow._id as any;
  customer.activeBookingType = 'towing';
  await customer.save();

  towDriver.activeBookingId = activeTow._id as any;
  towDriver.activeBookingType = 'towing';
  await towDriver.save();

  // 7. Seed Sample Driver Booking (Ready for Acceptance)
  await DriverBookingModel.deleteMany({ customerId: customer._id });
  await DriverBookingModel.create({
    customerId: customer._id,
    bookingNumber: 'RACE-DRV-MOCK-002',
    pickup: {
      address: 'Khandagiri Caves Square, Bhubaneswar',
      latitude: 20.2587,
      longitude: 85.7865,
    },
    packageHours: 4,
    vehicleCategory: 'suv',
    estimatedFare: 800,
    advanceAmount: 200,
    advancePaid: true,
    remainingAmount: 600,
    remainingPaid: false,
    paymentStatus: 'ADVANCE_PAID',
    status: 'PENDING',
    tripStartOtp: '8912',
    statusHistory: [
      { status: 'PENDING', timestamp: new Date(), note: 'Booking requested by customer' },
    ],
  });

  logger.info('Test users & sample bookings seeded successfully');
}

export async function runMockSeed(): Promise<void> {
  console.log('========================================================');
  console.log('🚀 SEEDING RACE COMPREHENSIVE MOCK DATA FOR TESTING');
  console.log('========================================================\n');

  await connectDatabase();
  await ensureDatabaseIndexes();

  const services = await seedServices();
  console.log(`✅ Seeded ${services} Services Catalog`);

  await seedBrand();
  console.log('✅ Seeded Brand & App Identity');

  await seedAdminPlatform();
  console.log('✅ Seeded Super Admin: admin@raceservice.com / Admin@123');

  await seedPlatformSettings();
  console.log('✅ Seeded Platform Settings');

  await seedSubscriptionPlans();
  console.log('✅ Seeded Subscription Plans');

  await seedTestUsers();
  console.log('✅ Seeded Mock Users:');
  console.log('   - Customer: +919876543299 (Rahul Sharma, 2 Vehicles, Active Towing Trip)');
  console.log('   - Tow Driver: +918888880001 (Om Singh, Approved, On Active Job)');
  console.log('   - Chauffeur: +918888880002 (Ramesh Kumar, Approved, Available)');
  console.log('   - Towing Vendor: +919812345670 (Kalinga Towing, Approved, 2 Fleet Trucks)');
  console.log('   - Universal Test OTP: 123456 (Works on all test accounts)\n');

  await disconnectDatabase();
  console.log('🎉 MOCK SEEDING COMPLETE! Ready for end-to-end testing.');
}

if (require.main === module) {
  runMockSeed().catch(async (err) => {
    console.error('❌ Mock seeding failed:', err);
    await disconnectDatabase();
    process.exit(1);
  });
}
