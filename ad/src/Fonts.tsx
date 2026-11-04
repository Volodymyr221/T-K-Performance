/* Шрифти сайту в рендері.
   🪤 Без delayRender перші кадри йдуть системним шрифтом: Chromium
   малює ще до того, як woff2 дочитався, і в ролику перші пів секунди
   інша гарнітура. Тримаємо кадр, поки шрифти не готові. */
import { continueRender, delayRender, staticFile } from "remotion";
import { useEffect, useState } from "react";

const CSS = `
@font-face{font-family:'Archivo';font-style:normal;font-weight:400 800;font-stretch:75% 125%;src:url('${staticFile("fonts/archivo-latin-400_800.woff2")}') format('woff2');}
@font-face{font-family:'JetBrains Mono';font-style:normal;font-weight:500;src:url('${staticFile("fonts/jetbrains-mono-latin-500.woff2")}') format('woff2');}
`;

export const useSiteFonts = () => {
  const [handle] = useState(() => delayRender("шрифти сайту"));
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    const probe = ["800 100px Archivo", "500 100px 'JetBrains Mono'"].map((f) => document.fonts.load(f));
    Promise.all(probe)
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
};
