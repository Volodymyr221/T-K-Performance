#!/usr/bin/env node
// .claude/hooks/token-guard.js — ТОКЕН-ЗАПОБІЖНИК для субагентів.
// Якщо ОДИН Agent/Task-виклик спалив > LIMIT токенів → прапорець .claude/.token-halt,
// і КОЖЕН наступний інструмент блокується, доки людина не підтвердить продовження
// (тоді: rm .claude/.token-halt). Субагент стартує «з нуля» і перечитує те, що
// головний чат уже знає, — найдорожчий спосіб робити роботу.
//   'post' — PostToolUse (Agent|Task): заміряти, за перевищення поставити прапорець.
//   'pre'  — PreToolUse (*): прапорець є → deny (exit 2), крім команди, що його знімає.
// Fail-open: будь-яка помилка → exit 0 (сесію не ламаємо).
const fs = require('fs');
const path = require('path');

const FLAG = path.join(process.env.CLAUDE_PROJECT_DIR || path.join(__dirname, '..', '..'), '.claude', '.token-halt');
const LIMIT = 350000;
const mode = process.argv[2] || 'pre';

function tokensFrom(r) {
  if (!r || typeof r !== 'object') return 0;
  const u = r.usage || r.totalUsage || {};
  let sum = (Number(u.input_tokens || u.inputTokens || 0) || 0) + (Number(u.output_tokens || u.outputTokens || 0) || 0);
  if (!sum && typeof r.totalTokens === 'number') sum = r.totalTokens;
  if (!sum && u && typeof u.total_tokens === 'number') sum = u.total_tokens;
  return sum || 0;
}

let input = '';
process.stdin.on('data', c => (input += c));
process.stdin.on('end', () => {
  try {
    const d = JSON.parse(input || '{}');
    if (mode === 'post') {
      if (!/^(Agent|Task)$/.test(d.tool_name || '')) process.exit(0);
      const spent = tokensFrom(d.tool_response);
      if (spent > LIMIT) {
        try { fs.writeFileSync(FLAG, `HALT ${new Date().toISOString()} tool=${d.tool_name} tokens=${spent} limit=${LIMIT}\n`); } catch (_) {}
        console.error(`\n🛑 ТОКЕН-ЗАПОБІЖНИК: один ${d.tool_name}-виклик спалив ${spent.toLocaleString()} токенів (поріг ${LIMIT.toLocaleString()}).\n` +
          'Роботу зупинено. Продовжити — лише після підтвердження людини: rm .claude/.token-halt');
      }
      process.exit(0);
    }
    if (!fs.existsSync(FLAG)) process.exit(0);
    const cmd = (d.tool_input && d.tool_input.command) || '';
    if (d.tool_name === 'Bash' && /\brm\b/.test(cmd) && /\.token-halt/.test(cmd)) process.exit(0);
    console.error('\n🛑 СЕСІЯ НА ПАУЗІ (токен-запобіжник). ' + fs.readFileSync(FLAG, 'utf8').trim() +
      '\nСпитай людину. Після «так»: rm .claude/.token-halt');
    process.exit(2);
  } catch (_) { process.exit(0); }
});
