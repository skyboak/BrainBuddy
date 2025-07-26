// src/screens/NotificationDebugScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import NotificationService from '../services/NotificationService';
import UserPreferencesService from '../services/UserPreferencesService';
import { useUser } from '../context/UserContext';
import { backgroundColors, textColors, primaryColors } from '../utils/colors';

interface NotificationDebugScreenProps {
  navigation: any;
}

const NotificationDebugScreen: React.FC<NotificationDebugScreenProps> = ({ navigation }) => {
  const { userId } = useUser();
  
  // State
  const [loading, setLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState({
    isDevice: false,
    deviceName: '',
    deviceType: '',
    osName: '',
    osVersion: '',
  });
  const [permissionStatus, setPermissionStatus] = useState('');
  const [pushToken, setPushToken] = useState('');
  const [scheduledNotifications, setScheduledNotifications] = useState<Notifications.NotificationRequest[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<any[]>([]);
  const [userPrefs, setUserPrefs] = useState<any>(null);
  
  // Load initial data
  useEffect(() => {
    loadDebugInfo();
    setupNotificationListeners();
  }, []);
  
  // Load debug information
  const loadDebugInfo = async () => {
    try {
      setLoading(true);
      
      // Get device info
      const deviceData = {
        isDevice: Device.isDevice || false,
        deviceName: Device.deviceName || 'Unknown',
        deviceType: getDeviceType(Device.deviceType),
        osName: Device.osName || Platform.OS,
        osVersion: Device.osVersion || 'Unknown',
      };
      setDeviceInfo(deviceData);
      
      // Get permission status
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
      
      // Get push token if available
      if (Device.isDevice) {
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: '6b6deef0-bd1a-47e0-a8a7-58aff7a17f8a', // Add your project ID here
          });
          setPushToken(tokenData.data);
        } catch (error) {
          console.error('Error getting push token:', error);
          setPushToken('Failed to get token: ' + error.message);
        }
      } else {
        setPushToken('Not available on simulator');
      }
      
      // Get scheduled notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      setScheduledNotifications(scheduled);
      
      // Get user preferences
      const prefs = await UserPreferencesService.getUserPreferences(userId);
      setUserPrefs(prefs);
      
    } catch (error) {
      console.error('Error loading debug info:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Get device type string
  const getDeviceType = (type) => {
    if (!Device.DeviceType) {
      return 'Unknown';
    }
    
    switch (type) {
      case Device.DeviceType.PHONE:
        return 'Phone';
      case Device.DeviceType.TABLET:
        return 'Tablet';
      case Device.DeviceType.DESKTOP:
        return 'Desktop';
      case Device.DeviceType.TV:
        return 'TV';
      default:
        return 'Unknown';
    }
  };
  
  // Setup notification listeners
  const setupNotificationListeners = () => {
    // Listen for incoming notifications
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      setNotificationHistory(prev => [{
        id: notification.request.identifier,
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
        timestamp: new Date(),
        type: 'received'
      }, ...prev.slice(0, 9)]); // Keep last 10
    });
    
    // Listen for notification interactions
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      setNotificationHistory(prev => [{
        id: response.notification.request.identifier,
        title: response.notification.request.content.title,
        body: response.notification.request.content.body,
        data: response.notification.request.content.data,
        timestamp: new Date(),
        type: 'tapped'
      }, ...prev.slice(0, 9)]); // Keep last 10
    });
    
    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  };
  
  // Request notification permissions
  const requestPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      
      if (status === 'granted') {
        // Try to get push token with explicit projectId
        if (Device.isDevice) {
          try {
            const tokenData = await Notifications.getExpoPushTokenAsync({
              projectId: '6b6deef0-bd1a-47e0-a8a7-58aff7a17f8a', // Add your project ID here
            });
            setPushToken(tokenData.data);
          } catch (error) {
            console.error('Error getting push token after permission granted:', error);
            setPushToken('Failed to get token: ' + error.message);
          }
        }
        
        Alert.alert('Success', 'Notification permissions granted!');
      } else {
        Alert.alert('Permission Denied', 'You need to enable notifications in your device settings.');
      }
      
      await loadDebugInfo();
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions: ' + error.message);
    }
  };
  
  // Send test notification (immediate)
  const sendTestNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'This is a test notification from BrainBuddy!',
          data: { test: true, timestamp: new Date().toISOString() },
        },
        trigger: null, // Send immediately
      });
      
      Alert.alert('Success', 'Test notification sent!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send notification: ' + error.message);
    }
  };
  
  // Schedule test notification (delayed)
  const scheduleTestNotification = async () => {
    try {
      const triggerDate = new Date(Date.now() + 10 * 1000); // 10 seconds from now
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Scheduled Test',
          body: 'This notification was scheduled 10 seconds ago!',
          data: { test: true, scheduled: true },
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate 
        },
      });
      
      Alert.alert('Success', 'Notification scheduled for 10 seconds from now!');
      
      // Reload scheduled notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      setScheduledNotifications(scheduled);
    } catch (error) {
      console.error('Error scheduling notification:', error);
      Alert.alert('Error', 'Failed to schedule notification: ' + error.message);
    }
  };
  
  // Cancel all notifications
  const cancelAllNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setScheduledNotifications([]);
      Alert.alert('Success', 'All scheduled notifications cancelled!');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
      Alert.alert('Error', 'Failed to cancel notifications: ' + error.message);
    }
  };
  
  // Test morning reminder
  const testMorningReminder = async () => {
    try {
      const notificationTime = new Date(Date.now() + 5 * 1000); // 5 seconds from now
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Start Your Day With Focus',
          body: 'Time to plan your day! Tap to see today\'s schedule options.',
          data: { type: 'DAILY_SCHEDULE', test: true },
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notificationTime 
        },
      });
      
      Alert.alert('Success', 'Morning reminder will appear in 5 seconds!');
      
      // Reload
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      setScheduledNotifications(scheduled);
    } catch (error) {
      console.error('Error testing morning reminder:', error);
      Alert.alert('Error', 'Failed to test morning reminder: ' + error.message);
    }
  };
  
  // Test task reminder
  const testTaskReminder = async () => {
    try {
      const notificationTime = new Date(Date.now() + 5 * 1000); // 5 seconds from now
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Task Starting Soon: Test Task',
          body: 'Your task will start in 5 minutes',
          data: { type: 'TASK_REMINDER', taskId: 'test-123', test: true },
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notificationTime 
        },
      });
      
      Alert.alert('Success', 'Task reminder will appear in 5 seconds!');
      
      // Reload
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      setScheduledNotifications(scheduled);
    } catch (error) {
      console.error('Error testing task reminder:', error);
      Alert.alert('Error', 'Failed to test task reminder: ' + error.message);
    }
  };
  
  // Format date/time
  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'MMM d, h:mm:ss a');
    } catch {
      return 'Invalid date';
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColors.primary} />
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Device Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Is Physical Device:</Text>
            <View style={[styles.badge, deviceInfo.isDevice ? styles.successBadge : styles.warningBadge]}>
              <Text style={styles.badgeText}>{deviceInfo.isDevice ? 'Yes' : 'No (Simulator)'}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Device Name:</Text>
            <Text style={styles.value}>{deviceInfo.deviceName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Device Type:</Text>
            <Text style={styles.value}>{deviceInfo.deviceType}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>OS:</Text>
            <Text style={styles.value}>{deviceInfo.osName} {deviceInfo.osVersion}</Text>
          </View>
          
          {!deviceInfo.isDevice && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#FF9500" />
              <Text style={styles.warningText}>
                Push notifications only work on physical devices, not simulators!
              </Text>
            </View>
          )}
        </View>
        
        {/* Permission Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Permissions</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Permission Status:</Text>
            <View style={[styles.badge, permissionStatus === 'granted' ? styles.successBadge : styles.errorBadge]}>
              <Text style={styles.badgeText}>{permissionStatus}</Text>
            </View>
          </View>
          
          {pushToken && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Push Token:</Text>
              <Text style={styles.tokenText} numberOfLines={2}>{pushToken}</Text>
            </View>
          )}
          
          {permissionStatus !== 'granted' && (
            <TouchableOpacity style={styles.button} onPress={requestPermissions}>
              <Text style={styles.buttonText}>Request Permissions</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* User Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Settings</Text>
          
          {userPrefs && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Notifications Enabled:</Text>
                <View style={[styles.badge, userPrefs.notificationsEnabled ? styles.successBadge : styles.errorBadge]}>
                  <Text style={styles.badgeText}>{userPrefs.notificationsEnabled ? 'Yes' : 'No'}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.label}>Morning Reminder:</Text>
                <Text style={styles.value}>
                  {userPrefs.morningReminderEnabled ? `Enabled at ${userPrefs.scheduleReminderTime}` : 'Disabled'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.label}>Evening Reminder:</Text>
                <Text style={styles.value}>
                  {userPrefs.eveningReminderEnabled ? `Enabled at ${userPrefs.eveningReminderTime}` : 'Disabled'}
                </Text>
              </View>
            </>
          )}
        </View>
        
        {/* Test Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Notifications</Text>
          
          <TouchableOpacity style={styles.button} onPress={sendTestNotification}>
            <Text style={styles.buttonText}>Send Test Notification (Immediate)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={scheduleTestNotification}>
            <Text style={styles.buttonText}>Schedule Test (10 seconds)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testMorningReminder}>
            <Text style={styles.buttonText}>Test Morning Reminder (5 seconds)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testTaskReminder}>
            <Text style={styles.buttonText}>Test Task Reminder (5 seconds)</Text>
          </TouchableOpacity>
        </View>
        
        {/* Scheduled Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Scheduled Notifications ({scheduledNotifications.length})
            </Text>
            {scheduledNotifications.length > 0 && (
              <TouchableOpacity onPress={cancelAllNotifications}>
                <Text style={styles.clearButton}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {scheduledNotifications.length === 0 ? (
            <Text style={styles.emptyText}>No scheduled notifications</Text>
          ) : (
            scheduledNotifications.map((notif, index) => (
              <View key={index} style={styles.notificationItem}>
                <Text style={styles.notifTitle}>{notif.content.title}</Text>
                <Text style={styles.notifBody}>{notif.content.body}</Text>
                {notif.trigger && (notif.trigger as any).date && (
                  <Text style={styles.notifTime}>
                    Scheduled for: {formatDateTime((notif.trigger as any).date)}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
        
        {/* Notification History Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Recent Notifications ({notificationHistory.length})
          </Text>
          
          {notificationHistory.length === 0 ? (
            <Text style={styles.emptyText}>No notifications received yet</Text>
          ) : (
            notificationHistory.map((notif, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  <View style={[styles.badge, notif.type === 'tapped' ? styles.primaryBadge : styles.neutralBadge]}>
                    <Text style={styles.badgeText}>{notif.type}</Text>
                  </View>
                </View>
                <Text style={styles.notifBody}>{notif.body}</Text>
                <Text style={styles.notifTime}>{formatDateTime(notif.timestamp)}</Text>
                {notif.data && Object.keys(notif.data).length > 0 && (
                  <Text style={styles.notifData}>Data: {JSON.stringify(notif.data, null, 2)}</Text>
                )}
              </View>
            ))
          )}
        </View>
        
        {/* Refresh Button */}
        <TouchableOpacity style={styles.refreshButton} onPress={loadDebugInfo}>
          <Ionicons name="refresh" size={20} color="#FFF" />
          <Text style={styles.refreshButtonText}>Refresh Debug Info</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: backgroundColors.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: backgroundColors.lighter,
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: textColors.primary,
    marginBottom: 10,
  },
  clearButton: {
    color: primaryColors.danger,
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
    flexWrap: 'wrap',
  },
  label: {
    fontSize: 14,
    color: textColors.secondary,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: textColors.primary,
    flex: 1,
    textAlign: 'right',
  },
  tokenText: {
    fontSize: 12,
    color: textColors.tertiary,
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  successBadge: {
    backgroundColor: '#D4EDDA',
  },
  errorBadge: {
    backgroundColor: '#F8D7DA',
  },
  warningBadge: {
    backgroundColor: '#FFF3CD',
  },
  primaryBadge: {
    backgroundColor: '#CCE5FF',
  },
  neutralBadge: {
    backgroundColor: '#E2E3E5',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
  },
  button: {
    backgroundColor: primaryColors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  notificationItem: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 6,
    marginVertical: 5,
  },
  historyItem: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 6,
    marginVertical: 5,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: textColors.primary,
    flex: 1,
  },
  notifBody: {
    fontSize: 13,
    color: textColors.secondary,
    marginTop: 2,
  },
  notifTime: {
    fontSize: 12,
    color: textColors.tertiary,
    marginTop: 5,
  },
  notifData: {
    fontSize: 11,
    color: textColors.tertiary,
    marginTop: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyText: {
    fontSize: 14,
    color: textColors.tertiary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: primaryColors.secondary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 15,
    marginBottom: 30,
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default NotificationDebugScreen;