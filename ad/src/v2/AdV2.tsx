/* ═══════════════════════════════════════════════════════════
   Рекламний ролик T&K Performance — версія 2.
   11 склейок на 15 секунд, темп стрічки, а не кіно.
   Усе, що треба прочитати, — великим текстом: у Facebook ролик
   дивляться БЕЗ ЗВУКУ.
   ═══════════════════════════════════════════════════════════ */
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { C, INK, FONTS, T } from "../tokens";
import { Grain, Vignette } from "../lib/Polish";
import { useSiteFonts } from "../Fonts";
import { SHOTS, shotEnd, SFX, BGM, TOTAL, CODES, CTA, Shot } from "./shotsV2";
import { MStripes, revealPath, W, H } from "./MWipe";
import { Caption } from "./Caption";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const WIPE = 11; // кадрів на перетирання
const LEAD = 6; // наскільки раніше за склейку заходить новий кадр

/** Фото з безперервним наїздом. Напрямок у всіх кадрах однаковий —
 *  тоді рух читається як одна камера, що їде крізь усю нарізку,
 *  а не як десять окремих слайдів. */
const Photo: React.FC<{ s: Shot; local: number; dur: number; dim?: boolean }> = ({ s, local, dur, dim }) => {
  const t = interpolate(local, [0, dur], [0, 1], clamp);
  const sc = s.cam.from + (s.cam.to - s.cam.from) * t;
  const ox = (s.cam.ox ?? 0) * t;
  const oy = (s.cam.oy ?? 0) * t;
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: C.bg }}>
      <Img
        src={staticFile(`photo/${s.photo}`)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${sc.toFixed(4)}) translate(${ox.toFixed(2)}%, ${oy.toFixed(2)}%)`,
          // Повна яскравість. У першій версії цех стояв у 12% —
          // саме тому не було видно головного доказу: реальних робіт.
          filter: dim ? "saturate(0.5) contrast(1.05) brightness(0.34)" : "saturate(0.95) contrast(1.1) brightness(1.06)",
        }}
      />
      {/* Підкладка під текст: без неї підпис тоне на світлих ділянках */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(${INK},0.55) 0%, rgba(${INK},0.1) 26%, rgba(${INK},0.1) 42%, rgba(${INK},0.86) 82%, rgba(${INK},0.96) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Кадр із кодами двигунів — довіра для того, хто розуміється. */
const Codes: React.FC<{ local: number }> = ({ local }) => (
  <div style={{ position: "absolute", left: 72, right: 72, top: 430 }}>
    <div style={{ font: `500 ${T.aux}px ${FONTS.mono}`, letterSpacing: "0.14em", color: C.redTxt, marginBottom: 34, textShadow: `0 2px 10px rgba(${INK},1), 0 0 34px rgba(${INK},1)` }}>
      ENGINES WE KNOW
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
      {CODES.map((c, i) => {
        // по одному на піврядок такту — очі встигають прочитати кожен
        const p = interpolate(local, [4 + i * 2.2, 11 + i * 2.2], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
        return (
          <span
            key={c}
            style={{
              font: `800 84px ${FONTS.head}`,
              letterSpacing: "-0.02em",
              color: C.txt,
              opacity: p,
              transform: `translateY(${((1 - p) * 22).toFixed(1)}px)`,
              borderBottom: `5px solid ${C.mRed}`,
              paddingBottom: 4,
            }}
          >
            {c}
          </span>
        );
      })}
    </div>
  </div>
);

/** Фінал: знак, адреса сайту, телефон. */
const Outro: React.FC<{ local: number }> = ({ local }) => {
  const logo = interpolate(local, [2, 14], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  // Гальмо з перельотом: без нього поява знака читається як різкий стоп
  const brake = local >= 10 && local <= 22 ? Math.sin(Math.PI * ((local - 10) / 12)) * 0.05 : 0;
  const url = interpolate(local, [26, 38], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const cta = interpolate(local, [36, 48], [0, 1], { ...clamp, easing: Easing.bezier(0.22, 1, 0.36, 1) });
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1000px 700px at 50% 42%, rgba(228,0,43,0.20), rgba(8,8,10,0) 72%), radial-gradient(1200px 900px at 50% 92%, rgba(12,99,176,0.14), rgba(8,8,10,0) 70%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: W / 2 - 410,
          top: 470,
          width: 820,
          opacity: logo,
          transform: `scale(${(0.9 + 0.1 * logo + brake).toFixed(4)})`,
        }}
      >
        <Img src={staticFile("logo.png")} style={{ width: "100%", display: "block" }} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1062,
          textAlign: "center",
          font: `800 84px ${FONTS.head}`,
          letterSpacing: "-0.02em",
          color: C.txt,
          opacity: url,
          transform: `translateY(${((1 - url) * 22).toFixed(1)}px)`,
        }}
      >
        {CTA.url}
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: 1200, textAlign: "center", opacity: cta }}>
        <div
          style={{
            display: "inline-block",
            background: C.mRed,
            color: "#fff",
            font: `800 72px ${FONTS.head}`,
            padding: "18px 44px",
            borderRadius: 14,
            letterSpacing: "0.01em",
          }}
        >
          {CTA.phone}
        </div>
        <div style={{ marginTop: 30, font: `500 ${T.aux}px ${FONTS.mono}`, letterSpacing: "0.04em", color: C.txt2 }}>
          {CTA.place}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* 🪤 Кадр передається ПРОПОМ, не через useCurrentFrame().
   Sequence перебазовує лічильник кадрів на свій початок — через це
   `f - s.from` рахувало від нуля, і все після другого кадру ставало
   чорним. Тому Sequence тут немає взагалі: шари просто малюються
   в порядку списку, пізніший поверх раннього. */
const ShotLayer: React.FC<{ s: Shot; i: number; f: number }> = ({ s, i, f }) => {
  const local = f - s.from;
  const dur = shotEnd(i) - s.from;

  // Як цей кадр заходить на зміну попередньому
  let clip: string | undefined;
  let stripes: React.ReactNode = null;
  if (s.cut === "mwipe-r" || s.cut === "mwipe-l") {
    const dir = s.cut === "mwipe-r" ? "r" : "l";
    const t = interpolate(f, [s.from - LEAD, s.from - LEAD + WIPE], [0, 1], { ...clamp, easing: Easing.bezier(0.5, 0, 0.2, 1) });
    clip = t < 1 ? revealPath(t, dir) : undefined;
    stripes = <MStripes t={t} dir={dir} />;
  } else if (f < s.from) {
    return null; // різання та біла склейка — миттєві
  }

  return (
    <>
      <AbsoluteFill style={{ clipPath: clip }}>
        {s.kind === "outro" ? (
          <Outro local={local} />
        ) : (
          <>
            <Photo s={s} local={local} dur={dur} dim={s.kind === "codes"} />
            {s.kind === "codes" ? <Codes local={local} /> : null}
            <Caption f={local} line={s.line} hl={s.hl} sub={s.sub} />
          </>
        )}
      </AbsoluteFill>
      {stripes}
    </>
  );
};

/** Біла склейка на 4 кадри — накриває різання, не прикрашає кадр. */
const Flash: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at - 3, at, at + 4], [0, 0.95, 0], clamp);
  if (o <= 0.002) return null;
  return <AbsoluteFill style={{ background: "#fff", opacity: o }} />;
};

/** Єдиний на ролик удар по всьому кадру (правило R4: таких ≤3). */
const Slam: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at - 3, at, at + 9], [0, 1, 0], clamp);
  if (o <= 0.002) return null;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 80% at 50% 50%, rgba(255,255,255,${(0.96 * o).toFixed(3)}), rgba(228,0,43,${(0.55 * o).toFixed(3)}) 58%, rgba(255,255,255,0) 100%)`,
      }}
    />
  );
};

