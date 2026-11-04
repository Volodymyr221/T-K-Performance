/* ═══════════════════════════════════════════════════════════
   Токени дизайну — ВИТЯГНУТІ з сайту, не вигадані.
   Джерело: assets/css/style.css (:root) і assets/css/fonts.css.
   Правило набору video-shotcraft: мова ролика має вирости з
   самого продукту, а не бути окремою «шкуркою для реклами».
   ═══════════════════════════════════════════════════════════ */

/** Кольори — один в один з `:root` у style.css. */
export const C = {
  bg: "#08080a",
  bgAlt: "#0d0d10",
  surface: "#131317",
  surface2: "#17171c",
  line: "rgba(255,255,255,.09)",
  line2: "rgba(255,255,255,.16)",

  txt: "#f4f5f7",
  txt2: "#a3a6ae",
  txt3: "#7f838d",

  /* BMW M */
  mLblue: "#6cb2e4",
  mBlue: "#0c63b0",
  mRed: "#e4002b", // тло під білим (4.85:1) — НЕ для дрібного тексту
  redTxt: "#ff3355", // дрібний текст на темному (5.17:1)
  redHi: "#ff1f45",
} as const;

/** Тепле світло сцени. Не з палітри сайту — це освітлення, не фірмовий колір. */
export const LAMP = "255,238,212";
export const INK = "14,12,10"; // теплий чорний: гасимо кадр, не вбиваючи колір

export const FONTS = {
  head: '"Archivo", "Helvetica Neue", Arial, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

/* ── Розміри тексту ──────────────────────────────────────────
   🔴 Q11 набору: текст, який глядач МАЄ прочитати, не менший за
   5.2% висоти кадру; допоміжний — 3%. Кадр 1920 → 100px і 58px.
   Міряємо ПІКСЕЛІ в готовому кадрі, не `fontSize` у коді.
   Третього стану немає: або «читати» (великий), або «текстура»
   (явно притемнена, щоб ніхто й не намагався читати).            */
export const T = {
  mega: 132, // головне гасло
  h1: 104,
  h2: 92,
  h3: 76,
  read: 64, // мінімум для «треба прочитати» з запасом
  aux: 58, // допоміжний рядок — рівно межа 3%
  chip: 44, // ТІЛЬКИ як текстура (нижче межі)
} as const;

/* ── Характер руху ───────────────────────────────────────────
   Вісь енергії: ВИСОКА (сервіс про потужність, Stage-тюнінг).
   Вісь тону: СЕРЙОЗНА (інженерія, довіра, гроші клієнта).
   Пресет «активний сміливий» (~18f, bezier(.16,1,.3,1),
   перельот 1.12) — але перельот прибрано до 1.06: 1.12 читається
   як мультик, а тут механіка.
   `ease` — ВЛАСНА крива сайту (--ease у style.css), узята
   навмисно: камера й затримки рухаються мовою продукту.         */
export const M = {
  main: 18, // базова тривалість дії, кадрів @30fps
  overshoot: 1.06,
  squash: 0.12,
  siteEase: [0.22, 0.7, 0.2, 1] as const, // --ease із style.css
};

export const RADIUS = 14; // --r із style.css

/** Текст сайту, слово в слово (зібрано скриптом scripts/capture.cjs). */
export const COPY = {
  speciality: "OUR SPECIALITY",
  heroCard: ["Engine rebuilds", "& repair"],
  heroChips: ["Timing chain", "Head gasket", "VANOS", "Turbo"],
  brandLine1: "BMW",
  brandLine2: "ONLY",
  place: "BOGNOR REGIS",
  svcLine1: "Engines. Diagnostics.",
  svcLine2: "Servicing. MOT.",
  svcCount: "BMW ONLY · BOGNOR REGIS",
  url: "tk-performance.co.uk",
  phone: "07522 018523",
  signoff: "Bognor Regis · PO22 9SX",
} as const;
