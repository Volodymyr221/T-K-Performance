/* ═══════════════════════════════════════════════════════════
   Підпис кадру.
   🔴 Правило Q11: текст, який глядач МАЄ прочитати, не менший за
   5.2% висоти кадру. Для 1920 це 100px — звідси 108px на головний
   рядок і 60px на другий. У стрічці звук здебільшого вимкнений,
   тож усе повідомлення несе саме цей текст.
   Нижні ~290px кадру в Reels накриває інтерфейс застосунку —
   підпис туди не заходить.
   ═══════════════════════════════════════════════════════════ */
import React from "react";
import { interpolate, Easing } from "remotion";
import { C, FONTS, INK } from "../tokens";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const IN = Easing.bezier(0.16, 1, 0.3, 1);

export const Caption: React.FC<{
  /** кадр ВІД ПОЧАТКУ цього кадру ролика */
  f: number;
  line: string;
  /** слово, яке лягає в червону плашку */
  hl?: string;
  sub?: string;
}> = ({ f, line, hl, sub }) => {
  const p = interpolate(f, [2, 11], [0, 1], { ...clamp, easing: IN });
  const ps = interpolate(f, [8, 17], [0, 1], { ...clamp, easing: IN });
  // Плашка виростає ПІСЛЯ того, як слово вже стало на місце:
  // інакше читається як підкладка, а не як виділення.
  const hlw = interpolate(f, [9, 17], [0, 1], { ...clamp, easing: Easing.bezier(0.4, 0, 0.2, 1) });

  const parts = hl && line.includes(hl) ? line.split(hl) : null;

  const word = (
    <span style={{ position: "relative", display: "inline-block", padding: "0 10px", margin: "0 -10px" }}>
      <span
        style={{
          position: "absolute",
          left: 0,
          top: "14%",
          bottom: "8%",
          width: `${hlw * 100}%`,
          background: C.mRed,
          borderRadius: 3,
        }}
      />
      <span style={{ position: "relative" }}>{hl}</span>
    </span>
  );

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        right: 72,
        bottom: 300,
        textShadow: `0 4px 40px rgba(${INK},0.85)`,
      }}
    >
      {line ? (
        <div
          style={{
            font: `800 108px ${FONTS.head}`,
            lineHeight: 0.98,
            letterSpacing: "-0.03em",
            color: C.txt,
            opacity: p,
            transform: `translateY(${((1 - p) * 30).toFixed(1)}px)`,
          }}
        >
          {parts ? (
            <>
              {parts[0]}
              {word}
              {parts[1]}
            </>
          ) : (
            line
          )}
        </div>
      ) : null}
      {sub ? (
        <div
          style={{
            marginTop: line ? 22 : 0,
            font: `500 60px ${FONTS.head}`,
            lineHeight: 1.15,
            color: C.txt2,
            opacity: ps,
            transform: `translateY(${((1 - ps) * 18).toFixed(1)}px)`,
          }}
        >
          {sub.split("\n").map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
