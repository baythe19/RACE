/**
 * RACE Partner — bottom tab bar.
 *
 * Rebuilt to match the approved partner boards:
 *  - 3 destinations only: Home / Jobs / Account (Dashboard → Home)
 *  - active tab = amber filled icon + amber label + amber underline
 *  - a red count badge on Jobs while the driver has unaccepted requests
 *  - bar sits on the page as a white surface with rounded top corners
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  ClipboardList,
  House,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useDriverJobOffersQuery,
  useDriverProfileQuery,
} from '../../services/driver/useDriverQueries';
import { useAppSelector } from '../../redux/hooks';
import { useScreenPx } from '../../hooks/useScreenPx';
import type { PartnerTabParamList } from '../../types/partnerNavigation';
import { buildDriverVerification } from '../../utils/driverVerification';
import { driverColors as C, driverMetrics as M, driverType as T } from '../../theme/driverUi';

type TabRouteName = keyof PartnerTabParamList;

/**
 * Screens that own the whole viewport: while one of them is focused the bar is
 * hidden so the map and the single primary action keep the full height.
 */
const FULLSCREEN_ROUTES = new Set(['PartnerActiveJob']);

/** `activeFill` mirrors the board's solid-vs-outline active treatment. */
const TAB_CONFIG: Record<
  TabRouteName,
  { label: string; Icon: LucideIcon; activeFill: boolean }
> = {
  PartnerHome: { label: 'Home', Icon: House, activeFill: true },
  PartnerJobs: { label: 'Jobs', Icon: ClipboardList, activeFill: true },
  PartnerAccount: { label: 'Account', Icon: User, activeFill: true },
};

export default function PartnerTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const px = useScreenPx();
  const role = useAppSelector(appState => appState.auth.user?.role);
  const isDriver = role === 'driver';
  const { data: profile } = useDriverProfileQuery(isDriver);
  const isApproved = buildDriverVerification(profile).isApproved;
  const { data: offers = [] } = useDriverJobOffersQuery(isDriver && isApproved);
  const pendingRequests = isDriver && isApproved ? offers.length : 0;

  const activeRoute = state.routes[state.index];
  const nestedRouteName = activeRoute ? getFocusedRouteNameFromRoute(activeRoute) : undefined;
  if (nestedRouteName && FULLSCREEN_ROUTES.has(nestedRouteName)) {
    return null;
  }

  const iconSize = px(24);
  const badgeSize = px(19);

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: C.white,
          borderTopLeftRadius: px(20),
          borderTopRightRadius: px(20),
          borderTopWidth: 1,
          borderTopColor: C.hairline,
          paddingTop: px(10),
          paddingBottom: Math.max(insets.bottom, px(6)),
          paddingHorizontal: px(8),
          shadowColor: '#0B0B0B',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 2,
        },
      ]}>
      {state.routes.map((route, index) => {
        const routeName = route.name as TabRouteName;
        const tabConfig = TAB_CONFIG[routeName];
        if (!tabConfig) return null;
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const { label, Icon, activeFill } = tabConfig;
        const tint = isFocused ? C.amberText : C.greySoft;
        const showBadge = routeName === 'PartnerJobs' && pendingRequests > 0;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={
              showBadge
                ? `${options.tabBarAccessibilityLabel ?? label}, ${pendingRequests} new`
                : options.tabBarAccessibilityLabel ?? label
            }
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'flex-start',
              minHeight: px(M.tabBarHeight - 16),
            }}>
            <View>
              <Icon
                size={iconSize}
                color={isFocused ? C.amber : C.greySoft}
                strokeWidth={isFocused && activeFill ? 0 : 2.1}
                fill={isFocused && activeFill ? C.amber : 'transparent'}
              />
              {showBadge ? (
                <View
                  style={{
                    position: 'absolute',
                    top: px(-7),
                    right: px(-10),
                    minWidth: badgeSize,
                    height: badgeSize,
                    borderRadius: badgeSize / 2,
                    backgroundColor: C.red,
                    borderWidth: px(2),
                    borderColor: C.white,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: px(3),
                  }}>
                  <Text
                    style={{
                      fontSize: px(11),
                      lineHeight: px(13),
                      fontWeight: '700',
                      color: C.white,
                    }}>
                    {pendingRequests > 9 ? '9+' : pendingRequests}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              style={[
                T.tab,
                {
                  fontSize: px(12),
                  lineHeight: px(15),
                  color: tint,
                  marginTop: px(4),
                },
              ]}>
              {label}
            </Text>

            <View
              style={{
                width: isFocused ? px(M.activeTabUnderlineWidth) : 0,
                height: px(3),
                borderRadius: px(2),
                backgroundColor: C.amber,
                marginTop: px(4),
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
