import { create } from 'zustand';

/**
 * Display-only mirror of the backend payout account.
 * The source of truth is `GET/PUT /api/v1/vendor/payout-account` — this store
 * only carries what the Earnings screen header shows between fetches.
 */
export interface PartnerBankDetails {
  holderName: string;
  accountNumberMasked?: string;
  ifsc?: string;
  bankName?: string;
  isVerified: boolean;
}

export interface PartnerUpiDetails {
  upiId: string;
  holderName: string;
  isVerified: boolean;
}

interface PartnerPayoutState {
  /** Avatar chosen on the Account screen (display-only, synced with EditProfile). */
  avatarUri: string | null;
  payoutMethod: 'bank' | 'upi';
  bankDetails: PartnerBankDetails;
  upiDetails: PartnerUpiDetails;
  setAvatarUri: (uri: string | null) => void;
  setPayoutMethod: (method: 'bank' | 'upi') => void;
  updateBankDetails: (details: Partial<PartnerBankDetails>) => void;
  updateUpiDetails: (details: Partial<PartnerUpiDetails>) => void;
  /** Reset to empty (used when the backend reports no saved payout account). */
  clear: () => void;
}

const EMPTY: Omit<PartnerPayoutState, 'avatarUri' | 'setAvatarUri' | 'setPayoutMethod' | 'updateBankDetails' | 'updateUpiDetails' | 'clear'> = {
  payoutMethod: 'bank',
  bankDetails: {
    holderName: '',
    accountNumberMasked: undefined,
    ifsc: undefined,
    bankName: undefined,
    isVerified: false,
  },
  upiDetails: {
    upiId: '',
    holderName: '',
    isVerified: false,
  },
};

export const usePartnerPayoutStore = create<PartnerPayoutState>(set => ({
  avatarUri: null,
  ...EMPTY,
  setAvatarUri: uri => set({ avatarUri: uri }),
  setPayoutMethod: method => set({ payoutMethod: method }),
  updateBankDetails: details =>
    set(state => ({
      bankDetails: { ...state.bankDetails, ...details },
    })),
  updateUpiDetails: details =>
    set(state => ({
      upiDetails: { ...state.upiDetails, ...details },
    })),
  clear: () => set({ ...EMPTY }),
}));
