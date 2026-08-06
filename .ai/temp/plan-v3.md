# 技术实现方案 · GeoRank v3.0

> 版本：v3.0 | 创建：2026-06-05

---

## 1. TypeScript 迁移方案

### 1.1 迁移策略

自底向上，分 4 阶段：

```
Phase 1: types/ + lib/ + services/    → 基础层类型定义
Phase 2: components/                   → 组件 props 类型化
Phase 3: app/ (页面层)                 → 页面状态类型化
Phase 4: 验证 + 回归测试
```

### 1.2 关键文件变更

| 文件 | 变更 | 说明 |
|------|------|------|
| `tsconfig.json` | 新增 | `strict: true`, `jsx: "preserve"` |
| `types/api.ts` | 新增 | 所有 API 响应类型定义 |
| `types/content.ts` | 新增 | 内容相关类型 |
| `types/subscription.ts` | 新增 | 订阅相关类型 |
| `lib/cn.ts` | 重命名 | 从 .js 迁移 |
| `lib/word-count.ts` | 新增 | 中文字数统计 |
| `services/api.ts` | 重命名 | 类型化 API 客户端 |
| `components/*.tsx` | 重命名 | 组件 props 接口 |
| `app/**/*.tsx` | 重命名 | 页面组件 |

### 1.3 类型定义示例

```typescript
// types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export interface ContentListItem {
  id: number;
  title: string;
  brand_name: string;
  content_type: string;
  status: string;
  quality_score: number;
  word_count: number;
  created_at: string;
}

// types/addon.ts
export type AddonType = 'brand_slot' | 'query_pack' | 'content_pack';

export interface AddonPurchase {
  id: number;
  addon_type: AddonType;
  quantity: number;
  amount: number;
  currency: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
}
```

---

## 2. Celery 迁移方案

### 2.1 架构变更

```
当前：threading.Thread + task_store (内存)
目标：Celery + Redis (持久化)

变更：
- content.py: _run_generation → celery_tasks.content_tasks.generate_content_async
- content.py: run_regeneration → celery_tasks.content_tasks.regenerate_content_async
- scheduler.py: APScheduler → Celery beat
- task_store.py: 保留用于兼容，逐步废弃
```

### 2.2 Celery 配置

```python
# celery_app.py
from celery import Celery
from app.config import settings

celery_app = Celery(
    "georank",
    broker=settings.REDIS_URL + "/1",
    backend=settings.REDIS_URL + "/2",
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "check-adoption": {
            "task": "celery_tasks.adoption_tasks.check_adoption",
            "schedule": 86400.0,  # 24 hours
        },
        "sync-usage-to-db": {
            "task": "celery_tasks.usage_tasks.sync_usage_to_db",
            "schedule": 3600.0,  # 1 hour
        },
        "check-usage-warnings": {
            "task": "celery_tasks.usage_tasks.check_usage_warnings",
            "schedule": 21600.0,  # 6 hours
        },
        "expire-addons": {
            "task": "celery_tasks.addon_tasks.expire_addons",
            "schedule": 86400.0,  # 24 hours
        },
    },
)
```

### 2.3 任务示例

```python
# celery_tasks/content_tasks.py
from celery_app import celery_app
from app.database import SessionLocal
from app.services.content_generator import generate_content, regenerate_section

@celery_app.task(bind=True, max_retries=2, default_retry_delay=60)
def generate_content_async(self, content_id, user_id, brand_id, content_type, 
                           custom_instructions, language, target_word_count, engine):
    db = SessionLocal()
    try:
        content = generate_content(
            db=db, user_id=user_id, brand_id=brand_id,
            content_type=content_type, custom_instructions=custom_instructions,
            language=language, target_word_count=target_word_count,
            engine=engine, content_id=content_id,
        )
        return {"status": "completed", "content_id": content.id}
    except Exception as exc:
        self.retry(exc=exc)
    finally:
        db.close()
```

---

## 3. API Key 数据库化方案

### 3.1 数据模型

```python
# models/api_key.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Index
from app.database import Base

class ApiKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    name = Column(String(50), nullable=False)
    key_hash = Column(String(64), nullable=False, unique=True)
    key_prefix = Column(String(16), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    updated_at = Column(DateTime, server_default="CURRENT_TIMESTAMP")
    
    __table_args__ = (
        Index("idx_api_keys_active", "user_id", "is_active", "expires_at"),
    )
```

