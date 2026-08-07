# GeoRank UI 设计规范

> 版本：v5.0 | 日期：2026-08-07
> 基于：现有前端组件 + v5.0 需求

---

## 1. 设计系统

### 1.1 品牌色

| 变量 | 色值 | 用途 |
|------|------|------|
| `--primary` | `#409EFF` | 主色（按钮、链接、选中态） |
| `--secondary` | `#67C23A` | 辅助色（成功、正面状态） |
| `--accent` | `#E6A23C` | 强调色（警告、提醒） |
| `--danger` | `#F56C6C` | 危险色（错误、删除） |
| `--bg` | `#F5F7FA` | 页面背景 |
| `--text-primary` | `#303133` | 主文字 |
| `--text-secondary` | `#909399` | 辅助文字 |
| `--border` | `#E4E7ED` | 边框 |

### 1.2 字体

| 用途 | 字体 |
|------|------|
| 中文正文 | PingFang SC / Microsoft YaHei |
| 英文/数字 | Inter / Roboto Mono |
| 代码 | JetBrains Mono / Fira Code |
| 基准字号 | 14px（正文）、12px（辅助）、16px（标题） |

### 1.3 间距系统

基准单位：4px。常用间距：8 / 12 / 16 / 24 / 32 / 48px。
组件内边距：16px。卡片间距：16px / 24px。

### 1.4 圆角

| 元素 | 圆角 |
|------|------|
| 按钮、输入框 | 4px |
| 卡片、面板 | 8px |
| 对话框 | 12px |

### 1.5 阴影

| 场景 | 阴影 |
|------|------|
| 卡片 | `0 2px 12px rgba(0,0,0,0.08)` |
| 下拉/弹出 | `0 4px 16px rgba(0,0,0,0.12)` |
| 悬浮提升 | `0 8px 24px rgba(0,0,0,0.16)` |

---

## 2. 布局结构

### 2.1 App Shell

```
+-----------------------------------------------+
|  顶栏（Logo + 用户菜单 + 语言切换）            |
+--------+--------------------------------------+
|        |                                      |
|  侧边  |  主内容区                            |
|  导航  |                                      |
|  栏    |  (PageHeader + Content)              |
|        |                                      |
|  - 仪表盘                                    |
|  - 品牌管理                                   |
|  - 分析                                       |
|  - 内容                                       |
|  - 订阅                                       |
|  - 团队（Agency）                             |
|  - API Key（Agency）                          |
|  - 白标（Agency）                             |
+--------+--------------------------------------+
```

**响应式断点：**
- Desktop: >=1200px（侧边栏 + 主内容）
- Tablet: 768px–1199px（侧边栏折叠）
- Mobile: <768px（MVP 不优先适配）

---

## 3. 页面设计

### 3.1 登录页 /login

- 居中卡片布局
- 邮箱 + 密码表单
- 登录按钮（Primary）
- 底部链接：没有账号？去注册

### 3.2 注册页 /register

- 居中卡片布局
- 邮箱 + 昵称 + 密码 + 确认密码
- 注册按钮（Primary）
- 底部链接：已有账号？去登录

### 3.3 仪表盘 /dashboard

**顶部：** PageHeader + "创建内容"按钮

**统计卡片（4 列网格）：**
- 品牌总数
- 内容总数
- 已发布内容
- 平均质量分

**最近内容表格：**
- 标题 | 品牌 | 类型 | 状态 Badge | 质量分
- 点击跳转内容详情

**快捷操作（3 列卡片）：**
- 创建内容 → 内容生成弹窗
- 查看分析 → /analytics
- 管理品牌 → /brands

### 3.4 品牌列表 /brands

- 品牌卡片网格
- 每个卡片：品牌名 + 行业 + 官网 + 创建时间
- 操作：查看 / 编辑 / 分析 / 删除
- 右上角：添加品牌按钮

### 3.5 品牌详情 /brands/[id]

- 品牌资料卡片
- 查询词列表
- 分析历史
- 竞品列表
- 内容列表

### 3.6 分析页 /analytics

