/* ═══════════════════════════════════════════════════════════
   Склейка триколірною смугою BMW M.
   Замість голого різання кадр перетирає скісна смуга, а по її
   краю біжать три кольори M (блакитний · синій · червоний).
   Це не прикраса: за півсекунди глядач бачить, що ролик
   автомобільний і саме про BMW.

   🪤 Нахил мусить бути крутим. На 6° смуги читаються як звичайні
   сірі бруски — М-смуга впізнається саме за кутом (~20°).
   ═══════════════════════════════════════════════════════════ */
import React from "react";
import { C } from "../tokens";

export const W = 1080;
export const H = 1920;
const SLANT = 680; // 680/1920 ≈ 19.5°

/** Шлях, що відкриває новий кадр. `t` 0→1. */
export const revealPath = (t: number, dir: "r" | "l") => {
  if (dir === "r") {
    const x = -340 + t * (W + 1020);
    return `polygon(0px 0px, ${x + SLANT}px 0px, ${x}px ${H}px, 0px ${H}px)`;
  }
  const x = W + 340 - t * (W + 1020);
  return `polygon(${x}px 0px, ${W}px 0px, ${W}px ${H}px, ${x - SLANT}px ${H}px)`;
};

const BANDS = [
  { o: 10, w: 46, c: C.mLblue },
  { o: 70, w: 46, c: C.mBlue },
  { o: 130, w: 64, c: C.mRed },
];

/** Три смуги M, що біжать попереду краю витирання. */
export const MStripes: React.FC<{ t: number; dir: "r" | "l" }> = ({ t, dir }) => {
  if (t <= 0 || t >= 1) return null;
  const sign = dir === "r" ? 1 : -1;
  const x = dir === "r" ? -340 + t * (W + 1020) : W + 340 - t * (W + 1020);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {BANDS.map((bnd, i) => {
        const a = x + sign * bnd.o;
        const bb = a + sign * bnd.w;
        const top = sign === 1 ? SLANT : -SLANT;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              background: bnd.c,
              clipPath: `polygon(${a + top}px 0px, ${bb + top}px 0px, ${bb}px ${H}px, ${a}px ${H}px)`,
            }}
          />
        );
      })}
    </div>
  );
};
