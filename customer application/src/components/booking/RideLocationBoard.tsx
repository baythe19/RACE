import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Pressable, Text, TextInput, View } from 'react-native';
import { Briefcase, Clock, Heart, Home, Map as MapIcon, MapPin } from 'lucide-react-native';

import { colors, shadows, typography } from '../../theme';

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
  /** When null, every stop shows its saved address (not an empty search field). */
  activeId: RideStopId | null;
  query: string;
  searching?: boolean;
  suggestions: RideSuggestion[];
  emptyHint?: string;
  onActivate: (id: RideStopId) => void;
  onQueryChange: (text: string) => void;
  onClearActive?: (stopId?: RideStopId) => void;
  onSelectOnMap: () => void;
  /** Rendered directly under “Select on map” (e.g. distance / fare). */
  belowMap?: ReactNode;
  /** Hide idle “Search a place…” when route is already complete. */
  suppressIdleHint?: boolean;
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
  belowMap,
  suppressIdleHint = false,
}: Props) {
  const fade = useRef(new Animated.Value(1)).current;
  const [editSearch, setEditSearch] = useState(false);

  useEffect(() => {
    fade.setValue(0.55);
    Animated.timing(fade, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [activeId, fade]);

  useEffect(() => {
    setEditSearch(false);
  }, [activeId]);

  return (
    <View>
      <View
        style={[
          {
            borderRadius: px(16),
            borderWidth: 1,
            borderColor: '#E7E5E4',
            backgroundColor: colors.background,
            paddingHorizontal: px(12),
            paddingVertical: px(4),
          },
          shadows.card,
        ]}>
        {stops.map((stop, index) => {
          const active = activeId != null && stop.id === activeId;
          const inSearchMode =
            active && (!stop.filled || query.trim().length > 0 || editSearch);
          const color = stop.dot === 'pickup' ? PICKUP : DROP;
          return (
            <Pressable
              key={stop.id}
              onPress={() => {
                if (activeId === stop.id && stop.filled && query.trim() === '') {
                  setEditSearch(true);
                } else {
                  setEditSearch(false);
                }
                onActivate(stop.id);
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: inSearchMode ? 'center' : stop.filled ? 'flex-start' : 'center',
                minHeight: px(56),
                gap: px(10),
                borderRadius: px(12),
                backgroundColor: active ? '#F8FAFC' : pressed ? '#FAFAFA' : 'transparent',
                paddingHorizontal: px(4),
                paddingVertical: stop.filled && !inSearchMode ? px(6) : 0,
              })}>
              <View style={{ width: px(18), alignItems: 'center', justifyContent: 'center' }}>
                {index > 0 ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: px(-16),
                      height: px(16),
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                    {[0, 1, 2].map(dot => (
                      <View
                        key={dot}
                        style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: '#D6D3D1' }}
                      />
                    ))}
                  </View>
                ) : null}
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
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                {inSearchMode ? (
                  <TextInput
                    key={stop.id}
                    value={query}
                    onChangeText={onQueryChange}
                    placeholder={stop.placeholder}
                    placeholderTextColor="#A8A29E"
                    autoFocus
                    autoCorrect={false}
                    returnKeyType="search"
                    blurOnSubmit={false}
                    style={{
                      fontSize: px(15),
                      fontWeight: typography.weights.semibold,
                      color: colors.dark,
                      paddingVertical: px(4),
                    }}
                  />
                ) : (
                  <Text
                    numberOfLines={3}
                    style={{
                      fontSize: px(14),
                      lineHeight: px(19),
                      fontWeight: stop.filled ? typography.weights.semibold : typography.weights.regular,
                      color: stop.filled ? colors.dark : '#A8A29E',
                    }}>
                    {stop.filled ? stop.value : stop.placeholder}
                  </Text>
                )}
              </View>
              {active && (query.length > 0 || stop.filled) && onClearActive ? (
                <Pressable
                  onPress={() => onClearActive(stop.id)}
                  hitSlop={8}
                  style={{
                    width: px(22),
                    height: px(22),
                    borderRadius: px(11),
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F5F5F4',
                  }}>
                  <Text style={{ fontSize: px(14), color: colors.grey, lineHeight: px(16) }}>×</Text>
                </Pressable>
              ) : !active && stop.filled && onClearActive ? (
                <Pressable
                  onPress={() => onClearActive(stop.id)}
                  hitSlop={8}
                  style={{
                    width: px(22),
                    height: px(22),
                    borderRadius: px(11),
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F5F5F4',
                  }}>
                  <Text style={{ fontSize: px(14), color: colors.grey, lineHeight: px(16) }}>×</Text>
                </Pressable>
              ) : null}
            </Pressable>
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
        {searching ? <ActivityIndicator size="small" color={colors.grey} /> : null}
      </Pressable>

      {belowMap ? <View style={{ marginTop: px(12) }}>{belowMap}</View> : null}

      <Animated.View
        style={{
          opacity: fade,
          marginTop: px(suppressIdleHint && suggestions.length === 0 ? 0 : belowMap ? 10 : 8),
        }}>
        {suggestions.length === 0 && query.trim().length >= 2 && !searching ? (
          <Text style={{ marginTop: px(16), fontSize: px(13), color: colors.grey, textAlign: 'center' }}>
            {emptyHint || 'No matching places. Try the map.'}
          </Text>
        ) : suggestions.length === 0 ? (
          suppressIdleHint ? null : (
          <View style={{ alignItems: 'center', paddingTop: px(28), paddingBottom: px(8) }}>
            <MapPin size={px(22)} color="#A8A29E" strokeWidth={1.8} />
            <Text
              style={{
                marginTop: px(8),
                fontSize: px(13),
                color: colors.grey,
                textAlign: 'center',
              }}>
              Search a place, or select it on the map
            </Text>
          </View>
          )
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
