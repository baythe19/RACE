import { completeOnboarding } from '../redux/auth/authSlice';
import { store } from '../redux/store';
import { markCustomerOnboardingComplete } from '../store/customerOnboarding';

/** OTP-only customers skip PIN — finish wizard and open the main app. */
export async function finishCustomerOnboarding(): Promise<void> {
  await markCustomerOnboardingComplete();
  store.dispatch(completeOnboarding());
}
