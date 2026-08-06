# GeoRank 重构方案 · 结合 GEO 行业趋势

> 版本：v1.0 | 日期：2026-08-06

---

## 一、GEO 行业现状与趋势（2025-2026）

### 1.1 市场格局

GEO（Generative Engine Optimization）是 SEO 的进化形态，专注于优化品牌在 AI 搜索引擎（ChatGPT、Claude、Gemini、Perplexity、Google AI Overviews）中的可见性。

**主要竞品：**

| 产品 | 定位 | 价格 | 核心能力 |
|------|------|------|----------|
| Otterly.ai | AI 搜索监控 | $29-99/月 | 7 大 AI 引擎监控、内容审计、可爬取性检查 |
| Profound | 企业级 AI 可见性 | 企业定制 | 深度分析、API 集成、定制报告 |
| AthenaHQ | Freemium GEO | 免费起 | AI 搜索追踪、内容优化建议 |
| Brandlight | AI 品牌监控 | $99+/月 | 多引擎监控、竞品对比 |
| Amsive | 数字营销 | 定制 | GEO + 传统 SEO 结合 |

### 1.2 行业趋势

1. **AI 引擎多元化**：从 ChatGPT 单一引擎扩展到 7+ 引擎（Google AI Overviews、Perplexity、Copilot 等）
2. **内容溯源能力**：AI 引擎越来越重视可溯源的高质量内容（Reddit、知乎、Medium 等平台权重上升）
3. **实时监控需求**：品牌需要实时了解 AI 如何描述和推荐自己
4. **从监控到行动**：单纯监控不够，需要自动化的优化建议和内容生成
5. **中国市场特殊性**：通义千问、MiMo、DeepSeek 等国产引擎崛起，中文 GEO 是蓝海

### 1.3 GeoRank 的差异化机会

| 机会点 | 说明 | 当前状态 |
|--------|------|----------|
| **国产 AI 引擎支持** | 6 大引擎含 MiMo/通义千问/DeepSeek | ✅ 已有 |
| **内容生成闭环** | 监控 → 生成 → 分发 → 验证 | ✅ 框架已有 |
| **中文 GEO 专精** | 针对知乎/小红书/公众号的内容适配 | ⚠️ 部分完成 |
| **性价比** | $49/月 vs 竞品 $99+ | ✅ 有优势 |
| **白标/Agency** | 支持多品牌管理 | ⚠️ model 有，UI 无 |

---

## 二、技术架构重构方案

### 2.1 优先级排序

基于行业趋势和项目现状，重构分三个阶段：

#### Phase 1：基础加固（1-2 周）— 技术债清理

| 任务 | 说明 | 影响 |
|------|------|------|
| 修复高危 Bug | BUG-V26-02/03/14 安全合规问题 | 🔴 阻塞上线 |
| Celery 替换 threading | 异步任务可靠性 | 🔴 生产必需 |
| API Key 数据库存储 | 当前内存重启丢失 | 🔴 生产必需 |
| pytest 基础覆盖 | 核心路径测试 | 🟡 可维护性 |

#### Phase 2：前端现代化（2-3 周）— 用户体验

| 任务 | 说明 | 影响 |
|------|------|------|
| TypeScript 全量迁移 | 40+ JS 文件 | 🟡 代码质量 |
| 虚拟滚动 | 大数据量列表性能 | 🟡 用户体验 |
| 拖拽/粘贴上传 | 编辑器体验 | 🟡 用户体验 |
| 中文字数统计 | jieba 分词 | 🟡 内容质量 |

#### Phase 3：商业化增强（3-4 周）— 营收能力

| 任务 | 说明 | 影响 |
|------|------|------|
| Add-on 购买流程 | 弹性资源包 | 🟢 营收增长 |
| 团队管理 UI | Agency 功能 | 🟢 大客户 |
| 邮件通知 | 用户触达 | 🟢 留存 |
| 账单历史 | 财务合规 | 🟢 企业客户 |

### 2.2 架构变更建议

#### 数据库：SQLite → PostgreSQL（生产环境）

```python
# 当前：开发环境 SQLite
DATABASE_URL = "sqlite:///./georank.db"

# 生产环境
DATABASE_URL = "postgresql://user:pass@localhost:5432/georank"
```

#### 异步任务：threading → Celery

```python
# 当前：内存线程（重启丢失）
threading.Thread(target=_run_generation, args=(...)).start()

# 重构后：Celery 任务队列
@celery_app.task(bind=True)
def generate_content_task(self, content_id, brand_id, ...):
    ...
```

#### AI 网关：增加引擎抽象层

```python
# 当前：硬编码 6 个引擎
# 重构后：插件化引擎注册

class EngineRegistry:
    def __init__(self):
        self.engines = {}
    
    def register(self, name, engine_class):
        self.engines[name] = engine_class
    
    def get(self, name):
        return self.engines.get(name)
```

### 2.3 GEO 行业最佳实践融入

