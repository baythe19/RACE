import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, Text, TextInput, View } from 'react-native';
import { Briefcase, Clock, Heart, Home, Map as MapIcon, MapPin } from 'lucide-react-native';

import { colors, typography } from '../../theme';

export type RideStopId = string;

export type RideStop = {
  id: RideStopId;
  label: string;
  value: string;
  placeholder: string;
  filled: boolean;
  dot: 'pickup' | 'drop';
};

export type RideSuggestion = {
  id: string;
  title: string;
  subtitle?: string;
  distanceLabel?: string;
  kind: 'saved' | 'recent' | 'search';
  savedType?: 'home' | 'office' | 'custom';
  onPress: () => void;
};

type Props = {
  px: (n: number) => number;
  stops: RideStop[];
  activeId: RideStopId;
  query: string;
  searching?: boolean;
  suggestions: RideSuggestion[];
  emptyHint?: string;
  onActivate: (id: RideStopId) => void;
  onQueryChange: (text: string) => void;
  onClearActive?: () => void;
  onSelectOnMap: () => void;
};

const PICKUP = '#16A34A';
const DROP = '#E11D48';

export default function RideLocationBoard({
  px,
  stops,
  activeId,
  query,
  searching,
  suggestions,
  emptyHint,
  onActivate,
  onQueryChange,
  onClearActive,
  onSelectOnMap,
}: Props) {
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fade.setValue(0.4);
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeId, suggestions.length, fade]);

  return (
    <View>
      <View
        style={{
          borderRadius: px(16),
          borderWidth: 1,
          borderColor: '#E5E7EB',
          backgroundColor: colors.background,
          paddingHorizontal: px(12),
          paddingVertical: px(6),
        }}>
        {stops.map((stop, index) => {
          const active = stop.id === activeId;
          const color = stop.dot === 'pickup' ? PICKUP : DROP;
          return (
            <View key={stop.id}>
              {index > 0 ? (
                <View style={{ marginLeft: px(11), height: px(10), borderLeftWidth: 1.5, borderStyle: 'dashed', borderColor: '#D1D5DB' }} />
              ) : null}
              <Pressable
                onPress={() => onActivate(stop.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: px(52),
                  gap: px(10),
                }}>
                <View
                  style={{
                    width: px(12),
                    height: px(12),
                    borderRadius: px(6),
                    backgroundColor: color,
                    borderWidth: 2,
                    borderColor: stop.dot === 'pickup' ? '#DCFCE7' : '#FFE4E6',
                  }}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  {active ? (
                    <TextInput
                      value={query}
                      onChangeText={onQueryChange}
                      placeholder={stop.filled ? stop.value : stop.placeholder}
                      placeholderTextColor={stop.filled ? colors.dark : colors.grey}
                      autoFocus
                      style={{
                        fontSize: px(15),
                        fontWeight: typography.weights.semibold,
                        color: colors.dark,
                        paddingVertical: px(4),
                      }}
                    />
                  ) : (
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: px(15),
                        fontWeight: stop.filled ? typography.weights.semibold : typography.weights.regular,
                        color: stop.filled ? colors.dark : colors.grey,
                      }}>
                      {stop.filled ? stop.value : stop.placeholder}
                    </Text>
                  )}
                </View>
                {active && (query.length > 0 || stop.filled) && onClearActive ? (
                  <Pressable onPress={onClearActive} hitSlop={8}>
                    <Text style={{ fontSize: px(16), color: colors.grey }}>×</Text>
                  </Pressable>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      <Pressable
        onPress={onSelectOnMap}
        style={({ pressed }) => ({
          alignSelf: 'flex-start',
          marginTop: px(12),
          flexDirection: 'row',
          alignItems: 'center',
          gap: px(6),
          paddingHorizontal: px(14),
          paddingVertical: px(9),
          borderRadius: px(22),
          borderWidth: 1,
          borderColor: '#E5E7EB',
          backgroundColor: pressed ? '#F9FAFB' : colors.background,
        })}>
        <MapIcon size={px(15)} color={colors.dark} strokeWidth={2.1} />
        <Text style={{ fontSize: px(13), fontWeight: typography.weights.semibold, color: colors.dark }}>
          Select on map
        </Text>
      </Pressable>

      <Animated.View style={{ opacity: fade, marginTop: px(8) }}>
        {searching ? (
          <ActivityIndicator style={{ marginTop: px(16) }} color={colors.primary} />
        ) : suggestions.length === 0 && query.trim().length >= 2 ? (
          <Text style={{ marginTop: px(16), fontSize: px(13), color: colors.grey, textAlign: 'center' }}>
            {emptyHint || 'No matching places. Try the map.'}
          </Text>
        ) : (
          suggestions.map(item => {
            const Icon =
              item.kind === 'recent' ? Clock : item.savedType === 'home' ? Home : item.savedType === 'office' ? Briefcase : MapPin;
            return (
              <Pressable
                key={item.id}
                onPress={item.onPress}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: px(12),
                  paddingVertical: px(12),
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                  backgroundColor: pressed ? '#FAFAFA' : 'transparent',
                })}>
                <Icon size={px(18)} color={colors.grey} strokeWidth={2} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontSize: px(14), fontWeight: typography.weights.bold, color: colors.dark }}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text numberOfLines={1} style={{ marginTop: px(2), fontSize: px(12), color: colors.grey }}>
                      {item.distanceLabel ? `${item.distanceLabel}  ` : ''}
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
                {item.kind === 'saved' ? <Heart size={px(16)} color="#9CA3AF" strokeWidth={2} /> : null}
              </Pressable>
            );
          })
        )}
      </Animated.View>
    </View>
  );
}
