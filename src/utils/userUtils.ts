// src/utils/userUtils.ts

import { auth } from '../config/firebase';

/**
 * Gets the current user ID from Firebase Auth
 * @returns The current user ID or null if not authenticated
 */
export const getCurrentUserId = (): string | null => {
  return auth.currentUser?.uid || null;
};

/**
 * Gets the current user ID, throws an error if not authenticated
 * @returns The current user ID
 * @throws Error if no user is signed in
 */
export const getCurrentUserIdRequired = (): string => {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('No user is currently signed in');
  }
  return userId;
};

/**
 * Checks if a user is authenticated
 * @returns True if a user is authenticated, otherwise false
 */
export const isAuthenticated = (): boolean => {
  return !!auth.currentUser;
};