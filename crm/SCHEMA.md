# Схема бази даних CRM — T&K Performance

> 🛑 **Це НЕ обовʼязкове читання.** Не входить у стелю 6 тис. токенів.
> Шукається `Grep`ом за темою, коли працюєш саме з базою.
>
> **Статус:** реалізовано в `crm/migrations/` і **перевірено на живому
> PostgreSQL 16** — 4 міграції застосувались, тригери нарахували комісії,
> злий тест прав пройшов 28/28. Див. `crm/README.md`.

---

## Про що цей файл

CRM — це не сторінка, це **рядки**. Клієнти, авто, візити, суми. Цей файл
описує, які саме рядки і як вони повʼязані.

🔴 **Схема — найдорожча помилка проєкту.** Криву кнопку виправляєш за десять
хвилин. Криву схему — переносячи вже накопичені дані, ризикуючи їх втратити.
Тому вона проєктується **до** коду, а не «як вийде».

Схема написана під **PostgreSQL** (Постґрес — база даних), бо саме її дає
Supabase. Але вона не привʼязана до Supabase: якщо колись переїдемо — переїде
як є.

---

## Словник — для Вови

| термін | що це |
|---|---|
| **таблиця** (table) | як аркуш в Excel: рядки й колонки. `clients` — усі клієнти |
| **рядок** (row) | один запис. Один клієнт = один рядок |
| **поле / колонка** (column) | одна характеристика: імʼя, телефон, дата |
| **первинний ключ** (primary key, PK) | унікальний номер рядка. За ним його знаходять |
| **зовнішній ключ** (foreign key, FK) | посилання на рядок в іншій таблиці. «Це авто належить клієнту №42» |
| **індекс** (index) | покажчик для швидкого пошуку. Без нього база перебирає все підряд |
| **UNIQUE** | «двох таких бути не може». Наприклад, двох клієнтів з одним телефоном |
| **enum** | поле, яке приймає лише перелічені значення. Не «будь-який текст» |
| **RLS** (Row Level Security) | правила доступу **на рівні бази**: механіку рядки з комісією просто не віддаються |
| **DDL** | мова опису структури. Те, що нижче в блоках `sql` |

---

## Мапа — як усе повʼязано

```
     staff (працівники)
       │ хто що зробив
       ▼
  audit_log ◄──────────── усі значущі зміни
       ▲
       │
  enquiries ──становиться──> clients ──має──> vehicles
  (заявка з сайту)              │                 │
                                └────┬────────────┘
                                     ▼
                                 bookings  (план: коли приїде)
                                     │
                                     ▼
                                   jobs    (факт: що зробили, скільки взяли)
                                     │
                                     ▼
                               commissions  (наші %, порахувала база)
                                     │
                                     ▼
                                  periods   (закритий місяць)

  commission_settings ──ставки на дату──> commissions
```

**Читається так:** заявка з сайту стає клієнтом → у клієнта є авто → на авто
роблять запис → запис закривається роботою → з роботи база сама рахує комісію
→ комісії збираються в місяць, місяць закривається.

---

## 0. Типи-переліки

Спершу — перелічувані типи. Вони не дають вписати сміття: поле `source` фізично
не може містити «з сайту(?)» або «вебсайт» — лише одне з дозволених значень.

