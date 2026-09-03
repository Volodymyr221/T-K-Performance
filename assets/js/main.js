/* ═══════════════════════════════════════════════════════════
   T&K Performance — поведінка сторінки
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var CFG  = window.TK   || {};
  var DICT = window.I18N || {};
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── 1. Мова ───────────────────────────────────────────── */
  var LS_KEY = "tk-lang";
  var lang = "en";

  function t(key) {
    var pack = DICT[lang] || DICT.en || {};
    return pack[key] || (DICT.en && DICT.en[key]) || key;
  }

  function applyLang(next) {
    if (!DICT[next]) return;
    lang = next;
    document.documentElement.lang = next === "uk" ? "uk" : "en";

    $$("[data-i18n]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n"));
      if (v) el.textContent = v;
    });
    $$("[data-ph]").forEach(function (el) {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.placeholder = t(el.getAttribute("data-ph"));
      }
    });

    $$(".lang button").forEach(function (b) {
      var on = b.dataset.lang === next;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });

    try { localStorage.setItem(LS_KEY, next); } catch (e) {}
    paintHours();
  }

  (function initLang() {
    var saved = null;
    try { saved = localStorage.getItem(LS_KEY); } catch (e) {}
    if (!saved) {
      var nav = (navigator.language || "en").toLowerCase();
      saved = nav.indexOf("uk") === 0 || nav.indexOf("ru") === 0 ? "uk" : "en";
    }
    $$(".lang button").forEach(function (b) {
      b.addEventListener("click", function () { applyLang(b.dataset.lang); });
    });
    if (saved !== "en") applyLang(saved);
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

  [nameEl, phoneEl].forEach(function (el) {
    el.addEventListener("input", function () { setErr(el, null); });
  });

  function validate() {
    var ok = true;
    if (nameEl.value.trim().length < 2) { setErr(nameEl, "f.errName"); ok = false; }
    else setErr(nameEl, null);

    var digits = phoneEl.value.replace(/\D/g, "");
    if (digits.length < 9) { setErr(phoneEl, "f.errPhone"); ok = false; }
    else setErr(phoneEl, null);

    return ok;
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

    if (!CFG.formEndpoint) { say("f.offline", false); return; }

    var data = {
      name:    nameEl.value.trim(),
      phone:   phoneEl.value.trim(),
      car:     $("#f-car").value.trim(),
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

  /* ── 7. Рік у підвалі ──────────────────────────────────── */
  var yr = $("#yr");
  if (yr) yr.textContent = new Date().getFullYear();
})();
