# API 契约 · GeoRank 商业化 MVP

## 协议规范

- **协议**：REST (HTTP/JSON)
- **命名规范**：snake_case（请求/响应 body），kebab-case（URL 路径）
- **认证**：Bearer JWT（现有 auth 模块），API Key 认证（Agency API 接入）
- **错误码方案**：HTTP 状态码 + 统一错误体
- **响应包装结构**：

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

错误响应：
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "品牌数量已达当前计划上限",
    "details": { "current": 1, "limit": 1, "plan": "free" }
  }
}
```

- **分页模式**：Offset 分页（小数据集），游标分页（内容列表等大数据集）

```json
// Offset 分页
GET /api/brands?page=1&page_size=20

// 响应
{
  "success": true,
  "data": {
    "items": [...],
    "total": 45,
    "page": 1,
    "page_size": 20,
    "total_pages": 3
  }
}

// 游标分页
GET /api/content?cursor=abc123&limit=20

// 响应
{
  "success": true,
  "data": {
    "items": [...],
    "next_cursor": "def456",
    "has_more": true
  }
}
```

---

## 全局错误码

| HTTP | code | 说明 |
|------|------|------|
| 400 | VALIDATION_ERROR | 请求参数校验失败 |
| 401 | UNAUTHORIZED | 未认证或 Token 过期 |
| 403 | FEATURE_NOT_AVAILABLE | 当前计划不支持该功能 |
| 402 | QUOTA_EXCEEDED | 用量配额已用完 |
| 404 | RESOURCE_NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 状态冲突（如重复订阅） |
| 429 | RATE_LIMITED | 请求频率超限 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

---

## 接口详情

---

### GET /api/subscription/plans

**认证**：无需认证

**响应 200**：
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "plan_code": "free",
        "name": "Free",
        "price_monthly": 0,
        "price_yearly": 0,
        "brand_limit": 1,
        "query_limit_per_brand": 5,
        "engine_limit": 2,
        "allowed_engines": ["openai", "deepseek"],
        "check_interval_hours": 0,
        "history_days": 7,
        "competitor_limit": 0,
        "content_monthly_limit": 0,
        "content_types_allowed": [],
        "team_members": 1,
        "api_access": false,
        "white_label": false,
        "report_watermark": true
      },
      {
        "plan_code": "pro",
        "name": "Pro",
        "price_monthly": 49.00,
        "price_yearly": 470.40,
        "brand_limit": 5,
        "query_limit_per_brand": 20,
        "engine_limit": 6,
        "allowed_engines": ["openai", "claude", "gemini", "deepseek", "qianwen", "mimo"],
        "check_interval_hours": 24,
        "history_days": 90,
        "competitor_limit": 3,
        "content_monthly_limit": 10,
        "content_types_allowed": ["faq", "community_qa", "article", "press_release"],
        "team_members": 1,
        "api_access": false,
        "white_label": false,
        "report_watermark": false
      },
      {
        "plan_code": "agency",
        "name": "Agency",
        "price_monthly": 199.00,
        "price_yearly": 1910.40,
        "brand_limit": 25,
        "query_limit_per_brand": 50,
        "engine_limit": 6,
        "allowed_engines": ["openai", "claude", "gemini", "deepseek", "qianwen", "mimo"],
        "check_interval_hours": 4,
        "history_days": 365,
        "competitor_limit": 10,
        "content_monthly_limit": 50,
        "content_types_allowed": ["faq", "community_qa", "article", "press_release"],
        "team_members": 5,
        "api_access": true,
        "white_label": true,
        "report_watermark": false
      }
    ]
  },
  "error": null
}
```

---

### GET /api/subscription/current

**认证**：Bearer JWT

**响应 200**：
```json
{
  "success": true,
  "data": {
    "subscription": {
      "plan_code": "pro",
      "plan_name": "Pro",
      "status": "active",
      "billing_cycle": "monthly",
      "current_period_start": "2026-05-01T00:00:00Z",
      "current_period_end": "2026-06-01T00:00:00Z",
      "cancel_at_period_end": false,
      "trial_end": null,
      "price": 49.00,
      "next_billing_date": "2026-06-01T00:00:00Z"
    },
    "usage": {
      "brands": { "used": 3, "limit": 5 },
      "queries": { "used": 48, "limit": 100 },
      "content": { "used": 7, "limit": 10 }
    }
  },
  "error": null
}
```

