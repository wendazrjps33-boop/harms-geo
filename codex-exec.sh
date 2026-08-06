#!/bin/bash
# GeoRank 开发工作流 - Codex 执行器
# 用法: ./codex-exec.sh "任务描述"

TASK="$1"
if [ -z "$TASK" ]; then
  echo "用法: ./codex-exec.sh \"任务描述\""
  exit 1
fi

echo "=== 执行任务 ==="
echo "$TASK"
echo "================"

curl -s http://127.0.0.1:8788/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"mimo-v2.5-pro\",
    \"messages\": [{\"role\": \"user\", \"content\": $(echo "$TASK" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')}],
    \"max_tokens\": 4096
  }" 2>&1 | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('choices',[{}])[0].get('message',{}).get('content',''))
" 2>&1
