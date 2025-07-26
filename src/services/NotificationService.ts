// src/services/NotificationService.ts

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Task, ScheduledTask, UserPreferences, DateType } from '../models/Task';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export enum NotificationType {
  TASK_DUE = 'task-due',
  TASK_REMINDER = 'task-reminder',
  FOCUS_COMPLETE = 'focus-complete',
  DAILY_SCHEDULE = 'daily-schedule',
  TASK_COMPLETED = 'task-completed',
  EVENING_SCHEDULE = 'evening-schedule',
}

interface NotificationData {
  type: NotificationType;
  taskId?: string;
  scheduleId?: string;
  title: string;
  body: string;
  data?: object;
}

export class NotificationService {
  /**
   * Register for notification permissions
   */
  async registerForPushNotifications(): Promise<string | undefined> {
    if (!Constants.isDevice) {
      console.warn('Notifications are only supported on physical devices');
      return;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get notification permissions');
      return;
    }

    // Get push token (for FCM if we add that later)
    try {
      // Try to read projectId from app config; if unavailable, let Expo handle it
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ||
                       Constants.manifest2?.extra?.eas?.projectId;

      const token = projectId
        ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
        : (await Notifications.getExpoPushTokenAsync()).data;

      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      // Return undefined instead of throwing to allow the app to continue
      return undefined;
    }
  }

  /**
   * Schedule a task reminder notification
   */
  async scheduleTaskReminder(task: Task, minutesBefore: number = 15): Promise<string> {
    // Calculate notification time
    const deadlineDate = this.getDateFromDateType(task.deadline);
    if (!deadlineDate) return '';
    
    const notificationTime = new Date(deadlineDate.getTime() - minutesBefore * 60 * 1000);
    
    // Skip if notification time is in the past
    if (notificationTime <= new Date()) {
      return '';
    }

    return this.scheduleNotification({
      type: NotificationType.TASK_REMINDER,
      taskId: task.id,
      title: `Reminder: ${task.title}`,
      body: `Due in ${minutesBefore} minutes`,
      data: { taskId: task.id }
    }, notificationTime);
  }

  /**
   * Schedule a task due notification
   */
  async scheduleTaskDueNotification(task: Task): Promise<string> {
    // Get proper Date from task deadline
    const deadlineDate = this.getDateFromDateType(task.deadline);
    if (!deadlineDate) return '';
    
    // Skip if deadline is in the past
    if (deadlineDate <= new Date()) {
      return '';
    }

    return this.scheduleNotification({
      type: NotificationType.TASK_DUE,
      taskId: task.id,
      title: `Due Now: ${task.title}`,
      body: `Your task is now due`,
      data: { taskId: task.id }
    }, deadlineDate);
  }

  /**
   * Schedule a focus session completion notification
   */
  async scheduleFocusCompleteNotification(
    task: Task,
    durationMinutes: number
  ): Promise<string> {
    const completionTime = new Date(new Date().getTime() + durationMinutes * 60 * 1000);

    return this.scheduleNotification({
      type: NotificationType.FOCUS_COMPLETE,
      taskId: task.id,
      title: `Focus Time Complete`,
      body: `Did you finish working on "${task.title}"?`,
      data: { taskId: task.id, focusSession: true }
    }, completionTime);
  }

  /**
   * Schedule a morning schedule reminder notification
   */
  async scheduleMorningReminderNotification(scheduleTime: Date): Promise<string> {
    return this.scheduleNotification({
      type: NotificationType.DAILY_SCHEDULE,
      title: 'Start Your Day With Focus',
      body: 'Time to plan your day! Tap to see today\'s schedule options.',
      data: { scheduleReminder: true, morningReminder: true }
    }, scheduleTime);
  }

  /**
   * Schedule evening schedule reminder notification
   */
  async scheduleEveningReminderNotification(scheduleTime: Date): Promise<string> {
    return this.scheduleNotification({
      type: NotificationType.EVENING_SCHEDULE,
      title: 'Evening Focus Session',
      body: 'Ready for an evening productivity boost? Tap to start a focus session.',
      data: { scheduleReminder: true, eveningReminder: true }
    }, scheduleTime);
  }

  /**
   * Schedule both morning and evening notifications based on user preferences
   * @param userPrefs User preferences containing notification settings
   */
  async scheduleAllReminders(userPrefs: UserPreferences): Promise<void> {
    // Cancel existing notifications first to avoid duplicates
    await this.cancelAllScheduledNotifications();
    
    // If notifications are disabled globally, don't schedule any
    if (!userPrefs.notificationsEnabled) {
      return;
    }
    
    try {
      // Schedule morning notification if enabled
      if (userPrefs.morningReminderEnabled) {
        const timeString = userPrefs.scheduleReminderTime || '08:00';
        const [morningHours, morningMinutes] = timeString.split(':').map(Number);
        let morningTime = new Date();
        morningTime.setHours(morningHours, morningMinutes, 0, 0);
        
        // If time has already passed today, schedule for tomorrow
        if (morningTime.getTime() < Date.now()) {
          morningTime.setDate(morningTime.getDate() + 1);
        }
        
        await this.scheduleMorningReminderNotification(morningTime);
        console.log('Morning notification scheduled for', morningTime);
      }
      
      // Schedule evening notification if enabled
      if (userPrefs.eveningReminderEnabled) {
        const timeString = userPrefs.eveningReminderTime || '18:00';
        const [eveningHours, eveningMinutes] = timeString.split(':').map(Number);
        let eveningTime = new Date();
        eveningTime.setHours(eveningHours, eveningMinutes, 0, 0);
        
        // If time has already passed today, schedule for tomorrow
        if (eveningTime.getTime() < Date.now()) {
          eveningTime.setDate(eveningTime.getDate() + 1);
        }
        
        await this.scheduleEveningReminderNotification(eveningTime);
        console.log('Evening notification scheduled for', eveningTime);
      }
    } catch (error) {
      console.error('Error scheduling reminders:', error);
    }
  }

