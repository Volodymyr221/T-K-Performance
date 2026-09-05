-- ═══════════════════════════════════════════════════════════════════
--  T&K Performance CRM · міграція 0003 — права доступу (RLS)
--
--  🔴 ГОЛОВНЕ: захист живе тут, а не в інтерфейсі.
--
--  Сховати колонку на екрані — це не безпека, це фіговий листок:
--  дані все одно приїхали в браузер, і їх видно за десять секунд
--  через інструменти розробника. Тому механіку рядки з комісіями
--  ФІЗИЧНО не віддаються — база їх йому не покаже.
--
--  RLS (Row Level Security) — правила на рівні рядка. База сама
--  вирішує, які рядки показати цьому конкретному користувачеві.
-- ═══════════════════════════════════════════════════════════════════

begin;

-- Вмикаємо RLS усюди. Поки не вмкнено — таблиця відкрита всім,
-- хто дістався до бази.
alter table staff               enable row level security;
alter table clients             enable row level security;
alter table vehicles            enable row level security;
alter table enquiries           enable row level security;
alter table bookings            enable row level security;
alter table jobs                enable row level security;
alter table commission_settings enable row level security;
alter table commissions         enable row level security;
alter table periods             enable row level security;
alter table audit_log           enable row level security;
alter table app_settings        enable row level security;

-- ═══ STAFF ═════════════════════════════════════════════════════════
-- Колег видно всім (щоб призначати роботи), редагує лише власник.
-- Partner не бачить навіть складу працівників — йому це не потрібно.

create policy staff_read on staff
  for select using (
    has_role('owner','manager','mechanic')
  );

create policy staff_write on staff
  for all using (has_role('owner')) with check (has_role('owner'));

create policy staff_self_update on staff
  for update using (id = current_staff_id())
  with check (id = current_staff_id() and role = current_staff_role());
  -- працівник міняє собі мову, але не роль

-- ═══ CLIENTS ═══════════════════════════════════════════════════════
-- 🔴 Partner тут не згаданий узагалі — і це навмисно.
-- Нам із Дімою персональні дані їхніх клієнтів не потрібні.

create policy clients_read on clients
  for select using (has_role('owner','manager','mechanic'));

create policy clients_write on clients
  for all using (has_role('owner','manager'))
  with check (has_role('owner','manager'));

-- ═══ VEHICLES ══════════════════════════════════════════════════════

create policy vehicles_read on vehicles
  for select using (has_role('owner','manager','mechanic'));

create policy vehicles_write on vehicles
  for all using (has_role('owner','manager'))
  with check (has_role('owner','manager'));

-- ═══ ENQUIRIES ═════════════════════════════════════════════════════
-- Заявки з сайту вставляє анонімна роль (форма на сайті), тому
-- insert дозволено окремою політикою без ролі. Читати анонім не може.

create policy enquiries_read on enquiries
  for select using (has_role('owner','manager','mechanic'));

create policy enquiries_write on enquiries
  for all using (has_role('owner','manager'))
  with check (has_role('owner','manager'));

create policy enquiries_public_insert on enquiries
  for insert with check (
    status = 'new'
    and client_id is null
    and booking_id is null
    and handled_by is null
  );

-- ═══ BOOKINGS ══════════════════════════════════════════════════════
-- Механік бачить усі записи (йому треба знати день цеху),
-- але змінює лише ті, що призначені на нього.

create policy bookings_read on bookings
  for select using (has_role('owner','manager','mechanic'));

create policy bookings_write on bookings
  for all using (has_role('owner','manager'))
  with check (has_role('owner','manager'));

create policy bookings_mechanic_update on bookings
  for update using (
    has_role('mechanic') and assigned_to = current_staff_id()
  ) with check (
    has_role('mechanic') and assigned_to = current_staff_id()
  );

-- ═══ JOBS ══════════════════════════════════════════════════════════
-- Механік закриває роботи — це його щоденна дія.
-- Робота із закритого місяця редагується лише власником.

create policy jobs_read on jobs
  for select using (has_role('owner','manager','mechanic'));

create policy jobs_insert on jobs
  for insert with check (has_role('owner','manager','mechanic'));

create policy jobs_update on jobs
  for update using (
    has_role('owner')
    or (has_role('manager','mechanic')
        and not exists (select 1 from periods
                         where period = to_char(jobs.done_on, 'YYYY-MM')
                           and status = 'settled'))
  ) with check (
    has_role('owner','manager','mechanic')
  );

create policy jobs_delete on jobs
  for delete using (has_role('owner'));

-- ═══ 🔴 COMMISSIONS — тут і проходить головна межа ═════════════════
-- manager і mechanic не згадані НІДЕ. Для них цієї таблиці
-- просто не існує: запит поверне порожньо.

