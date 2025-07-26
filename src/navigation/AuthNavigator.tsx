// src/navigation/AuthNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import auth screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// Define the auth navigator param list
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F9FAFC' }
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        key="login-screen"
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
        key="register-screen"
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        key="forgot-password-screen"
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;