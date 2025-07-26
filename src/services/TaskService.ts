// src/services/TaskService.ts (Updated)

import { firestore } from '../config/firebase';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  serverTimestamp,
  Timestamp,
  FieldValue
} from 'firebase/firestore';
import { Task, RecurrenceType, DateType } from '../models/Task';
import { generateUniqueId } from '../utils/idGenerator';
import { toDate } from '../utils/dateUtils';
import { getCurrentUserIdRequired } from '../utils/userUtils';
import ProductivityFeedbackService from './ProductivityFeedbackService';

class TaskService {
  /**
   * Create a new task
   */
  async createTask(userId: string | null, taskData: Partial<Task>): Promise<Task> {
    // If userId is null, get the current authenticated user's ID
    const effectiveUserId = userId || getCurrentUserIdRequired();
    
    const now = serverTimestamp();
    const taskId = generateUniqueId();
    
    const newTask: Task = {
      id: taskId,
      userId: effectiveUserId,
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      urgency: taskData.urgency || 3,
      difficulty: taskData.difficulty || 3,
      durationMinutes: taskData.durationMinutes || 30,
      deadline: taskData.deadline !== undefined ? taskData.deadline : now, // Allow null deadlines
      completed: false,
      recurrence: taskData.recurrence || 'none',
      tags: taskData.tags || [],
      createdAt: now,
      updatedAt: now
    };
    
    const tasksRef = collection(firestore, 'tasks');
    await setDoc(doc(tasksRef, taskId), newTask);
    return newTask;
  }
  
  /**
   * Get a task by ID
   */
  async getTaskById(taskId: string): Promise<Task | null> {
    const taskRef = doc(firestore, 'tasks', taskId);
    const docSnap = await getDoc(taskRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const taskData = docSnap.data() as Task;
    
    // Convert date fields
    return {
      ...taskData,
      deadline: taskData.deadline,
      createdAt: taskData.createdAt,
      updatedAt: taskData.updatedAt,
      completedAt: taskData.completedAt,
      recurrenceEndDate: taskData.recurrenceEndDate
    };
  }
  
  /**
   * Get all tasks for a user
   */
  async getUserTasks(userId: string | null): Promise<Task[]> {
    // If userId is null, get the current authenticated user's ID
    const effectiveUserId = userId || getCurrentUserIdRequired();
    
    const tasksRef = collection(firestore, 'tasks');
    const q = query(
      tasksRef,
      where('userId', '==', effectiveUserId),
      where('completed', '==', false)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const taskData = doc.data() as Task;
      
      return {
        ...taskData,
        id: doc.id
      };
    });
  }
  
  /**
   * Get completed tasks for a specific date
   */
  async getCompletedTasksForDate(userId: string | null, date: Date): Promise<Task[]> {
    // If userId is null, get the current authenticated user's ID
    const effectiveUserId = userId || getCurrentUserIdRequired();
    
    // Create start and end of day DateType
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const tasksRef = collection(firestore, 'tasks');
    const q = query(
      tasksRef,
      where('userId', '==', effectiveUserId),
      where('completed', '==', true),
      where('completedAt', '>=', startOfDay),
      where('completedAt', '<=', endOfDay)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const taskData = doc.data() as Task;
      
      return {
        ...taskData,
        id: doc.id
      };
    });
  }
  
/**
 * Update an existing task
 * @param taskId The ID of the task to update
 * @param taskData The partial task data to update
 * @returns The updated task data
 */
  async updateTask(taskId: string, taskData: Partial<Task>): Promise<Task> {
    try {
      // First check if task exists
      const taskRef = doc(firestore, 'tasks', taskId);
      const taskSnapshot = await getDoc(taskRef);
      
      if (!taskSnapshot.exists()) {
        throw new Error(`Task with ID ${taskId} not found`);
      }
      
      const updateData = {
        ...taskData,
        updatedAt: serverTimestamp()
      };
      
      // Update the task
      await updateDoc(taskRef, updateData);
      
      // Get the updated task data
      const updatedTaskSnapshot = await getDoc(taskRef);
      
      if (!updatedTaskSnapshot.exists()) {
        throw new Error(`Failed to retrieve updated task with ID ${taskId}`);
      }
      
      return updatedTaskSnapshot.data() as Task;
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      throw error;
    }
  }
  
  /**
   * Mark a task as complete
   */
  async completeTask(taskId: string): Promise<void> {
    const now = serverTimestamp();
    const taskRef = doc(firestore, 'tasks', taskId);

    await updateDoc(taskRef, {
      completed: true,
      completedAt: now,
      updatedAt: now
    });

    // Handle recurring tasks by creating the next occurrence
    const taskSnapshot = await getDoc(taskRef);
    const task = taskSnapshot.data() as Task;

    if (task) {
      // Update productivity factors based on completion time
      try {
        await ProductivityFeedbackService.recordTaskCompletion(task);
      } catch (err) {
        console.error('Error recording task completion feedback:', err);
      }

      if (task.recurrence !== 'none') {
        await this.createNextRecurrence(task);
      }
    }
  }
  
  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    const taskRef = doc(firestore, 'tasks', taskId);
    await deleteDoc(taskRef);
  }

  /**
   * Delete all tasks for a user
   */
  async deleteAllUserTasks(userId: string | null): Promise<void> {
    const effectiveUserId = userId || getCurrentUserIdRequired();
    const tasksRef = collection(firestore, 'tasks');
    const q = query(tasksRef, where('userId', '==', effectiveUserId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(firestore);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }
  
  /**
   * Create the next occurrence of a recurring task
   */
  private async createNextRecurrence(completedTask: Task): Promise<void> {
    // Skip creating next recurrence if task has no deadline
    if (completedTask.deadline === null) {
      return;
    }
    
    const deadlineDate = toDate(completedTask.deadline);
    if (!deadlineDate) return; // Don't create recurrence if no valid deadline
    
    const newDeadline = this.calculateNextDeadline(
      deadlineDate, 
      completedTask.recurrence
    );
    
    // Check if we're past the recurrence end date
    if (completedTask.recurrenceEndDate) {
      const recurrenceEndDate = toDate(completedTask.recurrenceEndDate);
      if (recurrenceEndDate && newDeadline > recurrenceEndDate) {
        return;
      }
    }
    
    // Create a new task with the same properties but a new deadline
    const newTaskData: Partial<Task> = { 
      ...completedTask,
      deadline: newDeadline,
      completed: false,
      completedAt: undefined,
    };
    
    // Remove the old ID so a new one is generated
    delete (newTaskData as any).id;
    
    await this.createTask(completedTask.userId, newTaskData);
  }
  
  /**
   * Calculate the next deadline for a recurring task
   */
  private calculateNextDeadline(currentDeadline: Date, recurrence: RecurrenceType): Date {
    const nextDeadline = new Date(currentDeadline);
    
    switch (recurrence) {
      case 'daily':
        nextDeadline.setDate(nextDeadline.getDate() + 1);
        break;
      case 'weekly':
        nextDeadline.setDate(nextDeadline.getDate() + 7);
        break;
      case 'monthly':
        nextDeadline.setMonth(nextDeadline.getMonth() + 1);
        break;
      default:
        // No recurrence, return the same date
        break;
    }
    
    return nextDeadline;
  }
}

export default new TaskService();