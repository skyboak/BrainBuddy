// src/algorithms/ScheduleGenerator.ts

import { Task, UserPreferences, ScheduleOption, ScheduledTask } from '../models/Task';
import { calculateTaskScore, TimeOfDay } from './TaskScoring';
import { generateUniqueId } from '../utils/idGenerator';

/**
 * Shuffle an array using the Fisher-Yates algorithm
 * @param array The array to shuffle
 * @returns A new shuffled array
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Add small random noise to task scores to reduce similarity between schedules
 * @param tasks The scored tasks
 * @param variance Maximum random adjustment applied to scores
 */
function addRandomnessToScores(tasks: ScoredTask[], variance = 5): ScoredTask[] {
  return tasks.map(t => ({
    task: t.task,
    morningScore: Math.min(100, Math.max(0, t.morningScore + (Math.random() * 2 - 1) * variance)),
    eveningScore: Math.min(100, Math.max(0, t.eveningScore + (Math.random() * 2 - 1) * variance))
  }));
}

/**
 * Generates three different schedule options for a user based on their tasks and preferences
 * @param tasks Array of tasks to schedule
 * @param userPrefs User preferences
 * @param startTime Time to start scheduling from
 * @param freeTimeMinutes Total available minutes for scheduling (optional)
 * @param date Date to generate schedule for
 * @returns Array of schedule options
 */
export function generateScheduleOptions(
  tasks: Task[],
  userPrefs: UserPreferences,
  startTime: Date = new Date(),
  freeTimeMinutes?: number,
  date: Date = new Date()
): ScheduleOption[] {
  return generateDailySchedules(tasks, userPrefs, startTime, freeTimeMinutes, date);
}

/**
 * Generates three different schedule options for a user based on their tasks and preferences
 */
function generateDailySchedules(
  tasks: Task[],
  userPrefs: UserPreferences,
  startTime: Date = new Date(),
  freeTimeMinutes?: number,
  date: Date = new Date()
): ScheduleOption[] {
  // Step 1: Score all tasks for each time of day
  const scoredTasks = scoreTasks(tasks, userPrefs);

  // Shuffle scored tasks for alternative schedule options and
  // add slight randomness to scores to avoid identical ordering
  const shuffledForBalanced = addRandomnessToScores(shuffleArray(scoredTasks));
  const shuffledForGrouped = addRandomnessToScores(shuffleArray(scoredTasks));
  
  // Step 2: Prepare time blocks based on start time and free time
  const timeBlocks = prepareTimeBlocksFromStartTime(startTime, freeTimeMinutes || getDefaultFreeTime(userPrefs));
  
  // Step 3: Generate different schedule combinations
  const scheduleOptions: ScheduleOption[] = [];
  
  // Option 1: Prioritize highest scored tasks across all time blocks
  scheduleOptions.push(
    generatePriorityBasedSchedule(scoredTasks, timeBlocks, userPrefs, date, 'priority')
  );

  // Option 2: Balance task categories throughout the day
  scheduleOptions.push(
    generatePriorityBasedSchedule(shuffledForBalanced, timeBlocks, userPrefs, date, 'balanced')
  );

  // Option 3: Group similar tasks together for better focus
  scheduleOptions.push(
    generatePriorityBasedSchedule(shuffledForGrouped, timeBlocks, userPrefs, date, 'grouped')
  );
  
  return scheduleOptions;
}

/**
 * Get default free time from user preferences
 */
function getDefaultFreeTime(userPrefs: UserPreferences): number {
  // Sum up all available time from user preferences
  return (
    userPrefs.morningAvailableTime +
    userPrefs.eveningAvailableTime
  );
}

/**
 * Score all tasks for different times of day
 */
interface ScoredTask {
  task: Task;
  morningScore: number;
  eveningScore: number;
}

function scoreTasks(tasks: Task[], userPrefs: UserPreferences): ScoredTask[] {
  return tasks.map(task => ({
    task,
    morningScore: calculateTaskScore(task, userPrefs, TimeOfDay.MORNING),
    eveningScore: calculateTaskScore(task, userPrefs, TimeOfDay.EVENING)
  }));
}

/**
 * Prepare a single time block starting from startTime with a given duration
 */
interface TimeBlock {
  timeOfDay: TimeOfDay;
  startTime: Date;
  endTime: Date;
  availableMinutes: number;
}

