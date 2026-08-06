/**
 * GeoRank API 类型定义
 * 所有 API 响应的类型定义
 */

// 通用响应结构
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  cursor: number | null;
  has_more: boolean;
}

// 认证相关
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

// 品牌相关
export interface Brand {
  id: number;
  name: string;
  website: string | null;
  industry: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandCreate {
  name: string;
  website?: string;
  industry?: string;
}

export interface BrandUpdate {
  name?: string;
  website?: string;
  industry?: string;
}

export interface BrandProfile {
  id: number;
  brand_id: number;
  description: string | null;
  core_products: string | null;
  target_audience: string | null;
  key_selling_points: string | null;
}

// 内容相关
export type ContentType = 'faq' | 'community_qa' | 'article' | 'press_release';
export type ContentStatus = 'generating' | 'draft' | 'ready' | 'published' | 'failed';

export interface ContentListItem {
  id: number;
  title: string;
  brand_id: number;
  brand_name: string;
  content_type: ContentType;
  status: ContentStatus;
  quality_score: number;
  word_count: number;
  engine: string;
  created_at: string;
  updated_at: string;
}

export interface ContentDetail extends ContentListItem {
  body: string;
  tags: string[];
  target_word_count: number;
  published_at: string | null;
  target_platform: string | null;
  target_platform_url: string | null;
  task_status: string | null;
  task_error: string | null;
}

export interface ContentGenerateRequest {
  brand_id: number;
  content_type: ContentType;
  target_word_count?: number;
  engine?: string;
  custom_instructions?: string;
  language?: string;
}

export interface ContentUpdateRequest {
  title?: string;
  body?: string;
  tags?: string[];
}

export interface RegenerateRequest {
  section_text?: string;
  modification_instructions: string;
}

export interface PublishRequest {
  target_platform?: string;
  platform_url?: string;
  publish_notes?: string;
}

// 订阅相关
export type PlanCode = 'free' | 'pro' | 'agency';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'trialing' | 'active' | 'canceled' | 'past_due';

export interface SubscriptionPlan {
  plan_code: PlanCode;
  name: string;
  price_monthly: number;
  price_yearly: number;
  brand_limit: number;
  query_limit_per_brand: number;
  content_monthly_limit: number;
  engine_limit: number;
  team_members: number;
  api_access: boolean;
  white_label: boolean;
}

export interface UserSubscription {
  plan_code: PlanCode;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  next_billing_date: string | null;
}

// Add-on 相关
export type AddonType = 'brand_slot' | 'query_pack' | 'content_pack';
export type AddonStatus = 'pending' | 'active' | 'expired' | 'cancelled';

export interface AddonPurchase {
  id: number;
  addon_type: AddonType;
  quantity: number;
  amount: number;
  currency: string;
  status: AddonStatus;
  expires_at: string;
  created_at: string;
}

export interface AddonCheckoutRequest {
  addon_type: AddonType;
  quantity: number;
}

// 用量相关
export interface UsageDimension {
  used: number;
  limit: number;
  addon_quota: number;
  total_limit: number;
  unit: string;
}

export interface UsageCurrent {
  plan_code: PlanCode;
  period_start: string;
  period_end: string;
  dimensions: {
    brand: UsageDimension;
    query: UsageDimension;
    content: UsageDimension;
  };
}

// 报告相关
export interface VisibilityReport {
  id: number;
  brand_id: number;
  engine: string;
  query: string;
  visibility_score: number;
  mention_rate: number;
  created_at: string;
}

// 分析相关
export interface AnalysisRun {
  id: number;
  brand_id: number;
  status: string;
  sample_count: number;
  created_at: string;
}

export interface AnalysisResult {
  id: number;
  run_id: number;
  engine: string;
  query: string;
  visibility_score: number;
  mention_rate: number;
}

// 竞品相关
export interface Competitor {
  id: number;
  brand_id: number;
  competitor_id: number;
  competitor_name: string;
  created_at: string;
}

// 团队相关
export type TeamRole = 'owner' | 'admin' | 'member';
export type TeamStatus = 'pending' | 'accepted';

export interface TeamMember {
  id: number;
  user_id: number;
  email: string;
  name: string | null;
  role: TeamRole;
  status: TeamStatus;
  invited_at: string;
  accepted_at: string | null;
}

export interface InviteRequest {
  email: string;
  role: TeamRole;
}

// 账单相关
export interface Invoice {
  id: string;
  amount_paid: number;
  currency: string;
  status: string;
  description: string;
  invoice_url: string | null;
  invoice_pdf: string | null;
  created: number;
  period_start: number;
  period_end: number;
}

// API Key 相关
export interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export interface ApiKeyCreate {
  name: string;
  expires_days: number;
}

export interface ApiKeyCreated extends ApiKey {
  key: string;
}

// 采纳效果相关
export interface AdoptionCheck {
  id: number;
  content_id: number;
  check_type: string;
  check_date: string;
  is_adopted: boolean;
  citation_count: number | null;
  citation_position: number | null;
  citation_accuracy: number | null;
  days_after_publish: number;
  score_before: number | null;
  score_after: number | null;
  score_delta: number | null;
  detail: Record<string, unknown>;
}

export interface AdoptionData {
  platform_indexing: AdoptionCheck[];
  ai_citations: AdoptionCheck[];
  ranking_delta: AdoptionCheck | null;
  timeline: {
    days_after_publish: number;
    status: 'done' | 'pending';
    is_adopted: boolean | null;
    check_date: string | null;
    citation_count: number | null;
  }[];
}
