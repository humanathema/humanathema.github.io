// KAITIAKI — rules engine (no DOM). Works in the browser and under node for simulation.
(function () {
  const DATA = typeof module !== 'undefined' ? require('./data.js') : window.DATA;
  const P = {}; DATA.projects.forEach(p => (P[p.id] = p));
  const E = {}; DATA.events.forEach(e => (E[e.id] = e));
  const BASEQ = [0, 5, 60, 300, 5000, 60000];
  const MANAX = [0, 1, 1, 2, 3, 4];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  function newState() {
    const S = {
      v: 12, turn: 0, act: 1, view: 1, cash: 3, mana: 0, hands: 1, industry: 0, security: 0, tech: 0, influence: 0, voters: 0,
      mandate: 0, cohesion: 0, consent: 40, gpa: 45, lean: 0, slots: 2,
      rel: { aus: 30, idn: 10, png: 10, sgp: 15, mys: 10, pac: 30, vnm: 5, phl: 10 },
      policy: { wages: 'fair', prices: 'market', credit: 'normal' },
      won: false, done: {}, active: [], pending: [], log: [], lastEv: {}, crisisIn: 5, electionIn: 12, over: null,
      // the current job run (home street, a suburb or a town)
      runSite: 'home', runUsed: false, gw: 6, gh: 4, mower: 100, day: 0, jobs: [], you: { x: 0, y: 2 }, crew: [], rivals: [], earned: 0, pendingBuild: null, works: {}, propWorks: 0, roadWorks: 0, siteWorks: 0, siteGuards: 0, members: 0, met: 0, lawnsDone: 0, mastered: {}, shopXp: 0, tutorXp: 0, benched: false, auto: { tutor: false },
      // city
      net: {}, rivalNet: {}, sent: {}, dispatch: 0, scrap: 0, built: 0, build: null, pool: {}, assign: {},
      // region
      towns: {}, townDev: {}, launches: 0, wind: { a: 0, s: 0 },
      // gym and patrols
      trained: false, patrolled: false, sparWins: 0, patrolWins: 0, gymAt: null, mission: [],
      // street politics
      gang: {}, heat: 0, corrupt: 0, bid: null,
      // action that moves on: boats, the corridor, the watch over Te Moana
      nz: { links: {}, fac: {}, hub: 0, rev: {}, line: {} }, barge: [], carry: null, mounts: [], mountSent: false, place: 'pn', nzWorks: 0, timber: 0, steel: 0, food: 0, revived: 0,
      levinWins: 0, fashWins: 0, raidsHeld: 0, at: {},
      escorts: 0, boatWins: 0, boat: {}, corridorLegs: 0, foot: [], footholds: 0, sealanes: 6, watchIn: 3, watchNo: 0, fleetPos: {}, exposed: { cn: 0, us: 0 },
    };
    startSeason(S);
    return S;
  }

  const count = (S, id) => S.done[id] || 0;
  const pol = S => ({ w: DATA.policies.wages.opts[S.policy.wages], p: DATA.policies.prices.opts[S.policy.prices], c: DATA.policies.credit.opts[S.policy.credit] });
  const cashMult = S => { const { w, p, c } = pol(S); return w.cash * p.cash * c.cash; };
  const windowOpen = S => S.act === 5 && S.gpa < 55;
  const pressured = S => S.act === 5 && S.gpa >= 75;

  // ───────── job runs: the home street, and (zoomed in) any suburb or town ─────────
  // The neighbourhood grows with the business: more customers means more streets to cover.
  const gridFor = n => (n <= 6 ? [6, 4] : n <= 12 ? [8, 5] : n <= 18 ? [10, 6] : [12, 7]);
  const homeOf = S => ({ x: 0, y: Math.floor(S.gh / 2) }), shopOf = S => ({ x: S.gw - 1, y: 0 });
  function spotsFor(S, site) { // every intersection except base, shop and the left edge, in a fixed shuffled order per site
    let seed = S.gw * 131 + 7; for (const ch of site) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
    const all = []; for (let x = 1; x < S.gw; x++) for (let y = 0; y < S.gh; y++) if (!(x === S.gw - 1 && y === 0)) all.push([x, y]);
    for (let i = all.length - 1; i > 0; i--) { seed = (seed * 48271) % 2147483647; const j = seed % (i + 1); const t = all[i]; all[i] = all[j]; all[j] = t; }
    return all;
  }
  const KIND = {
    lawn: { cost: 2, wear: 12, w: 1, name: 'Lawn' }, hedge: { cost: 2, wear: 6, w: 1, name: 'Hedge' }, tutor: { own: true, cost: 2, wear: 0, w: 1, name: 'Tutoring' },
    repair: { own: true, cost: 3, wear: 0, w: 2, name: 'Engine repair' }, rubbish: { cost: 3, wear: 0, w: 1.5, name: 'Rubbish run (+1 scrap)' }, garden: { cost: 4, wear: 15, w: 2.5, name: 'Landscaping' },
    fence: { own: true, cost: 4, wear: 0, w: 4, build: true, name: 'Fence' }, drive: { own: true, cost: 5, wear: 0, w: 4, build: true, name: 'Driveway' },
    wall: { own: true, cost: 4, wear: 0, w: 4, build: true, name: 'Retaining wall' }, path: { own: true, cost: 3, wear: 0, w: 4, build: true, name: 'Garden path' }, deck: { own: true, cost: 4, wear: 0, w: 4, build: true, name: 'Deck' }, shed: { own: true, cost: 5, wear: 0, w: 4, build: true, name: 'Shed' },
    road: { own: true, cost: 5, wear: 0, w: 5, build: true, name: 'Road works' },
  };
  const ROUTE = ['lawns', 'morelawns', 'tutoring', 'partner', 'hire1', 'landscaping', 'crew2', 'fences']; // earned on the home route while at Scale 1
  function homeJobs(S, all) {
    const out = [], add = (n, kind, val) => { for (let i = 0; i < n; i++) out.push({ kind, val }); };
    if (S.done.lawns) add(4, 'lawn', 1);
    for (let i = 0; i < count(S, 'morelawns'); i++) { add(2, 'lawn', 1); add(1, 'hedge', 1); }
    if (S.done.tutoring) add(1, 'tutor', 2);
    if (S.done.partner) add(1, 'repair', 4);
    if (S.done.hire1) add(3, 'lawn', 1.33);
    if (S.done.landscaping) add(2, 'garden', 6);
    if (S.done.crew2) { add(3, 'garden', 1.8); add(2, 'hedge', 1.3); }
    if (S.done.fences) { const more = ['wall', 'path', 'deck', 'shed']; add(1, 'fence', 5); add(1, 'drive', 5); add(1, more[S.turn % 4], 5); add(1, more[(S.turn + 2) % 4], 5); }
    if (S.done.truck) add(2, 'rubbish', 2);
    if (S.done.truck && S.done.fences) add(1, 'road', 6); // the compactor and the tipper together: the council's pothole list
    return all || !handed(S) ? out : out.filter(j => !ROUND[j.kind]);
  }
  // Once there is a second crew, a foreman runs the lawn round without you. It leaves your map for good.
  const ROUND = { lawn: 1, hedge: 1 }, handed = S => !!S.done.crew2 || (S.lawnsDone >= 6 && !!S.done.hire1);
  // Which machine does which job. Own one and the job takes half the daylight.
  const MACH_FOR = { drive: 'excavator', road: 'excavator', wall: 'brickpress', path: 'brickpress', fence: 'sawmill', deck: 'sawmill', shed: 'sawmill', garden: 'tractor' };
  const hasMachine = (S, type) => !!type && ((S.pool[type] || 0) > 0 || Object.keys(S.assign).some(k => S.assign[k] === type));
  const jobCost = (S, kind) => Math.max(1, Math.ceil(KIND[kind].cost * (hasMachine(S, MACH_FOR[kind]) ? 0.5 : 1)));
  // A skilled job is yours to do until you have done one of its kind; after that the crew builds them.
  const masterKey = (S, kind) => (kind === 'road' ? 'road' + roadLevel(S) : kind);
  // What the job actually is depends on what you have: a driveway is a concrete pour; with a sawmill, timber jobs are
  // milling; with an excavator, roads and walls are digging. Each is yours the first time, and any time you choose to step in.
  const jobScene = (S, kind) => (kind === 'drive' ? 'pour' : (kind === 'road' || kind === 'wall') && hasMachine(S, 'excavator') ? 'dig' : (kind === 'fence' || kind === 'deck' || kind === 'shed') && hasMachine(S, 'sawmill') ? 'mill' : 'pull');
  const isOwn = (S, kind) => { const K = KIND[kind]; if (!K.own) return false; if (kind === 'tutor') return !(S.auto && S.auto.tutor); if (!K.build) return true; const sc = jobScene(S, kind); return !S.mastered[masterKey(S, kind)] || (sc !== 'pull' && (!S.mastered['s:' + sc] || !!(S.auto && S.auto['h:' + sc]))); };
  const roundValue = S => (handed(S) ? homeJobs(S, true).filter(j => ROUND[j.kind]).reduce((a, j) => a + j.val, 0) * 0.85 : 0);
  const siteKind = site => site.split(':')[0], siteId = site => site.split(':')[1];
  function awayJobs(S, site) {
    const mix = ['lawn', 'hedge', 'garden', 'fence', 'lawn', 'repair', 'drive', 'garden', 'hedge', 'lawn'], town = siteKind(site) === 'town', n = town ? 16 : 14;
    if (S.done.waste) { mix[4] = 'rubbish'; mix[9] = 'rubbish'; }
    mix[3] = ['fence', 'wall', 'deck'][S.turn % 3]; mix[6] = ['drive', 'path', 'shed'][S.turn % 3]; if (S.done.contractor) mix[0] = 'road';
    const unit = Math.max(1, quarter(S) * 0.012) * (town ? 3 : 1) * 10 / n, out = [];
    for (let i = 0; i < n; i++) { const kind = mix[i % 10]; out.push({ kind, val: Math.round(unit * KIND[kind].w * 100) / 100 }); }
    return out;
  }
  const routeValue = S => S.jobs.reduce((a, j) => a + j.val, 0) * cashMult(S);
  const homeValue = S => homeJobs(S).reduce((a, j) => a + j.val, 0) * cashMult(S);
  const dayMax = S => 40 + (S.done.truck ? 14 : 0) + (S.done.pyrolysis ? 10 : 0);
  const siteName = site => (site === 'home' ? 'Your street' : siteKind(site) === 'city' ? NODE[siteId(site)].name : TOWN[siteId(site)].name);

  function startRun(S, site) {
    const list = site === 'home' ? homeJobs(S) : awayJobs(S, site), g = site === 'home' ? gridFor(list.length) : siteKind(site) === 'town' ? [12, 7] : [10, 6];
    S.gw = g[0]; S.gh = g[1];
    const spots = spotsFor(S, site), home = homeOf(S);
    S.jobs = list.slice(0, spots.length - 1).map((j, i) => ({ kind: j.kind, val: j.val, x: spots[i][0], y: spots[i][1], by: null, claim: -1 }));
    S.runSite = site; S.you = { x: home.x, y: home.y }; S.day = dayMax(S); S.earned = 0; S.pendingBuild = null;
    S.gymAt = !S.done.gym || S.sparWins >= 5 ? null : site === 'home' ? { x: 0, y: home.y + 1 } : { x: spots[S.jobs.length][0], y: spots[S.jobs.length][1] }; // your own garage at home; somebody else's gym anywhere else
    let n = 0, r = 0, lawnOnly = false;
    if (site === 'home') { n = handed(S) ? 2 : S.act === 1 ? Math.min(6, S.hands - 1) : 4; if (S.act === 1 && S.turn >= 5 && S.jobs.length >= 4) { r = handed(S) ? 2 : Math.min(3, 1 + Math.floor(S.jobs.length / 12)); lawnOnly = !handed(S); } }
    else if (siteKind(site) === 'city') { const id = siteId(site); n = Math.min(6, 2 * (S.sent[id] || 0) + (connected(S, id) ? 2 : 0)); r = S.rivalNet[id] ? 2 : 0; }
    else { const id = siteId(site); n = Math.min(6, 2 * (S.towns[id] || 0)); r = established(S, id) ? 0 : 1; }
    const stamina = 30 + Math.min(10, S.sparWins); // crews that train last longer
    S.crew = []; for (let i = 0; i < n; i++) S.crew.push({ x: home.x, y: home.y, day: stamina, t: -1, w: 0 });
    S.rivals = []; for (let i = 0; i < r; i++) S.rivals.push({ x: S.gw - 1, y: i % 2 ? 1 : S.gh - 1, day: (site === 'home' ? 10 + Math.min(10, S.turn) : 26) + S.gw, t: -1, w: 0, lawnOnly });
  }
  function canEnter(S, site) {
    if (S.act < 2 || S.runUsed || S.jobs.length) return false;
    if (site === 'home') return true;
    const id = siteId(site);
    return siteKind(site) === 'city' ? !NODE[id].home && (connected(S, id) || reachable(S, id)) : (S.towns[id] || 0) >= 1;
  }
  function enterRun(S, site) { if (!canEnter(S, site)) return false; S.runUsed = true; startRun(S, site); if (site !== 'home') meet(S, siteKind(site), siteId(site)); return true; }
  function finishRun(S) { // everyone finishes their day; returns a summary
    if (!S.jobs.length) return null;
    if (S.pendingBuild !== null) finishBuild(S, 0.4);
    for (let g = 0; g < 400 && tick(S); g++);
    const total = S.jobs.length, theirs = S.jobs.filter(j => j.by === 'rival').length, mine = S.jobs.filter(j => j.by && j.by !== 'rival').length, site = S.runSite;
    const r = { site, total, mine, theirs, earned: S.earned, bonus: '' };
    if (site !== 'home' && mine > theirs && mine * 2 >= total) {
      const id = siteId(site), pts = mine >= total * 0.8 ? 2 : 1;
      if (siteKind(site) === 'city' && !connected(S, id)) { S.net[id] = (S.net[id] || 0) + pts; r.bonus = `Your work tipped ${NODE[id].name}: +${pts} toward connecting it.`; if (connected(S, id)) { delete S.rivalNet[id]; log(S, 'Connected: ' + NODE[id].name, 'good'); } }
      if (siteKind(site) === 'town' && !established(S, id)) { S.towns[id] = (S.towns[id] || 0) + 1; r.bonus = `Good work on the ground in ${TOWN[id].name}: it counts as another convoy landed.`; if (established(S, id)) log(S, 'Industrial outreach established in ' + TOWN[id].name, 'good'); }
    }
    if (S.act > 1) { S.jobs = []; S.crew = []; S.rivals = []; S.runSite = 'home'; }
    return r;
  }
  function payJob(S, j, who, mult) {
    j.by = who;
    if (who === 'rival') return 0;
    const v = j.val * cashMult(S) * (mult || 1); S.cash += v; S.earned += v;
    if (j.kind === 'rubbish') S.scrap++;
    if (who === 'you') { // every job is a doorstep: this is the door-knocking, and how the club grows
      S.met++; S.voters += S.act === 1 ? 2 : 14; if (j.kind === 'lawn') S.lawnsDone++;
      if (S.met % 3 === 0) S.members++;
      if (S.met % 12 === 0) { S.mana += 1; log(S, `Kaha Tahi kai: ${S.members} households on the books now, and most of them at the table.`, 'good'); }
    }
    if (KIND[j.kind].build && j.q === undefined) { S.works[S.runSite + ':' + j.x + ',' + j.y] = { kind: j.kind, q: 0.8, lvl: j.kind === 'road' ? roadLevel(S) : 0 }; if (j.kind === 'road') S.roadWorks++; else S.propWorks++; } // built by the crew, or by you as routine once you know how
    return v;
  }
  const jobAt = (S, x, y) => S.jobs.find(j => j.x === x && j.y === y);
  // returns a short message for the UI ('' for a plain step, 'BUILD' when a build task opens)
  function arrive(S) {
    const { x, y } = S.you, j = jobAt(S, x, y), HOME = homeOf(S), SHOP = shopOf(S);
    if (x === SHOP.x && y === SHOP.y && S.mower < 70 && S.cash >= 0.2) { S.cash -= 0.2; S.mower = 100; S.day = Math.max(0, S.day - 1); return 'Mower shop: serviced for $200'; }
    if (x === HOME.x && y === HOME.y && S.done.partner && S.mower < 50 && S.day >= 3) { S.day -= 3; S.mower = 100; return 'Fixed the mower yourselves'; }
    if (S.gymAt && x === S.gymAt.x && y === S.gymAt.y && !S.trained) return 'SPAR';
    if (!j || j.by) return '';
    const k = KIND[j.kind];
    if (k.wear && S.mower <= 0) return S.done.partner ? 'Mower is dead — get it back to base (left)' : 'Mower is dead — push it to the shop (top right)';
    const dc = jobCost(S, j.kind); if (S.day < dc) return 'Not enough daylight left for this job';
    S.day -= dc; S.mower = Math.max(0, S.mower - k.wear * (S.done.engshop ? 0.5 : 1));
    if ((k.build && isOwn(S, j.kind)) || (j.kind === 'tutor' && !(S.auto && S.auto.tutor))) { S.pendingBuild = S.jobs.indexOf(j); return 'BUILD'; } // tutoring is hands-on too, unless you have handed it to your tutors
    return '+$' + Math.round(payJob(S, j, 'you') * 1000).toLocaleString();
  }
  const roadLevel = S => (S.done.civil ? 3 : S.done.contractor ? 2 : 1); // patching → resealing → building new road
  function finishBuild(S, q) { // q = 0..1 quality of the fence or driveway you just built
    if (S.pendingBuild === null) return 0;
    const j = S.jobs[S.pendingBuild]; S.pendingBuild = null; j.q = q;
    if (j.kind === 'tutor') { const lv = tutorLevel(S); S.tutorXp = (S.tutorXp || 0) + 0.5 + q; if (q >= 0.7) S.mana += 0.2; return payJob(S, j, 'you', (0.6 + 0.6 * q) * (1 + 0.15 * lv)); }
    S.works[S.runSite + ':' + j.x + ',' + j.y] = { kind: j.kind, q, lvl: j.kind === 'road' ? roadLevel(S) : 0 }; if (j.kind === 'road') S.roadWorks++; else S.propWorks++;
    S.mastered['s:' + jobScene(S, j.kind)] = true;
    if (!S.mastered[masterKey(S, j.kind)]) { S.mastered[masterKey(S, j.kind)] = true; log(S, `${KIND[j.kind].name}: done once with your own hands. The crew builds these from now on.`, 'good'); }
    return payJob(S, j, 'you', 0.5 + 0.7 * q);
  }
  function moveYou(S, dx, dy) {
    if (!S.jobs.length || S.day <= 0 || S.over || S.pending.length || S.pendingBuild !== null) return null;
    const nx = S.you.x + dx, ny = S.you.y + dy;
    if (nx < 0 || ny < 0 || nx >= S.gw || ny >= S.gh) return null;
    S.you.x = nx; S.you.y = ny; S.day--;
    return arrive(S);
  }
  function agentStep(S, a, idx) { // idx >= 0: your crew; -1: a rival firm's worker
    if (a.day <= 0) return false;
    const rival = idx < 0;
    if (a.t < 0 || S.jobs[a.t].by || (!rival && S.jobs[a.t].claim !== idx)) {
      let best = -1, bd = 1e9;
      S.jobs.forEach((j, i) => {
        if (j.by || i === S.pendingBuild || isOwn(S, j.kind) || (rival ? a.lawnOnly && j.kind !== 'lawn' && j.kind !== 'hedge' : j.claim >= 0 && j.claim !== idx)) return; // skilled jobs wait for you
        const d = Math.abs(j.x - a.x) + Math.abs(j.y - a.y);
        if (d < bd) { bd = d; best = i; }
      });
      if (best < 0) return false;
      a.t = best; a.w = 0; if (!rival) S.jobs[best].claim = idx;
    }
    const j = S.jobs[a.t]; a.day--;
    if (a.x === j.x && a.y === j.y) { if (++a.w >= KIND[j.kind].cost) { payJob(S, j, rival ? 'rival' : 'crew'); a.t = -1; } }
    else if (a.x !== j.x) a.x += Math.sign(j.x - a.x); else a.y += Math.sign(j.y - a.y);
    return true;
  }
  function tick(S) { // one beat of the working day for everyone but you
    if (!S.jobs.length) return false;
    let any = false;
    S.crew.forEach((c, i) => { if (agentStep(S, c, i)) any = true; });
    S.rivals.forEach(r => { if (agentStep(S, r, -1)) any = true; });
    return any;
  }
  function autoYou(S, steps) { // simulation bot: a plain nearest-job route
    for (let g = 0; g < (steps || 200) && S.day > 0 && S.jobs.length; g++) {
      let tgt = null, bd = 1e9;
      if (S.mower <= 0) tgt = S.done.partner ? homeOf(S) : shopOf(S);
      else S.jobs.forEach(j => { if (j.by || (j.claim >= 0 && !isOwn(S, j.kind)) || jobCost(S, j.kind) > S.day) return; const d = Math.abs(j.x - S.you.x) + Math.abs(j.y - S.you.y); if (d < bd) { bd = d; tgt = j; } });
      if (!tgt) break;
      if (S.you.x !== tgt.x) moveYou(S, Math.sign(tgt.x - S.you.x), 0); else if (S.you.y !== tgt.y) moveYou(S, 0, Math.sign(tgt.y - S.you.y)); else break;
      if (S.pendingBuild !== null) finishBuild(S, 0.7);
    }
  }

  function startSeason(S) {
    S.benched = false;
    S.trained = false; S.patrolled = false; S.earned = 0; S.sent = {}; S.runUsed = false; S.pendingBuild = null;
    if (S.done.partner) S.mower = 100; // your mechanic services it overnight
    if (S.act === 1) startRun(S, 'home'); else { S.jobs = []; S.crew = []; S.rivals = []; S.runSite = 'home'; }
    if (S.act >= 2) S.dispatch = 2 + Math.floor(S.hands / 8) + (S.done.truck ? 1 : 0);
    S.mountSent = false;
    if (S.act >= 4) S.nzWorks = Math.min(4, 1 + (S.done.mow ? 1 : 0) + Math.floor(S.industry / 80));
    if (S.act >= 3) { S.launches = 2 + (S.done.absorb2 ? 1 : 0) + (S.done.regional ? 1 : 0); S.wind = { a: Math.random() * Math.PI * 2, s: Math.random() }; }
  }
  const worldOpen = S => S.act >= 5 && platform(S) >= 3; // the stratospheric platform is what makes a suborbital hop possible
  function setView(S, v) { if (v >= 1 && v <= S.act + (worldOpen(S) ? 1 : 0)) { S.view = v; if (v === 2 && S.place && S.place !== 'pn') { S.place = 'pn'; if (S.at) delete S.at[2]; } } }

  // ───────── Scale 2: the city network ─────────
  const NODE = {}; DATA.city.forEach(n => (NODE[n.id] = n));
  // ───────── street politics: gang turf, your stance toward each, and police heat ─────────
  const GANG = {}; DATA.gangs.forEach(g => (GANG[g.id] = g));
  const turfOf = (kind, id) => DATA.gangs.find(g => (kind === 'city' ? g.nodes : g.towns).includes(id)) || null;
  const gst = (S, gid) => S.gang[gid] || (S.gang[gid] = { stance: null, rel: 0, wins: 0, met: false });
  function turfPenalty(S, kind, id) { const g = turfOf(kind, id); if (!g) return 0; const s = gst(S, g.id).stance; return s === 'war' ? 3 : s === null || s === 'tolerate' ? 2 : 0; }
  function meet(S, kind, id) { const g = turfOf(kind, id); if (g && !gst(S, g.id).met) { gst(S, g.id).met = true; S.pending.push({ type: 'gang', g: g.id }); } }
  function stanceOptions(S, gid) {
    const st = gst(S, gid), peaceMana = 15 * S.act - (st.rel >= 30 ? 10 : 0), peaceOk = st.wins >= 2 || (S.mana >= peaceMana && S.patrolWins >= 2);
    return [
      { id: 'peace', t: 'Sit down with them as equals', ok: peaceOk, why: `Needs ${peaceMana} mana and 2 clean patrols, or to have beaten them twice`, note: 'No turf penalty · +0.2 mana a season · they keep theirs, you keep yours' },
      { id: 'tolerate', t: 'Keep to yourselves', ok: true, note: 'Work on their turf stays slow (+2 to connect) · nothing else changes' },
      { id: 'tribute', t: 'Pay what they ask', ok: true, note: 'No turf penalty · costs 4% of income · −0.3 mana a season' },
      { id: 'war', t: 'Take them on', ok: true, note: 'Fists, not weapons · turf gets harder (+3) until you beat them three times · police heat climbs · they hit back' },
      { id: 'alliance', t: 'Go into business with them', ok: true, note: '+8% income, no turf penalty · police heat every season · −0.4 mana a season · a reporter may come asking' },
    ];
  }
  function setStance(S, gid, id) {
    const o = stanceOptions(S, gid).find(o => o.id === id), st = gst(S, gid); if (!o || !o.ok || st.stance === id || st.stance === 'broken') return false;
    st.stance = id; st.met = true;
    if (id === 'peace') { S.mana += 3; st.rel = Math.max(st.rel, 40); } else if (id === 'tribute') S.mana -= 2; else if (id === 'war') { S.heat += 10; st.rel = -60; } else if (id === 'alliance') { S.heat += 10; S.mana -= 3; st.rel = 50; }
    log(S, `${GANG[gid].name}: ${o.t.toLowerCase()}.`, 'event');
    return true;
  }
  const whanauCost = S => Math.round(quarter(S) * 0.5 * 100) / 100;
  function whanau(S, gid) { // community work with their families: the slow road to peace
    const st = gst(S, gid), c = whanauCost(S); if (S.cash < c || st.stance === 'war') return '';
    S.cash -= c; st.rel = Math.min(100, st.rel + 15); S.mana += 2;
    if (st.rel >= 50 && !st.recruited) { st.recruited = true; S.hands += 2; return 'Two of their young ones have started turning up at the gym. +2 hands, +2 mana.'; }
    return 'Firewood, a fixed roof, lifts to training. +2 mana, and they notice.';
  }
  function fightResult(S, gid, win) {
    const st = gst(S, gid);
    if (!win) { S.cash -= Math.round(quarter(S) * 0.2 * 100) / 100; S.mana -= 1; return 'You were put on the ground in front of your own crew. −1 mana, and a van needs new windows.'; }
    st.wins++; S.security += 1;
    if (st.wins >= 3 && st.stance === 'war') { st.stance = 'broken'; S.security += 3; S.mana += 4; log(S, GANG[gid].name + ' no longer contest your streets.', 'good'); return 'That is three. They will not contest your streets again. +4 security, +4 mana.'; }
    return `You stood, and they walked. ${st.wins} of 3. +1 security.`;
  }
  // Weapons. open = damage to someone caught with no cover at all (99 kills); peek = damage to someone hit while
  // leaning out to fire. The legal ones will not kill and draw far less attention.
  const WEAPONS = {
    air: { name: 'Air pistol', legal: true, wind: 0.32, mag: 8, reload: 1.0, open: 5, peek: 2, heat: 8 },
    bow: { name: 'Crossbow', legal: true, wind: 0.5, mag: 1, reload: 1.6, open: 9, peek: 4, heat: 12 },
    printed: { name: '3D-printed pistol', wind: 0.42, mag: 5, reload: 1.3, open: 99, peek: 4, jam: 0.15, heat: 30 },
    pistol: { name: 'Pistol', wind: 0.34, mag: 7, reload: 1.1, open: 99, peek: 4, heat: 40 },
    sawnoff: { name: 'Sawn-off shotgun', wind: 0.3, mag: 2, reload: 1.8, open: 99, peek: 6, heat: 45 },
  };
  function gunResult(S, gid, win, wid, killed) {
    const W = WEAPONS[wid], st = gst(S, gid), q = quarter(S); S.heat += W.heat + (killed ? 30 : 0); S.mana -= (W.legal ? 2 : 8) + (killed ? 10 : 0); if (!W.legal) S.corrupt += 1;
    const cost = `+${W.heat + (killed ? 30 : 0)} heat, −${(W.legal ? 2 : 8) + (killed ? 10 : 0)} mana.`;
    if (!win) { S.cash -= Math.round(q * 0.3 * 100) / 100; return `You were carried out of it${W.legal ? '' : ', and the weapon is in an evidence bag'}. ${cost}`; }
    st.wins = Math.min(3, st.wins + (W.legal ? 1 : 2)); S.security += 1;
    if (st.wins >= 3 && st.stance === 'war') { st.stance = 'broken'; S.security += 3; log(S, GANG[gid].name + ' no longer contest your streets.', 'bad'); return `${killed ? 'One of theirs is dead on the footpath. ' : ''}They will not contest your streets again, and nobody on those streets will forget how. ${cost}`; }
    return `${killed ? 'One of theirs is dead. ' : ''}They pulled back. ${st.wins} of 3. ${cost}`;
  }
  function brandish(S, gid) { // in Palmerston North a single firearm is close to the end of everything
    const st = gst(S, gid); if (st.stance !== 'war') return false;
    st.stance = 'broken'; st.wins = 3; S.heat += 60; S.mana -= 15; S.corrupt += 1;
    S.pending.push({ type: 'note', title: 'A firearm on a Palmerston North street', text: 'You did not fire it. It does not matter. The Armed Offenders Squad has your street closed within the hour, your face is on the news by six, and every parent whose kid trains at your gym is asking the same question. The gang is finished here. So, very nearly, are you.' });
    return true;
  }
  function escortResult(S, win, civ) {
    if (civ) { S.rel.png = clamp(S.rel.png - 8 * civ, 0, 100); S.mana -= 3 * civ; }
    if (!win) { S.cash -= Math.round(quarter(S) * 0.3 * 100) / 100; return `The convoy was stopped and stripped.${civ ? ' And you shot someone who lived there.' : ''}`; }
    S.security += 2; S.escorts++; S.cash += Math.round(quarter(S) * 0.4 * 100) / 100; if (!civ) S.rel.png = clamp(S.rel.png + 3, 0, 100);
    if (S.escorts === 3) return 'Third convoy through. From here the officers you trained lead the highway runs; you will not be needed on the gun again. +2 security.';
    return civ ? `The convoy got through, but ${civ} villager${civ > 1 ? 's were' : ' was'} hit. That will be remembered longer than the delivery.` : 'The convoy got through and nobody who lived there was hurt. +2 security, +3 Papua New Guinea.';
  }
  function politicsTurn(S) {
    for (const gid in S.gang) {
      const st = S.gang[gid];
      if (st.stance === 'war') { S.heat += 4; if (Math.random() < 0.25) { S.cash -= Math.round(quarter(S) * 0.3 * 100) / 100; log(S, GANG[gid].name + ' torched a trailer in the night.', 'bad'); } const mm = (st.wins >= 1 ? 'gang:' : 'fight:') + gid; if (Math.random() < 0.4 && !S.mission.includes(mm)) S.mission.push(mm); } // once you have beaten one of them, they come in numbers
      if (st.stance === 'alliance') S.heat += 3;
    }
    S.heat = Math.max(0, S.heat - 2 - (S.bid === 'member' ? 2 : 0));
    if (S.heat >= 65 && S.heat < 100 && !S.mission.includes('raid')) S.mission.push('raid'); // they come for the yard before they come for you
    if (S.heat >= 100) {
      S.cash = Math.min(S.cash, S.cash * 0.5); S.mana -= 20; S.influence = 0; S.heat = 50;
      S.pending.push({ type: 'note', title: 'Arrested', text: 'They come at six in the morning with a warrant and a camera crew. The charges mostly will not stick, but the accounts are frozen for a season, the lawyers take half of what is in them, and it will be a long time before anyone at council returns your calls.' });
    }
    const want = (m, p) => { if (Math.random() < p && !S.mission.includes(m)) S.mission.push(m); };
    if (S.done.png_sec && S.escorts < 3) want('escort', 0.35); // three runs, then your officers lead them
    if (S.done.gym && S.act >= 2 && S.sparWins < 5) want('spar', 0.25); // after five wins the coaches run the gym
    const bt = boatTier(S); if (bt && (S.boat[bt] || 0) < 3) want('boat', 0.45);
    if (S.done.corridor && S.corridorLegs < 3) want('corridor', 1);
    if (!S.mission.some(m => m.startsWith('site:'))) { // one crew, three trades: contract sites to build, and sites to keep safe
      const towns = S.act >= 3 ? townsNow(S).filter(t => !t.home && established(S, t.id)) : [], subs = DATA.city.filter(c => !c.home && connected(S, c.id)), pool = towns.length ? towns : subs, loc = pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null;
      if (loc && S.done.labourhire && S.siteWorks < 4 && S.turn % 2 === 0) S.mission.push('site:works:' + loc); else if (loc && S.done.securityarm && S.siteGuards < 3 && S.turn % 2 === 1) S.mission.push('site:guard:' + loc);
    }
    if (S.act >= 3 && S.levinWins < 3 && S.turn % 3 === 0) want('levin', 1); // the convoys from the south come back until they have been stopped three times
    if (S.act >= 3 && S.act <= 4 && S.fashWins < 2) want('fascist', 0.14);
  }

  // ───────── action that moves on with the scale ─────────
  // Street patrols: every season until you have three clean ones, then now and then, then your security arm does it without you.
  const patrolDue = S => !!S.done.patrols && !S.patrolled && S.act <= 2 && (S.patrolWins < 3 || (S.turn % 3 === 0 && !S.done.securityarm)); // once the patrol is a licensed division, its nights are spent on sites
  // Boats: 1 = a workboat in the Bight (Himatangi), 2 = an OPV in the EEZ, 3 = the straits, where people shoot.
  const boatTier = S => (S.done.darwin ? 3 : S.done.opv ? 2 : S.done.himatangi ? 1 : 0);
  function boatResult(S, tier, win, wrong) {
    if (wrong) { S.mana -= 2 * wrong; if (tier === 3) S.rel.idn = clamp(S.rel.idn - 4 * wrong, 0, 100); }
    if (!win) return wrong ? 'You fired on people who were only fishing, and the ones you were after got away.' : 'Too many slipped past. The fish, or the cargo, went with them.';
    S.boatWins++; S.boat[tier] = (S.boat[tier] || 0) + 1; S.security += 2; S.mana += 1;
    if (tier === 2) S.rel.pac = clamp(S.rel.pac + 3, 0, 100);
    if (tier === 3) { S.rel.idn = clamp(S.rel.idn + 3, 0, 100); S.cohesion += 1; }
    const last = S.boat[tier] >= 3, what = ['', 'The Bight is quiet', 'The EEZ is patrolled', 'The straits are open'][tier];
    return `${what}. +2 security, +1 mana. Sea patrols: ${S.boatWins}.` + (last ? ' Your skippers have this water now; you move on.' : '');
  }
  function corridorResult(S, win, talked, ran, hit) {
    S.consent = clamp(S.consent + 3 * talked - 10 * ran - 20 * hit, 0, 100);
    if (hit) { S.mana -= 5; S.rel.idn = clamp(S.rel.idn - 5, 0, 100); return 'You hit someone on their own road. The convoy stops there, and so does a great deal else. −20 consent.'; }
    if (!win) return `The convoy did not make the port${ran ? ', and you drove through a roadblock people had every right to put up' : ''}. Try again next season.`;
    S.corridorLegs++; S.rel.idn = clamp(S.rel.idn + 3, 0, 100); S.rel.png = clamp(S.rel.png + 1, 0, 100);
    return `Convoy ${S.corridorLegs} of 3 reached the port, unarmed, having stopped for everyone who asked. Consent ${Math.round(S.consent)}.` + (S.corridorLegs >= 3 ? ' The corridor is open; Papuan drivers run it from here.' : '');
  }
  // The watch: great powers probe for footholds around you. What you have built is what you have to watch with.
  function fleet(S) {
    const u = [], add = (type, n) => { for (let i = 0; i < n; i++) u.push({ id: type + i, type }); };
    add('air', platform(S) >= 2 ? 1 : 0);
    add('opv', (S.done.opv ? 3 : 0) + (S.done.darwin ? 2 : 0)); // the composite upper hull buys the third ship
    add('uuv', S.done.uuv ? 4 + Math.min(4, Math.floor(S.industry / 50)) : 0);
    return u;
  }
  const watchDue = S => S.act === 5 && !S.done.compact && !S.over && S.watchIn <= 0;
  function watchSpec(S) { // who is coming, and for where
    const n = Math.min(7, 2 + Math.floor(S.watchNo / 2) + (pressured(S) ? 1 : 0)), taken = S.foot.map(f => f.site), out = [];
    const open = DATA.sea.lanes.map((l, i) => i).filter(i => !taken.includes(DATA.sea.lanes[i].site));
    for (let i = 0; i < n && open.length; i++) {
      const lane = open[rnd(0, open.length - 1)];
      out.push({ lane, power: DATA.sea.lanes[lane].power, kind: S.watchNo >= 2 && Math.random() < Math.min(0.6, 0.2 + 0.05 * S.watchNo) ? 'sub' : 'ship', delay: i * 3.2 + Math.random() * 2 });
    }
    return out;
  }
  function watchResult(S, exposed, landed) { // exposed: ['cn'|'us'...]; landed: lane indexes that got through
    exposed.forEach(pw => { S.exposed[pw]++; S.lean = clamp(S.lean + (pw === 'cn' ? 2 : -2), -100, 100); S.gpa = clamp(S.gpa - 1, 0, 100); });
    S.cohesion += Math.min(3, exposed.length);
    landed.forEach(i => {
      const l = DATA.sea.lanes[i]; if (S.foot.some(f => f.site === l.site)) return;
      S.foot.push({ site: l.site, power: l.power, lane: i }); S.rel[l.host] = clamp(S.rel[l.host] - 8, 0, 100); S.cohesion = Math.max(0, S.cohesion - 3); S.gpa = clamp(S.gpa + 4, 0, 100);
      log(S, `${l.power === 'cn' ? 'Beijing' : 'Washington'} has a foothold at ${l.site}.`, 'bad');
    });
    let extra = '';
    if (!landed.length) { S.mana += 2; for (const r in S.rel) S.rel[r] = clamp(S.rel[r] + 1, 0, 100); if (S.foot.length && Math.random() < 0.4) { const f = S.foot.shift(); S.rel[DATA.sea.lanes[f.lane].host] = clamp(S.rel[DATA.sea.lanes[f.lane].host] + 10, 0, 100); extra = ` Seeing the lanes held, ${f.site} lets its lease lapse.`; } }
    S.footholds = S.foot.length; S.sealanes = 6 - S.footholds; S.watchNo++; S.watchIn = rnd(3, 4);
    if (S.footholds >= 6) S.over = { win: false, title: 'Encircled', text: 'Six footholds ring the coalition. Every member now has a great power\'s wharf in sight of its capital, and each makes its own arrangements. There is no buffer left to build.' };
    return `${exposed.length} tracked and shown to every member at once. ${landed.length ? landed.length + ' got through and made port.' : 'Nothing got through. +2 mana, +1 with every partner.'}` + extra;
  }
  function watchAuto(S) { // simulation bot, or a watch nobody stood
    const spec = watchSpec(S), f = fleet(S), p = clamp(0.3 + 0.06 * f.length + (S.done.chain ? 0.1 : 0) + (S.done.sentinel ? 0.1 : 0) + (S.done.seamount ? 0.05 : 0) + (S.done.polar ? 0.05 : 0), 0, 0.92), ex = [], la = [];
    spec.forEach(q => (Math.random() < p ? ex.push(q.power) : la.push(q.lane)));
    return watchResult(S, ex, la);
  }
  // Trouble that happens at a place: you have to travel there on the map. Not going is a loss.
  const located = m => /^(levin|fascist|raid|boat|corridor|gang:|site:)/.test(m);
  const missionName = (S, m) => (m === 'levin' ? 'The Levin invasion' : m === 'fascist' ? 'A street movement in the Square' : m === 'raid' ? 'Police at the yard' : m === 'boat' ? 'Sea patrol' : m === 'corridor' ? 'The corridor convoy' : m.startsWith('site:works') ? 'Contract site' : m.startsWith('site:guard') ? 'Site security' : m.startsWith('gang:') ? GANG[m.slice(5)].name + ' in force' : m);
  const missionFail = (S, m) => (m.startsWith('site:') ? siteResult(S, m.split(':')[1], m.split(':')[2], 0, 0, true) : m === 'boat' ? boatResult(S, boatTier(S), false, 0) : m === 'corridor' ? corridorResult(S, false, 0, 0, 0) : fieldResult(S, m.split(':')[0], m.split(':')[1], false, 0));
  const liaisons = S => (S.done.councilrun ? 1 : 0) + (S.patrolWins >= 3 ? 1 : 0) + (S.done.allies ? 1 : 0) + (S.bid === 'member' ? 1 : 0); // officials and officers who would have to answer for it
  const muster = S => Math.min(16, 4 + Math.floor(S.hands / 6) + (S.done.securityarm ? 2 : 0) + (S.done.reserves ? 2 : 0)); // how many turn out with you
  const crewOut = S => Math.min(12, 3 + Math.floor(S.hands / 5)); // how many go out to a site with you
  function siteResult(S, kind, loc, done, lost, absent) {
    const where = (NODE[loc] || TOWN[loc] || { name: 'the site' }).name, q = quarter(S), cashStr = k => '$' + Math.round(k * 1000).toLocaleString();
    if (absent) { S.mana -= 1; return 'Nobody led the crew out to ' + where + '. The client has gone elsewhere. −1 mana.'; }
    if (kind === 'works') {
      const pay = Math.round(q * 0.5 * done * Math.max(0.4, 1 - 0.08 * lost) * 100) / 100; S.cash += pay;
      if (done >= 0.8) { S.siteWorks++; S.industry += 1; return where + ': unloaded, dug, built and handed over' + (lost ? ', ' + lost + ' lost to thieves' : ' with nothing missing') + '. ' + (S.siteWorks >= 4 ? 'Your site managers can run these without you now.' : 'Sites run: ' + S.siteWorks + ' of 4.') + ' +' + cashStr(pay) + ', +1 industry.'; }
      return where + ': dark came with the job ' + Math.round(done * 100) + '% done' + (lost ? ' and ' + lost + ' loads gone over the fence' : '') + '. Part payment: +' + cashStr(pay) + '.';
    }
    if (lost <= 1) { const pay = Math.round(q * 0.3 * 100) / 100; S.cash += pay; S.siteGuards++; S.security += 1; return where + ' was still all there in the morning' + (lost ? ', bar one thing' : '') + '. ' + (S.siteGuards >= 3 ? 'The division books and runs its own contracts from here.' : 'Sites secured: ' + S.siteGuards + ' of 3.') + ' +' + cashStr(pay) + ', +1 security.'; }
    S.mana -= 1; return where + ': ' + lost + ' things walked out through the fence overnight. No fee, and the client tells people. −1 mana.';
  }
  function fieldResult(S, kind, arg, win, out) {
    if (kind === 'levin') {
      if (!win) { S.mana -= 2; return 'They did laps of Oxford Street until four in the morning, and the town asks where you were. −2 mana.'; }
      S.levinWins++; S.mana += 3; S.voters += 100; S.security += 1;
      return S.levinWins >= 3 ? 'Boxed in, keys handed over, parents phoned. That is three: word has gone round down south, and they will not be back. +3 mana.' : `Boxed in and sent home without a punch thrown. Convoys stopped: ${S.levinWins} of 3. +3 mana, +100 on the list.`;
    }
    if (kind === 'fascist') {
      if (!win) { S.mana -= 4; S.voters = Math.round(S.voters * 0.96); const n = DATA.city.filter(c => !c.home && connected(S, c.id))[0]; if (n) { S.net[n.id] = 0; return `They held the Square, and then they marched. ${n.name} is no longer yours. −4 mana.`; } return 'They held the Square. −4 mana.'; }
      S.fashWins++; S.mana += 5; S.voters += 200; S.security += 2;
      return S.fashWins >= 2 ? 'They came for territory and left without their banners. They will not try this city again. +5 mana, +200 on the list.' : 'You held the ground and they broke first. They will be back once more. +5 mana, +200 on the list.';
    }
    if (kind === 'gang') return fightResult(S, arg, win);
    if (kind === 'raid') {
      if (win) { S.heat = Math.max(0, S.heat - 35); S.mana += 3; S.raidsHeld++; return 'Nobody raised a hand. The street was full of neighbours and cameras, a councillor was on the phone to the area commander, and the line was walked back. −35 heat, +3 mana.'; }
      S.cash = Math.min(S.cash, S.cash * 0.6); S.mana -= 8; S.influence = Math.floor(S.influence / 2); S.heat = 40;
      return 'They reached the yard. Files boxed, phones bagged, accounts frozen for a season. −8 mana, and the lawyers take their share.';
    }
    return '';
  }
  function autoMissions(S) { // simulation bot: turns up and does a decent job
    while (S.mission.length) {
      const m = S.mission.shift();
      if (m === 'escort') escortResult(S, true, 0); else if (m === 'spar') trainResult(S, true); else if (m === 'boat') boatResult(S, boatTier(S), Math.random() < 0.8, 0);
      else if (m === 'corridor') corridorResult(S, Math.random() < 0.8, 3, 0, 0); else if (m.startsWith('fight:')) fightResult(S, m.slice(6), true);
      else if (m.startsWith('site:')) siteResult(S, m.split(':')[1], m.split(':')[2], 0.9, 0);
      else if (located(m)) fieldResult(S, m.split(':')[0], m.split(':')[1], Math.random() < 0.75, 0);
    }
  }

  const needFor = (S, id) => NODE[id].need + (S.rivalNet[id] ? (S.policy.prices === 'low' ? 1 : 3) : 0) + turfPenalty(S, 'city', id);
  const connected = (S, id) => !!NODE[id].home || (S.net[id] || 0) >= needFor(S, id);
  const reachable = (S, id) => !connected(S, id) && NODE[id].adj.some(a => connected(S, a));
  function sendCrew(S, id) {
    if (S.act < 2 || S.dispatch <= 0 || !reachable(S, id)) return false;
    meet(S, 'city', id);
    S.dispatch--; S.net[id] = (S.net[id] || 0) + 1; S.sent[id] = (S.sent[id] || 0) + 1;
    if (connected(S, id)) { delete S.rivalNet[id]; log(S, 'Connected: ' + NODE[id].name, 'good'); }
    return true;
  }
  const nodeMult = (S, id) => { const m = S.assign[id]; return !m ? 1 : m === NODE[id].aff ? 2 : 1.3; };
  function netYield(S) {
    const t = { cash: 0, voters: 0, mana: 0 };
    if (S.act < 2) return t;
    DATA.city.forEach(n => { if (n.home || !connected(S, n.id)) return; const m = nodeMult(S, n.id); for (const k in n.yl) t[k] += n.yl[k] * m; });
    return t;
  }
  // The bench. Build a machine with your own hands and it is done that day, and you get better at it: each workshop
  // level takes a scrap off every machine (down to half). Leave it to the shop and it takes a season or two, and you learn nothing.
  const shopLevel = S => Math.min(5, Math.floor((S.shopXp || 0) / 3)), tutorLevel = S => Math.min(5, Math.floor((S.tutorXp || 0) / 4));
  const machineCost = (S, type) => Math.max(Math.ceil(DATA.machines[type].scrap / 2), DATA.machines[type].scrap - shopLevel(S));
  function benchStart(S, type) { if (!S.done.engshop || S.benched || !DATA.machines[type] || S.scrap < machineCost(S, type)) return false; S.scrap -= machineCost(S, type); S.benched = true; return true; }
  function benchFinish(S, type, q) {
    S.pool[type] = (S.pool[type] || 0) + 1; S.built++; const was = shopLevel(S); S.shopXp = (S.shopXp || 0) + 1 + q;
    log(S, 'Built on your own bench: ' + DATA.machines[type].name + (shopLevel(S) > was ? '. Workshop level ' + shopLevel(S) + '.' : ''), 'good');
    return shopLevel(S) > was;
  }
  function buildMachine(S, type) {
    const m = DATA.machines[type];
    if (!S.done.engshop || S.build || S.scrap < machineCost(S, type)) return false;
    S.scrap -= machineCost(S, type); S.build = { type, left: S.done.gvcs ? 1 : 2 };
    return true;
  }
  function assignMachine(S, id, type) {
    if (!connected(S, id) || NODE[id].home || !(S.pool[type] > 0)) return false;
    if (S.assign[id]) S.pool[S.assign[id]] = (S.pool[S.assign[id]] || 0) + 1;
    S.pool[type]--; S.assign[id] = type;
    return true;
  }
  function cityTurn(S) {
    if (S.act < 2) return;
    const conn = DATA.city.filter(n => !n.home && connected(S, n.id)).length;
    S.scrap += (S.done.waste ? 2 : 0) + (S.done.recycle ? 2 : 0) + Math.floor(conn / 3) + DATA.towns.filter(t => S.townDev[t.id] && S.townDev[t.id].shop).length;
    if (S.build && --S.build.left <= 0) { S.pool[S.build.type] = (S.pool[S.build.type] || 0) + 1; S.built++; log(S, 'Built in your shop: ' + DATA.machines[S.build.type].name, 'good'); S.build = null; }
    if (S.turn % 4 === 0) { // the franchise digs in somewhere you have not reached
      const open = DATA.city.filter(n => !n.home && !connected(S, n.id) && !S.rivalNet[n.id]);
      if (open.length) { const n = open[rnd(0, open.length - 1)]; S.rivalNet[n.id] = true; log(S, 'The franchise has moved into ' + n.name + '.', 'bad'); }
    }
  }
  function autoCity(S) { // simulation bot
    const gap = n => needFor(S, n.id) - (S.net[n.id] || 0);
    for (let g = 0; g < 20 && S.dispatch > 0; g++) { const n = DATA.city.filter(c => reachable(S, c.id)).sort((a, b) => gap(a) - gap(b))[0]; if (!n || !sendCrew(S, n.id)) break; }
    for (const t in DATA.machines) {
      if (!S.build) buildMachine(S, t);
      if (S.pool[t] > 0 && S.built >= 3) { const free = DATA.city.filter(c => !c.home && connected(S, c.id) && !S.assign[c.id]); const n = free.find(c => c.aff === t) || free[0]; if (n) assignMachine(S, n.id, t); }
    }
  }

  // ───────── Scale 3: launching convoys, then building up the towns ─────────
  const RANGE = 330, WIND = 46;
  const TOWN = {}; DATA.towns.forEach(t => (TOWN[t.id] = t));
  const PN = DATA.towns.find(t => t.home);
  const townNeed = (S, id) => TOWN[id].need + (turfPenalty(S, 'town', id) ? 1 : 0);
  const established = (S, id) => (S.towns[id] || 0) >= townNeed(S, id);
  const townsNow = S => { const base = DATA.towns.filter(t => !t.infill); return base.every(t => t.home || established(S, t.id)) ? DATA.towns : base; }; // the infill ring opens once the first ring is done
  const hitR = t => t.r || 24;
  const launchCost = (S, power) => Math.round(quarter(S) * 0.05 * (0.4 + 1.2 * power * power) * (S.done.pyrolysis ? 0.7 : 1));
  function landing(S, angle, power) { return { x: PN.x + (Math.cos(angle) * RANGE + Math.cos(S.wind.a) * WIND * S.wind.s) * power, y: PN.y + (Math.sin(angle) * RANGE + Math.sin(S.wind.a) * WIND * S.wind.s) * power }; }
  function launch(S, angle, power) {
    if (S.act < 3 || S.launches <= 0) return null;
    const c = launchCost(S, power); if (S.cash < c) return null;
    S.cash -= c; S.launches--;
    const { x, y } = landing(S, angle, power);
    const t = townsNow(S).find(t => !t.home && !established(S, t.id) && Math.hypot(t.x - x, t.y - y) <= hitR(t));
    if (t) { S.towns[t.id] = (S.towns[t.id] || 0) + 1; meet(S, 'town', t.id); if (established(S, t.id)) log(S, 'Industrial outreach established in ' + t.name, 'good'); }
    return { x, y, hit: t ? t.id : null, cost: c };
  }
  const townMult = (S, id) => { const d = S.townDev[id] || {}; return 1 + (d.shop ? 0.5 : 0) + (d.res ? 1 : 0); };
  const devCost = (S, what) => Math.round(quarter(S) * (what === 'shop' ? 0.3 : 0.4));
  function devTown(S, id, what) { // 'shop' = a machine shop there; 'res' = develop the local resource with the right machine
    const t = TOWN[id], d = S.townDev[id] || (S.townDev[id] = {}), c = devCost(S, what);
    if (!established(S, id) || d[what] || S.cash < c) return false;
    if (what === 'res') { if (!d.shop || !(S.pool[t.res.machine] > 0)) return false; S.pool[t.res.machine]--; S.industry += 2; }
    S.cash -= c; d[what] = true;
    log(S, what === 'shop' ? `Machine shop opened in ${t.name}` : `${t.name}: ${t.res.name} now worked and processed locally`, 'good');
    return true;
  }
  function townYield(S) {
    const t = { cash: 0, voters: 0 };
    DATA.towns.forEach(n => { if (!n.home && established(S, n.id)) { const m = townMult(S, n.id); t.cash += n.yl.cash * m; t.voters += n.yl.voters * m; } });
    return t;
  }
  function autoRegion(S) { // simulation bot: aims true, allowing for the wind
    for (let g = 0; g < 6 && S.launches > 0; g++) {
      const t = townsNow(S).find(t => !t.home && !established(S, t.id)); if (!t) break;
      const wx = Math.cos(S.wind.a) * WIND * S.wind.s, wy = Math.sin(S.wind.a) * WIND * S.wind.s; let p = Math.hypot(t.x - PN.x, t.y - PN.y) / RANGE, vx = 0, vy = 0;
      for (let i = 0; i < 4; i++) { vx = t.x - PN.x - wx * p; vy = t.y - PN.y - wy * p; p = Math.hypot(vx, vy) / RANGE; }
      if (!launch(S, Math.atan2(vy, vx), p)) break;
    }
    DATA.towns.forEach(t => { if (!t.home && established(S, t.id)) { devTown(S, t.id, 'shop'); if (S.built >= 3) devTown(S, t.id, 'res'); } });
  }

  // ───────── Scale 4: drawing the country together ─────────
  const NZN = {}; DATA.nz.nodes.forEach(n => (NZN[n.id] = n));
  const lkey = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
  const nzLink = (a, b) => DATA.nz.links.find(l => lkey(l[0], l[1]) === lkey(a, b));
  function nzDist(S, from) { // hops from a place over what you have built; electrified rail is free
    const d = { [from]: 0 }, q = [from];
    while (q.length) { q.sort((a, b) => d[a] - d[b]); const a = q.shift(); DATA.nz.links.forEach(l => { const lv = S.nz.links[lkey(l[0], l[1])]; if (!lv || (l[0] !== a && l[1] !== a)) return; const b = l[0] === a ? l[1] : l[0], nd = d[a] + (lv >= 2 ? 0 : 1); if (d[b] === undefined || nd < d[b]) { d[b] = nd; q.push(b); } }); }
    return d;
  }
  const nzOn = (S, id) => nzDist(S, 'pn')[id] !== undefined;
  const NZCOST = { road: 0.12, rail: 0.2, ferry: 0.3, wire: 0.3, plant: 0.25, line: 0.1 };
  const nzCost = (S, what) => Math.round(quarter(S) * (what === 'hub' ? 0.4 * (S.nz.hub + 1) : NZCOST[what]));
  const nzSpend = (S, what) => { const c = nzCost(S, what); if (S.act < 4 || S.nzWorks <= 0 || S.cash < c) return false; S.cash -= c; S.nzWorks--; return true; };
  function nzBuildLink(S, a, b) {
    const l = nzLink(a, b), on = nzDist(S, 'pn'); if (!l || S.nz.links[lkey(a, b)] || (on[a] === undefined && on[b] === undefined) || !nzSpend(S, l[2])) return false;
    S.nz.links[lkey(a, b)] = 1; log(S, `${l[2] === 'rail' ? 'Rail' : l[2] === 'ferry' ? 'Ferry' : 'Road'} open: ${NZN[a].name} – ${NZN[b].name}`, 'good'); nzUpdate(S); return true;
  }
  function nzElectrify(S, a, b) {
    const l = nzLink(a, b); if (!l || l[2] !== 'rail' || S.nz.links[lkey(a, b)] !== 1 || !S.done.grid || !nzSpend(S, 'wire')) return false;
    S.nz.links[lkey(a, b)] = 2; log(S, `Under the wire: ${NZN[a].name} – ${NZN[b].name}`, 'good'); nzUpdate(S); return true;
  }
  function nzHub(S) { if (S.nz.hub >= 3 || !nzSpend(S, 'hub')) return false; S.nz.hub++; S.industry += 5; log(S, 'Palmerston North industrial hub: stage ' + S.nz.hub, 'good'); nzUpdate(S); return true; }
  function nzPlant(S, id, good) { // a processing plant for one raw good, at a city or out where the resource is
    const n = NZN[id]; if (!n || !DATA.nz.goods[good] || !S.nz.hub || !nzOn(S, id) || (S.nz.fac[id] || []).includes(good)) return false;
    if (n.kind === 'iwi' && S.influence < 2) return false;
    if (!nzSpend(S, 'plant')) return false;
    (S.nz.fac[id] = S.nz.fac[id] || []).push(good);
    if (n.kind === 'iwi') { S.influence -= 2; S.mana += 3; } else if (n.kind === 'city') S.industry += 2;
    log(S, `${DATA.nz.goods[good].plant} opened ${n.kind === 'iwi' ? 'in partnership at' : 'at'} ${n.name}`, 'good'); nzUpdate(S); return true;
  }
  // A plant out in a rural district or on Māori land brings the place back: people return, the school reopens. 0–3, one step every four seasons.
  const nzRev = (S, id) => (NZN[id].kind === 'city' ? 0 : Math.floor(((S.nz.rev || {})[id] || 0) / 4));
  function nzTurn(S) {
    if (S.act < 4) return; S.nz.rev = S.nz.rev || {};
    for (const id in S.nz.fac) if (NZN[id].kind !== 'city' && nzOn(S, id) && (S.nz.rev[id] || 0) < 12) { S.nz.rev[id] = (S.nz.rev[id] || 0) + 1; if (S.nz.rev[id] % 4 === 0) log(S, `${NZN[id].name} is ${['', 'stirring: families are moving back', 'growing: the school has reopened', 'revived: young people are staying'][S.nz.rev[id] / 4]}.`, 'good'); }
    S.revived = DATA.nz.nodes.filter(n => nzRev(S, n.id) >= 2).length;
  }
  function nzChains(S) { // which resource feeds which plant, and what each is worth
    const on = nzDist(S, 'pn'), used = {}, out = [], unit = 2000, hubM = 1 + 0.15 * S.nz.hub;
    for (const id in S.nz.fac) S.nz.fac[id].forEach(good => {
      const d = nzDist(S, id), f = NZN[id], cap = f.kind === 'city' && S.nz.hub >= 2 ? 2 : 1;
      DATA.nz.nodes.filter(r => r.res === good && !used[r.id] && d[r.id] !== undefined && on[id] !== undefined).sort((a, b) => d[a.id] - d[b.id]).slice(0, cap).forEach(r => {
        used[r.id] = true; const loc = f.kind === 'city' ? 1 : f.kind === 'rural' ? 0.85 : 0.7, lv = nzRev(S, id);
        out.push({ res: r.id, at: id, good, hops: d[r.id], cash: unit * Math.max(0.4, 1 - 0.1 * d[r.id]) * loc * hubM * (1 + 0.12 * lv) * (1 + 0.05 * ((S.nz.line || {})[id] || 0)), mana: (f.kind === 'iwi' ? 0.5 + 0.2 * lv : 0) - (r.kind === 'iwi' && f.kind !== 'iwi' ? 0.5 : 0), voters: f.kind === 'rural' ? 300 + 150 * lv : 0 });
      });
    });
    DATA.nz.nodes.forEach(r => { if (r.res && !used[r.id] && on[r.id] !== undefined) out.push({ res: r.id, at: null, good: r.res, hops: 0, cash: unit * 0.25, mana: 0, voters: 0 }); }); // trucked out raw
    return out;
  }
  function nzYield(S) { const t = { cash: 0, mana: 0, voters: 0 }; if (S.act < 4 || !S.nz) return t; nzChains(S).forEach(c => { t.cash += c.cash; t.mana += c.mana; t.voters += c.voters; }); return t; }
  function nzUpdate(S) {
    DATA.nz.nodes.forEach(n => { if (n.mill && nzOn(S, n.id) && !(S.nz.fac[n.id] || []).includes(n.mill)) { (S.nz.fac[n.id] = S.nz.fac[n.id] || []).push(n.mill); S.industry += 3; log(S, n.name + ' is on your network: an existing steel mill, waiting for ironsand.', 'good'); } });
    const ch = nzChains(S).filter(c => c.at), n = o => ch.filter(c => DATA.nz.goods[c.good].out === o).length;
    S.timber = n('timber'); S.steel = n('steel'); S.food = n('food');
    if (!S.done.iwiagri && Object.keys(S.nz.fac).filter(id => NZN[id].kind === 'iwi').length >= 2) complete(S, P.iwiagri);
    if (!S.done.trunk && DATA.nz.links.filter(l => l[2] === 'rail').every(l => S.nz.links[lkey(l[0], l[1])] === 2)) complete(S, P.trunk);
  }
  // The plant grows as a line: half-round arch sheds added a module at a time, out toward the farms and forests one way
  // and into the town's industrial precinct the other. Each module is 5% more out of everything processed there.
  const NZLINE = 8;
  function nzExtend(S, id) {
    S.nz.line = S.nz.line || {}; const n = S.nz.line[id] || 0;
    if (!(S.nz.fac[id] || []).length || n >= NZLINE || !nzSpend(S, 'line')) return false;
    S.nz.line[id] = n + 1; if (n + 1 === 4 || n + 1 === NZLINE) log(S, `The line at ${NZN[id].name} is ${n + 1} sheds long${n + 1 === NZLINE ? ': housing at one end, the forest or the paddock at the other' : ''}.`, 'good'); return true;
  }

  // ───────── Offshore: the barge as a standing platform, and the seamount chain run out from it by UUV ─────────
  const BARGE = [['deck', 'Working deck'], ['shop', 'Workshop'], ['uuvbay', 'UUV bay'], ['stores', 'Stores and fuel'], ['mast', 'Relay mast']];
  const bargeCost = S => Math.round(quarter(S) * 0.2);
  function bargeLoad(S) { if (!S.done.himatangi || S.carry || S.barge.length >= BARGE.length || S.cash < bargeCost(S)) return false; S.cash -= bargeCost(S); S.carry = BARGE[S.barge.length][0]; return true; }
  function bargeDeliver(S) {
    if (!S.carry) return null; const m = BARGE[S.barge.length]; S.barge.push(S.carry); S.carry = null; S.tech += 2; S.industry += 1;
    log(S, `${m[1]} bolted onto the barge (${S.barge.length}/${BARGE.length}).`, 'good');
    if (!S.done.pipeline && S.barge.length >= 3) complete(S, P.pipeline); return m[1];
  }
  // Each seamount has a coastal state whose waters it sits near. With a working relationship there (aid, industry, shared
  // research) you have a reason to be about and nobody looks twice; without one, the great powers notice.
  const MOUNT = DATA.sea.chain.map((at, i) => ({ at, cover: [null, 'aus', 'aus', 'pac', 'pac', 'png', 'png'][i], name: ['Three Kings Ridge', 'Norfolk Ridge', 'Norfolk Island', 'Loyalty Ridge', 'Vanuatu Trench', 'Solomon Sea', 'New Britain'][i] }));
  const MKIND = { stock: 'Stockpile', relay: 'Relay', sensor: 'Sensor post' };
  const mountCost = (S, i) => (i < 2 ? 15000 : 60000);
  function mountWhy(S) {
    const i = S.mounts.length;
    if (i >= MOUNT.length) return 'The chain reaches Papua New Guinea.';
    if (!S.barge.includes('uuvbay')) return 'The barge needs its UUV bay first.';
    if (S.act < 4 || !S.done.mow) return 'This waits for a ministry in Wellington behind you.';
    if (S.boatWins < 2) return 'Two sea patrols first: you need crews who know the water.';
    if (i >= 2 && !S.done.uuv) return 'Further out needs mass-produced UUVs.';
    if (S.mountSent) return 'One site a season: the UUVs are still out.';
    if (S.cash < mountCost(S, i)) return 'You cannot afford the next site yet.';
    return '';
  }
  function mountSend(S, kind) {
    if (mountWhy(S) || !MKIND[kind]) return false;
    const i = S.mounts.length, m = MOUNT[i], legit = !m.cover || S.rel[m.cover] >= 40;
    S.cash -= mountCost(S, i); S.mountSent = true; S.mounts.push({ kind, legit });
    if (kind === 'stock') S.security += 3; else if (kind === 'relay') S.tech += 3; else { S.security += 1; S.tech += 2; }
    if (legit) { if (m.cover) S.rel[m.cover] = clamp(S.rel[m.cover] + 2, 0, 100); log(S, `${MKIND[kind]} set down at ${m.name}${m.cover ? ', alongside work ' + DATA.partners[m.cover] + ' already knows about' : ''}.`, 'good'); }
    else { S.gpa = clamp(S.gpa + 6, 0, 100); log(S, `${MKIND[kind]} set down at ${m.name}, but you have no standing with ${DATA.partners[m.cover]} to explain being there. It was noticed.`, 'bad'); }
    if (!S.done.seamount && S.mounts.length >= 2) complete(S, P.seamount);
    if (!S.done.chain && S.mounts.length >= MOUNT.length) complete(S, P.chain);
    return true;
  }
  function autoSea(S) { if (S.act < 3) return; if (bargeLoad(S)) bargeDeliver(S); mountSend(S, ['sensor', 'stock', 'relay'][S.mounts.length % 3]); }

  function autoNZ(S) { // simulation bot: hub first, then reach outward, process where the resource is, then wire the trunk
    for (let g = 0; g < 6 && S.nzWorks > 0; g++) {
      const on = nzDist(S, 'pn');
      if (!S.nz.hub) { if (!nzHub(S)) break; continue; }
      const r = DATA.nz.nodes.find(n => n.res && on[n.id] !== undefined && !(S.nz.fac[n.id] || []).includes(n.res) && (n.kind !== 'iwi' || S.influence >= 2));
      if (r && nzPlant(S, r.id, r.res)) continue;
      const l = DATA.nz.links.find(l => !S.nz.links[lkey(l[0], l[1])] && (on[l[0]] !== undefined) !== (on[l[1]] !== undefined));
      if (l && nzBuildLink(S, l[0], l[1])) continue;
      const w = DATA.nz.links.find(l => l[2] === 'rail' && S.nz.links[lkey(l[0], l[1])] === 1);
      if (w && nzElectrify(S, w[0], w[1])) continue;
      if (S.nz.hub < 3 && !l && nzHub(S)) continue;
      const x = Object.keys(S.nz.fac).find(id => ((S.nz.line || {})[id] || 0) < NZLINE);
      if (x && nzExtend(S, x)) continue;
      break;
    }
  }

  // ───────── gym and patrol: part of how the security side of the organisation grows ─────────
  function trainResult(S, win) {
    if (S.trained) return ''; S.trained = true;
    if (!win) { S.security += 0.3; return 'You got tagged. Still learned something: +0.3 security.'; }
    S.sparWins++; S.security += 1;
    if (S.sparWins === 5) return 'Fifth win. You hand the gym to the people you trained: they coach now, and you are needed elsewhere. +1 security.';
    return `Good round. +1 security. Sparring wins: ${S.sparWins}. Your crews last longer on the route.`;
  }
  function patrolResult(S, win) {
    if (S.patrolled) return ''; S.patrolled = true;
    if (!win) { S.mana -= 1; return 'It kicked off before you could get between them. −1 mana.'; }
    S.patrolWins++; S.mana += 2; S.voters += 25;
    if (S.patrolWins === 3) return 'Three clean nights. The volunteers have watched you do it enough times to lead it themselves; you will only be called out now and then. +2 mana, +25 on the list.';
    if (Math.random() < 0.3) { S.hands++; return `Everyone walked away. One of them asked about the gym. +2 mana, +25 list, +1 hands.`; }
    return `Everyone walked away. +2 mana, +25 on the list. Clean patrols: ${S.patrolWins}.`;
  }

  // ───────── economy ─────────
  function income(S) {
    const t = { cash: 0, mana: 0, voters: 0, influence: 0 };
    for (const id in S.done) {
      const p = P[id]; if (!p || !p.inc) continue;
      for (const k in p.inc) { if (k === 'cash' && S.act === 1 && ROUTE.includes(id)) continue; t[k] = (t[k] || 0) + p.inc[k] * S.done[id]; }
    }
    const ny = netYield(S), ty = townYield(S), zy = nzYield(S);
    t.cash += (S.members || 0) * 0.03 * cashMult(S); // the club: a small monthly payment from every household, set by what it can afford
    t.cash += zy.cash; t.mana += zy.mana; t.voters += zy.voters;
    if (S.act === 1) t.cash += roundValue(S); // the foreman's lawn round
    if (S.patrolWins >= 3 && !patrolDue(S)) { t.mana += 0.5; t.voters += 10; } // patrols your people now run without you
    t.cash += ny.cash + ty.cash; t.voters += ny.voters + ty.voters; t.mana += ny.mana;
    const { w, p, c } = pol(S);
    let gm = 1;
    for (const gid in S.gang) { const s = S.gang[gid].stance; if (s === 'tribute') { gm -= 0.04; t.mana -= 0.3; } else if (s === 'alliance') { gm += 0.08; t.mana -= 0.4; } else if (s === 'peace') t.mana += 0.2; }
    t.cash = Math.round(t.cash * w.cash * p.cash * c.cash * gm * 100) / 100;
    t.voters = Math.round(t.voters * w.voters * p.voters);
    if (S.done.hire1) t.mana += (w.mana + p.mana + c.mana) * MANAX[S.act]; // policies only matter once you employ people
    return t;
  }
  const quarter = S => Math.max(income(S).cash + (S.act === 1 ? homeValue(S) : 0), BASEQ[S.act]);

  function cost(S, p) {
    let cash = p.costq ? Math.round(p.costq * quarter(S)) : p.cost || 0;
    if (p.tag === 'absorb') cash = Math.round(cash * pol(S).c.absorb);
    if (p.tag === 'window' && windowOpen(S)) cash = Math.round(cash * 0.7);
    return { cash, influence: p.inf || 0, mandate: p.mandate || 0 };
  }
  const turnsFor = (S, p) => Math.max(1, p.t - (p.tag === 'window' && windowOpen(S) ? 1 : 0));

  const isActive = (S, id) => S.active.some(a => a.id === id);
  const reqsMet = (S, p) => (p.req || []).every(r => S.done[r]);
  const remaining = (S, p) => count(S, p.id) < (p.rep || 1);
  const inScope = (S, p) => !p.map && p.act <= S.act && (!p.until || S.act <= p.until) && remaining(S, p) && !isActive(S, p.id);
  const visible = (S, p) => inScope(S, p) && reqsMet(S, p);
  const horizon = S => DATA.projects.filter(p => inScope(S, p) && !reqsMet(S, p));

  function unmet(S, p) {
    const out = [];
    for (const k in p.need || {}) {
      if (k === 'rel') { for (const r in S.rel) if (S.rel[r] < p.need.rel) out.push('rel:' + r); }
      else if (S[k] < p.need[k]) out.push(k);
    }
    return out;
  }
  function blockers(S, p) {
    const c = cost(S, p), b = [];
    if (S.active.length >= S.slots) b.push('slots');
    if (S.cash < c.cash) b.push('cash');
    if (S.influence < c.influence) b.push('influence');
    if (S.mandate < c.mandate) b.push('mandate');
    return b.concat(unmet(S, p));
  }
  const canStart = (S, p) => !S.over && !S.pending.length && visible(S, p) && blockers(S, p).length === 0;

  function log(S, m, cls) { S.log.unshift({ t: S.turn, m, cls }); if (S.log.length > 60) S.log.pop(); }

  function apply(S, d) {
    if (!d) return;
    for (const k in d) {
      const v = d[k];
      if (k === 'rel') for (const r in v) S.rel[r] = clamp(S.rel[r] + v[r], 0, 100);
      else if (k === 'cashq') S.cash += Math.round(v * quarter(S) * 100) / 100;
      else if (k === 'consent') S.consent = clamp(S.consent + v, 0, 100);
      else if (k === 'gpa') S.gpa = clamp(S.gpa + v, 0, 100);
      else if (k === 'lean') S.lean = clamp(S.lean + v, -100, 100);
      else if (k === 'leanTo0') S.lean = S.lean > 0 ? Math.max(0, S.lean - v) : Math.min(0, S.lean + v);
      else if (k === 'cohesion') S.cohesion = Math.max(0, S.cohesion + v);
      else if (k === 'hands') S.hands = Math.max(1, S.hands + v);
      else if (k === 'heat') S.heat = Math.max(0, S.heat + v);
      else if (k === 'bid') S.bid = v;
      else if (k === 'dropAlliances') { for (const g in S.gang) if (S.gang[g].stance === 'alliance') S.gang[g].stance = 'tolerate'; }
      else S[k] = (S[k] || 0) + v;
    }
  }

  function start(S, id) {
    const p = P[id]; if (!canStart(S, p)) return false;
    const c = cost(S, p);
    S.cash -= c.cash; S.influence -= c.influence; S.mandate -= c.mandate;
    const t = turnsFor(S, p);
    S.active.push({ id, left: t, total: t });
    return true;
  }

  function complete(S, p) {
    S.done[p.id] = count(S, p.id) + 1;
    apply(S, p.gain); apply(S, { rel: p.rel || {} });
    if (p.slots) S.slots += p.slots;
    if (p.id === 'buyout' && S.foot.length) { const f = S.foot.shift(); S.rel[DATA.sea.lanes[f.lane].host] = clamp(S.rel[DATA.sea.lanes[f.lane].host] + 10, 0, 100); S.footholds = S.foot.length; S.sealanes = 6 - S.footholds; log(S, `${f.site} lets the lease lapse.`, 'good'); }
    log(S, 'Completed: ' + p.name, 'good');
    if (p.toAct) {
      S.act = p.toAct; S.view = p.toAct;
      const a = DATA.acts[p.toAct];
      S.pending.push({ type: 'note', title: 'Scale ' + ['', 'I', 'II', 'III', 'IV', 'V'][p.toAct] + ' — ' + a.name, text: a.intro });
      if (p.toAct === 4) S.electionIn = 12;
      if (p.toAct === 5) { S.gpa = 45; S.crisisIn = rnd(5, 8); S.watchIn = 3; }
    }
    if (p.id === 'ring') S.over = { win: true, final: true, title: 'The ring closes its first arc', text: `From the deck of the platform you watch the segment catch the sun. It started with a seized mower in Awapuni, ${Math.round(S.turn / 4)} years ago. Cohesion ${Math.round(S.cohesion)} · footholds left around you ${S.footholds} · probes exposed: Beijing ${S.exposed.cn}, Washington ${S.exposed.us} · lean ${Math.abs(S.lean)}${S.lean ? (S.lean > 0 ? ' toward Washington' : ' toward Beijing') : ''}. There is nothing left to build. The watch keeps itself.` };
    if (p.win) S.over = { win: true, title: 'Te Moana Compact is signed', text: 'From a lawnmower in Palmerston North to a standing coalition across the southern Indo-Pacific, in ' + Math.round(S.turn / 4) + ' years. Secure, employed, and nobody\'s client.' };
  }

  function pickEvent(S) {
    const pool = DATA.events.filter(e => !e.scheduled && S.act >= e.act[0] && S.act <= e.act[1] && (!e.cond || e.cond(S)) && (S.lastEv[e.id] === undefined || S.turn - S.lastEv[e.id] > 10));
    return pool.length ? pool[rnd(0, pool.length - 1)] : null;
  }
  function queueEvent(S, id) { S.lastEv[id] = S.turn; S.pending.push({ type: 'event', id }); }

  function endTurn(S) {
    if (S.over || S.pending.length) return;
    const run = finishRun(S); // crews (and any rivals) finish their day
    S.mission = S.mission.filter(m => { if (!located(m)) return true; log(S, missionName(S, m) + ': you did not go. ' + missionFail(S, m), 'bad'); return false; });
    if (watchDue(S)) watchAuto(S); if (S.over) return;
    if (run && run.total) { const missed = run.total - run.mine - run.theirs; if (missed || run.theirs) log(S, `${siteName(run.site)}: ${missed} job${missed === 1 ? '' : 's'} not reached${run.theirs ? ', ' + run.theirs + ' taken by a rival' : ''}.`, 'bad'); }
    const inc = income(S);
    S.cash += inc.cash; S.mana += inc.mana; S.voters += inc.voters; S.influence += inc.influence;
    const still = [];
    for (const a of S.active) { a.left--; if (a.left <= 0) complete(S, P[a.id]); else still.push(a); }
    S.active = still;
    S.turn++;
    cityTurn(S); nzTurn(S);
    politicsTurn(S);
    startSeason(S);
    if (S.over) return;

    if (S.act >= 4 && --S.electionIn <= 0) { queueEvent(S, 'election'); S.electionIn = 12; }

    if (S.act === 5) {
      S.watchIn--; S.gpa = clamp(S.gpa + 4 + (S.footholds >= 3 ? 1 : 0), 0, 100);
      S.lean += S.lean > 0 ? -1 : S.lean < 0 ? 1 : 0;
      if (--S.crisisIn <= 0) { queueEvent(S, 'crisis' + rnd(1, 3)); S.crisisIn = rnd(8, 12); }
      if (pressured(S) && S.cohesion < 60 && S.cohesion > 0) { S.cohesion = Math.max(0, S.cohesion - 1); log(S, 'Great-power pressure is pulling coalition members apart (−1 cohesion).', 'bad'); }
      if (S.done.siz && S.consent <= 0) {
        apply(S, { rel: { idn: -20, png: -10, pac: -10 }, cohesion: -15, mana: -20 }); S.consent = 20;
        S.pending.push({ type: 'note', title: 'Consent withdrawn', text: 'The zone is blockaded by the people it was supposed to employ. The story travels across the Pacific faster than your ships. You start again, from further back, with people who have less reason to trust you.' });
      }
    }

    if (S.turn > 2 && Math.random() < (S.act === 5 ? 0.4 : 0.3)) { const e = pickEvent(S); if (e) queueEvent(S, e.id); }

    if (Math.abs(S.lean) >= 100) S.over = { win: false, title: 'Captured', text: 'You leaned too far. The coalition is now one great power\'s forward position, and the other treats it as such. The buffer is gone.' };
    else if (S.mana <= -10) S.over = { win: false, title: 'Licence lost', text: 'Nobody will work for you, vote for you or sign with you. Mana, once spent, is expensive to buy back.' };
  }

  function currentPending(S) {
    const x = S.pending[0]; if (!x) return null;
    if (x.type === 'note') return { type: 'note', title: x.title, text: x.text, choices: [{ t: 'Continue' }] };
    if (x.type === 'gang') return { type: 'gang', title: `${GANG[x.g].name}: whose streets are these?`, text: `You have started working on ground ${GANG[x.g].name} regard as theirs. A couple of them are leaning on your van when you come out. Nobody is shouting yet. How you answer now sets the terms; you can change them later, at a price.`, choices: stanceOptions(S, x.g) };
    const e = E[x.id];
    return { type: 'event', title: e.title, text: e.text, choices: e.choices.map(c => ({ t: c.t, d: c.d, ok: !c.cond || c.cond(S), why: c.why })) };
  }
  function resolve(S, i) {
    const x = S.pending.shift(); if (!x) return '';
    if (x.type === 'note') return '';
    if (x.type === 'gang') { setStance(S, x.g, stanceOptions(S, x.g)[i].id); return ''; }
    const c = E[x.id].choices[i]; apply(S, c.d);
    log(S, E[x.id].title + ' — ' + c.t, 'event');
    return c.r || '';
  }

  const platform = S => (S.done.ring ? 5 : S.done.tether ? 4 : S.done.hap ? 3 : S.done.airship ? 2 : S.done.aerostat ? 1 : 0);
  function keepPlaying(S) { if (S.over && S.over.win) { S.over = null; S.won = true; } }
  // Development aid: let the bot play up to a scale so the later game can be tried without replaying the earlier one.
  function autoTurn(S) { // the bot plays one season
    const filler = new Set(['ring', 'koha', 'doorknock', 'campaign', 'morelawns', 'buyout']);
    {
      while (S.pending.length) resolve(S, currentPending(S).choices.findIndex(c => c.ok !== false));
      const vis = DATA.projects.filter(p => visible(S, p)), want = new Set(); vis.forEach(p => unmet(S, p).forEach(u => want.add(u)));
      if (S.done.gym && S.sparWins < 5) trainResult(S, true); if (patrolDue(S)) patrolResult(S, true);
      autoMissions(S); autoYou(S); autoCity(S); autoRegion(S); autoNZ(S); autoSea(S);
      vis.filter(p => !filler.has(p.id) || (p.id === 'ring' && S.won)).sort((a, b) => cost(S, a).cash - cost(S, b).cash).forEach(p => start(S, p.id));
      if (want.has('mana')) start(S, 'koha'); if (want.has('voters')) { start(S, 'doorknock'); start(S, 'campaign'); } if (S.act <= 2) start(S, 'morelawns'); if (S.footholds) start(S, 'buyout');
      endTurn(S);
    }
  }
  function autoPlay(S, toAct) {
    for (let i = 0; i < 400 && !S.over && S.act < toAct; i++) autoTurn(S);
    while (S.pending.length) resolve(S, currentPending(S).choices.findIndex(c => c.ok !== false));
    S.mission = []; S.log = []; S.view = S.act;
  }

  const API = {
    DATA, P, E, newState, income, quarter, cost, turnsFor, visible, horizon, unmet, blockers, canStart, start, endTurn, currentPending, resolve, windowOpen, pressured, count, platform, keepPlaying, cashMult, setView,
    homeOf, shopOf, KIND, ROUTE, routeValue, homeValue, dayMax, siteName, moveYou, tick, autoYou, canEnter, enterRun, finishRun, finishBuild, roadLevel, jobScene, WEAPONS, gunResult, isOwn, jobCost, MACH_FOR, hasMachine, shopLevel, tutorLevel, machineCost, benchStart, benchFinish, crewOut, siteResult,
    NODE, connected, needFor, reachable, sendCrew, nodeMult, netYield, buildMachine, assignMachine, autoCity,
    GANG, turfOf, gst, turfPenalty, stanceOptions, setStance, whanau, whanauCost, fightResult, brandish, escortResult, townNeed,
    RANGE, PN, TOWN, townsNow, hitR, established, launchCost, landing, launch, townMult, devCost, devTown, townYield, autoRegion, trainResult, patrolResult,
    nzRev, located, missionName, liaisons, muster, fieldResult,
    NZN, lkey, nzLink, nzDist, nzOn, nzCost, nzBuildLink, nzElectrify, nzHub, nzPlant, nzChains, nzYield, autoNZ, NZLINE, nzExtend, BARGE, bargeCost, bargeLoad, bargeDeliver, MOUNT, MKIND, mountCost, mountWhy, mountSend,
    autoTurn, worldOpen, patrolDue, boatTier, boatResult, corridorResult, fleet, watchDue, watchSpec, watchResult, watchAuto, autoMissions, autoPlay, roundValue,
  };
  if (typeof module !== 'undefined') module.exports = API; else window.G = API;
})();
