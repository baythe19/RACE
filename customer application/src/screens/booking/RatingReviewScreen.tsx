import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import PrimaryButton from '../../components/ui/PrimaryButton';
import Screen, { Card, ScreenContent } from '../../components/ui/Screen';
import { useBookingQuery, useSubmitRatingMutation } from '../../services/bookings/useBookingQueries';
import type { BookingsStackParamList } from '../../types/navigation';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<BookingsStackParamList, 'RatingReview'>;

const TAGS = ['Professional', 'On Time', 'Helpful', 'Friendly', 'Clean Vehicle', 'Safe Driving'];
const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];

export default function RatingReviewScreen({ navigation, route }: Props) {
  const booking = useBookingQuery(route.params.bookingId, route.params.bookingType);
  const submitRating = useSubmitRatingMutation();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const bookingType = route.params.bookingType ?? booking?.bookingType ?? 'towing';

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async () => {
    await submitRating.mutateAsync({
      bookingId: route.params.bookingId,
      bookingType,
      payload: { rating, review: review.trim() || undefined, tags: selectedTags },
    });
    navigation.navigate('BookingDetail', { bookingId: route.params.bookingId, bookingType });
  };

  return (
    <Screen>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ScreenContent>
            <Text style={styles.title}>Rate Your Experience</Text>

            {booking?.driver ? (
              <Card>
                <Text style={styles.driverName}>{booking.driver.name}</Text>
                <Text style={styles.meta}>
                  {booking.serviceLabel} · {new Date(booking.createdAt).toLocaleDateString()}
                </Text>
              </Card>
            ) : null}

            <Text style={styles.question}>How was your experience?</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={colors.primary}
                  />
                </Pressable>
              ))}
            </View>
            <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>

            <Text style={styles.section}>What did you like?</Text>
            <View style={styles.tags}>
              {TAGS.map((tag) => (
                <Pressable
                  key={tag}
                  style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]}
                  onPress={() => toggleTag(tag)}>
                  <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>
                    {tag}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.section}>Write your review (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Tell others about your experience..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={150}
              value={review}
              onChangeText={setReview}
            />
            <Text style={styles.counter}>{150 - review.length} characters remaining</Text>

            <PrimaryButton
              label={submitRating.isPending ? 'Submitting...' : 'Submit Review'}
              onPress={handleSubmit}
              disabled={submitRating.isPending || rating === 0}
            />
            <Pressable onPress={() => navigation.goBack()} style={styles.skip}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          </ScreenContent>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textDark,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  driverName: { fontWeight: typography.weights.bold, fontSize: typography.sizes.lg, color: colors.textDark },
  meta: { color: colors.textMuted, marginTop: spacing.xs },
  question: { textAlign: 'center', color: colors.textDark, marginVertical: spacing.lg, fontSize: typography.sizes.lg },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  ratingLabel: { textAlign: 'center', color: colors.primary, fontWeight: typography.weights.bold, marginVertical: spacing.md },
  section: { fontWeight: typography.weights.semibold, color: colors.textDark, marginBottom: spacing.sm, marginTop: spacing.lg },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tagText: { color: colors.textDark, fontSize: typography.sizes.sm },
  tagTextActive: { color: colors.textDark, fontWeight: typography.weights.semibold },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
    color: colors.textDark,
  },
  counter: { textAlign: 'right', color: colors.textMuted, fontSize: typography.sizes.sm, marginTop: spacing.xs },
  skip: { alignItems: 'center', marginTop: spacing.lg },
  skipText: { color: colors.textMuted },
});
