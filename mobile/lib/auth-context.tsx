/**
 * Tec360 Mobile — Auth Context
 * Adapted from frontend/src/lib/auth-context.tsx for React Native
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, useSegments, useRootNavigationState } from "expo-router";
import {
  getCurrentUser,
  clearTokens,
  getUser,
  saveUser,
  isAuthenticated as checkIsAuthenticated,
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
  average_rating?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  loginUser: (user: User) => void;
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
  loginUser: () => {},
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
  const navigationState = useRootNavigationState();

  // Load user from SecureStore on mount
  useEffect(() => {
    loadUser();
  }, []);

  // Protect routes based on auth state
  useEffect(() => {
    // Don't redirect until loading is done AND navigation is ready
    if (isLoading) return;
    if (!navigationState?.key) return;

    // Check if we're in the auth group — handle both formats
    const firstSegment = (segments[0] || "") as string;
    if (firstSegment === "index" || firstSegment === "") return;

    const inAuthGroup = firstSegment === "(auth)" || firstSegment === "auth";

    if (!user && !inAuthGroup) {
      // Not authenticated AND not already in auth screens → go to login
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      // Already authenticated but still on auth screens → redirect to app
      // EXCEPT if they're on the onboarding screen and haven't completed it
      const currentScreen = segments[1] || "";
      if (currentScreen === "onboarding") {
        // Let them stay on onboarding
        return;
      }

      if (!user.onboarding_completed && !user.full_name) {
        router.replace("/(auth)/onboarding");
      } else if (user.role === "technician") {
        router.replace("/(tech)/dashboard");
      } else {
        router.replace("/(client)/services");
      }
    }
  }, [user, segments, isLoading, navigationState?.key]);

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

  const loginUser = useCallback((u: User) => {
    setUser(u);
  }, []);

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
        loginUser,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
