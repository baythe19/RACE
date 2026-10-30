import { useCallback, useEffect, useState } from 'react';

import { useVehicleStore } from '../../store/vehicleStore';
import type { CreateVehicleRequest, UpdateVehicleRequest } from '../../types/vehicle';
import { getApiErrorMessage } from '../api/apiClient';
import {
  createVehicle,
  deleteVehicle,
  getVehicle,
  listVehicles,
  updateVehicle,
} from './vehicleApi';

export function useVehiclesQuery() {
  const { vehicles, isLoading, error, fetchVehicles } = useVehicleStore();

  useEffect(() => {
    void fetchVehicles();
  }, [fetchVehicles]);

  return {
    data: vehicles,
    isLoading,
    isError: Boolean(error),
    error,
    refetch: fetchVehicles,
    isRefetching: isLoading,
  };
}

export function useVehicleQuery(id: string) {
  const { vehicles, selectedVehicle, isLoading, error, fetchVehicle } = useVehicleStore();
  const fromList = vehicles.find(item => item.id === id);

  useEffect(() => {
    if (id) {
      void fetchVehicle(id);
    }
  }, [fetchVehicle, id]);

  const data =
    selectedVehicle?.id === id ? selectedVehicle : fromList ?? undefined;

  return {
    data,
    isLoading: isLoading && !data,
    isError: Boolean(error) && !data,
    error,
    refetch: () => fetchVehicle(id),
    isRefetching: isLoading,
  };
}

function useVehicleMutation<TVariables, TResult = unknown>(
  fn: (variables: TVariables) => Promise<TResult>,
  onSuccess?: () => void,
) {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (variables: TVariables) => {
      setIsPending(true);
      try {
        const result = await fn(variables);
        onSuccess?.();
        return result;
      } finally {
        setIsPending(false);
      }
    },
    [fn, onSuccess],
  );

  return { mutateAsync, isPending };
}

export function useCreateVehicleMutation() {
  const addVehicle = useVehicleStore(state => state.addVehicle);

  return useVehicleMutation<CreateVehicleRequest, Awaited<ReturnType<typeof addVehicle>>>(
    payload => addVehicle(payload),
  );
}

export function useUpdateVehicleMutation(id: string) {
  const update = useVehicleStore(state => state.updateVehicle);

  return useVehicleMutation<UpdateVehicleRequest>(payload => update(id, payload));
}

export function useDeleteVehicleMutation() {
  const removeVehicle = useVehicleStore(state => state.deleteVehicle);

  return useVehicleMutation<string>(vehicleId => removeVehicle(vehicleId));
}

export { getApiErrorMessage };

// Legacy direct API access (unused by active screens)
export { listVehicles, getVehicle, createVehicle, updateVehicle, deleteVehicle };
