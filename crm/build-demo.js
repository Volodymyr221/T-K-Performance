/* ═══════════════════════════════════════════════════════════════════
   Збірка демо в ОДИН файл — щоб CRM можна було відкрити за посиланням
   з телефона, без локального сервера.

   🔴 Джерело одне: `crm/app/`. Цей скрипт нічого не переписує руками,
   він лише склеює. Змінив app/ — перезапустив скрипт — оновив демо.
   Копії коду, яка може розійтися з оригіналом, не існує.

   Дві відмінності демо від справжнього застосунку, обидві вимушені:
     1. шрифти беруться з Google Fonts, бо файли сайту лежать поруч
        із репозиторієм, а демо — окрема сторінка;
     2. висота обмежена знизу, бо демо живе у вбудованому вікні.

   Запуск:  node crm/build-demo.js
   Вихід:   crm/demo.html
   ═══════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, 'app');
const read = (p) => fs.readFileSync(path.join(APP, p), 'utf8');

const css = read('css/app.css');
const js = ['js/mock.js', 'js/i18n.js', 'js/data.js', 'js/app.js']
  .map(f => `/* ── ${f} ── */\n` + read(f))
  .join('\n\n');

// Розмітка з index.html — те, що між <body> і </body>, без тегів скриптів.
const html = read('index.html')
  .replace(/[\s\S]*<body>/, '')
  .replace(/<\/body>[\s\S]*/, '')
  .replace(/\s*<script[\s\S]*?<\/script>/g, '')
  .trim();

const out = `<title>T&K Workshop Desk</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap">

<style>
${css}

/* ── Тільки для демо ──────────────────────────────────────────────
   Демо відкривається у вбудованому вікні, і 100vh там може дати
   смужку в кілька сантиметрів. Нижня межа тримає робочу висоту. */
.shell{ min-height:640px }
body{ overflow:auto }
</style>

${html}

<script>
${js}
</script>
`;

const dest = path.join(__dirname, 'demo.html');
fs.writeFileSync(dest, out, 'utf8');
console.log('demo.html зібрано:', (out.length / 1024).toFixed(1) + ' КБ');
