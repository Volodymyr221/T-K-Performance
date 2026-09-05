-- ═══════════════════════════════════════════════════════════════════
--  T&K Performance CRM · міграція 0001 — типи, таблиці, індекси
--
--  Міграція (migration) — файл, який приводить базу з одного стану
--  в інший. Виконується РІВНО ОДИН РАЗ і ніколи не редагується
--  після того, як застосований: правки йдуть новим файлом.
--
--  Пояснення рішень — у crm/SCHEMA.md. Тут лише код.
--  Писано під PostgreSQL 15+ (те, що дає Supabase).
-- ═══════════════════════════════════════════════════════════════════

begin;

-- pg_trgm — пошук за частиною слова («whit» знайде «Whitlock»).
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- ═══ ТИПИ-ПЕРЕЛІКИ ═════════════════════════════════════════════════
-- Поле такого типу фізично не може містити стороннє значення.

create type client_source as enum (
  'website', 'phone_ad', 'instagram', 'walk_in', 'referral', 'other'
);

create type staff_role as enum (
  'owner',     -- власник СТО: усе, включно з грошима
  'manager',   -- приймальник: клієнти й записи, комісій не бачить
  'mechanic',  -- механік: свій день і закриття робіт
  'partner'    -- ми з Дімою: цифри без персональних даних
);

create type booking_status as enum (
  'booked', 'arrived', 'in_progress', 'waiting_parts',
  'ready', 'collected', 'cancelled', 'no_show'
);

create type payment_method as enum ('card', 'cash', 'transfer', 'unpaid');

create type enquiry_status as enum (
  'new', 'booked', 'no_answer', 'not_interested', 'spam', 'duplicate'
);

create type commission_status as enum ('due', 'settled', 'excluded');

create type exclusion_reason as enum (
  'below_threshold', 'pre_existing', 'window_expired', 'not_our_source', 'manual'
);

create type ui_lang as enum ('ua', 'en');

-- ═══ 1. STAFF — працівники ═════════════════════════════════════════
-- auth_user_id заповнюється, коли людині заводять логін у Supabase.
-- Він nullable навмисно: тоді ця міграція лягає і на чистий Postgres,
-- і сідові дані створюються без реальних акаунтів.

