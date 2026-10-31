// scripts/now_update.mjs — генератор авто-блоку пульсу NOW.md.
// Принцип: що не пишеться руками — те не дрейфує. Усе, що знає git (гілка, коміти,
// що не доїхало в main, незакомічене), генерується сюди. Прозу поза блоком
// <!-- AUTO:START -->…<!-- AUTO:END --> скрипт НЕ чіпає ніколи.
//   node scripts/now_update.mjs           # перезаписати авто-блок
//   node scripts/now_update.mjs --check   # код 1, якщо блок застарів
//
// 🪤 У цьому проєкті NOW.md лежить У КОРЕНІ, а не в docs/ (кит ставив у docs/).
//    Другий пульс = рівно той дрейф, проти якого кит і заведено.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOW = join(ROOT, 'NOW.md');
const MAIN = 'main';                       // назва бойової гілки
const IS_AUTO = s => /^auto\(/.test(s);    // автокоміти ботів — не робота людини
const START = '<!-- AUTO:START -->', END = '<!-- AUTO:END -->';

const git = (...a) => { try {
  return execFileSync('git', ['-c', 'core.quotepath=false', ...a],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, TZ: 'UTC' } }).trim();
} catch { return ''; } };

const branch = git('branch', '--show-current') || '(detached)';
const human = git('log', '-40', '--date=format:%d.%m %H:%M', '--format=%h|%ad|%s')
  .split('\n').filter(Boolean).map(l => l.split('|')).filter(([, , s]) => s && !IS_AUTO(s)).slice(0, 4);
const base = git('rev-parse', '--verify', '-q', `origin/${MAIN}`) ? `origin/${MAIN}` : MAIN;
// Дві крапки = чесна різниця файлів (три крапки бреше після злиття main у гілку).
const notInMain = branch === MAIN ? [] : git('diff', '--name-only', `${base}..HEAD`).split('\n').filter(Boolean);
const dirty = git('status', '--porcelain').split('\n').filter(Boolean)
  .filter(l => !l.endsWith('NOW.md')).length;   // сам пульс не рахуємо — інакше --check вічно червоний
const today = new Date().toISOString().slice(0, 10);
// 🪤 Журнали в цьому проєкті звуться vova-<дата>.md, не session-<дата>.md.
const log = join(ROOT, '_session-log', `vova-${today}.md`);

const block = [START, '',
  '> 🤖 Блок генерує `scripts/now_update.mjs`. Руками не правити.', '',
  '| поле | значення |', '|---|---|',
  `| гілка | \`${branch}\` |`,
  `| останній коміт людини | ${human[0] ? `\`${human[0][0]}\` ${human[0][1]} — ${human[0][2]}` : '—'} |`,
  `| незакомічених файлів | ${dirty}${dirty ? ' ⚠️' : ' ✅'} |`,
  `| журнал за ${today} | ${existsSync(log) ? '✅ є' : '**НЕМАЄ** ⚠️'} |`, '',
  `**Не доїхало в \`${MAIN}\`:** ${notInMain.length ? '' : 'нічого ✅'}`,
  ...notInMain.slice(0, 10).map(f => `- \`${f}\``),
  ...(notInMain.length > 10 ? [`- …і ще ${notInMain.length - 10}`] : []), '',
  '**Останні кроки:**', ...human.map(([h, d, s]) => `- \`${h}\` ${d} — ${s}`), '', END].join('\n');

const text = readFileSync(NOW, 'utf8');
const a = text.indexOf(START), b = text.indexOf(END);
if (a < 0 || b < 0) { console.error('❌ У NOW.md немає маркерів AUTO:START/END'); process.exit(1); }
const next = text.slice(0, a) + block + text.slice(b + END.length);
if (process.argv.includes('--check')) {
  if (next !== text) { console.error('❌ Авто-блок NOW.md застарів: node scripts/now_update.mjs'); process.exit(1); }
  console.log('✅ авто-блок свіжий'); process.exit(0);
}
writeFileSync(NOW, next);
console.log('✅ NOW.md — авто-блок оновлено з git.');
