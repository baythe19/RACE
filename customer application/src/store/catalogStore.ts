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
  error: string | null;
  fetchServices: () => Promise<void>;
  fetchBrand: () => Promise<void>;
}

const DEFAULT_SERVICES = (fallbackServices as unknown as ServiceCategory[]) ?? [];
const DEFAULT_BRAND = (fallbackBrand as unknown as Brand) ?? null;

export const useCatalogStore = create<CatalogState>((set) => ({
  services: DEFAULT_SERVICES,
  brand: DEFAULT_BRAND,
  isLoading: false,
  error: null,

  fetchServices: async () => {
    set({ isLoading: true, error: null });
    try {
      const services = await catalogService.getServices();
      set({
        services: Array.isArray(services) && services.length > 0 ? services : DEFAULT_SERVICES,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, 'Unable to load services'),
      });
    }
  },

  fetchBrand: async () => {
    set({ isLoading: true, error: null });
    try {
      const brand = await catalogService.getBrand();
      set({ brand: brand ?? DEFAULT_BRAND, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, 'Unable to load brand'),
      });
    }
  },
}));
