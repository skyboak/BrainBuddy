// src/services/AuthService.ts

import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    User
  } from 'firebase/auth';
  import { auth, firestore } from '../config/firebase';
  import { doc, setDoc } from 'firebase/firestore';
  import { UserPreferences } from '../models/Task';
  import UserPreferencesService from './UserPreferencesService';
  
  class AuthService {
    /**
     * Register a new user with email and password
     */
    async register(email: string, password: string, displayName: string): Promise<User> {
      try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create user document in Firestore
        await setDoc(doc(firestore, 'users', user.uid), {
          uid: user.uid,
          email,
          displayName,
          createdAt: new Date()
        });
        
        // Create default user preferences
        const defaultPrefs: UserPreferences = {
          userId: user.uid,
          morningComplexFactor: 1,
          eveningComplexFactor: 0.6,
          morningAvailableTime: 120,
          eveningAvailableTime: 120,
          notificationsEnabled: true,
          morningReminderEnabled: true,
          scheduleReminderTime: '08:00',
          eveningReminderEnabled: false,
          eveningReminderTime: '18:00',
          defaultFocusTimerDuration: 25,
          breakRemindersEnabled: true,
          darkMode: false,
          colorTheme: 'blue',
          taskTimingPreference: 'morning',
        };
        
        await UserPreferencesService.saveUserPreferences(defaultPrefs);
        
        return user;
      } catch (error) {
        console.error('Error registering user:', error);
        throw error;
      }

    }
  
  
  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }
  
  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }
  
  /**
   * Send a password reset email
   */
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }
  
  /**
   * Change user's password (requires recent login)
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('User not authenticated');
      }
      
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
  
  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!auth.currentUser;
  }
}

export default new AuthService();