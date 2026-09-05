-- ═══════════════════════════════════════════════════════════════════
--  ЗЛИЙ ТЕСТ ПРАВ ДОСТУПУ
--
--  Твердження «механік не бачить комісій» нічого не варте, поки
--  ніхто не спробував їх дістати. Цей файл пробує.
--
--  Запускати на ТЕСТОВІЙ базі після 0001–0004:
--    psql -d tkcrm -f crm/tests/rls_test.sql
--
--  Кожен рядок виводу має бути PASS. Хоча б один FAIL — це дірка.
--
--  🪤 Дві пастки, на які я вже наступив, коли писав цей файл:
--    1. Тестувати треба під ОКРЕМОЮ роллю. Власник таблиць обходить
--       RLS завжди — під ним тест показує PASS там, де діра.
--    2. SET LOCAL поза транзакцією мовчки не діє. Тільки попередження
--       в лог, і тест виконується від суперкористувача.
-- ═══════════════════════════════════════════════════════════════════

-- ── Підробка auth.uid() ────────────────────────────────────────────
-- У Supabase схема auth уже є. Локально імітуємо її так само, як це
-- робить Supabase: id береться з налаштування сесії.
create schema if not exists auth;
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function check_test(label text, got boolean)
returns text language sql as $$
  select case when got then '  PASS  ' else '! FAIL !' end || '  ' || label;
$$;

-- Роль застосунку. НЕ власник таблиць — інакше RLS її не стосується.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
end $$;

grant usage on schema public, auth to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant execute on all functions in schema public to app_user;
grant execute on all functions in schema auth to app_user;

-- Вигадані auth-акаунти, по одному на працівника.
update staff set auth_user_id = 'a0000000-0000-4000-8000-000000000001'
  where id = '50000000-0000-4000-8000-000000000001';   -- owner
update staff set auth_user_id = 'a0000000-0000-4000-8000-000000000002'
  where id = '50000000-0000-4000-8000-000000000002';   -- manager
update staff set auth_user_id = 'a0000000-0000-4000-8000-000000000003'
  where id = '50000000-0000-4000-8000-000000000003';   -- mechanic
update staff set auth_user_id = 'a0000000-0000-4000-8000-000000000004'
  where id = '50000000-0000-4000-8000-000000000004';   -- partner (Вова)
update staff set auth_user_id = 'a0000000-0000-4000-8000-000000000005'
  where id = '50000000-0000-4000-8000-000000000005';   -- partner (Діма)

-- 🔴 Далі — уже не власник таблиць.
set role app_user;

-- ═══ МЕХАНІК ═══════════════════════════════════════════════════════
select set_config('request.jwt.claim.sub',
                  'a0000000-0000-4000-8000-000000000003', false) is not null as _;

select '══ МЕХАНІК ══' as who;
select check_test('роль розпізнана як mechanic', current_staff_role() = 'mechanic');
select check_test('бачить клієнтів (треба для роботи)', (select count(*) from clients)  > 0);
select check_test('бачить розклад дня',                 (select count(*) from bookings) > 0);
select check_test('бачить роботи',                      (select count(*) from jobs)     > 0);
select check_test('🔴 НЕ бачить ЖОДНОЇ комісії',        (select count(*) from commissions) = 0);
select check_test('🔴 НЕ бачить ставок',                (select count(*) from commission_settings) = 0);
select check_test('🔴 НЕ бачить закритих місяців',      (select count(*) from periods) = 0);
select check_test('🔴 НЕ бачить журналу аудиту',        (select count(*) from audit_log) = 0);
select check_test('🔴 звіт партнера порожній',          (select count(*) from partner_report) = 0);

-- ═══ ПРИЙМАЛЬНИК ═══════════════════════════════════════════════════
select set_config('request.jwt.claim.sub',
                  'a0000000-0000-4000-8000-000000000002', false) is not null as _;

select '══ ПРИЙМАЛЬНИК ══' as who;
select check_test('роль розпізнана як manager', current_staff_role() = 'manager');
select check_test('бачить клієнтів',            (select count(*) from clients) > 0);
select check_test('бачить заявки з сайту',      (select count(*) from enquiries) > 0);
select check_test('🔴 НЕ бачить комісій',       (select count(*) from commissions) = 0);
select check_test('🔴 НЕ бачить ставок',        (select count(*) from commission_settings) = 0);

-- ═══ ПАРТНЕР (ми з Дімою) ══════════════════════════════════════════
select set_config('request.jwt.claim.sub',
                  'a0000000-0000-4000-8000-000000000004', false) is not null as _;

select '══ ПАРТНЕР ══' as who;
select check_test('роль розпізнана як partner',      current_staff_role() = 'partner');
select check_test('бачить комісії',                  (select count(*) from commissions) > 0);
select check_test('бачить ставки',                   (select count(*) from commission_settings) > 0);
select check_test('бачить журнал аудиту',            (select count(*) from audit_log) > 0);
select check_test('бачить свій звіт',                (select count(*) from partner_report) > 0);
select check_test('🔴 НЕ бачить імен клієнтів',      (select count(*) from clients) = 0);
select check_test('🔴 НЕ бачить авто',               (select count(*) from vehicles) = 0);
select check_test('🔴 НЕ бачить заявок',             (select count(*) from enquiries) = 0);
select check_test('🔴 НЕ бачить складу працівників', (select count(*) from staff) = 0);

select '══ що САМЕ бачить партнер замість імені ══' as who;
select client_initials, phone_tail, description, amount, status,
       coalesce(excluded_reason::text,'—') as reason
  from partner_report order by done_on desc limit 5;

-- ═══ ВЛАСНИК ═══════════════════════════════════════════════════════
select set_config('request.jwt.claim.sub',
                  'a0000000-0000-4000-8000-000000000001', false) is not null as _;

select '══ ВЛАСНИК ══' as who;
select check_test('роль розпізнана як owner', current_staff_role() = 'owner');
select check_test('бачить клієнтів',          (select count(*) from clients) > 0);
select check_test('бачить комісії',           (select count(*) from commissions) > 0);
select check_test('бачить аудит',             (select count(*) from audit_log) > 0);
select check_test('бачить склад працівників', (select count(*) from staff) > 0);

-- ═══ АНОНІМ — той, хто просто взяв публічний ключ ══════════════════
select set_config('request.jwt.claim.sub', '', false) is not null as _;

select '══ АНОНІМ (публічний ключ і більше нічого) ══' as who;
select check_test('🔴 НЕ бачить клієнтів', (select count(*) from clients) = 0);
select check_test('🔴 НЕ бачить комісій',  (select count(*) from commissions) = 0);
select check_test('🔴 НЕ бачить робіт',    (select count(*) from jobs) = 0);
select check_test('🔴 НЕ бачить заявок',   (select count(*) from enquiries) = 0);
select check_test('🔴 НЕ бачить авто',     (select count(*) from vehicles) = 0);

reset role;
