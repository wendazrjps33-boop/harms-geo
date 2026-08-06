/**
 * GeoRank API 客户端
 * 类型化的 API 请求函数
 */

import { getToken, removeToken } from '@/app/services/auth';
import type {
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  UserProfile,
  Brand,
  BrandCreate,
  BrandUpdate,
  BrandProfile,
  ContentListItem,
  ContentDetail,
  ContentGenerateRequest,
  ContentUpdateRequest,
  RegenerateRequest,
  PublishRequest,
  SubscriptionPlan,
  UserSubscription,
  AddonPurchase,
  AddonCheckoutRequest,
  UsageCurrent,
  VisibilityReport,
  AnalysisRun,
  Competitor,
  TeamMember,
  InviteRequest,
  Invoice,
  ApiKey,
  ApiKeyCreate,
  ApiKeyCreated,
  AdoptionData,
} from '@/types/api';

let csrfToken: string | null = null;
let csrfTokenExpiry = 0;
let redirecting = false;

async function getCsrfToken(): Promise<string | null> {
  if (csrfToken && Date.now() < csrfTokenExpiry) return csrfToken;

  try {
    const response = await fetch('/api/public/csrf-token', {
      method: 'GET',
      credentials: 'include',
    });
    const data = await response.json();
    csrfToken = data.csrf_token;
    csrfTokenExpiry = Date.now() + 55 * 60 * 1000;
    return csrfToken;
  } catch {
    csrfToken = null;
    return null;
  }
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

interface RequestError extends Error {
  status?: number;
  data?: unknown;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const method = options.method?.toUpperCase() || 'GET';
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrf = getCookie('csrf_token') || (await getCsrfToken());
    if (csrf) {
      headers['X-CSRF-Token'] = csrf;
    }
  }

  const response = await fetch(url, { ...options, headers, credentials: 'include' });

  if (response.status === 401) {
    removeToken();
    if (typeof window !== 'undefined' && !redirecting) {
      redirecting = true;
      setTimeout(() => {
        redirecting = false;
      }, 5000);
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error: RequestError = new Error('Request failed');
    error.status = response.status;
    try {
      error.data = await response.json();
    } catch {}
    throw error;
  }

  if (response.status === 204) return null as T;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return response as unknown as T;
  return response.json();
}

// ──────────────────── 认证 API ────────────────────

export const authAPI = {
  login: (credentials: LoginRequest): Promise<ApiResponse<TokenResponse>> =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),

  register: (userData: RegisterRequest): Promise<ApiResponse<TokenResponse>> =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(userData) }),

  profile: (): Promise<ApiResponse<UserProfile>> => request('/api/auth/profile'),
};

// ──────────────────── 品牌 API ────────────────────

