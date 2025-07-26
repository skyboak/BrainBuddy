// src/components/VisualProgress.tsx

import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Easing,
  ViewStyle,
  TextStyle,
  StyleProp,
  DimensionValue
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { primaryColors, textColors } from '../utils/colors';

interface VisualProgressProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  height?: number;
  width?: number | `${number}%`;
  style?: StyleProp<ViewStyle>;
  progressColors?: readonly [string, string, ...string[]];
  backgroundColor?: string;
  labelStyle?: StyleProp<TextStyle>;
  percentageStyle?: StyleProp<TextStyle>;
  animate?: boolean;
  animationDuration?: number;
}

const VisualProgress: React.FC<VisualProgressProps> = ({
  progress,
  label,
  showPercentage = true,
  height = 12,
  width = '100%',
  style,
  progressColors = ['#4c669f', '#3b5998', '#192f6a'] as const,
  backgroundColor = '#F0F0F0',
  labelStyle,
  percentageStyle,
  animate = true,
  animationDuration = 500
}) => {
  // Validate progress (ensure it's between 0-100)
  const validProgress = Math.max(0, Math.min(100, progress));
  
  // Animation for progress
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Update animation when progress changes
  useEffect(() => {
    if (animate) {
      Animated.timing(progressAnim, {
        toValue: validProgress / 100,
        duration: animationDuration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(validProgress / 100);
    }
  }, [validProgress, animate, animationDuration]);
  
  // Format progress percentage
  const formattedPercentage = `${Math.round(validProgress)}%`;
  
  // Determine if this is a small progress bar (no text)
  const isSmall = height < 20;
  
  // Set border radius based on height for consistent look
  const radius = isSmall ? height / 2 : 8;
  
  // Make sure width is a valid DimensionValue (number or percentage string)
  const widthValue: DimensionValue = typeof width === 'string' ? width : width;
  
  return (
    <View style={[styles.container, style]}>
      {label && !isSmall && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, labelStyle]}>{label}</Text>
          {showPercentage && (
            <Text style={[styles.percentage, percentageStyle]}>
              {formattedPercentage}
            </Text>
          )}
        </View>
      )}
      
      <View 
        style={[
          styles.progressContainer, 
          { 
            height, 
            width: widthValue, 
            backgroundColor,
            borderRadius: radius
          }
        ]}
      >
        <Animated.View 
          style={{
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            }) as unknown as DimensionValue,
            height: '100%',
            borderRadius: radius,
            overflow: 'hidden'
          }}
        >
          <LinearGradient
            colors={progressColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          />
        </Animated.View>
        
        {!isSmall && showPercentage && !label && (
          <Text style={[
            styles.centerPercentage,
            { color: validProgress > 50 ? '#FFF' : textColors.primary }
          ]}>
            {formattedPercentage}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: textColors.primary,
  },
  percentage: {
    fontSize: 16,
    fontWeight: '600',
    color: primaryColors.primary,
  },
  progressContainer: {
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    flex: 1,
  },
  centerPercentage: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default VisualProgress;