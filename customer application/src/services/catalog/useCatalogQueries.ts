import { useCallback, useEffect, useMemo } from 'react';

import fallbackBrand from '../../data/brand.json';
import fallbackServices from '../../data/services.json';
import { useCatalogStore } from '../../store/catalogStore';
import type { Brand, ServiceCategory } from '../../types/models';

const FALLBACK_CATEGORIES = fallbackServices as ServiceCategory[];
const FALLBACK_BRAND = fallbackBrand as Brand;

export function useServicesQuery() {
  const { services, isLoading, error, fetchServices } = useCatalogStore();

  useEffect(() => {
    if (!services?.length) {
      void fetchServices();
    }
  }, [fetchServices, services?.length]);

  const refetch = useCallback(() => fetchServices(), [fetchServices]);

  return {
    data: services?.length ? services : FALLBACK_CATEGORIES,
    isLoading,
    isError: Boolean(error),
    error,
    refetch,
    isRefetching: isLoading,
  };
}

export function useBrandQuery() {
  const { brand, isLoading, error, fetchBrand } = useCatalogStore();

  useEffect(() => {
    if (!brand) {
      void fetchBrand();
    }
  }, [brand, fetchBrand]);

  const refetch = useCallback(() => fetchBrand(), [fetchBrand]);

  return {
    data: brand ?? FALLBACK_BRAND,
    isLoading,
    isError: Boolean(error),
    error,
    refetch,
    isRefetching: isLoading,
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
