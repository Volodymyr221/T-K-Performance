-- ═══════════════════════════════════════════════════════════════════
--  T&K Performance CRM · 0004 — дані для ТЕСТОВОЇ бази
--
--  🛑 НІКОЛИ НЕ ЗАПУСКАТИ НА БОЙОВІЙ БАЗІ.
--
--  Тут вигадані люди: жодного реального британця, жодного справжнього
--  номерного знака. Саме тому тестову базу можна тримати на будь-якій
--  пошті вже сьогодні — UK GDPR її не стосується, бо персональних
--  даних у ній немає.
--
--  Дати рахуються від сьогодні, тому дані завжди виглядають свіжими.
--
--  Цей файл ще й перевіряє логіку: комісії ніхто тут не вставляє
--  руками — їх має нарахувати тригер із 0002. Якщо після запуску
--  таблиця commissions порожня, значить логіка не працює.
-- ═══════════════════════════════════════════════════════════════════

begin;

-- ═══ Налаштування ══════════════════════════════════════════════════
-- 🔴 Цифри — ПРИПУЩЕННЯ, не домовленість. Вова з Дімою ще вирішують.

update app_settings set
  launch_date = current_date - 90,
  updated_at  = now()
where id;

insert into commission_settings
  (id, effective_from, rate_labour, rate_parts, threshold_gbp, window_months, note)
values
  ('c0000000-0000-4000-8000-000000000001',
   current_date - 90, 0.1000, 0.0400, 150.00, 12,
   'ПРИПУЩЕННЯ Claude, не узгоджено. 10% з роботи, 4% із запчастин, поріг £150, вікно 12 міс.');

-- ═══ Працівники ════════════════════════════════════════════════════
-- Імена вигадані. auth_user_id порожні: логінів ще немає.

insert into staff (id, full_name, email, role, lang) values
  ('50000000-0000-4000-8000-000000000001', 'Tom Keane',      'tom@example.invalid',      'owner',    'en'),
  ('50000000-0000-4000-8000-000000000002', 'Kateryna Bondar','kateryna@example.invalid', 'manager',  'ua'),
  ('50000000-0000-4000-8000-000000000003', 'Andriy Melnyk',  'andriy@example.invalid',   'mechanic', 'ua'),
  ('50000000-0000-4000-8000-000000000004', 'Vova',           'vova@example.invalid',     'partner',  'ua'),
  ('50000000-0000-4000-8000-000000000005', 'Dima',           'dima@example.invalid',     'partner',  'ua');

-- ═══ Клієнти ═══════════════════════════════════════════════════════
-- Телефони — з діапазону 07700 900xxx, який Ofcom тримає саме для
-- вигаданих номерів у фільмах і прикладах. Реальному абоненту
-- подзвонити неможливо.

insert into clients
  (id, full_name, phone_raw, source, attributed_at, pre_existing, postcode, created_at)
