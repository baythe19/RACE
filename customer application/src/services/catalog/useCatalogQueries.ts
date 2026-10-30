import { useCallback, useEffect, useMemo } from 'react';

import fallbackBrand from '../../data/brand.json';
import fallbackServices from '../../data/services.json';
import { useCatalogStore } from '../../store/catalogStore';
import type { Brand, ServiceCategory } from '../../types/models';

const FALLBACK_CATEGORIES = fallbackServices as ServiceCategory[];
const FALLBACK_BRAND = fallbackBrand as Brand;

export function useServicesQuery() {
  const { services, isLoading, error, fetchServices, servicesReady, hasHydrated } =
    useCatalogStore();

  useEffect(() => {
    if (hasHydrated && !servicesReady) {
      void fetchServices();
    }
  }, [fetchServices, hasHydrated, servicesReady]);

  const refetch = useCallback(() => fetchServices({ force: true }), [fetchServices]);

  const loadingForUi = !servicesReady && isLoading;

  return {
    data: services?.length ? services : FALLBACK_CATEGORIES,
    isLoading: loadingForUi,
    isError: Boolean(error),
    error,
    refetch,
    isRefetching: loadingForUi,
  };
}

export function useBrandQuery() {
  const { brand, isLoading, error, fetchBrand, brandReady, hasHydrated } = useCatalogStore();

  useEffect(() => {
    if (hasHydrated && !brandReady) {
      void fetchBrand();
    }
  }, [brand, brandReady, fetchBrand, hasHydrated]);

  const refetch = useCallback(() => fetchBrand({ force: true }), [fetchBrand]);

  const loadingForUi = !brandReady && isLoading;

  return {
    data: brand ?? FALLBACK_BRAND,
    isLoading: loadingForUi,
    isError: Boolean(error),
    error,
    refetch,
    isRefetching: loadingForUi,
  };
}

export function useCategoryById(categoryId: string) {
  const query = useServicesQuery();
  const category = useMemo(
    () => query.data.find(item => item.id === categoryId),
    [categoryId, query.data],
  );

  return {
    ...query,
    category,
    categories: query.data,
  };
}
