/* ═══════════════════════════════════════════════════════════
   S3 · «Фінал»
   Два рецепти в одному кадрі:
   · Q8 «спільне фото» — представники показаних робіт злітаються
     з чотирьох боків і стають колом навколо знака. Фінал мусить
     бути найвищою точкою енергії ролика, не тихим згасанням.
   · logo-shrink-wordmark-lockup (outro) — велике кільце стискається
     5.4→1, на гальмі переліт +6% (без нього читається як різке
     замерзання), потім знак відсувається і звільняє місце рядку,
     рядок заїжджає побуквенно, підпис — останнім і тихіше.

   Відхилення: у рецепті побуквенно заїжджає назва бренду. Тут —
   АДРЕСА САЙТУ: це єдине, заради чого ролик і знімали. Знак бренду
   стоїть картинкою (у нього вже є готовий фірмовий напис).
   🔴 R1: після того, як усе село, 31 кадр повної тиші.
   ═══════════════════════════════════════════════════════════ */
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { C, INK, FONTS, T, RADIUS, COPY } from "../tokens";
import { EASE, ramp } from "../lib/Polish";
import { S3 } from "../shots";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const W = 1080;
const H = 1920;
const CY = 1270; // центр замка́ (lockup): кільце стискається тут

/** Представники показаного: три реальні роботи + одна картка послуги. */
const TILES = [
  { src: "photo/work-3.jpg", x: 54, y: 170, w: 470, h: 300, rot: -3.2, from: [-620, -300] },
  { src: "photo/work-7.jpg", x: 556, y: 126, w: 470, h: 300, rot: 2.6, from: [660, -340] },
  { src: "photo/work-6.jpg", x: 54, y: 492, w: 470, h: 300, rot: 2.2, from: [-640, 340] },
  { src: "photo/work-8.jpg", x: 556, y: 448, w: 470, h: 300, rot: -2.4, from: [680, 300] },
] as const;

