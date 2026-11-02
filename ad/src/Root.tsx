import React from "react";
import { Composition } from "remotion";
import { Ad } from "./Ad";
import { TOTAL, FPS } from "./shots";

/* Два формати з ОДНОГО таймлайну:
   · 9:16 — Reels і Stories, головний. Там зараз найдешевше охоплення.
   · 4:5  — стрічка Facebook: вертикаль 9:16 у стрічці обрізають.
   Макет кадрів рахується від 1080×1920; у 4:5 сцену беремо
   «по центру» масштабом, щоб не переверстувати все вдруге. */
export const Root: React.FC = () => (
  <>
    <Composition id="Ad916" component={Ad} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} defaultProps={{ bgm: true }} />
    <Composition id="Ad45" component={Ad} durationInFrames={TOTAL} fps={FPS} width={1080} height={1350} defaultProps={{ bgm: true }} />
  </>
);
