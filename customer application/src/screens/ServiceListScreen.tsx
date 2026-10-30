import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ServiceItemCard from '../components/ServiceItemCard';
import AppScreenLayout from '../components/ui/AppScreenLayout';
import DataSkeleton from '../components/ui/DataSkeleton';
import ServiceIcon from '../components/ui/ServiceIcon';
import { useCategoryById } from '../services/catalog/useCatalogQueries';
import type { HomeStackParamList } from '../types/navigation';
import { colors, getCategoryTheme, radius, shadows, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'ServiceList'>;

export default function ServiceListScreen({ route, navigation }: Props) {
  const { categoryId } = route.params;
  const { category, isLoading } = useCategoryById(categoryId);
  const theme = getCategoryTheme(categoryId);

  if (isLoading) {
    return (
      <AppScreenLayout backgroundColor={colors.pageBg} scrollable={false}>
        <View style={styles.loader}>
          <DataSkeleton variant="services" />
        </View>
      </AppScreenLayout>
    );
  }

  if (!category) {
    return (
      <AppScreenLayout backgroundColor={colors.pageBg}>
        <Text style={styles.errorText}>Category not found.</Text>
      </AppScreenLayout>
    );
  }

  return (
    <AppScreenLayout backgroundColor={colors.pageBg}>
      <View style={[styles.hero, shadows.card, { backgroundColor: theme.background }]}>
        <View style={[styles.heroIconWrap, { backgroundColor: theme.iconBackground }]}>
          <ServiceIcon categoryId={category.id} emoji={category.icon} size={32} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.dark }]}>{category.title}</Text>
        <Text style={styles.heroSubtitle}>
          {category.description || 'Select a service below to book with RACE Service.'}
        </Text>
      </View>

      {category.services.map(service => (
        <ServiceItemCard
          key={service.id}
          service={service}
          accent={theme.accent}
          onPress={() =>
            navigation.navigate('SelectService', {
              categoryId: category.id,
              serviceId: service.id,
              serviceLabel: service.label,
              serviceDescription: service.description,
            })
          }
        />
      ))}
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  hero: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.extrabold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.grey,
    textAlign: 'center',
    lineHeight: 20,
  },
});
