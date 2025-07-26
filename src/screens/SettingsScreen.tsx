// src/screens/SettingsScreen.tsx - Updated with Integrated Notification Time Pickers

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { StackNavigationProp } from '@react-navigation/stack';
import AuthService from '../services/AuthService';
import NotificationService from '../services/NotificationService';
import UserPreferencesService from '../services/UserPreferencesService';
import TaskService from '../services/TaskService';
import OnboardingService from '../services/OnboardingService';
import { useUser } from '../context/UserContext';

// Define the manifest type structure to fix the TypeScript error
interface AppManifest {
  version?: string;
  [key: string]: any;
}

// Get the manifest with the right type
const manifest = Constants.manifest as AppManifest;

type SettingsScreenProps = {
  navigation: StackNavigationProp<any>;
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  // Get current user ID from context
  const { userId } = useUser();
  
  // State
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [morningReminderEnabled, setMorningReminderEnabled] = useState(true);
  const [eveningReminderEnabled, setEveningReminderEnabled] = useState(false);
  const [morningReminderTime, setMorningReminderTime] = useState('08:00');
  const [eveningReminderTime, setEveningReminderTime] = useState('18:00');
  
  // Time picker state
  const [showMorningTimePicker, setShowMorningTimePicker] = useState(false);
  const [showEveningTimePicker, setShowEveningTimePicker] = useState(false);
  
  // Get app version
  const appVersion = manifest?.version || '1.0.0';
  
  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Check notification permissions
        const { enabled } = await NotificationService.getNotificationStatus();
        setNotificationsEnabled(enabled);
        
        // Load user preferences
        const prefs = await UserPreferencesService.getUserPreferences(userId || undefined);
        if (prefs) {
          setNotificationsEnabled(prefs.notificationsEnabled && enabled);
          setMorningReminderEnabled(prefs.morningReminderEnabled);
          setEveningReminderEnabled(prefs.eveningReminderEnabled);
          setMorningReminderTime(prefs.scheduleReminderTime || '08:00');
          setEveningReminderTime(prefs.eveningReminderTime || '18:00');
        }
        
        // In a real app, you would load sound from AsyncStorage or similar
        // For simplicity, using default values
        setSoundEnabled(true);
        
        // Get user email
        const user = AuthService.getCurrentUser();
        if (user && user.email) {
          setUserEmail(user.email);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [userId]);
  
  // Toggle notifications
  const handleToggleNotifications = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      if (notificationsEnabled) {
        // If already enabled, show alert that they need to disable in system settings
        Alert.alert(
          'Disable Notifications',
          'To disable notifications, please use your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      } else {
        // Request permissions
        const token = await NotificationService.registerForPushNotifications();
        if (token) {
          setNotificationsEnabled(true);
          
          // Update user preferences
          const prefs = await UserPreferencesService.getUserPreferences(userId || undefined);
          if (prefs) {
            await UserPreferencesService.updateUserPreferences(userId || null, {
              notificationsEnabled: true
            });
          }
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
    }
  };
  
  // Toggle morning reminders
  const handleToggleMorningReminders = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      const newValue = !morningReminderEnabled;
      setMorningReminderEnabled(newValue);
      
      // Update user preferences
      await UserPreferencesService.updateUserPreferences(userId || null, {
        morningReminderEnabled: newValue
      });
    } catch (error) {
      console.error('Error toggling morning reminders:', error);
    }
  };
  
  // Toggle evening reminders
  const handleToggleEveningReminders = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      const newValue = !eveningReminderEnabled;
      setEveningReminderEnabled(newValue);
      
      // Update user preferences
      await UserPreferencesService.updateUserPreferences(userId || null, {
        eveningReminderEnabled: newValue
      });
    } catch (error) {
      console.error('Error toggling evening reminders:', error);
    }
  };
  
  // Handle morning time change
  const onMorningTimeChange = async (event: any, selectedTime?: Date) => {
    setShowMorningTimePicker(false);
    
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      setMorningReminderTime(timeString);
      
      // Update user preferences
      try {
        await UserPreferencesService.updateUserPreferences(userId || null, {
          scheduleReminderTime: timeString
        });
        
        // Haptic feedback
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch (error) {
        console.error('Error updating morning reminder time:', error);
      }
    }
  };
  
  // Handle evening time change
  const onEveningTimeChange = async (event: any, selectedTime?: Date) => {
    setShowEveningTimePicker(false);
    
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      setEveningReminderTime(timeString);
      
      // Update user preferences
      try {
        await UserPreferencesService.updateUserPreferences(userId || null, {
          eveningReminderTime: timeString
        });
        
        // Haptic feedback
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch (error) {
        console.error('Error updating evening reminder time:', error);
      }
    }
  };
  
  // Format time for display
  const formatTime = (timeString: string): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    
    return `${displayHour}:${minutes.padStart(2, '0')} ${period}`;
  };
  
  // Create Date object from time string for DateTimePicker
  const createDateFromTime = (timeString: string): Date => {
    if (!timeString) return new Date();
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return date;
  };
  
  // Toggle sound
  const handleToggleSound = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSoundEnabled(!soundEnabled);
    // In a real app, you would store this preference
  };
  
  
  // Navigate to change password screen
  const navigateToChangePassword = () => {
    navigation.navigate('ChangePassword');
  };
  
  // Navigate to notification debug
  const navigateToNotificationDebug = () => {
    navigation.navigate('NotificationDebug');
  };
  
  // Sign out
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.signOut();
              
              // Haptic feedback for success
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                  .catch(e => console.log(e));
              }
              
              // App.tsx will redirect to auth screen
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        },
      ]
    );
  };

  // Reset user data
  const handleResetUserData = async () => {
    Alert.alert(
      'Reset Data',
      'This will delete all tasks and preferences. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await TaskService.deleteAllUserTasks(userId || null);
              await UserPreferencesService.resetUserPreferences(userId || null);
              await OnboardingService.resetOnboarding(userId || null);
              Alert.alert('Data Reset', 'Your data was cleared.');
            } catch (err) {
              console.error('Error resetting data:', err);
              Alert.alert('Error', 'Could not reset data.');
            }
          },
        },
      ]
    );
  };
  
  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={22} color="#007AFF" />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#C7C7CC', true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          {notificationsEnabled && (
            <>
              <View style={styles.notificationSubItem}>
                <View style={styles.settingInfo}>
                  <Ionicons name="sunny-outline" size={20} color="#007AFF" />
                  <Text style={styles.notificationSubText}>Morning Reminder</Text>
                </View>
                <Switch
                  value={morningReminderEnabled}
                  onValueChange={handleToggleMorningReminders}
                  trackColor={{ false: '#C7C7CC', true: '#34C759' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              
              {morningReminderEnabled && (
                <TouchableOpacity
                  style={styles.timePickerItem}
                  onPress={() => setShowMorningTimePicker(true)}
                >
                  <View style={styles.timePickerContent}>
                    <Ionicons name="time-outline" size={18} color="#007AFF" />
                    <Text style={styles.timePickerLabel}>Morning Time</Text>
                  </View>
                  <Text style={styles.timePickerValue}>
                    {formatTime(morningReminderTime)}
                  </Text>
                </TouchableOpacity>
              )}
              
              <View style={styles.notificationSubItem}>
                <View style={styles.settingInfo}>
                  <Ionicons name="moon-outline" size={20} color="#007AFF" />
                  <Text style={styles.notificationSubText}>Evening Reminder</Text>
                </View>
                <Switch
                  value={eveningReminderEnabled}
                  onValueChange={handleToggleEveningReminders}
                  trackColor={{ false: '#C7C7CC', true: '#34C759' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              
              {eveningReminderEnabled && (
                <TouchableOpacity
                  style={styles.timePickerItem}
                  onPress={() => setShowEveningTimePicker(true)}
                >
                  <View style={styles.timePickerContent}>
                    <Ionicons name="time-outline" size={18} color="#007AFF" />
                    <Text style={styles.timePickerLabel}>Evening Time</Text>
                  </View>
                  <Text style={styles.timePickerValue}>
                    {formatTime(eveningReminderTime)}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="volume-medium-outline" size={22} color="#007AFF" />
              <Text style={styles.settingText}>Sound Effects</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={handleToggleSound}
              trackColor={{ false: '#C7C7CC', true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {userEmail && (
            <View style={styles.accountInfoItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="mail-outline" size={22} color="#007AFF" />
                <View>
                  <Text style={styles.accountLabel}>Email Address</Text>
                  <Text style={styles.accountValue}>{userEmail}</Text>
                </View>
              </View>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={navigateToChangePassword}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="lock-closed-outline" size={22} color="#007AFF" />
              <Text style={styles.settingText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleSignOut}>
            <View style={styles.settingInfo}>
              <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
              <Text style={[styles.settingText, { color: '#FF3B30' }]}>
                Sign Out
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleResetUserData}>
            <View style={styles.settingInfo}>
              <Ionicons name="refresh-outline" size={22} color="#FF3B30" />
              <Text style={[styles.settingText, { color: '#FF3B30' }]}>Reset User Data</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>BrainBuddy v{appVersion}</Text>
        </View>
      </ScrollView>
      
      {/* Time Pickers */}
      {showMorningTimePicker && (
        <DateTimePicker
          value={createDateFromTime(morningReminderTime)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onMorningTimeChange}
        />
      )}
      
      {showEveningTimePicker && (
        <DateTimePicker
          value={createDateFromTime(eveningReminderTime)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onEveningTimeChange}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    marginHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8A8E',
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 15,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  notificationSubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingLeft: 40, // Indented
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    backgroundColor: '#F9FAFC',
  },
  notificationSubText: {
    fontSize: 15,
    marginLeft: 10,
    color: '#555',
  },
  timePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    paddingLeft: 50, // Further indented
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    backgroundColor: '#F5F5F5',
  },
  timePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  timePickerValue: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  accountInfoItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 17,
    marginLeft: 15,
    color: '#333',
  },
  accountLabel: {
    fontSize: 15,
    marginLeft: 15,
    color: '#8A8A8E',
  },
  accountValue: {
    fontSize: 17,
    marginLeft: 15,
    color: '#333',
    marginTop: 2,
  },
  versionContainer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
    marginBottom: 30,
  },
  versionText: {
    fontSize: 14,
    color: '#8A8A8E',
  },
});

export default SettingsScreen;