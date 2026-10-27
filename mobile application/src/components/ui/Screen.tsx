import { PartnerText } from '../partner/PartnerText';
import React, { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radius, shadows, spacing, typography } from '../../theme';

interface ScreenProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
}

export default function Screen({
  children,
  style,
  backgroundColor = colors.background,
}: ScreenProps) {
  return (
    <View style={[styles.screen, { backgroundColor }, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});

interface ScreenContentProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenContent({ children, style }: ScreenContentProps) {
  return (
    <View style={[screenContentStyles.content, style]}>{children}</View>
  );
}

const screenContentStyles = StyleSheet.create({
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxxl,
  },
});

interface SectionTitleProps {
  title: string;
  highlight?: string;
  subtitle?: string;
}

export function SectionTitle({ title, highlight, subtitle }: SectionTitleProps) {
  return (
    <View style={sectionStyles.wrap}>
      <PartnerText style={sectionStyles.title}>
        {highlight ? (
          <>
            {title}
            <PartnerText style={sectionStyles.highlight}> {highlight}</PartnerText>
          </>
        ) : (
          title
        )}
      </PartnerText>
      {subtitle ? <PartnerText style={sectionStyles.subtitle}>{subtitle}</PartnerText> : null}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.extrabold,
    color: colors.textDark,
    textTransform: 'capitalize',
  },
  highlight: {
    color: colors.primary,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.md,
    color: colors.text,
    lineHeight: typography.lineHeights.normal,
  },
});

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
}

export function Card({ children, style, dark = false }: CardProps) {
  return (
    <View
      style={[
        cardStyles.card,
        dark ? cardStyles.dark : cardStyles.light,
        style,
      ]}>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  light: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  dark: {
    backgroundColor: colors.dark,
  },
});
