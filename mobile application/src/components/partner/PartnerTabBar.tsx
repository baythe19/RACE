import { PartnerText } from './PartnerText';
/**
 * RACE Partner — bottom tab bar (pixel-matched to user's reference crop).
 *
 * Reference (image copy.png): flat white bar, NO top hairline border, NO rounded
 * corners. Each tab = outline icon above label; active tab gets **solid amber
 * fill icon** (House solid / ClipboardList solid / User solid) + amber bold
 * label; inactive = grey outline icon + grey label. No underline pill.
 *
 * Behavior kept from before:
 *  - Jobs red count badge while the driver has unaccepted offers
 *  - bar hidden on fullscreen routes (active job map)
 *  - tabPress emit + navigate (React Navigation contract)
 */

import React from 'react';
import { Pressable, View } from 'react-native';
import {
  ClipboardList,
  House,
  Truck,
  User,
  Users,
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
import { partnerAccountParams } from '../../navigation/partnerNavigationRef';

const AMBER = '#FEA701';
const AMBER_TEXT = '#F58A00';
const GREY = '#A6A8B4';

type TabRouteName = keyof PartnerTabParamList;

/**
 * Screens that own the whole viewport: while one of them is focused the bar is
 * hidden so the map and the single primary action keep the full height.
 */
const FULLSCREEN_ROUTES = new Set(['PartnerActiveJob', 'VendorAssignJob']);

const TAB_CONFIG: Record<TabRouteName, { label: string; Icon: LucideIcon }> = {
  PartnerHome: { label: 'Home', Icon: House },
  PartnerJobs: { label: 'Jobs', Icon: ClipboardList },
  PartnerVehicles: { label: 'Vehicles', Icon: Truck },
  PartnerDrivers: { label: 'Drivers', Icon: Users },
  PartnerAccount: { label: 'Account', Icon: User },
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
  const nestedState = activeRoute?.state;
  const nestedLeaf = nestedState?.routes[nestedState.index ?? 0];
  const vendorDriverWizardIsFullScreen =
    nestedRouteName === 'VendorDrivers' &&
    Boolean((nestedLeaf?.params as { fullScreen?: boolean } | undefined)?.fullScreen);
  if ((nestedRouteName && FULLSCREEN_ROUTES.has(nestedRouteName)) || vendorDriverWizardIsFullScreen) {
    return null;
  }

  const iconSize = px(23);
  const badgeSize = px(19);

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingTop: px(12),
        paddingBottom: Math.max(insets.bottom, px(10)),
        paddingHorizontal: px(6),
      }}>
      {state.routes.map((route, index) => {
        const routeName = route.name as TabRouteName;
        const tabConfig = TAB_CONFIG[routeName];
        if (!tabConfig) return null;
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const { label, Icon } = tabConfig;
        const showBadge = routeName === 'PartnerJobs' && pendingRequests > 0;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            if (routeName === 'PartnerAccount') {
              navigation.navigate('PartnerAccount', partnerAccountParams('PartnerAccountMain'));
            } else {
              navigation.navigate(route.name);
            }
          }
        };

        const onLongPress = () => navigation.emit({
          type: 'tabLongPress',
          target: route.key,
        });

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
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
              gap: px(5),
            }}>
            <View>
              <Icon
                size={iconSize}
                color={isFocused ? AMBER : GREY}
                strokeWidth={isFocused ? 0 : 1.9}
                fill={isFocused ? AMBER : 'transparent'}
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
                    backgroundColor: '#EF4444',
                    borderWidth: px(2),
                    borderColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: px(3),
                  }}>
                  <PartnerText
                    style={{
                      fontSize: px(11),
                      lineHeight: px(13),
                      fontWeight: '700',
                      color: '#FFFFFF',
                    }}>
                    {pendingRequests > 9 ? '9+' : pendingRequests}
                  </PartnerText>
                </View>
              ) : null}
            </View>

            <PartnerText
              style={{
                fontSize: px(11.5),
                lineHeight: px(14),
                fontWeight: isFocused ? '700' : '500',
                color: isFocused ? AMBER_TEXT : GREY,
              }}>
              {label}
            </PartnerText>
          </Pressable>
        );
      })}
    </View>
  );
}