| 最佳实践 | 当前状态 | 建议 |
|----------|----------|------|
| **内容可爬取性检查** | ❌ 无 | 新增 robots.txt + LLM-ready 检查 |
| **AI 引擎引用溯源** | ⚠️ 基础 | 增加引用位置+准确度评分 |
| **竞品内容策略分析** | ⚠️ 基础 | 增加竞品内容质量对比 |
| **内容 SEO 评分** | ❌ 无 | 发布前预估被 AI 采纳概率 |
| **结构化数据支持** | ⚠️ FAQ Schema | 扩展到 JSON-LD 全格式 |
| **多平台内容适配** | ✅ 4 种 | 增加 LinkedIn/Twitter 格式 |

---

## 三、重构执行计划

### Phase 1：基础加固（Week 1-2）

```
Day 1-2: 修复高危 Bug
  - BUG-V26-02: 配额检查前置
  - BUG-V26-03: 合规化 Google 检测（改用 SERP API）
  - BUG-V26-14: Webhook 幂等性

Day 3-4: Celery 迁移
  - 安装 celery + redis broker
  - 迁移 content_generation_task
  - 迁移 adoption_check_task
  - 配置 worker + beat scheduler

Day 5: API Key 数据库迁移
  - 创建 api_keys 表
  - 迁移内存存储到数据库
  - 实现 Key 生成/吊销/轮换 API

Day 6-7: pytest 基础覆盖
  - 配额检查测试
  - 内容生成测试
  - Webhook 处理测试
```

### Phase 2：前端现代化（Week 3-5）

```
Week 3: TypeScript 迁移 Phase 1-2
  - types/ + lib/ + services/ → .ts
  - components/ → .tsx
  - 确保 npm run build 通过

Week 4: TypeScript 迁移 Phase 3-4
  - app/ → .tsx
  - 冒烟测试通过
  - 修复类型错误

Week 5: 体验优化
  - 虚拟滚动（@tanstack/react-virtual）
  - 拖拽/粘贴上传
  - 中文字数统计（jieba + 正则）
```

### Phase 3：商业化增强（Week 6-9）

```
Week 6-7: Add-on 购买
  - AddonPurchase model
  - Stripe Checkout 集成
  - 配额合并算法
  - 前端加购 UI

Week 8: 团队管理
  - 邀请/成员管理 UI
  - 角色权限控制

Week 9: 邮件 + 账单
  - 邮件通知服务
  - 账单历史页面
```

---

## 四、GEO 行业新功能建议

基于当前行业趋势，建议后续迭代加入：

### 4.1 内容可爬取性审计（Content Crawlability Audit）

```python
class CrawlabilityAuditor:
    """检查内容对 AI 引擎的可爬取性"""
    
    def audit(self, url: str) -> CrawlabilityReport:
        return {
            "robots_txt_compliant": bool,
            "llm_txt_present": bool,      # 是否有 llms.txt
            "structured_data": bool,       # JSON-LD 结构化数据
            "citation_ready": bool,        # 是否易于引用
            "freshness_score": float,      # 内容新鲜度
            "authority_score": float,      # 权威性评分
        }
```

### 4.2 AI 引擎引用溯源增强

```python
class CitationTracker:
    """追踪 AI 引擎对内容的引用"""
    
    def track(self, content_id: int) -> CitationReport:
        return {
            "engines_citing": ["chatgpt", "perplexity", ...],
            "citation_count": int,
            "citation_positions": [int, ...],  # 引用位置
            "citation_accuracy": float,         # 引用准确度
            "citation_context": str,            # 引用上下文
        }
```

### 4.3 内容 SEO 评分（发布前预估）

```python
class ContentSEOScorer:
    """发布前预估内容被 AI 采纳的概率"""
    
    def score(self, content: str, brand: Brand) -> SEOScore:
        return {
            "overall_score": float,       # 0-100
            "readability": float,         # 可读性
            "factuality": float,          # 事实性
            "uniqueness": float,          # 独特性
            "citation_potential": float,  # 被引用潜力
            "platform_fit": float,        # 平台适配度
            "recommendations": [str, ...], # 优化建议
        }
```

### 4.4 中文 GEO 专精功能

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 知乎回答优化 | 适配知乎内容规范和算法 | P1 |
| 小红书笔记生成 | 图文+标签+话题 | P1 |
| 微信公众号文章 | 长文+排版+引流 | P1 |
| 百度文库文档 | PDF/Word 格式优化 | P2 |
| 抖音/快手脚本 | 短视频脚本生成 | P2 |

---

## 五、风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| TS 迁移引入运行时 Bug | 中 | 功能异常 | 分阶段迁移 + 冒烟测试 |
| Celery 配置复杂度 | 中 | 部署困难 | Docker Compose 一键部署 |
| GEO 市场教育成本高 | 高 | 获客慢 | 内容营销 + 免费试用 |
| AI 引擎 API 变动 | 中 | 功能失效 | 引擎抽象层 + 快速适配 |
| 中国市场合规 | 低 | 运营风险 | 数据本地化 + 合规审查 |

---

## 六、成功指标

### 技术指标
- `npm run build` 零错误
- `tsc --noEmit` 零错误
- pytest 覆盖率 ≥60%
- 核心流程冒烟测试通过

### 业务指标
- Free → Pro 转化率 ≥5%
- 月活用户增长 ≥20%
- 内容生成成功率 ≥95%
- 用户 NPS ≥40

---

**执行方式：** 通过 OpenHands 在 http://106.54.233.205:8000 上操作，按 Phase 1→2→3 顺序执行。
