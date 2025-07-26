// src/screens/FreeTimeInputScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { backgroundColors, textColors, primaryColors } from '../utils/colors';
import { StackNavigationProp } from '@react-navigation/stack';

type FreeTimeInputScreenProps = {
  navigation: StackNavigationProp<any>;
};

const FreeTimeInputScreen: React.FC<FreeTimeInputScreenProps> = ({ navigation }) => {
  const [freeTimeMinutes, setFreeTimeMinutes] = useState(60); // Default: 1 hour

  // Format minutes to hours and minutes
  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins} minutes`;
    } else if (mins === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours > 1 ? 's' : ''} ${mins} min`;
    }
  };

  // Handle continue button press
  const handleContinue = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        .catch(error => console.warn('Haptics error:', error));
    }
    
    // Navigate to schedule selection screen with free time parameter
    navigation.navigate('Schedules', { freeTimeMinutes });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Time</Text>
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.question}>How much time do you have available?</Text>
        <Text style={styles.subtitle}>
          We'll generate the best schedule options based on your available time.
        </Text>
        
        <View style={styles.timeDisplay}>
          <Ionicons name="time-outline" size={30} color={primaryColors.primary} />
          <Text style={styles.timeValue}>{formatMinutes(freeTimeMinutes)}</Text>
        </View>
        
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={15}
            maximumValue={240}
            step={15}
            value={freeTimeMinutes}
            onValueChange={(value) => {
              setFreeTimeMinutes(value);
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  .catch(error => console.warn('Haptics error:', error));
              }
            }}
            minimumTrackTintColor={primaryColors.primary}
            maximumTrackTintColor="#D1D1D6"
            thumbTintColor={primaryColors.primary}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>15 min</Text>
            <Text style={styles.sliderLabel}>4 hours</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Generate Schedule Options</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: backgroundColors.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 15,
  },
  backButton: {
    padding: 5,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  question: {
    fontSize: 24,
    fontWeight: 'bold',
    color: textColors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: textColors.tertiary,
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 22,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  timeValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: primaryColors.primary,
    marginLeft: 10,
  },
  sliderContainer: {
    marginBottom: 40,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  sliderLabel: {
    fontSize: 14,
    color: textColors.tertiary,
  },
  continueButton: {
    flexDirection: 'row',
    backgroundColor: primaryColors.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
});

export default FreeTimeInputScreen;