/**
 * Global test setup and mocks for Jest
 *
 * Provides mocks for Firebase, Expo modules, and React Navigation
 * to ensure components can be tested in isolation.
 */

import { jest } from '@jest/globals';

// Reset all mocks before each test for isolation
beforeEach(() => {
  jest.clearAllMocks();
});

/**
 * ------------------------------
 * Firebase mocks
 * ------------------------------
 */

// Auth mock implementation
jest.mock('firebase/auth', () => {
  const firebaseAuthMock = {
    currentUser: { uid: 'test-user' },
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
  };
  return {
    getAuth: jest.fn(() => firebaseAuthMock),
    signInWithEmailAndPassword: firebaseAuthMock.signInWithEmailAndPassword,
    signOut: firebaseAuthMock.signOut,
    onAuthStateChanged: firebaseAuthMock.onAuthStateChanged,
  };
});

// Firestore mock implementation
jest.mock('firebase/firestore', () => {
  const firebaseFirestoreMock = {
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    onSnapshot: jest.fn(),
    serverTimestamp: jest.fn(() => new Date()),
    Timestamp: {
      fromDate: jest.fn((date: Date) => date),
      now: jest.fn(() => new Date()),
    },
  };
  return firebaseFirestoreMock;
});

/**
 * ------------------------------
 * Expo notifications & haptics
 * ------------------------------
 */

jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
}));

/**
 * ------------------------------
 * React Navigation helpers
 * ------------------------------
 */

export const createNavigationMock = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => createNavigationMock(),
  useRoute: () => ({ params: {} }),
}));

/**
 * Utility for flushing pending promises in async tests
 */
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));