export const brandAPI = {
  getAll: (): Promise<ApiResponse<Brand[]>> => request('/api/brands'),

  getById: (id: number): Promise<ApiResponse<Brand>> => request(`/api/brands/${id}`),

  create: (data: BrandCreate): Promise<ApiResponse<Brand>> =>
    request('/api/brands', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: BrandUpdate): Promise<ApiResponse<Brand>> =>
    request(`/api/brands/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: number): Promise<ApiResponse<void>> =>
    request(`/api/brands/${id}`, { method: 'DELETE' }),

  analytics: (id: number): Promise<ApiResponse<unknown>> =>
    request(`/api/brands/${id}/analytics`),

  competitors: (id: number): Promise<ApiResponse<Competitor[]>> =>
    request(`/api/brands/${id}/competitors`),
};

// ──────────────────── 品牌资料 API ────────────────────

export const brandProfileAPI = {
  get: (brandId: number): Promise<ApiResponse<BrandProfile>> =>
    request(`/api/brands/${brandId}/profile`),

  update: (brandId: number, data: Partial<BrandProfile>): Promise<ApiResponse<BrandProfile>> =>
    request(`/api/brands/${brandId}/profile`, { method: 'PUT', body: JSON.stringify(data) }),
};

// ──────────────────── 内容 API ────────────────────

export const contentAPI = {
  generate: (data: ContentGenerateRequest): Promise<ApiResponse<{ task_id: string; content_id: number }>> =>
    request('/api/content/generate', { method: 'POST', body: JSON.stringify(data) }),

  list: (
    params: Record<string, string | number | undefined> = {},
    fetchOptions?: RequestInit
  ): Promise<ApiResponse<ContentListItem[]>> => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value));
    });
    return request(`/api/content?${searchParams.toString()}`, fetchOptions || {});
  },

  getStats: (brandId?: number): Promise<ApiResponse<unknown>> => {
    const params = brandId ? `?brand_id=${brandId}` : '';
    return request(`/api/content/stats${params}`);
  },

  getById: (id: number, fetchOptions?: RequestInit): Promise<ApiResponse<ContentDetail>> =>
    request(`/api/content/${id}`, fetchOptions || {}),

  update: (id: number, data: ContentUpdateRequest): Promise<ApiResponse<ContentDetail>> =>
    request(`/api/content/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  regenerate: (id: number, data: RegenerateRequest): Promise<ApiResponse<{ task_id: string }>> =>
    request(`/api/content/${id}/regenerate`, { method: 'POST', body: JSON.stringify(data) }),

  confirm: (id: number): Promise<ApiResponse<{ status: string }>> =>
    request(`/api/content/${id}/confirm`, { method: 'POST' }),

  publish: (id: number, data: PublishRequest): Promise<ApiResponse<{ status: string }>> =>
    request(`/api/content/${id}/publish`, { method: 'POST', body: JSON.stringify(data) }),

  getAdoption: (id: number): Promise<ApiResponse<AdoptionData>> =>
    request(`/api/content/${id}/adoption`),
};

// ──────────────────── 订阅 API ────────────────────

export const subscriptionAPI = {
  getPlans: (): Promise<ApiResponse<{ plans: SubscriptionPlan[] }>> =>
    request('/api/subscription/plans'),

  getCurrent: (): Promise<ApiResponse<{ subscription: UserSubscription }>> =>
    request('/api/subscription/current'),

  createCheckout: (data: {
    plan_code: string;
    billing_cycle: string;
  }): Promise<ApiResponse<{ checkout_url: string }>> =>
    request('/api/subscription/checkout', { method: 'POST', body: JSON.stringify(data) }),

  cancel: (): Promise<ApiResponse<{ message: string }>> =>
    request('/api/subscription/cancel', { method: 'POST' }),

  reactivate: (): Promise<ApiResponse<{ message: string }>> =>
    request('/api/subscription/reactivate', { method: 'POST' }),

  changePlan: (data: { new_plan: string }): Promise<ApiResponse<{ message: string }>> =>
    request('/api/subscription/change-plan', { method: 'POST', body: JSON.stringify(data) }),

  // Add-on
  createAddonCheckout: (data: AddonCheckoutRequest): Promise<ApiResponse<{ checkout_url: string; session_id: string }>> =>
    request('/api/subscription/addon/checkout', { method: 'POST', body: JSON.stringify(data) }),

  getAddons: (): Promise<ApiResponse<{ addons: AddonPurchase[]; total: number; summary: Record<string, number> }>> =>
    request('/api/subscription/addons'),
};

// ──────────────────── 用量 API ────────────────────

export const usageAPI = {
  getCurrent: (): Promise<ApiResponse<UsageCurrent>> => request('/api/usage/current'),

  getHistory: (): Promise<ApiResponse<unknown>> => request('/api/usage/history'),
};

// ──────────────────── 报告 API ────────────────────

export const reportAPI = {
  check: (data: { brand_id: number; engine: string; query: string }): Promise<ApiResponse<VisibilityReport>> =>
    request('/api/reports/check', { method: 'POST', body: JSON.stringify(data) }),

  checkAll: (brandId: number): Promise<ApiResponse<unknown>> =>
    request(`/api/reports/brand/${brandId}/check-all`, { method: 'POST' }),

  getByBrand: (brandId: number): Promise<ApiResponse<VisibilityReport[]>> =>
    request(`/api/reports/brand/${brandId}`),

  getLatest: (brandId: number): Promise<ApiResponse<VisibilityReport>> =>
    request(`/api/reports/brand/${brandId}/latest`),

  export: async (brandId: number, format: string = 'csv', lang: string = 'en'): Promise<void> => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const csrf = getCookie('csrf_token') || (await getCsrfToken());
    if (csrf) headers['X-CSRF-Token'] = csrf;

    const response = await fetch(
      `/api/reports/brand/${brandId}/export?format=${format}&lang=${lang}`,
      { headers, credentials: 'include' }
    );

    if (response.status === 401) {
      removeToken();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const disposition = response.headers.get('Content-Disposition') || '';
    const rfc5987 = disposition.match(/filename\*=UTF-8''(.+)/);
    const simple = disposition.match(/filename="(.+)"/);
    const filename = rfc5987
      ? decodeURIComponent(rfc5987[1])
      : simple?.[1] || `report.${format}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

// ──────────────────── 分析 API ────────────────────

export const analysisAPI = {
  startRun: (brandId: number, data: unknown): Promise<ApiResponse<AnalysisRun>> =>
    request(`/api/analysis/brand/${brandId}/run`, { method: 'POST', body: JSON.stringify(data) }),

  getRuns: (brandId: number, fetchOptions?: RequestInit): Promise<ApiResponse<AnalysisRun[]>> =>
    request(`/api/analysis/brand/${brandId}/runs`, fetchOptions || {}),

  getRunDetail: (runId: number): Promise<ApiResponse<unknown>> =>
    request(`/api/analysis/runs/${runId}`),

  getRunSummary: (runId: number): Promise<ApiResponse<unknown>> =>
    request(`/api/analysis/runs/${runId}/summary`),

  compareRuns: (brandId: number, runIds: number[]): Promise<ApiResponse<unknown>> =>
    request(`/api/analysis/brand/${brandId}/compare?run_ids=${runIds.join(',')}`),

  exportAnalysis: async (
    brandId: number,
    runId: number,
    format: string = 'csv',
    lang: string = 'en'
  ): Promise<void> => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const csrf = getCookie('csrf_token') || (await getCsrfToken());
    if (csrf) headers['X-CSRF-Token'] = csrf;

    const response = await fetch(
      `/api/analysis/brand/${brandId}/runs/${runId}/export?format=${format}&lang=${lang}`,
      { headers, credentials: 'include' }
    );

    if (response.status === 401) {
      removeToken();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const disposition = response.headers.get('Content-Disposition') || '';
    const rfc5987 = disposition.match(/filename\*=UTF-8''(.+)/);
    const simple = disposition.match(/filename="(.+)"/);
    const filename = rfc5987
      ? decodeURIComponent(rfc5987[1])
      : simple?.[1] || `analysis.${format}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

// ──────────────────── 竞品 API ────────────────────

export const competitorAPI = {
  add: (brandId: number, competitorId: number): Promise<ApiResponse<Competitor>> =>
    request(`/api/brands/${brandId}/competitors`, {
      method: 'POST',
      body: JSON.stringify({ competitor_id: competitorId }),
    }),

  remove: (brandId: number, competitorId: number): Promise<ApiResponse<void>> =>
    request(`/api/brands/${brandId}/competitors/${competitorId}`, { method: 'DELETE' }),

  list: (brandId: number): Promise<ApiResponse<Competitor[]>> =>
    request(`/api/brands/${brandId}/competitors`),

  startComparison: (brandId: number, data: unknown): Promise<ApiResponse<unknown>> =>
    request(`/api/competitor-analysis/brand/${brandId}/compare`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getResults: (brandId: number): Promise<ApiResponse<unknown>> =>
    request(`/api/competitor-analysis/brand/${brandId}/results`),

  getHistory: (brandId: number): Promise<ApiResponse<unknown>> =>
    request(`/api/competitor-analysis/brand/${brandId}/history`),
};

// ──────────────────── 团队 API ────────────────────

export const teamAPI = {
  getMembers: (): Promise<ApiResponse<{ members: TeamMember[]; total: number }>> =>
    request('/api/team/members'),

  invite: (data: InviteRequest): Promise<ApiResponse<TeamMember>> =>
    request('/api/team/invite', { method: 'POST', body: JSON.stringify(data) }),

  updateRole: (memberId: number, data: { role: string }): Promise<ApiResponse<{ id: number; role: string }>> =>
    request(`/api/team/${memberId}/role`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (memberId: number): Promise<ApiResponse<{ id: number; status: string }>> =>
    request(`/api/team/${memberId}`, { method: 'DELETE' }),
};

// ──────────────────── 账单 API ────────────────────

export const billingAPI = {
  getHistory: (): Promise<ApiResponse<{ invoices: Invoice[]; total: number }>> =>
    request('/api/billing/history'),

  getInvoice: (invoiceId: string): Promise<ApiResponse<Invoice>> =>
    request(`/api/billing/invoices/${invoiceId}`),

  downloadInvoice: (invoiceId: string): Promise<ApiResponse<{ invoice_id: string; pdf_url: string }>> =>
    request(`/api/billing/invoices/${invoiceId}/download`),
};

// ──────────────────── API Key API ────────────────────

export const apiKeyAPI = {
  list: (): Promise<ApiResponse<{ keys: ApiKey[]; total: number }>> =>
    request('/api/api-keys'),

  create: (data: ApiKeyCreate): Promise<ApiResponse<ApiKeyCreated>> =>
    request('/api/api-keys', { method: 'POST', body: JSON.stringify(data) }),

  revoke: (keyId: number): Promise<ApiResponse<{ id: number; status: string }>> =>
    request(`/api/api-keys/${keyId}`, { method: 'DELETE' }),

  rotate: (keyId: number): Promise<ApiResponse<ApiKeyCreated>> =>
    request(`/api/api-keys/${keyId}/rotate`, { method: 'POST' }),
};

// ──────────────────── 爬虫 API ────────────────────

export const crawlerAPI = {
  analyze: (data: { brand_id: number; url: string }): Promise<ApiResponse<unknown>> =>
    request('/api/crawler/analyze', { method: 'POST', body: JSON.stringify(data) }),
};
