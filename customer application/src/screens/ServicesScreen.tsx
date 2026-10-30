import React from 'react';
import { Pressable, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ServiceCategoryArtCard from '../components/services/ServiceCategoryArtCard';
import AppScreenLayout from '../components/ui/AppScreenLayout';
import DataSkeleton from '../components/ui/DataSkeleton';
import TabRootHeader from '../components/ui/TabRootHeader';
import { SERVICE_CATEGORY_CARDS } from '../constants/serviceCategoryCards';
import { useNotificationsQuery } from '../services/profile/useProfileQueries';
import { useCatalogStore } from '../store/catalogStore';
import type { ServicesStackParamList } from '../types/navigation';
import { openServiceCategory } from '../utils/serviceNavigation';
import { colors } from '../theme';

const REF_W = 390;

type Props = NativeStackScreenProps<ServicesStackParamList, 'ServicesMain'>;

export default function ServicesScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);

  const { servicesReady, hasHydrated, isLoading: catalogLoading } = useCatalogStore();
  const { data: notificationsData } = useNotificationsQuery();
  const unreadCount = notificationsData?.unreadCount ?? 0;

  const showServicesSkeleton =
    !hasHydrated || (!servicesReady && catalogLoading);

  const openCategory = (categoryId: string, categoryTitle: string) => {
    openServiceCategory(navigation, categoryId, categoryTitle);
  };

  return (
    <AppScreenLayout
      backgroundColor={colors.pageBg}
      contentStyle={{ gap: px(12), paddingTop: px(12) }}
      header={
        <TabRootHeader
          title="Services"
          notificationCount={unreadCount}
          onBellPress={() => {
            const tabNav = navigation.getParent();
            if (tabNav) {
              (tabNav as { navigate: (name: string, params?: object) => void }).navigate('Profile', {
                screen: 'Notifications',
              });
            }
          }}
          onAvatarPress={() => {
            navigation.getParent()?.navigate('Profile' as never);
          }}
        />
      }>
      {showServicesSkeleton ? (
        <DataSkeleton variant="services" testID="servicesSkeleton" />
      ) : (
        SERVICE_CATEGORY_CARDS.map(item => (
          <Pressable
            key={item.id}
            onPress={() => openCategory(item.id, item.categoryTitle)}
            style={({ pressed }) => [
              {
                width: '100%',
                transform: [{ scale: pressed ? 0.985 : 1 }],
                opacity: pressed ? 0.94 : 1,
              },
            ]}>
            <ServiceCategoryArtCard card={item} />
          </Pressable>
        ))
      )}
    </AppScreenLayout>
  );
}
