// src/models/Task.ts

import { Timestamp, FieldValue } from 'firebase/firestore';

export type DateType = Date | Timestamp | FieldValue | null;

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  
  // Task attributes for scoring
  urgency: number;        // 1-5 scale
  difficulty: number;     // 1-5 scale
  durationMinutes: number;
  
  // Time management
  deadline: DateType | null;
  completed: boolean;
  completedAt?: DateType;
  
  // Recurrence
  recurrence: RecurrenceType;
  recurrenceEndDate?: DateType;

  // Categorization
  tags: string[];
  
  // Metadata
  createdAt: DateType;
  updatedAt: DateType;
}

// User preferences that affect task scheduling
export interface UserPreferences {
  userId: string;  // Keep the type as string, don't change this
  
  // Time of day productivity factors
  morningComplexFactor: number;  // 0.5-1.5, how well user handles complex tasks in morning
  eveningComplexFactor: number;  // 0.5-1.5
  
  // Available time blocks (in minutes)
  morningAvailableTime: number;
  eveningAvailableTime: number;
  
  // Notification preferences
  notificationsEnabled: boolean;
  morningReminderEnabled: boolean; // Enable/disable morning notifications
  scheduleReminderTime: string;    // Morning notification time (HH:MM)
  eveningReminderEnabled: boolean; // Enable/disable evening notifications
  eveningReminderTime: string;     // Evening notification time (HH:MM)
  
  // Focus timer settings
  defaultFocusTimerDuration: number;  // in minutes
  breakRemindersEnabled: boolean;
  
  // Theme preferences
  darkMode: boolean;
  colorTheme: string;

  // Preferred time for tackling difficult tasks
  taskTimingPreference: 'morning' | 'evening';
}

// Generated schedule option
export interface ScheduleOption {
  id: string;
  userId: string;
  date: DateType;
  tasks: ScheduledTask[];
  totalScore: number;
  selected: boolean;
  createdAt: DateType;
}

// A task placed in a specific time slot
export interface ScheduledTask {
  taskId: string;
  startTime: DateType;
  endTime: DateType;
  completed: boolean;
}