```sql
-- Звідки взявся клієнт. 🔴 Головний тип у всій системі.
create type client_source as enum (
  'website',     -- заповнив форму на сайті
  'phone_ad',    -- подзвонив на рекламний номер (див. «Дірки» нижче)
  'instagram',   -- прийшов з Instagram
  'walk_in',     -- зайшов з вулиці
  'referral',    -- порадили
  'other'
);

-- Роль працівника в системі.
create type staff_role as enum (
  'owner',      -- власник: бачить усе, включно з грошима і звітами
  'manager',    -- приймальник: клієнти, записи, роботи. Комісій НЕ бачить
  'mechanic',   -- механік: свій день, закриття роботи. Комісій НЕ бачить
  'partner'     -- 🔴 ми з Дімою: звіт і суми, але БЕЗ персональних даних
);

-- Стан запису.
create type booking_status as enum (
  'booked',        -- записаний
  'arrived',       -- приїхав
  'in_progress',   -- у боксі
  'waiting_parts', -- чекає запчастини
  'ready',         -- готово, можна забирати
  'collected',     -- забрали
  'cancelled',     -- скасовано
  'no_show'        -- не приїхав
);

-- Чим платили.
create type payment_method as enum ('card','cash','transfer','unpaid');

-- Що сталося із заявкою з сайту.
create type enquiry_status as enum (
  'new','booked','no_answer','not_interested','spam','duplicate'
);

-- Стан нарахування комісії.
create type commission_status as enum (
  'due',      -- нараховано, чекає розрахунку
  'settled',  -- місяць закрито, розраховано
  'excluded'  -- не рахується (причина — в excluded_reason)
);

-- Чому комісія НЕ нарахована. Це і є панель «Що НЕ рахували» у звіті.
create type exclusion_reason as enum (
  'below_threshold',  -- чек менший за поріг
  'pre_existing',     -- клієнт був у базі до запуску реклами
  'window_expired',   -- минуло вікно (12 міс)
  'not_our_source',   -- джерело не наше (з вулиці, порадили)
  'manual'            -- вимкнено вручну — обовʼязково з поясненням
);

-- Мова інтерфейсу працівника.
create type ui_lang as enum ('ua','en');
```

---

## 1. `staff` — працівники

Хто заходить у систему. Логін дає Supabase, тут — роль і налаштування.

```sql
create table staff (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,          -- логін Supabase; nullable — див. нижче
  full_name    text not null,
  email        text not null unique,
  role         staff_role not null default 'mechanic',
  lang         ui_lang not null default 'ua',
  phone        text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
```

**Чому `lang` тут, а не в налаштуваннях компанії.** Мова — вибір людини, не
фірми. Власник може сидіти в англійській, механік поруч — в українській,
у тій самій системі одночасно.

**Чому `active`, а не видалення.** Працівник звільнився — ставимо `false`.
Видалити не можна: на ньому висять записи «хто закрив роботу», і без нього
історія розсиплеться.

**Чому `auth_user_id` окремо і nullable**, а не `id references auth.users`.
Схеми `auth` немає в звичайному Postgres — вона є тільки в Supabase. Якби
працівник посилався на неї напряму, міграцію не можна було б прогнати
локально, а отже й перевірити. Так вона лягає і туди, і туди; логін
прив'язується пізніше.

---

## 2. `clients` — клієнти

🔴 **Найважливіша таблиця.** Тут живе атрибуція — те, заради чого все.

```sql
create table clients (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,

  -- Телефон у двох виглядах: як ввели і як нормалізовано.
  phone_raw     text,                     -- «07700 900318» — як записала людина
  phone         text not null unique,     -- «+447700900318» — E.164, ключ пошуку
  email         text,
  postcode      text,
  notes         text,

  -- ── АТРИБУЦІЯ ────────────────────────────────────────────────
  source                 client_source not null default 'walk_in',
  attributed_at          date,        -- від якої дати рахується вікно
  attribution_expires_at date,        -- 🔴 знімок, не обчислення. Пояснення нижче
  pre_existing           boolean not null default false,

  created_at    timestamptz not null default now(),
  created_by    uuid references staff(id),

  constraint attribution_needs_date
    check (source not in ('website','phone_ad','instagram')
           or attributed_at is not null)
);

create index clients_phone_idx    on clients (phone);
create index clients_source_idx   on clients (source);
create index clients_name_trgm_idx on clients using gin (full_name gin_trgm_ops);
```

### 🔴 Три рішення, які тут закладені

**1. Клієнт = телефон.** `phone` має `UNIQUE` — двох клієнтів з одним номером
бути не може.

*Чому так:* саме телефон приходить із форми сайту і саме за ним шукає механік,
коли людина дзвонить. Якщо дозволити дублікати — атрибуція розсиплеться:
один і той самий чоловік буде двічі, один раз «з сайту», другий «з вулиці».

*Наслідок, який треба знати:* чоловік і дружина з одним номером — це **один
клієнт** у системі. Двоє їхніх авто просто висять на ньому обидва. Це нормально
і навіть зручно; але приймальник має розуміти правило, інакше почне вигадувати
фальшиві номери.

**2. `attribution_expires_at` зберігається, а не рахується.**

Здавалося б, навіщо — це ж просто `attributed_at + 12 місяців`. А ось навіщо:
**коли ви з Дімою зміните вікно з 12 місяців на 6, старі клієнти не мають
зсунутись.** Той, кому пообіцяли рік, лишається з роком. Обчислюване поле
переписало б історію заднім числом.

