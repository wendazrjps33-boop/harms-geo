# UI 设计规范 · GeoRank v2.4

## 1. 设计层

### 1.1 信息架构

```
公开页面（无 Shell）
├── Landing (/)
├── Login (/login)
└── Register (/register)

应用页面（AppShell: Sidebar + Main + TopBar）
├── 工作台 (/dashboard)
├── 品牌管理 (/brands)
├── 内容中心 (/content)
├── 内容编辑 (/content/[id])
├── 数据分析 (/analytics)
└── 订阅管理 (/subscription)
```

### 1.2 核心用户流程

**流程 A — 日常监控**
```
登录 → 工作台（查看指标）→ 数据分析（选择品牌+引擎）→ 查看结果
```

**流程 B — 内容生产**
```
工作台 → 内容中心 → 新建内容（选品牌+类型）→ 编辑器 → 发布
```

**流程 C — 品牌管理**
```
品牌管理 → 新建/编辑品牌（侧边抽屉）→ 完成
```

### 1.3 重构策略（评审修正 WBS-1 + WBS-4）

采用**新旧并存 → 验证 → 切换**策略，降低重构风险：

| 阶段 | 操作 | 风险 | 验收标准 |
|------|------|------|----------|
| Phase A | 创建 `(app)/` 路由组 + 新页面（不动旧页面） | 低 | ①`(app)/layout.js` 渲染 AppShell，Sidebar 导航正确切换页面 ②6 个新页面均可独立访问，内容与旧页面一致 ③旧页面路由仍正常工作 |
| Phase B | 新页面功能验证通过 | 低 | ①所有页面在 375px/768px/1280px 三档宽度下布局正常 ②Drawer 组件滑入/滑出动画流畅 ③品牌创建/编辑/删除流程完整 ④内容创建→编辑→保存流程完整 ⑤无 console 错误 ⑥旧路由 `/brands/123` 仍正常渲染旧页面（200），不触发新路由（QA-8） |
| Phase C | 添加旧路由重定向（301）到新路由 | 中 | ①所有旧路由 301 跳转到对应新路由 ②query param 保留（品牌筛选、Tab 选中） |
| Phase D | 删除旧页面文件 | 低 | ①删除后无 404 ②构建无报错 ③CI 通过 |

**回滚条件（WBS-6）：**
- Phase B 验证不通过 → 修复问题 → 重新验证（最多 2 轮）→ 仍不通过则回退 Phase A（删除 `(app)/` 路由组，保留旧页面）
- Phase C 重定向导致意外行为 → 移除 `next.config.js` 中对应 redirect 规则
- Phase D 删除后报错 → 从 git 恢复被删除文件

**旧路由重定向映射（QA-1）：**

| 旧路由 | 新路由 | 重定向方式 |
|--------|--------|-----------|
| `/brands/[id]` | `/brands` | 301 |
| `/brands/[id]/edit` | `/brands` (打开 Drawer) | 301 + query param |
| `/brands/[id]/analysis` | `/analytics` | 301 |
| `/brands/[id]/compare` | `/analytics?tab=compare` | 301 |
| `/brands/[id]/content` | `/content?brand=[id]` | 301 |
| `/brands/[id]/content/[contentId]` | `/content/[contentId]` | 301 |
| `/brands/[id]/content/[contentId]/adoption` | `/content/[contentId]?tab=adoption` | 301 |

**重定向实现（WBS-5 + QA-7）：** 在 `next.config.js` 中配置 `redirects` 数组，每条规则使用 `permanent: true`（301）。**`:id` 仅匹配数字或 UUID（36 字符含连字符）**，不匹配中文品牌名。query param 通过 `destination` 拼接。**排序从最具体到最通用（WBS-7）**：

```js
// next.config.js
async redirects() {
  return [
    { source: '/brands/:id/edit', destination: '/brands?edit=:id', permanent: true },
    { source: '/brands/:id/analysis', destination: '/analytics', permanent: true },
    { source: '/brands/:id/compare', destination: '/analytics?tab=compare', permanent: true },
    { source: '/brands/:id/content', destination: '/content?brand=:id', permanent: true },
    { source: '/brands/:id/content/:contentId/adoption', destination: '/content/:contentId?tab=adoption', permanent: true },
    { source: '/brands/:id/content/:contentId', destination: '/content/:contentId', permanent: true },
    { source: '/brands/:id', destination: '/brands', permanent: true },
  ]
}
```

**重定向测试用例（QA-4）：**

