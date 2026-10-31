// tests/docs-fresh.mjs — СТОРОЖ БЮДЖЕТУ ЧИТАННЯ.
// Навіщо: обовʼязкове читання на старті сесії розростається непомітно. У сусідньому
// проєкті власника заміряно: 8 «обовʼязкових» файлів = 1193 KB ≈ 407 тис. токенів
// при вікні 200 тис. (204%). Новий чат читав верхівки, решту тихо губив — і
// виглядало це як «Claude не в курсі, що ми вже зробили». Сторож міряє і падає.
//   node tests/docs-fresh.mjs
//
// 🪤 Стелі тут — НАШОГО проєкту, не китові. CLAUDE.md обіцяє «≈6 тис. токенів,
//    стелю не піднімати»; кит ставив 60K. Слабка стеля = сторож-бутафорія.
import { readFileSync, existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOW = join(ROOT, 'NOW.md');          // у корені, не в docs/
const ENTRY = join(ROOT, 'CLAUDE.md');
const BYTES_PER_TOKEN = 3;          // кирилиця ≈ 3 байти на токен; латиниця дешевша — це запас
const NOW_MAX_LINES = 200, NOW_MAX_BYTES = 16 * 1024;   // ≈5K токенів — ціна, яку платимо щоразу
const READ_BUDGET_TOKENS = 12_000;  // CLAUDE.md обіцяє ≈6K; 12K — запас, а не дозвіл рости
const ONE_FILE_MAX_TOKENS = 6_000;  // один файл не має зʼїдати пів бюджету
// Розділи — РЕАЛЬНІ назви з нашого NOW.md, не з кита.
const SECTIONS = ['ЗАРАЗ', 'ЩО НЕ ГОТОВЕ', 'ПАСТКИ', 'НЕ ЧІПАТИ'];

let pass = 0, fail = 0;
const check = (cond, name, info = '') => {
  cond ? pass++ : fail++;
  console.log(`${cond ? '✅' : '❌'} ${name}${info ? '  — ' + info : ''}`);
};

check(existsSync(NOW), 'NOW.md існує');
if (existsSync(NOW)) {
  const t = readFileSync(NOW, 'utf8');
  const lines = t.split('\n').length, bytes = Buffer.byteLength(t);
  check(lines <= NOW_MAX_LINES, `пульс ≤ ${NOW_MAX_LINES} рядків`, `${lines}`);
  check(bytes <= NOW_MAX_BYTES, `пульс ≤ ${NOW_MAX_BYTES / 1024} KB`, `${(bytes / 1024).toFixed(1)} KB`);
  check(t.includes('<!-- AUTO:START -->') && t.includes('<!-- AUTO:END -->'), 'є авто-блок');
  // Порожній розділ гірший за відсутній — він виглядає як відповідь.
  for (const s of SECTIONS) {
    const m = t.match(new RegExp(`\\n##[^\\n]*${s}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |$)`));
    const body = m ? m[1].replace(/<!--[\s\S]*?-->/g, '').trim() : '';
    check(body.length > 10 && !/\[ЗАПОВНИ\]|\bTODO\b/i.test(body), `розділ «${s}» заповнений`, m ? `${body.length} симв.` : 'немає розділу');
  }
}

check(existsSync(ENTRY), 'CLAUDE.md існує');
if (existsSync(ENTRY)) {
  const t = readFileSync(ENTRY, 'utf8');
  const m = t.match(/<!--\s*MANDATORY:START[\s\S]*?-->([\s\S]*?)<!--\s*MANDATORY:END\s*-->/);
  check(!!m, 'у CLAUDE.md є маркери MANDATORY:START/END');
  if (m) {
    const files = [...new Set([...m[1].matchAll(/`([^`\s]+\.md)`/g)].map(x => x[1]))];
    // 🪤 CLAUDE.md сам стоїть у списку MANDATORY — інакше він рахувався б двічі.
    let total = files.includes('CLAUDE.md') ? 0 : Buffer.byteLength(t);
    for (const f of files) {
      const p = join(ROOT, f);
      if (!existsSync(p)) { check(false, `обовʼязковий файл існує: ${f}`); continue; }
      const size = statSync(p).size, tok = Math.round(size / BYTES_PER_TOKEN);
      total += size;
      check(tok <= ONE_FILE_MAX_TOKENS, `${f} ≤ ${ONE_FILE_MAX_TOKENS / 1000}K токенів`, `≈${Math.round(tok / 1000)}K`);
    }
    const tokens = Math.round(total / BYTES_PER_TOKEN);
    check(tokens <= READ_BUDGET_TOKENS, `обовʼязкове читання ≤ ${READ_BUDGET_TOKENS / 1000}K токенів`,
      `≈${Math.round(tokens / 1000)}K (${files.length} файлів + CLAUDE.md)`);
  }
}
// КОНТРОЛЬ: вада, від якої сторож заведено, бюджет НЕ проходить (інакше стеля бутафорська).
check(Math.round(1193 * 1024 / BYTES_PER_TOKEN) > READ_BUDGET_TOKENS, 'КОНТРОЛЬ: 1193 KB бюджет не проходить');

console.log(`\n${fail ? '❌' : '✅'} ${pass}/${pass + fail} перевірок пройдено`);
process.exit(fail ? 1 : 0);
