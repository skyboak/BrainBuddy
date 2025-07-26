// src/components/NotificationManager.tsx

import React, { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { UserPreferences } from '../models/Task';
import NotificationService, { NotificationType } from '../services/NotificationService';
import UserPreferencesService from '../services/UserPreferencesService';
import { useUser } from '../context/UserContext';
import { StackNavigationProp } from '@react-navigation/stack';

// Define navigation types
type RootStackParamList = {
  Dashboard: undefined;
  FreeTimeInput: undefined;
  FocusSession: { scheduleId: string };
  TaskDetails: { taskId: string };
};

type AppNavigationProp = StackNavigationProp<RootStackParamList>;

/**
 * Component to handle notifications in the app globally
 * This component doesn't render anything but handles all notification logic
 */
const NotificationManager: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { userId } = useUser();
  
  // Set up notification handlers
  useEffect(() => {
    // Only set up on devices
    if (Platform.OS === 'web') return;

    // Set up handlers
    const notificationReceivedListener = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Notification received:', notification);
      }
    );

    const notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
      response => {
        handleNotificationInteraction(response);
      }
    );

    // Check if the app was opened from a notification
    const checkInitialNotification = async () => {
      const initialResponse = await Notifications.getLastNotificationResponseAsync();
      if (initialResponse) {
        console.log('Handling initial notification:', initialResponse);
        handleNotificationInteraction(initialResponse);
      }
    };

    // Initialize notification settings then handle any launch notification
    initializeNotifications().finally(() => {
      checkInitialNotification();
    });


    // Clean up listeners
    return () => {
      notificationReceivedListener.remove();
      notificationResponseListener.remove();
    };
  }, []);
  
  // Initialize notifications based on user preferences
  const initializeNotifications = async () => {
    try {
      if (Platform.OS === 'web') return;
      
      // Check permission status
      const { status } = await Notifications.getPermissionsAsync();
      
      if (status === 'granted') {
        // Load user preferences
        const prefs = await UserPreferencesService.getUserPreferences(userId || undefined);
        
        if (prefs && prefs.notificationsEnabled) {
          // Schedule all notifications based on preferences
          await NotificationService.scheduleAllReminders(prefs);
        }
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };
  
  // Handle when user interacts with a notification
  const handleNotificationInteraction = (response: Notifications.NotificationResponse) => {
    try {
      const data = response.notification.request.content.data;
      const notificationType = data.type as NotificationType;
      
      switch (notificationType) {
        case NotificationType.DAILY_SCHEDULE:
          // Morning notification - navigate to free time input for scheduling
          navigation.navigate('FreeTimeInput');
          break;
          
        case NotificationType.EVENING_SCHEDULE:
          // Evening notification - navigate to schedules or focus session
          if (data.scheduleId) {
            navigation.navigate('FocusSession', { scheduleId: data.scheduleId });
          } else {
            navigation.navigate('FreeTimeInput');
          }
          break;
          
        case NotificationType.TASK_REMINDER:
        case NotificationType.TASK_DUE:
          // Task notifications - navigate to task details
          if (data.taskId) {
            navigation.navigate('TaskDetails', { taskId: data.taskId });
          }
          break;
          
        case NotificationType.FOCUS_COMPLETE:
          // Focus complete notification - check if from a schedule or individual task
          if (data.scheduleId) {
            navigation.navigate('FocusSession', { scheduleId: data.scheduleId });
          } else if (data.taskId) {
            navigation.navigate('TaskDetails', { taskId: data.taskId });
          }
          break;
          
        default:
          // Default to dashboard
          navigation.navigate('Dashboard');
      }
    } catch (error) {
      console.error('Error handling notification interaction:', error);
      
      // Default fallback - navigate to dashboard
      navigation.navigate('Dashboard');
    }
  };
  
  // This component doesn't render anything
  return null;
};

export default NotificationManager;