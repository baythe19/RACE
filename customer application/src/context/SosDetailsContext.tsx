import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getSosContext } from '../services/sos/sosApi';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import type { SosDetails } from '../types/sos';
import { emergencyContactDigits, hasSavedEmergencyContact } from '../utils/emergencyContact';

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

    let cancelled = false;

    const applyFromProfile = () => {
      const ec = profile.emergencyContact;
      setDetailsState(prev => ({
        ...prev,
        ownerName: profile.fullName?.trim() ?? prev.ownerName,
        ownerPhone: profile.mobileNumber?.trim() ?? prev.ownerPhone,
        contactName: hasSavedEmergencyContact(ec) ? ec!.name.trim() : '',
        contactRelation: ec?.relationship?.trim() ?? '',
        contactPhone: hasSavedEmergencyContact(ec) ? emergencyContactDigits(ec) : '',
        location: locationFromProfileAddress(profile.address) || prev.location,
      }));
    };

    applyFromProfile();

    void getSosContext()
      .then(ctx => {
        if (cancelled) return;
        setDetailsState(prev => {
          const next = { ...prev };
          if (ctx.owner?.name) next.ownerName = ctx.owner.name;
          if (ctx.owner?.phone) next.ownerPhone = ctx.owner.phone.replace(/\D/g, '').slice(-10);
          if (ctx.emergencyContact && hasSavedEmergencyContact(ctx.emergencyContact)) {
            next.contactName = ctx.emergencyContact.name.trim();
            next.contactPhone = emergencyContactDigits(ctx.emergencyContact);
            next.contactRelation = ctx.emergencyContact.relationship?.trim() ?? '';
          }
          if (ctx.vehicle) {
            const parts = ctx.vehicle.label.split(' ').filter(Boolean);
            next.vehicleBrand = parts[0] ?? '';
            next.vehicleModel = parts.slice(1).join(' ') || next.vehicleModel;
            next.vehicleNumber = ctx.vehicle.number ?? '';
          }
          return next;
        });
      })
      .catch(() => {
        /* keep profile-only hydration */
      });

    return () => {
      cancelled = true;
    };
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
