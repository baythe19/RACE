import type { AuthStackParamList } from '../types/navigation';
import { getCustomerOnboardingStep, type CustomerOnboardingStep } from './customerOnboarding';
import { useProfileStore } from './profileStore';
import { useVehicleStore } from './vehicleStore';

export type CustomerOnboardingRoute = keyof Pick<
  AuthStackParamList,
  'ProfileSetup' | 'VehicleRegistration'
>;

const STEP_ROUTE: Record<Exclude<CustomerOnboardingStep, 'done'>, CustomerOnboardingRoute> = {
  profile: 'ProfileSetup',
  vehicle: 'VehicleRegistration',
};

function inferRouteFromSavedData(): CustomerOnboardingRoute {
  const profile = useProfileStore.getState().profile;
  if (!profile?.isProfileCompleted) {
    return 'ProfileSetup';
  }

  const vehicles = useVehicleStore.getState().vehicles;
  if (vehicles.length === 0) {
    return 'VehicleRegistration';
  }

  // Profile + vehicle exist — onboarding should be `done` and Main app shown.
  return 'ProfileSetup';
}

export function getCustomerOnboardingRouteFromStep(
  step: CustomerOnboardingStep,
): CustomerOnboardingRoute {
  if (step === 'done') {
    return inferRouteFromSavedData();
  }
  return STEP_ROUTE[step];
}

export async function resolveCustomerOnboardingRoute(): Promise<CustomerOnboardingRoute> {
  const step = await getCustomerOnboardingStep();
  if (step === 'done') {
    return inferRouteFromSavedData();
  }
  return STEP_ROUTE[step];
}