### 3.2 验证逻辑

```python
def validate_api_key(api_key: str, db: Session) -> dict | None:
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    key = db.query(ApiKey).filter(
        ApiKey.key_hash == key_hash,
        ApiKey.is_active == True,
        ApiKey.expires_at > datetime.now(timezone.utc),
    ).first()
    
    if not key:
        return None
    
    key.last_used_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"user_id": key.user_id, "key_id": key.id}
```

---

## 4. 中文分词方案

### 4.1 前端（轻量方案）

```typescript
// lib/word-count.ts
export function countWords(text: string): number {
  // 匹配中文字符
  const chineseChars = text.match(/[一-鿿]/g) || [];
  // 匹配英文单词
  const englishWords = text.match(/[a-zA-Z]+/g) || [];
  return chineseChars.length + englishWords.length;
}
```

### 4.2 后端（jieba 分词）

```python
# services/quality_checker.py
import jieba

def _calculate_overlap(text_a: str, text_b: str) -> float:
    tokens_a = set(jieba.lcut(text_a))
    tokens_b = set(jieba.lcut(text_b))
    
    if not tokens_a or not tokens_b:
        return 0.0
    
    intersection = tokens_a & tokens_b
    union = tokens_a | tokens_b
    
    return len(intersection) / len(union)
```

---

## 5. Add-on 配额合并方案

### 5.1 usage_tracker 修改

```python
def get_limit(db: Session, user_id: int, dimension: str) -> int:
    plan_code = _get_current_plan_code(db, user_id)
    plan_limits = _get_plan_limits(db, plan_code)
    base_limit = plan_limits.get(dimension, -1)
    
    if base_limit == -1:
        return -1  # 无限制
    
    # 查询 Add-on 额度
    from app.models.addon_purchase import AddonPurchase
    addon_quota = db.query(
        func.coalesce(func.sum(AddonPurchase.quantity), 0)
    ).filter(
        AddonPurchase.user_id == user_id,
        AddonPurchase.addon_type == dimension,
        AddonPurchase.status == "active",
        AddonPurchase.expires_at > datetime.now(timezone.utc),
    ).scalar()
    
    return base_limit + addon_quota
```

### 5.2 Webhook 处理

```python
def _handle_addon_checkout_completed(db: Session, session: dict):
    user_id = int(session["metadata"]["user_id"])
    addon_type = session["metadata"]["addon_type"]
    quantity = int(session["metadata"]["quantity"])
    
    # 获取当前订阅周期
    sub = db.query(UserSubscription).filter(
        UserSubscription.user_id == user_id,
        UserSubscription.status.in_(["active", "trialing"]),
    ).first()
    
    addon = AddonPurchase(
        user_id=user_id,
        addon_type=addon_type,
        quantity=quantity,
        amount=session["amount_total"] / 100,
        currency=session["currency"],
        stripe_session_id=session["id"],
        status="active",
        plan_period_start=sub.current_period_start,
        plan_period_end=sub.current_period_end,
        expires_at=sub.current_period_end,
    )
    db.add(addon)
    db.commit()
```

---

## 6. 虚拟滚动方案

### 6.1 VirtualList 组件

```typescript
// components/VirtualList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
  items: T[];
  estimateSize: number;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export function VirtualList<T>({ items, estimateSize, renderItem }: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5,
  });
  
  return (
    <div ref={parentRef} className="overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 7. 拖拽/粘贴上传方案

### 7.1 TipTap 事件注册

```typescript
// components/TipTapEditor.tsx
const editor = useEditor({
  extensions: [StarterKit, Image, Typography],
  editorProps: {
    handleDrop: (view, event, slice, moved) => {
      if (!moved && event.dataTransfer?.files.length) {
        const file = event.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          handleImageUpload(file);
          return true;
        }
      }
      return false;
    },
    handlePaste: (view, event) => {
      const items = event.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              handleImageUpload(file);
              return true;
            }
          }
        }
      }
      return false;
    },
  },
});
```

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 门控 5（合并） · 接口契约 + 技术方案
交付物：`.ai/temp/api-contract-v3.md` + `.ai/temp/plan-v3.md`
摘要：新增 2 个端点，变更 3 个端点，7 个技术方案覆盖 TS/Celery/API Key/分词/Add-on/虚拟滚动/拖拽上传。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
输入 `approve` 推进至第 6 阶段（前端/后端开发）
输入 `return [原因]` 退回当前阶段修改
