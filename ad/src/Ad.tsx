/* ═══════════════════════════════════════════════════════════
   Збирання ролика: три кадри + склейки + звук.
   Тривалості й точки звуку беруться з shots.ts — тут їх НЕМА.
   ═══════════════════════════════════════════════════════════ */
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C } from "./tokens";
import { Grain, Vignette } from "./lib/Polish";
import { SHOTS, CUTS, SFX, BGM, TOTAL } from "./shots";
import { S1Spotlight } from "./shots/S1Spotlight";
import { S2Deal } from "./shots/S2Deal";
import { S3Outro } from "./shots/S3Outro";
import { useSiteFonts } from "./Fonts";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Біла спалах-склейка: накриває місце стику по 5 кадрів з кожного боку.
 *  Гола склейка «зливає» всю кінематографічність, набрану по кадрах. */
const FlashCut: React.FC<{ at: number; span?: number; strength?: number }> = ({ at, span = 5, strength = 0.92 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at - span, at, at + span], [0, strength, 0], clamp);
  if (o <= 0.001) return null;
  return <AbsoluteFill style={{ background: "#fff", opacity: o, pointerEvents: "none" }} />;
};

/** Єдиний на весь ролик удар по всьому кадру (правило R4: таких ≤3). */
const Slam: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at - 3, at, at + 7], [0, 1, 0], clamp);
  if (o <= 0.001) return null;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 80% at 50% 50%, rgba(255,255,255,${(0.95 * o).toFixed(3)}), rgba(255,31,69,${(0.5 * o).toFixed(3)}) 60%, rgba(255,255,255,0) 100%)`,
        pointerEvents: "none",
      }}
    />
  );
};

export const Ad: React.FC<{ bgm?: boolean }> = ({ bgm = true }) => {
  useSiteFonts();
  const f = useCurrentFrame();
  // Фінальне затемнення: останні 8 кадрів. Ролик у стрічці крутиться
  // по колу — різкий стик кінця з початком виглядає як збій.
  const out = interpolate(f, [TOTAL - 8, TOTAL], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Sequence from={SHOTS.s1.from} durationInFrames={SHOTS.s1.dur}>
        <S1Spotlight />
      </Sequence>
      <Sequence from={SHOTS.s2.from} durationInFrames={SHOTS.s2.dur}>
        <S2Deal />
      </Sequence>
      <Sequence from={SHOTS.s3.from} durationInFrames={SHOTS.s3.dur}>
        <S3Outro />
      </Sequence>

      <FlashCut at={CUTS.flash} />
      <Slam at={CUTS.slam} />

      {/* Плівкове зерно й віньєтка на весь ролик — одна «шкіра»
          кадру, інакше три кадри читаються як три різні ролики. */}
      <Vignette strength={0.34} inner={0.46} color="#08080a" />
      <Grain opacity={0.05} step={2} />

      <AbsoluteFill style={{ background: C.bg, opacity: out, pointerEvents: "none" }} />

      {/* ── Звук ─────────────────────────────────────────────
          Музика окремим вимикачем: з того самого таймлайну
          віддаємо дві версії — з музикою і без неї. */}
      {bgm ? <Audio src={staticFile(`audio/${BGM.src}`)} volume={BGM.volume} startFrom={0} /> : null}
      {SFX.map((s, i) => (
        <Sequence key={i} from={Math.max(0, s.from)} durationInFrames={s.dur ?? 70}>
          <Audio src={staticFile(`audio/${s.src}`)} volume={s.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