function prepareTimeBlocksFromStartTime(startTime: Date, totalMinutes: number): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const currentHour = startTime.getHours();
  
  // Determine time of day
  let timeOfDay: TimeOfDay;
  if (currentHour >= 5 && currentHour < 12) {
    timeOfDay = TimeOfDay.MORNING;
  } else {
    timeOfDay = TimeOfDay.EVENING;
  }
  
  // Create a single time block with the specified duration
  const endTime = new Date(startTime.getTime() + totalMinutes * 60 * 1000);
  
  blocks.push({
    timeOfDay,
    startTime: new Date(startTime),
    endTime,
    availableMinutes: totalMinutes
  });
  
  return blocks;
}

/**
 * Prepare time blocks for the day based on user preferences
 * This is the original method that's still used when freeTimeMinutes isn't provided
 */
function prepareTimeBlocks(date: Date, userPrefs: UserPreferences): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const dayStart = new Date(date);
  dayStart.setHours(8, 0, 0, 0); // Default start at 8:00 AM
  
  // Morning block (8:00 AM - 12:00 PM by default)
  if (userPrefs.morningAvailableTime > 0) {
    const morningStart = new Date(dayStart);
    const morningEnd = new Date(dayStart);
    morningEnd.setHours(morningEnd.getHours() + 4); // 4 hours later
    
    blocks.push({
      timeOfDay: TimeOfDay.MORNING,
      startTime: morningStart,
      endTime: morningEnd,
      availableMinutes: userPrefs.morningAvailableTime
    });
  }
  
  
  // Evening block (5:00 PM - 10:00 PM by default)
  if (userPrefs.eveningAvailableTime > 0) {
    const eveningStart = new Date(dayStart);
    eveningStart.setHours(17, 0, 0, 0);
    const eveningEnd = new Date(eveningStart);
    eveningEnd.setHours(eveningEnd.getHours() + 5); // 5 hours later
    
    blocks.push({
      timeOfDay: TimeOfDay.EVENING,
      startTime: eveningStart,
      endTime: eveningEnd,
      availableMinutes: userPrefs.eveningAvailableTime
    });
  }
  
  return blocks;
}

/**
 * Generate a schedule based on different strategies
 * @param strategy - 'priority', 'balanced', or 'grouped'
 */
function generatePriorityBasedSchedule(
  scoredTasks: ScoredTask[],
  timeBlocks: TimeBlock[],
  userPrefs: UserPreferences,
  date: Date,
  strategy: 'priority' | 'balanced' | 'grouped'
): ScheduleOption {
  // Clone tasks array to avoid modifying the original
  const availableTasks = [...scoredTasks];
  const scheduledTasks: ScheduledTask[] = [];
  let totalScore = 0;
  
  // Process each time block
  for (const block of timeBlocks) {
    let remainingMinutes = block.availableMinutes;
    let blockTasks: ScoredTask[] = [];
    
    // Sort tasks differently based on strategy
    switch (strategy) {
      case 'priority':
        // Sort purely by score for this time of day
        blockTasks = sortTasksByTimeOfDay(availableTasks, block.timeOfDay);
        break;
        
      case 'balanced':
        // Try to include tasks from different categories
        blockTasks = balanceTaskCategories(availableTasks, block.timeOfDay);
        break;
        
      case 'grouped':
        // Group similar tasks together
        blockTasks = groupSimilarTasks(availableTasks, block.timeOfDay);
        break;
    }
    
    // Allocate tasks to this time block
    let currentTime = new Date(block.startTime);
    
    for (let i = 0; i < blockTasks.length; i++) {
      const scoredTask = blockTasks[i];
      const task = scoredTask.task;
      
      // Skip if task doesn't fit in remaining time
      if (task.durationMinutes > remainingMinutes) {
        continue;
      }
      
      // Calculate end time
      const taskEndTime = new Date(currentTime);
      taskEndTime.setMinutes(taskEndTime.getMinutes() + task.durationMinutes);
      
      // Add to scheduled tasks
      scheduledTasks.push({
        taskId: task.id,
        startTime: new Date(currentTime),
        endTime: taskEndTime,
        completed: false
      });
      
      // Update running totals
      currentTime = taskEndTime;
      remainingMinutes -= task.durationMinutes;
      
      // Add this task's score to total
      const taskScore = getScoreForTimeOfDay(scoredTask, block.timeOfDay);
      totalScore += taskScore;
      
      // Remove this task from available tasks
      const index = availableTasks.findIndex(t => t.task.id === task.id);
      if (index !== -1) {
        availableTasks.splice(index, 1);
      }
      
      // Break if not enough time remains for any task
      if (remainingMinutes < 15) {
        break;
      }
    }
  }
  
  // Create and return the schedule option
  return {
    id: generateUniqueId(),
    userId: userPrefs.userId,
    date: new Date(date),
    tasks: scheduledTasks,
    totalScore: totalScore,
    selected: false,
    createdAt: new Date()
  };
}

