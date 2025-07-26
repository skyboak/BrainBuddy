// src/context/UserContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../config/firebase';
import { User } from 'firebase/auth';

interface UserContextProps {
  currentUser: User | null;
  userId: string | null;
  isLoading: boolean;
}

// Create context with default values
const UserContext = createContext<UserContextProps>({
  currentUser: null,
  userId: null,
  isLoading: true,
});

// Custom hook to use the user context
export const useUser = () => useContext(UserContext);

interface UserProviderProps {
  children: ReactNode;
}

// Provider component that wraps the app
export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Value to be provided to consuming components
  const value = {
    currentUser,
    userId: currentUser?.uid || null,
    isLoading,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserContext;