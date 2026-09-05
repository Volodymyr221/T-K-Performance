/* ═══════════════════════════════════════════════════════════════════
   T&K Workshop Desk — екрани і стан

   Ванільний JS без бібліотек, як і сайт. Дані беруться ТІЛЬКИ через
   TK.db — цей файл не знає, що під ним зараз фальшивка, і не має знати.
   ═══════════════════════════════════════════════════════════════════ */
window.TK = window.TK || {};

(function () {
  'use strict';

  const t = (k, v) => TK.i18n.t(k, v);
  const db = TK.db;
  const $ = (sel, root) => (root || document).querySelector(sel);

  const state = { screen: 'today', clientId: null, query: '', period: null, closing: null };

  /* ── дрібні помічники ─────────────────────────────────────────── */
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // 🔴 Британський формат дати. Перевернути на mm/dd — це записати
  // клієнта не на той день.
  const fmtDate = (isoStr) => {
    if (!isoStr) return '—';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  };
  const fmtDay = (isoStr) => isoStr ? isoStr.split('-').slice(1).reverse().join('/') : '—';
  const fmtTime = (dt) => String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
  const money = (n) => db.settings().currency + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money0 = (n) => db.settings().currency + Math.round(Number(n)).toLocaleString('en-GB');
  const daysBetween = (isoStr) => Math.round((new Date(isoStr) - new Date()) / 86400000);
  const OURS = ['website', 'phone_ad', 'instagram'];
  const isOurs = (src) => OURS.includes(src);

  const srcChip = (src) =>
    `<span class="src ${isOurs(src) ? 'src--ours' : ''}">${esc(t('src_' + src))}</span>`;

  const localised = (v) => (v && typeof v === 'object') ? v[TK.i18n.lang] : v;

  function toast(msg) {
    const old = $('.toast'); if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  /* ═══ БІЧНА КОЛОНКА ═════════════════════════════════════════════ */
  function renderSide(counts) {
    const me = db.me();
    const nav = [
      ['today',   'nav_today',   counts.bookings],
      ['clients', 'nav_clients', null],
      ['report',  'nav_report',  null]
    ];
    const roleNote = {
      owner: t('role_full'), manager: t('role_nomoney'),
      mechanic: t('role_nomoney'), partner: t('role_nonames')
    }[me.role];

    $('#side').innerHTML = `
      <div class="side__brand">
        <span class="mstripe" aria-hidden="true"><i></i><i></i><i></i></span>
        <b>T&amp;K Desk</b>
      </div>
      <nav class="side__nav">
        ${nav.map(([id, key, n]) => `
          <button data-go="${id}" class="${state.screen === id ? 'on' : ''}">
            <span class="dot"></span>${esc(t(key))}
            ${n ? `<span class="cnt">${n}</span>` : ''}
          </button>`).join('')}
      </nav>

      <div class="side__lang">
        <div class="k">${TK.i18n.lang === 'ua' ? 'Мова' : 'Language'}</div>
        <div class="seg" role="group">
          <button data-lang="ua" aria-pressed="${TK.i18n.lang === 'ua'}">УКР</button>
          <button data-lang="en" aria-pressed="${TK.i18n.lang === 'en'}">ENG</button>
        </div>
      </div>

      <div class="side__user">
        <div class="k">${esc(t('viewing_as'))}</div>
        <select id="who">
          ${db.staff().map(s => `<option value="${s.id}" ${s.id === me.id ? 'selected' : ''}>
             ${esc(s.name)} — ${esc(t('role_' + s.role))}</option>`).join('')}
        </select>
        <div class="role">${esc(roleNote)}</div>
      </div>`;
  }

  function renderTabs() {
    const tabs = [['today', 'nav_today'], ['clients', 'nav_clients'], ['report', 'nav_report']];
    $('#tabs').innerHTML = tabs.map(([id, key]) => `
      <button data-go="${id}" class="${state.screen === id ? 'on' : ''}">
        <i></i>${esc(t(key))}
      </button>`).join('');
  }

  /* ═══ ПОПЕРЕДЖЕННЯ ══════════════════════════════════════════════ */
  function warnings() {
    const s = db.settings();
    let out = `
      <div class="warn">
        <span class="ic">▲</span>
        <div><b>${esc(t('demo_title'))}</b><p>${esc(t('demo_body'))}</p></div>
      </div>`;
    if (!db.ratesAgreed()) {
      out += `
      <div class="warn">
        <span class="ic">▲</span>
        <div><p>${esc(t('rates_warn', {
          a: s.rate_labour * 100, b: s.rate_parts * 100,
          t: money0(s.threshold_gbp), w: s.window_months
        }))}</p></div>
      </div>`;
    }
    return out;
  }

  function denied() {
    return `<div class="panel"><div class="empty">
      <b style="display:block;color:var(--txt);margin-bottom:6px">${esc(t('no_access'))}</b>
      ${esc(t('no_access_d'))}
    </div></div>`;
  }

  /* ═══ ЕКРАН: СЬОГОДНІ ═══════════════════════════════════════════ */
  async function screenToday() {
    // Партнер бачить лише цифри — операційний день не його справа.
    if (!db.can('clients')) {
      $('#title').textContent = t('nav_today');
      $('#sub').textContent = '';
      $('#tools').innerHTML = '';
      $('#scroll').innerHTML = warnings() + denied();
      return;
    }

    const [list, enq, stats] = await Promise.all([db.today(), db.newEnquiries(), db.todayStats()]);
    const today = new Date();

    $('#title').textContent = t('nav_today');
    $('#sub').textContent = fmtDate(today.toISOString().slice(0, 10));
    $('#tools').innerHTML = '';

    $('#scroll').innerHTML = warnings() + `
      <div class="tiles">
        <div class="tile"><div class="k">${esc(t('booked_in'))}</div><div class="v">${stats.booked}</div>
          <div class="d">${stats.booked - stats.inShop} ${esc(t('not_arrived'))}</div></div>
        <div class="tile"><div class="k">${esc(t('in_shop'))}</div><div class="v">${stats.inShop}</div></div>
        <div class="tile"><div class="k">${esc(t('waiting'))}</div><div class="v">${stats.waiting}</div></div>
        <div class="tile tile--accent"><div class="k">${esc(t('from_site'))}</div>
          <div class="v">${stats.fromSite}</div>
          <div class="d">${esc(t('of_today', { n: stats.booked }))}</div></div>
      </div>

      <div class="cols">
        <div class="panel">
          <div class="panel__h"><h2>${esc(t('diary_for'))}</h2>
            <span class="n">${esc(t('slots', { n: list.length }))}</span></div>
          ${list.map(b => {
            const done = b.status === 'collected';
            return `
            <div class="slot">
              <span class="t">${fmtTime(b.from)}</span>
              <div class="who">
                <div class="nm">${esc(b.clientRef.name)}</div>
                <div class="jb">${esc(localised(b.job))}</div>
              </div>
              <div class="car-wrap">
                <div class="car">${esc(b.vehicleRef.model)} ${esc(b.vehicleRef.series)}</div>
                <span class="reg">${esc(b.vehicleRef.reg)}</span>
              </div>
              <div class="tags"><span class="pill pill--${b.status}">${esc(t('st_' + b.status))}</span></div>
              <div class="tags">${srcChip(b.clientRef.source)}</div>
              <div class="act">
                <button class="btn ${done ? 'btn--ghost' : ''}" data-close="${b.id}" ${done ? 'disabled' : ''}>
                  ${done ? esc(t('st_collected')) : esc(t('close_job'))}
                </button>
              </div>
            </div>`;
          }).join('')}
        </div>

        <div class="panel">
          <div class="panel__h"><h2>${esc(t('new_enq'))}</h2>
            <span class="n">${esc(t('from_site_n', { n: enq.length }))}</span></div>
          ${enq.length ? enq.map(e => `
            <div class="lead">
              <div class="lead__top"><b>${esc(e.name)}</b><time>${fmtTime(e.at)}</time></div>
              <div class="ln">${esc(e.phone)}</div>
              <p class="msg">“${esc(e.message)}”</p>
              <div class="utm">${esc(e.utm.source)} · ${esc(e.utm.campaign)}</div>
              <div class="lead__act">
                <button class="btn" data-book="${e.id}">${esc(t('book_in'))}</button>
                <button class="btn btn--ghost">${esc(t('call_back'))}</button>
              </div>
            </div>`).join('') : `<div class="empty">${esc(t('no_enq'))}</div>`}
        </div>
      </div>`;
  }

  /* ═══ ЕКРАН: КЛІЄНТИ ════════════════════════════════════════════ */
  async function screenClients() {
    if (!db.can('clients')) {
      $('#title').textContent = t('clients_h');
      $('#sub').textContent = ''; $('#tools').innerHTML = '';
      $('#scroll').innerHTML = warnings() + denied();
      return;
    }
    if (state.clientId) return screenClientCard();

    const list = await db.clients(state.query);
    $('#title').textContent = t('clients_h');
    $('#sub').textContent = list.length;
    $('#tools').innerHTML =
      `<input class="search" id="q" type="search" placeholder="${esc(t('search_ph'))}" value="${esc(state.query)}">`;

    $('#scroll').innerHTML = warnings() + `
      <div class="panel">
        ${list.length ? list.map(c => `
          <button class="crow" data-client="${c.id}">
            <div>
              <div class="nm">${esc(c.name)}</div>
              <div class="ph">${esc(c.phone)}</div>
            </div>
            <div class="cars">${c.vehicles.map(v => esc(v.model) + ' ' + esc(v.series)).join(' · ') || '—'}</div>
            <div>${srcChip(c.source)}</div>
            <div class="vis">${c.visits} ${esc(t('visits'))}</div>
          </button>`).join('') : `<div class="empty">${esc(t('nothing'))}</div>`}
      </div>`;

    const q = $('#q');
    if (q) {
      q.addEventListener('input', () => {
        state.query = q.value;
        clearTimeout(q._tm);
        q._tm = setTimeout(async () => {
          await screenClients();
          const nq = $('#q'); if (nq) { nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); }
        }, 160);
      });
    }
  }

  async function screenClientCard() {
    const c = await db.client(state.clientId);
    if (!c) { state.clientId = null; return screenClients(); }

    const left = c.expires ? daysBetween(c.expires) : null;
    const live = left !== null && left > 0 && !c.pre_existing && isOurs(c.source);
    const pct = live ? Math.max(2, Math.min(100, 100 - (left / (db.settings().window_months * 30.4) * 100))) : 0;

    $('#title').textContent = t('clients_h');
    $('#sub').textContent = '/ ' + c.name;
    $('#tools').innerHTML = `<button class="btn btn--ghost" data-go="clients">← ${esc(t('back'))}</button>`;

    let windowCell;
    if (c.pre_existing) {
      windowCell = `<div class="v">${esc(t('pre_exist'))}</div>`;
    } else if (!isOurs(c.source)) {
      windowCell = `<div class="v mono muted">${esc(t('no_window'))}</div>`;
    } else if (live) {
      windowCell = `<div class="v mono blue">${esc(t('days_left', { d: fmtDate(c.expires), n: left }))}</div>
                    <div class="bar"><i style="width:${pct.toFixed(0)}%"></i></div>`;
    } else {
      windowCell = `<div class="v mono muted">${esc(t('window_over', { d: fmtDate(c.expires) }))}</div>`;
    }

    $('#scroll').innerHTML = warnings() + `
      <div class="chead">
        <div>
          <h2>${esc(c.name)}</h2>
          <div class="meta">${esc(c.phone)} · ${esc(c.postcode || '—')} · ${c.jobs.length} ${esc(t('visits'))}</div>
        </div>
      </div>

      <div class="attr ${live ? '' : 'attr--dead'}">
        <div class="f"><div class="k">${esc(t('source'))}</div>
          <div class="v ${isOurs(c.source) ? 'blue' : ''}">${esc(t('src_' + c.source))}</div></div>
        <div class="f"><div class="k">${esc(t('ours_from'))}</div>
          <div class="v mono">${c.attributed ? fmtDate(c.attributed) : '—'}</div></div>
        <div class="f"><div class="k">${esc(t('window_till'))}</div>${windowCell}</div>
      </div>

      <div class="cols">
        <div class="panel">
          <div class="panel__h"><h2>${esc(t('history'))}</h2>
            <span class="n">${c.jobs.length} ${esc(t('visits'))}</span></div>
          <div class="tw"><table>
            <thead><tr>
              <th>${esc(t('th_date'))}</th><th>${esc(t('th_job'))}</th>
              <th class="num">${esc(t('th_labour'))}</th><th class="num">${esc(t('th_parts'))}</th>
              <th class="num">${esc(t('th_total'))}</th>
              ${db.can('commissions') ? `<th class="num">${esc(t('th_ours'))}</th>` : ''}
            </tr></thead>
            <tbody>
              ${c.jobs.map(j => `<tr>
                <td class="dt">${fmtDate(j.done)}</td>
                <td>${esc(localised(j.desc))}</td>
                <td class="num">${j.labour.toFixed(2)}</td>
                <td class="num">${j.parts.toFixed(2)}</td>
                <td class="num">${(j.labour + j.parts).toFixed(2)}</td>
                ${db.can('commissions') ? `<td class="num ${j.commission.amount ? 'ours' : 'muted'}">
                   ${j.commission.amount ? j.commission.amount.toFixed(2) : '—'}</td>` : ''}
              </tr>`).join('')}
            </tbody>
            ${db.can('commissions') ? `<tfoot><tr>
              <td colspan="2">${esc(t('total_win'))}</td>
              <td class="num">${c.totals.labour.toFixed(2)}</td>
              <td class="num">${c.totals.parts.toFixed(2)}</td>
              <td class="num">${c.totals.total.toFixed(2)}</td>
              <td class="num ours">${c.totals.commission.toFixed(2)}</td>
            </tr></tfoot>` : ''}
          </table></div>
        </div>

        <div class="stack">
          <div class="panel">
            <div class="panel__h"><h2>${esc(t('vehicles_h'))}</h2></div>
            ${c.vehicles.map(v => `
              <div class="veh">
                <span class="badge">${esc(v.series)}</span>
                <div><b>${esc(v.model)}</b>
                  <div class="l">${v.year} · ${esc(v.engine)} · ${(v.mileage / 1000).toFixed(0)}k</div></div>
                <div class="r">${esc(v.reg)}<br><em>MOT ${fmtDate(v.mot)}</em></div>
              </div>`).join('')}
          </div>

          <div class="panel">
            <div class="panel__h"><h2>${esc(t('src_history'))}</h2><span class="n">audit</span></div>
            <ul class="trail">
              ${c.audit.map(a => `<li>
                <time>${fmtDate(a.at.toISOString().slice(0, 10))} ${fmtTime(a.at)}</time>
                <div><b>${a.to ? esc(t('src_' + a.to)) : esc(a.actor || '')}</b>
                  <div class="by">${esc(localised(a.note))}</div></div>
              </li>`).join('')}
              <li><time>—</time><div><b>${esc(t('no_manual'))}</b>
                <div class="by">${esc(t('no_manual_d'))}</div></div></li>
            </ul>
          </div>
        </div>
      </div>`;
  }

  /* ═══ ЕКРАН: ЗВІТ ═══════════════════════════════════════════════ */
  async function screenReport() {
    if (!db.can('commissions')) {
      $('#title').textContent = t('report_h');
      $('#sub').textContent = ''; $('#tools').innerHTML = '';
      $('#scroll').innerHTML = warnings() + denied();
      return;
    }

    const periods = await db.periods();
    if (!state.period || !periods.includes(state.period)) {
      // За замовчуванням — попередній ПОВНИЙ місяць, не поточний.
      // Гроші звіряють за місяць, який уже закінчився; поточний ще йде,
      // і 5-го числа він показував би «1 клієнт» і виглядав зламаним.
      const now = new Date();
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString().slice(0, 7);
      state.period = periods.includes(prev) ? prev : periods[0];
    }
    const [r, months] = await Promise.all([db.report(state.period), db.commissionByMonth(6)]);
    const s = db.settings();

    const MONTHS_UA = ['СІЧ','ЛЮТ','БЕР','КВІ','ТРА','ЧЕР','ЛИП','СЕР','ВЕР','ЖОВ','ЛИС','ГРУ'];
    const MONTHS_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const mn = TK.i18n.lang === 'ua' ? MONTHS_UA : MONTHS_EN;
    // Стеля 80%, не 100%: над стовпчиком стоїть підпис, і на повній
    // висоті він вилазить за межі графіка.
    const peak = Math.max(1, ...months.map(m => m.amount));

    $('#title').textContent = t('report_h');
    $('#sub').textContent = state.period;
    $('#tools').innerHTML = `<select class="search" id="period">
      ${periods.map(p => `<option ${p === state.period ? 'selected' : ''}>${p}</option>`).join('')}
    </select>`;

    const exRows = [
      ['below_threshold', t('ex_below', { t: money0(s.threshold_gbp) }), t('ex_below_d')],
      ['pre_existing',    t('ex_pre'),    t('ex_pre_d')],
      ['window_expired',  t('ex_window'), t('ex_window_d', { n: s.window_months })],
      ['not_our_source',  t('ex_source'), t('ex_source_d')]
    ].filter(([k]) => r.excluded[k] > 0);

    $('#scroll').innerHTML = warnings() + `
      <div class="hero3">
        <div class="h"><div class="k">${esc(t('r_clients'))}</div><div class="v">${r.clients}</div>
          <div class="d">${esc(t('r_of_jobs', { n: r.totalJobs }))}</div></div>
        <div class="h"><div class="k">${esc(t('r_revenue'))}</div><div class="v">${money0(r.revenue)}</div>
          <div class="d">${esc(t('r_split', { l: money0(r.labour), p: money0(r.parts) }))}</div></div>
        <div class="h h--pay"><div class="k">${esc(t('r_due'))}</div><div class="v">${money0(r.commission)}</div>
          <div class="d">${esc(t('r_formula', { a: s.rate_labour * 100, b: s.rate_parts * 100 }))}</div></div>
      </div>

      <div class="cols">
        <div class="panel">
          <div class="panel__h"><h2>${esc(t('r_counted'))}</h2>
            <span class="n">${esc(t('all_in_win', { n: r.rows.filter(x => x.commission.status === 'due').length }))}</span></div>
          ${r.rows.length ? `<div class="tw"><table>
            <thead><tr>
              <th>${esc(t('th_date'))}</th><th>${esc(t('th_client'))}</th><th>${esc(t('th_job'))}</th>
              <th class="num">${esc(t('th_labour'))}</th><th class="num">${esc(t('th_parts'))}</th>
              <th class="num">${esc(t('th_ours'))}</th>
            </tr></thead>
            <tbody>
              ${r.rows.map(x => `<tr>
                <td class="dt">${fmtDay(x.done)}</td>
                <td>${esc(x.display)}</td>
                <td>${esc(localised(x.desc))}</td>
                <td class="num">${x.labour.toFixed(2)}</td>
                <td class="num">${x.parts.toFixed(2)}</td>
                <td class="num ${x.commission.amount ? 'ours' : 'muted'}">
                  ${x.commission.amount ? x.commission.amount.toFixed(2) : '—'}</td>
              </tr>`).join('')}
            </tbody>
            <tfoot><tr>
              <td colspan="3">${esc(state.period)}</td>
              <td class="num">${r.labour.toFixed(2)}</td>
              <td class="num">${r.parts.toFixed(2)}</td>
              <td class="num ours">${r.commission.toFixed(2)}</td>
            </tr></tfoot>
          </table></div>` : `<div class="empty">${esc(t('r_nothing'))}</div>`}
        </div>

        <div class="stack">
          <div class="panel"><div class="chart">
            <div class="chart__h"><h2>${esc(t('r_bymonth'))}</h2><span class="u">${s.currency}</span></div>
            <div class="bars" style="grid-template-columns:repeat(${months.length},1fr)">
              ${months.map((m, i) => `
                <div class="col ${i === months.length - 1 ? 'col--now' : ''}">
                  <span class="val">${m.amount ? Math.round(m.amount) : '0'}</span>
                  <span class="stem" style="height:${(m.amount / peak * 80).toFixed(1)}%"></span>
                </div>`).join('')}
            </div>
            <div class="axis" style="grid-template-columns:repeat(${months.length},1fr)">
              ${months.map(m => `<span class="mo">${mn[m.month]}</span>`).join('')}
            </div>
          </div></div>

          <div class="panel">
            <div class="panel__h"><h2>${esc(t('r_notcounted'))}</h2></div>
            ${exRows.length ? `<ul class="trail">
              ${exRows.map(([k, title, sub]) => `<li>
                <time>${esc(t('jobs_n', { n: r.excluded[k] }))}</time>
                <div><b>${esc(title)}</b><div class="by">${esc(sub)}</div></div>
              </li>`).join('')}
            </ul>` : `<div class="empty">—</div>`}
          </div>
        </div>
      </div>`;
  }

  /* ═══ ВІКНО «ЗАКРИТИ РОБОТУ» ════════════════════════════════════
     🔴 Механік вводить лише роботу й запчастини. Жодного відсотка на
     екрані немає — комісію рахує система. Хто вводить факти, той не
     має бачити, як від них рахуються чужі гроші. */
  async function openClose(bookingId) {
    const list = await db.today();
    const b = list.find(x => x.id === bookingId);
    if (!b) return;
    state.closing = { id: bookingId, labour: '', parts: '', pay: 'card' };

    const box = document.createElement('div');
    box.className = 'modal';
    box.innerHTML = `
      <div class="modal__box" role="dialog" aria-modal="true" aria-label="${esc(t('close_job'))}">
        <div class="modal__h">
          <h2>${esc(t('close_job'))}</h2>
          <span class="reg">${esc(b.vehicleRef.reg)}</span>
        </div>
        <div class="modal__b">
          <div class="fld"><div class="k">${esc(t('labour'))}</div>
            <div class="in"><span class="cur">${db.settings().currency}</span>
              <input id="labour" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" autofocus></div></div>
          <div class="fld"><div class="k">${esc(t('parts'))}</div>
            <div class="in"><span class="cur">${db.settings().currency}</span>
              <input id="parts" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00"></div></div>
          <div class="fld"><div class="k">${esc(t('paid_by'))}</div>
            <div class="pays">
              <button data-pay="card" aria-pressed="true">${esc(t('pay_card'))}</button>
              <button data-pay="cash" aria-pressed="false">${esc(t('pay_cash'))}</button>
              <button data-pay="transfer" aria-pressed="false">${esc(t('pay_transf'))}</button>
            </div></div>
          <div class="sum">
            <div class="row"><span>${esc(t('labour'))}</span><span class="n" id="sl">${money(0)}</span></div>
            <div class="row"><span>${esc(t('parts'))}</span><span class="n" id="sp">${money(0)}</span></div>
            <div class="row row--tot"><span>${esc(t('total'))}</span><span class="n" id="st">${money(0)}</span></div>
          </div>
          <p class="note"><b>${esc(t('invoice_en'))}</b> ${esc(t('mot_set', { d: fmtDate(b.vehicleRef.mot) }))}</p>
        </div>
        <div class="modal__f">
          <button class="btn btn--ghost" data-cancel>${esc(t('cancel'))}</button>
          <button class="btn" data-save>${esc(t('mark_paid'))}</button>
        </div>
      </div>`;
    document.body.appendChild(box);

    const recount = () => {
      const l = Number($('#labour', box).value) || 0;
      const p = Number($('#parts', box).value) || 0;
      $('#sl', box).textContent = money(l);
      $('#sp', box).textContent = money(p);
      $('#st', box).textContent = money(l + p);
    };
    $('#labour', box).addEventListener('input', recount);
    $('#parts', box).addEventListener('input', recount);
    $('#labour', box).focus();

    box.addEventListener('click', async (e) => {
      const pay = e.target.closest('[data-pay]');
      if (pay) {
        box.querySelectorAll('[data-pay]').forEach(x => x.setAttribute('aria-pressed', String(x === pay)));
        state.closing.pay = pay.dataset.pay;
        return;
      }
      if (e.target.closest('[data-cancel]') || e.target === box) { box.remove(); state.closing = null; return; }
      if (e.target.closest('[data-save]')) {
        await db.closeJob(bookingId,
          $('#labour', box).value, $('#parts', box).value, state.closing.pay);
        box.remove(); state.closing = null;
        toast(t('closed_ok'));
        render();
      }
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { box.remove(); state.closing = null; }
    });
  }

  /* ═══ РЕНДЕР ════════════════════════════════════════════════════ */
  async function render() {
    const list = await db.today();
    renderSide({ bookings: list.length });
    renderTabs();
    if (state.screen === 'today') await screenToday();
    else if (state.screen === 'clients') await screenClients();
    else await screenReport();
  }

  /* ═══ ПОДІЇ ═════════════════════════════════════════════════════ */
  document.addEventListener('click', async (e) => {
    const go = e.target.closest('[data-go]');
    if (go) {
      state.screen = go.dataset.go;
      if (state.screen === 'clients') state.clientId = null;
      return render();
    }
    const lang = e.target.closest('[data-lang]');
    if (lang) { TK.i18n.set(lang.dataset.lang); return render(); }

    const cl = e.target.closest('[data-client]');
    if (cl) { state.clientId = cl.dataset.client; state.screen = 'clients'; return render(); }

    const close = e.target.closest('[data-close]');
    if (close && !close.disabled) return openClose(close.dataset.close);

    const bk = e.target.closest('[data-book]');
    if (bk) { await db.bookEnquiry(bk.dataset.book); toast(t('booked_ok')); return render(); }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'who') { db.switchUser(e.target.value); state.clientId = null; render(); }
    if (e.target.id === 'period') { state.period = e.target.value; render(); }
  });

  // Мова працівника — його власна: перемикаємо разом з користувачем.
  TK.i18n.set(db.me().lang);
  render();
})();
