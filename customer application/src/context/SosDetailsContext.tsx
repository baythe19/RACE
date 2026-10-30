import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import type { SosDetails } from '../types/sos';
import { emergencyContactDigits, hasSavedEmergencyContact } from '../utils/emergencyContact';
import { getPhoneDigits } from '../utils/phone';

function createEmptyDetails(): SosDetails {
  return {
    ownerName: '',
    ownerPhone: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleNumber: '',
    contactName: '',
    contactRelation: '',
    contactPhone: '',
    location: '',
  };
}

function locationFromProfileAddress(
  address?: {
    line2?: string;
    city?: string;
    state?: string;
  } | null,
): string {
  if (!address) return '';
  return [address.line2, address.city, address.state].filter(Boolean).join(', ');
}

interface SosDetailsContextValue {
  details: SosDetails;
  updateDetails: (patch: Partial<SosDetails>) => void;
  setDetails: (details: SosDetails) => void;
}

const SosDetailsContext = createContext<SosDetailsContextValue | undefined>(undefined);

/** Local SOS form state — hydrated from profile only (vehicle from `/sos/context` on SOS Details screen). */
export function SosDetailsProvider({ children }: { children: ReactNode }) {
  const [details, setDetailsState] = useState<SosDetails>(createEmptyDetails);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const profile = useProfileStore(state => state.profile);

  useEffect(() => {
    if (!isAuthenticated) {
      setDetailsState(createEmptyDetails());
      return;
    }
    void useProfileStore.getState().fetchProfile();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !profile) {
      return;
    }

    const ec = profile.emergencyContact;
    const ownerDigits = getPhoneDigits(profile.mobileNumber ?? '');

    setDetailsState(prev => ({
      ...prev,
      ownerName: profile.fullName?.trim() ?? '',
      ownerPhone: ownerDigits.length >= 10 ? ownerDigits.slice(-10) : '',
      contactName: hasSavedEmergencyContact(ec) ? ec!.name.trim() : '',
      contactRelation: ec?.relationship?.trim() ?? '',
      contactPhone: hasSavedEmergencyContact(ec) ? emergencyContactDigits(ec) : '',
      location: locationFromProfileAddress(profile.address) || prev.location,
    }));
  }, [isAuthenticated, profile]);

  const updateDetails = useCallback((patch: Partial<SosDetails>) => {
    setDetailsState(prev => ({ ...prev, ...patch }));
  }, []);

  const setDetails = useCallback((next: SosDetails) => {
    setDetailsState(next);
  }, []);

  const value = useMemo(
    () => ({ details, updateDetails, setDetails }),
    [details, updateDetails, setDetails],
  );

  return <SosDetailsContext.Provider value={value}>{children}</SosDetailsContext.Provider>;
}

export function useSosDetails() {
  const context = useContext(SosDetailsContext);
  if (!context) {
    throw new Error('useSosDetails must be used within SosDetailsProvider');
  }
  return context;
}
