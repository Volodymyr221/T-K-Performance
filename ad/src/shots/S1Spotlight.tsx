/* ═══════════════════════════════════════════════════════════
   S1 · «Прожектор знаходить героя»
   Рецепт: spotlight-hero-card (набір video-shotcraft, opening).
   Збережено: граматику руху, такти, параметри з позначкою
   «командне місце» — гасіння 0.90→0.94, три станції прожектора,
   імпульс +6% на змиканні, зліт із перельотом bezier(.2,1.25,.3,1),
   два кола світла по контуру (швидке/повільне), посадка з мікро-
   притиском, після наїзду камера МЕРТВА (дихає тільки світло).

   Відхилення, свідомі (записані в DESIGN-SPEC.md):
   · сцена — не знімок сторінки, а реальне фото цеху: продукт тут
     майстерня, не вебінтерфейс;
   · головний герой — зібрана картка на токенах сайту, а не знімок
     картки. 🔴 Q11: у знімку заголовок дає 33px у кадрі — це
     «хочеться прочитати, але не видно», заборонений середній стан.
   ═══════════════════════════════════════════════════════════ */
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { C, LAMP, INK, FONTS, T, RADIUS, COPY } from "../tokens";
import { EASE, ramp } from "../lib/Polish";
import { S1 } from "../shots";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const POP = Easing.bezier(0.2, 1.25, 0.3, 1); // зліт: переліт — y1 > 1 обовʼязково
const RESEAT = Easing.bezier(0.4, 0, 0.3, 1.05);
const PUSH = Easing.bezier(0.35, 0, 0.2, 1);

const W = 1080;
const H = 1920;
const CARD_W = 900;
const CARD_H = 664;
const CARD_X = (W - CARD_W) / 2;
const CARD_Y = 926;

/** Головний герой — зібраний на токенах сайту (Q1: це не копія
 *  наявної сторінки, а окремий показовий блок, тому руками можна). */