  /**
   * Send a task completion congratulations
   */
  async sendTaskCompletedNotification(task: Task): Promise<string> {
    return this.sendNotification({
      type: NotificationType.TASK_COMPLETED,
      taskId: task.id,
      title: 'Task Completed',
      body: `Great job finishing "${task.title}"!`,
      data: { taskId: task.id }
    });
  }

  /**
   * Schedule multiple notifications for a day's tasks
   */
  async scheduleNotificationsForTasks(tasks: ScheduledTask[]): Promise<void> {
    // Cancel existing notifications first to avoid duplicates
    await this.cancelAllScheduledNotifications();

    // Schedule new notifications for each task
    for (const scheduledTask of tasks) {
      // Convert to Date object
      const startTimeDate = this.getDateFromDateType(scheduledTask.startTime);
      if (!startTimeDate) continue;
      
      // Calculate time 5 minutes before start
      const notificationTime = new Date(startTimeDate.getTime() - 5 * 60 * 1000);
      
      // Skip if notification time is in the past
      if (notificationTime <= new Date()) {
        continue;
      }
      
      await this.scheduleNotification({
        type: NotificationType.TASK_REMINDER,
        taskId: scheduledTask.taskId,
        title: 'Task Starting Soon',
        body: 'Your next scheduled task will start in 5 minutes',
        data: { taskId: scheduledTask.taskId }
      }, notificationTime);
    }
  }

  /**
   * Get all pending notifications
   */
  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllScheduledNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Helper method to schedule a notification
   */
  private async scheduleNotification(
    notification: NotificationData,
    scheduledTime: Date
  ): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: {
            ...notification.data,
            type: notification.type,
            taskId: notification.taskId,
            scheduleId: notification.scheduleId
          },
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: scheduledTime 
        },
      });
      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return '';
    }
  }

  /**
   * Helper method to send an immediate notification
   */
  private async sendNotification(notification: NotificationData): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: {
            ...notification.data,
            type: notification.type,
            taskId: notification.taskId,
            scheduleId: notification.scheduleId
          },
        },
        trigger: null, // Send immediately
      });
      return identifier;
    } catch (error) {
      console.error('Error sending notification:', error);
      return '';
    }
  }

  /**
   * Set up a notification handler for incoming notifications
   */
  setupNotificationHandler(callback: (notification: Notifications.Notification) => void): () => void {
    const subscription = Notifications.addNotificationReceivedListener(callback);
    
    // Return unsubscribe function for cleanup
    return () => subscription.remove();
  }

  /**
   * Set up a response handler for when users tap on notifications
   */
  setupNotificationResponseHandler(
    callback: (response: Notifications.NotificationResponse) => void
  ): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener(callback);
    
    // Return unsubscribe function for cleanup
    return () => subscription.remove();
  }

  /**
   * Check notification status
   */
  async getNotificationStatus(): Promise<{enabled: boolean, status: Notifications.PermissionStatus}> {
    const { status } = await Notifications.getPermissionsAsync();
    return {
      enabled: status === 'granted',
      status: status
    };
  }
/**
 * Cancel all notifications related to a specific task
 * @param taskId The ID of the task
 */
  async cancelNotificationsForTask(taskId: string): Promise<void> {
    try {
      // Get all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Find and cancel notifications for this task
      for (const notification of scheduledNotifications) {
        const data = notification.content.data;
        if (data && data.taskId === taskId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
    } catch (error) {
      console.error('Error cancelling task notifications:', error);
    }
  }
  /**
   * Helper method to get Date from DateType
   * Safely converts any DateType (Date, Timestamp, FieldValue) to a JavaScript Date
   */
  private getDateFromDateType(dateType: DateType): Date | null {
    if (dateType === null || dateType === undefined) {
      return null;
    }
    
    // If it's already a Date, return it
    if (dateType instanceof Date) {
      return dateType;
    }
    
    // If it's a Timestamp, convert to Date
    if (dateType && typeof dateType === 'object' && 'toDate' in dateType && typeof dateType.toDate === 'function') {
      return dateType.toDate();
    }
    
    // If it's serverTimestamp or another FieldValue, return current date
    if (dateType && typeof dateType === 'object' && 'isEqual' in dateType && typeof dateType.isEqual === 'function') {
      return new Date();
    }
    
    // If it's something else, try to convert or return null
    try {
      return new Date(dateType as any);
    } catch (e) {
      console.warn('Could not convert to Date:', dateType);
      return null;
    }
  }
}

export default new NotificationService();