Те саме правило далі буде зі ставками. **Домовленість, чинна на момент події,
зберігається разом із подією.**

**3. `pre_existing` — це «знімок бази до старту».**

Усі, кого внесли до першої реклами, дістають `pre_existing = true`. Такий
клієнт **ніколи не дає комісії**, хай навіть колись заповнить форму на сайті.
Це та поступка, яка знімає головний страх СТО.

🔴 **Зробити це можна лише ДО запуску реклами.** Потім довести, хто був
раніше, неможливо. Дата запуску лежить в `app_settings.launch_date`.

---

## 3. `vehicles` — авто

```sql
create table vehicles (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,

  reg          text not null,          -- «AB12CDE» без пробілів, у верхньому регістрі
  reg_display  text,                   -- «AB12 CDE» — як показувати
  make         text not null default 'BMW',
  model        text,                   -- «320d Sport»
  series_code  text,                   -- «F30» — заводський індекс кузова
  engine_code  text,                   -- «N47» — індекс двигуна
  year         smallint,
  mileage      integer,                -- миль, не км. Британія
  mot_due      date,                   -- 🔴 коли спливає MOT
  notes        text,

  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create unique index vehicles_reg_active_idx on vehicles (reg) where active;
create index vehicles_client_idx on vehicles (client_id);
create index vehicles_mot_idx    on vehicles (mot_due) where active;
```

**`reg` унікальний лише серед активних.** Авто продають. Коли машина
переходить до іншого власника, стару картку деактивують (`active = false`)
і заводять нову на нового клієнта — а історія ремонтів лишається за старою.
Якби `reg` був унікальний завжди, друга картка просто не створилась би.

**`mot_due` — не косметика.** Це найдешевший спосіб повернути клієнта:
нагадування за три тижні. Для клієнта з сайту, чиє вікно ще відкрите, кожен
такий поверт — це наші відсотки.

**Милі, не кілометри.** Британія. Переплутати — це видати неправильну оцінку
пробігу і виглядати як не місцеві.

---

## 4. `enquiries` — заявки з сайту

Те, що падає з форми. **Сира правда, яку не можна редагувати.**

```sql
create table enquiries (
  id             uuid primary key default gen_random_uuid(),

  name           text,
  phone_raw      text,
  phone          text,                  -- нормалізований, для пошуку збігів
  email          text,
  message        text,                  -- 🔴 дослівно, як написав клієнт
  vehicle_text   text,                  -- «330d F31» — вільним текстом

  -- Звідки прийшов на сайт
  source         client_source not null default 'website',
  utm            jsonb,                 -- мітки рекламної кампанії
  page_url       text,
  referrer       text,

  status         enquiry_status not null default 'new',
  client_id      uuid references clients(id),   -- заповнюється при конвертації
  booking_id     uuid references bookings(id),
  handled_by     uuid references staff(id),
  handled_at     timestamptz,

  created_at     timestamptz not null default now()
);

create index enquiries_status_idx on enquiries (status) where status = 'new';
create index enquiries_phone_idx  on enquiries (phone);
```

**🔴 `message` не перекладається і не редагується.** Клієнт написав
англійською — так і лежить. Механік має бачити його слова, а не наш переказ.

**🔴 IP-адреси тут немає — навмисно.** IP це персональні дані за UK GDPR.
Нам вона не потрібна ні для чого, тому не збираємо взагалі. Найдешевший спосіб
не порушити закон — не мати даних.

**`utm` — мітки реклами.** Коли Діма запустить кампанію, посилання нестиме
мітки (`utm_source=google&utm_campaign=engine-repair`). Вони осідають тут, і
тоді видно не просто «з сайту», а **з якої саме реклами**. Це те, що дозволяє
рахувати вартість клієнта.

---

## 5. `bookings` — записи

План: хто, коли, на що приїде.

```sql
create table bookings (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients(id),
  vehicle_id     uuid references vehicles(id),

  starts_at      timestamptz not null,
  ends_at        timestamptz,
  all_day        boolean not null default false,   -- «привозь у вівторок»
  bay            smallint,                          -- номер підйомника

  job_description text not null,
  status         booking_status not null default 'booked',
  assigned_to    uuid references staff(id),

  enquiry_id     uuid references enquiries(id),     -- звідки приїхав запис
  created_at     timestamptz not null default now(),
  created_by     uuid references staff(id)
);

create index bookings_day_idx    on bookings (starts_at);
create index bookings_status_idx on bookings (status);
create index bookings_client_idx on bookings (client_id);
```

