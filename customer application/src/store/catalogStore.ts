import { create } from 'zustand';

import * as catalogService from '../services/catalogService';
import { getApiErrorMessage } from '../services/api';
import fallbackBrand from '../data/brand.json';
import fallbackServices from '../data/services.json';
import type { Brand, ServiceCategory } from '../types/models';

interface CatalogState {
  services: ServiceCategory[];
  brand: Brand | null;
  isLoading: boolean;
  /** First `fetchServices` finished (success or fallback). Used for Home/Services skeletons. */
  servicesReady: boolean;
  error: string | null;
  fetchServices: () => Promise<void>;
  fetchBrand: () => Promise<void>;
}

const DEFAULT_SERVICES = (fallbackServices as unknown as ServiceCategory[]) ?? [];
const DEFAULT_BRAND = (fallbackBrand as unknown as Brand) ?? null;

let servicesFetchInFlight: Promise<void> | null = null;
let brandFetchInFlight: Promise<void> | null = null;

export const useCatalogStore = create<CatalogState>((set) => ({
  services: DEFAULT_SERVICES,
  brand: DEFAULT_BRAND,
  isLoading: false,
  servicesReady: false,
  error: null,

  fetchServices: async () => {
    if (servicesFetchInFlight) return servicesFetchInFlight;
    servicesFetchInFlight = (async () => {
      set({ isLoading: true, error: null });
      try {
        const services = await catalogService.getServices();
        set({
          services: Array.isArray(services) && services.length > 0 ? services : DEFAULT_SERVICES,
          isLoading: false,
          servicesReady: true,
        });
      } catch (error) {
        set({
          isLoading: false,
          servicesReady: true,
          error: getApiErrorMessage(error, 'Unable to load services'),
        });
      } finally {
        servicesFetchInFlight = null;
      }
    })();
    return servicesFetchInFlight;
  },

  fetchBrand: async () => {
    if (brandFetchInFlight) return brandFetchInFlight;
    brandFetchInFlight = (async () => {
      set({ isLoading: true, error: null });
      try {
        const brand = await catalogService.getBrand();
        set({ brand: brand ?? DEFAULT_BRAND, isLoading: false });
      } catch (error) {
        set({
          isLoading: false,
          error: getApiErrorMessage(error, 'Unable to load brand'),
        });
      } finally {
        brandFetchInFlight = null;
      }
    })();
    return brandFetchInFlight;
  },
}));
