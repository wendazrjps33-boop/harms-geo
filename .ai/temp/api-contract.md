# GeoRank API 设计文档

> 版本：v5.0 | 日期：2026-08-07
> 基于：现有 routers + v5.0 需求

---

## 1. API 规范

### 1.1 通用响应格式

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
    "code": "FEATURE_NOT_AVAILABLE",
    "message": "当前计划不支持此功能，需要 pro 或 agency 计划",
    "details": { "current_plan": "free", "feature": "content_generation" }
  }
}
```

### 1.2 认证

- JWT Bearer Token：`Authorization: Bearer <token>`
- CSRF Token：`X-CSRF-Token: <token>`（POST/PUT/DELETE 请求）
- Token 有效期：24 小时

### 1.3 HTTP 状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 202 | 异步任务已接受 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 402 | 配额超出（QUOTA_EXCEEDED） |
| 403 | 功能不可用（FEATURE_NOT_AVAILABLE） |
| 404 | 资源不存在 |
| 409 | 冲突（如任务已存在） |
| 500 | 服务器内部错误 |

---

## 2. 认证 API

### POST /api/auth/register

注册新用户。

**请求体：**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "张三"
}
```

**响应 (201)：**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "token_type": "bearer"
  }
}
```

### POST /api/auth/login

登录。

**请求体：**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**响应 (200)：**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "token_type": "bearer"
  }
}
```

### GET /api/auth/profile

获取当前用户信息。需认证。

**响应 (200)：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "张三",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

---

## 3. 品牌 API

### GET /api/brands

获取品牌列表。需认证。

**响应 (200)：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "示例品牌",
      "website": "https://example.com",
      "industry": "科技",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/brands

创建品牌。需认证。

**请求体：**
```json
{
  "name": "新品牌",
  "website": "https://newbrand.com",
  "industry": "电商"
}
```

### GET /api/brands/{id}

获取品牌详情。需认证。

### PUT /api/brands/{id}

更新品牌。需认证。

### DELETE /api/brands/{id}

删除品牌（软删除）。需认证。

---

## 4. 内容 API

### POST /api/content/generate

生成内容。需认证 + 功能门控 + 配额检查。

**请求体：**
```json
{
  "brand_id": 1,
  "content_type": "faq",
  "target_word_count": 1000,
  "engine": "mimo",
  "custom_instructions": "侧重产品优势",
  "language": "zh"
}
```

**响应 (202)：**
```json
{
  "success": true,
  "data": {
    "task_id": "celery-task-id",
    "content_id": 42,
    "status": "generating",
    "message": "内容生成已启动，请通过轮询 GET /api/content/{id} 查询状态"
  }
}
```

### GET /api/content

获取内容列表。需认证。

**查询参数：**
- `brand_id` (int, optional): 按品牌筛选
- `content_type` (string, optional): 按类型筛选
- `status` (string, optional): 按状态筛选
- `limit` (int, default=20): 返回数量
- `offset` (int, default=0): 偏移量

**响应 (200)：**
```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "title": "FAQ 标题",
      "brand_id": 1,
      "brand_name": "示例品牌",
      "content_type": "faq",
      "status": "draft",
      "quality_score": 85.5,
      "word_count": 1200,
      "engine": "mimo",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### GET /api/content/{id}

获取内容详情。需认证。

**响应 (200)：**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "title": "FAQ 标题",
    "brand_id": 1,
    "brand_name": "示例品牌",
    "content_type": "faq",
    "status": "draft",
    "body": "<h2>...</h2><p>...</p>",
    "tags": ["标签1", "标签2"],
    "quality_score": 85.5,
    "word_count": 1200,
    "engine": "mimo",
    "target_word_count": 1000,
    "distribution_guide": { ... },
    "published_at": null,
    "target_platform": null,
    "target_platform_url": null,
    "task_status": null,
    "task_error": null
  }
}
```

### PUT /api/content/{id}

更新内容（编辑标题/正文/标签）。需认证。

**请求体：**
```json
{
  "title": "更新后的标题",
  "body": "<p>更新后的正文</p>",
  "tags": ["新标签"]
}
```

### POST /api/content/{id}/regenerate

重新生成内容。需认证。返回 202 异步任务。

**请求体：**
```json
{
  "section_text": "要修改的段落",
  "modification_instructions": "请用更专业的语言重写"
}
```

### POST /api/content/{id}/confirm

确认内容（draft → ready）。需认证。

### POST /api/content/{id}/publish

标记内容为已发布。需认证。

