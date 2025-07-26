// src/services/UserPreferencesService.ts

import { UserPreferences } from '../models/Task';
import { firestore } from '../config/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getCurrentUserIdRequired } from '../utils/userUtils';
import NotificationService from './NotificationService';

class UserPreferencesService {
  /**
   * Get user preferences
   * @param userId User ID (optional, will use current user if null)
   * @returns User preferences object or null if not found
   */
  async getUserPreferences(userId?: string): Promise<UserPreferences | null> {
    try {
      // If userId is not provided, get the current authenticated user's ID
      const effectiveUserId = userId || getCurrentUserIdRequired();
      
      const preferencesRef = doc(firestore, 'preferences', effectiveUserId);
      const docSnap = await getDoc(preferencesRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as UserPreferences;
      }
      
      // If no preferences exist, create default preferences
      const defaultPreferences: UserPreferences = {
        userId: effectiveUserId, // This should be a string
        morningComplexFactor: 1,
        eveningComplexFactor: 0.6,
        morningAvailableTime: 120,
        eveningAvailableTime: 120,
        notificationsEnabled: true,
        morningReminderEnabled: true,
        scheduleReminderTime: '08:00',
        eveningReminderEnabled: false,
        eveningReminderTime: '18:00',
        defaultFocusTimerDuration: 25,
        breakRemindersEnabled: true,
        darkMode: false,
        colorTheme: 'blue',
        taskTimingPreference: 'morning',
      };
      
      // Save default preferences
      await this.saveUserPreferences(defaultPreferences);
      
      return defaultPreferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw error;
    }
  }
  
  /**
   * Save user preferences
   * @param preferences User preferences object
   */
  async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      const preferencesRef = doc(firestore, 'preferences', preferences.userId);
      await setDoc(preferencesRef, preferences);
      
      // Update scheduled notifications with new preferences
      if (preferences.notificationsEnabled) {
        await NotificationService.scheduleAllReminders(preferences);
      } else {
        await NotificationService.cancelAllScheduledNotifications();
      }
    } catch (error) {
      console.error('Error saving user preferences:', error);
      throw error;
    }
  }
  
  /**
   * Update specific preference fields
   * @param userId User ID (optional, will use current user if null)
   * @param updates Partial preference updates
   */
  async updateUserPreferences(
    userId: string | null,
    updates: Partial<UserPreferences>
  ): Promise<void> {
    try {
      // If userId is null, get the current authenticated user's ID
      const effectiveUserId = userId || getCurrentUserIdRequired();
      
      const preferencesRef = doc(firestore, 'preferences', effectiveUserId);
      await updateDoc(preferencesRef, updates);
      
      // If notification settings were updated, reschedule notifications
      if (
        'notificationsEnabled' in updates ||
        'morningReminderEnabled' in updates ||
        'scheduleReminderTime' in updates ||
        'eveningReminderEnabled' in updates ||
        'eveningReminderTime' in updates
      ) {
        // Get the full preferences with updates
        const prefs = await this.getUserPreferences(effectiveUserId);
        if (prefs && prefs.notificationsEnabled) {
          await NotificationService.scheduleAllReminders(prefs);
        } else if (prefs && !prefs.notificationsEnabled) {
          await NotificationService.cancelAllScheduledNotifications();
        }
      }
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }
  
  /**
   * Get productivity factor for a specific time of day
   * @param userId User ID (optional, will use current user if null)
   * @param timeOfDay Time of day (morning or evening)
   * @returns Productivity factor value
   */
  async getProductivityFactor(
    userId: string | null,
    timeOfDay: 'morning' | 'evening'
  ): Promise<number> {
    try {
      // If userId is null, get the current authenticated user's ID
      const effectiveUserId = userId || getCurrentUserIdRequired();
      
      const prefs = await this.getUserPreferences(effectiveUserId);
      
      if (!prefs) return 1.0; // Default if no preferences found
      
      switch (timeOfDay) {
        case 'morning':
          return prefs.morningComplexFactor;
        case 'evening':
          return prefs.eveningComplexFactor;
        default:
          return 1.0;
      }
    } catch (error) {
      console.error('Error getting productivity factor:', error);
      return 1.0; // Default fallback
    }
  }
  
  /**
   * Get available time for a specific time of day
   * @param userId User ID (optional, will use current user if null)
   * @param timeOfDay Time of day (morning or evening)
   * @returns Available time in minutes
   */
  async getAvailableTime(
    userId: string | null,
    timeOfDay: 'morning' | 'evening'
  ): Promise<number> {
    try {
      // If userId is null, get the current authenticated user's ID
      const effectiveUserId = userId || getCurrentUserIdRequired();
      
      const prefs = await this.getUserPreferences(effectiveUserId);
      
      if (!prefs) return 0; // Default if no preferences found
      
      switch (timeOfDay) {
        case 'morning':
          return prefs.morningAvailableTime;
        case 'evening':
          return prefs.eveningAvailableTime;
        default:
          return 0;
      }
    } catch (error) {
      console.error('Error getting available time:', error);
      return 0; // Default fallback
    }
  }

  /**
   * Remove all preferences for a user
   */
  async resetUserPreferences(userId: string | null): Promise<void> {
    const effectiveUserId = userId || getCurrentUserIdRequired();
    const prefRef = doc(firestore, 'preferences', effectiveUserId);
    await deleteDoc(prefRef);
  }
}

export default new UserPreferencesService();