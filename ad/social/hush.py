#!/usr/bin/env python3
"""
Приглушує ділянку ТЛА на фото — або пікселізує її.

  python3 ad/social/hush.py вхід вихід --dim x,y,w,h [--dim ...] [--px x,y,w,h]

  --dim  притемнити, знебарвити і трохи розмити ділянку
  --px   пікселізувати (для НОМЕРНИХ ЗНАКІВ)
  --k    наскільки темніше, 0.30 за замовчуванням (менше = темніше)
  --feather  розмитий край маски в пікселях, 36 за замовчуванням

🔑 ЧОМУ САМЕ ПРИТЕМНЕННЯ, А НЕ «ЗАМАЛЮВАТИ».
Зафарбувати або склонувати сусідню ділянку — найшвидший спосіб
отримати рівно те, чого Вова просив уникнути: видно повтор текстури
і шов. Тут ми НІЧОГО не домальовуємо: лишається справжня фактура
кадру, просто темніша, менш насичена і трохи м'якша — як предмет,
що стоїть глибше й поза фокусом. Фон у цьому фото й так трохи
розмитий, тому зайві два пікселі розмиття фізично доречні.

Край маски розмитий на 36px: різкий край — це і є «фотошоп».

🔴 НОМЕРНІ ЗНАКИ — тільки `--px`, не `--dim`. Знак через DVLA виводить
на власника, це персональні дані. Притемнення оборотне, пікселізація —
ні. Розмиття теж НЕ годиться: воно частково відновлюється.
"""
import sys

# 🪤 У цьому контейнері `python3` — це 3.11, а там лежить ОБРІЗАНИЙ PIL
# без C-модуля `_imaging`: імпорт падає незрозумілим ImportError.
# Робочий Pillow стоїть для 3.13. Тому запускати:  python3.13 hush.py …
try:
    from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
except ImportError as e:
    sys.exit("PIL не працює під %s (%s).\nЗапусти цей скрипт через python3.13." %
             (sys.executable, e))


def rects(flag, argv):
    out = []
    for i, a in enumerate(argv):
        if a == flag and i + 1 < len(argv):
            out.append(tuple(int(v) for v in argv[i + 1].split(",")))
    return out


def opt(flag, argv, default):
    for i, a in enumerate(argv):
        if a == flag and i + 1 < len(argv):
            return float(argv[i + 1])
    return default


def main():
    a = sys.argv
    if len(a) < 3:
        print(__doc__)
        sys.exit(1)
    src, dst = a[1], a[2]
    dims, pxs = rects("--dim", a), rects("--px", a)
    k = opt("--k", a, 0.30)
    feather = int(opt("--feather", a, 36))

    im = Image.open(src).convert("RGB")
    W, H = im.size

    # ── Притемнення ─────────────────────────────────────────
    if dims:
        # Підготовлена версія ВСЬОГО кадру; маска вирішує, де її видно.
        hushed = ImageEnhance.Brightness(im).enhance(k)
        hushed = ImageEnhance.Color(hushed).enhance(0.45)
        hushed = hushed.filter(ImageFilter.GaussianBlur(2.4))

        # 🪤 Розмиття маски НЕ може бути більшим за саму ділянку.
        # Було: смуга 68px завширшки, розмиття 36 — маска «розпливлась»
        # і в центрі давала ~60 зі 255 замість 255, тобто притемнення
        # спрацьовувало на чверть сили. На око різниці майже не було.
        # Тепер: крок розмиття прив'язаний до вузького боку, а сам
        # прямокутник роздувається на цей крок, щоб серцевина лишалась
        # суцільною, а м'яким був тільки край.
        sigma = min(feather, max(6, min(min(w, h) for (_, _, w, h) in dims) / 3.5))
        mask = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(mask)
        for (x, y, w, h) in dims:
            g = int(sigma)
            # Заокруглення: гострий кут маски проступає навіть крізь
            # розмиття і читається як рамка.
            d.rounded_rectangle([x - g, y - g, x + w + g, y + h + g],
                                radius=max(4, min(w, h) // 3), fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(sigma))
        im = Image.composite(hushed, im, mask)

    # ── Пікселізація (номерні знаки) ────────────────────────
    for (x, y, w, h) in pxs:
        box = (x, y, x + w, y + h)
        cell = max(6, min(w, h) // 7)        # клітинка помітно більша за деталь
        part = im.crop(box)
        part = part.resize((max(1, w // cell), max(1, h // cell)), Image.BOX)
        im.paste(part.resize((w, h), Image.NEAREST), box)

    im.save(dst, quality=96)
    print("✅ %s  %dx%d  притемнено: %d  пікселізовано: %d" % (dst, W, H, len(dims), len(pxs)))


if __name__ == "__main__":
    main()
