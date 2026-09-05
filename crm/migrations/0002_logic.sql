-- ═══════════════════════════════════════════════════════════════════
--  T&K Performance CRM · міграція 0002 — логіка бази
--
--  🔴 Головний принцип: комісію рахує БАЗА, не людина і не інтерфейс.
--  Людина вводить факти (робота, запчастини). Все інше — обчислення.
--  Поля «скільки платити партнерам» не існує: вписати туди
--  неправильну цифру фізично нема куди.
-- ═══════════════════════════════════════════════════════════════════

begin;

-- ═══ Хто зараз працює ══════════════════════════════════════════════
-- У Supabase auth.uid() повертає id залогіненого користувача.
-- Обгортка потрібна, щоб міграція не падала на чистому Postgres,
-- де схеми auth немає взагалі.

create or replace function current_staff_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  begin
    uid := auth.uid();
  exception when others then
    return null;          -- не Supabase або немає сесії
  end;

  if uid is null then
    return null;
  end if;

  return (select id from staff where auth_user_id = uid and active limit 1);
end;
$$;

create or replace function current_staff_role()
returns staff_role
language sql
stable
security definer
set search_path = public
as $$
  select role from staff where id = current_staff_id();
$$;

-- Зручний предикат для політик доступу.
create or replace function has_role(variadic wanted staff_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_staff_role() = any(wanted), false);
$$;

-- ═══ Телефон у канонічний вигляд ═══════════════════════════════════
-- Британські номери: 07700 900318 → +447700900318
-- Без цього «07700900318» і «+44 7700 900318» будуть різними
-- клієнтами, і атрибуція розсиплеться.

create or replace function normalise_phone_uk(raw text)
returns text
language plpgsql
immutable
as $$
declare
  digits text;
begin
  if raw is null or btrim(raw) = '' then
    return null;
  end if;

  -- лишаємо тільки цифри й провідний плюс
  digits := regexp_replace(raw, '[^0-9+]', '', 'g');
  digits := regexp_replace(digits, '(?!^)\+', '', 'g');

  if digits like '+44%' then
    return digits;
  elsif digits like '0044%' then
    return '+' || substring(digits from 3);
  elsif digits like '44%' and length(digits) >= 12 then
    return '+' || digits;
  elsif digits like '0%' then
    return '+44' || substring(digits from 2);
  elsif digits like '+%' then
    return digits;                       -- закордонний, лишаємо як є
  else
    return digits;                       -- не змогли впізнати — не псуємо
  end if;
end;
$$;

-- Тримає clients.phone і enquiries.phone нормалізованими завжди,
-- звідки б рядок не прийшов — з інтерфейсу, з форми чи з імпорту.

create or replace function sync_phone()
returns trigger
language plpgsql
as $$
begin
  if new.phone_raw is not null and (new.phone is null or new.phone = '') then
    new.phone := normalise_phone_uk(new.phone_raw);
  elsif new.phone is not null then
    new.phone := normalise_phone_uk(new.phone);
  end if;
  return new;
end;
$$;

create trigger clients_phone_norm
  before insert or update of phone, phone_raw on clients
  for each row execute function sync_phone();

create trigger enquiries_phone_norm
  before insert or update of phone, phone_raw on enquiries
  for each row execute function sync_phone();

-- ═══ Номерний знак у канонічний вигляд ═════════════════════════════

create or replace function sync_reg()
returns trigger
language plpgsql
as $$
begin
  if new.reg is not null then
    if new.reg_display is null then
      new.reg_display := upper(btrim(new.reg));
    end if;
    new.reg := upper(regexp_replace(new.reg, '[^A-Za-z0-9]', '', 'g'));
  end if;
  return new;
end;
$$;

create trigger vehicles_reg_norm
  before insert or update of reg on vehicles
  for each row execute function sync_reg();

-- ═══ Вікно атрибуції ═══════════════════════════════════════════════
-- Проставляється ОДИН раз, при появі атрибуції, і далі не рухається.
-- Зміна window_months у налаштуваннях не зсуває вже наявних клієнтів:
-- кому пообіцяли рік — лишається з роком.