values
  -- ── наші, вікно відкрите ──
  ('c1000000-0000-4000-8000-000000000001', 'James Whitlock', '07700 900318',
   'website',   current_date - 60, false, 'PO21 1AA', now() - interval '60 days'),

  ('c1000000-0000-4000-8000-000000000002', 'Callum Reid', '07700 900204',
   'website',   current_date - 45, false, 'PO22 9SX', now() - interval '45 days'),

  ('c1000000-0000-4000-8000-000000000003', 'Hannah Brooks', '07700 900142',
   'website',   current_date - 30, false, 'PO19 3BB', now() - interval '30 days'),

  ('c1000000-0000-4000-8000-000000000004', 'Ivan Petrenko', '07700 900771',
   'website',   current_date - 10, false, 'PO21 5CD', now() - interval '10 days'),

  ('c1000000-0000-4000-8000-000000000005', 'Sophie Adams', '07700 900655',
   'instagram', current_date - 20, false, 'PO20 7EF', now() - interval '20 days'),

  ('c1000000-0000-4000-8000-000000000006', 'Daniel Okafor', '07700 900983',
   'website',   current_date,      false, 'PO22 6GH', now()),

  -- ── не наші: джерело чуже ──
  ('c1000000-0000-4000-8000-000000000007', 'Priya Sandhu', '07700 900511',
   'walk_in',   null, false, 'PO21 2JK', now() - interval '25 days'),

  ('c1000000-0000-4000-8000-000000000008', 'Marek Nowak', '07700 900037',
   'referral',  null, false, 'PO18 8LM', now() - interval '15 days'),

  -- ── був у базі ДО запуску реклами: ніколи не дасть комісії ──
  ('c1000000-0000-4000-8000-000000000009', 'Robert Fenn', '07700 900420',
   'walk_in',   null, true,  'PO22 4NP', now() - interval '400 days'),

  -- ── вікно вийшло: прийшов з сайту, але понад рік тому ──
  ('c1000000-0000-4000-8000-00000000000a', 'Gemma Hollis', '07700 900866',
   'website',   current_date - 400, false, 'PO19 6QR', now() - interval '400 days');

-- ═══ Авто ══════════════════════════════════════════════════════════
-- Номери у форматі британських, але вигадані.

insert into vehicles
  (id, client_id, reg, make, model, series_code, engine_code, year, mileage, mot_due)
values
  ('be000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001',
   'AB12 CDE', 'BMW', '320d Sport',    'F30', 'N47', 2014, 118000, current_date + 190),
  ('be000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001',
   'SP08 MXR', 'BMW', '325i Touring',  'E91', 'N53', 2008, 141000, current_date + 331),
  ('be000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000002',
   'YR11 HNP', 'BMW', '335i',          'E92', 'N55', 2011,  96000, current_date + 44),
  ('be000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000003',
   'KX63 TLD', 'BMW', '520d',          'F10', 'N47', 2013, 132000, current_date + 9),
  ('be000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000004',
   'WD16 PYU', 'BMW', '330d Touring',  'F31', 'N57', 2016, 104000, current_date + 260),
  ('be000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000005',
   'OU17 BZA', 'BMW', 'M140i',         'F21', 'B58', 2017,  61000, current_date + 120),
  ('be000000-0000-4000-8000-000000000007', 'c1000000-0000-4000-8000-000000000006',
   'GK15 VTC', 'BMW', '330d',          'F31', 'N57', 2015, 121000, current_date + 75),
  ('be000000-0000-4000-8000-000000000008', 'c1000000-0000-4000-8000-000000000007',
   'LV65 KRT', 'BMW', '118i',          'F20', 'B38', 2016,  73000, current_date + 210),
  ('be000000-0000-4000-8000-000000000009', 'c1000000-0000-4000-8000-000000000008',
   'RE19 OWD', 'BMW', '520d',          'G30', 'B47', 2019,  58000, current_date + 15),
  ('be000000-0000-4000-8000-00000000000a', 'c1000000-0000-4000-8000-000000000009',
   'HY60 EJW', 'BMW', 'X5 30d',        'E70', 'M57', 2010, 178000, current_date + 88),
  ('be000000-0000-4000-8000-00000000000b', 'c1000000-0000-4000-8000-00000000000a',
   'MT14 ZQS', 'BMW', '116d',          'F20', 'N47', 2014,  99000, current_date + 33);

-- ═══ Заявки з сайту ════════════════════════════════════════════════
-- 🔴 message лежить дослівно, англійською, як написав клієнт.
-- Механік має бачити його слова, а не наш переказ.

insert into enquiries
  (id, name, phone_raw, email, message, vehicle_text, source, utm, page_url, status, created_at)
