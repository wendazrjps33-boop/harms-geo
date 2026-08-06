# 三方联合 Review — Engine 分级实现

**日期**：2026-05-27
**审查范围**：Engine 分级（Pro 4 引擎 / Agency 6 引擎）
**参与方**：产品经理 · 架构师 · 开发工程师 · 测试工程师

---

## 一、变更清单

| 文件 | 变更 |
|------|------|
| `schemas/content.py:41` | engine 枚举扩展：+claude\|gemini |
| `routers/content.py:37` | 新增 `PREMIUM_ENGINES = {"claude", "gemini"}` |
| `routers/content.py:120-126` | generate 接口增加 plan_code 校验，非 agency 返回 403 |
| `content/page.js:24-25` | AI_MODELS 加 claude/gemini（premium: true） |
| `content/page.js:53` | 新增 userPlan state |
| `content/page.js:113-116` | loadData 并行获取订阅信息 |
| `content/page.js:74` | availableModels 按 plan 过滤 |
| `content/page.js:448` | 下拉框渲染改用 availableModels |
| `content/page.js:28-35` | ENGINE_LABELS 加 claude/gemini 映射 |

---

## 二、逐角色审查

### 2.1 产品经理 — 业务逻辑审查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 分级策略匹配定价 | ✅ | Free/Pro → 4 引擎，Agency → 6 引擎 |
| 错误提示用户可理解 | ✅ | "引擎 X 仅 Agency 计划可用，请升级或切换至其他引擎" |
| 前端选项与后端一致 | ✅ | premium 标记 → availableModels 过滤 → 下拉框 |
| 降级场景覆盖 | ⚠️ | 见 BUG-01 |

**BUG-01（UX · LOW）：localStorage 降级残留**

用户从 Agency 降级为 Pro 后：
1. localStorage 仍保存 `georank_engine = "claude"`
2. 页面加载时 useEffect 从 AI_MODELS 匹配，claude 存在于 AI_MODELS → 恢复选中
3. availableModels 过滤掉 claude，下拉框默认显示 mimo（value 不在选项中）
4. 用户点击生成 → 后端 403

**修复方案**：useEffect 中增加 plan 过滤检查，或在 userPlan 加载后重置不合法的 selectedEngine。

### 2.2 架构师 — 架构审查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| Schema vs Router 职责分离 | ✅ | Schema 声明所有合法值，Router 执行业务权限校验 |
| 前端过滤为 defense-in-depth | ✅ | 非主门控，后端 403 是最终保障 |
| 无循环依赖 | ✅ | routers/content → subscription_gate.get_user_plan_code 单向 |
| 新增 DB 查询 | ⚠️ | 每次 generate 额外 1 次 Redis GET（get_user_plan_code 有缓存） |

**架构确认**：改动在配置层面，未改变模块边界和数据流方向。可接受。

### 2.3 开发工程师 — 代码审查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 后端改动量 | ✅ | 1 常量 + 6 行逻辑，无副作用 |
| 前端改动量 | ✅ | 4 行状态 + 1 行过滤 + 1 行渲染替换 |
| subscriptionAPI 错误处理 | ✅ | `.catch(() => null)` 优雅降级，不影响页面加载 |
| generate 请求参数完整性 | ✅ | engine: selectedEngine 正确传入 |
| 向后兼容 | ✅ | 默认值 mimo 不变，现有用户无感知 |

### 2.4 测试工程师 — 质量审查

| 测试场景 | 预期 | 实际 | 状态 |
|----------|------|------|------|
| Pro 用户选择 mimo 生成 | 202 成功 | — | ✅ 逻辑正确 |
| Pro 用户选择 claude 生成 | 403 Forbidden | — | ✅ 后端校验存在 |
| Agency 用户选择 claude 生成 | 202 成功 | — | ✅ 逻辑正确 |
| 前端 Pro 用户查看下拉框 | 仅显示 4 引擎 | — | ✅ availableModels 过滤 |
| 前端 Agency 用户查看下拉框 | 显示 6 引擎 | — | ✅ premium 不过滤 |
| Agency 降级为 Pro 后页面加载 | 应重置为 mimo | claude 残留 | ⚠️ BUG-01 |

---

## 三、联合结论

| 结论 | 说明 |
|------|------|
| 功能完整性 | 前后端双重校验，分级策略正确实现 |
| 代码质量 | 改动极小，无破坏性变更 |
| 已知问题 | 1 项 UX 问题（localStorage 降级残留） |
| 发布建议 | **Go** — BUG-01 为非阻塞 UX 问题，可后续修复 |

### BUG-01 修复建议（可选，非阻塞）

在 `content/page.js` 的 useEffect 中增加 plan 感知：

```javascript
useEffect(() => {
  const saved = localStorage.getItem('georank_engine')
  if (saved && availableModels.some((m) => m.value === saved)) {
    setSelectedEngine(saved)
  } else {
    setSelectedEngine('mimo')
  }
}, [userPlan])
```

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 三方联合 Review · Engine 分级
结论：Go（可发布），1 项 UX 问题可后续修复
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
