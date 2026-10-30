import * as SecureStore from 'expo-secure-store';

const CUSTOMER_ONBOARDING_STEP_KEY = 'customer_onboarding_step';

export type CustomerOnboardingStep = 'profile' | 'vehicle' | 'done';

const VALID_STEPS = new Set<CustomerOnboardingStep>(['profile', 'vehicle', 'done']);

export async function getCustomerOnboardingStep(): Promise<CustomerOnboardingStep> {
  try {
    const stored = await SecureStore.getItemAsync(CUSTOMER_ONBOARDING_STEP_KEY);
    if (stored === 'pin') {
      return 'done';
    }
    if (stored && VALID_STEPS.has(stored as CustomerOnboardingStep)) {
      return stored as CustomerOnboardingStep;
    }
  } catch {
    // Fall through to default.
  }
  return 'profile';
}

export async function setCustomerOnboardingStep(step: CustomerOnboardingStep): Promise<void> {
  await SecureStore.setItemAsync(CUSTOMER_ONBOARDING_STEP_KEY, step);
}

export async function isCustomerOnboardingComplete(): Promise<boolean> {
  return (await getCustomerOnboardingStep()) === 'done';
}

export async function markCustomerOnboardingComplete(): Promise<void> {
  await setCustomerOnboardingStep('done');
}

export async function clearCustomerOnboardingComplete(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CUSTOMER_ONBOARDING_STEP_KEY);
  } catch {
    // Ignore missing key on first logout.
  }
}
