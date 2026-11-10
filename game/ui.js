// KAITIAKI — interface
(function () {
  const G = window.G, D = G.DATA, $ = id => document.getElementById(id);
  const KEY = 'kaitiaki-save-v13';
  let S = load() || G.newState(), tab = 'All', result = null;
  { const m = /[?&]start=([2-5])/.exec(location.search); if (m) { S = G.newState(); Object.assign(S.policy, { wages: 'max', prices: 'low', credit: 'generous' }); G.autoPlay(S, +m[1]); history.replaceState(null, '', location.pathname); } } // ?start=5 lets the bot play up to a scale

  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.v === 12 ? s : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function money(k) { // k = thousands of dollars
    const neg = k < 0 ? '−' : '', a = Math.abs(k);
    if (a < 10) return neg + '$' + Math.round(a * 1000).toLocaleString();
    if (a < 1000) return neg + '$' + Math.round(a) + 'k';
    if (a < 1e6) return neg + '$' + (a / 1e3).toFixed(a < 1e4 ? 2 : 1) + 'M';
    return neg + '$' + (a / 1e6).toFixed(2) + 'B';
  }
  const num = n => (Math.abs(n) >= 10000 ? Math.round(n / 1000) + 'k' : (Math.round(n * 10) / 10).toLocaleString());
  const listName = () => (S.act <= 3 ? 'The list' : 'Supporters');
  const NAMES = { cash: 'Cash', mana: 'Mana', hands: 'Hands', industry: 'Industry', security: 'Security', tech: 'Tech', influence: 'Influence', voters: 'List', mandate: 'Mandate', cohesion: 'Cohesion', consent: 'Consent', slots: 'slots', built: 'machines built', sparWins: 'sparring wins', patrolWins: 'clean patrols', boatWins: 'sea patrols', propWorks: 'property works you built', roadWorks: 'road jobs you ran', corridorLegs: 'corridor convoys driven', sealanes: 'open sea lanes (of 6)', footholds: 'foothold to remove', timber: 'timber supply (a sawmill fed on the map)', steel: 'steel supply (a steel mill fed on the map)', food: 'food chains on the map', revived: 'regions brought back (a plant there for two years)' };
  const nm = k => (k === 'voters' ? listName() : k.startsWith('rel:') ? D.partners[k.slice(4)] + ' ≥ 60' : NAMES[k] || k);
  const SEASONS = ['Raumati · summer', 'Ngahuru · autumn', 'Takurua · winter', 'Kōanga · spring'];
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

  function chips(p) {
    const c = G.cost(S, p), out = [], bad = G.blockers(S, p);
    const add = (txt, cls) => out.push(`<span class="chip ${cls || ''}">${txt}</span>`);
    add(c.cash ? money(c.cash) : 'Free', bad.includes('cash') ? 'no' : '');
    if (c.influence) add(c.influence + ' influence', bad.includes('influence') ? 'no' : '');
    if (c.mandate) add(c.mandate + ' mandate', bad.includes('mandate') ? 'no' : '');
    const t = G.turnsFor(S, p); add(t + (t === 1 ? ' season' : ' seasons'));
    if (p.tag === 'window' && G.windowOpen(S)) add('window: −30%, faster', 'gain');
    for (const k in p.need || {}) {
      if (k === 'rel') add('every partner ≥ ' + p.need.rel, bad.some(b => b.startsWith('rel:')) ? 'no' : '');
      else add('needs ' + num(p.need[k]) + ' ' + nm(k).toLowerCase(), bad.includes(k) ? 'no' : '');
    }
    return out.join('');
  }
  function effects(p) {
    const out = [], add = (txt, pos) => out.push(`<span class="chip ${pos ? 'gain' : 'loss'}">${txt}</span>`);
    for (const k in p.inc || {}) add((k === 'cash' ? '+' + money(p.inc[k]) : '+' + num(p.inc[k]) + ' ' + nm(k).toLowerCase()) + (k === 'cash' && S.act === 1 && G.ROUTE.includes(p.id) ? ' of jobs on the route' : ' / season'), true);
    for (const k in p.gain || {}) { const v = p.gain[k]; add((v > 0 ? '+' : '−') + num(Math.abs(v)) + ' ' + nm(k).toLowerCase(), v > 0); }
    for (const k in p.rel || {}) add('+' + p.rel[k] + ' ' + D.partners[k], true);
    if (p.slots) add('+1 project slot', true);
    if (p.toAct) add('▲ zoom out: ' + D.acts[p.toAct].name, true);
    if (p.win) add('★ victory', true);
    return out.join('');
  }

  function meter(label, v, max, o = {}) {
    const pct = Math.max(0, Math.min(100, (v / max) * 100));
    return `<div class="meter"><div class="row"><span>${label}</span><span>${o.text || Math.round(v)}</span></div><div class="track"><div class="fill ${o.cls || ''}" style="width:${pct}%"></div>${o.mark ? `<div class="mark" style="left:${o.mark}%"></div>` : ''}</div></div>`;
  }

  function render() {
    const inc = G.income(S), act = D.acts[S.act];
    $('scale').textContent = `Scale ${ROMAN[S.view]} · ${D.acts[S.view].sub}`;
    $('date').textContent = `${SEASONS[S.turn % 4]} ${2027 + Math.floor(S.turn / 4)}`;
    $('steps').innerHTML = [1, 2, 3, 4, 5].concat(G.worldOpen(S) ? [6] : []).map(i => `<button data-view="${i}" ${i <= S.act || i === 6 ? '' : 'disabled'} class="${i === S.view ? 'now' : i <= S.act || i === 6 ? 'past' : ''}" title="${i <= S.act || i === 6 ? 'Zoom to this scale' : 'Not reached yet'}">${D.acts[i].name}</button>`).join('');
    $('goal').textContent = S.done.ring ? 'The Compact is signed and the ring is up. There is nothing left to build; the watch keeps itself.' : S.won ? 'The Compact is signed and the watch runs itself. One thing left: the sky tether, then the orbital ring.' : act.goal;

    const stat = (label, val, d) => `<div class="stat"><small>${label}</small><b>${val}</b>${d ? `<i class="${d.startsWith('−') ? 'neg' : ''}">${d}</i>` : ''}</div>`;
    const sgn = (v, f) => (v ? (v > 0 ? '+' : '−') + f(Math.abs(v)) : '');
    let s = stat('Cash', money(S.cash), sgn(inc.cash, money) + (S.act === 1 && S.jobs.length ? ' + route' : '')) + stat('Mana', num(S.mana), sgn(inc.mana, num)) + stat(listName(), num(S.voters), sgn(inc.voters, num)) + stat('Hands', num(S.hands)) + stat('Industry', num(S.industry));
    if (S.security) s += stat('Security', num(S.security));
    if (S.heat > 0) s += stat('Police heat', Math.round(S.heat));
    if (S.tech) s += stat('Tech', num(S.tech));
    if (S.act >= 2) s += stat('Influence', num(S.influence), sgn(inc.influence, num));
    if (S.act >= 4) s += stat('Mandates', S.mandate, 'election in ' + S.electionIn);
    if (S.act >= 5) s += stat('Cohesion', num(S.cohesion)) + stat('Footholds', S.footholds + ' / 6', S.done.compact ? '' : S.watchIn <= 0 ? 'probes due' : 'probes in ' + S.watchIn);
    $('stats').innerHTML = s;

    $('policies').innerHTML = Object.keys(D.policies).map(k => {
      const pol = D.policies[k];
      return `<div class="pol"><label>${pol.label}</label><div class="seg">${Object.keys(pol.opts).map(o => `<button data-pol="${k}" data-opt="${o}" class="${S.policy[k] === o ? 'on' : ''}">${pol.opts[o].label}</button>`).join('')}</div><div class="tip">${pol.opts[S.policy[k]].tip}</div></div>`;
    }).join('');

    let m = '';
    if (S.act >= 5) {
      m += '<h2>The great powers</h2>';
      m += meter('Attention on the south', S.gpa, 100, { cls: S.gpa >= 75 ? 'bad' : S.gpa < 55 ? '' : 'warn', text: Math.round(S.gpa) + (G.windowOpen(S) ? ' · window open' : G.pressured(S) ? ' · pressure' : '') });
      const l = S.lean, side = l > 0 ? 'Washington' : l < 0 ? 'Beijing' : 'balanced';
      m += `<div class="meter lean"><div class="row"><span>Lean</span><span>${l ? Math.abs(l) + ' → ' + side : side}</span></div><div class="track"><div class="fill ${Math.abs(l) >= 60 ? 'bad' : 'warn'}" style="left:${l < 0 ? 50 + l / 2 : 50}%;width:${Math.abs(l) / 2}%"></div><div class="mark" style="left:50%"></div></div></div>`;
      if (S.done.siz) m += meter('Papuan consent', S.consent, 100, { cls: S.consent < 30 ? 'bad' : S.consent < 60 ? 'warn' : '', mark: 60 });
    }
    if (S.act >= 3 && (S.done.png_sec || S.act >= 5)) {
      m += '<h2>Partners</h2>' + Object.keys(D.partners).map(k => meter(D.partners[k], S.rel[k], 100, { cls: S.rel[k] >= 60 ? '' : 'warn', mark: 60 })).join('');
    }
    $('meters').innerHTML = m;

    $('log').innerHTML = S.log.map(e => `<div class="${e.cls || ''}">${e.m}</div>`).join('') || '<div>Summer 2027. You own a mower.</div>';

    window.VIEW.render(S, $('scene'), () => { save(); renderStats(); }, render);

    const vis = D.projects.filter(p => G.visible(S, p));
    const cats = ['All'].concat([...new Set(vis.map(p => p.cat))]);
    if (!cats.includes(tab)) tab = 'All';
    $('tabs').innerHTML = cats.map(c => `<button data-tab="${c}" class="${c === tab ? 'on' : ''}">${c}</button>`).join('');
    $('slots').textContent = `Projects under way: ${S.active.length} / ${S.slots}`;
    $('active').innerHTML = S.active.map(a => { const p = G.P[a.id]; return `<div class="job"><b>${p.name}</b> · ${a.left} to go<div class="track"><div class="fill" style="width:${(100 * (a.total - a.left)) / a.total}%"></div></div></div>`; }).join('');
    const shown = vis.filter(p => tab === 'All' || p.cat === tab).sort((a, b) => (G.canStart(S, b) - G.canStart(S, a)) || b.act - a.act || G.cost(S, a).cash - G.cost(S, b).cash);
    $('cards').innerHTML = shown.map(p => {
      const ok = G.canStart(S, p), n = G.count(S, p.id), rep = p.rep && p.rep < 99 ? ` <small>(${n}/${p.rep})</small>` : '';
      return `<div class="card ${ok ? 'ready' : ''}"><div class="cat">${p.cat}</div><h3>${p.name}${rep}</h3><p>${p.desc}</p><div class="chips">${chips(p)}</div><div class="chips">${effects(p)}</div><button data-start="${p.id}" ${ok ? '' : 'disabled'}>Begin</button></div>`;
    }).join('') || '<p style="color:var(--muted)">Nothing to start here. End the season.</p>';
    const hz = G.horizon(S);
    $('horizon').style.display = hz.length ? '' : 'none';
    $('horizon-list').innerHTML = hz.map(p => `<div><b>${p.name}</b> — after ${p.req.filter(r => !S.done[r]).map(r => G.P[r].name).join(', ')}</div>`).join('');

    renderModal();
    save();
  }
  function renderStats() { // light refresh while walking the street
    const b = document.querySelector('#stats .stat b'); if (b) b.textContent = money(S.cash);
    document.querySelectorAll('[data-start]').forEach(btn => { btn.disabled = !G.canStart(S, G.P[btn.dataset.start]); btn.closest('.card').classList.toggle('ready', !btn.disabled); });
  }

  function describe(d) {
    if (!d) return '';
    const out = [];
    for (const k in d) {
      const v = d[k];
      if (k === 'rel') for (const r in v) out.push((v[r] > 0 ? '+' : '−') + Math.abs(v[r]) + ' ' + D.partners[r]);
      else if (k === 'cashq') out.push((v > 0 ? '+' : '−') + money(Math.abs(Math.round(v * G.quarter(S) * 100) / 100)));
      else if (k === 'bid' || k === 'dropAlliances') continue;
      else if (k === 'heat') out.push((v > 0 ? '+' : '−') + Math.abs(v) + ' police heat');
      else if (k === 'corrupt') out.push('you become corruptible');
      else if (k === 'gpa') out.push('great-power attention ' + v);
      else if (k === 'lean') out.push('lean ' + Math.abs(v) + ' toward ' + (v > 0 ? 'Washington' : 'Beijing'));
      else if (k === 'leanTo0') out.push('lean back toward balance');
      else out.push((v > 0 ? '+' : '−') + num(Math.abs(v)) + ' ' + nm(k).toLowerCase());
    }
    return out.join(' · ');
  }
  function renderModal() {
    const box = $('modal');
    let title, text, choices;
    if (result !== null) { title = result.title; text = result.text; choices = `<button class="primary" data-ok="1">Continue</button>`; }
    else if (S.pending.length) {
      const p = G.currentPending(S); title = p.title; text = p.text;
      choices = p.choices.map((c, i) => `<button data-choice="${i}" ${c.ok === false ? 'disabled' : ''}>${c.t}<small>${c.ok === false ? c.why || 'Needs 40 cohesion' : c.note || describe(c.d)}</small></button>`).join('');
    } else if (S.over) {
      title = S.over.title; text = S.over.text;
      choices = (S.over.win ? `<button class="primary" data-keep="1">${S.over.final ? 'Stay and look around' : 'Keep building — the sky is next'}</button>` : '') + `<button data-new="1">New game</button>`;
    } else { box.classList.remove('show'); return; }
    $('m-title').textContent = title; $('m-text').textContent = text; $('m-choices').innerHTML = choices;
    box.classList.add('show');
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    const d = t.dataset;
    if (d.start) G.start(S, d.start);
    else if (d.pol) S.policy[d.pol] = d.opt;
    else if (d.tab) tab = d.tab;
    else if (d.view) G.setView(S, +d.view);
    else if (d.choice !== undefined) { const title = G.currentPending(S).title, r = G.resolve(S, +d.choice); if (r) result = { title, text: r }; }
    else if (d.ok) result = null;
    else if (d.keep) G.keepPlaying(S);
    else if (d.new || t.id === 'menu') { if (d.new || confirm('Start a new game? Your current game will be lost.')) { S = G.newState(); result = null; tab = 'All'; } }
    else if (t.id === 'end') return window.PLAY.endSeason(S, () => { G.endTurn(S); render(); }, render);
    else return;
    render();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && !$('modal').classList.contains('show') && document.activeElement.tagName !== 'BUTTON') { window.PLAY.endSeason(S, () => { G.endTurn(S); render(); }, render); } });

  render();
})();
