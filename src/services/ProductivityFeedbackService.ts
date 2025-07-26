// src/services/ProductivityFeedbackService.ts

import { Task } from '../models/Task';
import UserPreferencesService from './UserPreferencesService';
import { toDate } from '../utils/dateUtils';

/**
 * Service that updates user productivity factors based on real task completions.
 */
class ProductivityFeedbackService {
  // Weight for new data when updating the factor
  private static readonly ALPHA = 0.1;

  /**
   * Record a task completion and adjust productivity factors accordingly.
   * @param task The completed task
   */
  async recordTaskCompletion(task: Task): Promise<void> {
    if (!task.completedAt) return;

    const completionDate = toDate(task.completedAt) || new Date();
    const timeOfDay = this.getTimeOfDay(completionDate);

    // Map difficulty 1-5 to a factor between 0.5 and 1.5
    const difficultyFactor = 0.5 + ((task.difficulty - 1) / 4);

    const prefs = await UserPreferencesService.getUserPreferences(task.userId);
    if (!prefs) return;

    let factorKey: keyof typeof prefs;
    switch (timeOfDay) {
      case 'morning':
        factorKey = 'morningComplexFactor';
        break;
      default:
        factorKey = 'eveningComplexFactor';
    }

    const current = prefs[factorKey] as number;
    const updated = (1 - ProductivityFeedbackService.ALPHA) * current +
      ProductivityFeedbackService.ALPHA * difficultyFactor;

    const clamped = Math.min(1.5, Math.max(0.5, updated));

    await UserPreferencesService.updateUserPreferences(task.userId, {
      [factorKey]: clamped,
    });
  }

  /**
   * Determine the time of day for a given date.
   */
  private getTimeOfDay(date: Date): 'morning' | 'evening' {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    return 'evening';
  }
}

export default new ProductivityFeedbackService();