**`all_day` — на випадок, якщо вони не записують на годину.**

Я досі не знаю, як вони працюють насправді (це відкрите питання №6). Якщо
кажуть «привозь у вівторок зранку» — ставиться `all_day = true`, і запис
показується в дні без години. Якщо на конкретну годину — звичайний режим.

Схема витримає обидва варіанти, тому це питання **більше не блокує роботу**.

---

## 6. `jobs` — виконані роботи

Факт: що зробили і скільки взяли. **Окремо від `bookings` — навмисно.**

```sql
create table jobs (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients(id),
  vehicle_id     uuid references vehicles(id),
  booking_id     uuid references bookings(id),   -- може бути NULL

  done_on        date not null default current_date,
  description    text not null,
  mileage        integer,

  -- 🔴 Гроші. NUMERIC, ніколи не float — див. пояснення нижче
  labour_amount  numeric(10,2) not null default 0 check (labour_amount >= 0),
  parts_amount   numeric(10,2) not null default 0 check (parts_amount  >= 0),
  total_amount   numeric(10,2) generated always as
                   (labour_amount + parts_amount) stored,

  payment_method payment_method not null default 'unpaid',
  paid_at        timestamptz,

  closed_by      uuid references staff(id),
  created_at     timestamptz not null default now()
);

create index jobs_done_idx   on jobs (done_on);
create index jobs_client_idx on jobs (client_id);
```

**Чому `jobs` окремо від `bookings`.** Бо не кожна робота має запис: людина
може заїхати без домовленості. І навпаки — запис може скінчитись нічим
(не приїхав). Змішати їх в одну таблицю означає мати купу напівпорожніх рядків
і не могти чесно відповісти «скільки записів зірвалось».

**🔴 `numeric(10,2)`, а не `float`.** Це класична помилка, через яку в бухгалтерії
зʼявляється `274.99999999996`. Дробові числа в компʼютері зберігаються
наближено; `numeric` зберігає точно, як калькулятор. Для грошей — **тільки** він.

**`total_amount` рахує сама база** (`generated always`). Записати туди руками
неправильну суму фізично неможливо.

---

## 7. `commission_settings` — ставки як налаштування

🔴 **Ставки живуть тут, а не в коді.** Ви з Дімою домовитесь — я впишу цифри
в поле, а не переписуватиму програму.

```sql
create table commission_settings (
  id              uuid primary key default gen_random_uuid(),
  effective_from  date not null,

  rate_labour     numeric(5,4) not null,   -- 0.1000 = 10% з роботи
  rate_parts      numeric(5,4) not null,   -- 0.0400 = 4% із запчастин
  threshold_gbp   numeric(10,2) not null,  -- 150.00 — менші чеки не рахуються
  window_months   smallint not null,       -- 12

  note            text,
  created_at      timestamptz not null default now(),
  created_by      uuid references staff(id)
);

create unique index commission_settings_from_idx on commission_settings (effective_from);
```

**Це історія ставок, а не одне значення.** Змінили умови з 1 січня — додається
новий рядок, старий лишається. Робота, зроблена в грудні, і далі рахується за
грудневою ставкою.

⚠️ **Цифри в прикладах — мої припущення, не домовленість.** Реальні значення
Вова впише, коли вони з Дімою вирішать.

---

## 8. `commissions` — нарахування

Те, заради чого існує партнерство.

```sql
create table commissions (
  id               uuid primary key default gen_random_uuid(),
  job_id           uuid not null unique references jobs(id) on delete cascade,
  client_id        uuid not null references clients(id),
  period           text not null,           -- «2027-03»

  -- 🔴 ЗНІМОК ставок на момент нарахування
  rate_labour      numeric(5,4) not null,
  rate_parts       numeric(5,4) not null,
  threshold_gbp    numeric(10,2) not null,

  labour_amount    numeric(10,2) not null,
  parts_amount     numeric(10,2) not null,
  amount           numeric(10,2) not null,  -- нараховано нам

  status           commission_status not null default 'due',
  excluded_reason  exclusion_reason,
  excluded_note    text,

  created_at       timestamptz not null default now(),

  constraint exclusion_needs_reason
    check (status <> 'excluded' or excluded_reason is not null),
  constraint manual_exclusion_needs_note
    check (excluded_reason <> 'manual' or excluded_note is not null)
);

create index commissions_period_idx on commissions (period, status);
create index commissions_client_idx on commissions (client_id);
```