---

### POST /api/subscription/checkout

**认证**：Bearer JWT

**请求**：
```json
{
  "plan_code": "pro",           // required, enum: ["pro", "agency"]
  "billing_cycle": "monthly"    // required, enum: ["monthly", "yearly"]
}
```

**校验规则**：
- `plan_code`：必填，只能是 "pro" 或 "agency"
- `billing_cycle`：必填，只能是 "monthly" 或 "yearly"

**响应 200**：
```json
{
  "success": true,
  "data": {
    "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_xxx",
    "session_id": "cs_test_xxx"
  },
  "error": null
}
```

**错误**：
- 409 CONFLICT：`{"code": "CONFLICT", "message": "已有活跃订阅，请先取消当前订阅", "details": {"current_plan": "pro"}}`
- 400 VALIDATION_ERROR：`{"code": "VALIDATION_ERROR", "message": "无效的计划编码", "details": {"field": "plan_code", "value": "invalid"}}`

---

### POST /api/subscription/webhook

**认证**：Stripe 签名验证（`Stripe-Signature` header，非 JWT）

**请求**：Stripe Event JSON（原始 body）

**响应 200**：
```json
{ "received": true }
```

**处理事件**：
- `checkout.session.completed` → 激活订阅，更新 user_subscriptions
- `invoice.payment_succeeded` → 续费成功，更新 current_period
- `invoice.payment_failed` → 标记 status=past_due
- `customer.subscription.deleted` → 降级为 free，清除 stripe 订阅 ID

**幂等性**：使用 `event.id` 去重，已处理的事件直接返回 200。

---

### POST /api/subscription/cancel

**认证**：Bearer JWT

**请求**：无 body

**响应 200**：
```json
{
  "success": true,
  "data": {
    "cancel_at_period_end": true,
    "current_period_end": "2026-06-01T00:00:00Z",
    "message": "订阅将在当前计费周期结束后取消"
  },
  "error": null
}
```

**错误**：
- 404 RESOURCE_NOT_FOUND：无活跃订阅

---

### POST /api/subscription/reactivate

**认证**：Bearer JWT

**请求**：无 body

**响应 200**：
```json
{
  "success": true,
  "data": {
    "status": "active",
    "cancel_at_period_end": false,
    "message": "订阅已恢复"
  },
  "error": null
}
```

**错误**：
- 409 CONFLICT：订阅未处于取消状态

---

### POST /api/subscription/change-plan

**认证**：Bearer JWT

**请求**：
```json
{
  "new_plan_code": "agency"   // required, enum: ["free", "pro", "agency"]
}
```

**响应 200**：
```json
{
  "success": true,
  "data": {
    "previous_plan": "pro",
    "new_plan": "agency",
    "effective_date": "2026-05-25T00:00:00Z",
    "proration_credit": 12.33,
    "new_charge": 186.67,
    "message": "计划已变更，差额已按比例计算"
  },
  "error": null
}
```

**规则**：
- 升级（pro→agency）：立即生效，按比例补差价
- 降级（agency→pro）：当前周期结束时生效
- 降级到 free：等同于 cancel

---

### GET /api/usage/current

**认证**：Bearer JWT

**响应 200**：
```json
{
  "success": true,
  "data": {
    "plan_code": "pro",
    "period_start": "2026-05-01T00:00:00Z",
    "period_end": "2026-06-01T00:00:00Z",
    "dimensions": {
      "brand": { "used": 3, "limit": 5, "unit": "个" },
      "query": { "used": 48, "limit": 100, "unit": "个" },
      "check": { "used": 1250, "limit": -1, "unit": "次" },
      "content": { "used": 7, "limit": 10, "unit": "篇" }
    }
  },
  "error": null
}
```

**说明**：`limit: -1` 表示无限制。

---

### GET /api/usage/history

**认证**：Bearer JWT

**查询参数**：
- `dimension`：可选，筛选维度（brand/query/check/content）
- `months`：可选，返回最近 N 个月，默认 6

