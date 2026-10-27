import type { ImageSourcePropType } from 'react-native';

import { images } from '../assets';

export type ServiceCategoryCardId = 'towing' | 'driver' | 'roadside' | 'future';

export interface ServiceCategoryCard {
  id: ServiceCategoryCardId;
  title: string;
  categoryTitle: string;
  subtitle: string;
  subtitleColor: string;
  image: ImageSourcePropType;
  cardBg: string;
  fogColors: readonly [string, string, string];
  gradientColors: readonly [string, string, string, string];
  gradientLocations: readonly [number, number, number, number];
}

/**
 * Single source of truth for the service category cards.
 * Used by the Services screen list AND as the hero card on each
 * service detail screen, so the design stays continuous.
 */
export const SERVICE_CATEGORY_CARDS: ServiceCategoryCard[] = [
  {
    id: 'towing',
    title: 'Towing Service',
    categoryTitle: 'Towing Service',
    subtitle: 'Fast & safe towing\nanytime, anywhere.',
    subtitleColor: '#5C4813',
    cardBg: '#FED569',
    fogColors: ['#FED569', 'rgba(254, 213, 105, 0.75)', 'rgba(254, 213, 105, 0)'],
    image: images.serviceTowingCard,
    gradientColors: ['#FDD257', 'rgba(253, 210, 87, 0.98)', 'rgba(253, 210, 87, 0.72)', 'rgba(253, 210, 87, 0)'],
    gradientLocations: [0, 0.38, 0.56, 0.82],
  },
  {
    id: 'driver',
    title: 'Driver Service',
    categoryTitle: 'Driver Service',
    subtitle: 'Hire verified drivers\nfor your journey.',
    subtitleColor: '#4B5563',
    cardBg: '#FFFFFF',
    fogColors: ['#FFFFFF', 'rgba(255, 255, 255, 0.75)', 'rgba(255, 255, 255, 0)'],
    image: images.serviceDriverCard,
    gradientColors: ['#F4F3ED', 'rgba(244, 243, 237, 0.98)', 'rgba(244, 243, 237, 0.72)', 'rgba(244, 243, 237, 0)'],
    gradientLocations: [0, 0.38, 0.56, 0.82],
  },
  {
    id: 'roadside',
    title: 'Roadside Assistance',
    categoryTitle: 'Roadside Assistance',
    subtitle: 'Quick on-spot help for\ncommon issues.',
    subtitleColor: '#334155',
    cardBg: '#FFFFFF',
    fogColors: ['#FFFFFF', 'rgba(255, 255, 255, 0.75)', 'rgba(255, 255, 255, 0)'],
    image: images.serviceRoadsideCard,
    gradientColors: ['#E6F2F9', 'rgba(230, 242, 249, 0.98)', 'rgba(230, 242, 249, 0.72)', 'rgba(230, 242, 249, 0)'],
    gradientLocations: [0, 0.38, 0.56, 0.82],
  },
  {
    id: 'future',
    title: 'More Services',
    categoryTitle: 'More Services',
    subtitle: 'Car wash, inspection,\ninsurance and more.',
    subtitleColor: '#57534E',
    cardBg: '#FFFFFF',
    fogColors: ['#FFFFFF', 'rgba(255, 255, 255, 0.75)', 'rgba(255, 255, 255, 0)'],
    image: images.serviceMoreCard,
    gradientColors: ['#F6F7F7', 'rgba(246, 247, 247, 0.98)', 'rgba(246, 247, 247, 0.72)', 'rgba(246, 247, 247, 0)'],
    gradientLocations: [0, 0.38, 0.56, 0.82],
  },
];

export const SERVICE_CATEGORY_CARD_BY_ID = Object.fromEntries(
  SERVICE_CATEGORY_CARDS.map(card => [card.id, card]),
) as Record<ServiceCategoryCardId, ServiceCategoryCard>;

export function getServiceCategoryCard(id: ServiceCategoryCardId): ServiceCategoryCard {
  return SERVICE_CATEGORY_CARD_BY_ID[id];
}