create or replace function set_attribution_window()
returns trigger
language plpgsql
as $$
declare
  months smallint;
begin
  if new.attributed_at is not null and new.attribution_expires_at is null then
    select window_months into months
      from commission_settings
     where effective_from <= new.attributed_at
     order by effective_from desc
     limit 1;

    if months is not null then
      new.attribution_expires_at := new.attributed_at + (months || ' months')::interval;
    end if;
  end if;
  return new;
end;
$$;

create trigger clients_attribution_window
  before insert or update of attributed_at on clients
  for each row execute function set_attribution_window();

-- ═══ 🔴 РОЗРАХУНОК КОМІСІЇ ═════════════════════════════════════════
-- Спрацьовує на кожне створення й зміну роботи.
-- Рядок commissions створюється ЗАВЖДИ — навіть коли платити нічого:
-- тоді status='excluded' і причина. Звідси панель «Що НЕ рахували».

create or replace function apply_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cl        clients%rowtype;
  cfg       commission_settings%rowtype;
  v_period  text;
  v_amount  numeric(10,2) := 0;
  v_status  commission_status;
  v_reason  exclusion_reason;
begin
  select * into cl from clients where id = new.client_id;
  if not found then
    return new;
  end if;

  select * into cfg
    from commission_settings
   where effective_from <= new.done_on
   order by effective_from desc
   limit 1;

  -- Ставок на цю дату ще немає — нічого не нараховуємо.
  -- Так буває до того, як Вова з Дімою домовились про цифри.
  if not found then
    return new;
  end if;

  v_period := to_char(new.done_on, 'YYYY-MM');

  -- Місяць закрито — цифри в ньому більше не рухаються.
  if exists (select 1 from periods
              where period = v_period and status = 'settled') then
    return new;
  end if;

  -- ── Правило нарахування ──
  if cl.pre_existing then
    v_status := 'excluded'; v_reason := 'pre_existing';

  elsif cl.source not in ('website', 'phone_ad', 'instagram') then
    v_status := 'excluded'; v_reason := 'not_our_source';

  elsif cl.attribution_expires_at is null
        or new.done_on > cl.attribution_expires_at then
    v_status := 'excluded'; v_reason := 'window_expired';

  elsif new.total_amount < cfg.threshold_gbp then
    v_status := 'excluded'; v_reason := 'below_threshold';

  else
    v_status := 'due';
    v_reason := null;
    v_amount := round(new.labour_amount * cfg.rate_labour
                    + new.parts_amount  * cfg.rate_parts, 2);
  end if;

  insert into commissions (
    job_id, client_id, period,
    rate_labour, rate_parts, threshold_gbp,
    labour_amount, parts_amount, amount,
    status, excluded_reason
  ) values (
    new.id, new.client_id, v_period,
    cfg.rate_labour, cfg.rate_parts, cfg.threshold_gbp,
    new.labour_amount, new.parts_amount, v_amount,
    v_status, v_reason
  )
  on conflict (job_id) do update set
    period          = excluded.period,
    rate_labour     = excluded.rate_labour,
    rate_parts      = excluded.rate_parts,
    threshold_gbp   = excluded.threshold_gbp,
    labour_amount   = excluded.labour_amount,
    parts_amount    = excluded.parts_amount,
    amount          = excluded.amount,
    status          = excluded.status,
    excluded_reason = excluded.excluded_reason,
    updated_at      = now()
  -- вже розрахований місяць не переписуємо, і ручне виключення теж
  where commissions.status <> 'settled'
    and commissions.excluded_reason is distinct from 'manual';

  return new;
end;
$$;

create trigger jobs_commission
  after insert or update of labour_amount, parts_amount, done_on, client_id
  on jobs
  for each row execute function apply_commission();

-- ═══ АУДИТ ═════════════════════════════════════════════════════════
-- Пишеться на те, навколо чого можуть виникнути суперечки.

