#!/usr/bin/env bash
# .claude/hooks/session-git-sync.sh — SessionStart: git fetch + голосно, якщо щось відстає.
# Навіщо (і до чого тут токени): контейнер може відновитись на застарілий знімок git —
# тоді вже зроблена робота ВИГЛЯДАЄ втраченою, і Claude годинами «відновлює» те, що
# лежить на origin. Один fetch на старті дешевший за будь-яке розслідування.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0
if ! timeout 20 git fetch origin --quiet 2>/dev/null; then
  echo "⚠️ GIT-СИНК: git fetch не вдався (мережа?). Рефи можуть бути застарілі."; exit 0
fi
warn=""
if git rev-parse --verify -q origin/main >/dev/null && git rev-parse --verify -q main >/dev/null; then
  n=$(git rev-list --count main..origin/main 2>/dev/null || echo 0)
  [ "${n:-0}" -gt 0 ] && warn+=$'\n'"⚠️ Локальний main відстає від origin/main на ${n} комітів."
fi
cur=$(git branch --show-current 2>/dev/null || true)
if [ -n "$cur" ] && [ "$cur" != main ] && git rev-parse --verify -q "origin/$cur" >/dev/null; then
  n=$(git rev-list --count "$cur..origin/$cur" 2>/dev/null || echo 0)
  [ "${n:-0}" -gt 0 ] && warn+=$'\n'"⚠️ Гілка '$cur' відстає від origin/$cur на ${n} комітів."
fi
if [ -n "$warn" ]; then
  printf '🔄 ГІТ-СИНК: fetch виконано.%s\n➡️ «Щось зникло / git незрозумілий» — СПЕРШУ git fetch, потім висновки.\n' "$warn"
fi
exit 0
