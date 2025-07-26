// src/utils/accessibility.ts
// Utilities for ADHD-friendly accessibility features

import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Base size scale factor
const scale = SCREEN_WIDTH / 375; // Based on iPhone X width as baseline

/**
 * Normalize font size based on screen size
 * @param size The base font size to normalize
 * @returns The normalized font size
 */
export function normalize(size: number): number {
  const newSize = size * scale;
  
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } 
  
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
}

/**
 * Font sizes for different UI elements, normalized for screen size
 */
export const fontSize = {
  tiny: normalize(10),
  small: normalize(12),
  medium: normalize(14),
  default: normalize(16),
  large: normalize(18),
  xlarge: normalize(20),
  xxlarge: normalize(24),
  xxxlarge: normalize(28),
  huge: normalize(32),
};

/**
 * Font weights for different emphases
 */
export const fontWeight = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

/**
 * Spacing values for consistent layout
 */
export const spacing = {
  tiny: 4,
  small: 8,
  medium: 12,
  default: 16,
  large: 20,
  xlarge: 24,
  xxlarge: 32,
  xxxlarge: 40,
  huge: 48,
};

/**
 * Border radius values for consistent UI elements
 */
export const borderRadius = {
  small: 4,
  medium: 8,
  default: 12,
  large: 16,
  xlarge: 24,
  round: 1000, // For circular elements
};

/**
 * Shadow styles for different elevation levels
 */
export const shadow = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
};

/**
 * ADHD-friendly text styles with optimal line height and spacing
 */
export const textStyle = {
  header: {
    fontSize: fontSize.xxxlarge,
    fontWeight: fontWeight.bold,
    lineHeight: Math.round(fontSize.xxxlarge * 1.3), // 30% more than font size
    letterSpacing: 0.3, // Slight letter spacing for better readability
  },
  subheader: {
    fontSize: fontSize.xxlarge,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.xxlarge * 1.3),
    letterSpacing: 0.2,
  },
  title: {
    fontSize: fontSize.xlarge,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.xlarge * 1.3),
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: fontSize.large,
    fontWeight: fontWeight.medium,
    lineHeight: Math.round(fontSize.large * 1.3),
  },
  body: {
    fontSize: fontSize.default,
    fontWeight: fontWeight.regular,
    lineHeight: Math.round(fontSize.default * 1.5), // Increased line height for better readability
  },
  bodySmall: {
    fontSize: fontSize.medium,
    fontWeight: fontWeight.regular,
    lineHeight: Math.round(fontSize.medium * 1.5),
  },
  caption: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.regular,
    lineHeight: Math.round(fontSize.small * 1.4),
  },
};

/**
 * Helper to make text more ADHD-friendly by ensuring proper spacing and contrast
 * @param color The text color
 * @param backgroundColor The background color the text will appear against
 * @returns An object with optimal text properties
 */
export function getAccessibleTextStyle(color: string, backgroundColor: string) {
  return {
    color,
    letterSpacing: 0.2, // Slight letter spacing improves readability
    textShadowColor: backgroundColor,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1, // Subtle text shadow to improve contrast
  };
}

/**
 * Animations duration constants
 * ADHD users benefit from slightly quicker animations to maintain attention
 */
export const animationDuration = {
  veryFast: 150,
  fast: 250,
  normal: 350,
  slow: 500,
};

/**
 * Touch target sizes for better motor control
 * ADHD users often benefit from slightly larger touch targets
 */
export const touchTarget = {
  small: 44, // Minimum size for comfortable tapping
  medium: 52,
  large: 60,
};