values
  ('e0000000-0000-4000-8000-000000000001', 'Daniel Okafor', '07700 900983',
   'd.okafor@example.invalid',
   'Hi, 330d F31, turbo actuator error P0299. Can you look at it this week?',
   '330d F31 2015', 'website',
   '{"utm_source":"google","utm_medium":"cpc","utm_campaign":"engine-repair-bognor"}'::jsonb,
   'https://volodymyr221.github.io/T-K-Performance/#contact', 'new', now() - interval '2 hours'),

  ('e0000000-0000-4000-8000-000000000002', 'Hannah Brooks', '07700 900142',
   null,
   'MOT due on the 14th, and there is a knock over bumps at the front. Saturday morning any good?',
   '520d F10', 'website',
   '{"utm_source":"google","utm_medium":"cpc","utm_campaign":"mot-bognor"}'::jsonb,
   'https://volodymyr221.github.io/T-K-Performance/#contact', 'new', now() - interval '1 day'),

  ('e0000000-0000-4000-8000-000000000003', 'Ivan Petrenko', '07700 900771',
   'ivan.p@example.invalid',
   'N47 timing chain — do you do this job? Rough price? Car is a 2016 330d.',
   '330d F31', 'website',
   '{"utm_source":"instagram","utm_medium":"social","utm_campaign":"engine-rebuild"}'::jsonb,
   'https://volodymyr221.github.io/T-K-Performance/#contact', 'new', now() - interval '2 days');

-- ═══ Записи на сьогодні ════════════════════════════════════════════

insert into bookings
  (id, client_id, vehicle_id, starts_at, ends_at, job_description, status, assigned_to, bay)
values
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001',
   'be000000-0000-4000-8000-000000000001',
   current_date + time '08:30', current_date + time '10:00',
   'MOT + full service', 'in_progress', '50000000-0000-4000-8000-000000000003', 1),

  ('b0000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000007',
   'be000000-0000-4000-8000-000000000008',
   current_date + time '09:15', current_date + time '10:15',
   'Engine light — diagnostics', 'in_progress', '50000000-0000-4000-8000-000000000003', 2),

  ('b0000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000002',
   'be000000-0000-4000-8000-000000000003',
   current_date + time '10:00', current_date + time '12:00',
   'N55 wastegate rattle', 'waiting_parts', '50000000-0000-4000-8000-000000000003', 3),

  ('b0000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000008',
   'be000000-0000-4000-8000-000000000009',
   current_date + time '11:30', current_date + time '12:15',
   'Oil & filter service', 'booked', '50000000-0000-4000-8000-000000000003', 1),

  ('b0000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000005',
   'be000000-0000-4000-8000-000000000006',
   current_date + time '12:00', current_date + time '13:00',
   'Front pads + brake fluid', 'booked', '50000000-0000-4000-8000-000000000003', 2),

  ('b0000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000006',
   'be000000-0000-4000-8000-000000000007',
   current_date + time '12:30', current_date + time '14:30',
   'Turbo actuator replacement', 'booked', '50000000-0000-4000-8000-000000000003', 3);

-- ═══ Виконані роботи ═══════════════════════════════════════════════
-- 🔴 Комісії тут НЕ вставляються. Їх нарахує тригер із 0002.
-- Набір підібраний так, щоб спрацював КОЖЕН вид виключення —
-- інакше панель «Що НЕ рахували» ніколи не перевіриш.

insert into jobs
  (client_id, vehicle_id, done_on, description,
   labour_amount, parts_amount, payment_method, paid_at, closed_by)
