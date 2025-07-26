// src/utils/dateUtils.ts
import { Timestamp, FieldValue } from 'firebase/firestore';
import { DateType } from '../models/Task';

/**
 * Safely converts a DateType (Date, Timestamp, FieldValue) to a JavaScript Date object
 * @param date The DateType to convert
 * @returns A JavaScript Date object or null if date is null
 */
export function toDate(date: DateType): Date | null {
  // If it's null or undefined, return null
  if (date === null || date === undefined) {
    return null;
  }
  
  // If it's already a Date, return it
  if (date instanceof Date) {
    return date;
  }
  
  // If it's a Timestamp, convert to Date
  if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  
  // If it's serverTimestamp or another FieldValue, return current date
  if (date && typeof date === 'object' && 'isEqual' in date && typeof date.isEqual === 'function') {
    return new Date();
  }
  
  // If it's something else, try to convert or return current date
  try {
    return new Date(date as any);
  } catch (e) {
    console.warn('Could not convert to Date:', date);
    return new Date();
  }
}

/**
 * Format a DateType as a relative string (Today, Tomorrow, or MM/DD/YYYY)
 * @param date The DateType to format
 * @returns A formatted string
 */
export function formatRelativeDate(date: DateType): string {
  // If no date is provided, return appropriate message
  if (date === null || date === undefined) {
    return 'No deadline';
  }

  // Convert to Date first
  const jsDate = toDate(date);
  if (!jsDate) return 'No deadline';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dateTime = jsDate.getTime();
  const todayTime = today.getTime();
  const tomorrowTime = tomorrow.getTime();

  if (dateTime >= todayTime && dateTime < tomorrowTime) {
    return 'Today';
  } else if (dateTime >= tomorrowTime && dateTime < tomorrowTime + 86400000) {
    return 'Tomorrow';
  } else {
    return `${jsDate.getMonth() + 1}/${jsDate.getDate()}/${jsDate.getFullYear()}`;
  }
}

/**
 * Get time remaining until a deadline
 * @param deadline The deadline DateType
 * @returns A formatted string describing time remaining
 */
export function getTimeRemaining(deadline: DateType): string {
  // Handle null deadline
  if (deadline === null || deadline === undefined) {
    return 'No deadline';
  }
  
  const now = new Date();
  const deadlineDate = toDate(deadline);
  if (!deadlineDate) return 'No deadline';
  
  const diffMs = deadlineDate.getTime() - now.getTime();
  
  // If past deadline
  if (diffMs < 0) {
    return 'Overdue';
  }
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h left`;
  } else if (diffHours > 0) {
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m left`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return diffMinutes <= 0 ? 'Due now' : `${diffMinutes}m left`;
  }
}