/**
 * Sort tasks by their score for a specific time of day
 */
function sortTasksByTimeOfDay(tasks: ScoredTask[], timeOfDay: TimeOfDay): ScoredTask[] {
  return [...tasks].sort((a, b) => {
    const aScore = getScoreForTimeOfDay(a, timeOfDay);
    const bScore = getScoreForTimeOfDay(b, timeOfDay);
    return bScore - aScore; // Descending order
  });
}

/**
 * Balance tasks from different categories
 */
function balanceTaskCategories(tasks: ScoredTask[], timeOfDay: TimeOfDay): ScoredTask[] {
  // Group tasks by their first tag (or 'untagged' if no tags)
  const tasksByCategory: { [category: string]: ScoredTask[] } = {};
  
  for (const task of tasks) {
    const category = task.task.tags.length > 0 ? task.task.tags[0] : 'untagged';
    
    if (!tasksByCategory[category]) {
      tasksByCategory[category] = [];
    }
    
    tasksByCategory[category].push(task);
  }
  
  // Sort each category by score
  for (const category in tasksByCategory) {
    tasksByCategory[category].sort((a, b) => {
      const aScore = getScoreForTimeOfDay(a, timeOfDay);
      const bScore = getScoreForTimeOfDay(b, timeOfDay);
      return bScore - aScore; // Descending order
    });
  }
  
  // Interleave tasks from different categories
  const result: ScoredTask[] = [];
  let categoriesWithTasks = Object.keys(tasksByCategory);
  
  while (categoriesWithTasks.length > 0) {
    // For each category, take the highest scored task
    for (let i = 0; i < categoriesWithTasks.length; i++) {
      const category = categoriesWithTasks[i];
      const categoryTasks = tasksByCategory[category];
      
      if (categoryTasks.length > 0) {
        // Take the highest scored task
        result.push(categoryTasks.shift()!);
        
        // If no more tasks in this category, remove it
        if (categoryTasks.length === 0) {
          categoriesWithTasks = categoriesWithTasks.filter(c => c !== category);
          i--; // Adjust index
        }
      }
    }
  }
  
  return result;
}

/**
 * Group similar tasks together for better focus
 */
function groupSimilarTasks(tasks: ScoredTask[], timeOfDay: TimeOfDay): ScoredTask[] {
  // Group tasks by their first tag (or 'untagged' if no tags)
  const tasksByCategory: { [category: string]: ScoredTask[] } = {};
  
  for (const task of tasks) {
    const category = task.task.tags.length > 0 ? task.task.tags[0] : 'untagged';
    
    if (!tasksByCategory[category]) {
      tasksByCategory[category] = [];
    }
    
    tasksByCategory[category].push(task);
  }
  
  // Sort categories by their highest-scored task
  const sortedCategories = Object.keys(tasksByCategory).sort((a, b) => {
    const aMaxScore = Math.max(...tasksByCategory[a].map(t => getScoreForTimeOfDay(t, timeOfDay)));
    const bMaxScore = Math.max(...tasksByCategory[b].map(t => getScoreForTimeOfDay(t, timeOfDay)));
    return bMaxScore - aMaxScore; // Descending order
  });
  
  // Sort tasks within each category by score
  for (const category in tasksByCategory) {
    tasksByCategory[category].sort((a, b) => {
      const aScore = getScoreForTimeOfDay(a, timeOfDay);
      const bScore = getScoreForTimeOfDay(b, timeOfDay);
      return bScore - aScore; // Descending order
    });
  }
  
  // Flatten the result - all tasks from highest priority category, then next category, etc.
  const result: ScoredTask[] = [];
  for (const category of sortedCategories) {
    result.push(...tasksByCategory[category]);
  }
  
  return result;
}

/**
 * Get a task's score for a specific time of day
 */
function getScoreForTimeOfDay(scoredTask: ScoredTask, timeOfDay: TimeOfDay): number {
  switch (timeOfDay) {
    case TimeOfDay.MORNING:
      return scoredTask.morningScore;
    case TimeOfDay.EVENING:
      return scoredTask.eveningScore;
    default:
      return 0;
  }
}