**响应 200**：
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "period_start": "2026-05-01T00:00:00Z",
        "period_end": "2026-06-01T00:00:00Z",
        "dimensions": {
          "brand": { "used": 3, "limit": 5 },
          "query": { "used": 48, "limit": 100 },
          "check": { "used": 1250, "limit": -1 },
          "content": { "used": 7, "limit": 10 }
        }
      }
    ]
  },
  "error": null
}
```

---

### POST /api/content/generate

**认证**：Bearer JWT

**功能门控**：Pro/Agency 计划

**行为**：异步任务模式 — 创建占位记录后立即返回，后台线程执行 AI 生成。

**请求**：
```json
{
  "brand_id": 42,                                        // required, int, > 0
  "content_type": "article",                             // required, enum: ["faq", "community_qa", "article", "press_release"]
  "custom_instructions": "重点突出AI搜索优化的数据支撑",   // optional, string, ≤500 字
  "target_word_count": 1000,                              // optional, int, ≥500, default 1000
  "engine": "mimo"                                        // optional, enum: ["mimo","deepseek","openai","qianwen","claude","gemini"], default "mimo"
}
```

**校验规则**：
- `brand_id`：必填，正整数，必须属于当前用户
- `content_type`：必填，必须在当前计划 `content_types_allowed` 中
- `custom_instructions`：可选，≤500 字
- `target_word_count`：可选，整数，最小 500，最大无限制，默认 1000
- `engine`：可选，枚举值，默认 "mimo"

**响应 202 Accepted**：
```json
{
  "success": true,
  "data": {
    "task_id": "content-123",
    "content_id": 123,
    "status": "generating",
    "message": "内容生成中..."
  },
  "error": null
}
```

**后续轮询**：前端通过 `GET /api/content/{content_id}` 轮询状态，当 `status` 从 `generating` 变为 `draft`（成功）或 `failed`（失败）时停止。

**错误**：
- 409 CONFLICT：`{"detail": "已有内容正在生成中，请稍候"}` — 同品牌有正在进行的生成任务
- 402 QUOTA_EXCEEDED：`{"code": "QUOTA_EXCEEDED", "message": "本月内容生成配额已用完", "details": {"used": 10, "limit": 10}}`
- 403 FEATURE_NOT_AVAILABLE：`{"code": "FEATURE_NOT_AVAILABLE", "message": "Free 计划不支持内容生成", "details": {"required_plan": "pro"}}`
- 400 VALIDATION_ERROR：`{"code": "VALIDATION_ERROR", "message": "品牌尚未完成可见度分析", "details": {"brand_id": 42}}`

---

### GET /api/content

**认证**：Bearer JWT

**查询参数**：
- `brand_id`：可选，按品牌筛选
- `content_type`：可选，按类型筛选
- `status`：可选，按状态筛选
- `cursor`：可选，游标 ID
- `limit`：可选，默认 20，最大 50

**响应 200**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 101,
        "brand_id": 42,
        "brand_name": "GeoRank",
        "content_type": "article",
        "title": "2026年AI搜索优化趋势",
        "status": "published",
        "word_count": 1247,
        "quality_score": 85.5,
        "target_word_count": 1000,
        "engine": "mimo",
        "target_platform": "medium",
        "published_at": "2026-05-21T10:30:00Z",
        "created_at": "2026-05-21T09:00:00Z"
      }
    ],
    "next_cursor": "101",
    "has_more": true
  },
  "error": null
}
```

---

### GET /api/content/{content_id}

**认证**：Bearer JWT

**响应 200**：
```json
{
  "success": true,
  "data": {
    "id": 101,
    "user_id": 1,
    "brand_id": 42,
    "brand_name": "GeoRank",
    "content_type": "article",
    "title": "2026年AI搜索优化趋势",
    "body": "# 2026年AI搜索优化趋势\n\n随着ChatGPT...",
    "tags": ["AI搜索", "GEO", "SEO优化"],
    "platform_format": "markdown",
    "distribution_guide": {
      "platforms": [
        {
          "name": "Medium",
          "steps": ["登录 Medium", "新建文章", "粘贴内容", "添加标签", "发布"],
          "best_time": "工作日 9-11 时"
        },
        {
          "name": "知乎",
          "steps": ["创建专栏文章", "粘贴内容", "添加话题标签", "发布"],
          "best_time": "工作日 20-22 时"
        }
      ]
    },
    "status": "published",
    "source_analysis_run_id": 15,
    "source_weak_keywords": ["AI优化", "GEO策略"],
    "source_competitor_gaps": [
      {"competitor": "竞品A", "keyword": "AI搜索", "gap": "+23%"}
    ],
    "published_at": "2026-05-21T10:30:00Z",
    "target_platform": "medium",
    "target_platform_url": "https://medium.com/@user/2026-ai-search-optimization",
    "quality_score": 85.5,
    "word_count": 1247,
    "target_word_count": 1000,
    "engine": "mimo",
    "created_at": "2026-05-21T09:00:00Z",
    "updated_at": "2026-05-21T10:30:00Z"
  },
  "error": null
}
```