create table staff (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique,
  full_name     text not null,
  email         text not null unique,
  role          staff_role not null default 'mechanic',
  lang          ui_lang not null default 'ua',
  phone         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index staff_auth_idx on staff (auth_user_id) where auth_user_id is not null;

comment on column staff.lang is
  'Мова інтерфейсу — вибір людини, не фірми. Власник може сидіти в англійській, механік поруч в українській.';

-- ═══ 2. CLIENTS — клієнти ══════════════════════════════════════════

create table clients (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,

  phone_raw     text,                   -- як записала людина: «07700 900318»
  phone         text not null unique,   -- E.164: «+447700900318». Ключ пошуку
  email         text,
  postcode      text,
  notes         text,

  -- ── атрибуція ──
  source                 client_source not null default 'walk_in',
  attributed_at          date,
  attribution_expires_at date,   -- знімок, не обчислення: зміна вікна не зсуває старих
  pre_existing           boolean not null default false,

  created_at    timestamptz not null default now(),
  created_by    uuid references staff(id),

  constraint attribution_needs_date
    check (source not in ('website','phone_ad','instagram')
           or attributed_at is not null)
);

create index clients_phone_idx      on clients (phone);
create index clients_source_idx     on clients (source);
create index clients_name_trgm_idx  on clients using gin (full_name gin_trgm_ops);

comment on column clients.phone is
  'UNIQUE навмисно: клієнт ідентифікується телефоном. Сімʼя з одним номером — один клієнт з кількома авто.';
comment on column clients.attribution_expires_at is
  'Зберігається, а не обчислюється. Зміна window_months не має переписувати історію заднім числом.';
comment on column clients.pre_existing is
  'Був у базі до запуску реклами. Такий клієнт НІКОЛИ не дає комісії.';

-- ═══ 3. VEHICLES — авто ════════════════════════════════════════════

create table vehicles (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,

  reg          text not null,          -- «AB12CDE» — без пробілів, верхній регістр
  reg_display  text,                   -- «AB12 CDE» — як показувати
  make         text not null default 'BMW',
  model        text,
  series_code  text,                   -- F30
  engine_code  text,                   -- N47
  year         smallint check (year is null or year between 1970 and 2100),
  mileage      integer check (mileage is null or mileage >= 0),  -- милі, не км
  mot_due      date,
  notes        text,

  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Унікальний лише серед активних: авто продають, картку старого
-- власника деактивують, нову заводять на нового.
create unique index vehicles_reg_active_idx on vehicles (reg) where active;
create index vehicles_client_idx on vehicles (client_id);
create index vehicles_mot_idx    on vehicles (mot_due) where active;

-- ═══ 4. ENQUIRIES — заявки з сайту ═════════════════════════════════
-- IP-адреси немає навмисно: це персональні дані за UK GDPR,
-- а нам вона не потрібна ні для чого.

create table enquiries (
  id            uuid primary key default gen_random_uuid(),

  name          text,
  phone_raw     text,
  phone         text,
  email         text,
  message       text,          -- дослівно, як написав клієнт. Не перекладати
  vehicle_text  text,

  source        client_source not null default 'website',
  utm           jsonb,         -- мітки рекламної кампанії
  page_url      text,
  referrer      text,

  status        enquiry_status not null default 'new',
  client_id     uuid references clients(id),
  booking_id    uuid,          -- FK додається нижче: bookings ще не існує
  handled_by    uuid references staff(id),
  handled_at    timestamptz,

  created_at    timestamptz not null default now()
);

create index enquiries_new_idx   on enquiries (created_at desc) where status = 'new';
create index enquiries_phone_idx on enquiries (phone);

comment on column enquiries.message is
  'Дослівний текст клієнта. Не перекладається і не редагується — механік має бачити його слова.';

-- ═══ 5. BOOKINGS — записи ══════════════════════════════════════════

create table bookings (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id),
  vehicle_id      uuid references vehicles(id),

  starts_at       timestamptz not null,
  ends_at         timestamptz,
  all_day         boolean not null default false,  -- «привозь у вівторок»
  bay             smallint,

  job_description text not null,
  status          booking_status not null default 'booked',
  assigned_to     uuid references staff(id),

  enquiry_id      uuid references enquiries(id),
  created_at      timestamptz not null default now(),
  created_by      uuid references staff(id),

  constraint ends_after_starts check (ends_at is null or ends_at > starts_at)
);

create index bookings_day_idx    on bookings (starts_at);
create index bookings_status_idx on bookings (status);
create index bookings_client_idx on bookings (client_id);

alter table enquiries
  add constraint enquiries_booking_fk
  foreign key (booking_id) references bookings(id) on delete set null;

comment on column bookings.all_day is
  'Схема витримує і запис на годину, і «привозь у вівторок зранку».';

-- ═══ 6. JOBS — виконані роботи ═════════════════════════════════════
-- Окремо від bookings: не кожна робота має запис (заїхав з вулиці),
-- і не кожен запис стає роботою (не приїхав).

create table jobs (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients(id),
  vehicle_id     uuid references vehicles(id),
  booking_id     uuid references bookings(id) on delete set null,

  done_on        date not null default current_date,
  description    text not null,
  mileage        integer check (mileage is null or mileage >= 0),

  -- numeric, ніколи не float: float дає 274.99999999996
  labour_amount  numeric(10,2) not null default 0 check (labour_amount >= 0),
  parts_amount   numeric(10,2) not null default 0 check (parts_amount  >= 0),
  total_amount   numeric(10,2) generated always as (labour_amount + parts_amount) stored,

  payment_method payment_method not null default 'unpaid',
  paid_at        timestamptz,

  closed_by      uuid references staff(id),
  created_at     timestamptz not null default now()
);

create index jobs_done_idx    on jobs (done_on desc);
create index jobs_client_idx  on jobs (client_id);
-- 🪤 Індексу на to_char(done_on,'YYYY-MM') тут НЕМАЄ навмисно:
-- to_char не IMMUTABLE (залежить від налаштувань дати), і Postgres
-- відмовляється будувати на ньому індекс. Вибірка за місяць іде
-- через jobs_done_idx діапазоном дат — це не повільніше.

-- ═══ 7. COMMISSION_SETTINGS — ставки ═══════════════════════════════
-- 🔴 Ставки живуть тут, а не в коді. Домовились — вписали в поле.
-- Це історія ставок: змінили з 1 січня — додається рядок, старий лишається.

create table commission_settings (
  id              uuid primary key default gen_random_uuid(),
  effective_from  date not null unique,

  rate_labour     numeric(5,4) not null check (rate_labour between 0 and 1),
  rate_parts      numeric(5,4) not null check (rate_parts  between 0 and 1),
  threshold_gbp   numeric(10,2) not null check (threshold_gbp >= 0),
  window_months   smallint not null check (window_months > 0),

  note            text,
  created_at      timestamptz not null default now(),
  created_by      uuid references staff(id)
);

comment on table commission_settings is
  'Ставки як налаштування. Цифри — предмет домовленості з СТО, не рішення коду.';

-- ═══ 8. PERIODS — місяці ═══════════════════════════════════════════

create table periods (
  period       text primary key check (period ~ '^\d{4}-\d{2}$'),  -- «2027-03»
  status       text not null default 'open' check (status in ('open','settled')),
  total_amount numeric(10,2),
  jobs_count   integer,
  settled_at   timestamptz,
  settled_by   uuid references staff(id),
  note         text
);

-- ═══ 9. COMMISSIONS — нарахування ══════════════════════════════════
-- Рядок створюється ЗАВЖДИ, навіть коли комісії немає — тоді зі
-- status='excluded' і причиною. Саме тому у звіті працює панель
-- «Що НЕ рахували»: це записані відмови, а не порожнеча.

create table commissions (
  id               uuid primary key default gen_random_uuid(),
  job_id           uuid not null unique references jobs(id) on delete cascade,
  client_id        uuid not null references clients(id),
  period           text not null,

  -- знімок ставок на момент нарахування
  rate_labour      numeric(5,4) not null,
  rate_parts       numeric(5,4) not null,
  threshold_gbp    numeric(10,2) not null,

  labour_amount    numeric(10,2) not null,
  parts_amount     numeric(10,2) not null,
  amount           numeric(10,2) not null default 0 check (amount >= 0),

  status           commission_status not null default 'due',
  excluded_reason  exclusion_reason,
  excluded_note    text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint exclusion_needs_reason
    check (status <> 'excluded' or excluded_reason is not null),
  constraint manual_exclusion_needs_note
    check (excluded_reason is distinct from 'manual' or excluded_note is not null)
);

create index commissions_period_idx on commissions (period, status);
create index commissions_client_idx on commissions (client_id);

-- ═══ 10. AUDIT_LOG — журнал змін ═══════════════════════════════════
-- Тільки дописується. Не редагується і не видаляється — інакше це
-- не журнал, а чернетка.

create table audit_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  actor_id    uuid references staff(id),
  actor_name  text,             -- копія імені: працівник може звільнитись

  entity      text not null,
  entity_id   uuid,             -- nullable: подія може стосуватись періоду, а не рядка
  action      text not null check (action in ('create','update','delete')),
  field       text,
  old_value   text,
  new_value   text,
  note        text
);

create index audit_entity_idx on audit_log (entity, entity_id, at desc);
create index audit_at_idx      on audit_log (at desc);

-- ═══ 11. APP_SETTINGS — налаштування системи ═══════════════════════
-- Трюк із boolean primary key не дає завести другий рядок:
-- у системі рівно одна конфігурація, і база це гарантує.

create table app_settings (
  id                 boolean primary key default true check (id),
  business_name      text not null default 'T&K Performance',
  launch_date        date,      -- усе, що раніше — pre_existing
  timezone           text not null default 'Europe/London',
  currency           text not null default 'GBP',
  mot_reminder_days  smallint not null default 21,
  updated_at         timestamptz not null default now()
);

insert into app_settings (id) values (true);

comment on column app_settings.launch_date is
  'Дата запуску реклами. Заповнити ДО першої кампанії — потім не довести, хто був раніше.';

commit;
