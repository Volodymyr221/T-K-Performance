import React from "react";
import { Composition } from "remotion";
import { AdV2 } from "./v2/AdV2";
import { TOTAL, FPS } from "./v2/shotsV2";

/* Формат 9:16 (1080×1920) — Reels, Stories і вертикаль у стрічці.
   🔴 Версії 4:5 тут немає свідомо: координати пораховані від висоти
   1920, у 1350 нижня третина піде за край. Це окремий прохід.

   Першу версію (повільне промо в стилі вебпродукту) Вова відхилив —
   «це не реклама для СТО для Англії». Вона лишилась в історії git,
   коміт 2930e5a, якщо колись знадобиться для Instagram. */
export const Root: React.FC = () => (
  <>
    <Composition id="Ad916" component={AdV2} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} defaultProps={{ bgm: true }} />
  </>
);