**错误**：
- 404 RESOURCE_NOT_FOUND：内容不存在或不属于当前用户

---

### PUT /api/content/{content_id}

**认证**：Bearer JWT

**请求**（部分更新，仅传需修改字段）：
```json
{
  "title": "2026年AI搜索优化完整指南",   // optional, string, ≤500 字
  "body": "# 更新后的正文...",            // optional, string
  "tags": ["AI搜索", "GEO", "优化指南"]   // optional, array of string
}
```

**校验规则**：
- 仅 `draft` 状态的内容可编辑
- `title`：≤500 字
- `tags`：≤10 个标签，每个 ≤30 字

**响应 200**：
```json
{
  "success": true,
  "data": {
    "id": 101,
    "title": "2026年AI搜索优化完整指南",
    "body": "# 更新后的正文...",
    "tags": ["AI搜索", "GEO", "优化指南"],
    "word_count": 1320,
    "updated_at": "2026-05-21T11:00:00Z"
  },
  "error": null
}
```

**错误**：
- 409 CONFLICT：内容非 draft 状态，不可编辑

---

### POST /api/content/{content_id}/regenerate

**认证**：Bearer JWT

**请求**：
```json
{
  "section_text": "随着ChatGPT、Claude等AI搜索引擎的普及...",  // optional, 选中的段落文本
  "modification_instructions": "加入具体数据统计，引用2026年最新报告"  // required, string, ≤300 字
}
```

**说明**：
- 若提供 `section_text`，仅重新生成该段落
- 若不提供 `section_text`，重新生成整篇内容
- 重新生成使用当前内容已记录的 `engine`，不支持切换

**响应 202 Accepted**：
```json
{
  "success": true,
  "data": {
    "task_id": "task-regen-001",
    "content_id": 101,
    "status": "generating",
    "regenerate_type": "partial",
    "message": "段落重新生成中"
  },
  "error": null
}
```

---

### POST /api/content/{content_id}/confirm

**认证**：Bearer JWT

**请求**：无 body

**响应 200**：
```json
{
  "success": true,
  "data": {
    "id": 101,
    "status": "ready",
    "message": "内容已确认，可进行分发"
  },
  "error": null
}
```

**错误**：
- 409 CONFLICT：内容非 draft 状态

---

### POST /api/content/{content_id}/publish

**认证**：Bearer JWT

**请求**：
```json
{
  "platform_url": "https://medium.com/@user/2026-ai-search-optimization",  // optional, string
  "target_platform": "medium",                                              // optional, enum: ["reddit","quora","medium","zhihu","wechat","website","pr","other"]
  "publish_notes": "已发布到 Medium 专栏"                                    // optional, string
}
```

**响应 200**：
```json
{
  "success": true,
  "data": {
    "id": 101,
    "status": "published",
    "published_at": "2026-05-21T10:30:00Z",
    "target_platform": "medium",
    "target_platform_url": "https://medium.com/@user/2026-ai-search-optimization",
    "message": "已标记为发布，采纳检测将于第 3 天开始"
  },
  "error": null
}
```

**错误**：
- 409 CONFLICT：内容非 ready 状态

---

### GET /api/content/{content_id}/adoption

**认证**：Bearer JWT

**功能门控**：Pro/Agency 计划

