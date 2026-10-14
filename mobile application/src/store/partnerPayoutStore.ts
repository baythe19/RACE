import { create } from 'zustand';

export interface PartnerBankDetails {
  holderName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  isVerified: boolean;
}

export interface PartnerUpiDetails {
  upiId: string;
  holderName: string;
  isVerified: boolean;
}

interface PartnerPayoutState {
  avatarUri: string | null;
  payoutMethod: 'bank' | 'upi';
  bankDetails: PartnerBankDetails;
  upiDetails: PartnerUpiDetails;
  setAvatarUri: (uri: string | null) => void;
  setPayoutMethod: (method: 'bank' | 'upi') => void;
  updateBankDetails: (details: Partial<PartnerBankDetails>) => void;
  updateUpiDetails: (details: Partial<PartnerUpiDetails>) => void;
}

export const usePartnerPayoutStore = create<PartnerPayoutState>((set) => ({
  avatarUri: null,
  payoutMethod: 'bank',
  bankDetails: {
    holderName: 'Om Singh',
    accountNumber: '91881234567890',
    ifsc: 'SBIN0001234',
    bankName: 'State Bank of India',
    isVerified: true,
  },
  upiDetails: {
    upiId: 'omsingh.race@okhdfcbank',
    holderName: 'Om Singh',
    isVerified: true,
  },
  setAvatarUri: (uri) => set({ avatarUri: uri }),
  setPayoutMethod: (method) => set({ payoutMethod: method }),
  updateBankDetails: (details) =>
    set((state) => ({
      bankDetails: { ...state.bankDetails, ...details, isVerified: true },
    })),
  updateUpiDetails: (details) =>
    set((state) => ({
      upiDetails: { ...state.upiDetails, ...details, isVerified: true },
    })),
}));
