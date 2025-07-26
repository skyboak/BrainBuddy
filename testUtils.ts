/**
 * Helper utilities for unit tests
 */

import { Timestamp } from 'firebase/firestore';
import { Task, UserPreferences } from './src/models/Task';
import { generateUniqueId } from './src/utils/idGenerator';

/**
 * Create a Firebase Timestamp from a JavaScript Date
 */
export const createTimestamp = (date: Date = new Date()): Timestamp => {
  return Timestamp.fromDate(date);
};

/**
 * Generate a mock task with sane defaults. Properties can be overridden
 * by providing a partial Task object.
 */
export const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: generateUniqueId(),
  userId: 'test-user',
  title: 'Test Task',
  description: 'Mock description',
  urgency: 3,
  difficulty: 3,
  durationMinutes: 30,
  deadline: createTimestamp(),
  completed: false,
  recurrence: 'none',
  tags: [],
  createdAt: createTimestamp(),
  updatedAt: createTimestamp(),
  ...overrides,
});

/**
 * Generate mock user preferences with sensible defaults.
 */
export const createMockPreferences = (
  overrides: Partial<UserPreferences> = {}
): UserPreferences => ({
  userId: 'test-user',
  morningComplexFactor: 1,
  eveningComplexFactor: 1,
  morningAvailableTime: 60,
  eveningAvailableTime: 60,
  notificationsEnabled: true,
  morningReminderEnabled: true,
  scheduleReminderTime: '09:00',
  eveningReminderEnabled: true,
  eveningReminderTime: '21:00',
  defaultFocusTimerDuration: 25,
  breakRemindersEnabled: true,
  darkMode: false,
  colorTheme: 'blue',
  taskTimingPreference: 'morning',
  ...overrides,
});

/**
 * Create a mock asynchronous function that resolves with the provided result.
 */
export const mockAsync = <T>(result: T, delay = 0) =>
  jest.fn(() => new Promise<T>(res => setTimeout(() => res(result), delay)));
