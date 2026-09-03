/**
 * ═══════════════════════════════════════════════════════════
 * Cloudflare Worker — міст між формою на сайті і Telegram.
 *
 * НАВІЩО ВІН ПОТРІБЕН
 * GitHub Pages віддає лише статичні файли — сервера там немає.
 * Щоб надіслати щось у Telegram, потрібен токен бота. Якщо покласти
 * токен у код сайту, його прочитає будь-хто (репозиторій публічний,
 * та й увесь JavaScript видно у браузері). Тому токен живе ТУТ,
 * у секретах Cloudflare, і сайт його ніколи не бачить.
 *
 * СЕКРЕТИ (задаються в Cloudflare, НЕ в цьому файлі):
 *   TELEGRAM_TOKEN   — токен бота від @BotFather
 *   TELEGRAM_CHAT    — id чату, куди слати заявки
 *   ALLOWED_ORIGIN   — адреса сайту, напр. https://volodymyr221.github.io
 * ═══════════════════════════════════════════════════════════ */

const LIMIT_PER_MINUTE = 5;
const hits = new Map(); // проста пам'ять у межах одного інстансу

function cors(env, extra = {}) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    ...extra
  };
}

function json(body, status, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: cors(env, { "Content-Type": "application/json" })
  });
}

/** Обрізає поле і прибирає символи, якими можна зламати розмітку Telegram. */
function clean(value, max) {
  return String(value == null ? "" : value)
    .replace(/[<>&]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.start > 60000) {
    hits.set(ip, { start: now, n: 1 });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  rec.n += 1;
  return rec.n > LIMIT_PER_MINUTE;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(env) });
    }
    if (request.method !== "POST") {
      return json({ error: "method not allowed" }, 405, env);
    }

    // приймаємо тільки зі свого сайту
    const origin = request.headers.get("Origin") || "";
    if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) {
      return json({ error: "forbidden" }, 403, env);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (rateLimited(ip)) {
      return json({ error: "too many requests" }, 429, env);
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return json({ error: "bad json" }, 400, env);
    }

    // пастка для ботів
    if (data.website) return json({ ok: true }, 200, env);

    const name = clean(data.name, 80);
    const phone = clean(data.phone, 32);
    if (name.length < 2 || phone.replace(/\D/g, "").length < 9) {
      return json({ error: "validation" }, 422, env);
    }

    const car = clean(data.car, 60);
    const service = clean(data.service, 60);
    const message = clean(data.message, 1200);
    const lang = clean(data.lang, 4);

    const text = [
      "🔧 Нова заявка з сайту",
      "",
      `👤 Імʼя: ${name}`,
      `📞 Телефон: ${phone}`,
      car ? `🚗 Авто: ${car}` : null,
      service ? `🛠 Послуга: ${service}` : null,
      message ? `💬 Опис: ${message}` : null,
      "",
      `🌐 Мова сторінки: ${lang || "en"}`
    ]
      .filter(Boolean)
      .join("\n");

    const tg = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT,
          text,
          disable_web_page_preview: true
        })
      }
    );

    if (!tg.ok) {
      return json({ error: "telegram failed" }, 502, env);
    }
    return json({ ok: true }, 200, env);
  }
};