### Правило нарахування

Рядок створюється **автоматично при закритті роботи**. Людина його не заводить.

```
Робота закрита
   │
   ├─ клієнт pre_existing?           → excluded / pre_existing
   ├─ джерело не наше?               → excluded / not_our_source
   ├─ done_on > attribution_expires? → excluded / window_expired
   ├─ total_amount < threshold?      → excluded / below_threshold
   └─ інакше:
        amount = labour × rate_labour + parts × rate_parts
        status = 'due'
```

**Рядок створюється ЗАВЖДИ — навіть коли комісії немає.** Саме тому у звіті
працює панель «Що НЕ рахували»: це не порожнеча, це записані відмови з
причиною. Прозорість тут не додаткова функція, а побічний ефект того, що ми
нічого не викидаємо.

**`excluded_reason = 'manual'` вимагає пояснення** — це записано в самому
обмеженні бази. Вимкнути комісію мовчки неможливо.

**Знімок ставок** — з тієї ж причини, що й вікно: змінили умови — старі
нарахування не зсуваються.

---

## 9. `periods` — закриті місяці

```sql
create table periods (
  period       text primary key,          -- «2027-03»
  status       text not null default 'open' check (status in ('open','settled')),
  total_amount numeric(10,2),
  jobs_count   integer,
  settled_at   timestamptz,
  settled_by   uuid references staff(id),
  note         text
);
```

**Навіщо.** Місяць закривається один раз. Далі цифри в ньому не рухаються —
інакше «звіт за березень» щоразу різний, і звірятись неможливо.

Після `settled` роботи того місяця редагуються **тільки власником** і
**тільки з записом в аудит**.

---

## 10. `audit_log` — журнал змін

🔴 Те, що знімає майбутню суперечку до того, як вона почалась.

```sql
create table audit_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  actor_id    uuid references staff(id),
  actor_name  text,                     -- копія імені: працівник може піти

  entity      text not null,            -- 'client' | 'job' | 'commission' | ...
  entity_id   uuid not null,
  action      text not null,            -- 'create' | 'update' | 'delete'
  field       text,                     -- 'source'
  old_value   text,
  new_value   text,
  note        text
);

create index audit_entity_idx on audit_log (entity, entity_id, at desc);
create index audit_at_idx     on audit_log (at desc);
```

**Обовʼязково пишеться при:** зміні `clients.source`, зміні
`attribution_expires_at`, ручному виключенні комісії, редагуванні закритої
роботи, зміні ставок, зміні ролі працівника.

**`actor_name` дублює імʼя навмисно.** Працівник звільниться — рядок в аудиті
має лишитись читабельним, а не перетворитись на голий ідентифікатор.

**Журнал тільки дописується.** Рядки не редагуються і не видаляються — інакше
це не журнал, а чернетка.

---

## 11. `app_settings` — налаштування системи

```sql
create table app_settings (
  id            boolean primary key default true check (id),  -- рівно один рядок
  business_name text not null default 'T&K Performance',
  launch_date   date,        -- 🔴 дата запуску реклами. Все, що раніше — pre_existing
  timezone      text not null default 'Europe/London',
  currency      text not null default 'GBP',
  mot_reminder_days smallint not null default 21,
  updated_at    timestamptz not null default now()
);
```

Трюк із `id boolean primary key check (id)` не дає завести другий рядок
налаштувань. У системі одна конфігурація, і база це гарантує.

---

## 12. Права доступу (RLS)

🔴 **Головний принцип: захист живе в базі, не в інтерфейсі.**

Сховати колонку на екрані — це не безпека, це фіговий листок: дані все одно
приїхали в браузер, і їх видно за десять секунд. Тому механіку рядки з
комісіями **фізично не віддаються**.

