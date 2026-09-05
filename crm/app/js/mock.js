/* ═══════════════════════════════════════════════════════════════════
   ФАЛЬШИВІ ДАНІ — рівно ті самі люди, що в crm/migrations/0004_seed_dev.sql

   🛑 Жодного реального британця. Телефони з діапазону 07700 900xxx,
   який Ofcom тримає саме для вигаданих номерів у фільмах і прикладах.

   Навіщо це існує: щоб робити інтерфейс, не чекаючи, поки власники СТО
   заведуть пошту й базу. Коли база зʼявиться, зміниться ТІЛЬКИ data.js —
   цей файл просто перестане використовуватись.
   ═══════════════════════════════════════════════════════════════════ */
window.TK = window.TK || {};

TK.mock = (function () {
  'use strict';

  // Дати рахуються від сьогодні, тому дані завжди свіжі.
  const DAY = 86400000;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = (offset) => new Date(today.getTime() + offset * DAY);
  const iso = (dt) => dt.toISOString().slice(0, 10);
  const at = (h, m) => { const x = new Date(today); x.setHours(h, m, 0, 0); return x; };

  // ── Налаштування ─────────────────────────────────────────────────
  // 🔴 Цифри — ПРИПУЩЕННЯ, не домовленість. Вова з Дімою ще вирішують.
  const settings = {
    business_name: 'T&K Performance',
    launch_date: iso(d(-90)),
    currency: '£',
    rate_labour: 0.10,
    rate_parts: 0.04,
    threshold_gbp: 150,
    window_months: 12,
    agreed: false          // ← поки false, інтерфейс показує попередження
  };

  // ── Працівники ───────────────────────────────────────────────────
  const staff = [
    // Мова в кожного своя. Власник тут україномовний — головна мова
    // системи українська; англійську видно кнопкою в лівій колонці.
    { id: 's1', name: 'Tom Keane',       role: 'owner',    lang: 'ua', initials: 'TK' },
    { id: 's2', name: 'Kateryna Bondar', role: 'manager',  lang: 'ua', initials: 'KB' },
    { id: 's3', name: 'Andriy Melnyk',   role: 'mechanic', lang: 'ua', initials: 'AM' },
    { id: 's4', name: 'Вова',            role: 'partner',  lang: 'ua', initials: 'В' }
  ];

  // ── Клієнти ──────────────────────────────────────────────────────
  const clients = [
    { id: 'c1', name: 'James Whitlock', phone: '+447700900318', postcode: 'PO21 1AA',
      source: 'website',   attributed: iso(d(-60)),  expires: iso(d(305)), pre_existing: false },
    { id: 'c2', name: 'Callum Reid',    phone: '+447700900204', postcode: 'PO22 9SX',
      source: 'website',   attributed: iso(d(-45)),  expires: iso(d(320)), pre_existing: false },
    { id: 'c3', name: 'Hannah Brooks',  phone: '+447700900142', postcode: 'PO19 3BB',
      source: 'website',   attributed: iso(d(-30)),  expires: iso(d(335)), pre_existing: false },
    { id: 'c4', name: 'Ivan Petrenko',  phone: '+447700900771', postcode: 'PO21 5CD',
      source: 'website',   attributed: iso(d(-10)),  expires: iso(d(355)), pre_existing: false },
    { id: 'c5', name: 'Sophie Adams',   phone: '+447700900655', postcode: 'PO20 7EF',
      source: 'instagram', attributed: iso(d(-20)),  expires: iso(d(345)), pre_existing: false },
    { id: 'c6', name: 'Daniel Okafor',  phone: '+447700900983', postcode: 'PO22 6GH',
      source: 'website',   attributed: iso(d(0)),    expires: iso(d(365)), pre_existing: false },
    { id: 'c7', name: 'Priya Sandhu',   phone: '+447700900511', postcode: 'PO21 2JK',
      source: 'walk_in',   attributed: null, expires: null, pre_existing: false },
    { id: 'c8', name: 'Marek Nowak',    phone: '+447700900037', postcode: 'PO18 8LM',
      source: 'referral',  attributed: null, expires: null, pre_existing: false },
    { id: 'c9', name: 'Robert Fenn',    phone: '+447700900420', postcode: 'PO22 4NP',
      source: 'walk_in',   attributed: null, expires: null, pre_existing: true },
    { id: 'c10', name: 'Gemma Hollis',  phone: '+447700900866', postcode: 'PO19 6QR',
      source: 'website',   attributed: iso(d(-400)), expires: iso(d(-35)), pre_existing: false }
  ];

  // ── Авто ─────────────────────────────────────────────────────────
  const vehicles = [
    { id: 'v1',  client: 'c1',  reg: 'AB12 CDE', model: '320d Sport',   series: 'F30', engine: 'N47', year: 2014, mileage: 118000, mot: iso(d(190)) },
    { id: 'v2',  client: 'c1',  reg: 'SP08 MXR', model: '325i Touring', series: 'E91', engine: 'N53', year: 2008, mileage: 141000, mot: iso(d(331)) },
    { id: 'v3',  client: 'c2',  reg: 'YR11 HNP', model: '335i',         series: 'E92', engine: 'N55', year: 2011, mileage:  96000, mot: iso(d(44)) },
    { id: 'v4',  client: 'c3',  reg: 'KX63 TLD', model: '520d',         series: 'F10', engine: 'N47', year: 2013, mileage: 132000, mot: iso(d(9)) },
    { id: 'v5',  client: 'c4',  reg: 'WD16 PYU', model: '330d Touring', series: 'F31', engine: 'N57', year: 2016, mileage: 104000, mot: iso(d(260)) },
    { id: 'v6',  client: 'c5',  reg: 'OU17 BZA', model: 'M140i',        series: 'F21', engine: 'B58', year: 2017, mileage:  61000, mot: iso(d(120)) },
    { id: 'v7',  client: 'c6',  reg: 'GK15 VTC', model: '330d',         series: 'F31', engine: 'N57', year: 2015, mileage: 121000, mot: iso(d(75)) },
    { id: 'v8',  client: 'c7',  reg: 'LV65 KRT', model: '118i',         series: 'F20', engine: 'B38', year: 2016, mileage:  73000, mot: iso(d(210)) },
    { id: 'v9',  client: 'c8',  reg: 'RE19 OWD', model: '520d',         series: 'G30', engine: 'B47', year: 2019, mileage:  58000, mot: iso(d(15)) },
    { id: 'v10', client: 'c9',  reg: 'HY60 EJW', model: 'X5 30d',       series: 'E70', engine: 'M57', year: 2010, mileage: 178000, mot: iso(d(88)) },
    { id: 'v11', client: 'c10', reg: 'MT14 ZQS', model: '116d',         series: 'F20', engine: 'N47', year: 2014, mileage:  99000, mot: iso(d(33)) }
  ];

  // ── Заявки з сайту ───────────────────────────────────────────────
  // 🔴 message лежить дослівно, англійською. Не перекладається.
  const enquiries = [
    { id: 'e1', name: 'Daniel Okafor', phone: '+447700900983', at: at(9, 12),
      message: 'Hi, 330d F31, turbo actuator error P0299. Can you look at it this week?',
      vehicle: '330d F31 2015', status: 'new',
      utm: { source: 'google', campaign: 'engine-repair-bognor' } },
    { id: 'e2', name: 'Hannah Brooks', phone: '+447700900142', at: new Date(today.getTime() - DAY + 17.6 * 3600000),
      message: 'MOT due on the 14th, and there is a knock over bumps at the front. Saturday morning any good?',
      vehicle: '520d F10', status: 'new',
      utm: { source: 'google', campaign: 'mot-bognor' } },
    { id: 'e3', name: 'Ivan Petrenko', phone: '+447700900771', at: new Date(today.getTime() - 2 * DAY + 14 * 3600000),
      message: 'N47 timing chain — do you do this job? Rough price? Car is a 2016 330d.',
      vehicle: '330d F31', status: 'new',
      utm: { source: 'instagram', campaign: 'engine-rebuild' } }
  ];

  // ── Записи на сьогодні ───────────────────────────────────────────
  const bookings = [
    { id: 'b1', client: 'c1', vehicle: 'v1', from: at(8, 30),  to: at(10, 0),
      job: { ua: 'MOT + повне ТО', en: 'MOT + full service' }, status: 'in_progress', bay: 1 },
    { id: 'b2', client: 'c7', vehicle: 'v8', from: at(9, 15),  to: at(10, 15),
      job: { ua: 'Горить чек — діагностика', en: 'Engine light — diagnostics' }, status: 'in_progress', bay: 2 },
    { id: 'b3', client: 'c2', vehicle: 'v3', from: at(10, 0),  to: at(12, 0),
      job: { ua: 'N55 — стукіт вейстгейта', en: 'N55 wastegate rattle' }, status: 'waiting_parts', bay: 3 },
    { id: 'b4', client: 'c8', vehicle: 'v9', from: at(11, 30), to: at(12, 15),
      job: { ua: 'Заміна оливи й фільтрів', en: 'Oil & filter service' }, status: 'booked', bay: 1 },
    { id: 'b5', client: 'c5', vehicle: 'v6', from: at(12, 0),  to: at(13, 0),
      job: { ua: 'Передні колодки + гальмівна рідина', en: 'Front pads + brake fluid' }, status: 'booked', bay: 2 },
    { id: 'b6', client: 'c6', vehicle: 'v7', from: at(12, 30), to: at(14, 30),
      job: { ua: 'Заміна актуатора турбіни', en: 'Turbo actuator replacement' }, status: 'booked', bay: 3 }
  ];

  // ── Виконані роботи ──────────────────────────────────────────────
  // Комісії тут НЕ вказані — їх рахує data.js тим самим правилом,
  // що й тригер у базі. Набір підібраний так, щоб спрацював КОЖЕН
  // вид виключення: інакше панель «Що НЕ рахували» не перевіриш.
  const jobs = [
    { id: 'j1',  client: 'c1',  vehicle: 'v1',  done: iso(d(-55)), labour: 180,  parts: 95,
      desc: { ua: 'MOT + повне ТО', en: 'MOT + full service' }, pay: 'card' },
    { id: 'j2',  client: 'c1',  vehicle: 'v1',  done: iso(d(-20)), labour: 210,  parts: 340,
      desc: { ua: 'Передні диски й колодки', en: 'Front discs & pads' }, pay: 'card' },
    { id: 'j3',  client: 'c1',  vehicle: 'v2',  done: iso(d(-3)),  labour: 960,  parts: 720,
      desc: { ua: 'N47 — ланцюг ГРМ', en: 'N47 timing chain' }, pay: 'transfer' },
    { id: 'j4',  client: 'c2',  vehicle: 'v3',  done: iso(d(-12)), labour: 420,  parts: 610,
      desc: { ua: 'N55 — вейстгейт', en: 'N55 wastegate' }, pay: 'card' },
    { id: 'j5',  client: 'c3',  vehicle: 'v4',  done: iso(d(-8)),  labour: 340,  parts: 285,
      desc: { ua: 'MOT + важелі підвіски', en: 'MOT + suspension arms' }, pay: 'card' },
    { id: 'j6',  client: 'c4',  vehicle: 'v5',  done: iso(d(-5)),  labour: 1020, parts: 880,
      desc: { ua: 'N57 — ланцюг + оливний насос', en: 'N57 chain + oil pump' }, pay: 'transfer' },
    { id: 'j7',  client: 'c5',  vehicle: 'v6',  done: iso(d(-14)), labour: 160,  parts: 210,
      desc: { ua: 'Гальмівна рідина + колодки', en: 'Brake fluid + pads' }, pay: 'card' },
    // ── нижче порогу ──
    { id: 'j8',  client: 'c3',  vehicle: 'v4',  done: iso(d(-2)),  labour: 40,   parts: 55,
      desc: { ua: 'Щітки + долив рідин', en: 'Wiper blades + top-up' }, pay: 'cash' },
    // ── джерело не наше ──
    { id: 'j9',  client: 'c7',  vehicle: 'v8',  done: iso(d(-9)),  labour: 90,   parts: 140,
      desc: { ua: 'Діагностика + котушка', en: 'Diagnostics + coil pack' }, pay: 'card' },
    { id: 'j10', client: 'c8',  vehicle: 'v9',  done: iso(d(-6)),  labour: 120,  parts: 95,
      desc: { ua: 'Заміна оливи й фільтрів', en: 'Oil & filter service' }, pay: 'cash' },
    // ── був у базі до запуску реклами ──
    { id: 'j11', client: 'c9',  vehicle: 'v10', done: iso(d(-4)),  labour: 780,  parts: 1150,
      desc: { ua: 'M57 — турбіна + патрубки', en: 'M57 turbo + intercooler pipes' }, pay: 'transfer' },
    // ── вікно вийшло ──
    { id: 'j12', client: 'c10', vehicle: 'v11', done: iso(d(-1)),  labour: 640,  parts: 520,
      desc: { ua: 'Зчеплення й маховик', en: 'Clutch & flywheel' }, pay: 'card' }
  ];

  // ── Журнал змін ──────────────────────────────────────────────────
  const audit = [
    { at: new Date(today.getTime() - 60 * DAY + 9.2 * 3600000), entity: 'c1',
      actor: null, field: 'source', from: null, to: 'website',
      note: { ua: 'автоматично — форма на сайті', en: 'automatically — enquiry form' } },
    { at: new Date(today.getTime() - 60 * DAY + 9.7 * 3600000), entity: 'c1',
      actor: 'Tom Keane', field: 'booked', from: null, to: null,
      note: { ua: 'записав із заявки №1042', en: 'booked in from enquiry #1042' } }
  ];

  return { settings, staff, clients, vehicles, enquiries, bookings, jobs, audit };
})();
