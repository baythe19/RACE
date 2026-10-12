import { create } from 'zustand';

import type { PartnerRole } from '../types/partnerNavigation';

export interface PartnerUploadedDocument {
  id: string;
  label: string;
  uri: string;
  name: string;
  mimeType?: string;
}

export interface DriverPersonalInfo {
  fullName: string;
  mobileNumber: string;
  email: string;
  dateOfBirth: string;
  address: string;
  city?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  yearsOfExperience?: string;
  languages?: string;
}

export interface DriverVehicleInfo {
  vehicleType: string;
  vehicleNumber: string;
  rcNumber: string;
  licenseNumber: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  vehicleModel: string;
  registeredTo?: 'me' | 'someone_else';
}

export interface VendorBusinessInfo {
  businessName: string;
  ownerName: string;
  mobileNumber: string;
  email: string;
  businessType: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
  acceptTerms?: boolean;
}

export interface VendorBusinessAddress {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
  landmark: string;
}

interface PartnerRegistrationState {
  role: PartnerRole | null;
  driverPersonal: DriverPersonalInfo;
  driverVehicle: DriverVehicleInfo;
  driverDocuments: PartnerUploadedDocument[];
  vendorBusiness: VendorBusinessInfo;
  vendorAddress: VendorBusinessAddress;
  vendorDocuments: PartnerUploadedDocument[];
  setRole: (role: PartnerRole) => void;
  setDriverPersonal: (data: Partial<DriverPersonalInfo>) => void;
  setDriverVehicle: (data: Partial<DriverVehicleInfo>) => void;
  addDriverDocument: (doc: PartnerUploadedDocument) => void;
  removeDriverDocument: (id: string) => void;
  setVendorBusiness: (data: Partial<VendorBusinessInfo>) => void;
  setVendorAddress: (data: Partial<VendorBusinessAddress>) => void;
  addVendorDocument: (doc: PartnerUploadedDocument) => void;
  removeVendorDocument: (id: string) => void;
  reset: () => void;
}

export const defaultMockDriverPersonal: DriverPersonalInfo = {
  fullName: 'Rajesh Kumar',
  mobileNumber: '9876543210',
  email: 'rajesh.driver@gmail.com',
  dateOfBirth: '1992-05-15',
  address: 'Plot 42, Saheed Nagar, Janpath Road',
  city: 'Bhubaneswar',
  emergencyContactName: 'Sunita Kumar',
  emergencyContactNumber: '9876543211',
  yearsOfExperience: '6',
  languages: 'Odia, Hindi, English',
};

export const defaultMockDriverVehicle: DriverVehicleInfo = {
  vehicleType: 'Flatbed Tow Truck',
  vehicleNumber: 'OD 02 AB 1234',
  rcNumber: 'RC-OD02-2022-987654',
  licenseNumber: 'OD-0220190012345',
  insuranceProvider: 'HDFC ERGO General Insurance',
  insurancePolicyNumber: 'POL-78901234',
  vehicleModel: 'Tata 407 Recovery Spec',
  registeredTo: 'me',
};

export const defaultMockDriverDocuments: PartnerUploadedDocument[] = [
  {
    id: 'aadhaar_card',
    label: 'Aadhaar Card',
    uri: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
    name: 'aadhaar_front_back.pdf',
    mimeType: 'application/pdf',
  },
  {
    id: 'driving_license',
    label: 'Driving License',
    uri: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
    name: 'driving_license_valid.jpg',
    mimeType: 'image/jpeg',
  },
  {
    id: 'vehicle_rc',
    label: 'Vehicle RC',
    uri: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
    name: 'vehicle_rc_od02.jpg',
    mimeType: 'image/jpeg',
  },
  {
    id: 'vehicle_insurance',
    label: 'Vehicle Insurance',
    uri: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
    name: 'hdfc_ergo_policy.pdf',
    mimeType: 'application/pdf',
  },
];

export const defaultMockVendorBusiness: VendorBusinessInfo = {
  businessName: 'Kalinga Towing & Roadside Services',
  ownerName: 'Amit Pattnaik',
  mobileNumber: '9988776655',
  email: 'kalinga.towing@gmail.com',
  businessType: 'Towing Company',
  accountHolderName: 'Kalinga Towing Services',
  accountNumber: '50200012345678',
  ifsc: 'HDFC0001234',
  acceptTerms: true,
};

export const defaultMockVendorAddress: VendorBusinessAddress = {
  addressLine1: 'Unit 4, Master Canteen Square',
  addressLine2: 'Near Railway Station Road',
  city: 'Bhubaneswar',
  state: 'Odisha',
  pinCode: '751001',
  landmark: 'Opposite State Bank Bhavan',
};

export const defaultMockVendorDocuments: PartnerUploadedDocument[] = [
  {
    id: 'business_registration',
    label: 'Business Registration / MSME',
    uri: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
    name: 'msme_certificate.pdf',
    mimeType: 'application/pdf',
  },
  {
    id: 'gst_certificate',
    label: 'GST Certificate',
    uri: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
    name: 'gst_reg_0419.pdf',
    mimeType: 'application/pdf',
  },
  {
    id: 'pan_card',
    label: 'Owner PAN Card',
    uri: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
    name: 'pan_card_amit.jpg',
    mimeType: 'image/jpeg',
  },
];

export const usePartnerRegistrationStore = create<PartnerRegistrationState>((set) => ({
  role: null,
  driverPersonal: defaultMockDriverPersonal,
  driverVehicle: defaultMockDriverVehicle,
  driverDocuments: defaultMockDriverDocuments,
  vendorBusiness: defaultMockVendorBusiness,
  vendorAddress: defaultMockVendorAddress,
  vendorDocuments: defaultMockVendorDocuments,
  setRole: (role) => set({ role }),
  setDriverPersonal: (data) =>
    set((state) => ({ driverPersonal: { ...state.driverPersonal, ...data } })),
  setDriverVehicle: (data) =>
    set((state) => ({ driverVehicle: { ...state.driverVehicle, ...data } })),
  addDriverDocument: (doc) =>
    set((state) => ({
      driverDocuments: [
        ...state.driverDocuments.filter((item) => item.id !== doc.id),
        doc,
      ],
    })),
  removeDriverDocument: (id) =>
    set((state) => ({
      driverDocuments: state.driverDocuments.filter((item) => item.id !== id),
    })),
  setVendorBusiness: (data) =>
    set((state) => ({ vendorBusiness: { ...state.vendorBusiness, ...data } })),
  setVendorAddress: (data) =>
    set((state) => ({ vendorAddress: { ...state.vendorAddress, ...data } })),
  addVendorDocument: (doc) =>
    set((state) => ({
      vendorDocuments: [
        ...state.vendorDocuments.filter((item) => item.id !== doc.id),
        doc,
      ],
    })),
  removeVendorDocument: (id) =>
    set((state) => ({
      vendorDocuments: state.vendorDocuments.filter((item) => item.id !== id),
    })),
  reset: () =>
    set({
      role: null,
      driverPersonal: defaultMockDriverPersonal,
      driverVehicle: defaultMockDriverVehicle,
      driverDocuments: defaultMockDriverDocuments,
      vendorBusiness: defaultMockVendorBusiness,
      vendorAddress: defaultMockVendorAddress,
      vendorDocuments: defaultMockVendorDocuments,
    }),
}));
