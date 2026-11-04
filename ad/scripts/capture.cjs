/* Етап 4 — збір реальних активів сторінки.
   Q1: сторінку, що вже існує, НЕ малюємо руками — знімаємо браузером.
   Q2: текстура 4x від CSS-ширини 540 → 2160px, показуємо на 1080 = 2x запас. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2];
const W = 540, DSF = 4;
fs.mkdirSync(path.join(OUT, 'textures'), { recursive: true });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: 960 }, deviceScaleFactor: DSF });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:8777/', { waitUntil: 'networkidle' });

  // Анімації появи (.reveal) ховають половину сторінки — вмикаємо все одразу,
  // інакше в кадр поїдуть напівпрозорі зсунуті блоки.
  await p.addStyleTag({ content: `
    *,*::before,*::after{ animation:none !important; transition:none !important }
    .reveal{ opacity:1 !important; transform:none !important }
    .cc{ display:none !important }
  `});
  await p.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-in')));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(700);

  const pageH = await p.evaluate(() => document.documentElement.scrollHeight);
  await p.screenshot({ path: path.join(OUT, 'textures', 'page.png'), fullPage: true });

  // Елементи: назва → селектор. Прозоре тло там, де елемент летить окремо.
  const SEL = {
    logo:     '.hdr__logo img',
    heroH1:   '.hero__h1',
    svcHead:  '#services .sec__head',
  };
  const cards = await p.$$('#services .card');
  cards.forEach((_, i) => { SEL['card' + (i + 1)] = `#services .card:nth-of-type(${i + 1})`; });

  const layout = { pageW: W, pageH, dsf: DSF, el: {} };
  for (const [name, sel] of Object.entries(SEL)) {
    const h = await p.$(sel);
    if (!h) { console.log('⚠️  не знайдено:', name, sel); continue; }
    const box = await h.evaluate(e => {
      const r = e.getBoundingClientRect();
      return { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height };
    });
    if (!box || box.width < 2) { console.log('⚠️  порожній bbox:', name); continue; }
    await h.screenshot({ path: path.join(OUT, 'textures', name + '.png'), omitBackground: false });
    layout.el[name] = { x: +box.x.toFixed(1), y: +box.y.toFixed(1), w: +box.width.toFixed(1), h: +box.height.toFixed(1) };
  }

  // Тексти карток — щоб підписи у відео збігалися з сайтом слово в слово.
  layout.cards = await p.$$eval('#services .card', els => els.map(e => ({
    h: (e.querySelector('h3')?.textContent || '').trim(),
    p: (e.querySelector('p')?.textContent || '').trim().slice(0, 160),
    chips: [...e.querySelectorAll('.chip')].map(c => c.textContent.trim())
  })));

  fs.writeFileSync(path.join(OUT, 'layout.json'), JSON.stringify(layout, null, 2));
  console.log('pageH =', pageH, '· елементів =', Object.keys(layout.el).length, '· карток =', layout.cards.length);
  await b.close();
})();
