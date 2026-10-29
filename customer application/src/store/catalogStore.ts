import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as catalogService from '../services/catalogService';
import { getApiErrorMessage } from '../services/api';
import fallbackBrand from '../data/brand.json';
import fallbackServices from '../data/services.json';
import { createSafeStorage } from '../utils/safeStorage';
import type { Brand, ServiceCategory } from '../types/models';

/** Background refresh only after this age (static catalog; no UI reload). */
const CATALOG_BACKGROUND_STALE_MS = 24 * 60 * 60 * 1000;

type FetchOptions = {
  force?: boolean;
  /** Update store without toggling loading UI (used after cache is warm). */
  background?: boolean;
};

interface CatalogState {
  services: ServiceCategory[];
  brand: Brand | null;
  isLoading: boolean;
  hasHydrated: boolean;
  /** User-visible catalog ready (cache or first fetch done). */
  servicesReady: boolean;
  brandReady: boolean;
  servicesFetchedAt: number | null;
  brandFetchedAt: number | null;
  error: string | null;
  fetchServices: (options?: FetchOptions) => Promise<void>;
  fetchBrand: (options?: FetchOptions) => Promise<void>;
  /** Call once at app start — respects cache, optional silent refresh if stale. */
  ensureCatalogLoaded: () => void;
}

const DEFAULT_SERVICES = (fallbackServices as unknown as ServiceCategory[]) ?? [];
const DEFAULT_BRAND = (fallbackBrand as unknown as Brand) ?? null;

let servicesFetchInFlight: Promise<void> | null = null;
let brandFetchInFlight: Promise<void> | null = null;

function isStale(fetchedAt: number | null, maxAgeMs: number): boolean {
  if (!fetchedAt) return true;
  return Date.now() - fetchedAt > maxAgeMs;
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set, get) => ({
      services: DEFAULT_SERVICES,
      brand: DEFAULT_BRAND,
      isLoading: false,
      hasHydrated: false,
      servicesReady: false,
      brandReady: false,
      servicesFetchedAt: null,
      brandFetchedAt: null,
      error: null,

      fetchServices: async (options?: FetchOptions) => {
        const state = get();
        if (state.servicesReady && !options?.force && !options?.background) {
          return;
        }
        if (servicesFetchInFlight) return servicesFetchInFlight;

        const showLoading = !state.servicesReady && !options?.background;

        servicesFetchInFlight = (async () => {
          if (showLoading) {
            set({ isLoading: true, error: null });
          }
          try {
            const services = await catalogService.getServices();
            set({
              services:
                Array.isArray(services) && services.length > 0 ? services : DEFAULT_SERVICES,
              isLoading: false,
              servicesReady: true,
              servicesFetchedAt: Date.now(),
            });
          } catch (error) {
            set({
              isLoading: false,
              servicesReady: true,
              servicesFetchedAt: state.servicesFetchedAt ?? Date.now(),
              error: getApiErrorMessage(error, 'Unable to load services'),
            });
          } finally {
            servicesFetchInFlight = null;
          }
        })();
        return servicesFetchInFlight;
      },

      fetchBrand: async (options?: FetchOptions) => {
        const state = get();
        if (state.brandReady && !options?.force && !options?.background) {
          return;
        }
        if (brandFetchInFlight) return brandFetchInFlight;

        const showLoading = !state.brandReady && !options?.background;

        brandFetchInFlight = (async () => {
          if (showLoading) {
            set({ isLoading: true, error: null });
          }
          try {
            const brand = await catalogService.getBrand();
            set({
              brand: brand ?? DEFAULT_BRAND,
              isLoading: false,
              brandReady: true,
              brandFetchedAt: Date.now(),
            });
          } catch (error) {
            set({
              isLoading: false,
              brandReady: true,
              brandFetchedAt: state.brandFetchedAt ?? Date.now(),
              error: getApiErrorMessage(error, 'Unable to load brand'),
            });
          } finally {
            brandFetchInFlight = null;
          }
        })();
        return brandFetchInFlight;
      },

      ensureCatalogLoaded: () => {
        const state = get();
        if (!state.hasHydrated) return;

        if (!state.servicesReady) {
          void state.fetchServices();
        } else if (isStale(state.servicesFetchedAt, CATALOG_BACKGROUND_STALE_MS)) {
          void state.fetchServices({ background: true });
        }

        if (!state.brandReady) {
          void state.fetchBrand();
        } else if (isStale(state.brandFetchedAt, CATALOG_BACKGROUND_STALE_MS)) {
          void state.fetchBrand({ background: true });
        }
      },
    }),
    {
      name: 'race-catalog',
      storage: createJSONStorage(() => createSafeStorage()),
      partialize: state => ({
        services: state.services,
        brand: state.brand,
        servicesReady: state.servicesReady,
        brandReady: state.brandReady,
        servicesFetchedAt: state.servicesFetchedAt,
        brandFetchedAt: state.brandFetchedAt,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn('catalogStore rehydrate failed', error);
        }
        useCatalogStore.setState({ hasHydrated: true });
        queueMicrotask(() => {
          useCatalogStore.getState().ensureCatalogLoaded();
        });
      },
    },
  ),
);
