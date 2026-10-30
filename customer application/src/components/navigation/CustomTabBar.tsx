import React, { useEffect, useRef } from 'react';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Calendar,
  Home,
  LayoutGrid,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { CommonActions } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SOS_COLORS } from '../../constants/sosTheme';
import { colors, layout, spacing, typography } from '../../theme';
import type { RootTabParamList } from '../../types/navigation';

type TabRouteName = Exclude<keyof RootTabParamList, 'Call'>;

const TAB_CONFIG: Record<
  TabRouteName,
  { label: string; Icon: LucideIcon }
> = {
  Home: { label: 'Home', Icon: Home },
  Services: { label: 'Services', Icon: LayoutGrid },
  Bookings: { label: 'Bookings', Icon: Calendar },
  Profile: { label: 'Profile', Icon: User },
};

/** Root screen per tab stack — tapping an active tab pops back here (iOS/Material pattern). */
const TAB_ROOT_SCREEN: Record<TabRouteName, string> = {
  Home: 'HomeMain',
  Bookings: 'BookingsMain',
  Services: 'ServicesMain',
  Profile: 'ProfileMain',
};

function nestedStackIndex(route: { state?: { index?: number } | undefined }): number {
  const nested = route.state;
  if (!nested || nested.index == null) return 0;
  return nested.index;
}

const PROFILE_DOUBLE_TAP_MS = 400;

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const profileLastTapAt = useRef(0);

  const popTabStackToRoot = (
    route: (typeof state.routes)[number],
    routeName: TabRouteName,
  ) => {
    const rootScreen = TAB_ROOT_SCREEN[routeName];
    const nested = route.state;
    if (nested?.key) {
      navigation.dispatch({
        ...CommonActions.reset({
          index: 0,
          routes: [{ name: rootScreen }],
        }),
        target: nested.key,
      });
      return;
    }
    navigation.navigate(routeName, { screen: rootScreen } as never);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const tab = state.routes[state.index];
      const nested = tab.state;
      if (!nested || nested.index == null || nested.index > 0 || !nested.key) {
        return false;
      }
      const root = nested.routeNames?.[0];
      const current = nested.routes[nested.index]?.name;
      if (!root || !current || current === root) return false;
      navigation.dispatch({
        ...CommonActions.reset({
          index: 0,
          routes: [{ name: root }],
        }),
        target: nested.key,
      });
      return true;
    });
    return () => sub.remove();
  }, [navigation, state]);

  // v6 SOS redesign: the SOS screen now uses the standard light chrome, so
  // the tab bar stays visible. Users keep an always-visible escape hatch out
  // of an emergency screen (the old hidden-bar fullscreen felt like a trap).

  const handleEmergencyCall = () => {
    navigation.navigate('Call', { screen: 'CallMain' });
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        if (route.name === 'Call') {
          return (
            <View key={route.key} style={styles.fabSlot}>
              <Pressable
                onPress={handleEmergencyCall}
                style={({ pressed }) => [
                  styles.fab,
                  pressed && styles.fabPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Emergency SOS">
                <Text style={styles.fabLabel}>SOS</Text>
              </Pressable>
            </View>
          );
        }

        const routeName = route.name as TabRouteName;
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const { label, Icon } = TAB_CONFIG[routeName];
        const tint = isFocused ? colors.primary : colors.grey;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (event.defaultPrevented) {
            return;
          }

          const deepInStack = nestedStackIndex(route) > 0;

          if (routeName === 'Profile' && isFocused) {
            const now = Date.now();
            const isDoubleTap = now - profileLastTapAt.current < PROFILE_DOUBLE_TAP_MS;
            profileLastTapAt.current = now;
            if (isDoubleTap || deepInStack) {
              popTabStackToRoot(route, routeName);
            }
            return;
          }

          if (isFocused && deepInStack) {
            popTabStackToRoot(route, routeName);
            return;
          }

          if (!isFocused) {
            profileLastTapAt.current = 0;
            navigation.navigate(route.name, route.params);
            return;
          }

          // Already on this tab's root — optional re-tap could scroll-to-top later.
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}>
            <Icon
              size={22}
              color={tint}
              strokeWidth={isFocused ? 2.5 : 2}
              fill={isFocused ? tint : 'transparent'}
            />
            <Text style={[styles.tabLabel, { color: tint }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    overflow: 'visible',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xs,
    minHeight: 52,
  },
  tabLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    marginTop: 4,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  dotSpacer: {
    width: 5,
    height: 5,
    marginTop: 4,
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 52,
  },
  fab: {
    position: 'absolute',
    top: -20,
    width: layout.fabSize + 6,
    height: layout.fabSize + 6,
    borderRadius: (layout.fabSize + 6) / 2,
    backgroundColor: SOS_COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
    shadowColor: SOS_COLORS.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabLabel: {
    color: SOS_COLORS.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.8,
  },
  fabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
  },
});
