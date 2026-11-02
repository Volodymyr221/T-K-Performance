/* ═══════════════════════════════════════════════════════════
   S2 · «Роздача»
   Рецепт: deck-deal-flyin (набір video-shotcraft, ui-entrance).
   Збережено: фізичну метафору (колода роздає), ОДИН сегментний
   замах перед першою карткою (не покартковий — покартковий убиває
   прискорення), жорстко спадний інтервал, дугу по z + переліт +
   притиск на посадці, різночасну зупинку шарів (тінь відстає на
   3 кадри, привид гасне останнім), нерухомість ≥0.5 с у кінці.

   Картки — СПРАВЖНІ знімки сторінки (Q1), не намальовані.
   🔴 Q11: дрібний текст на них — ТЕКСТУРА. Він притемнений, щоб
   ніхто не намагався його читати; що саме ми робимо, каже великий
   підпис. Середнього стану («хочеться прочитати, але не видно»)
   бути не повинно.

   Відхилення: карток 7, а не 26. Набір каже «краще більше» заради
   відчуття потоку — але вигадувати послуги, яких сервіс не надає,
   не можна. Потік тримаємо прискоренням, не кількістю.
   ═══════════════════════════════════════════════════════════ */
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { C, INK, FONTS, T, RADIUS, COPY } from "../tokens";
import { EASE, ramp } from "../lib/Polish";
import { CARDS, S2 } from "../shots";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const DEAL = Easing.bezier(0.3, 0, 0.2, 1);
const SETTLE = Easing.bezier(0.3, 0, 0.25, 1.15); // y2 > 1 — інакше посадка не пружинить
const W = 1080;
const H = 1920;

const SCALE = 1.85; // 486 CSS px картки → 900 px у кадрі
const CARD_W = 486 * SCALE;
const GAP = 26;

/** Вертикальна «смуга» карток у просторі сцени. */
const SLOTS = (() => {
  let y = 0;
  return CARDS.map((c) => {
    const h = c.h * SCALE;
    const slot = { x: (W - CARD_W) / 2, y, w: CARD_W, h };
    y += h + GAP;
    return slot;
  });
})();
const BOARD_H = SLOTS[SLOTS.length - 1].y + SLOTS[SLOTS.length - 1].h;

/** Колода лежить там, де в попередньому кадрі стояв герой. */
const PILE = { x: (W - CARD_W) / 2, y: 980 };
const STACK_STEP = 6;

/* Детермінований «випадок»: рендер мусить бути відтворюваним
   покадрово. Math.random() дав би смикання між прогонами. */
const DEPTH = (k: number) => CARDS.length - 1 - k; // k=0 лежить ЗВЕРХУ: з колоди
                                                   // здають верхню, а перша в сітку йде «Engine»
const jitterX = (k: number) => (((k * 7) % 9) - 4) * 3;
const jitterR = (k: number) => (((k * 5) % 7) - 3) * 0.9;

type Cam = { cx: number; cy: number; zoom: number; rotX: number; rotZ: number; persp: number; oy: number };
const KEYS: { f: number; c: Cam }[] = [
  { f: 0, c: { cx: W / 2, cy: 1100, zoom: 1.0, rotX: 0, rotZ: 0, persp: 1400, oy: 0 } },
  { f: S2.CAM[0], c: { cx: W / 2, cy: 900, zoom: 0.86, rotX: 12, rotZ: 0, persp: 1500, oy: -120 } },
  { f: S2.CAM[1], c: { cx: W / 2, cy: BOARD_H * 0.44, zoom: 0.62, rotX: 30, rotZ: -4, persp: 2400, oy: -420 } },
  { f: S2.CAM[2], c: { cx: W / 2, cy: BOARD_H * 0.46, zoom: 0.47, rotX: 46, rotZ: -6, persp: 3300, oy: -680 } },
  { f: 161, c: { cx: W / 2, cy: BOARD_H * 0.46, zoom: 0.477, rotX: 46, rotZ: -6, persp: 3300, oy: -680 } },
];

