import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import UserPreferencesService from '../services/UserPreferencesService';
import OnboardingService from '../services/OnboardingService';
import { getCurrentUserIdRequired } from '../utils/userUtils';
import { useUser } from '../context/UserContext';
import { primaryColors, textColors, backgroundColors } from '../utils/colors';

type OnboardingQuizScreenProps = {
  navigation: StackNavigationProp<any>;
};

const OnboardingQuizScreen: React.FC<OnboardingQuizScreenProps> = ({ navigation }) => {
  const { userId } = useUser();

  const [saving, setSaving] = useState(false);

  const [q1, setQ1] = useState<'morning' | 'evening' | null>(null);
  const [q2, setQ2] = useState<'morning' | 'evening' | null>(null);
  const [q3, setQ3] = useState<'morning' | 'evening' | null>(null);

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const uid = userId ?? getCurrentUserIdRequired();
      const answers = [q1, q2, q3];
      const morningCount = answers.filter(a => a === 'morning').length;
      const eveningCount = answers.filter(a => a === 'evening').length;
      const timingPreference: 'morning' | 'evening' =
        eveningCount > morningCount ? 'evening' : 'morning';
      // Set morningComplexFactor and eveningComplexFactor based on answers
      const morningComplexFactor = morningCount / answers.length;
      const eveningComplexFactor = eveningCount / answers.length;
      await UserPreferencesService.updateUserPreferences(uid, {
        morningComplexFactor,
        eveningComplexFactor,
        taskTimingPreference: timingPreference,
      });
      await OnboardingService.setOnboardingCompleted(uid, true);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    } catch (error) {
      console.error('Error saving quiz results:', error);
      Alert.alert('Error', 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Text style={styles.title}>Tell us about your productivity</Text>

      <View style={styles.questionBlock}>
        <Text style={styles.questionText}>
          When do you usually tackle your most challenging tasks?
        </Text>
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={[styles.optionButton, q1 === 'morning' && styles.optionSelected]}
            onPress={() => setQ1('morning')}
          >
            <Text style={[styles.optionText, q1 === 'morning' && styles.optionSelectedText]}>Morning</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, q1 === 'evening' && styles.optionSelected]}
            onPress={() => setQ1('evening')}
          >
            <Text style={[styles.optionText, q1 === 'evening' && styles.optionSelectedText]}>Evening</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.questionBlock}>
        <Text style={styles.questionText}>
          When do you feel most focused for complex tasks?
        </Text>
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={[styles.optionButton, q2 === 'morning' && styles.optionSelected]}
            onPress={() => setQ2('morning')}
          >
            <Text style={[styles.optionText, q2 === 'morning' && styles.optionSelectedText]}>Morning</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, q2 === 'evening' && styles.optionSelected]}
            onPress={() => setQ2('evening')}
          >
            <Text style={[styles.optionText, q2 === 'evening' && styles.optionSelectedText]}>Evening</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.questionBlock}>
        <Text style={styles.questionText}>I prefer to handle difficult tasks:</Text>
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={[styles.optionButton, q3 === 'morning' && styles.optionSelected]}
            onPress={() => setQ3('morning')}
          >
            <Text style={[styles.optionText, q3 === 'morning' && styles.optionSelectedText]}>Morning</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, q3 === 'evening' && styles.optionSelected]}
            onPress={() => setQ3('evening')}
          >
            <Text style={[styles.optionText, q3 === 'evening' && styles.optionSelectedText]}>Evening</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={saving}
      >
        {saving ? (
          <Text style={styles.buttonText}>Saving...</Text>
        ) : (
          <View style={styles.buttonContent}>
            <Text style={styles.buttonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: backgroundColors.light,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: textColors.primary,
    marginBottom: 30,
    textAlign: 'center',
  },
  questionBlock: {
    marginBottom: 30,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '500',
    color: textColors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: primaryColors.primary,
  },
  optionSelected: {
    backgroundColor: primaryColors.primary,
  },
  optionText: {
    color: textColors.primary,
  },
  optionSelectedText: {
    color: '#fff',
  },
  button: {
    backgroundColor: primaryColors.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
});

export default OnboardingQuizScreen;