| таблиця | owner | manager | mechanic | **partner** |
|---|---|---|---|---|
| `clients` | усе | усе | читання | 🔴 **ні** |
| `vehicles` | усе | усе | читання | ні |
| `enquiries` | усе | усе | читання | ні |
| `bookings` | усе | усе | свої + статус | ні |
| `jobs` | усе | усе | створити / закрити | ні |
| `commissions` | усе | **ні** | **ні** | читання |
| `periods` | усе | ні | ні | читання |
| `commission_settings` | усе | ні | ні | читання |
| `audit_log` | читання | ні | ні | читання |
| `staff` | усе | читання | себе | ні |

### 🔴 Роль `partner` — і чому вона бачить так мало

Нам із Дімою **не потрібні персональні дані їхніх клієнтів.** Нам потрібні
цифри: скільки людей, скільки грошей, скільки комісії.

Тому партнер бачить звіт, але замість «James Whitlock» — **«J.W. · …318»**
(ініціали й останні три цифри телефону). Цього достатньо, щоб звірити спірний
рядок, і недостатньо, щоб забрати базу.

Це вирішує одразу три речі:
1. **GDPR** — ми не обробляємо персональні дані, яких нам не треба;
2. **Довіра СТО** — найтихіший їхній страх («партнери качають нашу базу»)
   знімається технічно, а не обіцянкою;
3. **Ризик для нас** — витік з нашого боку неможливий, бо в нас цього немає.

Реалізується через окреме подання (view), яке віддає партнеру вже
знеособлені рядки.

---

## 13. UK GDPR — що закладено в схему

**Регіон.** База створюється в **London (eu-west-2)**. Дані британських
клієнтів не мають без потреби виїжджати за межі UK.

**Мінімізація.** Не збираємо того, що не потрібно: немає IP-адрес, немає
геолокації, немає історії переглядів.

**🔴 Право на видалення vs податковий закон — конфлікт, який треба знати.**

Клієнт має право попросити видалити свої дані. Але фінансові записи в Британії
зберігаються **6 років** за вимогою HMRC (податкова). Тобто «видалити все»
буквально — означає порушити інший закон.

**Рішення — анонімізація, а не видалення:**

```
clients.full_name  → 'Deleted client'
clients.phone      → 'deleted:<випадковий рядок>'   (UNIQUE має вціліти)
clients.email      → null
clients.postcode   → null
clients.notes      → null
vehicles.reg       → 'DELETED'
```

Персональних даних немає — суми, дати й комісії лишились. І звіт за минулий
рік не розвалився.

**Резервні копії.** На безкоштовному тарифі вони обмежені. Тому — **щотижневий
експорт бази у файл**, руками або скриптом. Це треба робити з першого дня, а
не згадати після втрати даних.

---

## 14. Дірки, які схема НЕ закриває

Чесний список. Жодна з цих проблем не лікується кодом.

**1. 🔴 Дзвінки повз форму.** Людина з реклами частіше дзвонить, ніж пише.
У схемі є `source = 'phone_ad'`, але **заповнити його правильно можна лише
тоді, коли рекламний номер окремий**. Інакше приймальник не відрізнить
рекламний дзвінок від будь-якого іншого. Це найбільша діра з усіх.

**2. Готівка.** Робота, яку не внесли в систему, не існує — ні для обліку,
ні для комісії. Лікується не базою, а тим, чи буде CRM для них зручнішою
за зошит.

**3. Знімок бази до старту.** Поле `pre_existing` є. Але заповнити його треба
**до** першої реклами, і зробити це має хтось живий.

**4. Дублікати клієнтів.** `UNIQUE` на телефоні тримає більшість випадків.
Але людина, яка змінила номер, зайде як новий клієнт — і її атрибуція
почнеться заново. Потрібен буде екран злиття карток; на старті — не робимо.

---

## 15. Що робити далі

- [x] ~~Написати міграцію з цієї схеми~~ → `crm/migrations/0001`–`0004`
- [x] ~~Правила RLS і злий тест~~ → `crm/tests/rls_test.sql`, **28/28 PASS**
- [ ] Інтерфейс на фальшивих даних — не чекаючи на пошту
- [ ] Створити проєкт Supabase у регіоні **London (eu-west-2)**
- [ ] Заповнити `app_settings.launch_date` і `commission_settings` — коли
      будуть реальні домовленості
- [ ] Форма сайту → `enquiries` (замість недоробленого Telegram-воркера)

---

*Будь-яка цифра в прикладах — припущення, не домовленість.*
