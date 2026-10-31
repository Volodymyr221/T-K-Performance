#!/usr/bin/env bash
# .claude/hooks/context-warning.sh — UserPromptSubmit: попереджає, коли контекст заповнюється.
# Рахує РЕАЛЬНІ токени з usage останньої відповіді (input + кеш), а не байти файлу.
# Пороги — частка вікна CONTEXT_LIMIT. Не блокує, лише показує systemMessage.
CONTEXT_LIMIT="${CONTEXT_LIMIT:-200000}"   # вікно моделі; для 1M-вікна постав 1000000
input=$(cat)
command -v python3 >/dev/null 2>&1 || exit 0
tokens=$(printf '%s' "$input" | python3 -c '
import json, sys
try: tp = json.load(sys.stdin).get("transcript_path") or ""
except Exception: sys.exit(0)
last = None
try:
    with open(tp, encoding="utf-8") as f:
        for line in f:
            try: m = json.loads(line).get("message")
            except Exception: continue
            if isinstance(m, dict) and m.get("role") == "assistant" and isinstance(m.get("usage"), dict):
                last = m["usage"]
except Exception: sys.exit(0)
if last:
    print((last.get("input_tokens") or 0) + (last.get("cache_read_input_tokens") or 0) + (last.get("cache_creation_input_tokens") or 0))
' 2>/dev/null)
case "$tokens" in ''|*[!0-9]*) exit 0 ;; esac
pct=$(( tokens * 100 / CONTEXT_LIMIT )); k=$(( tokens / 1000 ))
if (( pct >= 85 )); then
  echo "{\"systemMessage\": \"🔴 КОНТЕКСТ ${pct}% (~${k}K) — зроби /onovy і переходь у новий чат\"}"
elif (( pct >= 70 )); then
  echo "{\"systemMessage\": \"⚠️ КОНТЕКСТ ${pct}% (~${k}K) — скоро /onovy; веди журнал сесії щокроку\"}"
fi
exit 0
