/* ═══════════════════════════════════════════════════════════════════
   ШАР ДОСТУПУ ДО ДАНИХ

   🔴 Це єдине місце, яке знає, ЗВІДКИ беруться дані.
   Решта застосунку працює тільки через TK.db і не здогадується,
   що зараз під ним фальшивка.

   Коли зʼявиться Supabase, міняється ТІЛЬКИ цей файл: кожна функція
   стає запитом. Екрани не чіпаються взагалі. Саме заради цього шар
   і відокремлений — інакше запити розповзлися б по всьому інтерфейсу
   і переїзд означав би переписати все.

   Усі функції async навмисно, хоч зараз і повертають миттєво:
   з базою вони стануть справді асинхронними, і викликаючий код
   не доведеться переписувати.
   ═══════════════════════════════════════════════════════════════════ */
window.TK = window.TK || {};

TK.db = (function () {
  'use strict';

  const m = TK.mock;
  let currentUserId = 's1';           // хто «залогінений»

  const clientById  = (id) => m.clients.find(c => c.id === id);
  const vehicleById = (id) => m.vehicles.find(v => v.id === id);

  /* ── ПРАВА ──────────────────────────────────────────────────────
     ⚠️ Це НЕ захист. Це лише те, що малювати на екрані.
     Справжній захист — правила RLS у базі (crm/migrations/0003_rls.sql),
     перевірені злим тестом. Приховати колонку в браузері нічого не
     захищає: дані вже приїхали, і їх видно за десять секунд. */
  const CAN = {
    owner:    { money: true,  clients: true,  commissions: true,  settings: true },
    manager:  { money: true,  clients: true,  commissions: false, settings: false },
    mechanic: { money: true,  clients: true,  commissions: false, settings: false },
    partner:  { money: false, clients: false, commissions: true,  settings: false }
  };

  function me() { return m.staff.find(s => s.id === currentUserId); }
  function can(what) { return !!CAN[me().role][what]; }

  /* ── ПРАВИЛО НАРАХУВАННЯ ─────────────────────────────────────────
     Дослівно те саме, що в тригері apply_commission (0002_logic.sql).
     🪤 Якщо тут і там розійдеться — цифри в інтерфейсі перестануть
     збігатися з базою. Міняєш одне — міняй друге. */
  function commissionFor(job) {
    const c = clientById(job.client);
    const s = m.settings;
    const total = job.labour + job.parts;
    const base = { job, total, amount: 0, status: 'excluded', reason: null };

    if (c.pre_existing)                       return { ...base, reason: 'pre_existing' };
    if (!['website', 'phone_ad', 'instagram'].includes(c.source))
                                              return { ...base, reason: 'not_our_source' };
    if (!c.expires || job.done > c.expires)   return { ...base, reason: 'window_expired' };
    if (total < s.threshold_gbp)              return { ...base, reason: 'below_threshold' };

    const amount = Math.round((job.labour * s.rate_labour + job.parts * s.rate_parts) * 100) / 100;
    return { ...base, amount, status: 'due', reason: null };
  }

  const wait = (v) => Promise.resolve(v);

  return {
    /* ── хто працює ── */
    me,
    can,
    staff: () => m.staff,
    switchUser(id) { currentUserId = id; },

    settings: () => m.settings,

    /* ── сьогодні ── */
    async today() {
      return wait(m.bookings.map(b => ({
        ...b,
        clientRef: clientById(b.client),
        vehicleRef: vehicleById(b.vehicle)
      })));
    },

    async newEnquiries() {
      return wait(m.enquiries.filter(e => e.status === 'new'));
    },

    async todayStats() {
      const list = m.bookings;
      const fromSite = list.filter(b => {
        const c = clientById(b.client);
        return ['website', 'phone_ad', 'instagram'].includes(c.source);
      }).length;
      return wait({
        booked: list.length,
        inShop: list.filter(b => b.status === 'in_progress').length,
        waiting: list.filter(b => b.status === 'waiting_parts').length,
        fromSite
      });
    },

    /* ── клієнти ── */
    async clients(query) {
      let list = m.clients.slice();
      if (query) {
        const q = query.toLowerCase().replace(/\s+/g, '');
        list = list.filter(c =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.phone.replace(/\s+/g, '').includes(q) ||
          m.vehicles.some(v => v.client === c.id &&
            v.reg.toLowerCase().replace(/\s+/g, '').includes(q))
        );
      }
      return wait(list.map(c => ({
        ...c,
        vehicles: m.vehicles.filter(v => v.client === c.id),
        visits: m.jobs.filter(j => j.client === c.id).length
      })));
    },

    async client(id) {
      const c = clientById(id);
      if (!c) return wait(null);
      const jobs = m.jobs
        .filter(j => j.client === id)
        .sort((a, b) => b.done.localeCompare(a.done))
        .map(j => ({ ...j, commission: commissionFor(j) }));

      return wait({
        ...c,
        vehicles: m.vehicles.filter(v => v.client === id),
        jobs,
        audit: m.audit.filter(a => a.entity === id),
        totals: jobs.reduce((acc, j) => ({
          labour: acc.labour + j.labour,
          parts: acc.parts + j.parts,
          total: acc.total + j.labour + j.parts,
          commission: acc.commission + j.commission.amount
        }), { labour: 0, parts: 0, total: 0, commission: 0 })
      });
    },

    /* ── звіт ── */
    async report(period) {
      const rows = m.jobs
        .filter(j => j.done.slice(0, 7) === period)
        .map(j => {
          const c = clientById(j.client);
          const cm = commissionFor(j);
          return {
            ...j,
            clientRef: c,
            vehicleRef: vehicleById(j.vehicle),
            // 🔴 партнер бачить ініціали й три цифри — не імʼя.
            // У базі це робить окреме подання partner_report.
            display: this.can('clients')
              ? c.name
              : c.name.split(' ').map(w => w[0].toUpperCase()).join('.') +
                ' · …' + c.phone.slice(-3),
            commission: cm
          };
        })
        .sort((a, b) => b.done.localeCompare(a.done));

      const counted = rows.filter(r => r.commission.status === 'due');
      const excluded = rows.filter(r => r.commission.status === 'excluded');
      const tally = (reason) => excluded.filter(r => r.commission.reason === reason).length;

      return wait({
        period, rows,
        clients: new Set(counted.map(r => r.client)).size,
        labour: counted.reduce((s, r) => s + r.labour, 0),
        parts: counted.reduce((s, r) => s + r.parts, 0),
        revenue: counted.reduce((s, r) => s + r.labour + r.parts, 0),
        commission: Math.round(counted.reduce((s, r) => s + r.commission.amount, 0) * 100) / 100,
        totalJobs: rows.length,
        excluded: {
          below_threshold: tally('below_threshold'),
          pre_existing:    tally('pre_existing'),
          window_expired:  tally('window_expired'),
          not_our_source:  tally('not_our_source')
        }
      });
    },

    /* Місяці, у яких взагалі є роботи — для перемикача періодів. */
    async periods() {
      const set = new Set(m.jobs.map(j => j.done.slice(0, 7)));
      return wait([...set].sort().reverse());
    },

    /* Комісія по місяцях — для стовпчиків у звіті. */
    async commissionByMonth(count) {
      const out = [];
      const now = new Date();
      for (let i = count - 1; i >= 0; i--) {
        const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = dt.toISOString().slice(0, 7);
        const sum = m.jobs
          .filter(j => j.done.slice(0, 7) === key)
          .map(commissionFor)
          .reduce((s, c) => s + c.amount, 0);
        out.push({ period: key, month: dt.getMonth(), amount: Math.round(sum * 100) / 100 });
      }
      return wait(out);
    },

    /* ── дія: закрити роботу ─────────────────────────────────────
       Механік вводить лише роботу й запчастини. Комісію не бачить
       і ввести не може — її рахує система. */
    async closeJob(bookingId, labour, parts, pay) {
      const b = m.bookings.find(x => x.id === bookingId);
      if (!b) throw new Error('Запис не знайдено');
      const job = {
        id: 'j' + (m.jobs.length + 1),
        client: b.client, vehicle: b.vehicle,
        done: new Date().toISOString().slice(0, 10),
        labour: Number(labour) || 0,
        parts: Number(parts) || 0,
        desc: b.job, pay: pay || 'card'
      };
      m.jobs.push(job);
      b.status = 'collected';
      return wait(job);
    },

    /* ── дія: заявка з сайту → клієнт + запис ───────────────────
       Один клік. Джерело 'website' проставляється САМО — саме тому
       його не забудуть, і саме тому атрибуція взагалі працює. */
    async bookEnquiry(enquiryId) {
      const e = m.enquiries.find(x => x.id === enquiryId);
      if (!e) throw new Error('Заявку не знайдено');

      let c = m.clients.find(x => x.phone === e.phone);
      if (!c) {
        const now = new Date();
        const exp = new Date(now); exp.setMonth(exp.getMonth() + m.settings.window_months);
        c = {
          id: 'c' + (m.clients.length + 1),
          name: e.name, phone: e.phone, postcode: '',
          source: 'website',
          attributed: now.toISOString().slice(0, 10),
          expires: exp.toISOString().slice(0, 10),
          pre_existing: false
        };
        m.clients.push(c);
        m.audit.push({
          at: new Date(), entity: c.id, actor: null, field: 'source',
          from: null, to: 'website',
          note: { ua: 'автоматично — форма на сайті', en: 'automatically — enquiry form' }
        });
      }
      e.status = 'booked';
      return wait(c);
    },

    /* Довідка: чи ставки взагалі узгоджені. Поки ні — інтерфейс
       чесно про це попереджає, а не вдає, що цифри справжні. */
    ratesAgreed: () => m.settings.agreed
  };
})();
