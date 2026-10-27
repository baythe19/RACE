import React, { useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import ServiceCategoryArtCard from '../components/services/ServiceCategoryArtCard';
import ServiceNavHeader from '../components/services/ServiceNavHeader';
import { SERVICE_CATEGORY_CARDS } from '../constants/serviceCategoryCards';
import { useCatalogStore } from '../store/catalogStore';
import type { ServicesStackParamList } from '../types/navigation';
import { openServiceCategory } from '../utils/serviceNavigation';

const REF_W = 390;

type Props = NativeStackScreenProps<ServicesStackParamList, 'ServicesMain'>;

export default function ServicesScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);

  const { fetchServices } = useCatalogStore();

  useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  const openCategory = (categoryId: string, categoryTitle: string) => {
    openServiceCategory(navigation, categoryId, categoryTitle);
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      const parent = navigation.getParent();
      (parent as any)?.navigate('Home', { screen: 'HomeMain' });
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ServiceNavHeader
        title="Services"
        subtitle="Choose a service category to get started"
        onBack={handleBack}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: px(14),
          paddingTop: px(12),
          paddingBottom: px(28),
          gap: px(12),
        }}
        showsVerticalScrollIndicator={false}>
        {SERVICE_CATEGORY_CARDS.map(item => (
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
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