create or replace function log_change(
  p_entity text, p_id uuid, p_action text,
  p_field text default null,
  p_old text default null, p_new text default null,
  p_note text default null
) returns void
language sql
security definer
set search_path = public
as $$
  insert into audit_log (actor_id, actor_name, entity, entity_id,
                         action, field, old_value, new_value, note)
  select current_staff_id(),
         (select full_name from staff where id = current_staff_id()),
         p_entity, p_id, p_action, p_field, p_old, p_new, p_note;
$$;

-- 🔴 Зміна джерела клієнта — головний рядок аудиту.
-- Саме він знімає суперечку «а він і так би приїхав».
create or replace function audit_client_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform log_change('client', new.id, 'create', 'source',
                       null, new.source::text,
                       case when current_staff_id() is null
                            then 'автоматично — форма на сайті' end);

  elsif new.source is distinct from old.source then
    perform log_change('client', new.id, 'update', 'source',
                       old.source::text, new.source::text);

  elsif new.attribution_expires_at is distinct from old.attribution_expires_at then
    perform log_change('client', new.id, 'update', 'attribution_expires_at',
                       old.attribution_expires_at::text,
                       new.attribution_expires_at::text);

  elsif new.pre_existing is distinct from old.pre_existing then
    perform log_change('client', new.id, 'update', 'pre_existing',
                       old.pre_existing::text, new.pre_existing::text);
  end if;

  return new;
end;
$$;

create trigger clients_audit
  after insert or update on clients
  for each row execute function audit_client_source();

-- Ручне виключення комісії лишає слід завжди.
create or replace function audit_commission_override()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.excluded_reason = 'manual'
     and old.excluded_reason is distinct from 'manual' then
    perform log_change('commission', new.id, 'update', 'excluded_reason',
                       coalesce(old.excluded_reason::text, old.status::text),
                       'manual', new.excluded_note);
  end if;
  return new;
end;
$$;

create trigger commissions_audit
  after update on commissions
  for each row execute function audit_commission_override();

-- ═══ ЗАКРИТИ МІСЯЦЬ ════════════════════════════════════════════════
-- Місяць закривається один раз. Далі цифри в ньому не рухаються —
-- інакше «звіт за березень» щоразу різний.

create or replace function settle_period(p_period text)
returns periods
language plpgsql
security definer
set search_path = public
as $$
declare
  result periods%rowtype;
begin
  if not has_role('owner') then
    raise exception 'Закривати місяць може лише власник';
  end if;

  if p_period !~ '^\d{4}-\d{2}$' then
    raise exception 'Період має вигляд YYYY-MM, отримано: %', p_period;
  end if;

  insert into periods (period, status, total_amount, jobs_count,
                       settled_at, settled_by)
  select p_period, 'settled',
         coalesce(sum(amount) filter (where status = 'due'), 0),
         count(*) filter (where status = 'due'),
         now(), current_staff_id()
    from commissions
   where period = p_period
  on conflict (period) do update set
    status       = 'settled',
    total_amount = excluded.total_amount,
    jobs_count   = excluded.jobs_count,
    settled_at   = now(),
    settled_by   = current_staff_id()
  returning * into result;

  update commissions
     set status = 'settled', updated_at = now()
   where period = p_period and status = 'due';

  perform log_change('period', null, 'update', 'status', 'open', 'settled',
                     p_period);

  return result;
end;
$$;

-- ═══ АНОНІМІЗАЦІЯ (право на видалення) ═════════════════════════════
-- 🪤 UK GDPR дає право на видалення. HMRC вимагає зберігати фінансові
-- записи 6 років. Буквальне видалення порушило б другий закон.
-- Тому: персональні поля стираються, суми лишаються.

create or replace function anonymise_client(p_client uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_role('owner') then
    raise exception 'Анонімізувати клієнта може лише власник';
  end if;

  update clients set
    full_name = 'Deleted client',
    phone     = 'deleted:' || encode(gen_random_bytes(8), 'hex'),
    phone_raw = null,
    email     = null,
    postcode  = null,
    notes     = null
  where id = p_client;

  update vehicles set
    reg = 'DELETED-' || left(id::text, 8),
    reg_display = 'DELETED',
    notes = null
  where client_id = p_client;

  perform log_change('client', p_client, 'update', 'anonymised',
                     null, 'true', p_note);
end;
$$;

commit;
