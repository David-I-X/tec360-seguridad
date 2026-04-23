/**
 * Tec360 Mobile — API Client
 * Adapted from frontend/src/lib/api.ts for React Native
 * Uses expo-secure-store instead of localStorage
 */

import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://tec-360.tech/api";

// ============================================
// TYPES
// ============================================

export interface APIError {
  success: false;
  error: string;
  details?: string[];
  code?: string;
}

export interface OTPResponse {
  success: true;
  message: string;
  phone: string;
  expires_in_minutes: number;
  code?: string; // Solo en desarrollo
}

export interface AuthResponse {
  success: true;
  message: string;
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    phone: string;
    email?: string;
    user_metadata: Record<string, any>;
    created_at?: string;
  };
  is_new_user: boolean;
}

export interface OnboardingResponse {
  success: true;
  message: string;
  user: {
    id: string;
    phone: string;
    full_name: string;
    email?: string;
    role: string;
    onboarding_completed: boolean;
  };
}

export interface UserResponse {
  success: true;
  user: {
    id: string;
    phone: string;
    email?: string;
    full_name?: string;
    avatar_url?: string;
    role?: string;
    onboarding_completed?: boolean;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function handleAPIError(response: Response): Promise<never> {
  let errorData: any;
  try {
    errorData = await response.json();
  } catch {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  if (errorData.error) throw new Error(errorData.error);
  if (errorData.detail) {
    if (typeof errorData.detail === "string") throw new Error(errorData.detail);
    if (Array.isArray(errorData.detail)) {
      const errors = errorData.detail.map((e: any) => e.msg).join(", ");
      throw new Error(errors);
    }
  }
  throw new Error("Error desconocido del servidor");
}

// ============================================
// TOKEN MANAGEMENT (SecureStore)
// ============================================

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync("access_token");
}

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync("access_token", accessToken);
  await SecureStore.setItemAsync("refresh_token", refreshToken);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync("access_token");
  await SecureStore.deleteItemAsync("refresh_token");
  await SecureStore.deleteItemAsync("user");
}

export async function saveUser(user: any): Promise<void> {
  await SecureStore.setItemAsync("user", JSON.stringify(user));
}

export async function getUser(): Promise<any | null> {
  const userData = await SecureStore.getItemAsync("user");
  return userData ? JSON.parse(userData) : null;
}

// ============================================
// FETCH WITH AUTH (Auto-Refresh)
// ============================================

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  if (!token) throw new Error("No estás autenticado");

  const headers = new Headers(options.headers || {});
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const endpointUrl = url.startsWith("http") ? url : `${API_URL}${url}`;
  let response = await fetch(endpointUrl, { ...options, headers });

  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const { access_token } = await refreshToken();
        isRefreshing = false;
        onRefreshed(access_token);
      } catch (err) {
        isRefreshing = false;
        await clearTokens();
        throw err;
      }
    }

    const retryOriginalRequest = new Promise<Response>((resolve) => {
      addRefreshSubscriber(async (newToken) => {
        headers.set("Authorization", `Bearer ${newToken}`);
        const retryResponse = await fetch(endpointUrl, { ...options, headers });
        resolve(retryResponse);
      });
    });
    return retryOriginalRequest;
  }

  return response;
}

// ============================================
// AUTH ENDPOINTS
// ============================================

export async function requestOTP(phone: string): Promise<OTPResponse> {
  const response = await fetch(`${API_URL}/auth/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function verifyOTP(phone: string, code: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  if (!response.ok) await handleAPIError(response);

  const data: AuthResponse = await response.json();
  await saveTokens(data.access_token, data.refresh_token);
  await saveUser(data.user);
  return data;
}

export async function completeOnboarding(data: {
  full_name: string;
  email?: string;
  user_type: "client" | "technician";
}): Promise<OnboardingResponse> {
  const response = await fetchWithAuth("/auth/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) await handleAPIError(response);

  const responseData: OnboardingResponse = await response.json();
  await saveUser(responseData.user);
  return responseData;
}

export async function getCurrentUser(): Promise<UserResponse> {
  const response = await fetchWithAuth("/auth/me", { method: "GET" });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function refreshToken(): Promise<{ access_token: string; refresh_token: string }> {
  const refreshTokenValue = await SecureStore.getItemAsync("refresh_token");
  if (!refreshTokenValue) throw new Error("No hay refresh token");

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshTokenValue }),
  });

  if (!response.ok) {
    await clearTokens();
    await handleAPIError(response);
  }

  const data = await response.json();
  await saveTokens(data.access_token, data.refresh_token);
  return data;
}

// ============================================
// SERVICE ENDPOINTS
// ============================================

export async function createServiceRequest(data: {
  service_type: string;
  title: string;
  description: string;
  service_address: string;
  service_city: string;
  service_lat: number;
  service_lon: number;
  scheduled_date?: string;
  client_notes?: string;
  estimated_price?: number;
  vehicle_type?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  service_metadata?: Record<string, any>;
}): Promise<any> {
  const response = await fetchWithAuth("/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function getAvailableServices(): Promise<any> {
  const response = await fetchWithAuth("/services/available", { method: "GET" });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function acceptService(serviceId: string): Promise<any> {
  const response = await fetchWithAuth(`/services/${serviceId}/accept`, { method: "POST" });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function getUserServices(): Promise<any> {
  const response = await fetchWithAuth("/services", { method: "GET" });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function getServiceById(serviceId: string): Promise<any> {
  const response = await fetchWithAuth(`/services/${serviceId}`, { method: "GET" });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function cancelService(serviceId: string): Promise<void> {
  const response = await fetchWithAuth(`/services/${serviceId}`, { method: "DELETE" });
  if (!response.ok && response.status !== 204) await handleAPIError(response);
}

export async function updateServiceStatus(serviceId: string, status: string): Promise<any> {
  const response = await fetchWithAuth(`/services/${serviceId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

// ============================================
// GENERIC API CLIENT
// ============================================

export const api = {
  async get(endpoint: string) {
    const res = await fetchWithAuth(endpoint, { method: "GET" });
    if (!res.ok) await handleAPIError(res);
    return { data: await res.json() };
  },
  async post(endpoint: string, data: any) {
    const headers: Record<string, string> = {};
    let body = data;
    if (!(data instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }
    const res = await fetchWithAuth(endpoint, { method: "POST", headers, body });
    if (!res.ok) await handleAPIError(res);
    return { data: await res.json() };
  },
  async put(endpoint: string, data?: any) {
    const fetchOptions: RequestInit = { method: "PUT", headers: {} };
    if (data) {
      if (!(data instanceof FormData)) {
        (fetchOptions.headers as Record<string, string>)["Content-Type"] = "application/json";
        fetchOptions.body = JSON.stringify(data);
      } else {
        fetchOptions.body = data;
      }
    }
    const res = await fetchWithAuth(endpoint, fetchOptions);
    if (!res.ok) await handleAPIError(res);
    return { data: await res.json() };
  },
  async delete(endpoint: string) {
    const res = await fetchWithAuth(endpoint, { method: "DELETE" });
    if (!res.ok) await handleAPIError(res);
    return { data: await res.json() };
  },
};

// ============================================
// HELPERS
// ============================================

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  const user = await getUser();
  return user?.onboarding_completed === true || !!user?.full_name;
}

export { API_URL };