const HeroCard: React.FC<{ lift: number; lamp: number }> = ({ lift, lamp }) => (
  <div style={{ position: "absolute", inset: 0, borderRadius: RADIUS * 2, overflow: "hidden", background: C.surface }}>
    {/* обідок BMW M — той самий прийом, що на сайті: градієнт під маскою */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: RADIUS * 2,
        padding: 2,
        background: `linear-gradient(104deg, ${C.mLblue}, ${C.mBlue} 34%, ${C.mRed} 68%, rgba(228,0,43,0) 100%)`,
        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        opacity: 0.85,
      }}
    />
    <div style={{ position: "absolute", inset: 0, padding: "54px 56px", display: "flex", flexDirection: "column", gap: 30 }}>
      {/* плашка-«бровка» — мова сайту */}
      <div
        style={{
          alignSelf: "flex-start",
          border: `2px solid ${C.mRed}`,
          borderRadius: 999,
          padding: "12px 30px",
          font: `500 ${T.aux}px ${FONTS.mono}`,
          letterSpacing: "0.14em",
          color: C.txt2,
        }}
      >
        {COPY.speciality}
      </div>
      <div style={{ font: `800 ${T.h1}px ${FONTS.head}`, lineHeight: 1.0, color: C.txt, letterSpacing: "-0.02em" }}>
        {COPY.heroCard[0]}
        <br />
        {COPY.heroCard[1]}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: "auto" }}>
        {COPY.heroChips.map((t) => (
          <span
            key={t}
            style={{
              border: `1px solid ${C.line2}`,
              borderRadius: 999,
              padding: "10px 22px",
              font: `500 ${T.chip}px ${FONTS.mono}`,
              color: C.txt2,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
    {/* у підвішеному стані картку підсвічує лампа: тепло згори-праворуч */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(200deg, rgba(${LAMP},0.30), rgba(${LAMP},0) 46%, rgba(20,16,10,0.10) 100%)`,
        opacity: lift * lamp,
      }}
    />
  </div>
);

export const S1Spotlight: React.FC = () => {
  const f = useCurrentFrame();

  /* ① Світло вмикають рубильником: спалах → відкат → стало. */
  const lamp = interpolate(f, [1, 3, 4, 6], [0, 1, 0.62, 1], clamp);

  /* ② Прожектор блукає трьома станціями — оператор «шукає» героя,
        і тільки тоді змикається. Без станцій промінь читається
        як заздалегідь наведений, і пошуку немає. */
  const ST = [4, 9, 12, 17, 20, 25, S1.LOCK, S1.PUSH1];
  const spotX = interpolate(f, ST, [28, 28, 70, 70, 36, 36, 50, 50], { ...clamp, easing: EASE.smooth });
  const spotY = interpolate(f, ST, [26, 26, 38, 38, 70, 70, 64, 60], { ...clamp, easing: EASE.smooth });
  const poolBase = interpolate(f, [20, S1.LOCK, S1.PUSH1], [620, 470, 700], { ...clamp, easing: EASE.swift });
  const pulse = interpolate(f, [S1.LOCK, S1.LOCK + 4, S1.LOCK + 10], [0, 0.06, 0], clamp);
  const breathe = 1 + 0.015 * Math.sin((f - S1.LAND) / 14) * ramp(f, S1.LAND, 20, EASE.out);
  const poolRx = poolBase * (1 + pulse) * breathe;
  const poolRy = poolRx * 0.86;
  const dark = interpolate(f, [0, S1.LOCK, S1.PUSH1], [0.9, 0.92, 0.94], clamp);
  const cardLight = ramp(f, S1.LOCK + 4, S1.PUSH1 - S1.LOCK - 4, EASE.smooth);

  /* ③ Камера: легкий наїзд на фото і ПОВНА зупинка.
        Q3 — у рекламі продукту тремтіння камери немає взагалі. */
  const camZ = interpolate(f, [S1.PUSH0, S1.PUSH1], [1.0, 1.1], { ...clamp, easing: PUSH });
  const camY = interpolate(f, [S1.PUSH0, S1.PUSH1], [0, -40], { ...clamp, easing: PUSH });

  /* ④ Дуга героя: зліт (переліт) → гойдання → посадка з притиском. */
  const rise = interpolate(f, [S1.RISE0, S1.RISE1], [0, 1], { ...clamp, easing: POP });
  const reseat = interpolate(f, [S1.RESEAT0, S1.LAND], [0, 1], { ...clamp, easing: RESEAT });
  const lift = rise * (1 - reseat);
  const bob = Math.sin(((f - S1.RISE1) / 40) * Math.PI * 2) * 5 * lift;
  const press = interpolate(f, [S1.LAND - 4, S1.LAND - 1, S1.LAND], [1, 0.997, 1], clamp);
  const landed = f >= S1.LAND;
  // тінь падає ВЛІВО-ВНИЗ: світло приходить згори-праворуч. Якщо тінь
  // не росте з висотою, підвішеність не читається.
  const shadow = `${-14 * lift}px ${16 * lift}px ${18 + 18 * lift}px rgba(${INK},${0.38 * lift}), ${-46 * lift}px ${64 * lift}px ${120 * lift}px rgba(${INK},${0.45 * lift})`;

  /* ⑤ Два кола світла по контуру — і ТІЛЬКИ героєві (Q4). */
  const b1 = interpolate(f, S1.BEAM1, [0, 1], { ...clamp, easing: EASE.linear });
  const b1On = f >= S1.BEAM1[0] - 1 && f <= S1.BEAM1[1] + 1;
  const b2 = interpolate(f, S1.BEAM2, [0, 1], { ...clamp, easing: EASE.swift });
  const b2On = f >= S1.BEAM2[0] - 1 && f <= S1.BEAM2[1] + 1;

  /* ⑥ Напис живе в тій самій сцені (C3), не наклеєний на скло. */
  const noteIn = ramp(f, S1.NOTE_IN, 14, EASE.out);
  const noteSettle = interpolate(f, [S1.RESEAT0 - 4, S1.LAND], [0, 1], { ...clamp, easing: RESEAT });
  const noteZ = (1 - noteSettle) * (70 + Math.sin(((f - S1.NOTE_IN) / 44) * Math.PI * 2) * 3);
  const hl = ramp(f, S1.HL, 12, EASE.swift);

  const slotVis = Math.min(1, rise * 2) * (1 - reseat);
  const landPulse = interpolate(f, [S1.LAND - 4, S1.LAND, S1.LAND + 14], [0, 1, 0], clamp);

  const px = (spotX / 100) * W;
  const py = (spotY / 100) * H;
  const coneW = poolRx * 0.6;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
      {/* ── Сцена: реальне фото цеху ───────────────────────── */}
      <AbsoluteFill style={{ transform: `scale(${camZ}) translateY(${camY}px)`, transformOrigin: "50% 58%" }}>
        <Img
          src={staticFile("photo/work-1.jpg")}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.86) contrast(1.08) brightness(1.1)" }}
        />

        {/* Темне поле в просторі сцени: вирізає мʼякий отвір за формою
            картки. Кругла пляма накрила б картку нерівно — краї в тінь,
            центр у перепал. Герой має світитися від краю до краю. */}
        {cardLight > 0.001 ? (
          <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, opacity: cardLight }}>
            <defs>
              <filter id="s1-tight" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="26" />
              </filter>
              <filter id="s1-wide" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="70" />
              </filter>
              <mask id="s1-hole" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
                <rect x={0} y={0} width={W} height={H} fill="white" />
                <rect x={CARD_X - 70} y={CARD_Y - 60} width={CARD_W + 140} height={CARD_H + 120} rx={80} fill="#2a2a2a" filter="url(#s1-wide)" />
                <rect x={CARD_X - 16} y={CARD_Y - 16} width={CARD_W + 32} height={CARD_H + 32} rx={RADIUS + 16} fill="black" filter="url(#s1-tight)" />
              </mask>
            </defs>
            <rect x={0} y={0} width={W} height={H} fill={`rgb(${INK})`} fillOpacity={0.88} mask="url(#s1-hole)" />
          </svg>
        ) : null}

        {/* слот, з якого картка злітає — щоб було видно, що вона
            НАЛЕЖИТЬ цьому місцю, а не висить нізвідки (Q9) */}
        {slotVis > 0.02 || landPulse > 0.02 ? (
          <div
            style={{
              position: "absolute",
              left: CARD_X - 2,
              top: CARD_Y - 2,
              width: CARD_W + 4,
              height: CARD_H + 4,
              borderRadius: RADIUS * 2,
              border: `2px solid ${C.redTxt}`,
              opacity: Math.max(slotVis * 0.5, landPulse),
              boxShadow: landPulse > 0.02 ? `0 0 ${(40 * landPulse).toFixed(1)}px rgba(255,51,85,0.75)` : undefined,
            }}
          />
        ) : null}

        {/* ── Герой ─────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            left: CARD_X,
            top: CARD_Y - 150 * lift + bob,
            width: CARD_W,
            height: CARD_H,
            transform: `scale(${(1 + 0.045 * lift) * press})`,
            transformOrigin: "center center",
            filter: landed ? undefined : `drop-shadow(${shadow.split(",")[0]})`,
            boxShadow: landed ? undefined : shadow,
            borderRadius: RADIUS * 2,
          }}
        >
          <HeroCard lift={lift} lamp={lamp} />
          {/* волосінь по контуру — щоб край читався на темному фото */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: RADIUS * 2,
              boxShadow: `inset 0 0 0 1px rgba(255,255,255,${(0.5 * lift).toFixed(3)}), 0 0 0 2px rgba(255,236,205,${(0.5 * cardLight).toFixed(3)}), 0 0 60px rgba(255,214,160,${(0.16 * cardLight).toFixed(3)})`,
            }}
          />
          {/* світло біжить по контуру: два кола, швидке і повільне.
              Одне коло читається як моргання, не як сканування. */}
          {(b1On || b2On) && lift > 0.35 ? (
            <svg
              width={CARD_W + 6}
              height={CARD_H + 6}
              viewBox={`0 0 ${CARD_W + 6} ${CARD_H + 6}`}
              style={{
                position: "absolute",
                left: -3,
                top: -3,
                overflow: "visible",
                opacity: b1On ? 1 : 0.62,
                filter: `drop-shadow(0 0 8px rgba(255,51,85,0.85)) drop-shadow(0 0 22px rgba(255,236,200,0.5))`,
              }}
            >
              {[
                { s: C.redHi, w: b1On ? 6 : 4 },
                { s: "rgba(255,250,238,0.98)", w: b1On ? 3 : 2 },
              ].map((p, i) => (
                <rect
                  key={i}
                  x={3}
                  y={3}
                  width={CARD_W}
                  height={CARD_H}
                  rx={RADIUS * 2}
                  fill="none"
                  stroke={p.s}
                  strokeWidth={p.w}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="0.16 1"
                  strokeDashoffset={-(b1On ? b1 : b2)}
                />
              ))}
            </svg>
          ) : null}
        </div>

        {/* ── Напис у тій самій сцені ───────────────────────── */}
        <div
          style={{
            position: "absolute",
            left: 100,
            top: 318,
            width: 880,
            opacity: noteIn,
            transform: `translateY(${(1 - noteIn) * 36 - noteZ * 0.5}px) scale(${1 + noteZ / 900})`,
          }}
        >
          <div style={{ font: `800 ${T.mega}px ${FONTS.head}`, lineHeight: 0.94, color: C.txt, letterSpacing: "-0.035em" }}>
            {COPY.brandLine1}
            <br />
            <span style={{ position: "relative", display: "inline-block", padding: "0 14px" }}>
              {/* маркерна смуга: виростає за словом, слово стає темним */}
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: "12%",
                  bottom: "6%",
                  width: `${hl * 100}%`,
                  background: C.mRed,
                  borderRadius: 4,
                }}
              />
              <span style={{ position: "relative", color: hl > 0.6 ? "#fff" : C.txt }}>{COPY.brandLine2}</span>
            </span>
          </div>
          <div
            style={{
              marginTop: 26,
              font: `500 ${T.aux}px ${FONTS.mono}`,
              letterSpacing: "0.1em",
              color: C.txt2,
              textShadow: `0 2px 18px rgba(${INK},0.9)`,
            }}
          >
            {COPY.place}
          </div>
        </div>
      </AbsoluteFill>

      {/* ── Світло (екранний простір) ──────────────────────── */}
      {/* гасіння поза плямою: теплий чорний, не чистий — колір цеху лишається */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(${poolRx.toFixed(1)}px ${poolRy.toFixed(1)}px at ${spotX}% ${spotY}%, rgba(${INK},0) 0%, rgba(${INK},0) 24%, rgba(${INK},${(dark * 0.26).toFixed(3)}) 44%, rgba(${INK},${(dark * 0.64).toFixed(3)}) 62%, rgba(${INK},${(dark * 0.9).toFixed(3)}) 80%, rgba(${INK},${dark.toFixed(3)}) 100%)`,
          mixBlendMode: "multiply",
          opacity: lamp * (1 - cardLight * 0.9),
        }}
      />
      <AbsoluteFill style={{ background: `rgba(${INK},1)`, mixBlendMode: "multiply", opacity: 0.86 * (1 - lamp) }} />
      {/* теплий вольфрам у самій плямі — мʼяке світло, не перепал */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(${(poolRx * 1.15).toFixed(1)}px ${(poolRy * 1.15).toFixed(1)}px at ${spotX}% ${spotY}%, rgba(${LAMP},0.22) 0%, rgba(${LAMP},0.1) 50%, rgba(${LAMP},0) 80%)`,
          mixBlendMode: "soft-light",
          opacity: lamp * (1 - cardLight * 0.7),
        }}
      />
      {/* обʼємний промінь: джерело далеко згори-праворуч */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: lamp * 0.3 * (1 - cardLight * 0.8),
          mixBlendMode: "screen",
          pointerEvents: "none",
          filter: "blur(44px)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, rgba(${LAMP},0.40), rgba(${LAMP},0.07) 60%, rgba(${LAMP},0) 90%)`,
            clipPath: `polygon(${px + 330}px -500px, ${px + 372}px -500px, ${px + coneW * 0.75}px ${py}px, ${px - coneW * 0.75}px ${py}px)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