values
  -- ── нараховується: наші клієнти у відкритому вікні ──
  ('c1000000-0000-4000-8000-000000000001', 'be000000-0000-4000-8000-000000000001',
   current_date - 55, 'MOT + full service',
   180.00,  95.00, 'card', now() - interval '55 days', '50000000-0000-4000-8000-000000000003'),

  ('c1000000-0000-4000-8000-000000000001', 'be000000-0000-4000-8000-000000000001',
   current_date - 20, 'Front discs & pads',
   210.00, 340.00, 'card', now() - interval '20 days', '50000000-0000-4000-8000-000000000003'),

  ('c1000000-0000-4000-8000-000000000001', 'be000000-0000-4000-8000-000000000002',
   current_date - 3,  'N47 timing chain',
   960.00, 720.00, 'transfer', now() - interval '3 days', '50000000-0000-4000-8000-000000000003'),

  ('c1000000-0000-4000-8000-000000000002', 'be000000-0000-4000-8000-000000000003',
   current_date - 12, 'N55 wastegate',
   420.00, 610.00, 'card', now() - interval '12 days', '50000000-0000-4000-8000-000000000003'),

  ('c1000000-0000-4000-8000-000000000003', 'be000000-0000-4000-8000-000000000004',
   current_date - 8,  'MOT + suspension arms',
   340.00, 285.00, 'card', now() - interval '8 days', '50000000-0000-4000-8000-000000000003'),

  ('c1000000-0000-4000-8000-000000000004', 'be000000-0000-4000-8000-000000000005',
   current_date - 5,  'N57 chain + oil pump',
   1020.00, 880.00, 'transfer', now() - interval '5 days', '50000000-0000-4000-8000-000000000003'),

  ('c1000000-0000-4000-8000-000000000005', 'be000000-0000-4000-8000-000000000006',
   current_date - 14, 'Brake fluid + pads',
   160.00, 210.00, 'card', now() - interval '14 days', '50000000-0000-4000-8000-000000000003'),

  -- ── excluded / below_threshold: чек менший за поріг £150 ──
  ('c1000000-0000-4000-8000-000000000003', 'be000000-0000-4000-8000-000000000004',
   current_date - 2,  'Wiper blades + top-up',
   40.00, 55.00, 'cash', now() - interval '2 days', '50000000-0000-4000-8000-000000000003'),

  -- ── excluded / not_our_source: прийшов з вулиці ──
  ('c1000000-0000-4000-8000-000000000007', 'be000000-0000-4000-8000-000000000008',
   current_date - 9,  'Diagnostics + coil pack',
   90.00, 140.00, 'card', now() - interval '9 days', '50000000-0000-4000-8000-000000000003'),

  -- ── excluded / not_our_source: порадили ──
  ('c1000000-0000-4000-8000-000000000008', 'be000000-0000-4000-8000-000000000009',
   current_date - 6,  'Oil & filter service',
   120.00, 95.00, 'cash', now() - interval '6 days', '50000000-0000-4000-8000-000000000003'),

  -- ── excluded / pre_existing: був у базі до запуску реклами ──
  ('c1000000-0000-4000-8000-000000000009', 'be000000-0000-4000-8000-00000000000a',
   current_date - 4,  'M57 turbo + intercooler pipes',
   780.00, 1150.00, 'transfer', now() - interval '4 days', '50000000-0000-4000-8000-000000000003'),

  -- ── excluded / window_expired: з сайту, але понад рік тому ──
  ('c1000000-0000-4000-8000-00000000000a', 'be000000-0000-4000-8000-00000000000b',
   current_date - 1,  'Clutch & flywheel',
   640.00, 520.00, 'card', now() - interval '1 day', '50000000-0000-4000-8000-000000000003');

commit;

-- ═══════════════════════════════════════════════════════════════════
--  ПЕРЕВІРКА — запусти після сіду. Має бути по рядку на кожен випадок.
--
--    select status, excluded_reason, count(*), sum(amount)
--      from commissions
--     group by 1, 2
--     order by 1, 2;
--
--  Очікується приблизно:
--    due      | (null)           | 7 | ~460
--    excluded | below_threshold  | 1 | 0
--    excluded | not_our_source   | 2 | 0
--    excluded | pre_existing     | 1 | 0
--    excluded | window_expired   | 1 | 0
--
--  Порожньо → тригер із 0002 не спрацював.
--  Немає excluded → правило нарахування пропускає виключення,
--  і панель «Що НЕ рахували» у звіті буде брехати.
-- ═══════════════════════════════════════════════════════════════════