**响应 200**：
```json
{
  "success": true,
  "data": {
    "content_id": 101,
    "published_at": "2026-05-21T10:30:00Z",
    "days_since_publish": 14,
    "platform_indexing": {
      "is_indexed": true,
      "indexed_at": "2026-05-23T08:00:00Z",
      "search_rank": 12,
      "search_engine": "google"
    },
    "ai_citations": {
      "total_citations": 4,
      "engines": [
        {"engine": "openai", "cited": true, "position": 2, "accuracy": 85.0, "checked_at": "2026-05-28T00:00:00Z"},
        {"engine": "claude", "cited": true, "position": 1, "accuracy": 92.0, "checked_at": "2026-05-28T00:00:00Z"},
        {"engine": "gemini", "cited": false, "position": null, "accuracy": null, "checked_at": "2026-05-28T00:00:00Z"},
        {"engine": "deepseek", "cited": true, "position": 3, "accuracy": 78.0, "checked_at": "2026-05-28T00:00:00Z"},
        {"engine": "qianwen", "cited": true, "position": 2, "accuracy": 81.0, "checked_at": "2026-05-28T00:00:00Z"},
        {"engine": "mimo", "cited": false, "position": null, "accuracy": null, "checked_at": "2026-05-28T00:00:00Z"}
      ]
    },
    "ranking_delta": {
      "score_before": 45.2,
      "score_after": 57.7,
      "delta": 12.5,
      "delta_percent": 27.7,
      "checked_at": "2026-05-28T00:00:00Z"
    },
    "timeline": [
      {"days_after_publish": 3, "check_date": "2026-05-24", "is_adopted": true, "citation_count": 1},
      {"days_after_publish": 7, "check_date": "2026-05-28", "is_adopted": true, "citation_count": 4},
      {"days_after_publish": 14, "check_date": "2026-06-04", "is_adopted": null, "citation_count": null, "status": "pending"},
      {"days_after_publish": 30, "check_date": "2026-06-20", "is_adopted": null, "citation_count": null, "status": "pending"}
    ]
  },
  "error": null
}
```

---

### POST /api/upload/image

**认证**：Bearer JWT

**请求**：`multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 图片文件，支持 JPG/PNG/WebP，≤ 10MB |

**校验规则**：
- `file`：必填，MIME 类型必须为 image/jpeg、image/png 或 image/webp
- 文件大小 ≤ 10MB（10,485,760 字节）

**响应 200**：
```json
{
  "success": true,
  "data": {
    "url": "https://oss.example.com/uploads/2026/05/26/a1b2c3d4.jpg",
    "thumbnail_url": "https://oss.example.com/uploads/2026/05/26/a1b2c3d4_thumb.jpg",
    "width": 1920,
    "height": 1080,
    "file_size": 245760,
    "filename": "a1b2c3d4.jpg"
  },
  "error": null
}
```

**错误**：
- 400 VALIDATION_ERROR：`{"code": "VALIDATION_ERROR", "message": "不支持的图片格式，仅支持 JPG/PNG/WebP", "details": {"supported": ["image/jpeg", "image/png", "image/webp"]}}`
- 400 VALIDATION_ERROR：`{"code": "VALIDATION_ERROR", "message": "文件大小超过限制（最大 10MB）", "details": {"max_size_bytes": 10485760, "actual_size_bytes": 15728640}}`

---

### GET /api/content/stats

**认证**：Bearer JWT

**查询参数**：
- `brand_id`：可选，按品牌筛选

**响应 200**：
```json
{
  "success": true,
  "data": {
    "total_contents": 25,
    "by_status": {
      "draft": 3,
      "ready": 5,
      "distributing": 2,
      "published": 12,
      "verified": 3
    },
    "by_type": {
      "faq": 8,
      "community_qa": 5,
      "article": 10,
      "press_release": 2
    },
    "adoption_summary": {
      "total_published": 15,
      "total_adopted": 9,
      "adoption_rate": 60.0,
      "avg_ranking_delta": 8.3
    },
    "this_month": {
      "generated": 7,
      "limit": 10,
      "remaining": 3
    }
  },
  "error": null
}
```

---

### POST /api/crawler/analyze

**认证**：Bearer JWT

**功能门控**：Pro/Agency 计划

**请求**：
```json
{
  "url": "https://www.example.com"   // required, valid URL
}
```

**校验规则**：
- `url`：必填，合法 URL，必须为 http/https 协议

**响应 202 Accepted**：
```json
{
  "success": true,
  "data": {
    "task_id": "task-crawl-001",
    "message": "官网分析中"
  },
  "error": null
}
```

**错误**：
- 400 VALIDATION_ERROR：`{"code": "VALIDATION_ERROR", "message": "该网站的 robots.txt 禁止抓取", "details": {"url": "https://www.example.com", "robots_rule": "Disallow: /"}}`

---

### PUT /api/brands/{brand_id}/profile

**认证**：Bearer JWT（品牌所有者）

**请求**：
```json
{
  "brand_description": "GeoRank 是一个 GEO 可见度监控平台...",  // required, string, ≤500 字
  "core_products": "AI 搜索可见度监控、竞品分析、内容优化",      // required, string, ≤300 字
  "target_audience": "中小企业品牌方、数字营销代理商",            // required, string, ≤200 字
  "key_selling_points": "6 大 AI 引擎覆盖、实时监控",            // optional, string, ≤300 字
  "industry": "科技"                                            // optional, enum: ["科技","电商","金融","教育","医疗","制造","其他"]
}
```

**校验规则**：
- `brand_description`：必填，≤500 字
- `core_products`：必填，≤300 字
- `target_audience`：必填，≤200 字
- `key_selling_points`：可选，≤300 字
- `industry`：可选，枚举值

**响应 200**：
```json
{
  "success": true,
  "data": {
    "brand_id": 42,
    "brand_description": "GeoRank 是一个 GEO 可见度监控平台...",
    "core_products": "AI 搜索可见度监控、竞品分析、内容优化",
    "target_audience": "中小企业品牌方、数字营销代理商",
    "key_selling_points": "6 大 AI 引擎覆盖、实时监控",
    "industry": "科技",
    "website_crawled_at": null,
    "updated_at": "2026-05-25T10:00:00Z"
  },
  "error": null
}
```

**错误**：
- 404 RESOURCE_NOT_FOUND：品牌不存在
- 403 FEATURE_NOT_ALLOWED：非品牌所有者

---

## Pydantic v2 Schema 定义（后端实现参考）

```python
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