| 用例 | 操作 | 期望结果 |
|------|------|----------|
| RD-1 | 访问 `/brands/123` | 301 → `/brands` |
| RD-2 | 访问 `/brands/123/edit` | 301 → `/brands?edit=123` |
| RD-3 | 访问 `/brands/123/analysis` | 301 → `/analytics` |
| RD-4 | 访问 `/brands/123/compare` | 301 → `/analytics?tab=compare` |
| RD-5 | 访问 `/brands/123/content` | 301 → `/content?brand=123` |
| RD-6 | 访问 `/brands/123/content/456` | 301 → `/content/456` |
| RD-7 | 访问 `/brands/123/content/456/adoption` | 301 → `/content/456?tab=adoption` |
| RD-8 | 访问新路由 `/brands`、`/content`、`/analytics` | 200 正常渲染 |

---

## 2. 设计系统

### 2.1 色彩

基于用户指定的 Modern SaaS（Notion/Linear）风格：

| Token | 值 | 用途 |
|-------|-----|------|
| `--brand-50` | `#f0f4ff` | 主色浅底（选中态） |
| `--brand-500` | `#4c6ef5` | 主色（按钮、链接、焦点） |
| `--brand-600` | `#4263eb` | 主色悬停 |
| `--surface-0` | `#ffffff` | 卡片/弹窗背景 |
| `--surface-1` | `#f8f9fa` | 页面背景 |
| `--surface-2` | `#f1f3f5` | 悬停背景 |
| `--surface-3` | `#e9ecef` | 边框 |
| `--text-primary` | `#212529` | 主文字 |
| `--text-secondary` | `#6c757d` | 次要文字 |
| `--text-tertiary` | `#adb5bd` | 占位符/禁用 |
| `--success` | `#40c057` | 成功/已发布 |
| `--warning` | `#fab005` | 警告 |
| `--danger` | `#fa5252` | 错误/删除 |

### 2.2 间距

基准单位 4px。常用：8 / 12 / 16 / 24 / 32 / 48px。

### 2.3 圆角

- 按钮/输入框：`6px`
- 卡片：`8px`
- 弹窗：`12px`

### 2.4 阴影

- 卡片：`0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)`
- 悬停：`0 4px 6px -1px rgba(0,0,0,0.07)`
- 弹窗：`0 20px 25px -5px rgba(0,0,0,0.1)`

### 2.5 字体

- 中文：PingFang SC / Microsoft YaHei
- 英文/数字：Inter
- 字号：12px（辅助）/ 14px（正文）/ 16px（标题）/ 20px（大标题）

---

## 3. 组件状态定义

### 3.1 Button

| 状态 | Primary | Secondary | Ghost |
|------|---------|-----------|-------|
| 默认 | `brand-500` 背景，白字 | 白背景，`border-200` | 透明，`text-secondary` |
| 悬停 | `brand-600` | `surface-2` 背景 | `surface-2` 背景 |
| 禁用 | 50% 透明度 | 50% 透明度 | 50% 透明度 |
| 加载 | Spinner + 文字 | Spinner + 文字 | Spinner + 文字 |

### 3.2 Card

| 状态 | 样式 |
|------|------|
| 默认 | 白底，`border-200`，`shadow-card` |
| 悬停 | `border-300`，`shadow-card-hover` |
| 选中 | `brand-50` 边框 |

### 3.3 Input

| 状态 | 样式 |
|------|------|
| 默认 | 白底，`border-200` |
| 聚焦 | `brand-500` 边框，`ring-brand-500/20` |
| 错误 | `danger` 边框，`ring-danger/20` |
| 禁用 | `surface-1` 背景，`text-tertiary` |

### 3.4 Badge

| Variant | 背景 | 文字 |
|---------|------|------|
| success | `#ebfbee` | `#2b8a3e` |
| warning | `#fff9db` | `#e67700` |
| danger | `#fff5f5` | `#c92a2a` |
| info | `#f0f4ff` | `#4c6ef5` |
| neutral | `#f1f3f5` | `#6c757d` |

---

## 4. 页面设计

### 4.1 工作台 `/dashboard`

**布局：** 单栏，顶部 PageHeader，下方网格

**组件：**
- PageHeader: "工作台" + "新建内容"按钮（PM-9：点击后打开新建内容 Modal，而非直接跳转 /content。Modal 内含品牌 Select + 类型 Select + 字数 Input + 引擎 Select，确认后跳转编辑器）
- 统计卡片网格：4 列（品牌数 / 本月内容 / 平均可见度 / 订阅状态）
- **统计卡片增强（PM-4）：** 每个指标显示当前值 + 目标值对比
  - 品牌数：`3`（无目标，仅显示已创建数）
  - 本月内容：`7 / 10 篇` + 进度条（70%）
  - 平均可见度：`62.4` + 目标 `80` + 差距 `17.6`
  - 订阅状态：`Pro` + 管理链接
