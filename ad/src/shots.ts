/* ═══════════════════════════════════════════════════════════
   Таймлайн — ЄДИНЕ джерело правди.
   Підписи, звук і точки склейки виводяться звідси, а не дублюються.
   Зсунув межу кадру — решта їде сама.
   ═══════════════════════════════════════════════════════════ */

export const FPS = 30;
export const TOTAL = 450; // 15.0 с

/* BGM: house-vibez.mp3, 123 BPM (заміряно в наборі).
   Такт = 60/123 с = 14.634 кадру. Межі кадрів посаджені НА ДОЛЮ:
   склейка не на долі читається як збій, навіть якщо глядач
   не чує музики свідомо. */
export const BPM = 123;
export const beatF = (n: number) => Math.round((n * 60 * FPS) / BPM);

export const SHOTS = {
  /** Прожектор знаходить головного героя. Доля 0 → 10. */
  s1: { from: 0, dur: beatF(10) }, // 0 → 146
  /** Роздача карток послуг. Доля 10 → 21. */
  s2: { from: beatF(10), dur: beatF(21) - beatF(10) }, // 146 → 307
  /** Фінал: спільне фото + логотип + заклик. Доля 21 → кінець. */
  s3: { from: beatF(21), dur: TOTAL - beatF(21) }, // 307 → 450
} as const;

/* ── Склейки ──────────────────────────────────────────────────
   Набір: голої склейки не буває — кадри передають естафету.
   Межа s1→s2: біла спалах-склейка (式 A), по 5 кадрів з кожного боку.
   Межа s2→s3: один удар на весь кадр. 🔴 Правило R4: таких ударів
   на весь кадр у ролику не більше трьох — тут ВІН ОДИН.            */
export const CUTS = {
  flash: SHOTS.s2.from, // біла спалах-склейка, ±5f
  slam: SHOTS.s3.from, // єдиний удар на весь кадр
} as const;

/* ── Локальні такти S1 (прожектор) ───────────────────────────
   Дуга героя LOCK→LAND = 90 кадрів = 3.0 с — рівно нижня межа
   правила R3 («головна дуга відкриття не коротша за 3 с»).       */
export const S1 = {
  LOCK: 26, // прожектор зімкнувся на картці
  PUSH0: 32,
  PUSH1: 48, // камера доїхала і ЗАМЕРЛА до кінця кадру
  RISE0: 46,
  RISE1: 56, // картка злетіла (з перельотом)
  BEAM1: [58, 72] as const, // перше коло світла по контуру: швидке, яскраве
  BEAM2: [78, 98] as const, // друге: повільне, слабке
  NOTE_IN: 60,
  HL: 74, // маркерна смуга під словом
  RESEAT0: 98,
  LAND: 116, // торкання + 30 кадрів справжньої тиші до кінця
} as const;

/* ── Локальні такти S2 (роздача) ─────────────────────────────
   Пауза перед першою карткою (anticipation) — 10 кадрів.
   Інтервал роздачі 11 → 4.2 кадру: жорстке прискорення, не рівний
   ритм. Рівний читається як PowerPoint.                           */
export const S2 = {
  ANTICIP: [14, 24] as const,
  dealCue: (k: number) => 24 + 11 * k - 0.66 * k * (k - 1),
  CAM: [60, 86, 110] as const,
  CAPTION: 100,
} as const;

/* ── Локальні такти S3 (фінал) ───────────────────────────────── */
export const S3 = {
  FLY: [0, 30] as const, // представники злітаються з чотирьох боків
  RING: [28, 46] as const, // кільце стискається 5.4 → 1
  BRAKE: [44, 56] as const, // гальмо з перельотом +6%
  LOGO: 44,
  SHIFT: [56, 72] as const,
  WORD: [70, 104] as const,
  CTA: [96, 112] as const, // адреса сайту і телефон
  // далі — 31 кадр повної тиші: правило R1, фірмовий знак стоїть ≥1 с
} as const;

/** 7 карток послуг — реальні знімки сторінки (scripts/capture.cjs). */
export const CARDS = [
  { tex: "card2.png", w: 486, h: 333 }, // Engine rebuilds & repair
  { tex: "card3.png", w: 486, h: 171 }, // Diagnostics
  { tex: "card4.png", w: 486, h: 211 }, // Servicing
  { tex: "card5.png", w: 486, h: 171 }, // Clutch & gearbox
  { tex: "card6.png", w: 486, h: 171 }, // Brakes & suspension
  { tex: "card7.png", w: 486, h: 171 }, // MOT preparation
  // 🔴 card1 (Stage tuning) НЕ беремо: на ній «typically +15–20%» —
  // приріст, якого замовник не підтверджував. Див. NOW.md, ризик 2.
] as const;

/* ── Звук ─────────────────────────────────────────────────────
   🔴 Лише файли з ЗАДОКУМЕНТОВАНИМ посиланням Mixkit: реклама
   комерційна, а в наборі частина звуків має позначку «джерело
   невідоме, перед комерційним використанням уточнити».
   `from` — завжди ВИРАЗ від SHOTS, ніколи голе число: зсунеться
   межа кадру — звук поїде разом з нею.                           */
export type Sfx = { from: number; src: string; volume: number; note: string; dur?: number };

export const SFX: Sfx[] = [
  { from: SHOTS.s1.from + 2, src: "impact/bass-hit-short.mp3", volume: 0.5, note: "вмикається світло на сцені" },
  { from: SHOTS.s1.from + S1.RISE0, src: "transition/whoosh-fast.mp3", volume: 0.42, note: "картка злітає" },
  { from: SHOTS.s1.from + S1.BEAM1[0], src: "light/shimmer-sparkle-sweep.mp3", volume: 0.3, note: "світло біжить по контуру" },
  { from: SHOTS.s1.from + S1.LAND, src: "transition/transition-snap.mp3", volume: 0.4, note: "картка сідає на місце" },

  { from: CUTS.flash - 3, src: "transition/sweep-fast-small.mp3", volume: 0.4, note: "біла спалах-склейка" },
  // Роздача: 7 карток. Три прийоми проти «кулемета» — два різні
  // семпли через один, гучність сходами 0.40→0.22, інтервал
  // прискорюється разом з анімацією.
  ...[0, 1, 2, 3, 4, 5, 6].map((k) => ({
    from: SHOTS.s2.from + Math.round(S2.dealCue(k)) + 6,
    src: k % 2 === 0 ? "transition/swoosh-quick.mp3" : "transition/sweep-metal-quick.mp3",
    volume: +(0.4 - k * 0.03).toFixed(2),
    note: `картка ${k + 1} лягає в сітку`,
  })),

  { from: CUTS.slam - 2, src: "impact/impact-epic-trailer.mp3", volume: 0.6, note: "ЄДИНИЙ удар на весь кадр" },
  { from: SHOTS.s3.from + S3.BRAKE[0], src: "impact/impact-zoom-quick.mp3", volume: 0.42, note: "логотип гальмує" },
  { from: SHOTS.s3.from + S3.CTA[0], src: "light/shimmer-sparkle-sweep.mp3", volume: 0.26, note: "адреса сайту проявляється" },
];

export const BGM = { src: "bgm/house-vibez.mp3", volume: 0.34 };
