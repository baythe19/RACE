import { create } from 'zustand';

import * as vehicleService from '../services/vehicleService';
import { getApiErrorMessage, readAccessToken } from '../services/api';
import type { Vehicle, VehicleInput } from '../types/vehicle';

interface VehicleState {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  isLoading: boolean;
  error: string | null;
  fetchVehicles: () => Promise<void>;
  fetchVehicle: (id: string) => Promise<void>;
  addVehicle: (data: VehicleInput) => Promise<Vehicle>;
  updateVehicle: (id: string, data: Partial<VehicleInput>) => Promise<Vehicle>;
  deleteVehicle: (id: string) => Promise<void>;
  clearVehicles: () => void;
}

/** Shared in-flight list fetch — Home / Vehicles / booking review remounts share one GET. */
let vehiclesFetchInFlight: Promise<void> | null = null;
let vehicleMutating = false;

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: [],
  selectedVehicle: null,
  isLoading: false,
  error: null,

  fetchVehicles: async () => {
    if (vehiclesFetchInFlight) return vehiclesFetchInFlight;
    vehiclesFetchInFlight = (async () => {
      set({ isLoading: true, error: null });
      try {
        const token = await readAccessToken();
        if (!token) {
          set({ vehicles: [], isLoading: false, error: null });
          return;
        }
        const vehicles = await vehicleService.getVehicles();
        const list = Array.isArray(vehicles) ? vehicles : [];
        set({ vehicles: list, isLoading: false, error: null });
      } catch (error) {
        set(state => ({
          vehicles: Array.isArray(state.vehicles) ? state.vehicles : [],
          isLoading: false,
          error: getApiErrorMessage(error, 'Unable to load vehicles'),
        }));
      } finally {
        vehiclesFetchInFlight = null;
      }
    })();
    return vehiclesFetchInFlight;
  },

  fetchVehicle: async id => {
    const cached = get().vehicles.find(item => item.id === id) ?? null;
    set({ isLoading: true, error: null, selectedVehicle: cached ?? get().selectedVehicle });
    try {
      const vehicle = await vehicleService.getVehicle(id);
      set(state => ({
        selectedVehicle: vehicle,
        vehicles: state.vehicles.map(item => (item.id === id ? vehicle : item)),
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      if (cached) {
        set({ selectedVehicle: cached, isLoading: false, error: null });
        return;
      }
      set({
        isLoading: false,
        error: getApiErrorMessage(error, 'Unable to load vehicle'),
      });
    }
  },

  addVehicle: async data => {
    if (vehicleMutating) {
      throw new Error('Vehicle save already in progress');
    }
    vehicleMutating = true;
    set({ isLoading: true, error: null });
    try {
      const vehicle = await vehicleService.addVehicle(data);
      set(state => ({
        vehicles: [vehicle, ...state.vehicles],
        isLoading: false,
      }));
      return vehicle;
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, 'Unable to add vehicle'),
      });
      throw error;
    } finally {
      vehicleMutating = false;
    }
  },

  updateVehicle: async (id, data) => {
    if (vehicleMutating) {
      throw new Error('Vehicle save already in progress');
    }
    vehicleMutating = true;
    set({ isLoading: true, error: null });
    try {
      const vehicle = await vehicleService.updateVehicle(id, data);
      set(state => ({
        vehicles: state.vehicles.map(item => (item.id === id ? vehicle : item)),
        selectedVehicle: state.selectedVehicle?.id === id ? vehicle : state.selectedVehicle,
        isLoading: false,
      }));
      return vehicle;
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, 'Unable to update vehicle'),
      });
      throw error;
    } finally {
      vehicleMutating = false;
    }
  },

  deleteVehicle: async id => {
    if (vehicleMutating) {
      throw new Error('Vehicle delete already in progress');
    }
    vehicleMutating = true;
    set({ isLoading: true, error: null });
    try {
      await vehicleService.deleteVehicle(id);
      set(state => ({
        vehicles: state.vehicles.filter(item => item.id !== id),
        selectedVehicle: state.selectedVehicle?.id === id ? null : state.selectedVehicle,
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: getApiErrorMessage(error, 'Unable to delete vehicle'),
      });
      throw error;
    } finally {
      vehicleMutating = false;
    }
  },

  clearVehicles: () => set({ vehicles: [], selectedVehicle: null, error: null }),
}));
