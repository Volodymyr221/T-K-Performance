/* ═══════════════════════════════════════════════════════════
   T&K Performance — поведінка сторінки
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* Браузер за замовчуванням відновлює позицію прокрутки при
     поверненні на сторінку. У вікні PWA це виглядає так, ніби сайт
     сам відкривається десь посередині — беремо керування на себе. */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  var CFG  = window.TK   || {};
  var DICT = window.I18N || {};
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── 1. Мова ───────────────────────────────────────────── */

  /* Чотири мови. CODE — підпис на пігулці в шапці.
     LOCALE — код для Intl: «4 дні тому» під відгуками має
     звучати тією ж мовою, що й решта сторінки. */
  var CODE   = { en: "EN",    uk: "UA", pl: "PL", ru: "RU" };
  var LOCALE = { en: "en-GB", uk: "uk", pl: "pl", ru: "ru" };

  var lang     = "en";
  var langBox  = $("#lang");
  var langBtn  = $("#lang-btn");
  var langMenu = $("#lang-menu");
  var langCur  = $("#lang-cur");

  function t(key) {
    var pack = DICT[lang] || DICT.en || {};
    return pack[key] || (DICT.en && DICT.en[key]) || key;
  }

  function applyLang(next) {
    if (!DICT[next]) return;
    lang = next;
    document.documentElement.lang = next;

    $$("[data-i18n]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n"));
      if (v) el.textContent = v;
    });
    $$("[data-ph]").forEach(function (el) {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.placeholder = t(el.getAttribute("data-ph"));
      }
    });
    /* Підписи для зчитувачів екрана. Їх не видно очима, але вони
       теж мають звучати мовою сторінки — інакше українцеві
       зчитувач каже «Language» посеред української. */
    $$("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });

    paintWhatsApp();
    paintChips();
    paintSendLabel();
    /* 🪤 applyLang спрацьовує ще на старті, коли розділ 13 нижче
       ЩЕ НЕ виконався і CALC дорівнює undefined. Без перевірки
       сторінка падала б на першому ж рядку. */
    if (typeof CALC !== "undefined" && CALC.relang) CALC.relang();

    if (langCur) langCur.textContent = CODE[next] || next.toUpperCase();
    $$("#lang-menu button").forEach(function (b) {
      var on = b.dataset.lang === next;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });

    paintHours();
    paintDates();
  }

  /* Назва вузла («Турбіна») не каже зчитувачу екрана, що це
     посилання на форму. Підпис збираємо з шаблону поточної мови. */
  function paintChips() {
    var tpl = t("a11y.chip");
    if (!tpl) return;
    $$(".chip[data-svc]").forEach(function (c) {
      c.setAttribute("aria-label", tpl + c.textContent.trim());
    });
  }

  /* Посилання wa.me з уже набраним текстом мовою сторінки.
     Клієнт тисне — у нього відкривається WhatsApp, лишається
     дописати і надіслати. Це БЕЗКОШТОВНО і без API Meta саме
     тому, що першим пише клієнт, а не ми йому.

     У розмітці лежить робоче англійське посилання — без JS
     кнопка все одно працює, просто текст буде англійський. */
  function paintWhatsApp() {
    var num = CFG.whatsapp;
    if (!num) return;
    var txt = t("wa.text");
    var href = "https://wa.me/" + num +
               (txt ? "?text=" + encodeURIComponent(txt) : "");
    $$("[data-wa]").forEach(function (a) { a.setAttribute("href", href); });
  }

  /* Підпис кнопки заявки залежить від того, ЧИМ вона шле.
     Воркера немає → шле сам клієнт із WhatsApp, і кнопка це
     мусить сказати. Зʼявиться воркер → звичайне «Send request».
     Шукаємо вузол щоразу: функцію кличе applyLang, а він може
     спрацювати раніше, ніж розділ 6 розбере форму. */
  function paintSendLabel() {
    var s = document.querySelector("#f-send span");
    if (!s) return;
    s.textContent = t(CFG.formEndpoint ? "f.send" : "f.sendWa");
  }

  function setLangMenu(open) {
    if (!langMenu || !langBtn) return;
    langMenu.classList.toggle("is-open", open);
    langBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  /* Викликається і з бургера: два випадні списки відкритими
     одночасно на телефоні перекривали б один одного. */
  function closeLangMenu(focusBtn) {
    if (!langBtn || langBtn.getAttribute("aria-expanded") !== "true") return;
    setLangMenu(false);
    if (focusBtn) langBtn.focus();
  }

  (function initLang() {
    /* Сайт ЗАВЖДИ відкривається англійською: це основна мова бізнесу
       в Британії. Іншу вмикає тільки сам відвідувач, і вибір діє до
       закриття вкладки — нічого не зберігаємо і мову браузера не
       вгадуємо. */
    if (!langBox || !langBtn || !langMenu) return;

    langBtn.addEventListener("click", function (e) {
      e.stopPropagation();                 /* щоб не спіймав слухач нижче */
      setLangMenu(langBtn.getAttribute("aria-expanded") !== "true");
    });

    $$("#lang-menu button").forEach(function (b) {
      b.addEventListener("click", function () {
        applyLang(b.dataset.lang);
        closeLangMenu(true);
      });
    });

    /* клік будь-де повз перемикач — закрити */
    document.addEventListener("click", function (e) {
      if (!langBox.contains(e.target)) closeLangMenu(false);
    });

    langBox.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeLangMenu(true); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

      /* стрілки ходять по мовах по колу — як у звичайному меню */
      e.preventDefault();
      var items = $$("#lang-menu button");
      if (!items.length) return;

      if (langBtn.getAttribute("aria-expanded") !== "true") {
        setLangMenu(true);
        items[0].focus();
        return;
      }
      var i = items.indexOf(document.activeElement);
      if (i === -1) { items[0].focus(); return; }
      items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus();
    });

    /* пішли Tab-ом за межі перемикача — теж закрити */
    langBox.addEventListener("focusout", function (e) {
      if (!langBox.contains(e.relatedTarget)) closeLangMenu(false);
    });
  })();

  /* ── 2. Шапка: тінь при скролі + бургер ────────────────── */
  var hdr = $("#hdr");
  var onScroll = function () {
    hdr.classList.toggle("is-stuck", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var burger = $("#burger"), nav = $("#nav"), veil = $("#veil");

  function setNav(open) {
    if (open) closeLangMenu(false);
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-open", open);
    if (open) {
      veil.hidden = false;
      requestAnimationFrame(function () { veil.classList.add("is-on"); });
    } else {
      veil.classList.remove("is-on");
      setTimeout(function () {
        if (!nav.classList.contains("is-open")) veil.hidden = true;
      }, 280);
    }
  }
  function closeNav() { setNav(false); }

  burger.addEventListener("click", function () {
    setNav(!nav.classList.contains("is-open"));
  });
  veil.addEventListener("click", closeNav);
  $$("#nav a").forEach(function (a) { a.addEventListener("click", closeNav); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  /* ── 3. Поява блоків при скролі ────────────────────────── */
  var revs = $$(".reveal");
  revs.forEach(function (el) { el.style.setProperty("--d", el.dataset.d || 0); });

  if (!window.IntersectionObserver ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revs.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revs.forEach(function (el) { io.observe(el); });
  }

  /* ── 4. Відчинено / зачинено зараз ─────────────────────── */
  function londonNow() {
    var f = new Intl.DateTimeFormat("en-GB", {
      timeZone: CFG.timeZone || "Europe/London",
      weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
    }).formatToParts(new Date());
    var map = {};
    f.forEach(function (p) { map[p.type] = p.value; });
    var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      day: days[map.weekday],
      mins: parseInt(map.hour, 10) * 60 + parseInt(map.minute, 10)
    };
  }

  function paintHours() {
    var box = $("#open-status");
    if (!box || !CFG.hours) return;

    var now = londonNow();
    if (now.day === undefined) return;

    var span = CFG.hours[now.day];
    var open = !!span && now.mins >= span[0] && now.mins < span[1];

    box.hidden = false;
    box.textContent = open ? t("fu.open") : t("fu.shut");
    box.classList.toggle("is-open", open);
    box.classList.toggle("is-shut", !open);

    $$(".hours tr").forEach(function (tr) {
      var days = (tr.dataset.day || "").split(",");
      tr.classList.toggle("is-today", days.indexOf(String(now.day)) !== -1);
    });
  }
  paintHours();
  setInterval(paintHours, 60000);

  /* ── Скільки минуло від відгуку ─────────────────────────
     Дата публікації лежить у <time datetime>, а «4 дні тому»
     рахується щоразу при відкритті сторінки. Intl.RelativeTimeFormat
     сам дає правильні форми обома мовами: «1 день», «4 дні»,
     «5 днів» — руками ці відмінки не виписуємо.
     Без JS лишається статичний текст у розмітці. */
  function paintDates() {
    var nodes = $$(".rev__date");
    if (!nodes.length) return;

    var RTF = window.Intl && Intl.RelativeTimeFormat;
    if (!RTF) return;                    // старий браузер — лишається розмітка

    /* Два форматувальники навмисно:
       для днів "auto" дає «today» і «yesterday» — так і треба;
       для тижнів той самий "auto" дав би «last week» замість
       «1 week ago», а для відгуку це читається дивно. */
    var loc = LOCALE[lang] || "en-GB", fmtDay, fmtBig;
    try {
      fmtDay = new RTF(loc, { numeric: "auto" });
      fmtBig = new RTF(loc, { numeric: "always" });
    } catch (e) { return; }

    var now = Date.now();
    nodes.forEach(function (el) {
      var iso = el.getAttribute("datetime");
      if (!iso) return;
      var then = Date.parse(iso + "T12:00:00Z");
      if (isNaN(then)) return;

      var days = Math.floor((now - then) / 86400000);
      if (days < 0) days = 0;

      var value, unit, fmt = fmtBig;
      if (days < 7)        { value = days; unit = "day"; fmt = fmtDay; }
      else if (days < 31)  { value = Math.floor(days / 7);      unit = "week"; }
      else if (days < 365) { value = Math.floor(days / 30.44);  unit = "month"; }
      else                 { value = Math.floor(days / 365.25); unit = "year"; }

      el.textContent = fmt.format(-value, unit);
    });
  }
  paintDates();

  /* ── 5. Карта вантажиться тільки на клік ───────────────── */
  var mapBtn = $("#map-load");
  if (mapBtn) {
    mapBtn.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = "https://www.google.com/maps?q=" +
        encodeURIComponent("12 Arun Business Park, Bognor Regis, PO22 9SX") +
        "&output=embed";
      f.loading = "lazy";
      f.title = "T&K Performance on the map";
      f.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
      f.style.border = "0";
      mapBtn.replaceWith(f);
    });
  }

  /* ── 6. Форма заявки ───────────────────────────────────── */
  var form = $("#book-form");
  if (!form) return;

  var out  = $("#f-msg-out");
  var send = $("#f-send");
  var sendLabel = send.querySelector("span");

  function setErr(input, msgKey) {
    var fld = input.closest(".fld");
    var err = fld.querySelector("[data-err]");
    if (msgKey) {
      fld.classList.add("is-bad");
      if (err) err.textContent = t(msgKey);
      input.setAttribute("aria-invalid", "true");
    } else {
      fld.classList.remove("is-bad");
      if (err) err.textContent = "";
      input.removeAttribute("aria-invalid");
    }
  }

  function say(msgKey, ok) {
    out.textContent = t(msgKey);
    out.className = "form__msg " + (ok ? "is-ok" : "is-bad");
  }

  var nameEl  = $("#f-name");
  var phoneEl = $("#f-phone");

  var regEl = $("#f-reg");

  [nameEl, phoneEl, regEl].filter(Boolean).forEach(function (el) {
    el.addEventListener("input", function () { setErr(el, null); });
  });

  /* Номерний знак одразу великими літерами. CSS робить це лише на
     вигляд — значення лишалось би таким, як надрукували, і в Telegram
     прилітало б «ab12 cde». Курсор не чіпаємо: ставимо назад, бо
     присвоєння value кидає його в кінець рядка. */
  if (regEl) {
    regEl.addEventListener("input", function () {
      var pos = regEl.selectionStart;
      var up  = regEl.value.toUpperCase();
      if (up !== regEl.value) {
        regEl.value = up;
        try { regEl.setSelectionRange(pos, pos); } catch (e) {}
      }
    });
  }

  function validate() {
    var ok = true;
    if (nameEl.value.trim().length < 2) { setErr(nameEl, "f.errName"); ok = false; }
    else setErr(nameEl, null);

    var digits = phoneEl.value.replace(/\D/g, "");
    if (digits.length < 9) { setErr(phoneEl, "f.errPhone"); ok = false; }
    else setErr(phoneEl, null);

    /* Номер ОБОВʼЯЗКОВИЙ. Формат НЕ звіряємо: крім звичайного
       «AB12 CDE» у Британії їздять іменні знаки, північноірландські
       й імпортні — регулярка відсіяла б справжніх клієнтів.
       Вимагаємо лише, щоб там щось було. */
    if (regEl) {
      if (regEl.value.trim().length < 2) { setErr(regEl, "f.errReg"); ok = false; }
      else setErr(regEl, null);
    }

    return ok;
  }

  /* ── Заявка через WhatsApp, без сервера ──────────────────
     Сайт на GitHub Pages — статика: свого сервера немає, а токен
     бота в публічний JS класти не можна. Тому заявку надсилає САМ
     клієнт зі свого WhatsApp: ми лише складаємо текст і відкриваємо
     застосунок із уже набраним повідомленням.

     🔴 ЧЕСНА МЕЖА: якщо людина не натисне «надіслати» ВЖЕ У WhatsApp —
     заявка не дійде, і ми про неї навіть не дізнаємось. Форма тут
     нічого не гарантує; гарантує лише воркер (`worker/README.md`).

     Текст повідомлення — АНГЛІЙСЬКИЙ при будь-якій мові сторінки:
     його читає сервіс, а не клієнт. Опис проблеми лишається тією
     мовою, якою людина друкувала. */
  function waBody() {
    var svc = $("#f-svc");
    var box = $("#f-msg");
    /* Калькулятор увімкнено і щось обрано — у заявку йде перелік
       робіт і вилка. Менеджер одразу бачить, на яку суму людина
       розраховує, і розмова починається не з нуля. */
    var work = (typeof CALC !== "undefined" && CALC.on) ? CALC.line() : "";
    var lines = [
      "New enquiry from tk-performance.co.uk",
      "",
      "Name: "    + nameEl.value.trim(),
      "Phone: "   + phoneEl.value.trim(),
      "Reg: "     + (regEl ? regEl.value.trim() : "—"),
      "Service: " + (work || (svc ? svc.value : "—"))
    ];
    var msg = box ? box.value.trim() : "";
    if (msg) lines.push("Details: " + msg);
    return lines.join("\n");
  }

  function sendViaWhatsApp() {
    var href = "https://wa.me/" + CFG.whatsapp +
               "?text=" + encodeURIComponent(waBody());

    /* Посилання і повідомлення ставимо ДО відкриття: нижче можливий
       перехід тим самим вікном, після нього код уже не виконається. */
    var link = $("#f-wa-link"), box = $("#f-wa");
    if (link) link.setAttribute("href", href);
    if (box) box.hidden = false;
    say("f.wa", true);

    /* Без "noopener" у третьому аргументі: з ним Chrome віддає null
       і при УСПІШНОМУ відкритті — ми б вирішили, що вікно заблоковано,
       і пішли переходом удруге. Звʼязок рвемо вручну. */
    var w = window.open(href, "_blank");
    if (w) { try { w.opener = null; } catch (err) {} }
    else   { location.href = href; }

    /* Форму НЕ чистимо: якщо у WhatsApp людина не дотисла «надіслати»
       і повернулась — поля мають бути на місці. */
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    out.className = "form__msg";

    if (!validate()) {
      var bad = form.querySelector(".is-bad input");
      if (bad) bad.focus();
      return;
    }

    /* пастка для ботів: люди це поле не бачать */
    if ($("#f-web").value) { say("f.ok", true); form.reset(); return; }

    /* Воркера немає — шлемо через WhatsApp. Немає й номера WhatsApp
       (хтось вичистив config) — чесно просимо подзвонити. */
    if (!CFG.formEndpoint) {
      if (CFG.whatsapp) sendViaWhatsApp();
      else say("f.offline", false);
      return;
    }

    var data = {
      name:    nameEl.value.trim(),
      phone:   phoneEl.value.trim(),
      reg:     regEl ? regEl.value.trim() : "",
      service: $("#f-svc").value,
      message: $("#f-msg").value.trim(),
      lang:    lang,
      page:    location.href
    };

    send.disabled = true;
    sendLabel.textContent = t("f.sending");

    fetch(CFG.formEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        say("f.ok", true);
        form.reset();
      })
      .catch(function () { say("f.fail", false); })
      .then(function () {
        send.disabled = false;
        sendLabel.textContent = t("f.send");
      });
  });

  /* ── 8. Стрічка відгуків ───────────────────────────────
     Скрол нативний, зі scroll-snap — свайп на телефоні працює
     без JS. Тут лише стрілки для миші та крапки-індикатор. */
  (function reviewsRail() {
    var rail = $("#revs-rail");
    if (!rail) return;

    var cards = $$(".rev", rail);
    var prev = $("#rev-prev"), next = $("#rev-next"), dots = $("#rev-dots");
    if (!cards.length) return;

    cards.forEach(function () {
      var i = document.createElement("i");
      dots.appendChild(i);
    });
    var pips = $$("i", dots);

    function step() {
      if (cards.length < 2) return cards[0].offsetWidth;
      return cards[1].offsetLeft - cards[0].offsetLeft;
    }

    function paint() {
      var max = rail.scrollWidth - rail.clientWidth;
      var idx = Math.round(rail.scrollLeft / step());
      idx = Math.max(0, Math.min(idx, cards.length - 1));
      pips.forEach(function (p, i) { p.classList.toggle("is-on", i === idx); });
      if (prev) prev.disabled = rail.scrollLeft < 4;
      if (next) next.disabled = rail.scrollLeft > max - 4;
    }

    var tick;
    rail.addEventListener("scroll", function () {
      clearTimeout(tick);
      tick = setTimeout(paint, 60);
    }, { passive: true });

    function slide(dir) {
      rail.scrollBy({ left: dir * step(), behavior: "smooth" });
    }
    if (prev) prev.addEventListener("click", function () { slide(-1); });
    if (next) next.addEventListener("click", function () { slide(1); });

    /* стрілки з клавіатури, коли стрічка у фокусі */
    rail.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); slide(1); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); slide(-1); }
    });

    window.addEventListener("resize", paint, { passive: true });
    paint();
  })();

  /* ── 10. Stage-тюнінг: вкладки ─────────────────────────── */
  (function initStage() {
    var tabs = $$(".stage__tab");
    if (!tabs.length) return;

    var panel = $("#stg-panel");
    var hEl = $(".stage__h"), pEl = $(".stage__p"),
        gEl = $(".stage__g"), fill = $(".stage__bar i");
    if (!panel || !hEl || !pEl || !gEl || !fill) return;

    var selected = "1";

    /* Панель одна на три вкладки. Міняємо не текст, а САМ КЛЮЧ
       перекладу в data-i18n — тоді перемикач мов підхопить панель
       сам, без жодного додаткового дроту: applyLang проходить по
       всіх [data-i18n] і бере те, що там зараз написано. */
    function show(n, lock) {
      var tab = null;
      tabs.forEach(function (b) { if (b.dataset.stage === n) tab = b; });
      if (!tab) return;

      hEl.setAttribute("data-i18n", "st." + n + "h");
      pEl.setAttribute("data-i18n", "st." + n + "p");
      gEl.setAttribute("data-i18n", "st." + n + "g");
      hEl.textContent = t("st." + n + "h");
      pEl.textContent = t("st." + n + "p");
      gEl.textContent = t("st." + n + "g");

      fill.style.width = tab.dataset.fill + "%";
      panel.setAttribute("aria-labelledby", tab.id);

      if (!lock) return;
      selected = n;
      tabs.forEach(function (b) {
        var on = b.dataset.stage === n;
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;   /* у tablist по Tab входимо один раз */
      });
    }

    tabs.forEach(function (b) {
      b.addEventListener("click", function () { show(b.dataset.stage, true); });
      /* Наведення лише підглядає: вибір не змінюється, і коли миша
         піде — панель повернеться до обраного. На дотику mouseenter
         не буває, тому телефонів це не стосується взагалі. */
      b.addEventListener("mouseenter", function () { show(b.dataset.stage, false); });
    });

    var list = $(".stage__tabs");
    list.addEventListener("mouseleave", function () { show(selected, false); });

    list.addEventListener("keydown", function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i === -1) return;

      var j = null;
      if (e.key === "ArrowRight")     j = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") j = (i + tabs.length - 1) % tabs.length;
      else if (e.key === "Home")      j = 0;
      else if (e.key === "End")       j = tabs.length - 1;
      if (j === null) return;

      e.preventDefault();
      tabs[j].focus();
      show(tabs[j].dataset.stage, true);
    });
  })();

  /* ── 11. Плашки послуг → готова заявка ─────────────────
     Людина тисне «Ремонт до техогляду» — її переносить до форми,
     послуга вже обрана, а в описі стоїть сама плашка. Лишається
     вписати імʼя, телефон і номер машини.

     У розмітці плашка — звичайне <a href="#booking">, тому без
     JavaScript вона просто веде до форми. Тут ми тільки
     доповнюємо: підставляємо послугу й показуємо це. */
  (function () {
    var chips = $$(".chip[data-svc]");
    if (!chips.length) return;

    var svc  = $("#f-svc");
    var msg  = $("#f-msg");
    var name = $("#f-name");
    var form = $("#booking");
    if (!svc || !form) return;

    /* Чи є в списку такий пункт. Якщо колись приберуть послугу з
       форми, а плашка лишиться — мовчки нічого не обираємо,
       замість того щоб ставити порожнє значення. */
    function hasOption(v) {
      return $$("#f-svc option").some(function (o) { return o.value === v; });
    }

    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        var want = c.dataset.svc;

        /* Калькулятор увімкнено — плашка позначає свій пункт у ньому.
           Список НЕ відкриваємо: він виштовхнув би форму вниз, до якої
           ми щойно прокрутили. Видимий відгук дає плашка обраного,
           що зʼявляється під кнопкою, і спалах самої кнопки. */
        if (typeof CALC !== "undefined" && CALC.on && c.dataset.calc) {
          if (CALC.select(c.dataset.calc, false)) {
            var cb = $("#calc-btn");
            if (cb) {
              cb.classList.remove("is-picked");
              void cb.offsetWidth;
              cb.classList.add("is-picked");
            }
          }
        } else if (hasOption(want)) {
          svc.value = want;
          /* Поле мигає — інакше людина доїде до форми і не помітить,
             що послуга вже обрана. */
          svc.classList.remove("is-picked");
          void svc.offsetWidth;          /* перезапуск анімації */
          svc.classList.add("is-picked");
        }

        /* Опис дописуємо ТІЛЬКИ в порожнє поле: якщо людина вже
           щось набрала, затирати її текст не можна. */
        if (msg && !msg.value.trim()) msg.value = c.textContent.trim();

        /* Фокус у перше поле — лише там, де є справжній курсор.
           На телефоні це миттєво викинуло б клавіатуру на півекрана
           і сховало б форму, до якої ми щойно прокрутили. */
        var fine = window.matchMedia && window.matchMedia("(pointer:fine)").matches;
        if (fine && name) {
          setTimeout(function () { name.focus({ preventScroll: true }); }, 450);
        }
      });
    });

    /* Прибираємо підсвітку, щойно людина сама чіпає список. */
    svc.addEventListener("change", function () { svc.classList.remove("is-picked"); });
  })();


  /* ── 13. Калькулятор орієнтовної ціни ──────────────────
     Людина позначає, що їй треба, і одразу бачить вилку «від–до».
     Це не рахунок, а орієнтир: точну ціну без огляду машини не
     називає жоден чесний сервіс.

     🛑 ПОКИ `calc.confirmed !== true` РОЗДІЛ НІЧОГО НЕ РОБИТЬ.
     Ціни в config.js поставив Claude за типовими британськими
     розцінками — власник їх не називав. Оманлива вказівка ціни в
     Британії карається, тому до звірки на сторінці лишається
     звичайний список послуг, і сторінка виглядає як раніше.

     Список пунктів = послуги з карток вище, ТІ САМІ ключі перекладу.
     Нічого нового не вигадано: калькулятор не може пропонувати
     робіт, яких немає на сайті. */
  var CALC = (function () {
    var cfg  = CFG.calc || {};
    var wrap = $("#calc-wrap");
    var est  = $("#calc-est");
    var api  = { on: false, relang: function () {}, select: function () { return false; }, line: function () { return ""; } };
    if (!wrap || !est || cfg.confirmed !== true) return api;

    var svcWrap = $("#svc-wrap");
    var btn   = $("#calc-btn");
    var panel = $("#calc-list");
    var valEl = $("#calc-val");
    var selEl = $("#calc-sel");
    var sumEl = $("#calc-sum");
    var poaEl = $("#calc-poa");
    var opts  = $$(".pick__opt", panel);
    var P     = cfg.prices || {};
    var cur   = cfg.currency || "£";

    /* Пункт без ціни в таблиці прибираємо з розмітки зовсім.
       Показати послугу й не сказати про неї нічого — гірше, ніж не
       показати: людина вирішить, що це безкоштовно. */
    opts = opts.filter(function (o) {
      if (P[o.dataset.calc]) return true;
      o.parentNode.removeChild(o);
      return false;
    });
    /* Заголовок групи, під яким не лишилось жодного пункту, теж геть. */
    $$(".pick__grp", panel).forEach(function (g) {
      var n = g.nextElementSibling;
      if (!n || !n.classList.contains("pick__opt")) g.parentNode.removeChild(g);
    });
    if (!opts.length) return api;

    wrap.hidden = false;
    /* Старий список ховаємо, але лишаємо в розмітці: вимкнув
       калькулятор у config.js — він одразу на місці. */
    if (svcWrap) svcWrap.hidden = true;

    var picked = [];   // порядок = порядок натискання

    /* Гроші друкуємо через Intl: «1,650», а не «1650». Без
       роздільника чотиризначна сума читається як помилка. */
    var nf = new Intl.NumberFormat("en-GB");
    function money(n) { return cur + nf.format(n); }

    function priceLabel(id) {
      var p = P[id];
      if (!p) return "";
      return p.poa ? t("cal.poaShort") : money(p.from) + "–" + money(p.to);
    }

    function paintPrices() {
      opts.forEach(function (o) {
        var el = $("[data-price]", o);
        if (el) el.textContent = priceLabel(o.dataset.calc);
      });
    }

    function nameOf(id) {
      var o = opts.filter(function (x) { return x.dataset.calc === id; })[0];
      return o ? $(".pick__name", o).textContent.trim() : id;
    }

    function total() {
      var from = 0, to = 0, poa = false;
      picked.forEach(function (id) {
        var p = P[id];
        if (!p) return;
        if (p.poa) { poa = true; return; }
        from += p.from;
        to += p.to;
      });
      return { from: from, to: to, poa: poa, any: from > 0 || to > 0 };
    }

    function clearNode(el) { while (el.firstChild) el.removeChild(el.firstChild); }

    function paint() {
      /* Підпис на кнопці */
      if (!picked.length) {
        valEl.textContent = t("cal.ph");
        valEl.classList.remove("is-set");
      } else {
        valEl.textContent = picked.length + " " + t("cal.sel");
        valEl.classList.add("is-set");
      }

      /* Позначки у списку */
      opts.forEach(function (o) {
        var on = picked.indexOf(o.dataset.calc) > -1;
        o.setAttribute("aria-checked", on ? "true" : "false");
        o.classList.toggle("is-on", on);
      });

      /* Плашки обраного — щоб не відкривати список заради того,
         аби згадати, що ти вибрав. */
      clearNode(selEl);
      picked.forEach(function (id) {
        var li = document.createElement("li");
        var b  = document.createElement("button");
        b.type = "button";
        b.className = "pick__tag";
        b.setAttribute("aria-label", t("cal.drop") + " " + nameOf(id));
        b.appendChild(document.createTextNode(nameOf(id)));
        var x = document.createElement("span");
        x.className = "pick__x";
        x.setAttribute("aria-hidden", "true");
        b.appendChild(x);
        b.addEventListener("click", function () { toggle(id); });
        li.appendChild(b);
        selEl.appendChild(li);
      });

      /* Сума */
      var s = total();
      if (!picked.length) {
        est.hidden = true;
      } else {
        est.hidden = false;
        sumEl.textContent = s.any ? money(s.from) + " – " + money(s.to) : t("cal.poaOnly");
        poaEl.hidden = !(s.poa && s.any);
      }
    }

    function toggle(id) {
      var i = picked.indexOf(id);
      if (i > -1) picked.splice(i, 1);
      else picked.push(id);
      paint();
    }

    function setOpen(open) {
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      wrap.classList.toggle("is-open", open);
    }
    function isOpen() { return btn.getAttribute("aria-expanded") === "true"; }

    btn.addEventListener("click", function () { setOpen(!isOpen()); });

    opts.forEach(function (o, i) {
      o.addEventListener("click", function () { toggle(o.dataset.calc); });
      /* Стрілки ходять по пунктах, Esc закриває і повертає фокус на
         кнопку. Tab теж працює: пункти — звичайні кнопки. */
      o.addEventListener("keydown", function (e) {
        var k = e.key, n = null;
        if (k === "ArrowDown") n = opts[(i + 1) % opts.length];
        else if (k === "ArrowUp") n = opts[(i - 1 + opts.length) % opts.length];
        else if (k === "Home") n = opts[0];
        else if (k === "End") n = opts[opts.length - 1];
        else if (k === "Escape") { setOpen(false); btn.focus(); e.preventDefault(); return; }
        if (n) { n.focus(); e.preventDefault(); }
      });
    });

    btn.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) { setOpen(false); e.preventDefault(); }
      if ((e.key === "ArrowDown" || e.key === "Enter") && !isOpen()) {
        setOpen(true);
        if (opts[0]) opts[0].focus();
        e.preventDefault();
      }
    });

    /* Клік повз список і вихід Tab-ом закривають його — так само,
       як поводиться перемикач мов у шапці. */
    document.addEventListener("click", function (e) {
      if (isOpen() && !wrap.contains(e.target)) setOpen(false);
    });
    wrap.addEventListener("focusout", function (e) {
      if (isOpen() && !wrap.contains(e.relatedTarget)) setOpen(false);
    });

    paintPrices();
    paint();

    api.on = true;
    /* Плашка на картці послуги позначає свій пункт у калькуляторі. */
    api.select = function (id, open) {
      if (!P[id]) return false;
      if (picked.indexOf(id) < 0) picked.push(id);
      paint();
      if (open) setOpen(true);
      return true;
    };
    /* Мову перемкнули: назви пунктів уже перемальовані загальним
       механізмом, лишається перебити ціни, підпис кнопки і плашки. */
    api.relang = function () { paintPrices(); paint(); };
    /* Рядок для заявки: що саме обрано і на яку суму.
       Англійською при будь-якій мові сторінки — його читає сервіс. */
    api.line = function () {
      if (!picked.length) return "";
      var s = total();
      var sum = s.any ? money(s.from) + "–" + money(s.to) : "quote after inspection";
      if (s.poa && s.any) sum += " + quote";
      return picked.map(nameOf).join(", ") + "  (est. " + sum + ")";
    };
    return api;
  })();

  /* ── 12. Згода на куки і рекламний піксель ─────────────
     🔴 Піксель НЕ потрапляє на сторінку, поки людина не натисне
     «Прийняти». Не «завантажується і мовчить» — його фізично немає
     в документі. Інакше весь банер був би декорацією.

     Вибір зберігаємо в localStorage. У приватному вікні звернення
     до нього кидає виняток, тому кожен доступ у try/catch: там
     банер просто питатиме щоразу, і це краще, ніж зламана сторінка. */
  (function () {
    var KEY = "tk-cc";
    var box = $("#cc");
    if (!box) return;

    function read()   { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
    function write(v) { try { localStorage.setItem(KEY, v); }    catch (e) {} }
    function forget() { try { localStorage.removeItem(KEY); }    catch (e) {} }

    /* Сюди піде завантажувач зі сторінки налаштування джерела даних.
       🔴 ПОКИ ПОРОЖНЬО — коду пікселя ще немає. Коли зʼявиться, він
       вставляється САМЕ тут і більше ніде: це єдине місце, куди
       дотягується згода. Вставляти його в <head>, як радить
       інструкція платформи, НЕ МОЖНА — звідти він спрацює до того,
       як людину щось спитали. */
    var loaded = false;
    function loadPixel() {
      if (loaded) return;
      loaded = true;
      var pid = CFG.pixelId;
      if (!pid) return;

      /* --- код зі сторінки налаштування джерела даних ---
         Заглушка складає виклики в чергу і підвантажує SDK асинхронно;
         коли SDK приїде, він цю чергу програє. Тому oaiq() можна
         кликати одразу, не чекаючи завантаження. */
      (function (w, d, s, u) {
        if (w.oaiq) return;
        var q = function () { q.q.push(arguments); };
        q.q = [];
        w.oaiq = q;
        var j = d.createElement(s); j.async = 1; j.src = u;
        var f = d.getElementsByTagName(s)[0];
        f.parentNode.insertBefore(j, f);
      })(window, document, "script", "https://bzrcdn.openai.com/sdk/oaiq.min.js");

      /* 🪤 На сторінці налаштування стоїть debug:true. На живому сайті
         це сипало б службові повідомлення в консоль КОЖНОМУ відвідувачу.
         Лишаємо лише там, де сайт відкривають з локальної машини. */
      var dev = location.hostname === "localhost" || location.hostname === "127.0.0.1";
      window.oaiq("init", { pixelId: pid, debug: dev });
      window.oaiq("measure", "page_viewed", { type: "contents" });
      /* --- кінець коду пікселя --- */
    }

    function hide() { box.hidden = true; }
    function show() { box.hidden = false; }

    var choice = read();
    if (choice === "yes") loadPixel();
    else if (choice !== "no") show();

    var ok = $("#cc-ok"), no = $("#cc-no"), reopen = $("#cc-open");

    if (ok) ok.addEventListener("click", function () {
      write("yes"); hide(); loadPixel();
    });

    if (no) no.addEventListener("click", function () {
      write("no"); hide();
      /* Якщо піксель уже встиг завантажитись у цьому візиті, прибрати
         його з памʼяті сторінки неможливо — перезавантажуємо. Інакше
         «Відмовитись» була б кнопкою, яка нічого не робить. */
      if (loaded) location.reload();
    });

    /* Відкликати згоду мусить бути так само легко, як її дати —
       тому кнопка стоїть у підвалі, а не схована десь у тексті. */
    if (reopen) reopen.addEventListener("click", function () {
      forget(); show();
      if (ok) ok.focus();
    });
  })();

  /* ── 9. Рік у підвалі ─────────────────────────────────── */
  var yr = $("#yr");
  if (yr) yr.textContent = new Date().getFullYear();
})();