/* Перспектива мусить РОСТИ разом з відхилянням назад (1400→3300).
   Інакше ближній край смуги перетинає площину камери і лізе крізь кадр. */
const camAt = (f: number): Cam => {
  let a = KEYS[0];
  let b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (f >= KEYS[i].f && f <= KEYS[i + 1].f) {
      a = KEYS[i];
      b = KEYS[i + 1];
      break;
    }
  }
  const t = a.f === b.f ? 1 : interpolate(f, [a.f, b.f], [0, 1], { ...clamp, easing: EASE.smooth });
  const m = (x: number, y: number) => x + (y - x) * t;
  return {
    cx: m(a.c.cx, b.c.cx),
    cy: m(a.c.cy, b.c.cy),
    zoom: m(a.c.zoom, b.c.zoom),
    rotX: m(a.c.rotX, b.c.rotX),
    rotZ: m(a.c.rotZ, b.c.rotZ),
    persp: m(a.c.persp, b.c.persp),
    oy: m(a.c.oy, b.c.oy),
  };
};

export const S2Deal: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);

  /* Замах: колода просідає і верхня картка відтягується ПРОТИ
     напрямку кидка. Амплітуда навмисно велика — у наборі записано
     судження: 4px/2px глядач не бачить узагалі, працює тільки
     десяток пікселів і більше. */
  const antic = interpolate(f, [S2.ANTICIP[0], S2.ANTICIP[1]], [0, 1], { ...clamp, easing: EASE.out });
  const released = ramp(f, S2.dealCue(0), 4, EASE.snappy);
  const pileDrop = antic * (1 - released) * 56;
  const topPull = antic * (1 - released) * 34;

  const caption = ramp(f, S2.CAPTION, 16, EASE.snappy);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
      {/* далекий теплий серпанок, щоб смуга не впиралась у плаский чорний */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(1300px 1000px at 50% 18%, rgba(108,178,228,0.13), rgba(8,8,10,0) 70%), radial-gradient(1000px 760px at 50% 84%, rgba(228,0,43,0.10), rgba(8,8,10,0) 70%)`,
        }}
      />

      <AbsoluteFill style={{ perspective: `${cam.persp * cam.zoom}px`, perspectiveOrigin: `${W / 2}px ${H / 2}px` }}>
        <div
          style={{
            position: "absolute",
            width: W,
            height: BOARD_H,
            transformStyle: "preserve-3d",
            zoom: cam.zoom, // 🪤 саме zoom, не scale: зум — це розкладка,
            // і Chromium розтрує текстуру ВЖЕ збільшеною. Через
            // transform:scale текст на картках помітно мулиться.
            transformOrigin: `${cam.cx}px ${cam.cy}px`,
            transform: `translate(${W / 2 / cam.zoom - cam.cx}px, ${H / 2 / cam.zoom - cam.cy + cam.oy}px) rotateX(${cam.rotX}deg) rotateZ(${cam.rotZ}deg)`,
          }}
        >
          {/* порожні гнізда: видно, що картки летять у РЕАЛЬНІ місця
              розкладки, а не зависають над нею (Q9) */}
          {SLOTS.map((s, k) => (
            <div
              key={`slot${k}`}
              style={{
                position: "absolute",
                left: s.x,
                top: s.y,
                width: s.w,
                height: s.h,
                border: `1px solid ${C.line}`,
                borderRadius: RADIUS * SCALE,
                opacity: 0.5,
              }}
            />
          ))}

          {CARDS.map((card, k) => {
            const slot = SLOTS[k];
            const cue = S2.dealCue(k);
            const t = interpolate(f, [cue, cue + 8], [0, 1], { ...clamp, easing: DEAL });
            const st = interpolate(f, [cue + 8, cue + 12], [0, 1], { ...clamp, easing: SETTLE });
            const pr = interpolate(f, [cue + 12, cue + 13, cue + 14], [0.996, 1.004, 1], clamp);
            const prog = t * 0.86 + st * 0.14; // переліт живе в settle

            const fromX = PILE.x + jitterX(k);
            const fromY = PILE.y - DEPTH(k) * STACK_STEP + pileDrop + (k === 0 ? topPull : 0);
            const x = fromX + (slot.x - fromX) * prog;
            const y = fromY + (slot.y - fromY) * prog;
            const arc = Math.sin(Math.PI * t) * 140; // дуга по z: картка летить ПО ПОВІТРЮ
            const sc = 1 + Math.sin(Math.PI * t) * 0.06;
            const flying = t > 0.001 && st < 0.999;

            // Привид: відстає на 5% шляху, швидко гасне. Дешевше за
            // справжній motion blur і для окремої картки цього досить.
            const gt = Math.max(0, t - 0.05);
            const gx = fromX + (slot.x - fromX) * gt;
            const gy = fromY + (slot.y - fromY) * gt;

            // Тінь згортається на 3 кадри ПІЗНІШЕ за саму картку:
            // якщо всі шари зупиняються в один кадр, читається механічно.
            const shLag = interpolate(f, [cue + 11, cue + 15], [1, 0], clamp);
            const z = DEPTH(k) * 1.2 + arc;

            const landed = f > cue + 14;
            const tex = (
              <Img
                src={staticFile(`textures/${card.tex}`)}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", borderRadius: RADIUS * SCALE }}
              />
            );

            return (
              <React.Fragment key={card.tex}>
                {flying && t > 0.06 ? (
                  <div
                    style={{
                      position: "absolute",
                      left: gx,
                      top: gy,
                      width: slot.w,
                      height: slot.h,
                      transform: `translateZ(${z - 2}px)`,
                      opacity: 0.25 * (1 - t),
                      filter: "blur(6px)",
                      borderRadius: RADIUS * SCALE,
                      overflow: "hidden",
                    }}
                  >
                    {tex}
                  </div>
                ) : null}
                <div
                  style={{
                    position: "absolute",
                    left: x,
                    top: y,
                    width: slot.w,
                    height: slot.h,
                    opacity: 1,
                    transform: landed ? `translateZ(${(k * 0.6).toFixed(2)}px)` : `translateZ(${z}px) rotate(${(jitterR(k) * (1 - prog)).toFixed(2)}deg) scale(${(sc * pr).toFixed(4)})`,
                    transformOrigin: "center center",
                    borderRadius: RADIUS * SCALE,
                    boxShadow: `0 ${(2 + 30 * shLag).toFixed(1)}px ${(8 + 48 * shLag).toFixed(1)}px rgba(${INK},${(0.3 + 0.35 * shLag).toFixed(3)})`,
                  }}
                >
                  {tex}
                  {/* 🔴 Q11: дрібний текст картки — текстура, не читанка.
                      Легке притемнення каже оку «не вчитуйся». */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: RADIUS * SCALE,
                      background: `rgba(${INK},0.06)`,
                    }}
                  />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* ── Підпис: ось ТУТ текст, який справді читають ─────── */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "0 72px 130px",
          background: `linear-gradient(180deg, rgba(${INK},0) 0%, rgba(${INK},0.86) 34%, rgba(${INK},0.99) 100%)`,
          paddingTop: 360,
          opacity: caption,
        }}
      >
        <div
          style={{
            font: `500 ${T.aux}px ${FONTS.mono}`,
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
            color: C.redTxt,
            marginBottom: 22,
            transform: `translateY(${(1 - caption) * 20}px)`,
          }}
        >
          {COPY.svcCount}
        </div>
        <div
          style={{
            font: `800 ${T.h2}px ${FONTS.head}`,
            lineHeight: 1.06,
            color: C.txt,
            letterSpacing: "-0.025em",
            transform: `translateY(${(1 - caption) * 34}px)`,
          }}
        >
          {COPY.svcLine1}
          <br />
          {COPY.svcLine2}
        </div>
      </div>
    </AbsoluteFill>
  );
};
