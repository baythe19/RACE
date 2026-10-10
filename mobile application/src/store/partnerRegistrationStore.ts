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

const emptyDriverPersonal: DriverPersonalInfo = {
  fullName: '',
  mobileNumber: '',
  email: '',
  dateOfBirth: '',
  address: '',
  city: 'Bhubaneswar',
  emergencyContactName: '',
  emergencyContactNumber: '',
  yearsOfExperience: '',
  languages: '',
};

const emptyDriverVehicle: DriverVehicleInfo = {
  vehicleType: '',
  vehicleNumber: '',
  rcNumber: '',
  licenseNumber: '',
  insuranceProvider: '',
  insurancePolicyNumber: '',
  vehicleModel: '',
};

const emptyVendorBusiness: VendorBusinessInfo = {
  businessName: '',
  ownerName: '',
  mobileNumber: '',
  email: '',
  businessType: '',
  accountHolderName: '',
  accountNumber: '',
  ifsc: '',
  acceptTerms: false,
};

const emptyVendorAddress: VendorBusinessAddress = {
  addressLine1: '',
  addressLine2: '',
  city: 'Bhubaneswar',
  state: 'Odisha',
  pinCode: '751001',
  landmark: '',
};

export const usePartnerRegistrationStore = create<PartnerRegistrationState>((set) => ({
  role: null,
  driverPersonal: emptyDriverPersonal,
  driverVehicle: emptyDriverVehicle,
  driverDocuments: [],
  vendorBusiness: emptyVendorBusiness,
  vendorAddress: emptyVendorAddress,
  vendorDocuments: [],
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
      driverPersonal: emptyDriverPersonal,
      driverVehicle: emptyDriverVehicle,
      driverDocuments: [],
      vendorBusiness: emptyVendorBusiness,
      vendorAddress: emptyVendorAddress,
      vendorDocuments: [],
    }),
}));
