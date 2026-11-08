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

  const base = API_URL.replace(/\/$/, "");
  let endpointUrl = url;
  if (!url.startsWith("http")) {
    if (base.endsWith("/api") && url.startsWith("/api/")) {
      endpointUrl = `${base.replace(/\/api$/, "")}${url}`;
    } else {
      const cleanPath = url.startsWith("/") ? url : `/${url}`;
      endpointUrl = `${base}${cleanPath}`;
    }
  }
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

export async function verifyFirebaseToken(idToken: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/firebase-verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
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
  user_type: "client" | "technician" | "company_admin"; company_name?: string; nit?: string; city?: string; dispatch_mode?: "manual" | "direct"; organization_id?: string;
}): Promise<OnboardingResponse> {
  const response = await fetchWithAuth("/auth/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) await handleAPIError(response);

  const responseData: OnboardingResponse = await response.json();
  if ((responseData as any).access_token && (responseData as any).refresh_token) { await saveTokens((responseData as any).access_token, (responseData as any).refresh_token); } await saveUser(responseData.user);
  return responseData;
}

export async function getPublicOrganizations(): Promise<{ organizations: Array<{ id: string; name: string; city: string; nit?: string | null }> }> {
  try {
    const response = await fetch(`${API_URL.replace(/\/$/, "")}/organizations/public-list`, { method: "GET" });
    if (!response.ok) return { organizations: [] };
    return response.json();
  } catch {
    return { organizations: [] };
  }
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
// CREDITS / BILLETERA ENDPOINTS
// ============================================

export interface BalanceData {
  balance: number;
  total_recharged: number;
  total_consumed: number;
  free_services_remaining: number;
  can_accept_services: boolean;
  commission_rate: number; welcome_bonus_granted?: boolean; welcome_bonus_amount?: number; is_organization_wallet?: boolean; organization_id?: string | null; organization_name?: string | null; org_wallet_balance?: number | null; credit_quota?: number | null; quota_used?: number | null; quota_remaining?: number | null; dispatch_mode?: "manual" | "direct" | null;
}

export interface CreditTransaction {
  id: string;
  technician_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  service_id: string | null;
  description: string;
  external_reference: string | null;
  created_at: string;
}

export async function getCreditBalance(): Promise<BalanceData> {
  const response = await fetchWithAuth("/credits/balance", { method: "GET" });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function getCreditTransactions(skip = 0, limit = 50): Promise<CreditTransaction[]> {
  const safeSkip = Math.max(0, Number(skip) || 0);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
  const response = await fetchWithAuth(`/credits/transactions?skip=${safeSkip}&limit=${safeLimit}`, {
    method: "GET",
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function rechargeCredits(
  amount: number,
  externalReference?: string,
  paymentMethod?: string
): Promise<CreditTransaction> {
  const safeAmount = Math.max(10000, Number(amount) || 50000);
  const response = await fetchWithAuth("/credits/recharge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: safeAmount,
      external_reference: externalReference,
      payment_method: paymentMethod,
    }),
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function rechargeCreditsIntent(
  amount: number,
  paymentMethod: string = "pse"
): Promise<{
  transaction_id: string;
  status: string;
  amount: number;
  payment_method: string;
}> {
  const safeAmount = Math.max(10000, Number(amount) || 50000);
  const response = await fetchWithAuth("/credits/recharge/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: safeAmount, payment_method: paymentMethod || "pse" }),
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function rechargeCreditsConfirm(
  transactionId: string,
  amount?: number,
  paymentMethod: string = "pse"
): Promise<{
  transaction_id: string;
  status: string;
  amount: number;
  balance_after: number;
  message: string;
}> {
  const safeAmount = Math.max(10000, Number(amount) || 50000);
  const response = await fetchWithAuth("/credits/recharge/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transaction_id: transactionId,
      amount: safeAmount,
      payment_method: paymentMethod || "pse",
    }),
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

// ============================================
// DIGITAL PAYMENTS & DIAN ENDPOINTS
// ============================================

export async function createDigitalPaymentIntent(
  serviceId: string,
  amount: number,
  paymentMethod: string = "pse"
): Promise<{
  transaction_id: string;
  status: string;
  amount: number;
  payment_method: string;
}> {
  const response = await fetchWithAuth("/payments/digital/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      amount: Number(amount),
      payment_method: paymentMethod,
    }),
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function confirmDigitalPayment(
  transactionId: string
): Promise<{
  transaction_id: string;
  status: string;
  service_id: string;
  amount: number;
  invoice_number?: string;
  cufe?: string;
  pdf_url?: string;
  qr_url?: string;
}> {
  const response = await fetchWithAuth("/payments/digital/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction_id: transactionId }),
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function getPaymentByServiceId(serviceId: string): Promise<any> {
  const response = await fetchWithAuth(`/payments/service/${serviceId}`, {
    method: "GET",
  });
  if (!response.ok) return null;
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
// ESCUELA TEC COURSES & CERTIFICATES
// ============================================

export interface CourseListItem {
  id: string;
  title: string;
  slug: string;
  description?: string;
  category: string;
  thumbnail_url?: string;
  difficulty: string;
  estimated_hours: number;
  instructor_name?: string;
  is_published: boolean;
  is_paid: boolean;
  price: number;
  is_required_for_technicians: boolean;
  rank_points_reward: number;
  badge_name?: string;
  badge_icon?: string;
  sort_order: number;
  enrolled_count: number;
  rating: number;
  lessons_count: number;
  is_enrolled: boolean;
  progress_pct: number;
  is_completed: boolean;
}

export interface LessonSummary {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  video_duration_seconds: number;
  sort_order: number;
  is_free_preview: boolean;
  is_completed: boolean;
}

export interface CourseDetailResponse extends CourseListItem {
  lessons: LessonSummary[];
  enrollment_status?: string | null;
  completed_lessons: number;
  quiz_passed: boolean;
  certificate_code?: string | null;
}

export interface LessonDetail {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  content_markdown?: string | null;
  video_url?: string | null;
  video_duration_seconds: number;
  sort_order: number;
  is_free_preview: boolean;
  is_completed: boolean;
  next_lesson_slug?: string | null;
  prev_lesson_slug?: string | null;
}

export interface QuizQuestionItem {
  id: string;
  question_text: string;
  options: string[];
  sort_order: number;
}

export interface QuizEvaluationResult {
  score: number;
  passed: boolean;
  total_questions: number;
  correct_answers: number;
  required_score: number;
  certificate_code?: string | null;
  rank_points_awarded: number;
  badge_awarded?: string | null;
  message: string;
}

export interface CertificateInfo {
  certificate_code: string;
  student_name: string;
  course_title: string;
  category: string;
  completion_date: string;
  score: number;
  instructor_name: string;
  is_valid: boolean;
}

export async function getCoursesList(params?: {
  category?: string;
  difficulty?: string;
  search?: string;
  is_required?: boolean;
}): Promise<CourseListItem[]> {
  const query = new URLSearchParams();
  if (params?.category && params.category !== "all") query.append("category", params.category);
  if (params?.difficulty && params.difficulty !== "all") query.append("difficulty", params.difficulty);
  if (params?.search) query.append("search", params.search);
  if (params?.is_required !== undefined) query.append("is_required", String(params.is_required));
  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await fetchWithAuth(`/courses${qs}`);
  if (!res.ok) await handleAPIError(res);
  return res.json();
}

export async function getMyCoursesList(): Promise<any[]> {
  const res = await fetchWithAuth("/courses/my-courses");
  if (!res.ok) await handleAPIError(res);
  return res.json();
}

export async function getCourseDetailBySlug(slug: string): Promise<CourseDetailResponse> {
  const res = await fetchWithAuth(`/courses/${slug}`);
  if (!res.ok) await handleAPIError(res);
  return res.json();
}

export async function getLessonDetailBySlug(slug: string, lessonSlug: string): Promise<LessonDetail> {
  const res = await fetchWithAuth(`/courses/${slug}/lessons/${lessonSlug}`);
  if (!res.ok) await handleAPIError(res);
  return res.json();
}

export async function enrollInCourse(slug: string): Promise<any> {
  const res = await fetchWithAuth(`/courses/${slug}/enroll`, { method: "POST" });
  if (!res.ok) await handleAPIError(res);
  return res.json();
}

export async function completeLesson(slug: string, lessonId: string): Promise<{
  success: boolean;
  completed: boolean;
  completed_lessons: number;
  total_lessons: number;
  progress_pct: number;
  can_take_quiz: boolean;
}> {
  const res = await fetchWithAuth(`/courses/${slug}/lessons/${lessonId}/complete`, { method: "POST" });
  if (!res.ok) await handleAPIError(res);
  return res.json();
}

export async function getCourseQuizQuestions(slug: string): Promise<QuizQuestionItem[]> {
  const res = await fetchWithAuth(`/courses/${slug}/quiz`);
  if (!res.ok) await handleAPIError(res);
  return res.json();
}

export async function submitQuizAnswers(
  slug: string,
  answers: { question_id: string; selected_option_index: number }[]
): Promise<QuizEvaluationResult> {
  const res = await fetchWithAuth(`/courses/${slug}/quiz/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) await handleAPIError(res);
  return res.json();
}

export async function getCertificateDetails(certificateCode: string): Promise<CertificateInfo> {
  const res = await fetchWithAuth(`/courses/certificates/${certificateCode}`);
  if (!res.ok) await handleAPIError(res);
  return res.json();
}

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

const BASIC_COURSES_MODAL_KEY_PREFIX = "tec360_basic_courses_seen_";

export async function hasSeenBasicCoursesModal(userId?: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const val = await SecureStore.getItemAsync(`${BASIC_COURSES_MODAL_KEY_PREFIX}${userId}`);
    return val === "true";
  } catch {
    return false;
  }
}

export async function markSeenBasicCoursesModal(userId?: string): Promise<void> {
  if (!userId) return;
  try {
    await SecureStore.setItemAsync(`${BASIC_COURSES_MODAL_KEY_PREFIX}${userId}`, "true");
  } catch (e) {
    console.error("Failed to mark basic courses modal as seen", e);
  }
}

export { API_URL };



// ============================================
// DESPACHO INTELIGENTE (FASES A, B, C)
// ============================================

export interface DispatchOffer {
  id: string;
  service_id: string;
  technician_id: string;
  wave: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  score: number;
  distance_km?: number | null;
  offered_at: string;
  expires_at: string;
  responded_at?: string | null;
  time_left_seconds?: number | null;

  // Contexto del servicio
  service_title?: string | null;
  service_type?: string | null;
  service_address?: string | null;
  service_city?: string | null;
  estimated_price?: number | null;
  vehicle_type?: string | null;
  vehicle_model?: string | null;
  vehicle_plate?: string | null;
}

export interface DispatchOfferListResponse {
  offers: DispatchOffer[];
  total: number;
}

export interface DispatchOfferActionResponse {
  success: boolean;
  offer_id: string;
  status: string;
  message: string;
  service_id: string;
  service_status?: string | null;
}

export interface DemandHotspot {
  zone_name: string;
  center_lat: number;
  center_lng: number;
  active_requests_count: number;
  urgency_level: 'high' | 'medium' | 'normal';
  recommendation: string;
}

export interface DemandHotspotsResponse {
  hotspots: DemandHotspot[];
  total: number;
}

export async function getMyDispatchOffers(): Promise<DispatchOfferListResponse> {
  const response = await fetchWithAuth('/dispatch/my-offers', { method: 'GET' });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function acceptDispatchOffer(offerId: string): Promise<DispatchOfferActionResponse> {
  const response = await fetchWithAuth('/dispatch/offers/' + offerId + '/accept', { method: 'POST' });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function rejectDispatchOffer(offerId: string): Promise<DispatchOfferActionResponse> {
  const response = await fetchWithAuth('/dispatch/offers/' + offerId + '/reject', { method: 'POST' });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function getDemandHotspots(): Promise<DemandHotspotsResponse> {
  const response = await fetchWithAuth('/dispatch/analytics/hotspots', { method: 'GET' });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

// ============================================
// TALLERES / CUENTAS EMPRESA (ORGANIZATIONS)
// ============================================

export interface OrganizationMemberInfo {
  id: string;
  user_id: string;
  full_name?: string | null;
  phone: string;
  email?: string | null;
  org_role: 'owner' | 'manager' | 'technician';
  status: string;
  credit_quota: number | null;
  quota_used: number;
  quota_remaining: number | null;
  courses_validated_by_org: boolean;
  technician_id?: string | null;
  is_available?: boolean | null;
  is_verified?: boolean | null;
  rank?: string | null;
  average_rating?: number | null;
  total_services?: number | null;
}

export interface OrganizationDashboardData {
  id: string;
  name: string;
  nit?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city: string;
  owner_user_id: string;
  dispatch_mode: 'manual' | 'direct';
  wallet_balance: number;
  total_recharged: number;
  total_consumed: number;
  welcome_bonus_granted: boolean;
  welcome_bonus_amount: number;
  is_active: boolean;
  my_org_role: 'owner' | 'manager' | 'technician';
  my_credit_quota: number | null;
  my_quota_used: number;
  members_count: number;
  technicians_count: number;
  members: OrganizationMemberInfo[];
}

export async function registerOrganization(payload: {
  name: string;
  nit?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  dispatch_mode?: 'manual' | 'direct';
}): Promise<OrganizationDashboardData> {
  const response = await fetchWithAuth('/organizations/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function getMyOrganization(): Promise<OrganizationDashboardData> {
  const response = await fetchWithAuth('/organizations/me', { method: 'GET' });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function updateMyOrganization(payload: {
  name?: string;
  nit?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  dispatch_mode?: 'manual' | 'direct';
}): Promise<OrganizationDashboardData> {
  const response = await fetchWithAuth('/organizations/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function addOrganizationMember(payload: {
  phone: string;
  full_name: string;
  email?: string;
  org_role?: 'manager' | 'technician';
  credit_quota?: number | null;
  validate_courses_immediately?: boolean;
}): Promise<{ success: boolean; message: string; member: OrganizationMemberInfo }> {
  const response = await fetchWithAuth('/organizations/me/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function updateMemberQuota(
  memberId: string,
  payload: { credit_quota: number | null; reset_used?: boolean }
): Promise<{
  success: boolean;
  member_id: string;
  credit_quota: number | null;
  quota_used: number;
  quota_remaining: number | null;
}> {
  const response = await fetchWithAuth(`/organizations/me/members/${memberId}/quota`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function removeOrganizationMember(memberId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetchWithAuth(`/organizations/me/members/${memberId}`, {
    method: 'DELETE',
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function validateMemberCourses(
  memberId: string
): Promise<{ success: boolean; message: string; member_id: string; courses_validated_by_org: boolean }> {
  const response = await fetchWithAuth(`/organizations/me/members/${memberId}/validate-courses`, {
    method: 'POST',
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function rechargeOrganizationWallet(payload: {
  amount: number;
  payment_method?: string;
  external_reference?: string;
}): Promise<{
  success: boolean;
  message: string;
  organization_id: string;
  amount: number;
  wallet_balance: number;
  total_recharged: number;
}> {
  const response = await fetchWithAuth('/organizations/me/wallet/recharge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function getOrganizationServices(): Promise<{
  organization_id: string;
  dispatch_mode: 'manual' | 'direct';
  available_services: any[];
  team_services: any[];
}> {
  const response = await fetchWithAuth('/organizations/me/services', { method: 'GET' });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}

export async function assignServiceToMember(
  serviceId: string,
  technicianUserId: string
): Promise<{
  success: boolean;
  message: string;
  service_id: string;
  assigned_technician_user_id: string;
  assigned_technician_name?: string;
  status: string;
}> {
  const response = await fetchWithAuth(`/organizations/me/services/${serviceId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ technician_user_id: technicianUserId }),
  });
  if (!response.ok) await handleAPIError(response);
  return response.json();
}


