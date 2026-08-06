# GeoRank 开发工作流

## 架构
```
OpenClaw (调度) ──▶ Codex CLI (代码修改) ──▶ /workspace/harms-geo/
                    │                         ├── backend/
                    │                         ├── frontend/
                    │                         └── ...
OpenHands (架构分析) ◀── OpenClaw 分配
```

## 工具分工

| 工具 | 职责 | 接口 |
|------|------|------|
| **OpenClaw** | 任务调度、进度跟踪、代码审查 | 对话指令 |
| **Codex CLI** | 具体代码修改（Bug修复、重构） | `codex-edit.sh <file> "task"` |
| **OpenHands** | 架构分析、整体评估 | Web UI: http://106.54.233.205:8000 |

## 使用方式

### Codex 代码修改
```bash
cd /workspace/harms-geo
./codex-edit.sh backend/app/services/usage_tracker.py "修复配额检查"
```

### OpenHands 架构分析
浏览器打开 http://106.54.233.205:8000
- 新建会话 → 工作目录: /workspace/harms-geo
- 输入分析任务

### OpenClaw 调度
告诉 Crestodian：
- "分析项目架构" → OpenHands
- "修复 Bug #X" → Codex
- "提交代码到 GitHub" → Git 操作
