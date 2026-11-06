/* ═══════════════════════════════════════════════════════════
   Збирає рекламний креатив для Facebook: фото + логотип + сайт.
   Один розмір для всіх — 1080×1350 (4:5, формат стрічки).

   node ad/social/make.cjs <фото> <вихід.jpg> [опції]

     --eye  "NOW OPEN IN BOGNOR REGIS"   рядок червоним капсом над заголовком
     --head "Engine work.\nDone here."   головний рядок (\n = перенос)
     --sub  "BMW ONLY · BOGNOR REGIS"    дрібний рядок під заголовком (\n = перенос)
     --site "tk-performance.co.uk"
     --pos  "center 38%"                 що лишити в кадрі при обрізанні
     --hsize 74                          кегль головного рядка

   🔑 Рендеримо у 2× (2160×2700) і зменшуємо до 1080×1350. Текст
   виходить чистий, а шари після зменшення трохи сідають один в
   одного — саме цього й треба, щоб накладка не стирчала.
   ═══════════════════════════════════════════════════════════ */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const W = 1080, H = 1350, SCALE = 2;

const b64 = (p, mime) => "data:" + mime + ";base64," + fs.readFileSync(p).toString("base64");

function arg(name, fallback) {
  const i = process.argv.indexOf("--" + name);
  /* 🪤 Було `process.argv[i+1] ? …`, і порожнє значення (`--eye ''`)
     як «хибне» підмінялось замовчуванням: вимкнути рядок було
     неможливо, а перевірка контрасту на картці без тексту мовчки
     міряла картку З текстом. */
  return i > -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}

(async () => {
  const src = process.argv[2];
  const out = process.argv[3];
  if (!src || !out) {
    console.error("node ad/social/make.cjs <фото> <вихід.jpg> [--head ... --sub ... --site ... --pos ... --hsize ...]");
    process.exit(1);
  }
  if (!fs.existsSync(src)) { console.error("немає файлу: " + src); process.exit(1); }

  const mime = /\.png$/i.test(src) ? "image/png" : "image/jpeg";
  const fonts = `
@font-face{font-family:'Archivo';font-weight:400 800;font-stretch:75% 125%;src:url(${b64(path.join(ROOT, "assets/fonts/archivo-latin-400_800.woff2"), "font/woff2")}) format('woff2')}
@font-face{font-family:'JetBrains Mono';font-weight:500;src:url(${b64(path.join(ROOT, "assets/fonts/jetbrains-mono-latin-500.woff2"), "font/woff2")}) format('woff2')}`;

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = fs.readFileSync(path.join(__dirname, "card.html"), "utf8")
    .replace("__FONTS__", fonts)
    .replace("__PHOTO__", b64(src, mime))
    .replace("__LOGO__", b64(path.join(ROOT, "assets/img/logo.png"), "image/png"))
    .replace("__POS__", arg("pos", "center 38%"))
    .replace("__HSIZE__", arg("hsize", "74"))
    .replace("__EYE__", esc(arg("eye", "")))
    .replace("__HEAD__", esc(arg("head", "BMW only.\nBognor Regis.")).replace(/\\n/g, "\n"))
    .replace("__SUB__", esc(arg("sub", "Engines · Diagnostics · Servicing · MOT")).replace(/\\n/g, "\n"))
    .replace("__SITE__", esc(arg("site", "tk-performance.co.uk")));

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
  const p = await ctx.newPage();
  await p.setContent(html, { waitUntil: "load" });
  /* 🪤 Без цього перші кадри йдуть системним шрифтом: Chromium малює
     ще до того, як woff2 дочитався з data-URI. */
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(250);

  fs.mkdirSync(path.dirname(out), { recursive: true });
  const big = out.replace(/\.(jpe?g|png)$/i, ".2x.png");
  await p.screenshot({ path: big });
  await b.close();

  /* Зменшуємо з 2× у кінцевий розмір. `lanczos` дає чистий край
     тексту; якість 92 — межа, за якою Facebook усе одно перетисне. */
  const { execFileSync } = require("child_process");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", big,
    "-vf", `scale=${W}:${H}:flags=lanczos`, "-q:v", "3", out]);
  fs.unlinkSync(big);

  const kb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(`✅ ${out}  ${W}×${H}  ${kb} KB`);
})();