# === 枚举 ===

class PlanCode(str, Enum):
    FREE = "free"
    PRO = "pro"
    AGENCY = "agency"

class BillingCycle(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"

class SubscriptionStatus(str, Enum):
    TRIALING = "trialing"
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"

class ContentType(str, Enum):
    FAQ = "faq"
    COMMUNITY_QA = "community_qa"
    ARTICLE = "article"
    PRESS_RELEASE = "press_release"

class ContentStatus(str, Enum):
    GENERATING = "generating"
    DRAFT = "draft"
    FAILED = "failed"
    READY = "ready"
    DISTRIBUTING = "distributing"
    PUBLISHED = "published"
    VERIFIED = "verified"

class Platform(str, Enum):
    REDDIT = "reddit"
    QUORA = "quora"
    MEDIUM = "medium"
    ZHIHU = "zhihu"
    WECHAT = "wechat"
    WEBSITE = "website"
    PR = "pr"
    OTHER = "other"

class UsageDimension(str, Enum):
    BRAND = "brand"
    QUERY = "query"
    CHECK = "check"
    CONTENT = "content"

# === 订阅 ===

class PlanResponse(BaseModel):
    plan_code: str
    name: str
    price_monthly: float
    price_yearly: float
    brand_limit: int
    query_limit_per_brand: int
    engine_limit: int
    allowed_engines: list[str]
    check_interval_hours: int
    history_days: int
    competitor_limit: int
    content_monthly_limit: int
    content_types_allowed: list[str]
    team_members: int
    api_access: bool
    white_label: bool
    report_watermark: bool

class CurrentSubscriptionResponse(BaseModel):
    subscription: "SubscriptionDetail"
    usage: "UsageSummary"

class SubscriptionDetail(BaseModel):
    plan_code: str
    plan_name: str
    status: str
    billing_cycle: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    trial_end: datetime | None
    price: float
    next_billing_date: datetime

class UsageSummary(BaseModel):
    brands: "UsageDimension"
    queries: "UsageDimension"
    content: "UsageDimension"

class UsageDimension(BaseModel):
    used: int
    limit: int  # -1 = unlimited

class CheckoutRequest(BaseModel):
    plan_code: PlanCode
    billing_cycle: BillingCycle

class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str

class ChangePlanRequest(BaseModel):
    new_plan_code: PlanCode

class ChangePlanResponse(BaseModel):
    previous_plan: str
    new_plan: str
    effective_date: datetime
    proration_credit: float
    new_charge: float
    message: str

# === 内容 ===

class ContentGenerateRequest(BaseModel):
    brand_id: int = Field(gt=0)
    content_type: ContentType
    custom_instructions: str | None = Field(default=None, max_length=500)
    target_word_count: int = Field(default=1000, ge=500)
    engine: str = Field(default="mimo", pattern="^(mimo|deepseek|openai|qianwen)$")

class ContentGenerateResponse(BaseModel):
    task_id: str
    content_id: int
    status: str  # "generating"
    message: str

class ContentListItem(BaseModel):
    id: int
    brand_id: int
    brand_name: str
    content_type: str
    title: str
    status: str
    word_count: int
    target_word_count: int
    engine: str
    quality_score: float | None
    target_platform: str | None
    published_at: datetime | None
    created_at: datetime

class ContentDetail(BaseModel):
    id: int
    user_id: int
    brand_id: int
    brand_name: str
    content_type: str
    title: str
    body: str
    tags: list[str] | None
    platform_format: str
    distribution_guide: dict | None
    status: str
    source_analysis_run_id: int | None
    source_weak_keywords: list[str] | None
    source_competitor_gaps: list[dict] | None
    published_at: datetime | None
    target_platform: str | None
    target_platform_url: str | None
    quality_score: float | None
    word_count: int
    target_word_count: int
    engine: str
    created_at: datetime
    updated_at: datetime

class ContentUpdateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=500)
    body: str | None = None
    tags: list[str] | None = Field(default=None, max_length=10)

