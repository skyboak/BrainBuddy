// App.tsx - Updated with authentication fix

import React, { useState, useEffect, useRef } from 'react';
import { StatusBar, LogBox, View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import user context provider 
import { UserProvider } from './src/context/UserContext';

// Import notification manager if you're using it
import NotificationManager from './src/components/NotificationManager';
import { Task } from './src/models/Task';
import OnboardingService from './src/services/OnboardingService';

// Import screens
import DashboardScreen from './src/screens/DashboardScreen';
import AddTaskScreen from './src/screens/AddTaskScreen';
import TaskDetailsScreen from './src/screens/TaskDetailsScreen';
import ScheduleSelectionScreen from './src/screens/ScheduleSelectionScreen';
import FocusTimerScreen from './src/screens/FocusTimerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingQuizScreen from './src/screens/OnboardingQuizScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import FreeTimeInputScreen from './src/screens/FreeTimeInputScreen';
import FocusSessionScreen from './src/screens/FocusSessionScreen';
import NotificationDebugScreen from './src/screens/NotificationDebugScreen';
import EditTaskScreen from './src/screens/EditTaskScreen';

// Import Auth Navigator
import AuthNavigator from './src/navigation/AuthNavigator';

// Import Auth service to check authentication state
import { auth } from './src/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Define navigation types
type RootStackParamList = {
  Auth: undefined;
  Dashboard: undefined;
  AddTask: undefined;
  TaskDetails: { taskId: string };
  EditTask: { task: Task };
  Schedules: { freeTimeMinutes: number };
  FocusTimer: { taskId: string; duration?: number };
  FocusSession: { scheduleId: string };
  FreeTimeInput: undefined;
  Settings: undefined;
  OnboardingQuiz: undefined;
  ChangePassword: undefined;
  NotificationDebug: undefined;
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Create navigation stack
const Stack = createStackNavigator<RootStackParamList>();

// Keep splash screen visible until the app is ready
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore error */
});

export default function App() {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  
  // Set up initialization
  useEffect(() => {
    const initialize = async () => {
      try {
        // Set up notification permissions - only on native platforms
        if (Platform.OS !== 'web') {
          try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
              console.log('Notification permissions not granted');
            }
          } catch (error) {
            console.warn('Error requesting notification permissions:', error);
          }
        }
        
        // Check authentication state
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setIsAuthenticated(!!user);
          setIsLoading(false);
          if (user) {
            OnboardingService.isOnboardingCompleted(user.uid).then((done) => {
              setOnboardingComplete(done);
            });
          } else {
            setOnboardingComplete(null);
          }
          SplashScreen.hideAsync().catch(() => {
            /* ignore error */
          });
        });
        
        // Return cleanup function
        return () => {
          unsubscribe();
        };
        
      } catch (error) {
        console.error('Initialization error:', error);
        setIsLoading(false);
        SplashScreen.hideAsync().catch(() => {
          /* ignore error */
        });
      }
    };
    
    initialize();
  }, []);
  
  // Show loading screen while initializing or checking onboarding
  if (isLoading || (isAuthenticated && onboardingComplete === null)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>BrainBuddy is starting...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaProvider>
      <UserProvider>
        <NavigationContainer>
          <StatusBar barStyle="dark-content" />
          {/* Add NotificationManager at the top level if authenticated */}
          {isAuthenticated && <NotificationManager />}
          
          {!isAuthenticated ? (
            // Auth Navigator
            <Stack.Navigator 
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen 
                name="Auth" 
                component={AuthNavigator} 
                key="auth-screen"
              />
            </Stack.Navigator>
          ) : (
            // Main App Navigator
            <Stack.Navigator
              initialRouteName={onboardingComplete ? 'Dashboard' : 'OnboardingQuiz'}
              screenOptions={{
                headerShown: true,
              }}
            >
              <Stack.Screen 
                name="Dashboard" 
                component={DashboardScreen} 
                options={{ headerShown: false }}
                key="dashboard-screen"
              />
              <Stack.Screen 
                name="AddTask" 
                component={AddTaskScreen} 
                options={{ title: "Add Task" }}
                key="add-task-screen"
              />
              <Stack.Screen 
                name="TaskDetails" 
                component={TaskDetailsScreen} 
                options={{ title: "Task Details" }}
                key="task-details-screen"
              />
              <Stack.Screen 
                name="EditTask" 
                component={EditTaskScreen} 
                options={{ title: "Edit Task" }}
                key="edit-task-screen"
              />
              <Stack.Screen 
                name="FreeTimeInput" 
                component={FreeTimeInputScreen} 
                options={{ headerShown: false }}
                key="free-time-input-screen"
              />
              <Stack.Screen 
                name="Schedules" 
                component={ScheduleSelectionScreen} 
                options={{ headerShown: false }}
                key="schedules-screen"
              />
              <Stack.Screen 
                name="FocusTimer" 
                component={FocusTimerScreen} 
                options={{ headerShown: false, gestureEnabled: false }}
                key="focus-timer-screen"
              />
              <Stack.Screen 
                name="FocusSession" 
                component={FocusSessionScreen} 
                options={{ headerShown: false, gestureEnabled: false }}
                key="focus-session-screen"
              />
              <Stack.Screen 
                name="Settings" 
                component={SettingsScreen} 
                options={{ title: "Settings" }}
                key="settings-screen"
              />
              <Stack.Screen
                name="OnboardingQuiz"
                component={OnboardingQuizScreen}
                options={{ headerShown: false }}
                key="onboarding-quiz-screen"
              />
              <Stack.Screen 
                name="ChangePassword" 
                component={ChangePasswordScreen} 
                options={{ headerShown: false }}
                key="change-password-screen"
              />
              <Stack.Screen 
                name="NotificationDebug" 
                component={NotificationDebugScreen} 
                options={{ title: "Notification Debug" }}
                key="notification-debug-screen"
              />
            </Stack.Navigator>
          )}
        </NavigationContainer>
      </UserProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    marginTop: 20,
    color: '#ffffff',
    fontSize: 18,
  },
});