- 最近内容列表：表格（标题 / 品牌 / 状态 / 操作）
- 快捷入口：3 个卡片（新建内容 / 查看分析 / 管理品牌）

**响应式：** `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

### 4.2 品牌管理 `/brands`

**布局：** 单栏，顶部 PageHeader，下方卡片网格

**组件：**
- PageHeader: "品牌管理" + "新建品牌"按钮
- 品牌卡片网格：品牌名 / 官网 / 产品数 / 操作（编辑/删除）
- 新建/编辑：**侧边抽屉（Drawer）**（PM-1 修正，替代 Modal）
  - 宽度：480px
  - 从右侧滑入，200ms ease-out 动画（ARCH-4）
  - **表单分组（PM-7）：**
    - 分组 1「基本信息」：品牌名称（必填）、官网 URL、所属行业（下拉）
    - 分组 2「品牌资料」：产品/服务（textarea）、品牌描述（textarea）、目标受众（textarea）、核心卖点（textarea）
    - 每组标题 12px 小写字标签 + 分隔线
  - 底部操作：取消 + 保存（保存按钮显示 loading spinner，QA-6）
  - 保存后关闭抽屉，刷新列表

**响应式：** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

**空状态：** EmptyState + "创建第一个品牌" CTA

### 4.3 内容中心 `/content`

**布局：** 单栏，顶部 PageHeader，筛选栏，表格

**组件：**
- PageHeader: "内容中心" + "新建内容"按钮
- 筛选栏：Select（品牌 / 类型 / 状态）+ Input（搜索）
- 内容表格：标题 / 品牌 / 类型 / 状态(Badge) / 字数 / 日期 / 操作
- 新建内容弹窗：Modal + Select（品牌）+ Select（类型）+ Input（字数）+ Select（引擎）

**响应式：** 表格在小屏改为卡片列表

**空状态：** EmptyState + "创建第一篇内容" CTA

### 4.4 内容编辑 `/content/[id]`

**布局：** 两栏（左侧编辑器，右侧预览/信息）

**组件：**
- 顶部面包屑导航（PM-5）：`内容中心 / {文章标题}` + 状态 Badge + 操作按钮组（复制 Markdown / 复制 HTML / 发布）
  - 面包屑层级：`/content` → `/content/[id]`，点击「内容中心」返回列表
- 左栏：TipTap 编辑器（工具栏 + 编辑区）
  - **编辑器高度：** 固定 `500px`，内容超出时内部滚动（`h-[500px] overflow-y-auto`）
  - 工具栏和字数统计固定在顶部/底部，不随内容滚动
- 右栏 Tab：预览 / 分发指南 / 采用追踪
  - **预览区高度：** 最大 `576px`（`max-h-[36rem]`），超出滚动
  - **分发指南：** 结构化渲染平台卡片（平台名称 + 最佳发布时间 + 分发步骤有序列表），不再展示原始 JSON

**响应式（DEV-4 + UI-5）：** 两栏改为堆叠，堆叠顺序：①面包屑+操作栏 ②编辑器（全宽）③右栏卡片（默认折叠为 accordion，仅展开「基本信息」，点击展开其他卡片）

### 4.5 数据分析 `/analytics`

**布局：** Tab 导航 + 内容区

**组件：**
- Tab 导航：可见性监控 / 竞品分析 / 品牌对比
- Tab 1（可见性）：品牌 Select + 引擎 Select + 检测按钮 + 结果卡片
- Tab 2（竞品）：品牌 Select + 竞品列表 + 差距图表
- Tab 3（对比）：多品牌 Select + 对比图表

**响应式：** Tab 改为下拉选择，图表全宽

### 4.6 订阅管理 `/subscription`

**布局：** 居中，定价卡片网格

**组件：**
- 当前计划卡片（高亮）
- 三档定价卡片：Free / Pro / Agency
- 用量进度条

**响应式：** 三列改为单列堆叠

---

## 5. 样式变量（CSS Custom Properties）

```css
:root {
  /* Colors */
  --brand-50: #f0f4ff;
  --brand-500: #4c6ef5;
  --brand-600: #4263eb;
  --surface-0: #ffffff;
  --surface-1: #f8f9fa;
  --surface-2: #f1f3f5;
  --surface-3: #e9ecef;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --text-tertiary: #adb5bd;
  --success: #40c057;
  --warning: #fab005;
  --danger: #fa5252;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Shadow */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-card-hover: 0 4px 6px -1px rgba(0,0,0,0.07);
  --shadow-modal: 0 20px 25px -5px rgba(0,0,0,0.1);

  /* Font */
  --font-sans: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 14px;
  --text-lg: 16px;
  --text-xl: 20px;
}
```

---

## 6. 架构约束（评审修正）

### 6.1 AppShell Server Component 模式（ARCH-1 + ARCH-5）

AppShell 的根 layout 必须是 Server Component，Sidebar 作为 Client 子组件处理交互：

```
app/(app)/layout.js          → Server Component（无 'use client'）
├── Sidebar.js               → Client Component（导航项、折叠按钮、collapsed 状态）
├── TopBar                   → Client Component（语言切换器，右上角）
└── <main>{children}</main>  → Server Component（页面内容）
```

**ARCH-5 合并说明：** SidebarWrapper 与 Sidebar 功能高度重叠，合并为单一 `Sidebar.js` Client Component。collapsed 状态、localStorage 持久化、折叠按钮逻辑全部收敛在 Sidebar 内部。合并后 Sidebar.js 仍为 Client Component（保持 `'use client'`），仅消除了 SidebarWrapper 中间层。

**语言切换器位置（v2.5 修正）：** LanguageSwitcher 从 Sidebar 底部移至 Main 区域顶部右侧（`h-14` 高度 bar，`justify-end`），符合 SaaS 惯例（Notion/Linear 均在右上角）。

**实现要点：**
- `app/(app)/layout.js` 不加 `'use client'`
- Sidebar.js 为 Client Component，内部管理 collapsed 状态
- LanguageSwitcher 在 AppShell.js 的 main 区域顶部渲染
- 页面内容 `children` 保持 Server Component 能力

### 6.2 Sidebar 状态持久化（ARCH-2）

折叠状态使用 `localStorage` 持久化（ARCH-5：逻辑在 Sidebar.js 内部）：

```js
// Sidebar.js
const [collapsed, setCollapsed] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sidebar-collapsed') === 'true'
  }
  return false
})

