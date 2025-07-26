// src/services/ScheduleService.ts (Updated)

import { Task, UserPreferences, ScheduleOption, ScheduledTask, DateType } from '../models/Task';
import { firestore, FirebaseUtils } from '../config/firebase';
import UserPreferencesService from './UserPreferencesService';
import TaskService from './TaskService';
import { generateScheduleOptions } from '../algorithms/ScheduleGenerator';
import { generateUniqueId } from '../utils/idGenerator';
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc } from 'firebase/firestore';
import { toDate } from '../utils/dateUtils';
import { getCurrentUserIdRequired } from '../utils/userUtils';

class ScheduleService {
  private schedulesCollection = collection(firestore, 'schedules');
  
  /**
   * Get schedules for a specific date
   * @param userId User ID (optional, will use current user if null)
   * @param date Date to get schedules for
   * @returns Array of schedule options
   */
  async getSchedulesForDate(
    userId: string | null,
    date: Date
  ): Promise<ScheduleOption[]> {
    try {
      // If userId is null, get the current authenticated user's ID
      const effectiveUserId = userId || getCurrentUserIdRequired();
      
      // Set time to beginning of day for consistent querying
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const q = query(
        this.schedulesCollection,
        where('userId', '==', effectiveUserId),
        where('date', '>=', startOfDay),
        where('date', '<=', endOfDay)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map((doc) => doc.data() as ScheduleOption);
    } catch (error) {
      console.error('Error getting schedules:', error);
      throw error;
    }
  }
  
  /**
   * Get the currently selected schedule for a date
   * @param userId User ID (optional, will use current user if null)
   * @param date Date to get schedule for
   * @returns Selected schedule or null if none selected
   */
  async getSelectedSchedule(
    userId: string | null,
    date: Date
  ): Promise<ScheduleOption | null> {
    try {
      // If userId is null, get the current authenticated user's ID
      const effectiveUserId = userId || getCurrentUserIdRequired();
      
      const schedules = await this.getSchedulesForDate(effectiveUserId, date);
      const selectedSchedule = schedules.find((schedule) => schedule.selected);
      return selectedSchedule || null;
    } catch (error) {
      console.error('Error getting selected schedule:', error);
      throw error;
    }
  }
  
  /**
   * Generate schedule options based on tasks and user preferences
   * @param tasks Array of tasks to schedule
   * @param userPrefs User preferences
   * @param startTime Time to start scheduling from (defaults to now)
   * @param freeTimeMinutes Total available minutes for scheduling (optional)
   * @param date Date to generate schedule for (defaults to today)
   * @returns Array of schedule options
   */
  async generateScheduleOptions(
    tasks: Task[],
    userPrefs: UserPreferences,
    startTime: Date = new Date(),
    freeTimeMinutes?: number,
    date: Date = new Date()
  ): Promise<ScheduleOption[]> {
    try {
      // Make sure all dates in tasks are properly converted to Date objects
      const processedTasks = tasks.map(task => ({
        ...task,
        deadline: task.deadline ? toDate(task.deadline) || new Date() : null,
        completedAt: task.completedAt ? toDate(task.completedAt) || null : undefined,
        createdAt: toDate(task.createdAt) || new Date(),
        updatedAt: toDate(task.updatedAt) || new Date(),
      }));
      
      // Use the algorithm to generate schedule options
      const scheduleOptions = generateScheduleOptions(
        processedTasks, 
        userPrefs, 
        startTime,
        freeTimeMinutes,
        date
      );
      
      // Save the generated options to the database
      await Promise.all(
        scheduleOptions.map((option) =>
          setDoc(doc(this.schedulesCollection, option.id), option)
        )
      );
      
      return scheduleOptions;
    } catch (error) {
      console.error('Error generating schedule options:', error);
      throw error;
    }
  }
  
  /**
   * Select a specific schedule option
   * @param scheduleId ID of the schedule to select
   * @returns Updated schedule option
   */
  async selectSchedule(scheduleId: string): Promise<void> {
    try {
      // Get the schedule to select
      const scheduleDocRef = doc(this.schedulesCollection, scheduleId);
      const scheduleDoc = await getDoc(scheduleDocRef);
      
      if (!scheduleDoc.exists()) {
        throw new Error('Schedule not found');
      }
      
      const schedule = scheduleDoc.data() as ScheduleOption;
      
      // Get all schedules for the same date and user
      const schedules = await this.getSchedulesForDate(
        schedule.userId,
        toDate(schedule.date) || new Date()
      );
      
      // Update all schedules - deselect others, select the target one
      await Promise.all(
        schedules.map((s) =>
          updateDoc(doc(this.schedulesCollection, s.id), {
            selected: s.id === scheduleId,
          })
        )
      );
    } catch (error) {
      console.error('Error selecting schedule:', error);
      throw error;
    }
  }
  
  /**
   * Get user preferences (convenience method)
   * @param userId User ID (optional, will use current user if null)
   * @returns User preferences
   */
  async getUserPreferences(userId: string | null): Promise<UserPreferences> {
    try {
      // If userId is null, get the current authenticated user's ID
      const effectiveUserId = userId || getCurrentUserIdRequired();
      
      const prefs = await UserPreferencesService.getUserPreferences(effectiveUserId);
      
      if (!prefs) {
        throw new Error('User preferences not found');
      }
      
      return prefs;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw error;
    }
  }
  
  /**
   * Update a scheduled task
   * @param scheduleId Schedule ID
   * @param taskIndex Task index in the schedule
   * @param taskUpdate Updated task data
   */
  async updateScheduledTask(
    scheduleId: string,
    taskIndex: number,
    taskUpdate: Partial<ScheduledTask>
  ): Promise<void> {
    try {
      // Get the current schedule
      const scheduleDocRef = doc(this.schedulesCollection, scheduleId);
      const scheduleDoc = await getDoc(scheduleDocRef);
      
      if (!scheduleDoc.exists()) {
        throw new Error('Schedule not found');
      }
      
      const schedule = scheduleDoc.data() as ScheduleOption;
      
      // Update the specific task
      if (taskIndex >= 0 && taskIndex < schedule.tasks.length) {
        const updatedTasks = [...schedule.tasks];
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          ...taskUpdate,
        };
        
        // Update the schedule
        await updateDoc(scheduleDocRef, {
          tasks: updatedTasks,
        });
      } else {
        throw new Error('Task index out of range');
      }
    } catch (error) {
      console.error('Error updating scheduled task:', error);
      throw error;
    }
  }
  
  /**
   * Mark a scheduled task as completed
   * @param scheduleId Schedule ID
   * @param taskIndex Task index in the schedule
   */
  async completeScheduledTask(
    scheduleId: string,
    taskIndex: number
  ): Promise<void> {
    try {
      // Get the current schedule
      const scheduleDocRef = doc(this.schedulesCollection, scheduleId);
      const scheduleDoc = await getDoc(scheduleDocRef);
      
      if (!scheduleDoc.exists()) {
        throw new Error('Schedule not found');
      }
      
      const schedule = scheduleDoc.data() as ScheduleOption;
      
      // Update the specific task
      if (taskIndex >= 0 && taskIndex < schedule.tasks.length) {
        const scheduledTask = schedule.tasks[taskIndex];
        
        // Mark the scheduled task as completed
        await this.updateScheduledTask(scheduleId, taskIndex, {
          completed: true,
        });
        
        // Also mark the original task as completed
        await TaskService.completeTask(scheduledTask.taskId);
      } else {
        throw new Error('Task index out of range');
      }
    } catch (error) {
      console.error('Error completing scheduled task:', error);
      throw error;
    }
  }
}

export default new ScheduleService();