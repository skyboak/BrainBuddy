// src/algorithms/TaskScoring.ts

import { Task, UserPreferences, DateType } from '../models/Task';

// Constants for scoring weights
const URGENCY_WEIGHT = 0.45;  // 45% of total score
const COGNITIVE_WEIGHT = 0.35;  // 35% of total score
const DEADLINE_WEIGHT = 0.20;  // 20% of total score

export enum TimeOfDay {
  MORNING = 'morning',
  EVENING = 'evening'
}

/**
 * Calculate a task's priority score based on urgency, cognitive effort, and deadline
 * @param task The task to score
 * @param userPrefs User preferences affecting scoring
 * @param timeOfDay When the task might be scheduled
 * @returns A score from 0-100, higher means higher priority
 */
export function calculateTaskScore(
  task: Task, 
  userPrefs: UserPreferences,
  timeOfDay: TimeOfDay
): number {
  // 1. Calculate urgency component (45% of total)
  const urgencyScore = calculateUrgencyScore(task.urgency);
  
  // 2. Calculate cognitive effort component (35% of total)
  const cognitiveScore = calculateCognitiveScore(task.difficulty, userPrefs, timeOfDay);
  
  // 3. Calculate deadline component (20% of total)
  const deadlineScore = calculateDeadlineScore(task.deadline);
  
  // 4. Combine all components into a final score
  const totalScore = (
    (urgencyScore * URGENCY_WEIGHT) +
    (cognitiveScore * COGNITIVE_WEIGHT) +
    (deadlineScore * DEADLINE_WEIGHT)
  );
  
  // Ensure score is in the range 0-100
  return Math.min(100, Math.max(0, totalScore));
}

/**
 * Calculate the urgency component of the task score
 */
function calculateUrgencyScore(urgency: number): number {
  // Simple linear scaling: urgency 1-5 maps to score 20-100
  return urgency * 20;
}

/**
 * Calculate the cognitive effort component, considering time of day and user preferences
 */
function calculateCognitiveScore(
  difficulty: number,
  userPrefs: UserPreferences,
  timeOfDay: TimeOfDay
): number {
  // Get the appropriate complex factor based on time of day
  let complexFactor: number;
  
  switch (timeOfDay) {
    case TimeOfDay.MORNING:
      complexFactor = userPrefs.morningComplexFactor;
      break;
    case TimeOfDay.EVENING:
      complexFactor = userPrefs.eveningComplexFactor;
      break;
    default:
      complexFactor = 1.0; // Default if time of day is not specified
  }
  
  // The cognitive score increases when the task's difficulty aligns with the user's
  // ability to handle complex tasks during that time of day
  
  // First, normalize difficulty to 0-1 range
  const normalizedDifficulty = difficulty / 5;
  
  // If complexFactor > 1, user handles complex tasks well at this time
  // If complexFactor < 1, user struggles with complex tasks at this time
  const alignmentScore = 100 - (Math.abs(normalizedDifficulty - (complexFactor / 1.5)) * 100);
  
  return alignmentScore;
}

/**
 * Calculate the deadline component of the task score
 */
function calculateDeadlineScore(deadline: DateType | null): number {
  if (deadline === null) {
    return 0; // No deadline means no urgency contribution
  }

  // Convert to Date object first
  const deadlineDate = convertToDate(deadline);
  
  // Calculate hours until deadline
  const now = new Date();
  const hoursUntilDeadline = Math.max(0, (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  
  // Use the formula: deadlineScore = 100 * (1 / (1 + 0.01 * hoursUntilDeadline))
  // This formula creates a curve where tasks due very soon (< 24 hours) get high scores
  // Tasks due in the distant future get progressively lower scores
  return 100 * (1 / (1 + 0.01 * hoursUntilDeadline));
}

/**
 * Convert a DateType (Date, Timestamp, FieldValue) to a JavaScript Date
 */
function convertToDate(date: DateType | null): Date {
  if (date === null) {
    return new Date();
  }
  // If it's already a Date, return it
  if (date instanceof Date) {
    return date;
  }
  
  // If it's a Timestamp (has toDate method), convert to Date
  if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  
  // If it's a FieldValue or something else we can't convert, return current date as fallback
  return new Date();
}