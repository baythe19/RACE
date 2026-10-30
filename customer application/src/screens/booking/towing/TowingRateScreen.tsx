import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Camera, Star } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverAvatar from '../../../components/bookings/DriverAvatar';
import TowingBookingLayout, { useBookingTheme } from '../../../components/booking/TowingBookingLayout';
import { useAppDialog } from '../../../hooks/useAppDialog';
import { useBookingQuery, useSubmitRatingMutation } from '../../../services/bookings/useBookingQueries';
import type { BookingsStackParamList, HomeStackParamList } from '../../../types/navigation';
import { colors, shadows, typography } from '../../../theme';
import { goBackWithinStack } from '../../../navigation/goBackWithinStack';

type Props = NativeStackScreenProps<HomeStackParamList & BookingsStackParamList, 'TowingRate'>;

export default function TowingRateScreen({ navigation, route }: Props) {
  const { t } = useBookingTheme();
  const { dialog, showDialog } = useAppDialog();
  const bookingId = route.params?.bookingId;
  const bookingType = route.params?.bookingType ?? 'towing';
  const booking = useBookingQuery(bookingId ?? '', 'towing');
  const submitRating = useSubmitRatingMutation();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = rating > 0 && bookingId && !isSubmitting;

  const handleSubmit = async () => {
    if (!bookingId || rating === 0) return;
    setIsSubmitting(true);
    try {
      await submitRating.mutateAsync({
        bookingId,
        bookingType,
        payload: { rating, review: feedback.trim() || undefined },
      });
      navigation.popToTop();
    } catch {
      showDialog({
        tone: 'error',
        title: 'Unable to submit rating',
        message: 'Please try again in a moment.',
        primaryLabel: 'OK',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (bookingId && !booking) {
    return (
      <TowingBookingLayout title="Rate Your Experience" step={0} hideFooter>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </TowingBookingLayout>
    );
  }

  return (
    <TowingBookingLayout
      title="Rate Your Experience"
      step={0}
      onBack={() => goBackWithinStack(navigation)}
      buttonLabel={isSubmitting ? 'Submitting...' : 'Submit Review'}
      continueDisabled={!canSubmit}
      onContinue={() => void handleSubmit()}
      scrollable>
      {dialog}
      <View style={{ flex: 1 }}>
        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.px(12),
              borderRadius: t.cardRadius,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.goldLight,
              padding: t.rowPadding,
              marginBottom: t.px(18),
            },
            shadows.card,
          ]}>
          <DriverAvatar size={t.px(48)} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: t.bodyLarge,
                fontWeight: typography.weights.bold,
                color: colors.dark,
              }}>
              {booking?.driver?.name ?? 'Your service partner'}
            </Text>
            <Text style={{ fontSize: t.caption, color: colors.grey, marginTop: t.px(2) }}>
              {booking?.serviceLabel ?? 'RACE Service'}
            </Text>
          </View>
        </View>

        <Text
          style={{
            fontSize: t.bodyLarge,
            fontWeight: typography.weights.semibold,
            color: colors.dark,
            marginBottom: t.px(6),
            textAlign: 'center',
          }}>
          How was your experience?
        </Text>
        <Text
          style={{
            fontSize: t.caption,
            color: colors.grey,
            marginBottom: t.px(18),
            textAlign: 'center',
          }}>
          Your feedback helps us improve RACE Service
        </Text>

        <View
          style={{
            flexDirection: 'row',
            gap: t.px(10),
            marginBottom: t.px(22),
            justifyContent: 'center',
          }}>
          {[1, 2, 3, 4, 5].map(star => (
            <Pressable key={star} onPress={() => setRating(star)} hitSlop={6}>
              <Star
                size={t.px(36)}
                color={colors.primary}
                fill={star <= rating ? colors.primary : 'transparent'}
                strokeWidth={2}
              />
            </Pressable>
          ))}
        </View>

        <View
          style={[
            {
              borderRadius: t.inputRadius,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.background,
              padding: t.rowPadding,
              minHeight: t.px(120),
              marginBottom: t.px(8),
            },
            shadows.card,
          ]}>
          <TextInput
            value={feedback}
            onChangeText={text => setFeedback(text.slice(0, 200))}
            placeholder="Write your feedback..."
            placeholderTextColor={colors.grey}
            multiline
            style={{
              fontSize: t.bodyLarge,
              color: colors.dark,
              lineHeight: t.px(22),
              textAlignVertical: 'top',
              minHeight: t.px(90),
            }}
          />
        </View>
        <Text
          style={{
            fontSize: t.caption,
            color: colors.grey,
            textAlign: 'right',
            marginBottom: t.px(20),
          }}>
          {feedback.length}/200
        </Text>

        <Text
          style={{
            fontSize: t.labelBold,
            fontWeight: typography.weights.bold,
            color: colors.dark,
            marginBottom: t.px(12),
          }}>
          Add Photos (Optional)
        </Text>
        <Pressable
          style={{
            height: t.px(100),
            borderRadius: t.inputRadius,
            borderWidth: 1.5,
            borderColor: colors.border,
            borderStyle: 'dashed',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.lightGrey,
          }}>
          <Camera size={t.px(28)} color={colors.grey} />
        </Pressable>
      </View>
    </TowingBookingLayout>
  );
}