class RegenerateResponse(BaseModel):
    task_id: str
    content_id: int
    status: str  # "generating"
    regenerate_type: str  # "partial" | "full"
    message: str

class RegenerateRequest(BaseModel):
    section_text: str | None = None
    modification_instructions: str = Field(max_length=300)

class PublishRequest(BaseModel):
    platform_url: str | None = None
    target_platform: Platform | None = None
    publish_notes: str | None = None

class AdoptionResponse(BaseModel):
    content_id: int
    published_at: datetime | None
    days_since_publish: int
    platform_indexing: "PlatformIndexing"
    ai_citations: "AiCitations"
    ranking_delta: "RankingDelta"
    timeline: list["TimelineNode"]

class PlatformIndexing(BaseModel):
    is_indexed: bool
    indexed_at: datetime | None
    search_rank: int | None
    search_engine: str | None

class AiCitations(BaseModel):
    total_citations: int
    engines: list["EngineCitation"]

class EngineCitation(BaseModel):
    engine: str
    cited: bool
    position: int | None
    accuracy: float | None
    checked_at: datetime

class RankingDelta(BaseModel):
    score_before: float | None
    score_after: float | None
    delta: float | None
    delta_percent: float | None
    checked_at: datetime

class TimelineNode(BaseModel):
    days_after_publish: int
    check_date: str
    is_adopted: bool | None
    citation_count: int | None
    status: str | None  # "pending" when not yet checked

class ContentStatsResponse(BaseModel):
    total_contents: int
    by_status: dict[str, int]
    by_type: dict[str, int]
    adoption_summary: "AdoptionSummary"
    this_month: "MonthUsage"

class AdoptionSummary(BaseModel):
    total_published: int
    total_adopted: int
    adoption_rate: float
    avg_ranking_delta: float

class MonthUsage(BaseModel):
    generated: int
    limit: int
    remaining: int

# === 上传 ===

class ImageUploadResponse(BaseModel):
    url: str
    thumbnail_url: str
    width: int
    height: int
    file_size: int
    filename: str

# === 品牌资料 ===

class BrandProfileUpdateRequest(BaseModel):
    brand_description: str = Field(max_length=500)
    core_products: str = Field(max_length=300)
    target_audience: str = Field(max_length=200)
    key_selling_points: str | None = Field(default=None, max_length=300)
    industry: str | None = None  # enum: 科技/电商/金融/教育/医疗/制造/其他

class BrandProfileResponse(BaseModel):
    brand_id: int
    brand_description: str | None
    core_products: str | None
    target_audience: str | None
    key_selling_points: str | None
    industry: str | None
    website_crawled_at: datetime | None
    updated_at: datetime

# === 官网抓取 ===

class CrawlerRequest(BaseModel):
    url: str  # valid URL

class CrawlerResponse(BaseModel):
    task_id: str
    message: str

# === 用量 ===

class UsageCurrentResponse(BaseModel):
    plan_code: str
    period_start: datetime
    period_end: datetime
    dimensions: dict[str, "UsageDimensionDetail"]

class UsageDimensionDetail(BaseModel):
    used: int
    limit: int  # -1 = unlimited
    unit: str
