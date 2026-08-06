# 接口契约 · GeoRank v3.0

> 版本：v3.0 | 创建：2026-06-05 | 范围：新增 Add-on API + 变更 content/usage API

---

## 1. 协议规范

- 协议：REST
- 命名规范：snake_case（请求/响应字段）
- 认证：Bearer Token（JWT）
- 错误码：HTTP 状态码 + JSON 错误体
- 响应包装：`{ "success": bool, "data": {}, "error": string|null }`
- 分页：cursor-based（`cursor` + `limit`）

---

## 2. 新增接口

### 2.1 POST /api/subscription/addon/checkout

**描述**：创建 Add-on 购买的 Stripe Checkout Session

**认证**：Bearer Token

**请求 Schema**：

```json
{
  "addon_type": "brand_slot",  // enum: brand_slot | query_pack | content_pack
  "quantity": 1                // int, min=1, max=10
}
```

**响应 Schema（200）**：

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

| 状态码 | 场景 | 错误信息 |
|--------|------|----------|
| 400 | addon_type 无效 | "Invalid addon_type" |
| 400 | quantity 超限 | "Quantity must be between 1 and 10" |
| 403 | 非付费计划 | "Add-on requires Pro or Agency plan" |
| 502 | Stripe 调用失败 | "Failed to create checkout session" |

---

### 2.2 GET /api/subscription/addons

**描述**：查询用户已购 Add-on 列表

**认证**：Bearer Token

**响应 Schema（200）**：

```json
{
  "success": true,
  "data": {
    "addons": [
      {
        "id": 1,
        "addon_type": "brand_slot",
        "quantity": 2,
        "amount": 20.00,
        "currency": "USD",
        "status": "active",
        "expires_at": "2026-07-05T00:00:00Z",
        "created_at": "2026-06-05T10:00:00Z"
      }
    ],
    "total": 1,
    "summary": {
      "brand_slot": 2,
      "query_pack": 50,
      "content_pack": 20
    }
  },
  "error": null
}
```

---

## 3. 变更接口

### 3.1 POST /api/content/generate

**变更**：返回 task_id（Celery task 替代 threading）

**响应 Schema（202）**：

```json
{
  "success": true,
  "data": {
    "task_id": "celery-task-uuid",
    "content_id": 123,
    "status": "generating",
    "message": "内容生成已启动，请通过轮询查询状态"
  },
  "error": null
}
```

---

### 3.2 GET /api/content/{id}

**变更**：返回 task_status（轮询 Celery 任务状态）

**响应 Schema（200）**：

```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "...",
    "body": "...",
    "status": "generating",  // generating | draft | failed
    "task_status": "PENDING",  // PENDING | STARTED | SUCCESS | FAILURE
    "task_error": null,
    "quality_score": 85,
    "engine": "mimo",
    "target_word_count": 1000,
    "word_count": 856,
    "created_at": "...",
    "updated_at": "..."
  },
  "error": null
}
```

---

### 3.3 GET /api/usage/current

**变更**：增加 addon_quota 字段

**响应 Schema（200）**：

```json
{
  "success": true,
  "data": {
    "plan_code": "pro",
    "dimensions": {
      "brand": {
        "used": 3,
        "limit": 5,
        "addon_quota": 2,
        "total_limit": 7
      },
      "content": {
        "used": 8,
        "limit": 10,
        "addon_quota": 20,
        "total_limit": 30
      },
      "query": {
        "used": 50,
        "limit": -1,
        "addon_quota": 0,
        "total_limit": -1
      }
    }
  },
  "error": null
}
```

---

## 4. Add-on 类型定义

| addon_type | 价格 | 内容 | 有效期 |
|------------|------|------|--------|
| brand_slot | $10/个/月 | +1 品牌上限 | 当前订阅周期 |
| query_pack | $15/月 | +50 查询词额度 | 当前订阅周期 |
| content_pack | $15/月 | +20 篇生成额度 | 当前订阅周期 |

---

## 5. 配额合并算法

```
实际可用配额 = 基础计划配额 + SUM(有效 Add-on 额度)

查询 SQL:
SELECT addon_type, COALESCE(SUM(quantity), 0) as addon_quota
FROM addon_purchases
WHERE user_id = :user_id
  AND status = 'active'
  AND expires_at > NOW()
GROUP BY addon_type

最终配额 = plan_limit + addon_quota
```

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 门控 5 · 接口契约
交付物：`.ai/temp/api-contract-v3.md`
摘要：新增 2 个端点（addon/checkout, addons），变更 3 个端点（generate, content/{id}, usage/current）。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
输入 `approve` 推进至第 5b 阶段（技术方案）
输入 `return [原因]` 退回当前阶段修改