**请求体：**
```json
{
  "target_platform": "zhihu",
  "platform_url": "https://zhuanlan.zhihu.com/p/123456",
  "publish_notes": "已发布到知乎专栏"
}
```

### GET /api/content/{id}/adoption

获取采纳效果数据。需认证 + 功能门控。

**响应 (200)：**
```json
{
  "success": true,
  "data": {
    "content_id": 42,
    "published_at": "2026-01-01T00:00:00Z",
    "days_since_publish": 7,
    "platform_indexing": {
      "is_indexed": true,
      "indexed_at": "2026-01-03T00:00:00Z",
      "search_rank": 3,
      "search_engine": "google"
    },
    "ai_citations": {
      "total_citations": 2,
      "engines": [
        { "engine": "openai", "cited": true, "position": 2, "accuracy": 0.85 },
        { "engine": "mimo", "cited": false }
      ]
    },
    "ranking_delta": {
      "score_before": 45.0,
      "score_after": 62.5,
      "delta": 17.5,
      "delta_percent": 38.9
    },
    "timeline": [
      { "days_after_publish": 3, "status": "done", "is_adopted": true },
      { "days_after_publish": 7, "status": "done", "is_adopted": true },
      { "days_after_publish": 14, "status": "pending" },
      { "days_after_publish": 30, "status": "pending" }
    ]
  }
}
```

### GET /api/content/stats

获取内容统计。需认证。

---

## 5. 分析 API

### POST /api/analysis/brand/{brandId}/run

启动可见性分析。需认证。

**请求体：**
```json
{
  "engines": ["openai", "deepseek", "mimo"],
  "query_ids": [1, 2, 3]
}
```

### GET /api/analysis/brand/{brandId}/runs

获取分析批次列表。需认证。

### GET /api/analysis/runs/{runId}

获取分析批次详情。需认证。

### GET /api/analysis/runs/{runId}/summary

获取分析汇总。需认证。

### GET /api/analysis/brand/{brandId}/compare?run_ids=1,2,3

对比多个分析批次。需认证。

---

## 6. 竞品 API

### GET /api/brands/{brandId}/competitors

获取竞品列表。需认证。

### POST /api/brands/{brandId}/competitors

添加竞品。需认证。

### DELETE /api/brands/{brandId}/competitors/{competitorId}

移除竞品。需认证。

### POST /api/competitor-analysis/brand/{brandId}/compare

启动竞品对比分析。需认证。

### GET /api/competitor-analysis/brand/{brandId}/results

获取竞品分析结果。需认证。

---

## 7. 订阅 API

### GET /api/subscription/plans

获取计划列表。公开。

### GET /api/subscription/current

获取当前订阅。需认证。

### POST /api/subscription/checkout

创建 Stripe Checkout Session。需认证。

**请求体：**
```json
{
  "plan_code": "pro",
  "billing_cycle": "monthly"
}
```

### POST /api/subscription/cancel

取消订阅。需认证。

### POST /api/subscription/reactivate

恢复取消中的订阅。需认证。

### POST /api/subscription/webhook

Stripe Webhook 回调。公开（Stripe 签名验证）。

---

## 8. 用量 API

### GET /api/usage/current

获取当前用量。需认证。

### GET /api/usage/history

获取用量历史。需认证。

---

## 9. 品牌资料 API

### GET /api/brands/{brandId}/profile

获取品牌资料。需认证。

### PUT /api/brands/{brandId}/profile

更新品牌资料。需认证。

---

## 10. 爬虫 API

### POST /api/crawler/analyze

分析网页。需认证。

**请求体：**
```json
{
  "brand_id": 1,
  "url": "https://example.com"
}
```

---

## 11. 团队 API

### GET /api/team/members

获取团队成员。需认证 + 功能门控。

### POST /api/team/invite

邀请成员。需认证 + 功能门控。

### PUT /api/team/{memberId}/role

更新成员角色。需认证。

### DELETE /api/team/{memberId}

移除成员。需认证。

---

## 12. 账单 API

### GET /api/billing/history

获取账单历史。需认证。

### GET /api/billing/invoices/{invoiceId}

获取发票详情。需认证。

---

## 13. API Key API

### GET /api/api-keys

获取 API Key 列表。需认证。

### POST /api/api-keys

创建 API Key。需认证 + 功能门控。

### DELETE /api/api-keys/{keyId}

吊销 API Key。需认证。

### POST /api/api-keys/{keyId}/rotate

轮换 API Key。需认证。

---

## 14. 公开 API

### GET /

API 根路径。

### GET /api/public/health

健康检查。

### GET /api/public/csrf-token

获取 CSRF Token。