```

---

## WBS 端点映射表（P5a 一致性验证）

| API 端点 | WBS 任务 | 实现层 |
|----------|----------|--------|
| GET /api/subscription/plans | T2.2.2 | routers/subscription.py |
| GET /api/subscription/current | T2.2.2 | routers/subscription.py |
| POST /api/subscription/checkout | T2.2.1, T2.2.2 | services/billing.py + routers/subscription.py |
| POST /api/subscription/webhook | T2.2.1, T2.2.2 | services/billing.py + routers/subscription.py |
| POST /api/subscription/cancel | T2.2.2 | routers/subscription.py |
| POST /api/subscription/reactivate | T2.2.2 | routers/subscription.py |
| POST /api/subscription/change-plan | T2.2.2 | routers/subscription.py |
| GET /api/usage/current | T2.3.3 | routers/usage.py |
| GET /api/usage/history | T2.3.3 | routers/usage.py |
| POST /api/content/generate | T3.2.5 | routers/content.py + services/content_generator.py |
| GET /api/content | T3.3.2 | routers/content.py |
| GET /api/content/{id} | T3.3.1 | routers/content.py |
| PUT /api/content/{id} | T3.3.1 | routers/content.py |
| POST /api/content/{id}/regenerate | T3.3.3 | routers/content.py |
| POST /api/content/{id}/confirm | T3.3.3 | routers/content.py |
| POST /api/content/{id}/publish | T3.3.3 | routers/content.py |
| GET /api/content/{id}/adoption | T4.4 | routers/content.py |
| GET /api/content/stats | T1.4.1（Dashboard 统计） | routers/content.py |
| GET /api/brands | T3.3.4 | routers/brands.py |
| POST /api/brands | T3.3.4 | routers/brands.py |
| PUT /api/brands/{id} | T3.3.4 | routers/brands.py |
| DELETE /api/brands/{id} | T3.3.4 | routers/brands.py |
| PUT /api/brands/{id}/profile | T3.3.4 | routers/brands.py |
| POST /api/upload/image | T3.4.3 | routers/upload.py |
| POST /api/crawler/analyze | T5.5 | routers/crawler.py |

---

## v3.0 新增接口（Add-on）

---

### POST /api/subscription/addon/checkout

**认证**：Bearer JWT（需登录）

**请求体**：
```json
{
  "addon_type": "content_pack",
  "quantity": 1
}
```

**addon_type 枚举**：
| 值 | 说明 | 单价 |
|----|------|------|
| brand_slot | 额外品牌位 | $10/个/月 |
| query_pack | 查询词包（+50 词） | $15/月 |
| content_pack | 内容生成包（+20 篇） | $15/月 |

**校验规则**：
- `addon_type`：必填，枚举值校验
- `quantity`：必填，正整数，最小 1，最大 10

**响应 200**：
```json
{
  "success": true,
  "data": {
    "checkout_url": "https://checkout.stripe.com/...",
    "session_id": "cs_xxx"
  },
  "error": null
}
```

**错误响应**：
| HTTP | code | 说明 |
|------|------|------|
| 400 | VALIDATION_ERROR | addon_type 或 quantity 校验失败 |
| 401 | UNAUTHORIZED | 未认证 |
| 409 | CONFLICT | 同一周期内已购买相同类型 Add-on |

---

### GET /api/subscription/addons

**认证**：Bearer JWT（需登录）

**查询参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 可选，筛选状态（active / expired） |

**响应 200**：
```json
{
  "success": true,
  "data": {
    "addons": [
      {
        "id": 1,
        "addon_type": "content_pack",
        "addon_type_label": "内容生成包",
        "quantity": 1,
        "amount": 15.00,
        "currency": "USD",
        "status": "active",
        "expires_at": "2026-06-30T23:59:59Z",
        "remaining": 15,
        "created_at": "2026-06-04T10:00:00Z"
      }
    ],
    "summary": {
      "brand_slot": { "total": 1, "active": 1, "remaining": 1 },
      "query_pack": { "total": 50, "active": 50, "remaining": 32 },
      "content_pack": { "total": 20, "active": 20, "remaining": 15 }
    }
  },
  "error": null
}
```

**错误响应**：
| HTTP | code | 说明 |
|------|------|------|
| 401 | UNAUTHORIZED | 未认证 |

---

### v3.0 接口清单

| 接口 | 任务 | 负责模块 |
|------|------|----------|
| POST /api/subscription/addon/checkout | T-ADD-01 | services/billing.py + routers/subscription.py |
| GET /api/subscription/addons | T-ADD-02 | routers/subscription.py |
| POST /api/subscription/webhook (扩展) | T-ADD-03 | services/billing.py |
