import React from "react";
import { Composition } from "remotion";
import { Ad } from "./Ad";
import { TOTAL, FPS } from "./shots";

/* Формат 9:16 (1080×1920) — Reels, Stories і вертикаль у стрічці.
   🔴 Версії 4:5 ТУТ НЕМАЄ СВІДОМО. Усі координати кадрів пораховані
   від висоти 1920: у 1350 нижня третина (адреса сайту, телефон)
   просто піде за край. Чесний 4:5 — це окремий прохід по розкладці,
   а не зміна числа в композиції. Зробимо, якщо Вова скаже. */
export const Root: React.FC = () => (
  <>
    <Composition id="Ad916" component={Ad} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} defaultProps={{ bgm: true }} />
  </>
);