- 启动分析按钮
- 分析批次列表
- 引擎对比图表（雷达图 + 柱状图）
- 查询词明细表格

### 3.7 内容管理 /content

- 内容列表表格（标题/品牌/类型/状态/质量分/时间）
- 筛选：品牌、类型、状态
- 创建内容按钮

### 3.8 内容详情 /content/[id]

- TipTap 编辑器（正文区域）
- 侧边栏：元信息（品牌/类型/引擎/字数/质量分）
- 操作按钮：保存 / 确认 / 重新生成 / 发布
- 发布弹窗（PublishModal）：选择平台 + 输入 URL
- 采纳效果时间线（发布后可见）

### 3.9 订阅管理 /subscription

- 当前计划卡片
- 用量进度条（品牌/查询词/内容）
- 计划对比表格（Free/Pro/Agency）
- 升级/降级按钮
- Add-on 购买入口

### 3.10 账单 /billing

- 发票列表表格
- 下载发票

### 3.11 团队 /team（Agency）

- 成员列表表格
- 邀请成员弹窗
- 角色管理

### 3.12 API Key /api-keys（Agency）

- Key 列表表格（名称/前缀/创建时间/过期时间/状态）
- 创建 Key 弹窗
- 吊销/轮换操作

---

## 4. 组件规范

### 4.1 基础组件（src/components/ui/）

| 组件 | 用途 | 关键 Props |
|------|------|-----------|
| `Button` | 按钮 | variant(primary/secondary/danger/ghost), size(sm/md/lg), loading |
| `Card` | 卡片 | padding, hover, onClick |
| `Modal` | 模态框 | isOpen, onClose, title |
| `Input` | 输入框 | label, type, error, placeholder |
| `Textarea` | 文本域 | label, rows, error |
| `Select` | 下拉选择 | label, options, placeholder |
| `Badge` | 标签 | variant(success/warning/danger/info) |
| `Skeleton` | 骨架屏 | count |
| `EmptyState` | 空状态 | icon, title, description, action |
| `PageHeader` | 页面标题 | title, description, actions |
| `Drawer` | 抽屉 | isOpen, onClose, title |

### 4.2 业务组件

| 组件 | 用途 |
|------|------|
| `AppShell` | 应用外壳（侧边栏+顶栏） |
| `ContentEditor` | TipTap 富文本编辑器封装 |
| `PublishModal` | 内容发布弹窗 |
| `FeatureGate` | 功能门控（展示升级引导） |
| `UpgradeModal` | 升级引导弹窗 |
| `UsageOverview` | 用量概览组件 |
| `VisibilityChart` | 可见性图表 |
| `CompetitorCharts` | 竞品对比图表 |
| `EngineCompareChart` | 引擎对比图 |
| `AdoptionTimeline` | 采纳效果时间线 |
| `StatisticalCharts` | 统计图表 |
| `ScoringRules` | 评分规则说明 |
| `LanguageSwitcher` | 语言切换（中/英） |
| `Providers` | 全局 Context Providers |

---

## 5. 交互规范

### 5.1 加载状态

- 数据加载：Skeleton 骨架屏
- 按钮操作：按钮内 spinner + disabled
- 页面级：居中 spinner

### 5.2 错误处理

- 表单校验：字段下方红色提示文字
- API 错误：顶部 Toast / 页面内 Alert
- 401：自动跳转登录页
- 402：弹出升级引导
- 403：展示功能门控组件

### 5.3 国际化

- 支持中文/英文
- 通过 i18n Context 切换
- 所有用户可见文字通过 t() 函数获取

---

## 6. 中国特色平台分发指南设计

内容分发指南页面针对每个目标平台展示：

**平台卡片结构：**
- 平台图标 + 名称
- 推荐发布时间
- 分发步骤（编号列表）
- 内容格式要求
- 一键复制标题 + 正文按钮
- 发布后回填 URL 输入框

**支持平台：**
- 知乎（专栏文章 / 回答）
- 小红书（图文笔记）
- 微信公众号（图文推送）
- B站（专栏 / 视频脚本）
- Medium（英文文章）
- PR Newswire（新闻稿）
