/**
 * Tec360 Mobile — Auth Context
 * Adapted from frontend/src/lib/auth-context.tsx for React Native
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, useSegments } from "expo-router";
import {
  getCurrentUser,
  clearTokens,
  getUser,
  saveUser,
  isAuthenticated as checkIsAuthenticated,
  hasCompletedOnboarding as checkHasCompletedOnboarding,
} from "./api";

// ============================================
// TYPES
// ============================================

export interface User {
  id: string;
  phone: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  onboarding_completed?: boolean;
  user_metadata?: Record<string, any>;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  refreshUser: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// ============================================
// PROVIDER
// ============================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // Load user from SecureStore on mount
  useEffect(() => {
    loadUser();
  }, []);

  // Protect routes based on auth state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      // Not authenticated, redirect to login
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      // Authenticated, redirect to appropriate home
      if (!user.onboarding_completed && !user.full_name) {
        router.replace("/(auth)/onboarding");
      } else if (user.role === "technician") {
        router.replace("/(tech)/dashboard");
      } else {
        router.replace("/(client)/services");
      }
    }
  }, [user, segments, isLoading]);

  const loadUser = async () => {
    try {
      const isAuth = await checkIsAuthenticated();
      if (!isAuth) {
        setIsLoading(false);
        return;
      }

      // Try local cache first
      const cachedUser = await getUser();
      if (cachedUser) {
        setUser(cachedUser);
      }

      // Refresh from server
      try {
        const response = await getCurrentUser();
        if (response.user) {
          setUser(response.user);
          await saveUser(response.user);
        }
      } catch (err) {
        console.error("Failed to refresh user from server:", err);
        // Keep cached user if server fails
      }
    } catch (err) {
      console.error("Failed to load user:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const response = await getCurrentUser();
      if (response.user) {
        setUser(response.user);
        await saveUser(response.user);
      }
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  }, []);

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
    router.replace("/(auth)/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        hasCompletedOnboarding: !!user?.onboarding_completed || !!user?.full_name,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
