/* ═══════════════════════════════════════════════════════════════════
   МОВА ІНТЕРФЕЙСУ

   Головна — українська. Англійська перемикається кнопкою.
   Вибір зберігається за працівником, не за пристроєм: власник може
   сидіти в англійській, механік поруч — в українській, одночасно.

   🔴 Мова інтерфейсу ≠ мова документів.
   Рахунок, SMS і лист клієнту — ЗАВЖДИ англійською, бо їх отримує
   британець. Другого перемикача в системі немає навмисно.

   Не перекладається ніколи: MOT · £ · dd/mm/yyyy · номерні знаки ·
   імена клієнтів · заводські індекси BMW (F30, N47) · текст заявки.
   ═══════════════════════════════════════════════════════════════════ */
window.TK = window.TK || {};

TK.i18n = (function () {
  'use strict';

  const S = {
    // навігація
    nav_today:    ['Сьогодні', 'Today'],
    nav_diary:    ['Розклад', 'Diary'],
    nav_enq:      ['Заявки', 'Enquiries'],
    nav_clients:  ['Клієнти', 'Clients'],
    nav_report:   ['Звіт', 'Report'],
    nav_money:    ['Гроші', 'Money'],
    nav_setup:    ['Налаштування', 'Setup'],
    nav_search:   ['Пошук', 'Search'],
    nav_more:     ['Ще', 'More'],

    // ролі
    role_owner:    ['Власник', 'Owner'],
    role_manager:  ['Приймальник', 'Manager'],
    role_mechanic: ['Механік', 'Mechanic'],
    role_partner:  ['Партнер', 'Partner'],
    role_full:     ['повний доступ', 'full access'],
    role_nomoney:  ['без комісій', 'no commissions'],
    role_nonames:  ['без імен клієнтів', 'no client names'],

    // сьогодні
    booked_in:   ['Записано', 'Booked in'],
    in_shop:     ['У боксі', 'In workshop'],
    waiting:     ['Чекає запчастини', 'Waiting on parts'],
    from_site:   ['З сайту', 'From website'],
    of_today:    ['з {n} записаних сьогодні', 'of {n} booked in today'],
    not_arrived: ['ще не приїхали', 'not arrived yet'],
    diary_for:   ['Розклад на сьогодні', "Today's diary"],
    slots:       ['{n} записів', '{n} slots'],
    new_enq:     ['Нові заявки', 'New enquiries'],
    from_site_n: ['{n} · з сайту', '{n} · from site'],
    book_in:     ['Записати', 'Book in'],
    call_back:   ['Передзвонити', 'Call back'],
    booked_ok:   ['Записано ✓', 'Booked ✓'],
    no_enq:      ['Нових заявок немає', 'No new enquiries'],

    // статуси
    st_booked:        ['Записаний', 'Booked'],
    st_in_progress:   ['У боксі', 'In workshop'],
    st_waiting_parts: ['Чекає запчастини', 'Waiting on parts'],
    st_collected:     ['Забрали', 'Collected'],

    // джерела
    src_website:   ['З САЙТУ', 'WEBSITE'],
    src_phone_ad:  ['З РЕКЛАМИ', 'PHONE AD'],
    src_instagram: ['INSTAGRAM', 'INSTAGRAM'],
    src_walk_in:   ['З ВУЛИЦІ', 'WALK-IN'],
    src_referral:  ['ПОРАДИЛИ', 'REFERRAL'],
    src_other:     ['ІНШЕ', 'OTHER'],

    // клієнти
    clients_h:    ['Клієнти', 'Clients'],
    search_ph:    ['Пошук: імʼя, номер авто, телефон…', 'Search name, reg or phone…'],
    visits:       ['візитів', 'visits'],
    nothing:      ['Нічого не знайдено', 'Nothing found'],
    source:       ['Джерело', 'Source'],
    ours_from:    ['Наш з', 'Attributed from'],
    window_till:  ['Вікно комісії', 'Commission window'],
    days_left:    ['до {d} · лишилось {n} днів', 'until {d} · {n} days left'],
    window_over:  ['вікно закрилось {d}', 'window closed {d}'],
    no_window:    ['вікна немає — джерело не наше', 'no window — not our source'],
    pre_exist:    ['Був у базі до запуску реклами', 'In the base before launch'],
    history:      ['Історія візитів', 'Visit history'],
    vehicles_h:   ['Авто', 'Vehicles'],
    src_history:  ['Історія джерела', 'Source history'],
    no_manual:    ['Руками не змінювали', 'No manual changes'],
    no_manual_d:  ['джерело жодного разу не правили вручну', 'source never edited by hand'],
    back:         ['Назад', 'Back'],

    // таблиці
    th_date:    ['Дата', 'Date'],
    th_job:     ['Що робили', 'Job'],
    th_client:  ['Клієнт', 'Client'],
    th_labour:  ['Робота', 'Labour'],
    th_parts:   ['Запчастини', 'Parts'],
    th_total:   ['Разом', 'Total'],
    th_ours:    ['Наші', 'Commission'],
    total_win:  ['Разом у вікні', 'Total in window'],

    // звіт
    report_h:     ['Звіт по рекламі', 'Marketing report'],
    r_clients:    ['Клієнтів з сайту', 'Website clients'],
    r_revenue:    ['Виручка з них', 'Revenue from them'],
    r_due:        ['До сплати нам', 'Commission due'],
    r_of_jobs:    ['з {n} робіт за місяць', 'of {n} jobs this month'],
    r_split:      ['робота {l} · запчастини {p}', 'labour {l} · parts {p}'],
    r_formula:    ['{a}% з роботи + {b}% із запчастин', '{a}% labour + {b}% parts'],
    r_counted:    ['Що порахували', 'Jobs counted'],
    r_notcounted: ['Що НЕ рахували', 'Not counted'],
    r_bymonth:    ['Комісія по місяцях', 'Commission by month'],
    r_nothing:    ['Цього місяця робіт не було', 'No jobs this month'],
    ex_below:     ['Менше {t}', 'Under {t}'],
    ex_below_d:   ['нижче порогу за домовленістю', 'below the agreed threshold'],
    ex_pre:       ['Були в базі', 'Existing clients'],
    ex_pre_d:     ['ще до запуску реклами', 'in the base before launch'],
    ex_window:    ['Вікно вийшло', 'Window expired'],
    ex_window_d:  ['минуло {n} міс', '{n} months passed'],
    ex_source:    ['Джерело не наше', 'Not our source'],
    ex_source_d:  ['з вулиці або порадили', 'walk-in or referral'],
    jobs_n:       ['{n} робіт', '{n} jobs'],
    all_in_win:   ['{n} · усі у вікні', '{n} · all within window'],

    // закриття роботи
    close_job:  ['Закрити роботу', 'Close job'],
    labour:     ['Робота', 'Labour'],
    parts:      ['Запчастини', 'Parts'],
    paid_by:    ['Чим платив', 'Paid by'],
    pay_card:   ['Картка', 'Card'],
    pay_cash:   ['Готівка', 'Cash'],
    pay_transf: ['Переказ', 'Transfer'],
    total:      ['Разом', 'Total'],
    mark_paid:  ['Оплачено — закрити', 'Mark as paid & close'],
    invoice_en: ['Рахунок клієнту піде англійською.', 'Invoice goes to the client in English.'],
    mot_set:    ['Нагадування про MOT — на {d}.', 'MOT reminder set for {d}.'],
    cancel:     ['Скасувати', 'Cancel'],
    closed_ok:  ['Роботу закрито ✓', 'Job closed ✓'],

    // попередження
    demo_title: ['Демонстрація на вигаданих даних',
                 'Demo on made-up data'],
    demo_body:  ['Бази ще немає. Люди, авто й суми вигадані — жодного реального клієнта. Кнопки працюють, але зміни живуть до перезавантаження сторінки.',
                 'No database yet. People, cars and amounts are made up — no real clients. Buttons work, but changes live until you reload.'],
    rates_warn: ['Ставки не узгоджені: {a}% / {b}%, поріг {t}, вікно {w} міс — припущення, не домовленість.',
                 'Rates not agreed: {a}% / {b}%, threshold {t}, window {w} months — an assumption, not an agreement.'],
    no_access:  ['Цього ви не бачите', 'You do not see this'],
    no_access_d:['Ця роль не має доступу до цього екрана. Так вирішує база, не інтерфейс.',
                 'This role has no access to this screen. The database decides that, not the interface.'],
    viewing_as: ['Дивимось очима', 'Viewing as']
  };

  let lang = 'ua';
  const idx = () => (lang === 'ua' ? 0 : 1);

  function t(key, vars) {
    const row = S[key];
    if (!row) return key;
    let out = row[idx()];
    if (vars) {
      Object.keys(vars).forEach(k => {
        out = out.split('{' + k + '}').join(vars[k]);
      });
    }
    return out;
  }

  return {
    t,
    get lang() { return lang; },
    set(l) { lang = (l === 'en' ? 'en' : 'ua'); document.documentElement.lang = (l === 'en' ? 'en-GB' : 'uk'); },
    toggle() { this.set(lang === 'ua' ? 'en' : 'ua'); }
  };
})();