create policy commissions_read on commissions
  for select using (has_role('owner','partner'));

create policy commissions_write on commissions
  for all using (has_role('owner')) with check (has_role('owner'));

-- ═══ COMMISSION_SETTINGS — ставки ══════════════════════════════════
-- Partner бачить ставки (це наша домовленість), міняє лише власник.

create policy settings_read on commission_settings
  for select using (has_role('owner','partner'));

create policy settings_write on commission_settings
  for all using (has_role('owner')) with check (has_role('owner'));

-- ═══ PERIODS ═══════════════════════════════════════════════════════

create policy periods_read on periods
  for select using (has_role('owner','partner'));

create policy periods_write on periods
  for all using (has_role('owner')) with check (has_role('owner'));

-- ═══ AUDIT_LOG ═════════════════════════════════════════════════════
-- Читають обидві сторони — у цьому й сенс. Пише лише база,
-- через функції security definer, тому політики на запис немає:
-- вставити рядок вручну не може НІХТО, включно з власником.

create policy audit_read on audit_log
  for select using (has_role('owner','partner'));

-- ═══ APP_SETTINGS ══════════════════════════════════════════════════

create policy app_settings_read on app_settings
  for select using (has_role('owner','manager','mechanic','partner'));

create policy app_settings_write on app_settings
  for all using (has_role('owner')) with check (has_role('owner'));

-- ═══════════════════════════════════════════════════════════════════
--  🔴 ЗВІТ ДЛЯ ПАРТНЕРА — знеособлений
--
--  Нам із Дімою не потрібні імена їхніх клієнтів. Потрібні цифри.
--  Тому замість «James Whitlock» партнер бачить «J.W. · …318»:
--  досить, щоб звірити спірний рядок, і замало, щоб забрати базу.
--
--  Це закриває три речі одразу:
--    1. GDPR — ми не обробляємо даних, які нам не потрібні;
--    2. довіру СТО — їхній найтихіший страх знято технічно;
--    3. ризик для нас — витік неможливий, бо в нас цього немає.
-- ═══════════════════════════════════════════════════════════════════

create or replace view partner_report as
select
  cm.period,
  cm.id                                            as commission_id,
  j.done_on,

  -- ініціали замість імені
  (select string_agg(upper(left(part, 1)), '.')
     from unnest(string_to_array(btrim(c.full_name), ' ')) as part
    where part <> '')                              as client_initials,
  right(c.phone, 3)                                as phone_tail,

  v.series_code,
  v.engine_code,
  j.description,

  cm.labour_amount,
  cm.parts_amount,
  cm.labour_amount + cm.parts_amount               as total_amount,
  cm.rate_labour,
  cm.rate_parts,
  cm.threshold_gbp,
  cm.amount,
  cm.status,
  cm.excluded_reason
from commissions cm
join jobs      j on j.id = cm.job_id
join clients   c on c.id = cm.client_id
left join vehicles v on v.id = j.vehicle_id
where has_role('owner', 'partner');
-- ↑ не та роль — view поверне нуль рядків, а не помилку

comment on view partner_report is
  'Звіт для партнерів без персональних даних. Імена — ініціалами, телефон — трьома останніми цифрами.';

-- ═══ Підсумок місяця — те, що показує звіт угорі ═══════════════════

create or replace view period_summary as
select
  cm.period,
  count(*) filter (where cm.status <> 'excluded')                  as jobs_counted,
  count(*) filter (where cm.status =  'excluded')                  as jobs_excluded,
  coalesce(sum(cm.labour_amount) filter (where cm.status <> 'excluded'), 0) as labour_total,
  coalesce(sum(cm.parts_amount)  filter (where cm.status <> 'excluded'), 0) as parts_total,
  coalesce(sum(cm.amount), 0)                                      as commission_total,
  count(*) filter (where cm.excluded_reason = 'below_threshold')   as excl_below_threshold,
  count(*) filter (where cm.excluded_reason = 'pre_existing')      as excl_pre_existing,
  count(*) filter (where cm.excluded_reason = 'window_expired')    as excl_window_expired,
  count(*) filter (where cm.excluded_reason = 'not_our_source')    as excl_not_our_source,
  count(*) filter (where cm.excluded_reason = 'manual')            as excl_manual,
  coalesce(bool_or(p.status = 'settled'), false)                   as settled
from commissions cm
left join periods p on p.period = cm.period
where has_role('owner', 'partner')
group by cm.period;

comment on view period_summary is
  'Підсумок місяця, включно з панеллю «Що НЕ рахували»: excl_* — це не порожнеча, а записані відмови з причиною.';

commit;