export const S3Outro: React.FC = () => {
  const f = useCurrentFrame();

  /* ① Стискання кільця: 5.4 → 1. Менше за 3 — удару немає,
        більше за 7 — початковий стан вилазить за кадр розмитою кашею. */
  const col = interpolate(f, [S3.RING[0], S3.RING[1]], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const ringScale = 5.4 + (1 - 5.4) * col;
  /* Гальмо з перельотом: у точці зупинки розпухає на 6% і сідає.
     Прибрати — читається як жорстке замерзання; більше 10% — желе. */
  const brake = f >= S3.BRAKE[0] && f <= S3.BRAKE[1] ? Math.sin(Math.PI * ((f - S3.BRAKE[0]) / (S3.BRAKE[1] - S3.BRAKE[0]))) * 0.06 : 0;
  /* Загоєння розриву і знебарвлення йдуть РАЗОМ зі стисканням:
     якщо колір доїжджає після посадки — «знак ще не готовий». */
  const heal = ramp(f, S3.RING[0] + 6, 14, EASE.smooth);
  const ringOut = ramp(f, S3.LOGO, 8, EASE.smooth);
  const logoIn = ramp(f, S3.LOGO, 9, EASE.out);

  /* ② Знак відсувається вгору і звільняє місце рядку.
        Майже впритул до першої букви (70) — пауза тут читається
        як «зависло». */
  const shift = interpolate(f, [S3.SHIFT[0], S3.SHIFT[1]], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const logoY = CY - 120 - shift * 130;

  /* ③ Адреса сайту — побуквенно. Інтервал рахується від кількості
        символів, щоб останній стартував до кінця вікна. */
  const url = COPY.url.split("");
  const step = (S3.WORD[1] - S3.WORD[0]) / url.length;

  const cta = ramp(f, S3.CTA[0], S3.CTA[1] - S3.CTA[0], EASE.out);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
      {/* сценічне світло знизу — енергія фіналу, не рівний чорний */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 620px at 50% ${((CY - 120) / H) * 100}%, rgba(228,0,43,0.16), rgba(8,8,10,0) 72%), radial-gradient(1100px 800px at 50% 16%, rgba(12,99,176,0.14), rgba(8,8,10,0) 70%)`,
        }}
      />

      {/* ── Спільне фото: злітаються з чотирьох боків ───────── */}
      {TILES.map((t, i) => {
        const st = S3.FLY[0] + i * 4;
        const p = ramp(f, st, 20, Easing.bezier(0.16, 1, 0.3, 1));
        return (
          <div
            key={t.src}
            style={{
              position: "absolute",
              left: t.x,
              top: t.y,
              width: t.w,
              height: t.h,
              borderRadius: RADIUS * 1.6,
              overflow: "hidden",
              opacity: Math.min(1, p * 1.6),
              transform: `translate(${(1 - p) * t.from[0]}px, ${(1 - p) * t.from[1]}px) rotate(${t.rot * p}deg) scale(${0.9 + 0.1 * p})`,
              boxShadow: `0 ${(10 + 26 * (1 - p)).toFixed(0)}px ${(24 + 60 * (1 - p)).toFixed(0)}px rgba(${INK},0.6)`,
              border: `1px solid ${C.line2}`,
            }}
          >
            <Img src={staticFile(t.src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.86) contrast(1.05)" }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(${INK},0) 40%, rgba(${INK},0.5) 100%)` }} />
          </div>
        );
      })}

      {/* ── Кільце, що стискається ──────────────────────────── */}
      {ringOut < 1 ? (
        <div
          style={{
            position: "absolute",
            left: W / 2 - 190,
            top: CY - 120 - 190,
            width: 380,
            height: 380,
            transform: `scale(${(ringScale + brake).toFixed(4)})`,
            opacity: (1 - ringOut) * Math.min(1, col * 4),
          }}
        >
          <svg width={380} height={380} style={{ overflow: "visible", filter: `drop-shadow(0 0 ${(26 * (1 - heal)).toFixed(0)}px rgba(255,31,69,${(0.8 * (1 - heal)).toFixed(2)}))` }}>
            <circle
              cx={190}
              cy={190}
              r={168}
              fill="none"
              // розрив у колі заростає разом зі стисканням
              stroke={heal > 0.5 ? "#ffffff" : C.redHi}
              strokeWidth={10 + 10 * (1 - heal)}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${(0.62 + 0.38 * heal).toFixed(3)} 1`}
              transform="rotate(-96 190 190)"
            />
          </svg>
        </div>
      ) : null}

      {/* ── Фірмовий знак ───────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: W / 2 - 330,
          top: logoY - 186,
          width: 660,
          opacity: logoIn,
          transform: `scale(${(0.94 + 0.06 * logoIn + brake * 0.5).toFixed(4)})`,
        }}
      >
        <Img src={staticFile("logo.png")} style={{ width: "100%", display: "block" }} />
      </div>

      {/* ── Адреса сайту: побуквенно ────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1272,
          textAlign: "center",
          font: `800 ${T.h3}px ${FONTS.head}`,
          letterSpacing: "-0.015em",
          color: C.txt,
          whiteSpace: "pre",
        }}
      >
        {url.map((ch, i) => {
          const p = ramp(f, S3.WORD[0] + i * step, 3.2, EASE.out);
          return (
            <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateX(${(1 - p) * 10}px)` }}>
              {ch}
            </span>
          );
        })}
      </div>

      {/* ── Телефон і місто ─────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1404,
          textAlign: "center",
          opacity: cta,
          transform: `translateY(${(1 - cta) * 16}px)`,
        }}
      >
        <div style={{ font: `800 ${T.read}px ${FONTS.head}`, color: C.redTxt, letterSpacing: "0.01em" }}>{COPY.phone}</div>
        <div style={{ marginTop: 22, font: `500 ${T.aux}px ${FONTS.mono}`, letterSpacing: "0.04em", color: C.txt2 }}>{COPY.signoff}</div>
      </div>
    </AbsoluteFill>
  );
};