export const AdV2: React.FC<{ bgm?: boolean }> = ({ bgm = true }) => {
  useSiteFonts();
  const f = useCurrentFrame();
  const out = interpolate(f, [TOTAL - 8, TOTAL], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {SHOTS.map((s, i) =>
        f >= s.from - LEAD && f < shotEnd(i) ? <ShotLayer key={s.id} s={s} i={i} f={f} /> : null
      )}

      {SHOTS.filter((s) => s.cut === "flash").map((s) => (
        <Flash key={s.id} at={s.from} />
      ))}
      {SHOTS.filter((s) => s.cut === "slam").map((s) => (
        <Slam key={s.id} at={s.from} />
      ))}

      {/* Одна «шкіра» на весь ролик, щоб 11 кадрів читались як одне ціле */}
      <Vignette strength={0.3} inner={0.5} color="#08080a" />
      <Grain opacity={0.045} step={2} />
      <AbsoluteFill style={{ background: C.bg, opacity: out }} />

      {bgm ? <Audio src={staticFile(`audio/${BGM.src}`)} volume={BGM.volume} /> : null}
      {SFX.map((s, i) => (
        <Sequence key={i} from={Math.max(0, s.from)} durationInFrames={s.dur ?? 70}>
          <Audio src={staticFile(`audio/${s.src}`)} volume={s.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
