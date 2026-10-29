import { CommonActions } from '@react-navigation/native';

type StackState = {
  index: number;
  routeNames: string[];
  routes: Array<{ name: string }>;
  type?: string;
};

type Nav = {
  getState: () => StackState | undefined;
  getParent: () => { getState: () => { type?: string } | undefined } | undefined;
  goBack: () => void;
  canGoBack: () => boolean;
  dispatch: (action: ReturnType<typeof CommonActions.reset>) => void;
};

/**
 * Back stays inside the current tab stack.
 * A real parent screen (Profile → My Vehicles → Add Vehicle) pops one page.
 * A screen opened with no parent (UI QA jump) returns to that tab's root
 * (Profile, Bookings, …) instead of the previously focused tab (usually Home).
 */
export function goBackWithinStack(navigation: Nav): void {
  // Always stay inside this helper — callers must not duplicate this body.
  const state = navigation.getState();
  if (state && state.index > 0) {
    navigation.goBack();
    return;
  }

  const parentType = navigation.getParent()?.getState()?.type;
  if (parentType === 'tab' && state) {
    const root = state.routeNames[0];
    const current = state.routes[state.index]?.name;
    if (root && current && current !== root) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: root }],
        }),
      );
    }
    return;
  }

  if (navigation.canGoBack()) {
    navigation.goBack();
  }
}
