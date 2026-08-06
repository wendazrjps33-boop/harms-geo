#!/bin/bash
# GeoRank 开发工作流 - Codex 代码修改器
# 用法: ./codex-edit.sh <文件路径> "任务描述"
#
# 工作原理：
# 1. 读取目标文件内容
# 2. 连同任务描述一起发给 MiMo
# 3. MiMo 返回修改后的完整代码
# 4. 自动备份原文件并替换

FILE="$1"
TASK="$2"

if [ -z "$FILE" ] || [ -z "$TASK" ]; then
  echo "用法: ./codex-edit.sh <文件路径> \"任务描述\""
  echo "示例: ./codex-edit.sh backend/app/services/usage_tracker.py \"修复 _get_plan_limits 中 query/check 硬编码为 -1 的问题\""
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "错误: 文件不存在: $FILE"
  exit 1
fi

echo "=== 目标文件: $FILE ==="
echo "=== 任务: $TASK ==="
echo ""

# 读取文件内容
CONTENT=$(cat "$FILE")

# 构建 prompt
PROMPT="你是一个 Python 开发工程师。请修改以下代码文件来完成指定任务。

## 任务
$TASK

## 当前文件内容
\`\`\`python
$CONTENT
\`\`\`

## 要求
1. 输出修改后的完整文件内容（不要省略任何部分）
2. 只输出代码，不要解释
3. 用 \`\`\`python 和 \`\`\` 包裹
4. 保持原有代码风格

## 修改后的完整代码："

# 调用 MiMo API
RESPONSE=$(curl -s http://127.0.0.1:8788/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"mimo-v2.5-pro\",
    \"messages\": [{\"role\": \"user\", \"content\": $(echo "$PROMPT" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')}],
    \"max_tokens\": 8192
  }" 2>&1)

# 提取代码
CODE=$(echo "$RESPONSE" | python3 -c "
import sys, json, re
d = json.load(sys.stdin)
content = d.get('choices',[{}])[0].get('message',{}).get('content','')
# 提取 python 代码块
match = re.search(r'\`\`\`python\n(.*?)\`\`\`', content, re.DOTALL)
if match:
    print(match.group(1).strip())
else:
    print(content)
" 2>&1)

if [ -z "$CODE" ]; then
  echo "错误: MiMo 未返回有效代码"
  exit 1
fi

# 备份原文件
cp "$FILE" "${FILE}.bak"

# 写入新代码
echo "$CODE" > "$FILE"

echo "✅ 文件已修改: $FILE"
echo "📦 备份: ${FILE}.bak"
echo ""
echo "变更预览:"
diff "${FILE}.bak" "$FILE" | head -30