useEffect(() => {
  localStorage.setItem('sidebar-collapsed', String(collapsed))
}, [collapsed])
```

### 6.3 移动端 Sidebar 行为（QA-2 + QA-5）

| 断点 | Sidebar 行为 |
|------|-------------|
| `≥ 1024px (lg)` | 固定展开，可折叠为图标模式 |
| `768px - 1023px (md)` | 折叠为图标模式（仅显示 icon），hover 展开 |
| `< 768px (sm)` | 隐藏，通过汉堡按钮触发 Drawer 覆盖层 |

**移动端汉堡按钮（QA-5）：**
- 固定在页面左上角（`position: fixed; top: 12px; left: 12px`）
- 点击后 Sidebar 从左侧滑出覆盖层
- **触摸区域：** 最小 44x44px（WCAG 2.5.5），实际图标 24x24px，padding 扩展至 44x44px
- 层级：`z-index: 40`（低于 Sidebar 的 `z-index: 50`）
- 背景：`bg-white/80 backdrop-blur-sm`，圆角 `radius-md`

---

## 7. 新增组件（评审修正）

### 7.1 Drawer 组件（PM-1 + ARCH-4 + QA-6）

`frontend/src/app/components/ui/Drawer.js`

Props: `{ isOpen, onClose, title, children, footer, side = 'right', width = 480, loading = false }`

**状态：**
- 默认：始终渲染 DOM，通过 `translateX(100%)` 移出可视区
- 打开：`translateX(0)` + 遮罩 `opacity 0→1`（200ms ease-out）
- 关闭：`translateX(100%)` + 遮罩 `opacity 1→0`（200ms ease-out）
- ESC 键关闭
- loading=true 时：footer 区域替换为禁用按钮 + spinner + "保存中..."

**动画实现（ARCH-4 + UI-4）：**
- 使用 `mounted` state 控制 translateX，避免直接条件渲染导致无动画
- 打开时 `requestAnimationFrame` 延迟一帧设置 mounted=true，触发 CSS transition
- 关闭时先设 mounted=false，transition 结束后通过 `onTransitionEnd` 回调设置 `visibility: hidden`
- **竞态保护（ARCH-8）：** useEffect cleanup 中 `cancelAnimationFrame` 取消 pending rAF

**样式（DEV-5）：**
- 宽度：默认 480px（可配置）
- 背景：白色
- 阴影：`var(--shadow-modal)`
- 标题区：与 Modal 一致
- 内容区：可滚动
- 底部操作区：固定
- side='right' 时：`right: 0`，translateX 初始 `100%`
- side='left' 时：`left: 0`，translateX 初始 `-100%`
