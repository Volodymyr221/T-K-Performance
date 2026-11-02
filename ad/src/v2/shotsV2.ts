/* ═══════════════════════════════════════════════════════════
   Таймлайн ролика — ЄДИНЕ джерело правди.
   Підписи, звук і склейки виводяться звідси.

   Версія 2. Перша була зроблена мовою промо вебпродуктів
   (повільно, темно, три кадри по 5 секунд) — для реклами СТО
   у стрічці це не працює: людина гортає за секунду.
   Тут темп стрічки: 11 склейок на 15 секунд, перші слова —
   СИМПТОМ, який власник BMW упізнає, а не настрій.
   ═══════════════════════════════════════════════════════════ */

export const FPS = 30;
export const TOTAL = 450; // 15.0 с

/* BGM house-vibez, 123 BPM. Такт = 14.634 кадру.
   УСІ склейки стоять на долі — у нарізці з частим різанням
   збій на півдолі чути навіть тим, хто музику не слухає. */
export const BPM = 123;
export const b = (n: number) => Math.round((n * 60 * FPS) / BPM);

export type Cut = "mwipe-r" | "mwipe-l" | "flash" | "hard" | "slam";

export type Shot = {
  id: string;
  from: number;
  photo: string;
  /** Рух камери на фото. Наїзд у всіх кадрах в ОДИН бік —
   *  так рух читається як безперервний крізь склейки. */
  cam: { from: number; to: number; ox?: number; oy?: number; drift?: number };
  /** Головний рядок. `hl` — слово, яке лягає в червону плашку. */
  line: string;
  hl?: string;
  sub?: string;
  /** Як цей кадр ПРИХОДИТЬ на зміну попередньому. */
  cut: Cut;
  kind?: "codes" | "outro";
};

export const SHOTS: Shot[] = [
  // ── Гачок: симптом, який упізнає кожен власник BMW ──────
  { id: "hook1", from: b(0), photo: "work-1.jpg", cam: { from: 1.18, to: 1.3, oy: -4 },
    line: "Rattle on cold start?", hl: "cold start", cut: "hard" },
  { id: "hook2", from: b(3), photo: "work-3.jpg", cam: { from: 1.12, to: 1.22 },
    line: "Warning light on?", hl: "Warning light", cut: "mwipe-r" },

  // ── Позиція: двигун не їде нікуди, його роблять ТУТ ─────
  { id: "stay", from: b(5), photo: "work-8.jpg", cam: { from: 1.1, to: 1.24, oy: 3 },
    line: "Don't send it away.", hl: "away.",
    sub: "We rebuild BMW engines here.", cut: "flash" },

  // ── Що вміємо: швидка нарізка, одна думка на кадр ───────
  { id: "svc1", from: b(8), photo: "work-1.jpg", cam: { from: 1.34, to: 1.46, ox: -8, oy: 6 },
    line: "Engine rebuilds", cut: "mwipe-l" },
  { id: "svc2", from: b(10), photo: "work-3.jpg", cam: { from: 1.24, to: 1.34, ox: 6 },
    line: "Diagnostics", sub: "We find the cause,\nnot just the code.", cut: "hard" },
  { id: "svc3", from: b(12), photo: "work-7.jpg", cam: { from: 1.12, to: 1.24 },
    line: "Servicing & MOT", cut: "mwipe-r" },
  { id: "svc4", from: b(14), photo: "work-6.jpg", cam: { from: 1.14, to: 1.26, ox: -5 },
    line: "Brakes & suspension", cut: "hard" },

  // ── Довіра для знавця: коди двигунів ────────────────────
  { id: "codes", from: b(16), photo: "work-1.jpg", cam: { from: 1.3, to: 1.4 },
    line: "", sub: "We know what fails on each one.", cut: "mwipe-l", kind: "codes" },

  // ── 🔑 Справжня перевага, якої не було в першій версії ──
  { id: "open", from: b(19), photo: "work-4.jpg", cam: { from: 1.08, to: 1.2 },
    line: "Open seven days", hl: "seven days",
    sub: "9–6 Mon–Fri · 9–5 Sat & Sun", cut: "flash" },

  { id: "only", from: b(22), photo: "work-2.jpg", cam: { from: 1.1, to: 1.22, oy: -3 },
    line: "BMW only.", hl: "only.",
    sub: "Bognor Regis · PO22 9SX", cut: "mwipe-r" },

  // ── Заклик ──────────────────────────────────────────────
  { id: "cta", from: b(25), photo: "", cam: { from: 1, to: 1 },
    line: "", cut: "slam", kind: "outro" },
];

export const shotEnd = (i: number) => (i + 1 < SHOTS.length ? SHOTS[i + 1].from : TOTAL);

/** Коди двигунів — слово в слово з картки сайту. */
export const CODES = ["N47", "N57", "N20", "N54", "N55", "B47", "B57", "B58", "S55"];

export const CTA = {
  url: "tk-performance.co.uk",
  phone: "07522 018523",
  place: "Bognor Regis · PO22 9SX",
};

/* ── Звук ─────────────────────────────────────────────────
   🔴 Лише файли з ЗАДОКУМЕНТОВАНИМ посиланням Mixkit: реклама
   комерційна, а частина звуків у наборі має позначку «джерело
   невідоме, перед комерційним використанням уточнити».
   Музика з сильним бітом сама тримає ритм, тому ефектів МАЛО:
   по одному на склейку-витирання і один удар на весь кадр.    */
export type Sfx = { from: number; src: string; volume: number; note: string; dur?: number };

const wipeSfx = (s: Shot, k: number): Sfx => ({
  from: s.from - 4,
  src: k % 2 === 0 ? "transition/swoosh-quick.mp3" : "transition/sweep-metal-quick.mp3",
  volume: 0.36,
  note: `М-смуга перетирає кадр перед «${s.id}»`,
  dur: 24,
});

export const SFX: Sfx[] = [
  { from: 0, src: "impact/impact-zoom-quick.mp3", volume: 0.5, note: "перший кадр", dur: 30 },
  ...SHOTS.filter((s) => s.cut === "mwipe-r" || s.cut === "mwipe-l").map(wipeSfx),
  ...SHOTS.filter((s) => s.cut === "flash").map((s) => ({
    from: s.from - 3,
    src: "transition/sweep-fast-small.mp3",
    volume: 0.3,
    note: `біла склейка перед «${s.id}»`,
    dur: 20,
  })),
  // Єдиний удар на весь кадр у ролику (правило R4: таких ≤3).
  { from: SHOTS[SHOTS.length - 1].from - 2, src: "impact/impact-epic-trailer.mp3", volume: 0.6, note: "вхід у фінал" },
  { from: SHOTS[SHOTS.length - 1].from + 34, src: "light/shimmer-sparkle-sweep.mp3", volume: 0.24, note: "адреса сайту" },
];

export const BGM = { src: "bgm/house-vibez.mp3", volume: 0.38 };
