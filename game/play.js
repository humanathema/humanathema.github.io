// KAITIAKI — playable scenes (canvas): job runs (home street, suburbs, towns) · fence and driveway building ·
// city network · convoy launcher · gym sparring · strip patrol
(function () {
  const G = window.G, D = G.DATA, CW = 720, CH = 440;
  let S = null, light = () => {}, full = () => {}, host = null, cv = null, ctx = null, side = null, raf = 0, last = 0;
  let mode = null, toast = { m: '', t: 0 }, runKey = '', seenAct = 0;
  const keys = {}, mouse = { x: 0, y: 0, sx: 0, sy: 0, down: false };
  const say = m => { if (m) toast = { m, t: 3 }; };
  const money = k => '$' + (Math.abs(k) < 10 ? Math.round(k * 1000).toLocaleString() : Math.abs(k) < 1000 ? Math.round(k) + 'k' : (k / 1000).toFixed(1) + 'M');
  const modalUp = () => !!document.querySelector('.modal.show');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wants = s => s.view <= 6 || s.jobs.length > 0 || !!mode || s.mission.length > 0;
  const screen = () => (mode ? mode.type : S.jobs.length ? 'run' : S.view === 1 ? 'home' : S.view === 2 ? ((S.place || 'pn') === 'pn' ? 'city' : 'town') : S.view === 3 ? 'region' : S.view === 5 ? 'moana' : S.view === 6 ? 'world' : 'nz');
  function text(t, x, y, o = {}) { ctx.font = (o.bold ? 'bold ' : '') + (o.size || 11) * tk + 'px system-ui,sans-serif'; ctx.textAlign = o.align || 'center'; ctx.fillStyle = o.color || '#e6efe9'; ctx.fillText(t, x, y); }
  function bar(x, y, w, h, f, col, label) { ctx.fillStyle = '#0c1a1d'; ctx.fillRect(x, y, w, h); ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(f, 0, 1), h); ctx.strokeStyle = '#24464a'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w, h); if (label) text(label, x + w + 6, y + h - 2, { align: 'left', size: 11 }); }
  function disc(x, y, r, fill, stroke, lw) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); } }
  let tk = 1; const cam = { on: false, v: 0, z: 1, x: CW / 2, y: CH / 2 }, hudQ = [];
  const hud = f => (cam.on ? hudQ.push(f) : f()); // drawn on the glass, not on the ground
  function header(t) { hud(() => { ctx.fillStyle = 'rgba(8,18,20,.82)'; ctx.fillRect(0, 0, CW, 24); text(t, 8, 16, { align: 'left' }); }); }

  // ───────────────── job runs ─────────────────
  const cellW = () => 620 / (S.gw - 1), cellH = () => 336 / (S.gh - 1), siteNow = () => (S.jobs.length ? S.runSite : 'home'), gx = x => hood(siteNow()).cx[x], gy = y => hood(siteNow()).cy[y];
  // A neighbourhood: streets at uneven spacings, each block a kind of place, drawn once and kept.
  const hoods = {}, STREETS = ['Featherston St', 'Vogel St', 'Ruahine St', 'Main St', 'Broadway Ave', 'Grey St', 'Ferguson St', 'Church St', 'College St', 'Park Rd', 'Albert St', 'Cuba St', 'Princess St', 'Victoria Ave', 'Botanical Rd', 'Rangitikei St', 'Fitzherbert Ave'];
  function hood(site) {
    const key = site + ':' + S.gw + 'x' + S.gh; if (hoods[key]) return hoods[key];
    let h = 5; for (const c of key) h = (h * 31 + c.charCodeAt(0)) % 9973; const r = () => (h = (h * 137 + 71) % 9973) / 9973;
    const spread = (n, a, b) => { const w = []; let t = 0; for (let i = 0; i < n - 1; i++) { w.push(0.7 + r() * 0.7); t += w[i]; } const out = [a]; for (let i = 0; i < n - 1; i++) out.push(out[i] + w[i] / t * (b - a)); return out; };
    const H = { site, cx: spread(S.gw, 56, 670), cy: spread(S.gh, 78, 402), kind: {}, names: { r: [], c: [] }, cv: null }, home = site === 'home', hy = Math.floor(S.gh / 2);
    for (let x = 0; x < S.gw - 1; x++) for (let y = 0; y < S.gh - 1; y++) H.kind[x + ',' + y] = 'res';
    const pick = k => { for (let g = 0; g < 20; g++) { const x = 1 + Math.floor(r() * (S.gw - 2)), y = Math.floor(r() * (S.gh - 1)); if (H.kind[x + ',' + y] === 'res') { H.kind[x + ',' + y] = k; return; } } };
    H.kind[(S.gw - 2) + ',0'] = 'shops'; pick('park'); if (S.gw >= 5) pick('school'); if (S.gw >= 7) { pick('park'); pick('shops'); }
    if (home) for (let y = 0; y < S.gh - 1; y++) H.kind['0,' + y] = 'ind'; // your yard sits in the industrial strip by the railway
    const off = Math.floor(r() * STREETS.length); for (let y = 0; y < S.gh; y++) H.names.r.push(home && y === 0 ? 'Tremaine Ave' : STREETS[(off + y) % 7]); for (let x = 0; x < S.gw; x++) H.names.c.push(home && x === 0 ? 'Railway Rd' : STREETS[7 + (off + x) % 10]);
    const c = document.createElement('canvas'); c.width = CW * 2; c.height = CH * 2; const g = c.getContext('2d'); g.scale(2, 2);
    g.fillStyle = '#2a4130'; g.fillRect(0, 0, CW, CH);
    for (let i = 0; i < 30; i++) { g.fillStyle = `hsl(${95 + r() * 25},${24 + r() * 12}%,${21 + r() * 7}%)`; g.fillRect(r() * CW - 30, r() * CH, 60 + r() * 90, 30 + r() * 60); }
    if (home) { g.strokeStyle = '#11181b'; g.lineWidth = 7; g.beginPath(); g.moveTo(0, 40); g.lineTo(CW, 52); g.stroke(); g.strokeStyle = '#8a8478'; g.lineWidth = 1.2; g.beginPath(); for (let x = 4; x < CW; x += 9) { g.moveTo(x, 36 + x * 12 / CW); g.lineTo(x, 44 + x * 12 / CW); } g.stroke(); g.strokeStyle = '#c9cfd2'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 38); g.lineTo(CW, 50); g.moveTo(0, 42); g.lineTo(CW, 54); g.stroke(); }
    const house = (x, y, w, hh, col) => { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 1.5, y + 1.5, w, hh); g.fillStyle = col; g.fillRect(x, y, w, hh); g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(x, y + hh / 2, w, hh / 2); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.6; g.strokeRect(x, y, w, hh); };
    const tree = (x, y, q) => { g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.arc(x + 1.2, y + 1.2, q, 0, 7); g.fill(); g.fillStyle = `hsl(${118 + r() * 24},38%,${24 + r() * 10}%)`; g.beginPath(); g.arc(x, y, q, 0, 7); g.fill(); };
    const ROOF = ['#b5694f', '#8f5a48', '#7d8790', '#a39274', '#6f8a7a', '#9a6a5a', '#c2b39a', '#5f6d7a'];
    for (let x = 0; x < S.gw - 1; x++) for (let y = 0; y < S.gh - 1; y++) {
      const x0 = H.cx[x] + 9, y0 = H.cy[y] + 9, w = H.cx[x + 1] - H.cx[x] - 18, hh = H.cy[y + 1] - H.cy[y] - 18, k = H.kind[x + ',' + y];
      if (k === 'park') { g.fillStyle = '#3d7a45'; g.fillRect(x0, y0, w, hh); g.strokeStyle = '#c9b98a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0 + hh * 0.8); g.quadraticCurveTo(x0 + w * 0.4, y0 + hh * 0.2, x0 + w, y0 + hh * 0.35); g.stroke(); for (let i = 0; i < 9; i++) tree(x0 + 6 + r() * (w - 12), y0 + 6 + r() * (hh - 12), 3.5 + r() * 2.5); g.fillStyle = '#e6b84a'; g.fillRect(x0 + w * 0.6, y0 + hh * 0.6, 5, 5); }
      else if (k === 'school') { g.fillStyle = '#34603c'; g.fillRect(x0, y0, w, hh); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 0.8; g.strokeRect(x0 + w * 0.5, y0 + 5, w * 0.45, hh - 10); g.beginPath(); g.moveTo(x0 + w * 0.725, y0 + 5); g.lineTo(x0 + w * 0.725, y0 + hh - 5); g.stroke(); house(x0 + 4, y0 + 4, w * 0.4, hh * 0.32, '#b5694f'); house(x0 + 4, y0 + 4 + hh * 0.38, w * 0.22, hh * 0.5, '#a39274'); }
      else if (k === 'shops') { g.fillStyle = '#4a5055'; g.fillRect(x0, y0, w, hh); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 0.7; g.beginPath(); for (let i = 8; i < w - 4; i += 7) { g.moveTo(x0 + i, y0 + hh * 0.55); g.lineTo(x0 + i, y0 + hh - 4); } g.stroke(); const n = Math.max(2, Math.floor(w / 18)); for (let i = 0; i < n; i++) { house(x0 + 2 + i * (w - 4) / n, y0 + 3, (w - 4) / n - 2, hh * 0.42, '#8d8577'); g.fillStyle = ['#d9634c', '#6fb3d9', '#e6b84a', '#3f9b6b'][i % 4]; g.fillRect(x0 + 2 + i * (w - 4) / n, y0 + 3 + hh * 0.42, (w - 4) / n - 2, 3); } }
      else if (k === 'ind') { g.fillStyle = '#5d584c'; g.fillRect(x0, y0, w, hh); house(x0 + 4, y0 + 4, w - 8, hh * 0.45, '#8fa0b5'); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 0.6; g.beginPath(); for (let i = 8; i < w - 8; i += 5) { g.moveTo(x0 + i, y0 + 4); g.lineTo(x0 + i, y0 + 4 + hh * 0.45); } g.stroke(); for (let i = 0; i < 5; i++) { g.fillStyle = ['#d9634c', '#6fb3d9', '#e6b84a', '#9aa3a0'][Math.floor(r() * 4)]; g.fillRect(x0 + 5 + r() * (w - 22), y0 + hh * 0.6 + r() * (hh * 0.3), 12, 5); } }
      else { g.fillStyle = '#35553c'; g.fillRect(x0, y0, w, hh); g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x0, y0 + hh / 2); g.lineTo(x0 + w, y0 + hh / 2); const n = Math.max(2, Math.floor(w / 24)); for (let i = 1; i < n; i++) { g.moveTo(x0 + i * w / n, y0); g.lineTo(x0 + i * w / n, y0 + hh); } g.stroke(); // back fences and side boundaries
        for (let i = 0; i < n; i++) for (const top of [1, 0]) { const lx = x0 + i * w / n, lw = w / n, bw = Math.min(15, lw - 7) * (0.8 + r() * 0.25), bh = Math.min(12, hh / 2 - 8) * (0.8 + r() * 0.3), hx = lx + 3 + r() * (lw - bw - 6), hy2 = top ? y0 + 5 : y0 + hh - 5 - bh; g.fillStyle = '#8f8a7c'; g.fillRect(hx + bw - 3.5, top ? y0 : hy2 + bh, 3, top ? 5 : 5); house(hx, hy2, bw, bh, ROOF[Math.floor(r() * ROOF.length)]); if (r() < 0.75) tree(lx + 4 + r() * (lw - 8), top ? y0 + hh / 2 - 5 - r() * 4 : y0 + hh / 2 + 5 + r() * 4, 2.5 + r() * 2); } }
    }
    g.lineCap = 'round'; const roads = lw => { g.lineWidth = lw; g.beginPath(); for (let x = 0; x < S.gw; x++) { g.moveTo(H.cx[x], H.cy[0]); g.lineTo(H.cx[x], H.cy[S.gh - 1]); } for (let y = 0; y < S.gh; y++) { g.moveTo(H.cx[0], H.cy[y]); g.lineTo(H.cx[S.gw - 1], H.cy[y]); } g.stroke(); };
    g.strokeStyle = '#8f8a7c'; roads(16); g.strokeStyle = '#33383d'; roads(12.5);
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 0.8; g.setLineDash([5, 6]); g.beginPath(); g.moveTo(H.cx[0], H.cy[hy]); g.lineTo(H.cx[S.gw - 1], H.cy[hy]); g.stroke(); g.setLineDash([]);
    g.font = '7.5px system-ui,sans-serif'; g.fillStyle = 'rgba(230,239,233,.6)'; g.textAlign = 'left';
    H.names.r.forEach((nm, y) => g.fillText(nm.toUpperCase(), H.cx[S.gw > 3 ? 1 : 0] + 12, H.cy[y] + 2.6)); H.names.c.forEach((nm, x) => { if (x === S.gw - 1 && S.gw > 3) return; g.save(); g.translate(H.cx[x] + 2.6, H.cy[S.gh - 1] - 12); g.rotate(-Math.PI / 2); g.fillText(nm.toUpperCase(), 0, 0); g.restore(); });
    H.cv = utilitarian(c); return (hoods[key] = H);
  }
  const KCOL = { lawn: '#5cb85c', hedge: '#3f9b6b', tutor: '#6fb3d9', repair: '#d98f4c', rubbish: '#9aa3a0', garden: '#b6d957', fence: '#c9a36b', drive: '#b9b2a3', wall: '#8b8f8c', path: '#d9c9a0', deck: '#a9825a', shed: '#8fa0b5', road: '#4a5258' };
  const KLET = { lawn: 'L', hedge: 'H', tutor: 'T', repair: 'R', rubbish: 'S', garden: 'G', fence: 'F', drive: 'D', wall: 'W', path: 'P', deck: 'K', shed: 'B', road: 'A' };
  let running = false, moveT = 0, tickT = 0, goal = null; const disp = {};
  function lerpTo(key, x, y, dt) { const d = disp[key] || (disp[key] = { x, y }); const f = Math.min(1, dt * 14); d.x += (x - d.x) * f; d.y += (y - d.y) * f; return d; }

  function stepRun(dt) {
    const key = S.turn + ':' + S.runSite + ':' + S.jobs.length;
    if (key !== runKey) { running = false; goal = null; runKey = key; for (const k in disp) delete disp[k]; }
    if (modalUp() || !S.jobs.length) return;
    if (S.pendingBuild !== null) return startBuild();
    let dx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), dy = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    if (dx || dy) goal = null;
    else if (goal) { if (goal.x !== S.you.x) dx = Math.sign(goal.x - S.you.x); else if (goal.y !== S.you.y) dy = Math.sign(goal.y - S.you.y); else goal = null; }
    moveT += dt;
    if ((dx || dy) && moveT >= 0.13) {
      moveT = 0; if (dx) dy = 0;
      const before = S.cash, m = G.moveYou(S, dx, dy);
      if (m === 'BUILD') { running = true; goal = null; startBuild(); }
      else if (m === 'SPAR') { running = true; goal = null; startSpar(); }
      else if (m !== null) { running = true; say(m); if (S.cash !== before) light(); }
      else if (S.day <= 0) say('Out of daylight.');
    }
    if (running) { tickT += dt; if (tickT >= 0.36) { tickT = 0; const before = S.cash; G.tick(S); if (S.cash !== before) light(); } }
  }
  function drawWorks(site) { // what you have built stays on the map, as true or as crooked as you built it
    for (const key in S.works) {
      if (!key.startsWith(site + ':')) continue;
      const [x, y] = key.slice(site.length + 1).split(',').map(Number), w = S.works[key], HH = hood(site), cw = (HH.cx[Math.min(S.gw - 1, x + 1)] - HH.cx[Math.min(S.gw - 2, x)]) || cellW(), ch = y > 0 ? HH.cy[y] - HH.cy[y - 1] : cellH(), bx = gx(x) + 12, by = gy(y) - ch + 12, sk = (1 - w.q) * 0.35, V = (ax, ay, len) => ({ x: ax + Math.cos(-Math.PI / 2 + sk) * len, y: ay + Math.sin(-Math.PI / 2 + sk) * len }), H = (ax, ay, len) => ({ x: ax + Math.cos(sk) * len, y: ay + Math.sin(sk) * len });
      if (w.kind === 'road') { const a = { x: gx(x) + 10, y: gy(y) - 4 }, len = [0, 12, cw * 0.45, cw * 0.8][w.lvl || 1]; structure('road', a, H(a.x, a.y, len), 8, { x: 0, y: 1 }, 1, 1, w.lvl || 1); continue; }
      if (y === 0) continue; // nothing above the top street
      const U = 3.2, k = w.kind;
      if (k === 'fence') { const a = { x: bx, y: gy(y) - 12 }; structure('fence', a, V(a.x, a.y, ch - 26), 0, null, 5, 1); }
      else if (k === 'drive') { const a = { x: bx + cw * 0.48, y: gy(y) - 8 }; structure('drive', a, V(a.x, a.y, ch * 0.34), 3, { x: 1, y: 0 }, U, 1); }
      else if (k === 'path') { const a = { x: bx + cw * 0.3, y: gy(y) - 8 }; structure('path', a, V(a.x, a.y, ch * 0.3), 1, { x: 1, y: 0 }, U, 1); }
      else if (k === 'wall') { const a = { x: bx + 6, y: by + 8 }; structure('wall', a, H(a.x, a.y, cw * 0.4), 0.9, { x: 0, y: 1 }, U, 1); }
      else if (k === 'deck') { const a = { x: bx + cw * 0.42, y: gy(y) - ch * 0.62 }; structure('deck', a, H(a.x, a.y, 11), 3, { x: 0, y: 1 }, U, 1); }
      else if (k === 'shed') { const a = { x: bx + cw * 0.62, y: by + 6 }; structure('shed', a, H(a.x, a.y, 12), 2.6, { x: 0, y: 1 }, U, 1); }
    }
  }
  function drawStreet(dt) {
    const live = S.jobs.length > 0, site = live ? S.runSite : 'home';
    const cw = cellW(), chh = cellH(), hy = G.homeOf(S).y, sx = S.gw - 1;
    ctx.drawImage(hood(site).cv, 0, 0, CW, CH);
    for (let x = 0; x < 0; x++) for (let y = 0; y < S.gh - 1; y++) {
      ctx.fillStyle = '#2c4a34'; ctx.fillRect(gx(x) + 10, gy(y) + 10, cw - 20, chh - 20);
      ctx.fillStyle = ['#c9b79a', '#a9b7c0', '#d6c08a', '#b9a3a3'][(x * 3 + y + site.length) % 4]; ctx.fillRect(gx(x) + cw * 0.22, gy(y) + chh * 0.24, cw * 0.2, chh * 0.17); ctx.fillRect(gx(x) + cw * 0.56, gy(y) + chh * 0.58, cw * 0.2, chh * 0.17);
    }
    drawWorks(site);
    ctx.fillStyle = '#e6b84a'; ctx.fillRect(gx(0) - 16, gy(hy) - 16, 32, 32); text(site !== 'home' ? 'VAN' : 'HOME', gx(0), gy(hy) + 4, { bold: true, size: 10, color: '#2a1f00' });
    if (live && S.gymAt) { const g = S.gymAt; ctx.fillStyle = S.trained ? '#4a5560' : '#c058d8'; ctx.fillRect(gx(g.x) - 16, gy(g.y) - 16, 32, 32); text('GYM', gx(g.x), gy(g.y) + 4, { bold: true, size: 10, color: '#fff' }); }
    if (site === 'home') { // the yard: what you have built stands in it
      const yx = 4, yy = gy(hy) - 46; ctx.fillStyle = '#6b6658'; ctx.fillRect(yx, yy, 38, 92); ctx.strokeStyle = '#cfd6d9'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.strokeRect(yx, yy, 38, 92); ctx.setLineDash([]);
      ctx.fillStyle = '#8a6f3c'; ctx.fillRect(yx + 3, yy + 3, 20, 14); ctx.fillStyle = '#6f5a30'; ctx.fillRect(yx + 3, yy + 10, 20, 7);
      if (S.done.truck) { ctx.fillStyle = '#e6efe9'; ctx.fillRect(yx + 4, yy + 22, 15, 8); ctx.fillStyle = '#d9634c'; ctx.fillRect(yx + 19, yy + 23, 6, 6); }
      if (S.done.waste) for (let k = 0; k < 6; k++) { ctx.fillStyle = ['#8fa0b5', '#d98f4c', '#9aa3a0'][k % 3]; ctx.fillRect(yx + 4 + (k % 3) * 7, yy + 36 + Math.floor(k / 3) * 6, 6, 5); }
      if (S.done.engshop) { ctx.fillStyle = '#8fa0b5'; ctx.fillRect(yx + 3, yy + 52, 26, 16); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); for (let k = 5; k < 26; k += 5) { ctx.moveTo(yx + 3 + k, yy + 52); ctx.lineTo(yx + 3 + k, yy + 68); } ctx.stroke(); }
      if (S.done.pyrolysis) { disc(yx + 10, yy + 80, 6, '#cfd6d9', '#59646a', 1); disc(yx + 24, yy + 80, 6, '#cfd6d9', '#59646a', 1); }
      text('YARD', yx + 19, yy - 3, { size: 8, color: '#e6d9a8' });
    }
    ctx.fillStyle = '#8894a0'; ctx.fillRect(gx(sx) - 16, gy(0) - 16, 32, 32); text('SHOP', gx(sx), gy(0) + 4, { bold: true, size: 10, color: '#10181c' });
    S.jobs.forEach(j => {
      const x = gx(j.x), y = gy(j.y);
      if (j.by) { disc(x, y, 14, '#1b2d22', j.by === 'rival' ? '#d9634c' : j.by === 'crew' ? '#e6b84a' : '#2f9e7a', 2); text(j.by === 'rival' ? '✗' : '✓', x, y + 5, { bold: true, size: 14, color: j.by === 'rival' ? '#d9634c' : '#9fe0c4' }); return; }
      disc(x, y, 15, KCOL[j.kind], G.isOwn(S, j.kind) ? '#ffffff' : '#10201a', 2); text(KLET[j.kind], x, y + 5, { bold: true, size: 13, color: '#10201a' });
      text(money(j.val * G.cashMult(S)), x, y + 29, { size: 10, color: '#cfe3d6' });
    });
    S.crew.forEach((c, i) => { const d = lerpTo('c' + i, gx(c.x) + (i % 3 - 1) * 7, gy(c.y) - 8 + (i % 2) * 6, dt); disc(d.x, d.y, 6, '#e6b84a', '#3a2c00', 1.5); });
    S.rivals.forEach((r, i) => { const d = lerpTo('r' + i, gx(r.x) + i * 6, gy(r.y) + 8, dt); disc(d.x, d.y, 8, '#d9634c', '#40120a', 2); });
    if (live) { const me = lerpTo('you', gx(S.you.x), gy(S.you.y), dt); ctx.fillStyle = S.mower > 0 ? '#d9634c' : '#555'; ctx.fillRect(me.x + 7, me.y + 1, 11, 8); disc(me.x, me.y, 9, '#1f8fb5', '#ffffff', 2); }
    ctx.fillStyle = 'rgba(8,18,20,.82)'; ctx.fillRect(0, 0, CW, 26);
    if (live) {
      text(G.siteName(site), 8, 17, { align: 'left', bold: true, color: '#e6b84a' });
      text('Daylight', 150, 17, { align: 'left' }); bar(200, 8, 130, 10, S.day / G.dayMax(S), '#e6b84a', S.day + '');
      text('Mower', 372, 17, { align: 'left' }); bar(412, 8, 90, 10, S.mower / 100, S.mower > 30 ? '#2f9e7a' : '#d9634c', Math.round(S.mower) + '%');
      text(`${money(S.earned)} of ${money(G.routeValue(S))}`, CW - 8, 17, { align: 'right' });
      if (!running) text('Move to start the day. Everyone else starts when you do.', CW / 2, CH - 12, { size: 13, color: '#e6b84a' });
      else if (S.day <= 0) text(S.act === 1 ? 'Out of daylight. End the season.' : 'Out of daylight. Finish the day (right).', CW / 2, CH - 12, { size: 13, color: '#e6b84a' });
    } else {
      text('Your street', 8, 17, { align: 'left', bold: true, color: '#e6b84a' });
      text(S.act === 1 ? 'Begin "Mow lawns, fix mowers" below, then end the season.' : 'Your crews run this circuit now. Zoom out with the tabs at the top, or work a day here yourself.', CW / 2, CH - 12, { size: 13, color: '#e6b84a' });
    }
  }

  // ───────────────── property works and road works: set it out by eye, and it stays on the map ─────────────────
  // Every job is one pull from a peg: the direction is the skill (along the boundary, square off the house, square to
  // the kerb, with the centreline) and the length is the measure. What you pull is what gets built, true or not.
  const WORKS = {
    fence: { t: 'FENCE', say: 'post to post along the boundary' }, wall: { t: 'RETAINING WALL', say: 'parallel to the back of the house' }, path: { t: 'GARDEN PATH', say: 'from the door, square to the kerb' },
    drive: { t: 'DRIVEWAY', say: 'square off the kerb' }, deck: { t: 'DECK', say: 'out from the house, square to its wall' }, shed: { t: 'SHED', say: 'parallel to the kerb, in the back corner' },
    road: { t: 'ROAD WORKS', say: '' },
  };
  function startBuild() {
    const j = S.jobs[S.pendingBuild]; if (!j) return; if (j.kind === 'tutor') return startTutor(); { const sc = G.jobScene(S, j.kind); if (sc === 'mill') return startMill(j.kind); if (sc === 'dig') return startDig(j.kind); if (sc === 'pour') return startPour(j.kind); } const kind = j.kind, road = kind === 'road', lvl = road ? G.roadLevel(S) : 0, th = (Math.random() - 0.5) * 0.5, r = (a, b) => a + Math.random() * (b - a);
    const k = { x: Math.cos(th), y: Math.sin(th) }, n = { x: Math.sin(th), y: -Math.cos(th) }, U = road ? [0, 44, 24, 17][lvl] : 30, O = { x: 360, y: road ? (lvl === 3 ? 330 : 235) : 345 };
    const P = (a, b) => ({ x: O.x + k.x * a * U + n.x * b * U, y: O.y + k.y * a * U + n.y * b * U }), neg = v => ({ x: -v.x, y: -v.y });
    const hx = r(-1, 1), sp = { // A: the peg you pull from · u: the true direction · L: metres · w: width · wd: which side the width falls
      fence: () => ({ A: P(-7.6, 0.3), u: n, L: 7.4, w: 0 }), wall: () => ({ A: P(hx - 3.4, 6.9), u: k, L: r(5, 6.8), w: 0.4, wd: n }), path: () => ({ A: P(hx + 0.6, 3.4), u: neg(n), L: 3.4, w: 1, wd: k }),
      drive: () => ({ A: P(4.6, 0), u: n, L: r(5, 6.5), w: 3, wd: k }), deck: () => ({ A: P(hx + 3.5, 3.6), u: k, L: r(2.6, 3.6), w: 2.8, wd: n }), shed: () => ({ A: P(-7, 5.4), u: k, L: r(2.6, 3.4), w: 2.2, wd: n }),
      road: () => (lvl === 1 ? { A: P(r(-2.5, 0.5), r(-1.6, 0.2)), u: k, L: r(2, 3), w: 1.5, wd: n } : lvl === 2 ? { A: P(-6.5, 0), u: k, L: r(10, 13), w: 3.2, wd: n } : { A: P(r(-2, 1), 3.2), u: n, L: r(9, 11), w: 6, wd: k }),
    }[kind]();
    mode = Object.assign({ type: 'build', kind, lvl, th, k, n, U, O, hx, drag: false, E: null, done: null, t: 0 }, sp);
  }
  const bAng = m => { const dx = m.E.x - m.A.x, dy = m.E.y - m.A.y, l = Math.hypot(dx, dy) || 1; return Math.acos(clamp((dx * m.u.x + dy * m.u.y) / l, -1, 1)) * 180 / Math.PI; };
  function buildDown() { const m = mode; if (m.done) return; if (Math.hypot(mouse.x - m.A.x, mouse.y - m.A.y) < 28) { m.drag = true; m.E = { x: mouse.x, y: mouse.y }; } else say('Start at the peg.'); }
  function buildMove() { const m = mode; if (!m.done && m.drag) m.E = { x: clamp(mouse.x, 6, CW - 6), y: clamp(mouse.y, 28, CH - 6) }; }
  function buildUp() {
    const m = mode; if (m.done || !m.drag) return; m.drag = false;
    const len = Math.hypot(m.E.x - m.A.x, m.E.y - m.A.y) / m.U; if (len < m.L * 0.5) { m.E = null; return say(`Too short: it wants ${m.L.toFixed(1)} m. Pull again from the peg.`); }
    const err = bAng(m), q = clamp(1 - err / 10, 0, 1) * clamp(1 - Math.max(0, Math.abs(len - m.L) / m.L - 0.03) / 0.3, 0.3, 1), paid = G.finishBuild(S, q);
    m.q = q; m.done = `${err < 0.8 ? 'Dead true' : err.toFixed(1) + '° off true'}, ${len.toFixed(1)} m of ${m.L.toFixed(1)}. ${q > 0.85 ? 'They will show the neighbours.' : q > 0.5 ? 'It will do.' : 'It is built, and it is crooked.'} Paid ${money(paid)}.`; light();
  }
  function structure(kind, A, E, w, wd, U, alpha, lvl) { // the thing itself, along whatever line was pulled
    const dx = E.x - A.x, dy = E.y - A.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len; let px = -uy, py = ux; if (wd && px * wd.x + py * wd.y < 0) { px = -px; py = -py; }
    const W = w * U, q = [[A.x, A.y], [E.x, E.y], [E.x + px * W, E.y + py * W], [A.x + px * W, A.y + py * W]], quad = (fill) => { ctx.beginPath(); q.forEach((c, i) => (i ? ctx.lineTo(c[0], c[1]) : ctx.moveTo(c[0], c[1]))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    const ribs = (step, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); for (let d = step; d < len; d += step) { ctx.moveTo(A.x + ux * d, A.y + uy * d); ctx.lineTo(A.x + ux * d + px * W, A.y + uy * d + py * W); } ctx.stroke(); };
    ctx.globalAlpha = alpha;
    if (kind === 'fence') { ctx.strokeStyle = '#8a6f3c'; ctx.lineWidth = Math.max(1.5, U * 0.1); ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(E.x, E.y); ctx.stroke(); ctx.fillStyle = '#5d4826'; for (let d = 0; d <= len + 1; d += U * 1.2) ctx.fillRect(A.x + ux * d - U * 0.09, A.y + uy * d - U * 0.3, U * 0.18, U * 0.42); }
    else if (kind === 'wall') { quad('#8b8f8c'); ribs(U * 0.8, '#4f5552', 1); }
    else if (kind === 'path') { quad('#d9c9a0'); ribs(U * 0.6, '#9b8b62', 1); }
    else if (kind === 'drive') { quad('#b9b2a3'); ribs(U * 2, '#8f8878', 1.5); }
    else if (kind === 'deck') { quad('#a9825a'); ribs(U * 0.28, '#7a5a3a', 0.8); }
    else if (kind === 'shed') { quad('#8fa0b5'); ctx.strokeStyle = '#5d6c80'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(A.x + px * W / 2, A.y + py * W / 2); ctx.lineTo(E.x + px * W / 2, E.y + py * W / 2); ctx.stroke(); ribs(U * 0.5, 'rgba(0,0,0,.18)', 0.6); }
    else { quad('#14171a'); if (lvl >= 2) { ctx.strokeStyle = '#e6efe9'; ctx.lineWidth = 1.5; ctx.setLineDash(lvl === 3 ? [U * 1.2, U * 1.2] : []); ctx.beginPath(); const o = lvl === 3 ? W / 2 : W - 3; ctx.moveTo(A.x + px * o, A.y + py * o); ctx.lineTo(E.x + px * o, E.y + py * o); ctx.stroke(); ctx.setLineDash([]); } }
    ctx.globalAlpha = 1;
  }
  function drawBuild() {
    const m = mode, { k, n, U, O } = m, road = m.kind === 'road', P = (a, b) => ({ x: O.x + k.x * a * U + n.x * b * U, y: O.y + k.y * a * U + n.y * b * U }), tm = performance.now() / 1000;
    const poly = (pts, fill) => { ctx.beginPath(); pts.forEach((q, i) => { const p = P(q[0], q[1]); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    const line = (a, b, col, lw, dash) => { const p = P(a[0], a[1]), q = P(b[0], b[1]); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.setLineDash([]); };
    ctx.fillStyle = '#3f7a3f'; ctx.fillRect(0, 0, CW, CH);
    if (!road) { // the section: road and kerb, pegged boundaries, the house
      poly([[-20, -6], [20, -6], [20, 0], [-20, 0]], '#3d4348'); line([-20, 0], [20, 0], '#b9b2a3', 5); for (let a = -8; a <= 8; a++) line([a, 0], [a, -0.25], '#6f7479', 1); // metre marks on the kerb
      poly([[-8, 0.1], [8, 0.1], [8, 8], [-8, 8]], '#45864a');
      if (m.kind !== 'fence') { line([-8, 0], [-8, 8], 'rgba(255,255,255,.35)', 1, [5, 5]); line([8, 0], [8, 8], 'rgba(255,255,255,.35)', 1, [5, 5]); line([-8, 8], [8, 8], 'rgba(255,255,255,.35)', 1, [5, 5]); }
      [[-8, 0], [8, 0], [-8, 8], [8, 8]].forEach(c => { const p = P(c[0], c[1]); disc(p.x, p.y, 3.5, '#ffffff', '#d9634c', 1.5); });
      poly([[m.hx - 3.4, 3.4], [m.hx + 3.4, 3.4], [m.hx + 3.4, 6.4], [m.hx - 3.4, 6.4]], '#c9b79a'); poly([[m.hx - 3.4, 4.9], [m.hx + 3.4, 4.9], [m.hx + 3.4, 6.4], [m.hx - 3.4, 6.4]], '#a8957a'); line([m.hx - 3.4, 4.9], [m.hx + 3.4, 4.9], '#7a5a43', 2);
      poly([[m.hx + 0.2, 3.25], [m.hx + 1, 3.25], [m.hx + 1, 3.45], [m.hx + 0.2, 3.45]], '#5d4826'); // the front door
    } else if (m.lvl < 3) { // an existing road with something wrong with it
      const hw = m.lvl === 1 ? 3.4 : 3.4; poly([[-30, -hw], [30, -hw], [30, hw], [-30, hw]], '#3d4348'); line([-30, hw], [30, hw], '#b9b2a3', 4); line([-30, -hw], [30, -hw], '#b9b2a3', 4); line([-30, 0], [30, 0], '#e6efe9', 2, [U * 1.5, U * 1.5]);
      const a0 = m.lvl === 1 ? [[0.2, 0.3], [1.2, 0.2], [1.9, 0.7], [1.5, 1.2], [0.5, 1.1]] : [[0.5, 0.6], [4, 0.4], [7, 1.4], [10, 0.8], [11, 2.4], [6, 2.7], [2, 2.2]];
      { const A = m.A; ctx.beginPath(); a0.forEach((c, i) => { const x = A.x + k.x * c[0] * U + n.x * c[1] * U, y = A.y + k.y * c[0] * U + n.y * c[1] * U; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fillStyle = m.lvl === 1 ? '#22262a' : 'rgba(110,112,108,.9)'; ctx.fill(); ctx.strokeStyle = '#8a8f8c'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([]); }
    } else { poly([[-30, -3.4], [30, -3.4], [30, 3.2], [-30, 3.2]], '#3d4348'); line([-30, 3.2], [30, 3.2], '#b9b2a3', 3); line([-30, 0], [30, 0], '#e6efe9', 1.5, [U * 1.5, U * 1.5]); poly([[-9, 3.3], [9, 3.3], [9, 16], [-9, 16]], '#8a7a55'); for (let i = 0; i < 6; i++) { const p = P(-8 + i * 3.2 + (i % 2), 5 + (i * 37 % 9)); ctx.fillStyle = '#c9b79a'; ctx.fillRect(p.x - 6, p.y - 5, 12, 10); } } // stripped ground and the first house lots of a subdivision
    if (m.E) structure(m.kind, m.A, m.E, m.w, m.wd, U, m.done ? 1 : 0.75, m.lvl);
    if (road) { // the crew and the plant you have turned up with
      const side = P(-9, m.lvl === 3 ? 5 : -5); for (let i = 0; i < 1 + m.lvl; i++) figure(side.x + i * 22, side.y + 12, 0.25, 1, i ? 'idle' : 'guard', i ? '#e6b84a' : '#ff9d6b');
      const tr = P(-13, m.lvl === 3 ? 6 : -5); ctx.fillStyle = '#e6efe9'; ctx.fillRect(tr.x - 22, tr.y - 9, 30, 18); ctx.fillStyle = '#d9634c'; ctx.fillRect(tr.x + 8, tr.y - 8, 12, 16);
      if (m.done && m.E) { const f = 0.5 + 0.5 * Math.sin(tm * 1.6), x = m.A.x + (m.E.x - m.A.x) * f + m.n.x * 0, y = m.A.y + (m.E.y - m.A.y) * f; ctx.fillStyle = '#e6b84a'; ctx.fillRect(x - 9, y + 2, 18, 11); ctx.fillStyle = '#39424a'; ctx.fillRect(x - 11, y + 4, 5, 8); ctx.fillRect(x + 6, y + 4, 5, 8); } // the roller working it
    }
    if (m.kind === 'fence' && !m.done) { const B = { x: m.A.x + m.u.x * m.L * U, y: m.A.y + m.u.y * m.L * U }; disc(B.x, B.y, 6, '#5d4826', '#e6b84a', 2); text('far post', B.x + 12, B.y + 4, { align: 'left', size: 10 }); }
    if (m.done && m.E) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(m.A.x, m.A.y); ctx.lineTo(m.A.x + m.u.x * m.L * U, m.A.y + m.u.y * m.L * U); ctx.stroke(); ctx.setLineDash([]); } // where true was
    if (!m.done) { disc(m.A.x, m.A.y, 8 + 2 * Math.sin(tm * 5), '#e6b84a', '#ffffff', 2); if (m.E && m.drag) { const len = Math.hypot(m.E.x - m.A.x, m.E.y - m.A.y) / U, ok = Math.abs(len - m.L) / m.L < 0.04; ctx.fillStyle = 'rgba(8,18,20,.85)'; ctx.fillRect(m.E.x + 12, m.E.y - 22, 74, 20); text(len.toFixed(1) + ' m', m.E.x + 49, m.E.y - 8, { bold: true, size: 13, color: ok ? '#7dff9a' : '#f2e58a' }); } }
    const what = road ? ['', `POTHOLE · saw-cut and patch: ${m.L.toFixed(1)} m, running with the centreline`, `RESEAL · one lane, ${m.L.toFixed(1)} m, running with the centreline`, `NEW ROAD · ${m.L.toFixed(1)} m into the subdivision, square off the road`][m.lvl] : `${WORKS[m.kind].t} · ${m.L.toFixed(1)} m, ${WORKS[m.kind].say}`;
    { const mt = G.MACH_FOR[m.kind]; if (G.hasMachine(S, mt)) { drawMachine(mt, CW - 118, CH - 86, 0.32); text(`your ${D.machines[mt].name.toLowerCase()} is on the job: half the day`, CW - 70, CH - 12, { size: 9, color: '#e6d9a8' }); } }
    header(what + ' · press on the peg, pull, let go');
  }

  // ───────────────── Machine jobs: with the machine, the job is running the machine ─────────────────
  const jobDone = (m, q, line) => { const paid = G.finishBuild(S, clamp(q, 0, 1)); m.q = q; m.done = `${line} Paid ${money(paid)}.`; light(); };

  // The sawmill. First you set the headrig: the run of cuts that turns the log into slices. Then each slice comes down the
  // line to you and you send it on: straight out to the markers and the sorting table, left to the twin saws, or right to the bench.
  const MILL_NEED = { fence: { post: 4, plank: 2, board: 4 }, deck: { post: 2, plank: 6, board: 2 }, shed: { post: 4, plank: 4, board: 4 } }, MT = { 1: [9, 'board', '25'], 2: [18, 'plank', '50'], 3: [36, 'cant', '100'] };
  function startMill(kind) { mode = { type: 'mill', kind, need: MILL_NEED[kind], have: { post: 0, plank: 0, board: 0 }, waste: 0, logs: 2, R: 62 + Math.random() * 10, cuts: [], stage: 0, line: [], next: 0, gap: 0, done: null }; }
  const millUsed = m => m.cuts.reduce((a, c) => a + c, 0);
  function millKey(k) {
    const m = mode; if (m.done) return;
    if (m.stage === 0) { if (MT[k]) { if (millUsed(m) + MT[k][0] <= m.R * 2 - 4) m.cuts.push(MT[k][0]); else say('No room left on this log for that. Enter to saw.'); } else if (k === 'Backspace') m.cuts.pop(); else if ((k === ' ' || k === 'Enter') && m.cuts.length) { m.stage = 1; m.next = 0; m.gap = 0.3; } return; }
    const pc = m.line.find(q => q.x > 318 && q.x < 420 && !q.sent); if (!pc || !/^[awd]$/.test(k)) return;
    pc.sent = k; const t = pc.kind; let msg = '';
    if (pc.wane) { if (k === 'd') { m.have.board++; msg = 'Edged on the bench: a board.'; } else { m.waste++; msg = 'Bark on it. That wanted the bench.'; } }
    else if (t === 'cant') { if (k === 'a') { m.have.post += 2; msg = 'Through the twin saws: two posts.'; } else if (k === 'w') { m.have.post++; msg = 'Out as it is: one heavy post.'; } else { m.waste++; msg = 'Too big for the bench.'; } }
    else if (t === 'plank') { if (k === 'w') { m.have.plank++; msg = 'A plank, marked and out.'; } else if (k === 'a') { m.have.board += 2; msg = 'Split on the twin saws: two boards.'; } else { m.waste++; msg = 'Clean timber, chewed up on the bench.'; } }
    else { if (k === 'w') { m.have.board++; msg = 'A board, marked and out.'; } else { m.waste++; msg = 'Too thin for that. Firewood.'; } }
    say(msg);
  }
  function stepMill(dt) {
    const m = mode; if (m.done) return;
    if (m.stage === 0) return;
    m.gap -= dt; if (m.gap <= 0 && m.next < m.cuts.length) { let d0 = -m.R + (m.R * 2 - millUsed(m)) / 2; for (let i = 0; i < m.next; i++) d0 += m.cuts[i]; const c = m.cuts[m.next], mid = d0 + c / 2, chord = 2 * Math.sqrt(Math.max(0, m.R * m.R - mid * mid)), far = 2 * Math.sqrt(Math.max(0, m.R * m.R - Math.max(Math.abs(d0), Math.abs(d0 + c)) ** 2)); m.line.push({ x: 150, th: c, w: chord, kind: c === 9 ? 'board' : c === 18 ? 'plank' : 'cant', wane: far < chord * 0.72 || chord < m.R * 1.1, sent: null, y: 0 }); m.next++; m.gap = 1.5; }
    for (let i = m.line.length - 1; i >= 0; i--) { const q = m.line[i]; if (!q.sent) { q.x += 62 * dt; if (q.x > 440) { q.sent = 'x'; m.waste++; say('Nobody sent it anywhere. Onto the floor.'); } } else { q.y += dt; if (q.y > 0.7) m.line.splice(i, 1); } }
    if (m.next >= m.cuts.length && !m.line.length) { m.logs--; if (m.logs > 0) { m.stage = 0; m.cuts = []; m.R = 62 + Math.random() * 10; say('Next log on the carriage.'); } else { const need = m.need, tot = need.post + need.plank + need.board, got = Math.min(need.post, m.have.post) + Math.min(need.plank, m.have.plank) + Math.min(need.board, m.have.board), q = got / tot * (1 - Math.min(0.3, m.waste * 0.05)); jobDone(m, q, `${got} of the ${tot} pieces the job wanted, ${m.waste} wasted. ${q > 0.85 ? 'Cut to the order, nothing bought in.' : q > 0.5 ? 'The shortfall comes from the yard at retail.' : 'Most of the timber for this job is being bought.'}`); } }
  }
  function drawMill() {
    const m = mode, cx = 150, cy = 190; ctx.fillStyle = '#1c1f22'; ctx.fillRect(0, 0, CW, CH); ctx.fillStyle = '#26292d'; ctx.fillRect(0, 300, CW, 140);
    const used = millUsed(m), d0 = -m.R + (m.R * 2 - used) / 2; disc(cx, cy, m.R, '#b08a5a', '#6b4f2e', 4); for (let r = m.R - 10; r > 6; r -= 11) disc(cx, cy, r, null, 'rgba(90,60,30,.45)', 1);
    let d = d0; m.cuts.forEach((c, i) => { const done = m.stage === 1 && i < m.next, h1 = Math.sqrt(Math.max(0, m.R * m.R - d * d)), h2 = Math.sqrt(Math.max(0, m.R * m.R - (d + c) * (d + c))); if (done) { ctx.fillStyle = '#1c1f22'; ctx.fillRect(cx + d, cy - m.R - 2, c, m.R * 2 + 4); } ctx.strokeStyle = '#ffd300'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx + d, cy - h1); ctx.lineTo(cx + d, cy + h1); ctx.moveTo(cx + d + c, cy - h2); ctx.lineTo(cx + d + c, cy + h2); ctx.stroke(); if (!done) text(c === 9 ? '25' : c === 18 ? '50' : '100', cx + d + c / 2, cy + 3, { size: c === 9 ? 6.5 : 9, color: '#1c1f22', bold: true }); d += c; });
    text('headrig', cx, cy + m.R + 22, { size: 10, color: '#8aa69d' });
    ctx.fillStyle = '#111416'; ctx.fillRect(230, 176, 210, 28); ctx.strokeStyle = '#ffd300'; ctx.lineWidth = 2; ctx.strokeRect(318, 164, 102, 52); text('you', 369, 158, { size: 10, color: '#ffd300' });
    [['W  markers → sorting table', 369, 96, '#00a94f'], ['A  twin saws', 250, 262, '#0098d4'], ['D  bench', 500, 262, '#ee7c0e']].forEach(q => text(q[0], q[1], q[2], { size: 11, bold: true, color: q[3] }));
    ctx.strokeStyle = '#00a94f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(369, 164); ctx.lineTo(369, 106); ctx.stroke(); ctx.strokeStyle = '#0098d4'; ctx.beginPath(); ctx.moveTo(318, 216); ctx.lineTo(262, 250); ctx.stroke(); ctx.strokeStyle = '#ee7c0e'; ctx.beginPath(); ctx.moveTo(420, 216); ctx.lineTo(488, 250); ctx.stroke();
    m.line.forEach(q => { const ox = q.sent === 'a' ? -q.y * 120 : q.sent === 'd' ? q.y * 120 : 0, oy = q.sent === 'w' ? -q.y * 110 : q.sent && q.sent !== 'x' ? q.y * 80 : q.sent === 'x' ? q.y * 90 : 0, w = Math.max(14, q.w * 0.5); ctx.fillStyle = '#c9a36b'; ctx.fillRect(q.x + ox - w / 2, 190 + oy - q.th / 2, w, q.th); if (q.wane) { ctx.fillStyle = '#5d4826'; ctx.fillRect(q.x + ox - w / 2, 190 + oy - q.th / 2, 4, q.th); ctx.fillRect(q.x + ox + w / 2 - 4, 190 + oy - q.th / 2, 4, q.th); } ctx.strokeStyle = '#6b4f2e'; ctx.lineWidth = 1; ctx.strokeRect(q.x + ox - w / 2, 190 + oy - q.th / 2, w, q.th); });
    let y = 70; text('THE ORDER', 560, 56, { align: 'left', size: 10, bold: true, color: '#8aa69d' }); for (const k in m.need) { const ok = m.have[k] >= m.need[k]; text(`${k}s  ${m.have[k]} of ${m.need[k]}`, 560, y + 4, { align: 'left', size: 12, bold: true, color: ok ? '#7dff9a' : '#f2f2f2' }); y += 18; } text(`wasted  ${m.waste}`, 560, y + 6, { align: 'left', size: 11, color: m.waste ? '#f0a898' : '#8aa69d' }); text(`logs left  ${m.logs}`, 560, y + 24, { align: 'left', size: 11, color: '#8aa69d' });
    text(m.stage === 0 ? `1 = 25 mm board · 2 = 50 mm plank · 3 = 100 mm cant · Backspace takes one back · Space saws it (${Math.round((m.R * 2 - used) / 0.36)} mm of log unspoken for)` : 'A cant goes to the twin saws for two posts. Anything with bark on its edges goes to the bench. Clean boards and planks go straight out.', CW / 2, CH - 16, { size: 10.5, color: '#cfe3d6' });
    header(`THE SAWMILL · ${WORKS[m.kind].t.toLowerCase()} timber · ${m.stage === 0 ? 'set the headrig: call the cuts across the log' : 'tailing out: send each piece on'}`);
  }

  // The excavator. A trench has a depth and a fall. Dig each metre to its mark and no deeper, then load the barrows with
  // metal for the bedding and send your barrowhands along it.
  function startDig(kind) {
    const n = 14, d0 = 3 + Math.floor(Math.random() * 2), fall = Math.random() < 0.5 ? 1 : 2, tgt = []; for (let i = 0; i < n; i++) tgt.push(d0 + Math.round(i * fall / (n - 1) * 2));
    mode = { type: 'dig', kind, n, tgt, dug: new Array(n).fill(0), bed: new Array(n).fill(0), at: 0, bucket: 0, t: 70, T: 70, barrows: [], hands: 2 + Math.min(2, Math.floor(G.crewOut(S) / 4)), spoil: 0, d0, fall, cd: 0, done: null };
  }
  function digKey(k) {
    const m = mode; if (m.done) return;
    if (k === 'a' || k === 'd') m.at = clamp(m.at + (k === 'd' ? 1 : -1), 0, m.n - 1);
    else if (k === 'j' && m.cd <= 0) { if (m.bucket >= 3) return say('Bucket full. K to tip it.'); m.dug[m.at]++; m.bucket++; m.cd = 0.22; if (m.dug[m.at] > m.tgt[m.at]) say('Too deep there. It will have to be made up.'); }
    else if (k === 'k' && m.cd <= 0) { if (m.bucket > 0) { m.spoil += m.bucket; m.bucket = 0; m.cd = 0.3; } else { const free = m.hands - m.barrows.length, i = m.bed.findIndex((b, x) => b < 1 && m.dug[x] >= m.tgt[x] && !m.barrows.some(q => q.to === x)); if (free <= 0) return say('Every barrow is out. Wait for one.'); if (i < 0) return say(m.bed.every(b => b >= 1) ? 'Bedded end to end.' : 'Nothing dug to depth and waiting for metal yet.'); m.barrows.push({ to: i, x: 60, st: 'out' }); m.cd = 0.5; } }
  }
  const DX = i => 150 + i * 36;
  function stepDig(dt) {
    const m = mode; if (m.done) return; m.t -= dt; m.cd -= dt;
    for (let i = m.barrows.length - 1; i >= 0; i--) { const b = m.barrows[i], tx = b.st === 'out' ? DX(b.to) : 60; if (Math.abs(tx - b.x) < 130 * dt) { if (b.st === 'out') { m.bed[b.to] = 1; b.st = 'back'; b.x = tx; } else m.barrows.splice(i, 1); } else b.x += Math.sign(tx - b.x) * 130 * dt; }
    const all = m.bed.every(b => b >= 1) && !m.barrows.length;
    if (all || m.t <= 0) { let err = 0, donec = 0; for (let i = 0; i < m.n; i++) { err += Math.abs(m.dug[i] - m.tgt[i]); donec += m.bed[i]; } const q = clamp(1 - err / (m.n * 1.2), 0, 1) * (0.4 + 0.6 * donec / m.n); jobDone(m, q, `${err === 0 ? 'To the mark the whole way' : err + ' bucket' + (err === 1 ? '' : 's') + ' off grade along the run'}, ${Math.round(donec)} of ${m.n} metres bedded${m.t <= 0 ? ' when the light went' : ''}.`); }
  }
  function drawDig() {
    const m = mode, gy0 = 150, u = 16; ctx.fillStyle = '#1c1f22'; ctx.fillRect(0, 0, CW, CH); ctx.fillStyle = '#5a5347'; ctx.fillRect(0, gy0, CW, CH - gy0); ctx.fillStyle = '#6a7a52'; ctx.fillRect(0, gy0 - 5, CW, 5);
    for (let i = 0; i < m.n; i++) { const x = DX(i) - 17; ctx.fillStyle = '#1c1f22'; ctx.fillRect(x, gy0 - 5, 34, m.dug[i] * u + 5); if (m.dug[i] > m.tgt[i]) { ctx.fillStyle = 'rgba(227,32,23,.45)'; ctx.fillRect(x, gy0 + m.tgt[i] * u, 34, (m.dug[i] - m.tgt[i]) * u); } if (m.bed[i]) { ctx.fillStyle = '#9aa3a0'; ctx.fillRect(x, gy0 + m.dug[i] * u - 7, 34, 7); } }
    ctx.strokeStyle = '#ffd300'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); for (let i = 0; i < m.n; i++) { const x = DX(i), y = gy0 + m.tgt[i] * u; i ? ctx.lineTo(x - 17, y) : ctx.moveTo(x - 17, y); ctx.lineTo(x + 17, y); } ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < m.n; i++) text(m.tgt[i] * 100 + '', DX(i), gy0 + m.tgt[i] * u + 13, { size: 8, color: m.dug[i] === m.tgt[i] ? '#7dff9a' : '#ffd300' });
    const bx = DX(m.at), by = gy0 + m.dug[m.at] * u - 4; ctx.strokeStyle = '#e6b84a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx - 60, 92); ctx.lineTo(bx - 8, 70); ctx.lineTo(bx, by - 14); ctx.stroke(); ctx.fillStyle = '#e6b84a'; ctx.fillRect(bx - 92, 84, 44, 28); ctx.fillStyle = '#1c1f22'; ctx.fillRect(bx - 84, 88, 16, 12); ctx.fillStyle = '#39424a'; ctx.fillRect(bx - 98, 112, 56, 10); ctx.fillStyle = '#39424a'; ctx.beginPath(); ctx.moveTo(bx - 10, by - 14); ctx.lineTo(bx + 10, by - 14); ctx.lineTo(bx + 6, by); ctx.lineTo(bx - 6, by); ctx.fill(); for (let i = 0; i < m.bucket; i++) { ctx.fillStyle = '#8a7a55'; ctx.fillRect(bx - 8 + i * 5.5, by - 20, 5, 5); }
    ctx.fillStyle = '#8a7a55'; ctx.beginPath(); ctx.moveTo(8, gy0 - 5); ctx.lineTo(30 + Math.min(40, m.spoil * 1.5), gy0 - 8 - Math.min(40, m.spoil * 1.6)); ctx.lineTo(70 + Math.min(40, m.spoil * 2), gy0 - 5); ctx.fill(); ctx.fillStyle = '#9aa3a0'; ctx.beginPath(); ctx.moveTo(40, gy0 - 5); ctx.lineTo(62, gy0 - 30); ctx.lineTo(92, gy0 - 5); ctx.fill(); text('metal', 66, gy0 - 34, { size: 9, color: '#cfe3d6' });
    m.barrows.forEach(b => { figure(b.x - 8, gy0 - 4, 0.2, b.st === 'out' ? 1 : -1, 'shove', '#ff9d6b'); ctx.fillStyle = '#39424a'; ctx.fillRect(b.x, gy0 - 14, 14, 8); if (b.st === 'out') { ctx.fillStyle = '#9aa3a0'; ctx.fillRect(b.x + 2, gy0 - 18, 10, 5); } disc(b.x + 12, gy0 - 5, 3, '#0c0f12'); });
    bar(506, 36, 200, 9, m.t / m.T, '#e6b84a'); text('daylight', 500, 44, { align: 'right', size: 10 });
    text(`Trench: ${m.d0 * 100} mm at this end, falling ${m.fall * 200} mm over the run. The numbers are the depth each metre wants. Barrowhands free: ${m.hands - m.barrows.length} of ${m.hands}.`, CW / 2, CH - 34, { size: 10.5, color: '#cfe3d6' });
    text('A/D: track along · J: take a bucket (100 mm) · K: tip a full bucket, or with it empty load a barrow with metal and send it', CW / 2, CH - 16, { size: 10.5, color: '#8aa69d' });
    header(`THE EXCAVATOR · ${m.kind === 'road' ? 'road' : 'footing'} trench · dig each metre to its mark and no deeper, then bed it`);
  }

  // Concrete. Nothing about a pour is hard except the order and the clock: boxing, base and mesh done before the truck
  // is on the street, then get it in and floated before it goes off. A pump puts it where you point; without one it is barrows.
  function startPour(kind) {
    const n = G.crewOut(S), m = { type: 'pour', kind, crew: [], prep: [0, 0, 0], truck: 'none', eta: 0, life: 1, bays: [], hose: 0, pump: !!S.done.contractor, t: 0, done: null };
    for (let i = 0; i < n; i++) m.crew.push(i % 3); for (let i = 0; i < 6; i++) m.bays.push({ fill: 0, fin: 0, age: 0, rough: false }); mode = m;
  }
  const PREP = ['boxing', 'base', 'mesh'], PJOB = ['barrows', 'floats'];
  function pourKey(k) {
    const m = mode; if (m.done) return; const here = m.truck === 'here', roles = here ? 2 : 3;
    if (/^[123]$/.test(k) && +k <= roles) { const r = +k - 1, cnt = []; for (let q = 0; q < roles; q++) cnt.push(m.crew.filter(c => c === q).length); const from = cnt.map((c, q) => q).filter(q => q !== r).sort((a, b) => cnt[b] - cnt[a])[0], i = m.crew.indexOf(from); if (i >= 0) { m.crew[i] = r; say(`One more on ${(here ? PJOB : PREP)[r]}.`); } }
    else if (k === 't') { if (m.truck !== 'none') return; m.truck = 'coming'; m.eta = 10; say('Truck ordered. Ten seconds out, and the drum is turning.'); }
    else if ((k === 'a' || k === 'd') && m.pump) m.hose = clamp(m.hose + (k === 'd' ? 1 : -1), 0, 5);
  }
  function stepPour(dt) {
    const m = mode; if (m.done) return; m.t += dt;
    if (m.truck !== 'here') { for (let r = 0; r < 3; r++) { const ok = r === 0 || m.prep[r - 1] >= 0.5; if (ok) m.prep[r] = Math.min(1, m.prep[r] + dt * 0.03 * m.crew.filter(c => c === r).length); } }
    if (m.truck === 'coming' && (m.eta -= dt) <= 0) { m.truck = 'here'; m.crew = m.crew.map((c, i) => (m.pump ? 1 : i % 2)); say(m.prep.every(p => p >= 1) ? 'Truck is here. Go.' : 'Truck is here and you are not ready. It is going off in the drum.'); }
    if (m.truck === 'here') {
      const ready = m.prep.every(p => p >= 1); m.life = Math.max(0, m.life - dt / (m.pump ? 46 : 62)); if (!ready) { for (let r = 0; r < 3; r++) m.prep[r] = Math.min(1, m.prep[r] + dt * 0.02 * Math.ceil(m.crew.length / 3)); }
      else if (m.life > 0) { if (m.pump) { const b = m.bays[m.hose]; b.fill = Math.min(1, b.fill + dt * 0.26); } else { const b = m.bays.find(q => q.fill < 1); if (b) b.fill = Math.min(1, b.fill + dt * 0.058 * m.crew.filter(c => c === 0).length); } }
      const fl = m.crew.filter(c => c === 1).length; let left = fl; m.bays.forEach(b => { if (b.fill >= 1 && b.fin < 1) { b.age += dt; if (b.age > 17) b.rough = true; if (left > 0) { const use = Math.min(left, 2); b.fin = Math.min(1, b.fin + dt * 0.075 * use); left -= use; } } });
      const over = m.bays.every(b => b.fill >= 1 && b.fin >= 1) || (m.life <= 0 && m.bays.every(b => b.fill < 1 || b.fin >= 1 || b.age > 30)) || m.t > 150;
      if (over) { let sc = 0, good = 0, rough = 0; m.bays.forEach(b => { if (b.fill >= 1 && b.fin >= 1) { if (b.rough) { sc += 0.55; rough++; } else { sc += 1; good++; } } else if (b.fill >= 1) { sc += 0.3; rough++; } }); jobDone(m, sc / 6, `${good} of 6 bays placed and floated in time${rough ? ', ' + rough + ' gone off rough' : ''}${6 - good - rough ? ', ' + (6 - good - rough) + ' never poured' : ''}. ${good === 6 ? 'One slab, no cold joints.' : 'It will be looked at every time they park on it.'}`); }
    }
  }
  function drawPour() {
    const m = mode, here = m.truck === 'here', bx = i => 210 + i * 70, tm = performance.now() / 1000;
    ctx.fillStyle = '#1c1f22'; ctx.fillRect(0, 0, CW, CH); ctx.fillStyle = '#2f3337'; ctx.fillRect(0, 300, CW, 60); ctx.fillStyle = '#35553c'; ctx.fillRect(0, 60, CW, 240);
    ctx.fillStyle = '#6a6f74'; ctx.fillRect(40, 90, 120, 110); ctx.fillStyle = '#4a4f54'; ctx.fillRect(40, 145, 120, 55);
    m.bays.forEach((b, i) => { const x = bx(i), y = 110, w = 66, h = 170; ctx.fillStyle = m.prep[1] >= 1 ? '#8a7a55' : '#5a5347'; ctx.fillRect(x, y, w, h); if (m.prep[2] > 0) { ctx.strokeStyle = `rgba(20,20,20,${0.25 + 0.5 * m.prep[2]})`; ctx.lineWidth = 0.7; ctx.beginPath(); for (let q = 8; q < w; q += 10) { ctx.moveTo(x + q, y); ctx.lineTo(x + q, y + h * m.prep[2]); } for (let q = 8; q < h * m.prep[2]; q += 10) { ctx.moveTo(x, y + q); ctx.lineTo(x + w, y + q); } ctx.stroke(); }
      if (b.fill > 0) { ctx.fillStyle = b.rough ? '#77736a' : b.fin >= 1 ? '#c9c5ba' : '#a39f95'; ctx.fillRect(x, y + h * (1 - b.fill), w, h * b.fill); if (b.fin > 0 && b.fin < 1) { ctx.fillStyle = '#c9c5ba'; ctx.fillRect(x, y + h * (1 - b.fill), w * b.fin, h * b.fill); } if (b.fill >= 1 && b.fin < 1) bar(x + 6, y + 6, w - 12, 5, 1 - b.age / 17, b.age > 12 ? '#e32017' : '#ffd300'); }
      if (m.prep[0] > 0) { ctx.strokeStyle = '#c9a36b'; ctx.lineWidth = 3; ctx.strokeRect(x + 1, y + 1, w - 2, (h - 2) * Math.min(1, m.prep[0] * 1.2)); } });
    if (m.truck !== 'none') { const tx = here ? 60 : 60 - m.eta * 30; ctx.fillStyle = '#e6efe9'; ctx.fillRect(tx, 308, 36, 30); ctx.fillStyle = '#9aa3a0'; ctx.save(); ctx.translate(tx + 70, 322); ctx.rotate(tm * 2); ctx.beginPath(); ctx.ellipse(0, 0, 30, 17, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#6a6f74'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.stroke(); ctx.restore(); disc(tx + 14, 342, 7, '#0c0f12'); disc(tx + 84, 342, 7, '#0c0f12'); }
    if (here && m.pump) { const hx = bx(m.hose) + 33; ctx.strokeStyle = '#0c0f12'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(130, 316); ctx.quadraticCurveTo(hx - 60, 60, hx, 150); ctx.stroke(); disc(hx, 152, 5, '#ffd300'); }
    const cnt = []; for (let q = 0; q < 3; q++) cnt.push(m.crew.filter(c => c === q).length);
    if (!here) PREP.forEach((nm, r) => { for (let i = 0; i < cnt[r]; i++) figure(230 + r * 160 + i * 16, 296, 0.2, 1, Math.sin(tm * 8 + i + r) > 0 ? 'wpunch' : 'idle', SCOL[r]); });
    else { for (let i = 0; i < cnt[0]; i++) { const f = (tm * 0.35 + i / Math.max(1, cnt[0])) % 1, tgt = m.bays.findIndex(b => b.fill < 1), tx = tgt < 0 ? 200 : bx(tgt) + 30, x = f < 0.5 ? 150 + (tx - 150) * f * 2 : tx - (tx - 150) * (f - 0.5) * 2; figure(x, 300, 0.2, f < 0.5 ? 1 : -1, 'shove', SCOL[0]); if (!m.pump) { ctx.fillStyle = f < 0.5 ? '#a39f95' : '#39424a'; ctx.fillRect(x + (f < 0.5 ? 6 : -18), 290, 12, 6); } } const fb = m.bays.findIndex(b => b.fill >= 1 && b.fin < 1); for (let i = 0; i < cnt[1]; i++) figure((fb < 0 ? 620 : bx(fb) + 14) + i * 16, 286, 0.2, 1, Math.sin(tm * 6 + i) > 0 ? 'shove' : 'idle', SCOL[1]); }
    const names = here ? PJOB : PREP; names.forEach((nm, q) => { ctx.fillStyle = 'rgba(8,10,12,.85)'; ctx.fillRect(8 + q * 150, CH - 54, 144, 20); ctx.fillStyle = SCOL[q]; ctx.fillRect(12 + q * 150, CH - 50, 12, 12); text(`${q + 1}  ${nm}: ${cnt[q]}${!here ? '  ' + Math.round(m.prep[q] * 100) + '%' : ''}`, 30 + q * 150, CH - 40, { align: 'left', size: 11, bold: true }); });
    if (m.truck !== 'none') { text(here ? 'workable' : 'truck in ' + Math.ceil(m.eta) + 's', 500, 44, { align: 'right', size: 10 }); bar(506, 36, 200, 9, here ? m.life : 1 - m.eta / 10, m.life < 0.3 ? '#e32017' : '#ffd300'); }
    text(here ? (m.pump ? 'A/D: swing the pump hose bay to bay · 1/2: put one more on barrows or floats · each poured bay must be floated before its bar runs out' : '1/2: one more on barrows or on floats · barrows fill the bays in order · each poured bay must be floated before its bar runs out') : 'Boxing, then base, then mesh, each needs the one before half done. 1/2/3: one more on that. T: order the truck (10 s). Do not order it early.', CW / 2, CH - 16, { size: 10.5, color: '#cfe3d6' });
    header(`CONCRETE · driveway · ${here ? (m.pump ? 'pump truck on site' : 'no pump yet: it goes in by wheelbarrow') : m.truck === 'coming' ? 'truck on its way' : 'prep'}`);
  }

  // ───────────────── The bench: scrap in at one end, a machine out at the other ─────────────────
  // Each machine is six parts drawn on a 300×200 sheet: p = plate [x, y, w, h], s = shaft [x, y, w, h], g = gear [cx, cy, r].
  const MACH = {
    tractor: [['p', 70, 120, 150, 26], ['p', 150, 62, 62, 58], ['p', 76, 88, 74, 32], ['g', 185, 150, 36], ['g', 95, 158, 22], ['s', 98, 48, 9, 40]],
    brickpress: [['p', 70, 168, 170, 20], ['p', 70, 44, 170, 18], ['p', 120, 62, 70, 38], ['s', 84, 62, 12, 106], ['s', 214, 62, 12, 106], ['g', 155, 128, 24]],
    sawmill: [['p', 50, 150, 210, 18], ['p', 70, 116, 80, 30], ['s', 66, 168, 10, 30], ['s', 234, 168, 10, 30], ['g', 200, 112, 40], ['g', 110, 100, 14]],
    excavator: [['p', 60, 160, 150, 24], ['p', 80, 96, 64, 60], ['s', 140, 84, 100, 12], ['s', 228, 90, 12, 60], ['g', 112, 158, 16], ['g', 234, 158, 18]],
  };
  const PCOL = { p: '#8fa0b5', s: '#cfd6d9', g: '#d98f4c' }, PARTN = { p: 'plate', s: 'shaft', g: 'gear' }, PKEY = { j: 'p', k: 's', l: 'g' };
  const pc = q => (q[0] === 'g' ? { x: q[1], y: q[2] } : { x: q[1] + q[3] / 2, y: q[2] + q[4] / 2 }); // a part's centre on the sheet
  function drawPart(q, ox, oy, sc, ghost) {
    ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc); ctx.fillStyle = PCOL[q[0]]; ctx.strokeStyle = ghost ? 'rgba(255,255,255,.4)' : '#10181c'; ctx.lineWidth = ghost ? 1.2 : 1.5; if (ghost) ctx.setLineDash([4, 4]);
    if (q[0] === 'g') { ctx.beginPath(); ctx.arc(q[1], q[2], q[3], 0, 7); if (!ghost) ctx.fill(); ctx.stroke(); if (!ghost) { ctx.setLineDash([q[3] * 0.3, q[3] * 0.3]); ctx.lineWidth = q[3] * 0.22; ctx.strokeStyle = PCOL.g; ctx.beginPath(); ctx.arc(q[1], q[2], q[3] * 1.06, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#10181c'; ctx.beginPath(); ctx.arc(q[1], q[2], q[3] * 0.25, 0, 7); ctx.fill(); } }
    else { if (!ghost) ctx.fillRect(q[1], q[2], q[3], q[4]); ctx.strokeRect(q[1], q[2], q[3], q[4]); if (!ghost && q[0] === 'p') { ctx.fillStyle = '#10181c'; [[4, 4], [q[3] - 4, 4], [4, q[4] - 4], [q[3] - 4, q[4] - 4]].forEach(b => { ctx.beginPath(); ctx.arc(q[1] + b[0], q[2] + b[1], 1.6, 0, 7); ctx.fill(); }); } }
    ctx.setLineDash([]); ctx.restore();
  }
  function drawMachine(type, ox, oy, sc) { MACH[type].forEach(q => drawPart(q, ox, oy, sc, false)); }
  function startBench(type) {
    const need = { p: 0, s: 0, g: 0 }; MACH[type].forEach(q => need[q[0]]++);
    mode = { type: 'bench', mt: type, lvl: G.shopLevel(S), stage: 0, need, bins: { p: 0, s: 0, g: 0 }, belt: [], left: 11, spawn: 0.5, miss: 0, short: 0, parts: [], drag: null, torq: null, acc: [], done: null };
  }
  function benchAssemble() { // the parts you stripped go in the tray; anything you could not find is bought in
    const m = mode; let short = 0; for (const k in m.need) short += Math.max(0, m.need[k] - m.bins[k]); m.short = short; m.stage = 1;
    const order = MACH[m.mt].map((q, i) => i).sort(() => Math.random() - 0.5); m.parts = MACH[m.mt].map((q, i) => ({ q, i, placed: false, tx: 80 + order.indexOf(i) * 112, ty: 392 })); m.parts.forEach(a => { a.x = a.tx; a.y = a.ty; });
    say(short ? `${short} part${short === 1 ? '' : 's'} short: bought in, and it will show.` : 'Everything you need, off the scrap pile. Now put it together.');
  }
  function benchKey(k) {
    const m = mode; if (m.done) return;
    if (m.stage === 0 && PKEY[k]) { const e = m.belt.find(e => e.x > 418 && e.x < 512); if (!e) return; m.belt.splice(m.belt.indexOf(e), 1); if (e.kind === PKEY[k]) { m.bins[e.kind]++; if (Object.keys(m.need).every(q => m.bins[q] >= m.need[q])) benchAssemble(); } else { m.miss++; say(`That was a ${PARTN[e.kind]}. Into the swarf.`); } }
    else if (m.stage === 1 && k === ' ' && m.torq) benchSeat();
  }
  function benchSeat() { const m = mode, t = m.torq, a = clamp(1 - Math.abs(t.pos - 0.5) / 0.5 * 1.6, 0, 1); m.acc.push(a); m.parts[t.i].placed = true; m.torq = null; say(a > 0.85 ? 'Seated true.' : a > 0.5 ? 'Tight enough.' : 'Cross-threaded. It holds, more or less.'); if (m.parts.every(q => q.placed)) { const q = clamp(m.acc.reduce((x, y) => x + y, 0) / m.acc.length * (1 - 0.06 * m.miss) * (1 - 0.1 * m.short), 0, 1), up = G.benchFinish(S, m.mt, q); m.q = q; m.done = `${D.machines[m.mt].name} built: ${Math.round(q * 100)}% workmanship.${up ? ' Workshop level ' + G.shopLevel(S) + ': every machine takes one less scrap.' : ''} It is in the yard, ready to place.`; light(); } }
  const B0 = { x: 210, y: 76 }; // where the sheet sits on the assembly stand
  function benchDown() { const m = mode; if (m.done || m.stage !== 1) return; if (m.torq) return benchSeat(); const a = m.parts.find(a => !a.placed && Math.hypot(a.x - mouse.x, a.y - mouse.y) < 40); if (a) m.drag = a; }
  function benchMove() { const m = mode; if (m.drag) { m.drag.x = mouse.x; m.drag.y = mouse.y; } }
  function benchUp() { const m = mode, a = m.drag; if (!a) return; m.drag = null; const c = pc(a.q); if (Math.hypot(a.x - (B0.x + c.x), a.y - (B0.y + c.y)) < 36) { a.x = B0.x + c.x; a.y = B0.y + c.y; m.torq = { i: a.i, ph: 0, pos: 0 }; } else { a.x = a.tx; a.y = a.ty; } }
  function stepBench(dt) {
    const m = mode; if (m.done) return;
    if (m.stage === 0) {
      m.spawn -= dt; if (m.spawn <= 0 && m.left > 0) { m.spawn = 1.15; m.left--; const want = Object.keys(m.need).filter(k => m.bins[k] + m.belt.filter(e => e.kind === k).length < m.need[k]), kinds = want.length && Math.random() < 0.8 ? want : ['p', 's', 'g']; m.belt.push({ kind: kinds[Math.floor(Math.random() * kinds.length)], x: -24, r: Math.random() * 6 }); }
      const v = 150 - 9 * m.lvl; for (let i = m.belt.length - 1; i >= 0; i--) { const e = m.belt[i]; e.x += v * dt; if (e.x > 536) { m.belt.splice(i, 1); m.miss++; } }
      if (m.left <= 0 && !m.belt.length) benchAssemble();
    } else if (m.torq) { m.torq.ph += dt * (2.7 - 0.22 * m.lvl); m.torq.pos = 0.5 + 0.5 * Math.sin(m.torq.ph * 2.2); }
  }
  function drawBench() {
    const m = mode, tm = performance.now() / 1000, sheet = MACH[m.mt];
    ctx.fillStyle = '#20262b'; ctx.fillRect(0, 0, CW, CH); ctx.fillStyle = '#2b3138'; ctx.fillRect(0, 300, CW, 140); ctx.fillStyle = '#343c44'; for (let x = 0; x < CW; x += 60) ctx.fillRect(x, 24, 2, 276); // wall studs
    if (m.stage === 0) {
      ctx.fillStyle = '#5b4a2a'; ctx.fillRect(4, 150, 60, 80); for (let i = 0; i < Math.min(8, m.left); i++) { ctx.fillStyle = ['#8fa0b5', '#cfd6d9', '#d98f4c'][i % 3]; ctx.fillRect(10 + (i % 4) * 12, 160 + Math.floor(i / 4) * 14 + (i % 3) * 3, 10, 10); } text('scrap', 34, 244, { size: 10, color: '#8aa69d' });
      ctx.fillStyle = '#15191c'; ctx.fillRect(0, 196, 540, 44); ctx.strokeStyle = '#3d4852'; ctx.lineWidth = 2; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -(tm * (150 - 9 * m.lvl)) % 20; ctx.beginPath(); ctx.moveTo(0, 218); ctx.lineTo(540, 218); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      ctx.strokeStyle = '#e6b84a'; ctx.lineWidth = 3; ctx.strokeRect(418, 178, 94, 80); text('the cutter', 465, 172, { size: 10, color: '#e6b84a' });
      m.belt.forEach(e => drawPart(e.kind === 'g' ? ['g', 0, 0, 15] : e.kind === 's' ? ['s', -4, -17, 8, 34] : ['p', -17, -12, 34, 24], e.x, 218, 1, false));
      ['p', 's', 'g'].forEach((k, i) => { const x = 570, y = 110 + i * 92; ctx.fillStyle = '#39424a'; ctx.fillRect(x, y, 130, 70); ctx.strokeStyle = PCOL[k]; ctx.lineWidth = 2; ctx.strokeRect(x, y, 130, 70); text(['J', 'K', 'L'][i], x + 18, y + 44, { bold: true, size: 26, color: PCOL[k] }); text(PARTN[k] + 's', x + 76, y + 30, { size: 12, bold: true }); text(`${Math.min(m.bins[k], m.need[k])} of ${m.need[k]}`, x + 76, y + 50, { size: 12, color: m.bins[k] >= m.need[k] ? '#7dff9a' : '#f2e58a' }); });
      ctx.globalAlpha = 0.5; sheet.forEach(q => drawPart(q, 200, 30, 0.45, true)); ctx.globalAlpha = 1; text('what you are building: ' + D.machines[m.mt].name.toLowerCase(), 268, 136, { size: 10, color: '#8aa69d' });
      header(`THE BENCH · strip the scrap · ${m.left + m.belt.length} pieces to come · lost ${m.miss} · as each piece reaches the cutter, press J, K or L for its bin`);
    } else {
      ctx.fillStyle = '#15191c'; ctx.fillRect(B0.x - 20, B0.y + 196, 340, 10); ctx.fillRect(B0.x, B0.y + 206, 12, 40); ctx.fillRect(B0.x + 288, B0.y + 206, 12, 40); // the stand
      sheet.forEach((q, i) => { if (!m.parts[i].placed) drawPart(q, B0.x, B0.y, 1, true); }); m.parts.forEach(a => { if (a.placed) drawPart(a.q, B0.x, B0.y, 1, false); });
      ctx.fillStyle = '#39424a'; ctx.fillRect(20, 352, CW - 40, 78); text('tray', 34, 366, { align: 'left', size: 10, color: '#8aa69d' });
      m.parts.forEach(a => { if (a.placed) return; const c = pc(a.q), held = m.drag === a || (m.torq && m.torq.i === a.i), sc = held ? 1 : 0.42; drawPart(a.q, a.x - c.x * sc, a.y - c.y * sc, sc, false); });
      if (m.torq) { const a = m.parts[m.torq.i], c = pc(a.q), x = B0.x + c.x, y = B0.y + c.y; ctx.fillStyle = 'rgba(8,18,20,.9)'; ctx.fillRect(x - 62, y - 54, 124, 22); ctx.fillStyle = '#2f9e7a'; ctx.fillRect(x - 62 + 124 * 0.4, y - 54, 124 * 0.2, 22); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 62 + 124 * m.torq.pos - 2, y - 58, 4, 30); text('Space or click to seat it', x, y - 62, { size: 10, color: '#e6b84a' }); }
      header(`THE BENCH · assemble the ${D.machines[m.mt].name.toLowerCase()} · ${m.parts.filter(a => a.placed).length} of 6 · drag each part onto its outline, then seat it on the green`);
    }
  }

  // ───────────────── Tutoring: find where it went wrong ─────────────────
  function tutorProblem(lvl) {
    const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), e = R(0, 2);
    if (lvl >= 1 && Math.random() < 0.45) { // a percentage
      const pct = [10, 15, 20, 25, 30, 40, 60, 75][R(0, 7)], n = R(2, 9 + lvl * 2) * 20, d = pct / 100, r = Math.round(d * n * 100) / 100;
      const d2 = e === 0 ? pct / 10 : d, lines = [`${pct}% = ${pct} ÷ ${e === 0 ? 10 : 100} = ${d2}`, e === 1 ? `${d2} + ${n}` : `${d2} × ${n}`, `= ${e === 1 ? Math.round((d2 + n) * 100) / 100 : e === 2 ? Math.round((d2 * n + n / 10) * 100) / 100 : Math.round(d2 * n * 100) / 100}`];
      return { q: `Find ${pct}% of ${n}`, lines, e, why: ['A percentage is out of 100, not 10.', '"Of" means multiply, not add.', `${d} × ${n} is ${r}. A slip in the multiplying.`][e] };
    }
    const a = R(2, 4 + lvl), x = R(2, 9), b = R(1, 12), c = a * x + b, v = e === 0 ? c + b : e === 1 ? c - b + (Math.random() < 0.5 ? 2 : -2) : c - b, x2 = e === 2 ? v * a : Math.round(v / a * 10) / 10;
    return { q: `Solve  ${a}x + ${b} = ${c}`, lines: [`${a}x = ${c} ${e === 0 ? '+' : '−'} ${b}`, `${a}x = ${v}`, `x = ${x2}`], e, why: [`The ${b} is added on the left, so it is taken away from both sides.`, `${c} − ${b} is ${c - b}. A slip in the subtracting.`, `${a}x means ${a} times x, so divide by ${a}.`][e] };
  }
  function startTutor() { const lvl = G.tutorLevel(S); mode = { type: 'tutor', lvl, n: 0, total: 4, ok: 0, prob: tutorProblem(lvl), t: 15 - lvl, fb: null, done: null }; }
  function tutorPick(i) {
    const m = mode; if (m.done || m.fb) return; const right = i === m.prob.e; if (right) m.ok++;
    m.fb = { t: right ? 1.6 : 2.6, right, pick: i };
  }
  function stepTutor(dt) {
    const m = mode; if (m.done) return;
    if (m.fb) { m.fb.t -= dt; if (m.fb.t <= 0) { m.fb = null; m.n++; if (m.n >= m.total) { const q = m.ok / m.total, was = G.tutorLevel(S), paid = G.finishBuild(S, q); m.done = `${m.ok} of ${m.total} found. ${q >= 0.75 ? 'They went home knowing why, not just what.' : q >= 0.5 ? 'Some of it landed.' : 'A long hour for both of you.'} Paid ${money(paid)}.${G.tutorLevel(S) > was ? ' Tutoring level ' + G.tutorLevel(S) + ': harder students, 15% more an hour.' : ''}`; light(); } else { m.prob = tutorProblem(m.lvl); m.t = 15 - m.lvl; } } return; }
    m.t -= dt; if (m.t <= 0) tutorPick(-1);
  }
  function drawTutor() {
    const m = mode, P = m.prob;
    ctx.fillStyle = '#2a2f2a'; ctx.fillRect(0, 0, CW, CH); ctx.fillStyle = '#3a3328'; ctx.fillRect(0, 350, CW, 90);
    ctx.fillStyle = '#f4f1e6'; ctx.fillRect(190, 50, 440, 260); ctx.strokeStyle = '#8a6f3c'; ctx.lineWidth = 6; ctx.strokeRect(190, 50, 440, 260);
    text(P.q, 410, 96, { bold: true, size: 22, color: '#1a2a3a' }); text('their working:', 214, 128, { align: 'left', size: 11, color: '#6a6a5a' });
    P.lines.forEach((l, i) => { const y = 150 + i * 50, hot = !m.fb && mouse.x > 210 && mouse.x < 610 && mouse.y > y - 4 && mouse.y < y + 38, show = m.fb && (i === P.e || i === m.fb.pick); ctx.fillStyle = show ? (i === P.e ? 'rgba(217,99,76,.25)' : 'rgba(120,120,120,.2)') : hot ? 'rgba(111,179,217,.2)' : 'rgba(0,0,0,.04)'; ctx.fillRect(210, y - 4, 400, 42); text(l, 410, y + 24, { size: 20, color: '#2a4a8a' }); if (show && i === P.e) text('← here', 596, y + 23, { align: 'right', size: 12, bold: true, color: '#b03a2a' }); });
    if (m.fb) text((m.fb.right ? 'Yes. ' : m.fb.pick < 0 ? 'Too slow. ' : 'Not that line. ') + P.why, 410, 334, { size: 12.5, bold: true, color: m.fb.right ? '#9fe0c4' : '#f0a898' });
    ctx.fillStyle = '#6b5d3f'; ctx.fillRect(40, 330, 130, 12); figure(86, 392, 0.75, 1, 'idle', '#e6b84a'); figure(660, 400, 0.9, -1, m.fb && m.fb.right ? 'punch' : 'idle', '#6fb3d9');
    text('them', 86, 408, { size: 10, color: '#8aa69d' }); text('you', 660, 416, { size: 10, color: '#8aa69d' });
    if (!m.fb) bar(190, 318, 440, 6, m.t / (15 - m.lvl), '#e6b84a');
    header(`TUTORING · problem ${Math.min(m.total, m.n + 1)} of ${m.total} · found ${m.ok} · level ${m.lvl} · click the first line where their working goes wrong`);
  }

  // ───────────────── Scale 2: the city network ─────────────────
  let selMachine = null, sel = null; const runners = [];
  const MLET = { tractor: 'T', brickpress: 'B', sawmill: 'S', excavator: 'E' };
  const FAC = [['waste', 'scrap yard', 'yard'], ['recycle', 'recycling', 'yard'], ['engshop', 'engineering shop', 'yard'], ['pyrolysis', 'plastic-to-diesel', 'yard'], ['gvcs', 'toolkit', 'yard'], ['aerostat', 'aerostat', 'yard'], ['housing', 'housing · aged care · ECE', 'roslyn'], ['school', 'ten-till-two school', 'roslyn'], ['gym', 'garage gym', 'highbury'], ['patrols', 'patrols', 'square'], ['finance', 'finance office', 'square'], ['councilrun', 'council seat', 'square'], ['civil', 'civil depot', 'milson']];
  function sendTo(n) {
    if (!G.reachable(S, n.id)) return say(G.connected(S, n.id) ? n.name + ' is already connected.' : 'Not next to your network yet. Connect a neighbour first.');
    if (S.dispatch <= 0) return say('No crews left to send this season.');
    const from = n.adj.map(a => G.NODE[a]).find(a => G.connected(S, a.id));
    G.sendCrew(S, n.id); runners.push({ a: from, b: n, t: 0 }); full();
  }
  // Palmerston North, simplified: the Square and its tilted grid, the river round the south, the railway and the
  // industrial strip to the north, the airport, the hospital, the racecourse, Massey across the bridge.
  let cityMap = null;
  function buildCity() {
    const c = document.createElement('canvas'); c.width = CW * 2; c.height = CH * 2; const g = c.getContext('2d'); g.scale(2, 2);
    let h = 17; const r = () => (h = (h * 137 + 71) % 9973) / 9973, TH = -0.42, ux = Math.cos(TH), uy = Math.sin(TH), SQ = { x: 350, y: 222 }, R = (u, v) => ({ x: SQ.x + ux * u - uy * v, y: SQ.y + uy * u + ux * v });
    const bez = (p0, p1, p2, p3, t) => { const m = 1 - t; return { x: m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0], y: m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1] }; };
    const river = []; [[[720, 150], [600, 200], [560, 330], [470, 350]], [[470, 350], [400, 365], [330, 335], [250, 355]], [[250, 355], [180, 372], [120, 400], [40, 440]]].forEach(b => { for (let t = 0; t <= 1; t += 0.05) river.push(bez(b[0], b[1], b[2], b[3], t)); });
    const riverY = x => { let best = river[0]; river.forEach(q => { if (Math.abs(q.x - x) < Math.abs(best.x - x)) best = q; }); return best.y; }, railY = x => (x < 300 ? 150 - (x - 40) * 55 / 260 : x < 520 ? 95 - (x - 300) * 55 / 220 : 40 - (x - 520) * 30 / 200);
    g.fillStyle = '#263c2c'; g.fillRect(0, 0, CW, CH);
    for (let i = 0; i < 70; i++) { g.fillStyle = `hsl(${92 + r() * 30},${24 + r() * 14}%,${20 + r() * 9}%)`; g.save(); g.translate(r() * CW, r() * CH); g.rotate(TH + (r() - 0.5) * 0.3); g.fillRect(-40, -22, 50 + r() * 70, 26 + r() * 40); g.restore(); } // paddocks
    const inTown = p => { const dx = p.x - 345, dy = p.y - 200, a = -0.12, X = dx * Math.cos(a) + dy * Math.sin(a), Y = -dx * Math.sin(a) + dy * Math.cos(a); return (X / 285) ** 2 + (Y / 148) ** 2 < 1 && p.y < riverY(p.x) - 14; };
    // the street grid shows through as the gaps between blocks
    const PARK = [[0, 0, 24], [-150, 70, 20], [150, 95, 22], [120, -110, 16]], near = (p, q, d) => Math.hypot(p.x - q.x, p.y - q.y) < d, yard = D.city.find(n => n.home);
    for (let u = -330; u <= 330; u += 25) for (let v = -200; v <= 200; v += 21) {
      const p = R(u, v); if (!inTown(p) || PARK.some(q => Math.hypot(u - q[0], v - q[1]) < q[2])) continue;
      const north = p.y < railY(p.x) + 8, strip = !north && p.y < railY(p.x) + 44, dSq = Math.hypot(u, v), cbd = dSq < 62, ind = strip || near(p, yard, 60) || north;
      if (north && !near(p, yard, 90) && r() < 0.6) continue;
      g.save(); g.translate(p.x, p.y); g.rotate(TH); g.fillStyle = '#343b40'; g.fillRect(-12.5, -10.5, 25, 21); // road surface
      g.fillStyle = cbd ? '#4f555a' : ind ? '#565246' : '#2f4f38'; g.fillRect(-10.5, -8.5, 21, 17);
      if (cbd) { const n = 1 + Math.floor(r() * 3); for (let i = 0; i < n; i++) { const w = 6 + r() * 9, hh = 6 + r() * 8, x = -9.5 + r() * (19 - w), y = -7.5 + r() * (15 - hh); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 1.5, y + 1.5, w, hh); g.fillStyle = ['#8d8577', '#9aa3a0', '#7d848a', '#a89b84', '#6f7c88'][Math.floor(r() * 5)]; g.fillRect(x, y, w, hh); } }
      else if (ind) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-7.5, -5.5, 17, 11); g.fillStyle = ['#8fa0b5', '#9aa3a0', '#a8b0a0'][Math.floor(r() * 3)]; g.fillRect(-9, -7, 17, 11); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 0.5; g.beginPath(); for (let i = -6; i < 8; i += 3.5) { g.moveTo(i, -7); g.lineTo(i, 4); } g.stroke(); }
      else { for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { if (r() < 0.12) continue; g.fillStyle = ['#b5694f', '#8f5a48', '#7d8790', '#a39274', '#c2b39a', '#6f8a7a'][Math.floor(r() * 6)]; g.fillRect(-9.5 + i * 5, sd < 0 ? -7.5 : 3.5, 3.6, 3.8); } if (r() < 0.5) { g.fillStyle = '#2a6a3a'; g.beginPath(); g.arc(-6 + r() * 12, 0, 1.6, 0, 7); g.fill(); } }
      g.restore();
    }
    const blockAt = (u, v, w, hh, fill) => { const p = R(u, v); g.save(); g.translate(p.x, p.y); g.rotate(TH); g.fillStyle = fill; g.fillRect(-w / 2, -hh / 2, w, hh); return p; }, lab = (t, x, y, col, sz) => { g.font = (sz || 7.5) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = col || 'rgba(230,239,233,.75)'; g.fillText(t, x, y); };
    blockAt(0, 0, 40, 36, '#3d8a4a'); g.strokeStyle = '#c9b98a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-20, 0); g.lineTo(20, 0); g.moveTo(0, -18); g.lineTo(0, 18); g.stroke(); g.fillStyle = '#e6efe9'; g.fillRect(-2, -2, 4, 4); g.fillStyle = '#2a6a3a'; [[-12, -10], [12, -10], [-12, 10], [12, 10], [-6, 12], [8, -12]].forEach(q => { g.beginPath(); g.arc(q[0], q[1], 3, 0, 7); g.fill(); }); g.restore();
    blockAt(-150, 70, 34, 30, '#3d7a45'); g.restore(); blockAt(150, 95, 38, 34, '#3d7a45'); g.fillStyle = '#2b7ea1'; g.beginPath(); g.ellipse(2, 0, 14, 6, 0.3, 0, 7); g.fill(); g.restore(); // the lagoon
    { const p = blockAt(120, -110, 28, 24, '#e6efe9'); g.fillStyle = '#d9634c'; g.fillRect(-2, -7, 4, 14); g.fillRect(-7, -2, 14, 4); g.restore(); lab('Hospital', p.x, p.y + 20); }
    { const p = { x: 96, y: 348 }; g.strokeStyle = '#c9b98a'; g.lineWidth = 4; g.fillStyle = '#3d7a45'; g.beginPath(); g.ellipse(p.x, p.y, 34, 17, -0.25, 0, 7); g.fill(); g.stroke(); lab('Awapuni racecourse', p.x, p.y + 30); }
    { g.fillStyle = '#3a5a44'; g.beginPath(); g.ellipse(395, 398, 62, 26, 0, 0, 7); g.fill(); for (let i = 0; i < 9; i++) { g.fillStyle = ['#a89b84', '#8d8577', '#b5694f'][i % 3]; g.fillRect(350 + (i % 5) * 20 + r() * 6, 384 + Math.floor(i / 5) * 16 + r() * 4, 11, 7); } lab('Massey University', 404, 432); }
    g.strokeStyle = '#3d8a4a'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); river.forEach((q, i) => { if (q.x > 380 && q.x < 520) { i && q.x < 519 ? g.lineTo(q.x, q.y - 13) : g.moveTo(q.x, q.y - 13); } }); g.stroke(); lab('Victoria Esplanade', 452, 328);
    g.strokeStyle = '#1f6a8a'; g.lineWidth = 13; g.lineJoin = 'round'; g.beginPath(); river.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.stroke(); g.strokeStyle = '#2b8ab0'; g.lineWidth = 9; g.stroke(); lab('MANAWATŪ RIVER', 610, 262, '#8fd0ea', 8);
    // the airport, north of the line
    g.fillStyle = '#3f4a44'; g.beginPath(); g.moveTo(292, 10); g.lineTo(440, 22); g.lineTo(436, 52); g.lineTo(300, 46); g.fill(); g.strokeStyle = '#59646a'; g.lineWidth = 6; g.beginPath(); g.moveTo(304, 26); g.lineTo(432, 40); g.stroke(); g.strokeStyle = '#e6efe9'; g.lineWidth = 0.8; g.setLineDash([6, 5]); g.stroke(); g.setLineDash([]); g.fillStyle = '#9aa3a0'; g.fillRect(350, 40, 22, 7); lab('Airport', 366, 20);
    // arterials
    const road = (pts, nm, at) => { const P2 = pts.map(q => (q.length === 3 ? { x: q[0], y: q[1] } : R(q[0], q[1]))); g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); P2.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.strokeStyle = '#14181b'; g.lineWidth = 6; g.stroke(); g.strokeStyle = '#7a848a'; g.lineWidth = 3.6; g.stroke(); if (nm) { const a = P2[at || 0], b = P2[(at || 0) + 1]; let ang = Math.atan2(b.y - a.y, b.x - a.x); if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI; g.save(); g.translate(a.x + (b.x - a.x) * 0.5, a.y + (b.y - a.y) * 0.5); g.rotate(ang); g.font = 'bold 6.5px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#e6efe9'; g.fillText(nm.toUpperCase(), 0, -4.5); g.restore(); } };
    road([[-330, 0], [-24, 0]], 'Main St'); road([[24, 0], [200, 0], [640, 150, 1], [720, 138, 1]], 'Main St'); road([[0, -20], [0, -190]], 'Rangitikei St'); road([[0, 20], [0, 116], [395, 372, 1], [352, 402, 1]], 'Fitzherbert Ave');
    road([[-290, -72], [280, -72]], 'Featherston St'); road([[110, -170], [110, 140]], 'Ruahine St'); road([[20, -28], [250, -28]], 'Broadway Ave'); road([[-20, 14], [-150, 30], [60, 360, 1], [0, 410, 1]], 'Pioneer Hwy', 1); road([[-250, 60], [240, 60]], 'College St');
    road([[40, 164, 1], [300, 109, 1], [520, 54, 1], [720, 24, 1]], 'Tremaine Ave', 1);
    // the main trunk line and the station
    g.beginPath(); [[40, 150], [300, 95], [520, 40], [720, 10]].forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.strokeStyle = '#0e1315'; g.lineWidth = 4.5; g.stroke(); g.setLineDash([3, 3]); g.strokeStyle = '#b9c0c3'; g.lineWidth = 1.6; g.stroke(); g.setLineDash([]); g.fillStyle = '#b5694f'; g.fillRect(318, 84, 18, 6); lab('Station', 327, 80); lab('MAIN TRUNK LINE', 160, 112, 'rgba(230,239,233,.6)', 6.5);
    lab('The Square', R(0, 30).x + 4, R(0, 30).y + 4, '#cfe8d4', 7); lab('Lagoon', R(150, 95).x, R(150, 95).y + 24);
    return utilitarian(c);
  }
  // Maps are drawn in colour and then drained: grey ground and footprints, water left faintly blue, so that the only
  // strong colour on screen is the network you are building (tube-map lines) and the things that need you.
  function utilitarian(c) {
    const g = c.getContext('2d'), im = g.getImageData(0, 0, c.width, c.height), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i + 1], b = d[i + 2], l = 0.3 * r + 0.59 * gg + 0.11 * b, water = b > gg + 10 && b > r + 24, k = water ? 0.5 : 0.1, m = water ? 0.82 : 1; d[i] = (l + (r - l) * k) * m; d[i + 1] = (l + (gg - l) * k) * m; d[i + 2] = (l + (b - l) * k) * (water ? 0.95 : 1.04); }
    g.putImageData(im, 0, 0); return c;
  }
  const TUBE = ['#e32017', '#0098d4', '#00a94f', '#ffd300', '#9b0056', '#ee7c0e', '#7156a5', '#f3a9bb', '#95cdba', '#b36305'];
  const CLINES = [['yard', 'milson', 'takaro', 'highbury', 'westend', 'awapuni', 'massey'], ['yard', 'roslyn', 'square', 'westend'], ['yard', 'kelvin', 'terrace', 'hokowhitu', 'massey'], ['roslyn', 'terrace'], ['takaro', 'square'], ['square', 'hokowhitu']];
  const HLINES = [['marton', 'bulls', 'foxton', 'levin', 'otaki', 'kapiti', 'wellington'], ['whanganui', 'bulls', 'pn', 'woodville'], ['dannevirke', 'woodville', 'pahiatua', 'masterton', 'wellington'], ['pn', 'levin'], ['pn', 'feilding', 'marton'], ['pn', 'ramp', 'foxton']];
  const lineOf = (L, a, b) => { const i = L.findIndex(q => q.some((x, k) => (x === a && q[k + 1] === b) || (x === b && q[k + 1] === a))); return TUBE[(i < 0 ? 7 : i) % TUBE.length]; };
  function tube(a, b, col, w, dash) { ctx.lineCap = 'round'; ctx.setLineDash([]); ctx.strokeStyle = '#0c0f12'; ctx.lineWidth = w + 3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]); }
  function station(x, y, r, on, ring) { disc(x, y, r, on ? '#ffffff' : '#2b3035', ring || '#0c0f12', Math.max(2, r * 0.36)); }
  function clickCity(x, y) {
    const n = D.city.find(n => Math.hypot(n.x - x, n.y - y) < 20); if (!n) { sel = null; return full(); }
    if (selMachine) { if (G.assignMachine(S, n.id, selMachine)) { say(D.machines[selMachine].name + ' → ' + n.name + (n.aff === selMachine ? ': a perfect fit, yield doubled' : ': it helps (+30%), but something else would fit better')); if (!(S.pool[selMachine] > 0)) selMachine = null; } else say('Machines can only go to suburbs you have connected.'); return full(); }
    if (sel === n.id && !n.home) return sendTo(n);
    sel = n.id; full();
  }
  function drawCity(dt) {
    if (!cityMap) cityMap = buildCity(); ctx.imageSmoothingEnabled = true; ctx.drawImage(cityMap, 0, 0, CW, CH);
    D.city.forEach(n => n.adj.forEach(a => { if (a < n.id) return; const m = G.NODE[a], ca = G.connected(S, n.id), cb = G.connected(S, a), col = lineOf(CLINES, n.id, a); if (ca && cb) tube(n, m, col, 4.5); else if (ca || cb) tube(n, m, col, 3, [5, 5]); else tube(n, m, 'rgba(160,165,169,.55)', 1.6); })); // the network, as lines on a tube map
    { let left = Math.floor((S.roadWorks || 0) / 2); D.city.forEach(n => n.adj.forEach(a => { if (a < n.id || left <= 0 || !G.connected(S, n.id) || !G.connected(S, a)) return; left--; const m = G.NODE[a]; ctx.strokeStyle = '#14171a'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke(); ctx.strokeStyle = '#e6efe9'; ctx.lineWidth = 1; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]); })); } // roads your crews have resealed
    { const yd = D.city.find(n => n.home), nl = S.nz ? S.nz.hub * 2 + ((S.nz.line || {}).pn || 0) : 0; if (nl) { archLine(yd.x - 26, yd.y - 14, Math.PI + 0.24, nl, 2.3, false); text('the hub line', yd.x - 60, yd.y - 34, { size: 9, color: '#e6d9a8' }); } }
    ctx.setLineDash([]);
    ctx.setLineDash([]);
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 250), stack = {};
    D.city.forEach(n => {
      const conn = G.connected(S, n.id), reach = G.reachable(S, n.id), need = n.home ? 0 : G.needFor(S, n.id), prog = S.net[n.id] || 0;
      if (sel === n.id) disc(n.x, n.y, 19, null, '#ffffff', 1.5);
      disc(n.x, n.y, 12, n.home ? '#e6b84a' : conn ? '#ffffff' : '#2b3035', S.rivalNet[n.id] ? '#e32017' : reach ? `rgba(255,211,0,${0.4 + 0.6 * pulse})` : '#0c0f12', 3.5);
      if (!conn && prog) { ctx.strokeStyle = '#e6b84a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(n.x, n.y, 9.5, -Math.PI / 2, -Math.PI / 2 + (prog / need) * Math.PI * 2); ctx.stroke(); }
      text(n.home ? 'YARD' : conn ? (S.assign[n.id] ? MLET[S.assign[n.id]] : '·') : prog + '/' + need, n.x, n.y + 3.5, { bold: true, size: 9.5, color: n.home || conn ? '#06231a' : '#cfe3d6' });
      { ctx.font = 'bold 11px system-ui,sans-serif'; const tw = ctx.measureText(n.name).width * tk + 8; ctx.fillStyle = 'rgba(8,18,20,.72)'; ctx.fillRect(n.x - tw / 2, n.y - 30, tw, 14); } text(n.name, n.x, n.y - 19.5, { bold: true, color: conn || n.home ? '#ffffff' : '#b9c7c2' });
      if (!n.home) { const m = G.nodeMult(S, n.id), y = n.yl; text(Object.keys(y).map(k => '+' + Math.round(y[k] * m * 10) / 10 + (k === 'voters' ? ' list' : k === 'cash' ? 'k' : ' mana')).join(' ') + '  [' + MLET[n.aff] + ']', n.x, n.y + 25, { size: 8.5, color: S.assign[n.id] === n.aff ? '#e6b84a' : '#c2d2cc' }); }
      if (S.rivalNet[n.id]) text('franchise', n.x, n.y + 35, { size: 8.5, color: '#f0a898' });
      const tg = G.turfOf('city', n.id); if (tg) { disc(n.x - 12, n.y - 12, 4, tg.col, '#0c1a1d', 1.5); if (G.turfPenalty(S, 'city', n.id)) text(tg.name + ' turf', n.x, n.y + (S.rivalNet[n.id] ? 45 : 35), { size: 8.5, color: tg.col }); }
    });
    D.city.forEach(n => { if (S.assign[n.id]) drawMachine(S.assign[n.id], n.x - 62, n.y - 16, 0.12); });
    { const yd = D.city.find(n => n.home); let i = 0; for (const k in S.pool) for (let c = 0; c < Math.min(3, S.pool[k]); c++) { drawMachine(k, yd.x - 70 - (i % 3) * 38, yd.y + 14 + Math.floor(i / 3) * 26, 0.12); i++; } if (S.build) { ctx.globalAlpha = 0.45; drawMachine(S.build.type, yd.x + 26, yd.y + 70, 0.12); ctx.globalAlpha = 1; text('on the bench', yd.x + 44, yd.y + 104, { size: 8.5, color: '#e6d9a8' }); } }
    FAC.forEach(f => { if (!S.done[f[0]]) return; const n = G.NODE[f[2]], i = (stack[f[2]] = (stack[f[2]] || 0) + 1) - 1; ctx.fillStyle = '#e6b84a'; ctx.fillRect(n.x + 18, n.y - 9 + i * 10, 5, 5); text(f[1], n.x + 26, n.y - 4 + i * 10, { align: 'left', size: 8.5, color: '#f1e6b8' }); });
    for (let i = runners.length - 1; i >= 0; i--) { const r = runners[i]; r.t += dt * 1.8; if (r.t >= 1) { runners.splice(i, 1); continue; } disc(r.a.x + (r.b.x - r.a.x) * r.t, r.a.y + (r.b.y - r.a.y) * r.t, 6, '#e6b84a', '#fff', 1.5); }
    header(selMachine ? `Placing: ${D.machines[selMachine].name}. Click a connected suburb. [letter] shows what fits.` : `Crews to send: ${S.dispatch}. Click a suburb, click again to send a crew. WASD drives the roads.`);
  }

  // A town: stream, paddocks, cased roads, sections with houses, shops on the main street, and each named place as a building.
  const townMaps = {};
  function buildTown(t, est, d) {
    const gph = graphOf(2), ids = Object.keys(gph.nodes), c = document.createElement('canvas'); c.width = CW * 2; c.height = CH * 2; const g = c.getContext('2d'); g.scale(2, 2);
    let h = 11; for (const ch of t.id) h = (h * 31 + ch.charCodeAt(0)) % 9973; const r = () => (h = (h * 137 + 71) % 9973) / 9973;
    g.fillStyle = '#284230'; g.fillRect(0, 0, CW, CH);
    for (let i = 0; i < 70; i++) { g.fillStyle = `hsl(${88 + r() * 32},${24 + r() * 16}%,${21 + r() * 10}%)`; g.save(); g.translate(r() * CW, r() * CH); g.rotate((r() - 0.5) * 0.5); g.fillRect(-40, -24, 50 + r() * 80, 28 + r() * 50); g.restore(); }
    { const y0 = 40 + r() * 60, y1 = 380 - r() * 60; g.beginPath(); g.moveTo(-10, y0); g.bezierCurveTo(200, y0 + 130 * r(), 420, y1 - 160 * r(), 730, y1); g.strokeStyle = '#1f6a8a'; g.lineWidth = 7; g.stroke(); g.strokeStyle = '#3aa0c8'; g.lineWidth = 4.5; g.stroke(); for (let i = 0; i < 40; i++) { const f = r(), x = f * 720, y = y0 + (y1 - y0) * f + (r() - 0.5) * 60; g.fillStyle = `hsl(${125 + r() * 20},36%,${20 + r() * 8}%)`; g.beginPath(); g.arc(x, y, 3 + r() * 3, 0, 7); g.fill(); } } // the stream and its willows
    const edges = []; ids.forEach(a => gph.adj[a].forEach(b => { if (a < b) edges.push([gph.nodes[a], gph.nodes[b], a[0] === 'm' && b[0] === 'm']); }));
    const house = (x, y, w, hh, col) => { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + 1.5, y + 1.5, w, hh); g.fillStyle = col; g.fillRect(x, y, w, hh); g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(x, y + hh / 2, w, hh / 2); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.6; g.strokeRect(x, y, w, hh); };
    const ROOF = ['#b5694f', '#8f5a48', '#7d8790', '#a39274', '#6f8a7a', '#c2b39a'];
    edges.forEach(e => { const A = e[0], B = e[1], ln = Math.hypot(B.x - A.x, B.y - A.y), dx = (B.x - A.x) / ln, dy = (B.y - A.y) / ln, ang = Math.atan2(dy, dx);
      for (let f = 18; f < ln - 14; f += e[2] ? 13 : 19) for (const sd of [-1, 1]) { if (!e[2] && r() < 0.3) continue; const off = e[2] ? 14 : 17, x = A.x + dx * f - dy * sd * off, y = A.y + dy * f + dx * sd * off; g.save(); g.translate(x, y); g.rotate(ang);
        if (e[2]) { house(-6, -5.5, 12, 11, est ? ['#8d8577', '#9aa3a0', '#a89b84'][Math.floor(r() * 3)] : '#5a625f'); g.fillStyle = est ? ['#d9634c', '#6fb3d9', '#e6b84a', '#3f9b6b'][Math.floor(r() * 4)] : '#4a5250'; g.fillRect(-6, sd < 0 ? 5.5 : -8, 12, 2.5); } // shops, awnings to the street
        else { g.fillStyle = '#35553c'; g.fillRect(-8.5, -8, 17, 16); house(-5, -4, 10, 8, est ? ROOF[Math.floor(r() * ROOF.length)] : '#5d6763'); if (r() < 0.7) { g.fillStyle = '#2a6a3a'; g.beginPath(); g.arc(-5 + r() * 10, sd * 6, 2.2, 0, 7); g.fill(); } }
        g.restore(); } });
    g.lineCap = 'round'; const rd = (lw, col) => { g.beginPath(); edges.forEach(e => { g.moveTo(e[0].x, e[0].y); g.lineTo(e[1].x, e[1].y); }); g.lineWidth = lw; g.strokeStyle = col; g.stroke(); }; rd(15, '#8f8a7c'); rd(12, '#33383d'); g.setLineDash([5, 7]); rd(0.9, 'rgba(255,255,255,.35)'); g.setLineDash([]);
    const at = id => gph.nodes[id], N = { school: at('t1'), marae: at('t2'), shop: at('t3'), rail: at('b1'), res: at('b2'), dom: at('b3') };
    { const n = N.school; g.fillStyle = '#34603c'; g.fillRect(n.x - 44, n.y - 40, 60, 30); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 0.8; g.strokeRect(n.x - 40, n.y - 37, 52, 24); house(n.x + 20, n.y - 40, 34, 14, '#b5694f'); house(n.x + 20, n.y - 24, 14, 14, '#a39274'); }
    { const n = N.marae; g.fillStyle = '#3d7a45'; g.fillRect(n.x - 30, n.y - 44, 60, 32); house(n.x - 11, n.y - 42, 22, 16, '#9c2f25'); g.strokeStyle = '#e6efe9'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(n.x - 11, n.y - 26); g.lineTo(n.x, n.y - 33); g.lineTo(n.x + 11, n.y - 26); g.stroke(); house(n.x + 16, n.y - 38, 12, 9, '#a39274'); }
    { const n = N.shop; g.fillStyle = '#5d584c'; g.fillRect(n.x - 30, n.y - 46, 60, 34); house(n.x - 24, n.y - 42, 36, 18, d.shop ? '#e6b84a' : '#59625f'); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 0.6; g.beginPath(); for (let i = -20; i < 12; i += 5) { g.moveTo(n.x + i, n.y - 42); g.lineTo(n.x + i, n.y - 24); } g.stroke(); if (d.shop) for (let i = 0; i < 3; i++) drawMachineOn(g, ['tractor', 'sawmill', 'excavator'][i], n.x - 24 + i * 16, n.y - 23, 0.045); }
    { const n = N.rail; g.strokeStyle = '#11181b'; g.lineWidth = 5; g.beginPath(); g.moveTo(n.x - 70, n.y + 26); g.lineTo(n.x + 70, n.y + 34); g.stroke(); g.strokeStyle = '#b9c0c3'; g.lineWidth = 1; g.setLineDash([2, 3]); g.stroke(); g.setLineDash([]); house(n.x - 18, n.y + 10, 30, 10, '#8f5a48'); }
    { const n = N.res; g.fillStyle = d.res ? '#6a5a36' : '#3f4a40'; g.fillRect(n.x - 34, n.y + 12, 68, 36); if (d.res) { house(n.x - 28, n.y + 16, 26, 14, '#ff9d6b'); for (let i = 0; i < 8; i++) { g.fillStyle = ['#c9a36b', '#b6d957', '#8a6f3c'][i % 3]; g.fillRect(n.x + 4 + (i % 4) * 7, n.y + 18 + Math.floor(i / 4) * 8, 6, 6); } } else { g.strokeStyle = 'rgba(255,255,255,.25)'; g.setLineDash([3, 3]); g.strokeRect(n.x - 28, n.y + 16, 26, 14); g.setLineDash([]); } }
    { const n = N.dom; g.fillStyle = '#3d7a45'; g.fillRect(n.x - 34, n.y + 12, 68, 40); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 0.8; g.strokeRect(n.x - 28, n.y + 17, 36, 22); for (let i = 0; i < 7; i++) { g.fillStyle = '#2a6a3a'; g.beginPath(); g.arc(n.x + 14 + r() * 16, n.y + 16 + r() * 32, 3 + r() * 2, 0, 7); g.fill(); } }
    return utilitarian(c);
  }
  function drawMachineOn(g, type, ox, oy, sc) { const keep = ctx; ctx = g; try { drawMachine(type, ox, oy, sc); } finally { ctx = keep; } }
  function drawTown() {
    const g = graphOf(2), t = G.TOWN[S.place], est = G.established(S, t.id), d = S.townDev[t.id] || {}, got = S.towns[t.id] || 0, key = t.id + ':' + (est ? 1 : 0) + (d.shop ? 1 : 0) + (d.res ? 1 : 0);
    if (!townMaps[key]) townMaps[key] = buildTown(t, est, d); ctx.imageSmoothingEnabled = true; ctx.drawImage(townMaps[key], 0, 0, CW, CH);
    Object.keys(g.nodes).forEach(id => { const n = g.nodes[id]; if (!n.name) return; const shop = id === 't3', res = id === 'b2', on = shop ? d.shop : res ? d.res : est, up = id[0] !== 'b', nm = n.name + ((shop || res) && !on ? ' (not yet)' : ''); ctx.font = 'bold 10px system-ui,sans-serif'; const tw = ctx.measureText(nm).width * tk + 8, ly = up ? n.y + 16 : n.y - 10; ctx.fillStyle = 'rgba(8,18,20,.72)'; ctx.fillRect(n.x - tw / 2, ly - 10 * tk, tw, 13 * tk); text(nm, n.x, ly, { size: 10, bold: true, color: on ? '#ffffff' : '#b9c7c2' }); });
    header(`${t.name} · ${est ? 'established' : got + ' of ' + G.townNeed(S, t.id) + ' convoys landed'} · WASD drives the streets · E or scroll up climbs back to the highway`);
  }

  // ───────────────── Scale 3: launching convoys ─────────────────
  let charge = -1; const convoys = [];
  function releaseConvoy() {
    if (charge < 0) return; const power = Math.min(1.3, charge / 1.5); charge = -1;
    if (power < 0.08) return;
    const ang = Math.atan2(mouse.y - G.PN.y, mouse.x - G.PN.x), r = G.launch(S, ang, power);
    if (!r) return say(S.launches <= 0 ? 'No convoys left this season.' : 'You cannot afford that much push.');
    convoys.push({ x: r.x, y: r.y, hit: r.hit, t: 0 });
    if (r.hit) { const t = G.TOWN[r.hit]; say(`Convoy reached ${t.name} (${S.towns[r.hit]}/${G.townNeed(S, r.hit)}). Spent ${money(r.cost)}.`); }
    else { const near = G.townsNow(S).filter(t => !t.home).sort((a, b) => Math.hypot(a.x - r.x, a.y - r.y) - Math.hypot(b.x - r.x, b.y - r.y))[0], dn = Math.hypot(near.x - G.PN.x, near.y - G.PN.y), dl = Math.hypot(r.x - G.PN.x, r.y - G.PN.y); say(`${Math.abs(dl - dn) < G.hitR(near) ? 'Blown wide of' : dl < dn ? 'Fell short of' : 'Overshot'} ${near.name}. The convoy is coming home; ${money(r.cost)} spent.`); }
    full();
  }
  // The lower North Island west of the ranges: coast and beach, paddocks, the Ruahine and Tararua ranges with the gorge
  // between them, the rivers, the towns as small clusters of roofs, and the state highways you drive.
  let regionMap = null;
  function buildRegion() {
    const c = document.createElement('canvas'); c.width = CW * 2; c.height = CH * 2; const g = c.getContext('2d'); g.scale(2, 2);
    let h = 29; const r = () => (h = (h * 137 + 71) % 9973) / 9973, land = () => { g.beginPath(); landR.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); };
    const lab = (t, x, y, col, sz, ang) => { g.save(); g.translate(x, y); g.rotate(ang || 0); g.font = 'italic ' + (sz || 8) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = col; g.fillText(t, 0, 0); g.restore(); };
    g.fillStyle = '#0a2531'; g.fillRect(0, 0, CW, CH); g.lineJoin = 'round';
    [[90, 'rgba(40,110,140,.10)'], [56, 'rgba(50,130,160,.12)'], [30, 'rgba(70,160,185,.16)'], [14, 'rgba(120,200,215,.2)'], [6, '#d6c69a']].forEach(q => { land(); g.lineWidth = q[0]; g.strokeStyle = q[1]; g.stroke(); }); // shelf, shallows, surf, beach
    land(); g.fillStyle = '#2b4a3a'; g.fill(); g.save(); land(); g.clip();
    for (let i = 0; i < 260; i++) { g.fillStyle = `hsl(${88 + r() * 34},${24 + r() * 16}%,${21 + r() * 10}%)`; g.save(); g.translate(200 + r() * 520, r() * CH); g.rotate((r() - 0.5) * 1.2); g.fillRect(-14, -9, 12 + r() * 26, 8 + r() * 16); g.restore(); } // paddocks
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(214,198,154,.5)'; g.beginPath(); g.ellipse(landR[1 + (i % 8)][0] + 8 + r() * 18, landR[1 + (i % 8)][1] + (r() - 0.5) * 70, 5 + r() * 6, 2 + r() * 2, 0.6, 0, 7); g.fill(); } // dunes
    const range = [[560, -10], [548, 60], [536, 115], [524, 158], [514, 190], [498, 248], [464, 308], [412, 364], [352, 410], [300, 446]], along = (f) => { const t = f * (range.length - 1), i = Math.min(range.length - 2, Math.floor(t)), u = t - i; return { x: range[i][0] + (range[i + 1][0] - range[i][0]) * u, y: range[i][1] + (range[i + 1][1] - range[i][1]) * u }; };
    const ridge = (lw, col) => { g.beginPath(); range.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.lineWidth = lw; g.strokeStyle = col; g.lineCap = 'round'; g.stroke(); };
    ridge(58, '#25453a'); ridge(40, '#1f3d31'); ridge(22, '#1a352b');
    for (let i = 0; i < 520; i++) { const q = along(r()), ox = (r() - 0.5) * 50, oy = (r() - 0.5) * 30; g.fillStyle = `hsl(${140 + r() * 20},${30 + r() * 14}%,${13 + r() * 9}%)`; g.beginPath(); g.arc(q.x + ox, q.y + oy, 1.6 + r() * 2.2, 0, 7); g.fill(); } // bush
    for (let f = 0.02; f < 1; f += 0.035) { const q = along(f), q2 = along(Math.min(1, f + 0.01)), a = Math.atan2(q2.y - q.y, q2.x - q.x); if (Math.hypot(q.x - 520, q.y - 172) < 16) continue; g.save(); g.translate(q.x, q.y); g.rotate(a); g.fillStyle = '#5d7f68'; g.beginPath(); g.moveTo(-6, 0); g.lineTo(0, -5); g.lineTo(6, 0); g.fill(); g.fillStyle = '#13281f'; g.beginPath(); g.moveTo(-6, 0); g.lineTo(0, 5); g.lineTo(6, 0); g.fill(); g.restore(); } // the tops, lit from the west
    for (let i = 0; i < 160; i++) { const x = 560 + r() * 160, y = r() * CH; g.fillStyle = `hsl(${138 + r() * 18},30%,${15 + r() * 8}%)`; g.beginPath(); g.arc(x, y, 2 + r() * 3, 0, 7); g.fill(); } // eastern hill country forestry
    const river = (pts, lw) => { g.beginPath(); pts.forEach((q, i) => { if (!i) g.moveTo(q[0], q[1]); else { const p0 = pts[i - 1]; g.quadraticCurveTo(p0[0] + (i % 2 ? 8 : -8), (p0[1] + q[1]) / 2 + (i % 2 ? -6 : 6), q[0], q[1]); } }); g.strokeStyle = '#1f6a8a'; g.lineWidth = lw + 1.4; g.lineCap = 'round'; g.stroke(); g.strokeStyle = '#3aa0c8'; g.lineWidth = lw; g.stroke(); };
    river([[720, 215], [640, 205], [580, 185], [520, 172], [488, 196], [452, 200], [410, 222], [372, 208], [340, 222]], 2.6); river([[470, 0], [450, 50], [420, 96], [392, 128], [360, 150], [330, 156]], 2.2); river([[340, 0], [318, 36], [290, 70], [258, 92], [238, 94]], 2.4); river([[420, 300], [392, 300], [352, 318], [300, 304]], 1.5); river([[640, 440], [600, 400], [560, 372], [545, 350]], 1.6);
    const gr = graphOf(3), size = { pn: 46, wellington: 60, whanganui: 26, kapiti: 20, masterton: 18, levin: 16, feilding: 14, dannevirke: 12 };
    D.towns.forEach(t => { const n = size[t.id] || 8, rad = 5 + Math.sqrt(n) * 2.6; g.fillStyle = 'rgba(52,59,64,.9)'; g.beginPath(); g.ellipse(t.x, t.y, rad, rad * 0.8, 0.3, 0, 7); g.fill(); for (let i = 0; i < n; i++) { const a = r() * 7, d = Math.sqrt(r()) * rad * 0.9; g.fillStyle = ['#b5694f', '#8f5a48', '#9aa3a0', '#a39274', '#c2b39a', '#7d8790'][Math.floor(r() * 6)]; g.fillRect(t.x + Math.cos(a) * d - 1.3, t.y + Math.sin(a) * d * 0.8 - 1.1, 2.6, 2.2); } });
    g.lineCap = 'round'; const hw = (lw, col) => { g.beginPath(); D.roads.forEach(q => { g.moveTo(gr.nodes[q[0]].x, gr.nodes[q[0]].y); g.lineTo(gr.nodes[q[1]].x, gr.nodes[q[1]].y); }); g.lineWidth = lw; g.strokeStyle = col; g.stroke(); }; hw(4.6, '#12161a'); hw(2.6, '#9aa4aa');
    [['pn', 'levin', '57'], ['levin', 'otaki', '1'], ['bulls', 'whanganui', '3'], ['pn', 'woodville', '3'], ['woodville', 'dannevirke', '2'], ['masterton', 'wellington', '2'], ['kapiti', 'wellington', '1'], ['bulls', 'foxton', '1'], ['pn', 'feilding', '54']].forEach(q => { const a = gr.nodes[q[0]], b = gr.nodes[q[1]], x = (a.x + b.x) / 2, y = (a.y + b.y) / 2; g.fillStyle = '#c0392b'; g.beginPath(); g.moveTo(x - 5, y - 4.5); g.lineTo(x + 5, y - 4.5); g.lineTo(x + 5, y + 1); g.lineTo(x, y + 5.5); g.lineTo(x - 5, y + 1); g.fill(); g.font = 'bold 6px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(q[2], x, y + 1.6); });
    g.restore();
    g.fillStyle = '#1f3d31'; g.beginPath(); g.ellipse(262, 332, 13, 4.5, -0.9, 0, 7); g.fill(); g.strokeStyle = '#d6c69a'; g.lineWidth = 0.8; g.stroke(); lab('Kāpiti Island', 246, 318, '#7fb8a6', 7);
    lab('South Taranaki Bight', 118, 196, '#5fa8c4', 12); lab('Cook Strait', 120, 420, '#5fa8c4', 9); lab('TARARUA RANGE', 470, 284, 'rgba(200,225,210,.55)', 7.5, 2.15 - Math.PI); lab('RUAHINE RANGE', 546, 84, 'rgba(200,225,210,.55)', 7.5, 1.37); lab('the gorge', 536, 166, 'rgba(200,225,210,.7)', 6.5); lab('Manawatū R.', 430, 236, '#8fd0ea', 6.5, 0.4); lab('Rangitīkei R.', 438, 78, '#8fd0ea', 6.5, -0.95); lab('Whanganui R.', 312, 52, '#8fd0ea', 6.5, 0.85); lab('WAIRARAPA', 640, 330, 'rgba(200,225,210,.4)', 9); lab('MANAWATŪ', 428, 150, 'rgba(200,225,210,.4)', 9);
    return utilitarian(c);
  }
  function drawRegion(dt) {
    if (!regionMap) regionMap = buildRegion(); ctx.imageSmoothingEnabled = true; ctx.drawImage(regionMap, 0, 0, CW, CH);
    { const g = graphOf(3), tm = performance.now() / 1000, now = G.townsNow(S); D.roads.forEach(q => tube(g.nodes[q[0]], g.nodes[q[1]], lineOf(HLINES, q[0], q[1]), 2.6));
      D.towns.forEach(t => { if (!now.includes(t)) disc(t.x, t.y, 2.5, '#6f7d80'); });
      ctx.fillStyle = '#d6c08a'; ctx.fillRect(RAMP.x - 9, RAMP.y - 2.5, 24, 5); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(RAMP.x - 11, RAMP.y - 4 + Math.sin(tm * 2), 2, 8); text('Himatangi ramp', RAMP.x - 14, RAMP.y + 3, { align: 'right', size: 8.5, color: '#e6d9a8' });
      if (S.done.himatangi) { // the barge: a standing platform, a module at a time
        const b = BARGE_AT; ctx.setLineDash([2, 4]); disc(b.x, b.y, 18, null, 'rgba(255,255,255,.3)', 1); ctx.setLineDash([]);
        ctx.fillStyle = '#5b4a2a'; ctx.fillRect(b.x - 17, b.y - 6, 34, 12); ctx.strokeStyle = '#1a1408'; ctx.lineWidth = 1; ctx.strokeRect(b.x - 17, b.y - 6, 34, 12);
        for (let i = 0; i < G.BARGE.length; i++) { if (i < S.barge.length) { ctx.fillStyle = ['#9aa3a0', '#d98f4c', '#6fd0e8', '#b6d957', '#e6efe9'][i]; ctx.fillRect(b.x - 15.5 + i * 6.3, b.y - 4.5, 5.3, 9); } else { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.strokeRect(b.x - 15.5 + i * 6.3, b.y - 4.5, 5.3, 9); } }
        if (S.barge.includes('mast')) { ctx.strokeStyle = '#e6efe9'; ctx.beginPath(); ctx.moveTo(b.x + 12.5, b.y); ctx.lineTo(b.x + 12.5, b.y - 13); ctx.stroke(); }
        text(`the barge · ${S.barge.length}/${G.BARGE.length} modules`, b.x, b.y + 30, { size: 9, color: '#e6d9a8' });
        if (S.mounts.length) { ctx.setLineDash([1, 5]); ctx.strokeStyle = 'rgba(111,208,232,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(40, 20); ctx.stroke(); ctx.setLineDash([]); const f = (tm * 0.12) % 1; disc(b.x + (40 - b.x) * f, b.y + (20 - b.y) * f, 2, '#6fd0e8'); text('UUVs north to the chain', 70, 40, { size: 8.5, color: '#6fd0e8', align: 'left' }); }
      } }
    const pn = G.PN;
    G.townsNow(S).forEach(t => {
      if (t.home) { disc(t.x, t.y, 10, '#e6b84a', '#0c0f12', 3.5); text('Palmerston North', t.x, t.y - 20, { bold: true }); return; }
      const est = G.established(S, t.id), got = S.towns[t.id] || 0, r = G.hitR(t), d = S.townDev[t.id] || {};
      ctx.setLineDash([4, 4]); disc(t.x, t.y, r, est ? 'rgba(47,158,122,.35)' : null, est ? '#2f9e7a' : '#8aa69d', 1.5); ctx.setLineDash([]);
      station(t.x, t.y, 5, est);
      if (d.shop) { ctx.fillStyle = '#e6b84a'; ctx.fillRect(t.x + 8, t.y - 12, 7, 7); } if (d.res) { ctx.fillStyle = '#ff9d6b'; ctx.fillRect(t.x + 8, t.y + 4, 7, 7); }
      text(t.name, t.x, t.y - r - 6, { bold: est, size: t.infill ? 10 : 11 });
      text(est ? `+${money(t.yl.cash * G.townMult(S, t.id))} · +${Math.round(t.yl.voters * G.townMult(S, t.id))} list` : `${got}/${G.townNeed(S, t.id)} convoys`, t.x, t.y + r + 13, { size: 9.5, color: est ? '#e6b84a' : '#8aa69d' });
      const tg = G.turfOf('town', t.id); if (tg) { disc(t.x - r + 2, t.y - r + 2, 5, tg.col, '#0c1a1d', 1.5); if (G.turfPenalty(S, 'town', t.id)) text(tg.name, t.x, t.y + r + 24, { size: 9, color: tg.col }); }
    });
    // the pull: a crosswind of terrain, weather and distance that drags every convoy off line
    hud(() => { const wx = 660, wy = 60, wl = 8 + 26 * S.wind.s; disc(wx, wy, 30, 'rgba(8,18,20,.6)', '#24464a', 1); ctx.strokeStyle = '#6fd0e8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx - Math.cos(S.wind.a) * wl, wy - Math.sin(S.wind.a) * wl); ctx.lineTo(wx + Math.cos(S.wind.a) * wl, wy + Math.sin(S.wind.a) * wl); ctx.stroke(); disc(wx + Math.cos(S.wind.a) * wl, wy + Math.sin(S.wind.a) * wl, 4, '#6fd0e8'); text('drift', wx, wy + 44, { size: 10, color: '#6fd0e8' }); });
    const ang = Math.atan2(mouse.y - pn.y, mouse.x - pn.x);
    ctx.strokeStyle = 'rgba(230,184,74,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.moveTo(pn.x, pn.y); ctx.lineTo(pn.x + Math.cos(ang) * 60, pn.y + Math.sin(ang) * 60); ctx.stroke(); ctx.setLineDash([]);
    if (charge >= 0) {
      if (!modalUp()) charge += dt; const power = Math.min(1.3, charge / 1.5), over = power > 1;
      ctx.strokeStyle = over ? '#d9634c' : '#e6b84a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(pn.x, pn.y, G.RANGE * power, ang - 0.25, ang + 0.25); ctx.stroke();
      bar(pn.x - 40, pn.y + 20, 80, 8, power / 1.3, over ? '#d9634c' : '#e6b84a'); text('investment ' + money(G.launchCost(S, power)), pn.x, pn.y + 42, { size: 10, color: over ? '#f0a898' : '#e6efe9' });
    }
    for (let i = convoys.length - 1; i >= 0; i--) {
      const c = convoys[i]; c.t += dt; let f;
      if (c.t < 0.9) { const u = c.t / 0.9; f = 1 - (1 - u) * (1 - u); } else if (c.hit) { if (c.t > 1.4) { convoys.splice(i, 1); continue; } f = 1; } else { const u = (c.t - 0.9) / 1.1; if (u >= 1) { convoys.splice(i, 1); continue; } f = 1 - u * u; }
      const x = pn.x + (c.x - pn.x) * f, y = pn.y + (c.y - pn.y) * f; ctx.fillStyle = '#d9634c'; ctx.fillRect(x - 7, y - 4, 14, 8); ctx.fillStyle = '#9aa3a0'; ctx.fillRect(x - 7, y - 4, 5, 8);
    }
    header(`Convoys: ${S.launches}. Aim, hold, release; allow for the drift. WASD drives the highways${G.platform(S) >= 2 ? ', V flies' : ''}; at the ramp, push west to launch.`);
  }

  // ───────────────── Gym: sparring ─────────────────
  const MOVES = { punch: { range: 58, wind: 0.14, rec: 0.28 }, kick: { range: 86, wind: 0.3, rec: 0.42 }, shove: { range: 54, wind: 0.2, rec: 0.36 } };
  function startSpar(gang) { const lvl = gang ? Math.min(8, 3 + G.gst(S, gang).wins * 2) : Math.min(6, S.sparWins), f = (x, slow) => ({ x, st: 'idle', tm: 0, mv: null, guard: false, grap: 0, open: 0, score: 0, flash: 0, slow }); mode = { type: 'spar', gang, lvl, a: f(250, 1), b: f(470, 2.4 - 0.18 * lvl), t: 60, ai: 1, aiGuard: 0, done: null }; }
  function attack(f, mv) { if (f.st === 'idle') { f.st = 'wind'; f.mv = mv; f.tm = MOVES[mv].wind * f.slow; f.guard = false; f.grap = 0; } }
  // Block stops a strike. A shove breaks a block. A grapple catches a shove. A strike beats a grapple.
  // A clean hit leaves them open for a moment: land a second before they cover up and it counts double.
  function stepFighter(f, o, dt) {
    f.flash = Math.max(0, f.flash - dt); f.open = Math.max(0, f.open - dt); f.grap = Math.max(0, f.grap - dt);
    if (f.st === 'idle') return;
    f.tm -= dt; if (f.tm > 0) return;
    if (f.st === 'wind') {
      f.st = 'rec'; f.tm = MOVES[f.mv].rec; const dir = Math.sign(o.x - f.x) || 1;
      if (Math.abs(f.x - o.x) > MOVES[f.mv].range || o.st === 'down') return;
      if (f.mv === 'shove') {
        if (o.grap > 0 && o.st === 'idle') { // caught: they had shifted from the block to a grip
          o.grap = 0; o.score += 2; f.flash = 0.25;
          if (o.thr) { f.st = 'stun'; f.tm = 0.9; f.x -= dir * 120; mode.note = { t: 1, m: 'THROWN' }; } else { f.st = 'down'; f.tm = 1.1; mode.note = { t: 1, m: 'TAKEDOWN' }; }
        } else if (o.guard && o.st === 'idle') { o.guard = false; o.st = 'stun'; o.tm = 0.5; o.open = 0.75; o.x += dir * 30; mode.note = { t: 0.7, m: 'GUARD BROKEN' }; }
        else { o.x += dir * 46; if (o.st === 'idle') { o.st = 'stun'; o.tm = 0.16; } }
      } else if (o.guard && o.st === 'idle') { f.st = 'stun'; f.tm = 0.8; }
      else { const combo = o.open > 0; f.score += (f.mv === 'kick' ? 2 : 1) * (combo ? 2 : 1); o.flash = 0.25; o.st = 'stun'; o.tm = combo ? 0.5 : 0.3; o.open = combo ? 0 : 0.8; o.grap = 0; o.x += dir * (combo ? 50 : 22); if (combo) mode.note = { t: 0.8, m: 'COMBO' }; }
    } else f.st = 'idle';
  }
  const HP = 12; // a fight is a dozen points of health, not five touches: a punch takes 1, a kick 2, a combo doubles it, a takedown 2
  function stepSpar(dt) {
    const m = mode, a = m.a, b = m.b, L = m.lvl; if (m.done) return;
    m.t -= dt; if (m.note) { m.note.t -= dt; if (m.note.t <= 0) m.note = null; }
    const fwd = (keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0); a.thr = fwd > 0;
    if (a.st === 'idle') { a.guard = a.grap <= 0 && !!(keys.s || keys.ArrowDown || keys[' ']); if (!a.guard && a.grap <= 0) a.x += fwd * 180 * dt; }
    const dist = Math.abs(b.x - a.x); m.ai -= dt; m.aiGuard -= dt; m.turtle = a.guard ? (m.turtle || 0) + dt : 0;
    if (b.st === 'idle') { // your training partner gets sharper as you do
      b.guard = m.aiGuard > 0 && b.grap <= 0;
      if (a.st === 'wind' && !b.guard && b.grap <= 0 && m.aiGuard < -0.4) { m.aiGuard = Math.random() < 0.1 + 0.06 * L ? 0.5 : -0.39; b.guard = m.aiGuard > 0; }
      if (a.st === 'wind' && a.mv === 'shove' && b.guard && Math.random() < dt * (1.5 + 1.2 * L)) { b.grap = 0.6; b.guard = false; b.thr = Math.random() < 0.5; m.aiGuard = 0; } // reads the shove, takes a grip
      if (!b.guard && b.grap <= 0) { if (dist > 80) b.x -= Math.sign(b.x - a.x) * (70 + 6 * L) * dt; else if (dist < 40) b.x += Math.sign(b.x - a.x) * 80 * dt; }
      if (m.turtle > 0.7 && dist <= 52 && Math.random() < dt * (0.5 + 0.3 * L)) { m.turtle = 0; b.guard = false; attack(b, 'shove'); } // you cannot hide behind a block forever
      else if (a.open > 0 && a.st !== 'down' && dist <= 56 && Math.random() < dt * (0.6 + 0.7 * L)) { b.guard = false; attack(b, 'punch'); }
      else if (m.ai <= 0 && !b.guard && b.grap <= 0) { m.ai = 1.1 - 0.08 * L + Math.random() * 0.7; if (dist <= 56 && Math.random() < 0.5) attack(b, 'punch'); else if (dist <= 84 && Math.random() < 0.4) attack(b, 'kick'); }
    }
    stepFighter(a, b, dt); stepFighter(b, a, dt);
    a.x = Math.max(40, Math.min(b.x - 26, a.x)); b.x = Math.min(CW - 40, Math.max(a.x + 26, b.x));
    if (a.score >= HP || b.score >= HP || m.t <= 0) { m.done = (m.gun ? G.gunResult(S, m.gang, a.score > b.score, m.gun, false) : m.gang ? G.fightResult(S, m.gang, a.score > b.score) : G.trainResult(S, a.score > b.score)) || 'Round over.'; light(); }
  }
  // A person: a rounded body, a head, two arms and two legs. No face. Feet at (x, y), facing dir, s = size.
  function figure(x, y, s, dir, pose, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s); if (pose === 'down') { ctx.translate(-6, -9); ctx.rotate(-1.45); } else if (pose === 'stun') ctx.rotate(-0.16);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round';
    const limb = (x1, y1, x2, y2, x3, y3, w) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(x2, y2, x3, y3); ctx.stroke(); ctx.beginPath(); ctx.arc(x3, y3, w * 0.66, 0, 7); ctx.fill(); };
    limb(-3, -36, -9, -18, -13, -2, 11); // back leg
    if (pose === 'kick') limb(3, -36, 30, -30, 66, -44, 11); else if (pose === 'wkick') limb(3, -36, 16, -26, 8, -12, 11); else limb(3, -36, 10, -18, 11, -2, 11);
    ctx.beginPath(); ctx.ellipse(0, -54, 16, 23, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(2, -89, 12.5, 0, 7); ctx.fill();
    ctx.strokeStyle = ctx.fillStyle = 'rgba(0,0,0,.28)'; // arms read against the body
    const arms = { idle: [[16, -52, 22, -64], [10, -48, 14, -58]], guard: [[24, -62, 17, -86], [20, -58, 11, -82]], punch: [[28, -70, 56, -66], [10, -50, 12, -60]], wpunch: [[2, -48, -8, -58], [12, -50, 16, -62]], kick: [[14, -50, 18, -62], [-10, -56, -16, -66]], wkick: [[16, -52, 20, -66], [10, -50, 12, -62]], shove: [[24, -62, 44, -60], [24, -54, 44, -52]], wshove: [[6, -54, 10, -60], [6, -48, 10, -52]], grapple: [[22, -52, 34, -40], [14, -76, 30, -78]], stun: [[-8, -50, -14, -40], [6, -46, 4, -34]], down: [[-8, -50, -14, -40], [6, -46, 4, -34]] }[pose] || [[16, -52, 22, -64], [10, -48, 14, -58]];
    arms.forEach(a => limb(0, -68, a[0], a[1], a[2], a[3], 8)); ctx.strokeStyle = ctx.fillStyle = col; arms.forEach(a => limb(0, -68, a[0], a[1], a[2], a[3], 6.5));
    ctx.restore();
  }
  // The fighters are drawings: rotoscoped, pen and marker on dot-grid paper. You are the one in the purple hoodie.
  const SMAN = {"you": {"neutral": [336, 359, 236], "midhit": [342, 360, 236], "lowkick": [459, 357, 221], "dash": [231, 360, 136], "death": [331, 319, 118], "block": [358, 356, 240], "hit": [366, 359, 240], "punch": [421, 358, 240], "fram1": [171, 329, 164], "frame2": [215, 360, 138], "frame3": [308, 359, 70], "midblock": [236, 349, 134]}, "them": {"neutral": [255, 357, 114], "frame4": [355, 356, 120], "death": [379, 360, 174], "block": [367, 353, 127], "hit": [274, 360, 131], "punch": [285, 353, 184], "fram1": [171, 329, 6], "frame2": [220, 356, 110], "frame3": [309, 357, 239], "lowkick": [354, 347, 226], "dash": [280, 356, 94]}}, SPR = {};
  const SPOSE = { you: { idle: 'neutral', guard: 'block', punch: 'punch', wpunch: 'neutral', kick: 'lowkick', wkick: 'frame2', shove: 'dash', wshove: 'dash', grapple: 'midblock', stun: 'hit', down: 'death' }, them: { idle: 'neutral', guard: 'block', punch: 'punch', wpunch: 'neutral', kick: 'lowkick', wkick: 'frame4', shove: 'dash', wshove: 'dash', grapple: 'block', stun: 'hit', down: 'death' } };
  for (const who in SMAN) for (const nm in SMAN[who]) { const im = new Image(); im.src = 'art/fighter/' + who + '-' + nm + '.png'; SPR[who + '-' + nm] = im; }
  function sprite(who, pose, x, y, hgt, dir) { // feet at (x, y); false if the drawing has not loaded, so the caller can fall back
    const nm = SPOSE[who][pose] || 'neutral', im = SPR[who + '-' + nm], mm = SMAN[who][nm]; if (!im || !im.complete || !im.naturalWidth) return false;
    const sc = hgt / 360, flip = dir !== (who === 'you' ? 1 : -1); ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); ctx.imageSmoothingEnabled = true; ctx.drawImage(im, -mm[2] * sc, -mm[1] * sc, mm[0] * sc, mm[1] * sc); ctx.restore(); return true;
  }
  const poseOf = f => (f.st === 'down' ? 'down' : f.st === 'stun' ? 'stun' : f.st === 'wind' ? 'w' + f.mv : f.st === 'rec' ? f.mv : f.grap > 0 ? 'grapple' : f.guard ? 'guard' : 'idle');
  function drawFighter(f, dir, col) { const x = f.x - dir * 24; ctx.fillStyle = f.st === 'wind' ? 'rgba(255,157,107,.75)' : f.grap > 0 ? 'rgba(159,224,196,.7)' : f.flash > 0 ? 'rgba(255,255,255,.8)' : 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, 303, f.st === 'wind' ? 44 : 34, f.st === 'wind' ? 9 : 6, 0, 0, 7); ctx.fill(); if (f.st === 'wind') text('!', x, 150, { bold: true, size: 22, color: '#ff9d6b' }); if (f.flash > 0) ctx.globalAlpha = 0.6; if (!sprite(dir === 1 ? 'you' : 'them', poseOf(f), x, 304, 138, dir)) figure(f.x, 300, 1, dir, poseOf(f), f.flash > 0 ? '#ffffff' : f.st === 'stun' || f.st === 'down' ? '#77807a' : f.st === 'wind' ? '#ff9d6b' : f.grap > 0 ? '#9fe0c4' : col); ctx.globalAlpha = 1; if (f.open > 0 && f.st !== 'down') text('open', f.x, 196, { size: 10, color: '#ff9d6b' }); }
  function drawSpar() {
    const m = mode; ctx.fillStyle = '#1a1f24'; ctx.fillRect(0, 0, CW, CH); ctx.fillStyle = '#2a3138'; ctx.fillRect(0, 300, CW, 140); ctx.fillStyle = '#3d4852'; ctx.fillRect(60, 300, CW - 120, 6);
    text(m.gang ? `${G.GANG[m.gang].name.toUpperCase()} · hands only, in front of everyone` : `${S.runSite === 'home' ? 'GARAGE GYM' : 'A LOCAL GYM'} · round ${S.sparWins + 1}`, CW / 2, 40, { bold: true, size: 16, color: '#e6b84a' });
    text('You', 60, 86, { bold: true, size: 15, color: '#6fb3d9', align: 'left' }); bar(100, 74, 200, 14, 1 - m.b.score / HP, '#6fb3d9'); text(m.gang ? 'Enforcer' : 'Partner', CW - 60, 86, { bold: true, size: 15, color: '#e6b84a', align: 'right' }); bar(CW - 300 - 28, 74, 200, 14, 1 - m.a.score / HP, '#e6b84a'); text(Math.ceil(Math.max(0, m.t)) + 's', CW / 2, 86, { size: 16 });
    drawFighter(m.a, 1, '#6fb3d9'); drawFighter(m.b, -1, '#e6b84a'); if (m.note) text(m.note.m, CW / 2, 130, { bold: true, size: 18, color: '#fff4cf' });
    text('Block (S or Space) stops a strike · a shove (L) breaks a block · L while blocking takes a grip, and a grip catches a shove: takedown, or hold D to throw', CW / 2, CH - 34, { size: 10, color: '#cfe3d6' });
    text('A/D move · J punch · K kick · a kick hurts twice as much as a punch · a second hit while they are open doubles it · a strike beats a grip', CW / 2, CH - 16, { size: 10, color: '#8aa69d' });
  }

  // ───────────────── A gunfight: the same fight, with cover where the block was ─────────────────
  // In cover you cannot be hit. To fire you lean out, and for that moment you can be. A shot at someone in cover pins
  // them, which is how you move up. Caught with no cover at all, a real gun ends it. Close enough, it is hands again.
  const GCOV = [150, 290, 430, 570];
  function startGun(gid, wid) {
    const W = G.WEAPONS[wid], f = (ci, w) => ({ ci, x: GCOV[ci], st: 'cover', tm: 0, dmg: 0, ammo: w.mag, supp: 0, w });
    mode = { type: 'gun', gang: gid, wid, lvl: Math.min(6, 2 + G.gst(S, gid).wins * 2), a: f(0, W), b: f(3, G.WEAPONS.pistol), t: 75, ai: 1.8, shots: [], note: null, killed: false, seen: false, done: null };
  }
  const gExposed = f => f.st === 'aim' || f.st === 'rec' || f.st === 'move' || f.st === 'rush', gOpen = f => f.st === 'move' || f.st === 'rush';
  function gunShot(m, f, o, aimed) {
    const dir = f === m.a ? 1 : -1, hx = f.x + dir * 10, W = f.w; f.ammo--;
    if (aimed && W.jam && Math.random() < W.jam) { m.note = { t: 1, m: 'JAMMED' }; return; }
    let dmg = 0; if (aimed) dmg = gOpen(o) ? W.open : gExposed(o) ? W.peek : 0; else dmg = gExposed(o) ? 3 : 0;
    m.shots.push({ x1: hx + dir * 30, y1: aimed ? 191 : 262, x2: dmg ? o.x - dir * 20 : o.x - dir * 34 + (aimed ? 0 : (Math.random() - 0.5) * 90), y2: dmg ? 235 : aimed ? 268 : 150 + Math.random() * 120, t: 0.14, hit: dmg > 0 });
    if (!dmg) { if (aimed && !gExposed(o)) { o.supp = 0.95; if (o.st === 'reload') o.tm += 0.3; } return; }
    if (dmg >= 99) { o.dmg = HP; if (o === m.b) m.killed = true; m.note = { t: 1.2, m: o === m.a ? 'CAUGHT IN THE OPEN' : 'IN THE OPEN' }; } else { o.dmg += dmg; m.note = { t: 0.8, m: aimed ? 'HIT' : 'SNAP SHOT' }; }
    if (o.st === 'move' || o.st === 'rush') { o.x = GCOV[o.ci]; } o.st = 'hit'; o.tm = 0.45; o.flash = 0.25;
  }
  function gunKey(k) {
    const m = mode, a = m.a, b = m.b; if (m.done || a.st !== 'cover') return;
    if (a.supp > 0 && k !== 'r') return say('Pinned. Wait for it to lift.');
    if (k === 'j') { if (a.ammo <= 0) { a.st = 'reload'; a.tm = a.w.reload; } else { a.st = 'aim'; a.tm = a.w.wind; m.seen = false; } }
    else if (k === 'k') { if (a.ammo > 0) { a.st = 'snap'; a.tm = 0.15; } else say('Empty. R to reload.'); }
    else if (k === 'r') { a.st = 'reload'; a.tm = a.w.reload; }
    else if (k === 'a' || k === 'd') { const to = a.ci + (k === 'd' ? 1 : -1); if (to < 0 || to >= b.ci) return say(to < 0 ? 'Nowhere further back.' : 'They are behind that one. L to rush them.'); a.to = to; a.st = 'move'; }
    else if (k === 'l') { if (b.ci - a.ci !== 1) return say('Too far to rush. Move up first.'); a.st = 'rush'; }
  }
  function gunMelee(byYou) { // close enough: weapons swing away on their slings and it is the fighter from here
    const g = mode, held = !byYou ? false : g.b.st === 'reload' || g.b.supp > 0 || Math.random() < 0.5;
    startSpar(g.gang); const m = mode; m.gun = g.wid; m.a.x = 310; m.b.x = 380; m.a.score = Math.min(HP - 1, Math.round(g.b.dmg)); m.b.score = Math.min(HP - 1, Math.round(g.a.dmg)); m.t = 40;
    if (held) { m.b.slow *= 1.7; say('They are still trying to bring the gun up. Hands are faster.'); } else say('Close enough. The weapon is on its sling: this is hands now.');
    m.note = { t: 1.4, m: 'HAND TO HAND' }; full();
  }
  function stepGun(dt) {
    const m = mode, a = m.a, b = m.b; if (m.done) return;
    m.t -= dt; if (m.note && (m.note.t -= dt) <= 0) m.note = null; m.shots = m.shots.filter(q => (q.t -= dt) > 0);
    for (const f of [a, b]) {
      const o = f === a ? b : a, dir = f === a ? 1 : -1; f.supp = Math.max(0, f.supp - dt); f.flash = Math.max(0, (f.flash || 0) - dt);
      if (f.st === 'move') { const tx = GCOV[f.to], st = 175 * dt; if (Math.abs(tx - f.x) <= st) { f.x = tx; f.ci = f.to; f.st = 'cover'; } else f.x += Math.sign(tx - f.x) * st; continue; }
      if (f.st === 'rush') { const tx = o.x - dir * 96, st = 230 * dt; if (Math.abs(tx - f.x) <= st) return gunMelee(f === a); f.x += Math.sign(tx - f.x) * st; continue; }
      if (f.st === 'cover') continue;
      f.tm -= dt; if (f.tm > 0) continue;
      if (f.st === 'aim') { gunShot(m, f, o, true); f.st = 'rec'; f.tm = 0.4; }
      else if (f.st === 'snap') { gunShot(m, f, o, false); f.st = 'snapr'; f.tm = 0.28; }
      else { if (f.st === 'reload') f.ammo = f.w.mag; f.st = 'cover'; }
    }
    // the other side: answers when you lean out, pins you, moves up when you are pinned or reloading
    if (b.st === 'cover' && b.supp <= 0) {
      if ((a.st === 'aim' || a.st === 'rec') && !m.seen) { m.seen = true; if (b.ammo > 0 && Math.random() < 0.2 + 0.07 * m.lvl) { b.st = 'snap'; b.tm = 0.15; } }
      else if ((m.ai -= dt) <= 0) {
        m.ai = 1.5 + Math.random() * 1.3 - 0.09 * m.lvl; const busy = a.supp > 0 || a.st === 'reload';
        if (b.ammo <= 0) { b.st = 'reload'; b.tm = b.w.reload; }
        else if (busy && b.ci - a.ci > 1 && Math.random() < 0.55) { b.to = b.ci - 1; b.st = 'move'; }
        else if (busy && b.ci - a.ci === 1 && Math.random() < 0.3) b.st = 'rush';
        else { b.st = 'aim'; b.tm = b.w.wind + 0.12; }
      }
    }
    if (a.dmg >= HP || b.dmg >= HP || m.t <= 0) { m.done = (m.t <= 0 && a.dmg < HP && b.dmg < HP ? 'Sirens. Everyone scatters. ' : '') + G.gunResult(S, m.gang, a.dmg < HP && b.dmg > a.dmg, m.wid, m.killed); light(); }
  }
  function drawGun() {
    const m = mode, tm = performance.now() / 1000;
    ctx.fillStyle = '#16191c'; ctx.fillRect(0, 0, CW, CH); ctx.fillStyle = '#22262a'; for (let i = 0; i < 6; i++) ctx.fillRect(20 + i * 120, 120, 96, 180); ctx.fillStyle = '#2a2f34'; ctx.fillRect(0, 300, CW, 140); ctx.fillStyle = '#3d4852'; ctx.fillRect(0, 300, CW, 4);
    const who = f => (f === m.a ? 'you' : 'them'), dirOf = f => (f === m.a ? 1 : -1);
    [m.a, m.b].forEach(f => {
      const dir = dirOf(f), up = f.st === 'aim' || f.st === 'rec', run = f.st === 'move' || f.st === 'rush', x = run ? f.x : f.x - dir * 44, pose = up ? 'punch' : run ? 'shove' : f.st === 'hit' ? 'stun' : 'guard', hgt = up || run ? 138 : 104;
      if (f.flash > 0) ctx.globalAlpha = 0.55; if (!sprite(who(f), pose, x, 304, hgt, dir)) figure(x, 300, hgt / 110, dir, pose, f === m.a ? '#6fb3d9' : '#e6b84a'); ctx.globalAlpha = 1;
      if (up) { ctx.fillStyle = '#0c0f12'; ctx.fillRect(x + dir * 58 - (dir < 0 ? 16 : 0), 189, 16, 5); ctx.fillRect(x + dir * 58 - (dir < 0 ? 4 : 0), 189, 4, 10); }
      if (f.st === 'aim') text('!', x, 150, { bold: true, size: 22, color: '#ff9d6b' });
      if (f.supp > 0) text('PINNED', f.x, 236, { bold: true, size: 10, color: '#ffd300' });
      if (f.st === 'reload') text('reloading', f.x, 236, { size: 10, color: '#cfe3d6' });
    });
    GCOV.forEach((x, i) => { // what there is to get behind
      if (i % 3 === 0) { ctx.fillStyle = '#4a5258'; ctx.fillRect(x - 46, 268, 92, 26); ctx.fillStyle = '#5b646b'; ctx.fillRect(x - 28, 250, 54, 20); ctx.fillStyle = '#1d2226'; ctx.fillRect(x - 22, 254, 20, 13); ctx.fillRect(x + 2, 254, 18, 13); disc(x - 28, 296, 9, '#0c0f12', '#3d4348', 2); disc(x + 28, 296, 9, '#0c0f12', '#3d4348', 2); }
      else if (i === 1) { ctx.fillStyle = '#6a6f74'; ctx.fillRect(x - 36, 252, 72, 50); ctx.strokeStyle = '#4a4f54'; ctx.lineWidth = 1; ctx.beginPath(); for (let r = 0; r < 4; r++) { ctx.moveTo(x - 36, 264 + r * 12); ctx.lineTo(x + 36, 264 + r * 12); } ctx.stroke(); }
      else { ctx.fillStyle = '#3f6b52'; ctx.fillRect(x - 38, 256, 76, 44); ctx.fillStyle = '#2f5140'; ctx.fillRect(x - 42, 252, 84, 7); }
    });
    m.shots.forEach(q => { ctx.strokeStyle = q.hit ? '#ffffff' : 'rgba(255,244,207,.7)'; ctx.lineWidth = q.hit ? 2 : 1.2; ctx.beginPath(); ctx.moveTo(q.x1, q.y1); ctx.lineTo(q.x2, q.y2); ctx.stroke(); if (!q.hit) disc(q.x2, q.y2, Math.max(1, 3 + (0.14 - q.t) * 40), null, 'rgba(200,200,190,.5)', 1); });
    text('You', 60, 62, { bold: true, size: 15, color: '#6fb3d9', align: 'left' }); bar(100, 50, 200, 14, 1 - m.a.dmg / HP, '#6fb3d9'); text(G.GANG[m.gang].name, CW - 60, 62, { bold: true, size: 13, color: '#e6b84a', align: 'right' }); bar(CW - 372, 50, 200, 14, 1 - m.b.dmg / HP, '#e6b84a');
    for (let i = 0; i < m.a.w.mag; i++) { ctx.fillStyle = i < m.a.ammo ? '#ffd300' : '#3d4348'; ctx.fillRect(100 + i * 9, 70, 6, 9); } text(m.a.w.name, 100, 94, { align: 'left', size: 10, color: '#cfe3d6' });
    text(Math.ceil(Math.max(0, m.t)) + 's until sirens', CW / 2, 40, { size: 11, color: '#cfe3d6' }); if (m.note) text(m.note.m, CW / 2, 128, { bold: true, size: 18, color: '#fff4cf' });
    text('J or click: lean out and fire · K: snap shot from cover, hits only someone who is leaning out · R: reload', CW / 2, CH - 34, { size: 10.5, color: '#cfe3d6' });
    text('A/D: move to the next cover, in the open · L: rush them from the cover beside theirs · a shot at someone in cover pins them', CW / 2, CH - 16, { size: 10.5, color: '#8aa69d' });
    header(`${G.GANG[m.gang].name.toUpperCase()} · a gunfight on a Palmerston North street · never move or lean out while they are aiming`);
  }

  // ───────────────── The strip: patrol ─────────────────
  function startPatrol() {
    const ag = []; for (let i = 0; i < 5; i++) { ag.push({ team: 0, x: 130 + (i % 2) * 55, y: 95 + i * 62, hx: 130 + (i % 2) * 55, hy: 95 + i * 62, anger: 0.3 }); ag.push({ team: 1, x: 590 - (i % 2) * 55, y: 110 + i * 62, hx: 590 - (i % 2) * 55, hy: 110 + i * 62, anger: 0.3 }); }
    const mates = []; if (S.done.securityarm) mates.push({ x: 360, y: 130 }); if (S.done.reserves) mates.push({ x: 360, y: 340 });
    mode = { type: 'patrol', ag, you: { x: 360, y: 230 }, mates, t: 35, spark: 1.5, heat: 1 + Math.min(0.4, S.patrolWins * 0.05), done: null };
  }
  const segDist = (p, a, b) => { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, u = clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / l, 0, 1); return Math.hypot(p.x - a.x - vx * u, p.y - a.y - vy * u); };
  function stepPatrol(dt) {
    const m = mode; if (m.done) return;
    const you = m.you, pats = [you].concat(m.mates);
    const mx = (keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0), my = (keys.s || keys.ArrowDown ? 1 : 0) - (keys.w || keys.ArrowUp ? 1 : 0), ml = Math.hypot(mx, my) || 1;
    you.x = clamp(you.x + (mx / ml) * 185 * dt, 20, CW - 20); you.y = clamp(you.y + (my / ml) * 185 * dt, 60, CH - 30);
    m.spark -= dt; if (m.spark <= 0) { m.spark = (1.4 + Math.random() * 1.6) / m.heat; const a = m.ag[Math.floor(Math.random() * m.ag.length)]; a.anger = Math.min(1, a.anger + 0.5); a.shout = 0.8; }
    const hot = []; let fail = false;
    m.ag.forEach(a => {
      let o = null, d = 1e9; m.ag.forEach(b => { if (b.team !== a.team) { const dd = Math.hypot(b.x - a.x, b.y - a.y); if (dd < d) { d = dd; o = b; } } });
      const blocked = pats.some(p => segDist(p, a, o) < 22), near = pats.some(p => Math.hypot(p.x - a.x, p.y - a.y) < 44);
      a.anger += dt * (blocked ? -0.2 : d < 300 ? (0.13 + 0.3 * (1 - d / 300)) * m.heat : -0.06) - (near ? dt * 0.2 : 0); a.anger = clamp(a.anger, 0, 1); a.shout = Math.max(0, (a.shout || 0) - dt);
      const go = a.anger > 0.4, tx = go ? o.x : a.hx, ty = go ? o.y : a.hy, sp = go ? (22 + 88 * a.anger) * m.heat : 22, l = Math.hypot(tx - a.x, ty - a.y);
      if (l > 2) { a.x += ((tx - a.x) / l) * sp * dt; a.y += ((ty - a.y) / l) * sp * dt; }
      pats.forEach(p => { const pd = Math.hypot(a.x - p.x, a.y - p.y); if (pd < 28 && pd > 0.1) { a.x += ((a.x - p.x) / pd) * (28 - pd); a.y += ((a.y - p.y) / pd) * (28 - pd); } });
      if (d < 20 && a.anger > 0.4) fail = true;
      if (!blocked && a.team === 0) hot.push({ s: a.anger + o.anger - d / 300, x: (a.x + o.x) / 2, y: (a.y + o.y) / 2 });
    });
    hot.sort((p, q) => q.s - p.s);
    const free = hot.filter(h => Math.hypot(h.x - you.x, h.y - you.y) > 60);
    m.mates.forEach((p, i) => { const t = free[i] || { x: 360, y: 130 + i * 210 }, l = Math.hypot(t.x - p.x, t.y - p.y); if (l > 4) { p.x += ((t.x - p.x) / l) * 120 * dt; p.y += ((t.y - p.y) / l) * 120 * dt; } });
    m.t -= dt;
    if (fail) { m.done = G.patrolResult(S, false) || 'It kicked off.'; light(); }
    else if (m.t <= 0) { m.done = G.patrolResult(S, true) || 'Everyone walked away.'; light(); }
  }
  function drawPatrol() {
    const m = mode; ctx.fillStyle = '#15191e'; ctx.fillRect(0, 0, CW, CH); ctx.fillStyle = '#242a31'; ctx.fillRect(0, 50, CW, CH - 70);
    text('THE STRIP · 1:40 am', CW / 2, 22, { bold: true, size: 14, color: '#e6b84a' }); text(Math.ceil(Math.max(0, m.t)) + 's', CW - 30, 22, { size: 14 });
    const tension = Math.max(...m.ag.map(a => a.anger)); text('tension', 40, 22, { size: 11 }); bar(70, 13, 140, 10, tension, tension > 0.7 ? '#d9634c' : '#e6b84a');
    m.ag.forEach(a => { if (a.anger > 0.4) disc(a.x, a.y, 13 + a.anger * 8, `rgba(217,99,76,${a.anger * 0.35})`); disc(a.x, a.y, 10, a.team ? '#9a7fd1' : '#d18f7f', '#111', 1.5); if (a.shout > 0) text('!', a.x, a.y - 16, { bold: true, size: 16, color: '#ff9d6b' }); });
    m.mates.forEach(p => disc(p.x, p.y, 10, '#d7e84a', '#3c4400', 2));
    disc(m.you.x, m.you.y, 11, '#d7e84a', '#ffffff', 3);
    text(`Hold the line until the clock runs out. Stand in the gap, or beside someone to talk them down. ${m.mates.length ? '' : 'You are on your own until you have a security arm.'}`, CW / 2, CH - 8, { color: '#8aa69d', size: 10.5 });
  }

  // ───────────────── Papua New Guinea: convoy escort ─────────────────
  function startEscort() { mode = { type: 'escort', t: 40, hp: 5, civ: 0, hits: 0, spawn: 1.5, ents: [], shots: [], cd: 0, flash: 0, scroll: 0, done: null }; }
  function stepEscort(dt) {
    const m = mode; if (m.done) return;
    m.t -= dt; m.cd -= dt; m.flash = Math.max(0, m.flash - dt); m.scroll += dt * 70; m.spawn -= dt;
    if (m.spawn <= 0) { m.spawn = 0.6 + Math.random() * 0.9; const top = Math.random() < 0.5; m.ents.push({ x: 160 + Math.random() * 600, y: top ? 60 : 410, vy: top ? 1 : -1, armed: Math.random() < 0.6, aim: 0, dead: 0, stop: 60 + Math.random() * 60 }); }
    for (let i = m.ents.length - 1; i >= 0; i--) {
      const e = m.ents[i]; e.x -= 22 * dt;
      if (e.dead) { e.dead += dt; if (e.dead > 0.6) m.ents.splice(i, 1); continue; }
      if (e.x < -20) { m.ents.splice(i, 1); continue; }
      if (Math.abs(e.y - 235) > e.stop) e.y += e.vy * (e.armed ? 34 : 18) * dt;
      else if (e.armed) { e.aim += dt; if (e.aim >= 1.7) { e.aim = 0; m.hp--; m.flash = 0.3; m.shots.push({ x1: e.x, y1: e.y, x2: 330 + Math.random() * 80, y2: 235, t: 0.15, col: '#ff9d6b' }); } }
    }
    m.shots = m.shots.filter(s => (s.t -= dt) > 0);
    if (m.hp <= 0) { m.done = G.escortResult(S, false, m.civ); light(); } else if (m.t <= 0) { m.done = G.escortResult(S, true, m.civ); light(); }
  }
  function shootEscort() {
    const m = mode; if (m.done || m.cd > 0) return; m.cd = 0.28;
    m.shots.push({ x1: 370, y1: 235, x2: mouse.x, y2: mouse.y, t: 0.1, col: '#fff4cf' });
    const e = m.ents.find(e => !e.dead && Math.hypot(e.x - mouse.x, e.y - mouse.y) < 17); if (!e) return;
    e.dead = 0.01; if (e.armed) m.hits++; else { m.civ++; say('That was someone who lives here.'); }
  }
  function drawEscort() {
    const m = mode; ctx.fillStyle = '#1f4a2a'; ctx.fillRect(0, 0, CW, CH); ctx.fillStyle = '#6b5a3c'; ctx.fillRect(0, 205, CW, 60);
    for (let i = 0; i < 16; i++) { const x = ((i * 97 - m.scroll) % 800 + 800) % 800 - 40, y = i % 2 ? 60 + (i * 37) % 120 : 290 + (i * 53) % 130; disc(x, y, 16, '#173a20'); }
    [300, 370, 440].forEach((x, i) => { ctx.fillStyle = i === 1 ? '#e6efe9' : '#9aa3a0'; ctx.fillRect(x - 24, 222, 48, 26); ctx.fillStyle = '#39424a'; ctx.fillRect(x + 12, 225, 10, 20); });
    m.ents.forEach(e => { ctx.globalAlpha = e.dead ? 1 - e.dead / 0.6 : 1; disc(e.x, e.y, 9, e.armed ? '#d9634c' : '#e8dcc0', '#111', 1.5); if (e.armed) { ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + (370 - e.x) / Math.hypot(370 - e.x, 235 - e.y) * 16, e.y + (235 - e.y) / Math.hypot(370 - e.x, 235 - e.y) * 16); ctx.stroke(); if (e.aim > 0) { ctx.strokeStyle = `rgba(255,157,107,${e.aim / 1.7})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(370, 235); ctx.stroke(); } } ctx.globalAlpha = 1; });
    m.shots.forEach(s => { ctx.strokeStyle = s.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke(); });
    if (m.flash > 0) { ctx.fillStyle = `rgba(217,99,76,${m.flash})`; ctx.fillRect(0, 0, CW, CH); }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 10, 0, 7); ctx.moveTo(mouse.x - 15, mouse.y); ctx.lineTo(mouse.x + 15, mouse.y); ctx.moveTo(mouse.x, mouse.y - 15); ctx.lineTo(mouse.x, mouse.y + 15); ctx.stroke();
    header(`HIGHLANDS HIGHWAY, PNG · ${Math.ceil(Math.max(0, m.t))}s · convoy ${'■'.repeat(Math.max(0, m.hp))}`);
    text('Click to fire. Armed men are red; a line means one is about to shoot. Everyone else lives here.', CW / 2, CH - 10, { color: '#e6efe9' });
  }


  // ───────────────── Sea patrol: workboat in the Bight → OPV in the EEZ → the straits ─────────────────
  const BOAT = [null, { name: 'SOUTH TARANAKI BIGHT · workboat off Himatangi', max: 120, need: 3, gap: 2.4 }, { name: 'THE EEZ · offshore patrol vessel', max: 150, need: 4, gap: 1.9 }, { name: 'LOMBOK STRAIT · joint patrol out of Darwin', max: 155, need: 2, gap: 1.6 }];
  function startBoat() {
    const tier = G.boatTier(S) || 1;
    mode = { type: 'boat', tier, t: 50, you: { x: 360, y: 240, vx: 0, vy: 0, h: 0 }, ents: [], spawn: 0.4, got: 0, missed: 0, wrong: 0, shots: [], cd: 0, cargo: tier === 3 ? { x: -60, y: 235, hp: 5 } : null, done: null, form: 0, wing: [] };
    const w = tier < 2 ? 0 : Math.min(3, G.fleet(S).filter(u => u.type === 'opv').length - 1); for (let i = 0; i < w; i++) mode.wing.push({ x: 360, y: 260 + i * 20 }); // the rest of the class sails with you
  }
  function stepBoat(dt) {
    const m = mode, B = BOAT[m.tier], y = m.you; if (m.done) return;
    m.t -= dt; m.cd -= dt; m.spawn -= dt;
    const ax = (keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0), ay = (keys.s || keys.ArrowDown ? 1 : 0) - (keys.w || keys.ArrowUp ? 1 : 0);
    y.vx += ax * 260 * dt; y.vy += ay * 260 * dt; const sp = Math.hypot(y.vx, y.vy), f = Math.max(0, 1 - 1.1 * dt) * (sp > B.max ? B.max / sp : 1); y.vx *= f; y.vy *= f;
    y.x = clamp(y.x + y.vx * dt, 14, CW - 14); y.y = clamp(y.y + y.vy * dt, 40, CH - 24); if (sp > 8) y.h = Math.atan2(y.vy, y.vx);
    if (m.cargo) m.cargo.x += 16.5 * dt;
    const hd = { x: Math.cos(y.h), y: Math.sin(y.h) }; m.wing.forEach((w, i) => { const tg = formSpot(i, m.wing.length, m.form, y, hd, y), dx = tg.x + (tg.x - y.x) * 1.6 - w.x, dy = tg.y + (tg.y - y.y) * 1.6 - w.y, l = Math.hypot(dx, dy), v = B.max * 0.9 * dt; if (l > 1) { w.x += dx / l * Math.min(v, l); w.y += dy / l * Math.min(v, l); } });
    if (m.spawn <= 0) {
      m.spawn = B.gap * (0.7 + Math.random() * 0.6);
      const r = Math.random(), kind = m.tier === 3 ? (r < 0.26 ? 'raider' : r < 0.55 ? 'poacher' : 'fisher') : r < 0.5 ? 'poacher' : 'fisher', top = Math.random() < 0.5, v = (kind === 'raider' ? 70 : 26 + Math.random() * 16) * (1 + 0.12 * m.tier);
      const e = { kind, x: 60 + Math.random() * 600, y: top ? 34 : CH - 18, known: false, board: 0, hp: 2, dead: 0, aim: 0 }; const a = Math.atan2((top ? 1 : -1), (Math.random() - 0.5) * 1.2); e.vx = Math.cos(a) * v; e.vy = Math.sin(a) * v; e.v = v; m.ents.push(e);
    }
    const idR = S.done.polar ? 170 : 115;
    for (let i = m.ents.length - 1; i >= 0; i--) {
      const e = m.ents[i]; if (e.dead) { e.dead += dt; if (e.dead > 0.8) m.ents.splice(i, 1); continue; }
      const d = Math.hypot(e.x - y.x, e.y - y.y); if (d < idR) e.known = true;
      if (e.kind === 'raider' && m.cargo) { const c = m.cargo, cd = Math.hypot(c.x - e.x, c.y - e.y) || 1; if (cd > 120) { e.x += (c.x - e.x) / cd * e.v * dt; e.y += (c.y - e.y) / cd * e.v * dt; } else { e.x += 16.5 * dt; e.aim += dt; if (e.aim >= 2.2) { e.aim = 0; c.hp--; m.shots.push({ x1: e.x, y1: e.y, x2: c.x, y2: c.y, t: 0.15, col: '#ff9d6b' }); } } continue; }
      if (e.kind === 'poacher' && d < 130 && d > 1) { const run = B.max * 0.62; e.vx += ((e.x - y.x) / d * run - e.vx) * 2 * dt; e.vy += ((e.y - y.y) / d * run - e.vy) * 2 * dt; }
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.kind === 'poacher' && (d < 32 || m.wing.some(w => Math.hypot(w.x - e.x, w.y - e.y) < 30))) { e.board += dt; if (e.board >= 1.4) { e.dead = 0.01; e.done = true; m.got++; say('Boarded. Catch and gear seized.'); } } else e.board = Math.max(0, e.board - dt);
      if (e.x < -20 || e.x > CW + 20 || e.y < 20 || e.y > CH + 10) { if (e.kind === 'poacher') m.missed++; m.ents.splice(i, 1); }
    }
    m.shots = m.shots.filter(s => (s.t -= dt) > 0);
    const lost = m.cargo && m.cargo.hp <= 0;
    if (lost || m.t <= 0) { m.done = G.boatResult(S, m.tier, !lost && m.got >= B.need, m.wrong); light(); }
  }
  function shootBoat() {
    const m = mode; if (m.done) return;
    if (m.tier < 3) return say('There is no gun on a fisheries boat. Get alongside and board.');
    if (m.cd > 0) return; m.cd = 0.35;
    const y = m.you, d = Math.hypot(mouse.x - y.x, mouse.y - y.y), k = Math.min(1, 240 / (d || 1)), tx = y.x + (mouse.x - y.x) * k, ty = y.y + (mouse.y - y.y) * k;
    m.shots.push({ x1: y.x, y1: y.y, x2: tx, y2: ty, t: 0.12, col: '#fff4cf' });
    const e = m.ents.find(e => !e.dead && Math.hypot(e.x - tx, e.y - ty) < 18); if (!e) return;
    if (e.kind === 'raider') { if (--e.hp <= 0) e.dead = 0.01; } else { m.wrong++; e.dead = 0.01; say('That boat was not shooting at anyone.'); }
  }
  function drawBoat() {
    const m = mode, B = BOAT[m.tier], y = m.you, tm = performance.now() / 1000;
    ctx.fillStyle = '#0b2a36'; ctx.fillRect(0, 0, CW, CH);
    ctx.strokeStyle = 'rgba(111,208,232,.12)'; ctx.lineWidth = 1; for (let i = 0; i < 12; i++) { const yy = 40 + i * 36 + Math.sin(tm + i) * 5; ctx.beginPath(); ctx.moveTo(0, yy); ctx.bezierCurveTo(240, yy + 8, 480, yy - 8, CW, yy); ctx.stroke(); }
    disc(y.x, y.y, S.done.polar ? 170 : 115, null, 'rgba(111,208,232,.18)', 1);
    if (m.cargo) { const c = m.cargo; ctx.fillStyle = '#8894a0'; ctx.fillRect(c.x - 34, c.y - 10, 68, 20); ctx.fillStyle = '#d9634c'; for (let i = 0; i < 4; i++) ctx.fillRect(c.x - 28 + i * 14, c.y - 7, 11, 14); ctx.setLineDash([3, 5]); disc(c.x, c.y, 120, null, 'rgba(217,99,76,.25)', 1); ctx.setLineDash([]); text('cargo ' + '■'.repeat(Math.max(0, c.hp)), c.x, c.y - 16, { size: 10 }); }
    m.ents.forEach(e => {
      ctx.globalAlpha = e.dead ? 1 - e.dead / 0.8 : 1; const col = !e.known ? '#77868c' : e.kind === 'fisher' ? '#9fe0c4' : e.kind === 'poacher' ? '#e6b84a' : '#d9634c';
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.kind === 'raider' ? 8 : 11, 5, Math.atan2(e.vy, e.vx), 0, 7); ctx.fill();
      if (!e.known) text('?', e.x, e.y - 9, { size: 10, color: '#9fb0b5' }); else if (e.done) text('boarded', e.x, e.y - 10, { size: 10, color: '#e6b84a' }); else if (e.kind === 'poacher') text('no licence', e.x, e.y - 10, { size: 9.5, color: '#e6b84a' });
      if (e.board > 0 && !e.dead) bar(e.x - 16, e.y + 10, 32, 5, e.board / 1.4, '#e6b84a');
      ctx.globalAlpha = 1;
    });
    m.shots.forEach(s => { ctx.strokeStyle = s.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke(); });
    m.wing.forEach(w => { ctx.fillStyle = '#e6b84a'; ctx.beginPath(); ctx.ellipse(w.x, w.y, 9, 5, y.h, 0, 7); ctx.fill(); });
    ctx.save(); ctx.translate(y.x, y.y); ctx.rotate(y.h); ctx.fillStyle = '#e6efe9'; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-11, -7); ctx.lineTo(-11, 7); ctx.fill(); ctx.fillStyle = '#1f8fb5'; ctx.fillRect(-6, -3, 8, 6); ctx.restore();
    header(`${B.name} · ${Math.ceil(Math.max(0, m.t))}s · boarded ${m.got}/${B.need}${m.missed ? ' · ' + m.missed + ' got away' : ''}`);
    text(m.tier === 3 ? 'WASD steer · stay alongside yellow boats to board · click to fire on red boats only' : 'WASD steer · boats show what they are inside your radar ring · stay alongside a yellow one to board it' + (m.wing.length ? ' · F: fleet wedge / line' : ''), CW / 2, CH - 8, { size: 10.5, color: '#cfe3d6' });
  }

  // ───────────────── Papua: driving the corridor, unarmed ─────────────────
  const roadX = d => 360 + 110 * Math.sin(d / 300) + 50 * Math.sin(d / 113 + 1);
  function startCorridor() {
    const ev = [], seq = ['block', 'wash', 'cross', 'wash', 'block', 'cross', 'wash', 'block', 'cross', 'wash'];
    seq.forEach((k, i) => { const d = 520 + i * 450 + Math.random() * 120; ev.push(k === 'block' ? { k, d, talk: 0, open: false, tni: !!S.done.tni && i === 4 } : k === 'wash' ? { k, d, side: Math.random() < 0.5 ? -1 : 1 } : (r => ({ k, d, px: -110 * r, dir: r, go: false }))(Math.random() < 0.5 ? -1 : 1)); });
    mode = { type: 'corridor', d: 0, x: roadX(0), v: 0, len: 5200, t: 80, cargo: S.done.armour ? 5 : 4, shake: 0, talked: 0, ran: 0, hit: 0, ev, done: null };
  }
  function stepCorridor(dt) {
    const m = mode; if (m.done) return;
    m.t -= dt;
    const gas = keys.w || keys.ArrowUp, brake = keys.s || keys.ArrowDown, off = Math.abs(m.x - roadX(m.d)) > 46;
    m.v = clamp(m.v + (gas ? 95 : brake ? -240 : -18) * dt, 0, off ? 55 : 170);
    m.x = clamp(m.x + ((keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0)) * 175 * dt * clamp(m.v / 70, 0, 1), 30, CW - 30);
    const d0 = m.d; m.d += m.v * dt;
    if (off && m.v > 5) { m.shake += dt; if (m.shake > 2) { m.shake = 0; m.cargo--; say('Off the road: a load has shaken loose.'); } }
    m.ev.forEach(e => {
      if (e.k === 'block' && !e.open) {
        if (m.d > e.d - 90 && m.d < e.d - 6 && m.v < 6) { e.talk += dt; if (e.talk >= (e.tni ? 1.2 : 2.2)) { e.open = true; m.talked++; say(e.tni ? 'Papers checked. Waved on.' : 'You got out, shook hands, heard them out. The rope comes down.'); } }
        else if (d0 < e.d && m.d >= e.d) { e.open = true; m.ran++; say(e.tni ? 'You ran an army checkpoint.' : 'You drove through their roadblock.'); }
      } else if (e.k === 'wash' && !e.done && d0 < e.d && m.d >= e.d) { e.done = true; if ((m.x - roadX(e.d)) * e.side > -6) { m.cargo--; say('Into the washout. A load is gone.'); } }
      else if (e.k === 'cross') {
        if (e.d - m.d < 330) e.go = true; if (e.go && e.px * e.dir < 110) e.px += e.dir * 30 * dt;
        if (!m.hit && Math.abs(e.d - m.d) < 15 && Math.abs(roadX(e.d) + e.px - m.x) < 15 && m.v > 12) m.hit = 1;
      }
    });
    const end = m.hit || m.cargo <= 0 || m.t <= 0 || m.d >= m.len;
    if (end) { m.done = G.corridorResult(S, !m.hit && m.cargo > 0 && m.d >= m.len, m.talked, m.ran, m.hit); light(); }
  }
  function drawCorridor() {
    const m = mode, Y = D2 => 340 - (D2 - m.d);
    ctx.fillStyle = '#1d4a2a'; ctx.fillRect(0, 0, CW, CH);
    for (let i = 0; i < 40; i++) { const D2 = Math.floor(m.d / 60) * 60 + (i - 4) * 60, side = i % 2 ? 1 : -1, x = roadX(D2) + side * (80 + (D2 * 7 % 150)); disc(x, Y(D2), 15, '#173a20'); }
    ctx.strokeStyle = '#7a6645'; ctx.lineWidth = 92; ctx.lineCap = 'butt'; ctx.beginPath(); for (let yy = CH + 20; yy >= -20; yy -= 10) { const D2 = m.d + (340 - yy); yy === CH + 20 ? ctx.moveTo(roadX(D2), yy) : ctx.lineTo(roadX(D2), yy); } ctx.stroke();
    const py = Y(m.len); if (py > -40) { ctx.fillStyle = '#39424a'; ctx.fillRect(0, py - 40, CW, 40); text('THE PORT', CW / 2, py - 15, { bold: true, size: 14, color: '#e6b84a' }); }
    m.ev.forEach(e => {
      const yy = Y(e.d), cx = roadX(e.d); if (yy < -30 || yy > CH + 30) return;
      if (e.k === 'block') { if (!e.open) { ctx.strokeStyle = e.tni ? '#d9634c' : '#e6b84a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 48, yy); ctx.lineTo(cx + 48, yy); ctx.stroke(); } for (let i = 0; i < 5; i++) disc(cx - 62 + (e.open ? -14 : 0) + (i % 2) * 12, yy - 12 + i * 6, 5, e.tni ? '#5d7a52' : '#e8dcc0', '#111', 1); text(e.tni ? 'army checkpoint' : 'landowners', cx + 56, yy + 4, { align: 'left', size: 10 }); if (e.talk > 0 && !e.open) bar(cx - 30, yy - 16, 60, 6, e.talk / (e.tni ? 1.2 : 2.2), '#e6b84a'); }
      else if (e.k === 'wash') { ctx.fillStyle = '#3a2c1c'; ctx.beginPath(); ctx.ellipse(cx + e.side * 26, yy, 24, 13, 0, 0, 7); ctx.fill(); }
      else { disc(cx + e.px, yy, 5, '#e8dcc0', '#111', 1); disc(cx + e.px + 9, yy + 4, 4, '#c9a36b', '#111', 1); }
    });
    [70, 38].forEach(o => { ctx.fillStyle = '#9aa3a0'; ctx.fillRect(roadX(m.d - o) * 0.5 + m.x * 0.5 - 9, 340 + o - 12, 18, 26); });
    ctx.fillStyle = '#e6efe9'; ctx.fillRect(m.x - 10, 326, 20, 28); ctx.fillStyle = '#1f8fb5'; ctx.fillRect(m.x - 8, 328, 16, 8);
    header(`THE CORRIDOR · convoy ${S.corridorLegs + 1} of 3 · ${Math.ceil(Math.max(0, m.t))}s · loads ${'■'.repeat(Math.max(0, m.cargo))} · stopped for ${m.talked}`);
    bar(8, 30, 180, 7, m.d / m.len, '#e6b84a', 'to the port'); bar(8, 42, 180, 7, m.v / 170, '#6fd0e8', 'speed');
    text('W drive · S brake · A/D steer · stop dead at a rope and wait · brake for anyone crossing', CW / 2, CH - 8, { size: 10.5, color: '#e6efe9' });
  }

  // ───────────────── Te Moana: the board, and the watch ─────────────────
  const PX = (lon, lat) => ({ x: (lon - 94) * 6.1, y: (24 - lat) * 6.1 });
  const UNIT = { opv: { name: 'Patrol ship', ship: 60, sub: 24, v: 50, col: '#e6b84a' }, uuv: { name: 'UUV picket', ship: 20, sub: 42, v: 18, col: '#6fd0e8' }, air: { name: 'Your platform', ship: 95, sub: 0, v: 34, col: '#ffffff' } };
  const DEN = { x: PX(128, -6).x, y: PX(128, -6).y, rx: 34 * 6.1, ry: 15 * 6.1 }, inDen = p => ((p.x - DEN.x) / DEN.rx) ** 2 + ((p.y - DEN.y) / DEN.ry) ** 2 < 1;
  let seaSel = null;
  function seaUnits() {
    const idx = {};
    return G.fleet(S).map(u => { const i = (idx[u.type] = (idx[u.type] || 0) + 1) - 1, st = D.sea.start[u.type], d = PX(...st[i % st.length]), p = S.fleetPos[u.id] || (S.fleetPos[u.id] = { x: d.x, y: d.y }); return { id: u.id, type: u.type, x: p.x, y: p.y, tx: p.x, ty: p.y }; });
  }
  function seaSensors(units) {
    const k = (S.done.sentinel ? 1.3 : 1) * (1 + Math.min(0.3, S.tech / 800)), out = units.map(u => ({ x: u.x, y: u.y, ship: UNIT[u.type].ship * k, sub: UNIT[u.type].sub * k }));
    if (S.done.seamount) D.sea.stations.forEach(q => { const p = PX(...q); out.push({ x: p.x, y: p.y, ship: 50 * k, sub: 50 * k, fixed: 1 }); });
    if (S.done.chain) for (let i = 1; i < D.sea.chain.length; i++) { const a = PX(...D.sea.chain[i - 1]), b = PX(...D.sea.chain[i]); for (let f = 0; f < 1; f += 0.5) out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, ship: 26 * k, sub: 26 * k, fixed: 2 }); }
    (S.mounts || []).forEach((q, i) => { const p = PX(...G.MOUNT[i].at), r = q.kind === 'sensor' ? [30, 44] : q.kind === 'relay' ? [22, 22] : [12, 12]; out.push({ x: p.x, y: p.y, ship: r[0] * k, sub: r[1] * k, fixed: 4 }); });
    for (const r in D.sea.coast) if (S.rel[r] >= 60) { const p = PX(...D.sea.coast[r]); out.push({ x: p.x, y: p.y, ship: 34 * k, sub: 0, fixed: 3 }); }
    return out;
  }
  function startWatch(after) {
    const spec = G.watchSpec(S);
    mode = { type: 'watch', after, units: seaUnits(), end: 0, done: null, probes: spec.map(q => { const pts = D.sea.lanes[q.lane].pts.map(p => PX(...p)); return { lane: q.lane, power: q.power, kind: q.kind, delay: q.delay, pts, seg: 0, x: pts[0].x, y: pts[0].y, track: 0, seen: false, st: 'wait', fade: 0 }; }) };
    seaSel = null;
  }
  function stepWatch(dt) {
    const m = mode; if (m.done) return;
    m.units.forEach(u => { const l = Math.hypot(u.tx - u.x, u.ty - u.y), v = UNIT[u.type].v * dt; if (l <= v) { u.x = u.tx; u.y = u.ty; } else { u.x += (u.tx - u.x) / l * v; u.y += (u.ty - u.y) / l * v; } });
    const sens = seaSensors(m.units), fast = 1 + Math.min(0.4, 0.03 * S.watchNo);
    m.probes.forEach(p => {
      if (p.st === 'wait') { if ((p.delay -= dt) <= 0) p.st = 'go'; return; }
      if (p.st !== 'go') { p.fade += dt; return; }
      let step = (p.kind === 'sub' ? 15 : 20) * fast * (S.done.aa2d && inDen(p) ? 0.6 : 1) * dt;
      while (step > 0 && p.seg < p.pts.length - 1) { const b = p.pts[p.seg + 1], l = Math.hypot(b.x - p.x, b.y - p.y); if (l <= step) { p.x = b.x; p.y = b.y; p.seg++; step -= l; } else { p.x += (b.x - p.x) / l * step; p.y += (b.y - p.y) / l * step; step = 0; } }
      const str = Math.min(2.5, sens.reduce((a, s) => a + (Math.hypot(s.x - p.x, s.y - p.y) < s[p.kind] ? 1 : 0), 0));
      p.seen = str > 0 || (p.kind === 'ship' && !!S.done.polar); p.track += str * dt;
      if (p.track >= (p.kind === 'sub' ? 4.5 : 3.5)) p.st = 'exposed'; else if (p.seg >= p.pts.length - 1) p.st = 'landed';
    });
    if (m.probes.every(p => p.st === 'exposed' || p.st === 'landed')) { m.end += dt; if (m.end > 0.9) { m.units.forEach(u => (S.fleetPos[u.id] = { x: u.x, y: u.y })); m.done = G.watchResult(S, m.probes.filter(p => p.st === 'exposed').map(p => p.power), m.probes.filter(p => p.st === 'landed').map(p => p.lane)); light(); } }
  }
  function clickSea() {
    const live = mode && mode.type === 'watch', units = live ? mode.units : seaUnits();
    const u = units.find(u => Math.hypot(u.x - mouse.x, u.y - mouse.y) < 15);
    if (u) { seaSel = seaSel === u.id ? null : u.id; return; }
    const s = units.find(u => u.id === seaSel); if (!s) return say(units.length ? 'Click one of your units first, then where it should go.' : 'You have nothing to place yet: build patrol vessels, an airship, UUVs.');
    const x = clamp(mouse.x, 8, CW - 8), y = clamp(mouse.y, 30, CH - 8);
    if (live) { s.tx = x; s.ty = y; } else { S.fleetPos[s.id] = { x, y }; seaSel = null; }
  }
  const POW = { cn: '#e05a5a', us: '#5a8be0' }, PNAME = { cn: 'Beijing', us: 'Washington' };
  function drawSea() {
    const live = mode && mode.type === 'watch', m = mode, geo = window.VIEW.geo, units = live ? m.units : seaUnits(), tm = performance.now() / 1000;
    const shape = (pts, fill, stroke) => { ctx.beginPath(); pts.forEach((q, i) => { const p = PX(q[0], q[1]); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); } };
    ctx.fillStyle = '#0b2a36'; ctx.fillRect(0, 0, CW, CH);
    geo.GREY.forEach(g => shape(g, '#1b2a30'));
    if (S.done.aa2d) { ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(159,224,196,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(DEN.x, DEN.y, DEN.rx, DEN.ry, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); text('denial zone: intruders slowed', DEN.x, DEN.y + DEN.ry - 6, { size: 9, color: '#7fb8a6' }); }
    for (const k in geo.LANDS) geo.LANDS[k].forEach(g => shape(g, S.rel[k] >= 60 ? '#2f9e7a' : `rgba(47,158,122,${0.15 + 0.5 * S.rel[k] / 100})`, S.rel[k] >= 60 ? '#e6b84a' : null));
    shape(geo.NI, '#e6b84a'); shape(geo.SI, '#e6b84a');
    geo.ISLES.forEach(i => { if (i[2]) { const p = PX(i[0], i[1]); disc(p.x, p.y, 3, S.rel.pac >= 60 ? '#2f9e7a' : '#3f6d62'); } });
    if (S.done.ring) { ctx.strokeStyle = '#fff4cf'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, PX(0, 0).y); ctx.lineTo(CW, PX(0, 0).y); ctx.stroke(); }
    if (S.done.chain) { ctx.strokeStyle = 'rgba(111,208,232,.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4]); ctx.beginPath(); D.sea.chain.forEach((q, i) => { const p = PX(...q); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.stroke(); ctx.setLineDash([]); }
    seaSensors(units).forEach(s => { if (s.sub) disc(s.x, s.y, s.sub, 'rgba(111,208,232,.10)', 'rgba(111,208,232,.35)', 1); if (s.ship) { ctx.setLineDash([3, 4]); disc(s.x, s.y, s.ship, null, 'rgba(230,184,74,.35)', 1); ctx.setLineDash([]); } if (s.fixed === 1 || s.fixed === 3) disc(s.x, s.y, 3, s.fixed === 1 ? '#6fd0e8' : '#9fe0c4'); });
    for (const k in geo.LABEL) { const p = PX(...geo.LABEL[k]); text(`${D.partners[k]} ${Math.round(S.rel[k])}`, p.x, p.y, { size: 9.5, color: S.rel[k] >= 60 ? '#fff4cf' : '#8aa69d' }); }
    { const ms = S.mounts || [], at = i => PX(...G.MOUNT[i].at); if (ms.length || S.barge.includes('uuvbay')) { // seamount sites, out from home
        ctx.setLineDash([1, 4]); ctx.strokeStyle = 'rgba(111,208,232,.7)'; ctx.lineWidth = 1; ctx.beginPath(); const h0 = PX(175.2, -40.3); ctx.moveTo(h0.x, h0.y); ms.forEach((q, i) => ctx.lineTo(at(i).x, at(i).y)); ctx.stroke(); ctx.setLineDash([]);
        ms.forEach((q, i) => { const p = at(i); ctx.fillStyle = q.kind === 'stock' ? '#e6b84a' : q.kind === 'relay' ? '#e6efe9' : '#6fd0e8'; ctx.beginPath(); ctx.moveTo(p.x, p.y - 4.5); ctx.lineTo(p.x + 4.5, p.y + 3.5); ctx.lineTo(p.x - 4.5, p.y + 3.5); ctx.fill(); if (!q.legit) disc(p.x, p.y, 7, null, '#e05a5a', 1); });
        if (ms.length < G.MOUNT.length) { const p = at(ms.length); ctx.setLineDash([2, 3]); disc(p.x, p.y, 6, null, 'rgba(255,255,255,.6)', 1); ctx.setLineDash([]); text('next: ' + G.MOUNT[ms.length].name, p.x + 9, p.y + 3, { align: 'left', size: 8.5, color: '#cfe3d6' }); }
      } }
    S.foot.forEach(f => { const q = D.sea.lanes[f.lane].pts, p = PX(...q[q.length - 1]); ctx.fillStyle = POW[f.power]; ctx.fillRect(p.x - 6, p.y - 6, 12, 12); text(f.site, p.x, p.y - 10, { size: 9.5, bold: true, color: POW[f.power] }); });
    if (live) m.probes.forEach(p => {
      const e = p.pts[p.pts.length - 1], a = p.pts[0], pulse = 6 + 4 * Math.sin(tm * 4);
      if (p.st === 'wait' || p.st === 'go') { disc(e.x, e.y, 9 + pulse, null, POW[p.power], 1.5); text(D.sea.lanes[p.lane].site, e.x, e.y + 24, { size: 9.5, color: POW[p.power] }); ctx.fillStyle = POW[p.power]; ctx.beginPath(); ctx.moveTo(a.x - 7, 26); ctx.lineTo(a.x + 7, 26); ctx.lineTo(a.x, 38); ctx.fill(); }
      if (p.st === 'go' && p.seen) { if (p.kind === 'sub') { ctx.fillStyle = POW[p.power]; ctx.beginPath(); ctx.ellipse(p.x, p.y, 9, 4, 0, 0, 7); ctx.fill(); } else { ctx.fillStyle = POW[p.power]; ctx.fillRect(p.x - 7, p.y - 4, 14, 8); } bar(p.x - 14, p.y - 13, 28, 4, p.track / (p.kind === 'sub' ? 4.5 : 3.5), '#fff4cf'); }
      if (p.st === 'exposed' && p.fade < 1.5) text('tracked · turned back', p.x, p.y - p.fade * 10, { size: 10, bold: true, color: '#fff4cf' });
      if (p.st === 'landed') { ctx.fillStyle = POW[p.power]; ctx.fillRect(e.x - 6, e.y - 6, 12, 12); }
    });
    units.forEach(u => {
      const U = UNIT[u.type]; if (seaSel === u.id) disc(u.x, u.y, 13, null, '#ffffff', 1.5);
      if (live && (u.tx !== u.x || u.ty !== u.y)) { ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(u.tx, u.ty); ctx.stroke(); }
      if (u.type === 'opv') { ctx.fillStyle = U.col; ctx.beginPath(); ctx.moveTo(u.x + 8, u.y); ctx.lineTo(u.x - 6, u.y - 5); ctx.lineTo(u.x - 6, u.y + 5); ctx.fill(); } else if (u.type === 'uuv') disc(u.x, u.y, 4.5, U.col, '#06231a', 1); else { ctx.fillStyle = U.col; ctx.beginPath(); ctx.ellipse(u.x, u.y, 11, 5, 0, 0, 7); ctx.fill(); }
    });
    if (live) header(`THE WATCH · ${m.probes.filter(p => p.st === 'exposed').length} tracked · ${m.probes.filter(p => p.st === 'landed').length} through · ${m.probes.filter(p => p.st === 'wait' || p.st === 'go').length} still coming. Click a unit, then where to send it.`);
    else header(S.done.compact ? 'Te Moana. The Compact is signed; Deep Sea Sentinel keeps the watch without you.' : `Te Moana · footholds ${S.footholds}/6 · ${S.watchIn <= 0 ? 'probes arrive when you end the season' : 'next probes in about ' + S.watchIn + ' season' + (S.watchIn === 1 ? '' : 's')}. Click a unit, then where to station it.`);
  }


  // ───────────────── Aotearoa: roads, rail, plants and the hub, drawn onto the country ─────────────────
  const NP = (lon, lat) => ({ x: 215 + (lon - 166) * 24.5, y: 6 + (-34 - lat) * 32 });
  const NKIND = { city: 'city', rural: 'rural district', iwi: 'Māori land' };
  let nzSel = 'pn', nzTiles = null;
  function inPoly(pts, x, y) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  function buildTiles() { // land tiles: pasture, forest, high country, and Māori land around the iwi places
    const geo = window.VIEW.geo, c = document.createElement('canvas'); c.width = CW * 2; c.height = CH * 2; const g = c.getContext('2d'), T = 4; g.scale(2, 2);
    const coast = () => { g.beginPath(); [geo.NI, geo.SI].forEach(poly => { poly.forEach((q, i) => { const p = NP(q[0], q[1]); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }); g.closePath(); }); };
    g.fillStyle = '#0a2531'; g.fillRect(0, 0, CW, CH); g.lineJoin = 'round'; [[70, 'rgba(40,110,140,.10)'], [44, 'rgba(50,130,160,.12)'], [24, 'rgba(70,160,185,.16)'], [10, 'rgba(120,200,215,.22)']].forEach(q => { coast(); g.lineWidth = q[0]; g.strokeStyle = q[1]; g.stroke(); });
    const stewart = [[167.6, -46.8], [168.2, -46.9], [168, -47.3], [167.5, -47.2]], iwi = D.nz.nodes.filter(n => n.kind === 'iwi');
    for (let x = 215; x < 540; x += T) for (let y = 6; y < CH; y += T) {
      const lon = 166 + (x + T / 2 - 215) / 24.5, lat = -34 - (y + T / 2 - 6) / 32, ni = inPoly(geo.NI, lon, lat), si = inPoly(geo.SI, lon, lat) || inPoly(stewart, lon, lat); if (!ni && !si) continue;
      const h = ((x * 7 + y * 13 + ((x * y) % 7)) % 9) / 9, spine = si ? ((lon - 168) * 3.6 - (lat + 45.4) * 4.5) / 5.76 : 9;
      let col = `hsl(${96 + h * 10},32%,${27 + h * 4}%)`; // pasture
      if (si && spine > -0.15 && spine < 0.45) col = `hsl(200,8%,${46 + h * 8}%)`; else if (si && spine <= -0.15) col = `hsl(150,35%,${19 + h * 4}%)`;
      if (ni && (Math.hypot(lon - 175.6, lat + 39.25) < 0.42 || Math.hypot(lon - 176.2, lat + 39.75) < 0.3 || Math.hypot(lon - 174.06, lat + 39.3) < 0.14)) col = `hsl(200,8%,${46 + h * 8}%)`;
      else if (ni && (Math.hypot(lon - 176.55, lat + 38.6) < 0.55 || Math.hypot(lon - 177.6, lat + 38.2) < 0.5 || (lat > -35.9 && lon < 173.9))) col = `hsl(150,35%,${19 + h * 4}%)`;
      if (iwi.some(n => Math.hypot((lon - n.at[0]) * 0.76, lat - n.at[1]) < 0.36)) col = `hsl(${32 + h * 6},38%,${30 + h * 4}%)`;
      if (si && spine > 0.06 && spine < 0.24) col = `hsl(205,18%,${74 + h * 14}%)`; // snow on the main divide
      g.fillStyle = col; g.fillRect(x, y, T - 0.4, T - 0.4);
    }
    coast(); g.lineWidth = 1; g.strokeStyle = 'rgba(214,198,154,.7)'; g.stroke();
    [[175.9, -38.8, 5, 4], [168.5, -45.1, 2.2, 5], [167.7, -45.3, 1.8, 4.5], [169.1, -44.5, 1.6, 3.6], [170.5, -43.95, 1.6, 2.6]].forEach(q => { const p = NP(q[0], q[1]); g.fillStyle = '#3aa0c8'; g.beginPath(); g.ellipse(p.x, p.y, q[2], q[3], 0.4, 0, 7); g.fill(); }); // Taupō and the southern lakes
    g.font = 'italic 11px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#5fa8c4'; g.fillText('Tasman Sea', 250, 250); g.fillText('Pacific Ocean', 640, 300); g.font = 'italic 8px system-ui,sans-serif'; { const p = NP(174.45, -41.05); g.fillText('Cook Strait', p.x - 30, p.y + 2); }
    return utilitarian(c);
  }
  // A processing line: half-round arch sheds end to end, a rail down the middle, a machine working up and down it.
  // Where a road crosses there is a gap, and a short rail reaches across it when nothing is coming.
  function archLine(x, y, ang, n, sc, green) {
    const tm = performance.now() / 1000; ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc);
    let d = 0; const spans = [];
    for (let i = 0; i < n; i++) {
      const gh = green && i % 2 === 1; ctx.fillStyle = gh ? 'rgba(168,232,170,.9)' : '#cfd6d9'; ctx.fillRect(d, -2.4, 7, 4.8); ctx.strokeStyle = gh ? '#2f7d4a' : '#59646a'; ctx.lineWidth = 0.4; ctx.strokeRect(d, -2.4, 7, 4.8);
      ctx.beginPath(); for (let k = 1; k < 4; k++) { ctx.moveTo(d + k * 1.75, -2.4); ctx.lineTo(d + k * 1.75, 2.4); } ctx.stroke(); // the ribs of the arch
      ctx.strokeStyle = '#1a1f24'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + 7, 0); ctx.stroke(); spans.push(d); d += 7;
      if (i < n - 1) { if (i % 3 === 2) { ctx.fillStyle = '#4d5a5e'; ctx.fillRect(d + 0.6, -6, 2.8, 12); const reach = Math.max(0, Math.sin(tm * 0.9 + i)) * 4; ctx.strokeStyle = '#e6b84a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + reach, 0); ctx.stroke(); d += 4; } else d += 0.8; }
    }
    if (n) { const f = 0.5 + 0.5 * Math.sin(tm * 0.5 + x), mx = f * (d - 2); ctx.fillStyle = '#d9634c'; ctx.fillRect(mx, -1.2, 2, 2.4); }
    ctx.restore();
  }
  function nzClick() {
    const n = D.nz.nodes.find(n => { const p = NP(...n.at); return Math.hypot(p.x - mouse.x, p.y - mouse.y) < 13 * Math.pow(cam.z, -0.55); }); if (!n) return;
    const l = nzSel && nzSel !== n.id && G.nzLink(nzSel, n.id);
    if (l && !S.nz.links[G.lkey(nzSel, n.id)]) { if (!G.nzBuildLink(S, nzSel, n.id)) say(S.nzWorks <= 0 ? 'No works crews left this season.' : S.cash < G.nzCost(S, l[2]) ? 'You cannot afford that link yet.' : 'Build out from what is already connected to Palmerston North.'); }
    nzSel = n.id; full();
  }
  function drawNZ() {
    if (!nzTiles) nzTiles = buildTiles();
    const on = G.nzDist(S, 'pn'), tm = performance.now() / 1000, m = Math.pow(cam.z, -0.55), chains = G.nzChains(S);
    ctx.fillStyle = '#0b2a36'; ctx.fillRect(0, 0, CW, CH); ctx.imageSmoothingEnabled = true; ctx.drawImage(nzTiles, 0, 0, CW, CH);
    ctx.strokeStyle = '#3aa0c8'; ctx.lineWidth = 2 * m; ctx.lineJoin = 'round'; D.nz.rivers.forEach(r => { ctx.beginPath(); r.forEach((q, i) => { const p = NP(...q); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.stroke(); });
    D.nz.links.forEach(l => {
      const a = NP(...G.NZN[l[0]].at), b = NP(...G.NZN[l[1]].at), lv = S.nz.links[G.lkey(l[0], l[1])], sel = nzSel === l[0] || nzSel === l[1];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      if (!lv) { ctx.setLineDash([2, 5]); ctx.strokeStyle = sel ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.22)'; ctx.lineWidth = (sel ? 1.5 : 1) * m; ctx.stroke(); ctx.setLineDash([]); return; }
      if (l[2] === 'rail') { ctx.strokeStyle = lv >= 2 ? '#ffe27a' : '#1a1f24'; ctx.lineWidth = (lv >= 2 ? 6 : 5) * m; ctx.stroke(); ctx.setLineDash([4 * m, 4 * m]); ctx.strokeStyle = lv >= 2 ? '#1a1f24' : '#cfd6d9'; ctx.lineWidth = 2 * m; ctx.stroke(); ctx.setLineDash([]); }
      else if (l[2] === 'ferry') { ctx.setLineDash([6, 4]); ctx.strokeStyle = '#e6efe9'; ctx.lineWidth = 2.5 * m; ctx.stroke(); ctx.setLineDash([]); }
      else { ctx.strokeStyle = '#d6c08a'; ctx.lineWidth = 3 * m; ctx.stroke(); }
    });
    chains.forEach(c => { if (!c.at || c.at === c.res) return; const a = NP(...G.NZN[c.res].at), b = NP(...G.NZN[c.at].at), f = (tm * 0.4 + a.x * 0.01) % 1; disc(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, 3 * m, D.nz.goods[c.good].col, '#111', m); });
    for (const id in S.nz.line || {}) { // the shed lines: out toward where the goods come from, and for a city, back into its precinct
      const n = G.NZN[id], k = S.nz.line[id], p = NP(...n.at), c = chains.find(c => c.at === id && c.res !== id), q = c ? NP(...G.NZN[c.res].at) : { x: p.x + Math.cos(p.x), y: p.y + Math.sin(p.x) }, ang = Math.atan2(q.y - p.y, q.x - p.x), food = (S.nz.fac[id] || []).some(g => D.nz.goods[g].out === 'food');
      const out = n.kind === 'city' ? Math.ceil(k / 2) : k; archLine(p.x + Math.cos(ang) * 9 * m, p.y + Math.sin(ang) * 9 * m, ang, out, m * 0.8, food);
      if (k - out) archLine(p.x - Math.cos(ang) * 9 * m, p.y - Math.sin(ang) * 9 * m, ang + Math.PI, k - out, m * 0.8, false);
    }
    D.nz.nodes.forEach(n => {
      const p = NP(...n.at), c = on[n.id] !== undefined, fac = S.nz.fac[n.id] || [], tk0 = tk; ctx.save(); ctx.translate(p.x * (1 - m), p.y * (1 - m)); ctx.scale(m, m); tk = tk / m; const right = (n.at[0] > 174.5 && n.id !== 'glb') || n.id === 'chc' || n.id === 'kkr' || n.id === 'can';
      if (nzSel === n.id) disc(p.x, p.y, 13, null, '#ffffff', 1.5);
      if (n.kind === 'city') { ctx.fillStyle = n.hub ? '#e6b84a' : c ? '#e6efe9' : '#6f7d80'; const r = n.hub ? 7 + S.nz.hub * 1.5 : 5; ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2); ctx.strokeStyle = '#10181c'; ctx.lineWidth = 1; ctx.strokeRect(p.x - r, p.y - r, r * 2, r * 2); }
      else if (n.kind === 'iwi') { ctx.fillStyle = c ? '#e0903c' : '#7a5f44'; ctx.beginPath(); ctx.moveTo(p.x, p.y - 7); ctx.lineTo(p.x + 7, p.y); ctx.lineTo(p.x, p.y + 7); ctx.lineTo(p.x - 7, p.y); ctx.fill(); ctx.strokeStyle = '#10181c'; ctx.lineWidth = 1; ctx.stroke(); }
      else disc(p.x, p.y, 5.5, c ? '#b6d957' : '#66754a', '#10181c', 1);
      if (n.res) disc(p.x - 9, p.y - 9, 4, D.nz.goods[n.res].col, '#10181c', 1);
      for (let i = 0, lv = G.nzRev(S, n.id); i < lv * 3; i++) { const a = i * 2.1; ctx.fillStyle = '#fff4cf'; ctx.fillRect(p.x + Math.cos(a) * (13 + (i % 3) * 3) - 1.5, p.y + Math.sin(a) * (13 + (i % 3) * 3) - 1.5, 3, 3); } // houses coming back
      fac.forEach((g, i) => { ctx.fillStyle = D.nz.goods[g].col; ctx.fillRect(p.x + (right ? -16 - i * 8 : 9 + i * 8), p.y + 6, 7, 7); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(p.x + (right ? -16 - i * 8 : 9 + i * 8), p.y + 6, 7, 7); });
      text(n.name, p.x + (right ? 11 : -11), p.y + 3, { align: right ? 'left' : 'right', size: n.kind === 'city' ? 10.5 : 9.5, bold: n.kind === 'city', color: c ? '#ffffff' : '#a9b7ba' });
      ctx.restore(); tk = tk0;
    });
    hud(() => { let y = 54; text('RAW GOODS', 14, 44, { align: 'left', size: 10, bold: true, color: '#8aa69d' });
    for (const k in D.nz.goods) { const g = D.nz.goods[k]; disc(20, y, 4, g.col, '#10181c', 1); text(`${g.name} → ${g.plant.toLowerCase()}`, 30, y + 3, { align: 'left', size: 10 }); y += 15; }
    y += 8; text('PLACES', 14, y, { align: 'left', size: 10, bold: true, color: '#8aa69d' }); y += 13;
    ctx.fillStyle = '#e6efe9'; ctx.fillRect(15, y - 5, 10, 10); text('city: full price, industry', 30, y + 3, { align: 'left', size: 10 }); y += 15;
    disc(20, y, 5, '#b6d957'); text('rural: 85%, grows the list', 30, y + 3, { align: 'left', size: 10 }); y += 15;
    ctx.fillStyle = '#e0903c'; ctx.beginPath(); ctx.moveTo(20, y - 6); ctx.lineTo(26, y); ctx.lineTo(20, y + 6); ctx.lineTo(14, y); ctx.fill(); text('Māori land: 70%, mana', 30, y + 3, { align: 'left', size: 10 });
    text(`timber ${S.timber} · steel ${S.steel} · food ${S.food}`, CW - 10, 44, { align: 'right', size: 11, bold: true, color: '#e6b84a' });
    text(`hub stage ${S.nz.hub}/3 · trunk ${S.done.trunk ? 'electrified' : 'not yet under the wire'}`, CW - 10, 60, { align: 'right', size: 10 }); });
    header(`Aotearoa · works crews this season: ${S.nzWorks}. Click a place to select it; click a neighbour along a dotted line to build the link.`);
  }


  // ───────────────── In the field: you and the people who turned out, moving as one body ─────────────────
  // One scene for every confrontation after the early patrols: the Levin convoys (in trucks), a street movement
  // after territory, a gang in force, and a police raid where the only weapon is how many people are watching.
  const FORMS = ['wedge', 'line', 'encircle'], FKIND = { levin: 'THE LEVIN INVASION', fascist: 'THE SQUARE', gang: 'YOUR YARD', raid: 'POLICE AT THE YARD' };
  function startField(kind, arg) {
    const n = G.muster(S), m = { type: 'field', kind, arg, t: 60, form: 0, split: false, anchor: null, you: { x: 360, y: 340, fx: 0, fy: -1, stam: 1, cd: 0, guard: false, hold: 0 }, mates: [], foes: [], zones: [], str: 1 + 0.05 * Math.min(10, S.sparWins), noise: 0, pol: 0, out: 0, done: null };
    for (let i = 0; i < n; i++) m.mates.push({ x: 360 + (i - n / 2) * 18, y: 375 + (i % 2) * 16, stam: 1, grp: 0, out: false, arr: 0 });
    if (kind === 'levin') { m.veh = true; m.t = 75; m.wps = [[110, 90], [360, 75], [610, 90], [110, 240], [360, 225], [610, 240], [230, 385], [490, 385]]; for (let i = 0; i < 8; i++) m.foes.push({ x: 80 + i * 80, y: 60 + (i % 3) * 40, mor: 1, box: 0, wp: i % 8, v: 146 + Math.random() * 14, h: 0 }); }
    else if (kind === 'fascist') { m.zones = [{ x: 150, y: 125, name: 'the Square', cap: 1 }, { x: 570, y: 125, name: 'the bus terminal', cap: 1 }, { x: 360, y: 240, name: 'the library steps', cap: 1 }]; for (let i = 0; i < 20; i++) m.foes.push({ x: 50 + i * 32, y: 36 + (i % 3) * 14, mor: 2, tz: i % 3 }); }
    else if (kind === 'gang') { m.t = 50; m.zones = [{ x: 360, y: 360, name: 'your yard', cap: 1 }]; const k = 12 + Math.min(6, G.gst(S, arg).wins * 3); for (let i = 0; i < k; i++) m.foes.push({ x: 120 + i * (480 / k), y: 36 + (i % 2) * 14, mor: 2.4, tz: 0 }); }
    else { m.passive = true; m.t = 80; m.lineY = 56; m.lia = G.liaisons(S); m.comm = clamp(Math.round(S.mana / 15), 3, 14); for (let i = 0; i < 9; i++) m.foes.push({ x: 80 + i * 70, y: 56, mor: 9 }); }
    mode = m;
  }
  function formSpot(i, n, form, c, f, focus) { // where the i-th of n people stands, for a body centred on c and facing f
    const px = -f.y, py = f.x;
    if (form === 1) { const k = Math.ceil((i + 1) / 2) * (i % 2 ? 1 : -1); return { x: c.x + px * k * 24, y: c.y + py * k * 24 }; }
    if (form === 2) { const a = (i / Math.max(1, n)) * Math.PI * 2; return { x: focus.x + Math.cos(a) * 32, y: focus.y + Math.sin(a) * 32 }; }
    const row = Math.floor(i / 2) + 1, sd = i % 2 ? 1 : -1; return { x: c.x - f.x * row * 20 + px * sd * row * 17, y: c.y - f.y * row * 20 + py * sd * row * 17 };
  }
  const nearest = (list, p, ok) => { let b = null, bd = 1e9; list.forEach(e => { if (ok && !ok(e)) return; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; b = e; } }); return b; };
  function fieldKey(k) {
    const m = mode; if (m.done) return;
    if (k === 'f') { m.form = (m.form + 1) % 3; say('Formation: ' + FORMS[m.form]); }
    else if (k === '1' || k === '2' || k === '3') { m.form = +k - 1; say('Formation: ' + FORMS[m.form]); }
    else if (k === 'g') { m.split = !m.split; m.anchor = { x: m.you.x, y: m.you.y }; let j = 0; m.mates.forEach(a => { if (!a.out) a.grp = m.split && j++ % 2 ? 1 : 0; }); say(m.split ? 'Half hold here on their own. The rest are with you.' : 'Everyone back on you.'); }
    else if (k === 'j' || k === 'k' || k === 'l') {
      if (m.passive) return say('Not one hand raised. That is the whole point.');
      const y = m.you; if (m.veh || y.cd > 0 || y.down > 0) return;
      if (k === 'l' && y.guard) { y.grap = 0.7; return; } // from the block to a grip: whoever swings at you next goes down
      const mv = k === 'j' ? 'punch' : k === 'k' ? 'kick' : 'shove', rng = k === 'k' ? 54 : 40; y.cd = k === 'j' ? 0.4 : k === 'k' ? 0.65 : 0.55; y.act = { mv, t: 0.22 };
      const e = nearest(m.foes, y, e => e.mor > 0 && !(e.down > 0)); if (!e || Math.hypot(e.x - y.x, e.y - y.y) > rng) return;
      const d = Math.hypot(e.x - y.x, e.y - y.y) || 1, push = n => { e.x = clamp(e.x + (e.x - y.x) / d * n, 14, CW - 14); e.y = clamp(e.y + (e.y - y.y) / d * n, 34, CH - 20); };
      if (mv === 'shove') { push(34); e.w = 0; if (e.gd > 0) { e.gd = 0; e.open = 0.9; say('Guard broken.'); } return; }
      let dmg = (mv === 'kick' ? 0.5 : 0.34) * m.str;
      if (e.gd > 0) dmg *= 0.2; else if (e.open > 0) { dmg *= 1.9; e.open = 0; e.down = 0.8; say('Combo.'); } else if (Math.random() < 0.35) e.gd = 1; else e.open = 0.65;
      e.mor -= dmg; e.flash = 0.2; push(8);
    }
  }
  function stepField(dt) {
    const m = mode, y = m.you; if (m.done) return;
    m.t -= dt; y.cd -= dt; y.grap = Math.max(0, (y.grap || 0) - dt); y.down = Math.max(0, (y.down || 0) - dt); y.flash = Math.max(0, (y.flash || 0) - dt); if (y.act && (y.act.t -= dt) <= 0) y.act = null;
    y.guard = !m.veh && !m.passive && y.grap <= 0 && !!keys[' '];
    const mx = (keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0), my = (keys.s || keys.ArrowDown ? 1 : 0) - (keys.w || keys.ArrowUp ? 1 : 0), ml = Math.hypot(mx, my);
    if (ml && !y.guard && !(y.down > 0)) { y.fx = mx / ml; y.fy = my / ml; const v = m.veh ? 150 : 165; y.x = clamp(y.x + y.fx * v * dt, 16, CW - 16); y.y = clamp(y.y + y.fy * v * dt, 34, CH - 22); }
    const live = m.foes.filter(e => e.mor > 0), mine = [y].concat(m.mates.filter(a => !a.out));
    // the body forms on you; a detached half holds its ground and deals with whatever comes near it
    const g0 = m.mates.filter(a => !a.out && a.grp === 0), g1 = m.mates.filter(a => !a.out && a.grp === 1);
    const ahead = { x: y.x + y.fx * 46, y: y.y + y.fy * 46 }, f0 = nearest(live, ahead), focus0 = f0 && Math.hypot(f0.x - ahead.x, f0.y - ahead.y) < 110 ? f0 : ahead;
    g0.forEach((a, i) => (a.tg = formSpot(i, g0.length, m.form, y, { x: y.fx, y: y.fy }, focus0)));
    if (g1.length) { const A = m.anchor, f1 = nearest(live, A), close = f1 && Math.hypot(f1.x - A.x, f1.y - A.y) < 150 && !m.passive; g1.forEach((a, i) => (a.tg = close ? formSpot(i, g1.length, 2, A, { x: 0, y: -1 }, f1) : formSpot(i, g1.length, 1, A, { x: 0, y: -1 }, A))); }
    m.mates.forEach(a => { if (a.out) return; const l = Math.hypot(a.tg.x - a.x, a.tg.y - a.y), v = (m.veh ? 138 : 150) * dt; if (l > 1) { a.x += (a.tg.x - a.x) / l * Math.min(v, l); a.y += (a.tg.y - a.y) / l * Math.min(v, l); } });
    if (m.kind === 'levin') {
      let moving = 0;
      live.forEach(e => {
        const w = m.wps[e.wp]; let vx = w[0] - e.x, vy = w[1] - e.y; const l = Math.hypot(vx, vy) || 1; if (l < 22) e.wp = Math.floor(Math.random() * m.wps.length); vx /= l; vy /= l; let near = 0;
        mine.forEach(p => { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 38) near++; if (d < 75 && d > 1) { vx += (e.x - p.x) / d * (75 - d) / 75 * 1.7; vy += (e.y - p.y) / d * (75 - d) / 75 * 1.7; } });
        const boxed = near >= 2, vl = Math.hypot(vx, vy) || 1, v = e.v * (boxed ? 0.12 : 1); e.x = clamp(e.x + vx / vl * v * dt, 14, CW - 14); e.y = clamp(e.y + vy / vl * v * dt, 34, CH - 20); e.h = Math.atan2(vy, vx);
        e.box = boxed ? e.box + dt : Math.max(0, e.box - dt * 0.5); if (e.box >= 1.8) { e.mor = 0; say('Boxed in. Engine off, keys out.'); } else moving++;
      });
      m.noise += dt * 2.3 * moving / 8;
      if (!m.foes.some(e => e.mor > 0)) return fieldEnd(true); if (m.noise >= 100) return fieldEnd(false);
    } else if (m.kind === 'raid') {
      let blocked = 0;
      m.foes.forEach(e => { e.y = m.lineY; const b = mine.filter(p => Math.abs(p.x - e.x) < 24 && p.y - e.y > -6 && p.y - e.y < 28); if (b.length) blocked++; b.forEach(p => { if (p === y) { y.hold += dt; if (y.hold > 2.5) { y.hold = 0; y.y = Math.min(CH - 30, y.y + 34); say('Shoved back. Reform further down the street.'); } } else { p.arr += dt; if (p.arr >= 3) { p.out = true; m.out++; m.pol += 5; say('One of yours is cuffed, hands open, on camera.'); } } }); });
      const frac = blocked / m.foes.length; m.lineY += 24 * (1 - 0.85 * frac) * dt; m.pol += dt * (0.5 + 0.12 * m.comm + 0.5 * m.lia) * (frac > 0.3 ? 1.5 : 0.6);
      if (m.pol >= 100) return fieldEnd(true); if (m.lineY >= 392 || m.t <= 0) return fieldEnd(m.pol >= 100);
    } else {
      live.forEach((e, ei) => {
        e.flash = Math.max(0, (e.flash || 0) - dt); e.gd = Math.max(0, (e.gd || 0) - dt); e.open = Math.max(0, (e.open || 0) - dt); if (e.down > 0) { e.down -= dt; e.w = 0; return; }
        const adj = mine.filter(p => Math.hypot(p.x - e.x, p.y - e.y) < 28), z = m.zones[e.tz];
        if (m.kind === 'fascist' && z.cap <= -1) e.tz = (e.tz + 1) % 3;
        if (!adj.length) { const tx = z.x + ((e.x * 7) % 40 - 20), ty = z.y + ((e.y * 5) % 30 - 15), l = Math.hypot(tx - e.x, ty - e.y); if (l > 6) { e.x += (tx - e.x) / l * 52 * dt; e.y += (ty - e.y) / l * 52 * dt; } return; }
        const ring = adj.length >= 3 ? 2 : 1, tip = m.form === 0 && Math.hypot(y.x - e.x, y.y - e.y) < 44 ? 1.3 : 1; e.mor -= dt * 0.13 * adj.length * ring * tip * m.str;
        const p = adj[ei % adj.length];
        if (p === y) { // against you they wind up and swing, as in the gym
          e.w = (e.w || 0) + dt; if (e.w >= 0.9) { e.w = 0;
            if (y.grap > 0) { y.grap = 0; e.down = 1.4; e.mor -= 0.8 * m.str; e.flash = 0.25; const o = nearest(live, e, q => q !== e); if (o && Math.hypot(o.x - e.x, o.y - e.y) < 40) o.down = 0.6; say('Caught and put on the ground.'); }
            else if (y.guard) e.open = 0.7;
            else { y.stam -= 0.11 * (m.form === 1 ? 0.5 : 1) / m.str; y.flash = 0.2; if (y.act && y.act.mv === 'shove') { y.down = 0.6; say('Pulled off your feet.'); } }
          }
        } else { e.w = 0; p.stam -= dt * 0.18 * (m.form === 1 ? 0.5 : 1) / m.str; if (p.stam <= 0) { p.out = true; m.out++; } }
      });
      m.zones.forEach(z => { const a = mine.filter(p => Math.hypot(p.x - z.x, p.y - z.y) < 50).length, b = live.filter(e => Math.hypot(e.x - z.x, e.y - z.y) < 50).length; z.cap = clamp(z.cap + dt * 0.3 * Math.sign(a - b), -1, 1); });
      const lost = m.zones.filter(z => z.cap <= -1).length;
      if (y.stam <= 0 || lost === m.zones.length) return fieldEnd(false);
      if (!m.foes.some(e => e.mor > 0)) return fieldEnd(true);
      if (m.t <= 0) return fieldEnd(m.zones.filter(z => z.cap > 0).length * 2 > m.zones.length);
    }
  }
  function fieldEnd(win) { const m = mode; m.done = G.fieldResult(S, m.kind, m.arg, win, m.out); light(); }
  function drawField() {
    const m = mode, y = m.you, tm = performance.now() / 1000;
    ctx.fillStyle = m.kind === 'levin' ? '#22262b' : '#1c2126'; ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = '#2b3138'; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) ctx.fillRect(30 + i * 172, 46 + j * 128, 138, 92);
    if (m.kind === 'raid') { [150, 250, 350].forEach((yy, i) => { ctx.strokeStyle = 'rgba(230,184,74,.25)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(CW, yy); ctx.stroke(); ctx.setLineDash([]); text(['first line', 'second line', 'last line'][i], 8, yy - 4, { align: 'left', size: 9, color: '#8a7a4a' }); }); ctx.fillStyle = '#e6b84a'; ctx.fillRect(300, 400, 120, 22); text('YOUR YARD', 360, 415, { bold: true, size: 10, color: '#2a1f00' }); for (let i = 0; i < m.comm; i++) { const sx = i % 2 ? 18 + (i % 3) * 9 : CW - 18 - (i % 3) * 9, sy = 120 + i * 20; figure(sx, sy + 8, 0.17, i % 2 ? 1 : -1, 'idle', '#e8dcc0'); if (Math.sin(tm * 3 + i) > 0.3) { ctx.fillStyle = '#fff'; ctx.fillRect(sx - 2, sy - 11, 4, 5); } } }
    m.zones.forEach(z => { disc(z.x, z.y, 50, z.cap > 0 ? `rgba(47,158,122,${0.12 + 0.2 * z.cap})` : `rgba(217,99,76,${0.12 - 0.25 * z.cap})`, z.cap > 0 ? '#2f9e7a' : '#d9634c', 1.5); text(z.name, z.x, z.y - 56, { size: 10, color: z.cap > 0 ? '#9fe0c4' : '#f0a898' }); });
    m.foes.forEach(e => {
      if (m.kind === 'levin') { ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.h); ctx.fillStyle = e.mor > 0 ? ['#d9634c', '#6fb3d9', '#c058d8', '#e6efe9'][Math.floor(e.v) % 4] : '#4a5560'; ctx.fillRect(-10, -6, 20, 12); ctx.fillStyle = '#10181c'; ctx.fillRect(2, -5, 5, 10); ctx.restore(); if (e.box > 0 && e.mor > 0) bar(e.x - 14, e.y - 16, 28, 4, e.box / 1.8, '#e6b84a'); }
      else if (m.kind === 'raid') { figure(e.x, e.y + 8, 0.2, 1, 'guard', '#3b5fa8'); ctx.fillStyle = '#cfe0ff'; ctx.fillRect(e.x - 9, e.y + 9, 18, 3); }
      else if (e.mor > 0) { const col = e.flash > 0 ? '#fff' : e.down > 0 ? '#77807a' : e.w > 0.5 ? '#ff9d6b' : m.kind === 'fascist' ? '#8a4a44' : G.GANG[m.arg].col; figure(e.x, e.y + 9, 0.2, e.x > y.x ? -1 : 1, e.down > 0 ? 'down' : e.gd > 0 ? 'guard' : e.w > 0.5 ? 'wpunch' : e.w > 0 && e.w < 0.12 ? 'punch' : 'idle', col); if (e.open > 0 && !(e.down > 0)) disc(e.x, e.y - 14, 2.5, '#ff9d6b'); bar(e.x - 9, e.y - 19, 18, 3, e.mor / (m.kind === 'gang' ? 2.4 : 2), '#d9634c'); }
    });
    if (m.kind === 'raid') { ctx.strokeStyle = '#3b5fa8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(60, m.lineY); ctx.lineTo(660, m.lineY); ctx.stroke(); }
    const unit = (p, me) => { if (m.veh) { ctx.fillStyle = me ? '#e6efe9' : '#e6b84a'; ctx.fillRect(p.x - 9, p.y - 12, 18, 24); ctx.fillStyle = '#39424a'; ctx.fillRect(p.x - 7, p.y - 10, 14, 6); } else { const f = nearest(m.foes, p, e => e.mor > 0), near = f && Math.hypot(f.x - p.x, f.y - p.y) < 30, dir = f ? (f.x >= p.x ? 1 : -1) : (y.fx >= 0 ? 1 : -1), pose = me ? (y.down > 0 ? 'down' : y.act ? y.act.mv : y.grap > 0 ? 'grapple' : y.guard ? 'guard' : 'idle') : m.passive ? (m.form === 1 ? 'guard' : 'idle') : near && !m.passive ? (Math.sin(tm * 9 + p.x) > 0.3 ? 'punch' : 'guard') : 'idle'; if (me) disc(p.x, p.y + 8, 10, y.grap > 0 ? 'rgba(159,224,196,.4)' : 'rgba(255,255,255,.18)', '#ffffff', 1); if (!(me && sprite('you', pose, p.x, p.y + 11, 34, dir))) figure(p.x, p.y + 9, me ? 0.23 : 0.2, dir, pose, me ? (y.flash > 0 ? '#fff' : y.grap > 0 ? '#9fe0c4' : '#6fb3d9') : p.grp === 1 ? '#9fe0c4' : '#d7e84a'); if (p.stam < 1) bar(p.x - 9, p.y + 12, 18, 3, p.stam, '#2f9e7a'); } };
    m.mates.forEach(a => { if (a.out) { if (m.veh) disc(a.x, a.y, 5, '#4a5560'); else figure(a.x, a.y + 9, 0.2, 1, 'down', '#4a5560'); return; } unit(a, false); if (a.arr > 0) bar(a.x - 9, a.y - 15, 18, 3, a.arr / 3, '#3b5fa8'); });
    unit(y, true);
    if (m.split && m.anchor) { ctx.setLineDash([3, 4]); disc(m.anchor.x, m.anchor.y, 6, null, '#9fe0c4', 1); ctx.setLineDash([]); }
    header(`${FKIND[m.kind]} · ${Math.ceil(Math.max(0, m.t))}s · formation: ${FORMS[m.form]}${m.split ? ' · split' : ''} · with you: ${m.mates.filter(a => !a.out).length}`);
    if (m.kind === 'levin') { text('disturbance', 500, 40, { align: 'right', size: 10 }); bar(506, 32, 200, 9, m.noise / 100, m.noise > 70 ? '#d9634c' : '#e6b84a'); }
    if (m.kind === 'raid') { text('political cost to them', 500, 40, { align: 'right', size: 10 }); bar(506, 32, 200, 9, m.pol / 100, '#2f9e7a'); }
    text(m.veh ? 'WASD drive · F formation · G leave half as a roadblock · two trucks beside a car boxes it in' : m.passive ? 'WASD move · F formation · G leave half as a second line · stand in the way, fall back, reform' : 'WASD move · J punch · K kick · L shove (breaks a guard) · Space block · L while blocking: grip · F formation · G split', CW / 2, CH - 7, { size: 10.5, color: '#cfe3d6' });
  }

  // ───────────────── On site: one crew, three trades ─────────────────
  // The same people drive out, unload, dig, build and stand the gate. You decide, minute by minute, how many are doing
  // which. On a contract site that is logistics / labour / security; on a security job it is rovers / lights / gates.
  const SROLE = { works: ['logistics', 'labour', 'security'], guard: ['rovers', 'lights', 'gates'] }, SCOL = ['#e6b84a', '#ff9d6b', '#5a8be0'];
  const SITE = { x0: 120, y0: 70, x1: 600, y1: 380, truck: { x: 548, y: 130 }, stack: { x: 190, y: 130 }, store: { x: 360, y: 225 } };
  function startSite(kind, loc) {
    const n = G.crewOut(S), works = kind === 'works', T = works ? 80 : 65;
    const m = { type: 'site', kind, loc, t: T, T, crew: [], you: { x: 360, y: 300 }, crates: works ? 10 : 0, stack: works ? 0 : 10, dig: 0, build: 0, lights: 0, lost: 0, intr: [], spawn: 6, done: null,
      gates: works ? [{ x: SITE.x0, y: 225 }, { x: 360, y: SITE.y1 }] : [{ x: SITE.x0, y: 225 }, { x: 360, y: SITE.y1 }, { x: SITE.x1, y: 225 }] };
    for (let i = 0; i < n; i++) m.crew.push({ x: 500 + (i % 4) * 20, y: 170 + Math.floor(i / 4) * 22, role: works ? 0 : i % 3 === 1 ? 1 : 2, carry: false, busy: 0, i });
    mode = m;
  }
  function siteKey(k) { // 1, 2, 3: move one more person onto that trade, from whichever other trade has the most
    const m = mode, r = +k - 1; if (m.done) return; const cnt = [0, 1, 2].map(q => m.crew.filter(c => c.role === q).length), from = [0, 1, 2].filter(q => q !== r).sort((a, b) => cnt[b] - cnt[a])[0];
    const c = m.crew.filter(c => c.role === from && !c.carry)[0] || m.crew.filter(c => c.role === from)[0]; if (!c) return; if (c.carry) { c.carry = false; m.crates++; } c.role = r; say(`One more on ${SROLE[m.kind][r]}.`);
  }
  const perim = f => { const w = SITE.x1 - SITE.x0 - 30, h = SITE.y1 - SITE.y0 - 30, P = 2 * (w + h), d = ((f % 1) + 1) % 1 * P, x0 = SITE.x0 + 15, y0 = SITE.y0 + 15; return d < w ? { x: x0 + d, y: y0 } : d < w + h ? { x: x0 + w, y: y0 + d - w } : d < 2 * w + h ? { x: x0 + w - (d - w - h), y: y0 + h } : { x: x0, y: y0 + h - (d - 2 * w - h) }; };
  function stepSite(dt) {
    const m = mode, y = m.you, works = m.kind === 'works'; if (m.done) return;
    m.t -= dt; const el = m.T - m.t, go = (c, tx, ty, v) => { const l = Math.hypot(tx - c.x, ty - c.y), st = v * dt; if (l <= st) { c.x = tx; c.y = ty; return true; } c.x += (tx - c.x) / l * st; c.y += (ty - c.y) / l * st; return false; };
    const mx = (keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0), my = (keys.s || keys.ArrowDown ? 1 : 0) - (keys.w || keys.ArrowUp ? 1 : 0), ml = Math.hypot(mx, my);
    if (ml) { y.x = clamp(y.x + mx / ml * 150 * dt, 16, CW - 16); y.y = clamp(y.y + my / ml * 150 * dt, 34, CH - 16); y.dir = mx || y.dir; }
    let lab = 0, k0 = 0, k1 = 0, k2 = 0;
    m.crew.forEach(c => {
      c.busy = Math.max(0, c.busy - dt);
      if (c.role === 0) { const j = k0++;
        if (works) { if (c.carry) { if (go(c, SITE.stack.x + (j % 3) * 8, SITE.stack.y + 26, 95)) { c.carry = false; m.stack++; } } else if (m.crates > 0) { if (go(c, SITE.truck.x - 30, SITE.truck.y + 10 + (j % 3) * 8, 110)) { c.carry = true; m.crates--; } } else go(c, SITE.stack.x + 40 + j * 14, SITE.stack.y + 40, 95); }
        else { const q = perim(el * 0.035 + j / Math.max(1, m.crew.filter(c => c.role === 0).length)); go(c, q.x, q.y, 120); }
      } else if (c.role === 1) { const j = k1++;
        if (works) { if (go(c, 250 + (j % 6) * 44, 262 + Math.floor(j / 6) * 30, 95)) lab++; } else { const q = [[150, 100], [570, 100], [150, 350], [570, 350]][j % 4]; if (go(c, q[0] + Math.floor(j / 4) * 14, q[1], 95)) lab++; }
      } else { const g = m.gates[k2++ % m.gates.length]; c.gate = g; go(c, g.x + (g.x === SITE.x0 ? 16 : g.x === SITE.x1 ? -16 : (k2 > m.gates.length ? 18 : 0)), g.y + (g.y === SITE.y1 ? -16 : (k2 > m.gates.length ? 18 : 0)), 95); }
    });
    if (works) {
      if (Math.abs(y.y - 262) < 40 && y.x > 230 && y.x < 490) lab++; // you pitch in where you stand
      const geared = m.stack + (10 - m.stack - m.crates - m.lost) >= 2 ? 1 : 0.3; // slow going until the tools are off the truck
      const dg = G.hasMachine(S, 'excavator') ? 1.6 : 1; if (m.dig < 1) m.dig = Math.min(1, m.dig + dt * 0.008 * lab * geared * dg); else m.build = Math.min(1, Math.max(0, (10 - m.crates - m.lost)) / 10, m.build + dt * 0.008 * lab);
    } else m.lights = Math.min(1, m.lights + dt * 0.02 * lab);
    // people who would like what is on the site
    m.spawn -= dt;
    if (m.spawn <= 0) { m.spawn = Math.max(2.2, (works ? 9 : 7) - el * 0.07) * (0.7 + Math.random() * 0.6); const fence = !works && Math.random() < 0.4, e = fence ? perim(Math.random()) : m.gates[Math.floor(Math.random() * m.gates.length)], out = { x: e.x < 200 ? -10 : e.x > 520 ? CW + 10 : e.x, y: e.y < 120 ? 20 : e.y > 330 ? CH + 10 : e.y }; if (fence) { const f = Math.random(); Object.assign(e, { x: f < 0.5 ? (f < 0.25 ? SITE.x0 : SITE.x1) : SITE.x0 + Math.random() * 480, y: f < 0.5 ? SITE.y0 + Math.random() * 310 : SITE.y0 }); out.x = e.x === SITE.x0 ? -10 : e.x === SITE.x1 ? CW + 10 : e.x; out.y = e.y === SITE.y0 ? 20 : e.y; } m.intr.push({ x: out.x, y: out.y, ex: e.x, ey: e.y, ox: out.x, oy: out.y, fence, st: 'come', cut: 0, has: false }); }
    const catchers = [y].concat(m.crew.filter(c => c.role === (works ? 2 : 0) || c.role === 2)), v = 62 * (m.lights >= 1 ? 0.7 : 1);
    for (let i = m.intr.length - 1; i >= 0; i--) {
      const e = m.intr[i], tgt = works ? (m.stack > 0 ? SITE.stack : SITE.truck) : SITE.store;
      if (e.st !== 'out') { const near = catchers.find(c => Math.hypot(c.x - e.x, c.y - e.y) < (c === y ? 28 : 30) && !(c.busy > 0)); if (near && (e.st !== 'come' || Math.hypot(e.x - e.ex, e.y - e.ey) < 30)) { if (near !== y) near.busy = 1.6; if (e.has) { e.has = false; m.lost--; if (works) m.stack++; else m.stack++; say('Caught at the fence. It goes back on the stack.'); } e.st = 'out'; } }
      if (e.st === 'come') { if (go(e, e.ex, e.ey, v)) e.st = e.fence ? 'cut' : 'in'; }
      else if (e.st === 'cut') { e.cut += dt; if (e.cut > 2.5) e.st = 'in'; }
      else if (e.st === 'in') { if (go(e, tgt.x, tgt.y + 14, v)) { if (works ? m.stack + m.crates > 0 : m.stack > 0) { e.has = true; m.lost++; if (m.stack > 0) m.stack--; else m.crates--; } e.st = 'run'; } }
      else if (e.st === 'run') { if (go(e, e.ex, e.ey, v * 1.25)) e.st = 'out'; }
      else if (go(e, e.ox, e.oy, v * 1.3)) m.intr.splice(i, 1);
    }
    if (m.t <= 0 || (works && m.build >= 1)) { m.done = G.siteResult(S, m.kind, m.loc, works ? (m.dig + m.build) / 2 : 1, m.lost); light(); }
  }
  function drawSite() {
    const m = mode, works = m.kind === 'works', tm = performance.now() / 1000, el = m.T - m.t, dusk = clamp((el / m.T - 0.45) / 0.55, 0, 1) * (works ? 0.45 : 0.6) + (works ? 0 : 0.15);
    ctx.fillStyle = '#4a5a3a'; ctx.fillRect(0, 0, CW, CH); ctx.fillStyle = '#8a7a55'; ctx.fillRect(SITE.x0, SITE.y0, SITE.x1 - SITE.x0, SITE.y1 - SITE.y0);
    ctx.fillStyle = '#3d4348'; ctx.fillRect(0, 205, SITE.x0, 40); ctx.fillRect(340, SITE.y1, 40, CH - SITE.y1); if (!works) ctx.fillRect(SITE.x1, 205, CW - SITE.x1, 40);
    if (works) { // the job itself: a trench, then the road base laid in it
      ctx.fillStyle = '#6b5d3f'; ctx.fillRect(240, 240, 250, 44); ctx.fillStyle = '#3a3122'; ctx.fillRect(240, 240, 250 * m.dig, 44); ctx.fillStyle = '#9d978a'; ctx.fillRect(240, 244, 250 * m.build, 36); if (m.build > 0) { ctx.strokeStyle = '#6f6a5e'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = 260; x < 240 + 250 * m.build; x += 20) { ctx.moveTo(x, 244); ctx.lineTo(x, 280); } ctx.stroke(); }
      if (G.hasMachine(S, 'excavator')) drawMachine('excavator', 240 + 250 * Math.min(0.9, m.dig) - 10, 196, 0.2);
      ctx.fillStyle = '#e6efe9'; ctx.fillRect(SITE.truck.x - 22, SITE.truck.y - 14, 60, 28); ctx.fillStyle = '#d9634c'; ctx.fillRect(SITE.truck.x + 38, SITE.truck.y - 12, 18, 24);
      for (let i = 0; i < m.crates; i++) { ctx.fillStyle = '#c9a36b'; ctx.fillRect(SITE.truck.x - 18 + (i % 5) * 11, SITE.truck.y - 10 + Math.floor(i / 5) * 11, 9, 9); }
      text('laydown', SITE.stack.x + 10, SITE.stack.y - 22, { size: 9, color: '#3a3122' });
    } else { ctx.fillStyle = '#6f7479'; ctx.fillRect(SITE.store.x - 46, SITE.store.y - 30, 92, 60); ctx.fillStyle = '#e6b84a'; ctx.fillRect(SITE.store.x + 60, SITE.store.y - 10, 30, 18); ctx.fillStyle = '#39424a'; ctx.fillRect(SITE.store.x + 56, SITE.store.y - 14, 10, 26); text('plant and materials', SITE.store.x, SITE.store.y - 36, { size: 9, color: '#3a3122' }); }
    const sp = works ? SITE.stack : { x: SITE.store.x - 24, y: SITE.store.y - 6 }; for (let i = 0; i < m.stack; i++) { ctx.fillStyle = '#c9a36b'; ctx.fillRect(sp.x - 14 + (i % 5) * 11, sp.y - 10 + Math.floor(i / 5) * 11, 9, 9); ctx.strokeStyle = '#5d4826'; ctx.lineWidth = 0.6; ctx.strokeRect(sp.x - 14 + (i % 5) * 11, sp.y - 10 + Math.floor(i / 5) * 11, 9, 9); }
    ctx.strokeStyle = '#cfd6d9'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.strokeRect(SITE.x0, SITE.y0, SITE.x1 - SITE.x0, SITE.y1 - SITE.y0); ctx.setLineDash([]);
    m.gates.forEach(g => { ctx.fillStyle = '#8a7a55'; ctx.fillRect(g.x - 20, g.y - 20, 40, 40); ctx.fillStyle = '#e6b84a'; if (g.y === SITE.y1) { ctx.fillRect(g.x - 22, g.y - 3, 4, 6); ctx.fillRect(g.x + 18, g.y - 3, 4, 6); } else { ctx.fillRect(g.x - 3, g.y - 22, 6, 4); ctx.fillRect(g.x - 3, g.y + 18, 6, 4); } });
    m.intr.forEach(e => { figure(e.x, e.y + 9, 0.2, e.ex >= e.x ? 1 : -1, e.st === 'cut' ? 'wshove' : 'idle', '#565c63'); if (e.has) { ctx.fillStyle = '#c9a36b'; ctx.fillRect(e.x - 4, e.y - 16, 8, 8); } if (e.st === 'cut') bar(e.x - 10, e.y - 22, 20, 3, e.cut / 2.5, '#d9634c'); });
    m.crew.forEach(c => { figure(c.x, c.y + 9, 0.2, 1, c.busy > 0 ? 'shove' : c.role === 2 ? 'guard' : c.role === 1 && works && Math.sin(tm * 8 + c.i) > 0 ? 'wpunch' : 'idle', SCOL[c.role]); if (c.carry) { ctx.fillStyle = '#c9a36b'; ctx.fillRect(c.x - 4, c.y - 17, 8, 8); } });
    disc(m.you.x, m.you.y + 8, 9, 'rgba(255,255,255,.18)', '#ffffff', 1); figure(m.you.x, m.you.y + 9, 0.23, m.you.dir || 1, 'idle', '#6fb3d9');
    if (dusk > 0) { ctx.fillStyle = `rgba(6,10,26,${dusk})`; ctx.fillRect(0, 24, CW, CH - 24); if (!works) [[150, 100], [570, 100], [150, 350], [570, 350]].forEach((q, i) => { if (m.lights * 4 > i) { const g = ctx.createRadialGradient(q[0], q[1], 4, q[0], q[1], 120); g.addColorStop(0, 'rgba(255,244,207,.35)'); g.addColorStop(1, 'rgba(255,244,207,0)'); ctx.fillStyle = g; ctx.fillRect(q[0] - 120, q[1] - 120, 240, 240); } }); }
    const cnt = [0, 1, 2].map(q => m.crew.filter(c => c.role === q).length), R = SROLE[m.kind];
    header(`${works ? 'CONTRACT SITE' : 'SITE SECURITY'} · ${Math.ceil(Math.max(0, m.t))}s of daylight${works ? ` · unloaded ${10 - m.crates - m.lost}/10 · dug ${Math.round(m.dig * 100)}% · built ${Math.round(m.build * 100)}%` : ` · lights ${Math.round(m.lights * 100)}% · on site ${m.stack}/10`} · lost ${m.lost}`);
    [0, 1, 2].forEach(q => { ctx.fillStyle = 'rgba(8,18,20,.85)'; ctx.fillRect(8 + q * 150, CH - 26, 144, 20); ctx.fillStyle = SCOL[q]; ctx.fillRect(12 + q * 150, CH - 22, 12, 12); text(`${q + 1}  ${R[q]}: ${cnt[q]}`, 30 + q * 150, CH - 12, { align: 'left', size: 11, bold: true }); });
    text('WASD: you. Walk into anyone who should not be there.', CW - 10, CH - 12, { align: 'right', size: 10, color: '#cfe3d6' });
  }

  // ───────────────── You, on the map: van, truck convoy, barge, airship, platform ─────────────────
  const landR = [[250, 0], [205, 40], [240, 90], [330, 150], [345, 230], [300, 300], [265, 360], [215, 400], [225, 440], [720, 440], [720, 0]];
  // Road graphs: the region's highways, Palmerston North's suburbs, and a main street and side roads for every other town.
  const RAMP = { x: 337, y: 186 }, BARGE_AT = { x: 150, y: 235 }, graphs = {};
  function townGraph(id) {
    let h = 7; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 9973; const r = () => (h = (h * 137 + 71) % 9973) / 9973;
    const t = G.TOWN[id], nodes = {}, adj = {}, link = (a, b) => { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); };
    for (let i = 0; i < 5; i++) nodes['m' + i] = { x: 110 + i * 125, y: 215 + (r() - 0.5) * 50, name: i === 2 ? 'Main street' : i === 0 ? 'Highway' : i === 4 ? 'Highway' : '' };
    const top = ['School', 'Marae', 'Machine shop'], bot = ['Railway yard', t.res.name.replace(/^./, c => c.toUpperCase()), 'Domain'];
    for (let i = 1; i <= 3; i++) { nodes['t' + i] = { x: nodes['m' + i].x + (r() - 0.5) * 70, y: 90 + r() * 45, name: top[i - 1] }; nodes['b' + i] = { x: nodes['m' + i].x + (r() - 0.5) * 70, y: 320 + r() * 55, name: bot[i - 1] }; link('m' + i, 't' + i); link('m' + i, 'b' + i); }
    for (let i = 0; i < 4; i++) link('m' + i, 'm' + (i + 1));
    link('t1', 't2'); link('b2', 'b3'); for (const k in nodes) nodes[k].id = k;
    return { nodes, adj, first: 'm0' };
  }
  function graphOf(v) {
    const pl = S.place || 'pn', key = v === 2 ? 'c:' + pl : v === 3 ? 'r' : v === 6 ? 'w' : ''; if (!key) return null; if (graphs[key]) return graphs[key];
    if (v === 6) { const nodes = {}, adj = {}, lk = (a, b) => { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); }; WORLD.forEach(c => { nodes[c.id] = c; if (c.up) lk(c.id, c.up); }); lk('nyc', 'lon'); lk('lon', 'hkg'); lk('nyc', 'hkg'); return (graphs[key] = { nodes, adj, first: 'pn' }); }
    const nodes = {}, adj = {}, link = (a, b) => { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); };
    if (v === 3) { D.towns.forEach(t => (nodes[t.id] = { id: t.id, x: t.x, y: t.y, name: t.name })); nodes.ramp = { id: 'ramp', x: RAMP.x + 15, y: RAMP.y, name: 'Himatangi ramp' }; D.roads.forEach(r => link(r[0], r[1])); return (graphs[key] = { nodes, adj, first: 'pn' }); }
    if (pl === 'pn') { D.city.forEach(n => { nodes[n.id] = n; adj[n.id] = n.adj; }); return (graphs[key] = { nodes, adj, first: D.city.find(n => n.home).id }); }
    return (graphs[key] = townGraph(pl));
  }
  function arrive(v, air) { // set down on a map: on the nearest road, or still in the air
    const p = whereYou(v), g = graphOf(v); p.vx = p.vy = 0; p.b = null; p.t = 0; p.launch = null;
    if (!g) return; if (air) { p.m = 'air'; return; }
    const n = Object.values(g.nodes).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; p.a = n.id; p.x = n.x; p.y = n.y; p.m = 'road';
  }
  function whereYou(v) {
    S.at = S.at || {}; if (S.at[v]) return S.at[v];
    const g = graphOf(v); if (g) { const n = g.nodes[g.first]; return (S.at[v] = { x: n.x, y: n.y, a: n.id, b: null, t: 0, m: 'road' }); }
    const pn = NP(175.61, -40.35), home = PX(175.6, -40.3);
    return (S.at[v] = v === 4 ? { x: pn.x + 14, y: pn.y - 10 } : { x: home.x, y: home.y - 12 });
  }
  function whereIs(ms) { // the place on the map each kind of trouble happens
    const h = D.city.find(n => n.home);
    if (ms === 'levin') return { view: 3, x: G.TOWN.levin.x, y: G.TOWN.levin.y, name: 'Levin' };
    if (ms.startsWith('site:')) { const id = ms.split(':')[2], n = G.NODE[id], t = G.TOWN[id]; return n ? { view: 2, x: n.x, y: n.y, name: n.name } : { view: 3, x: t.x, y: t.y, name: t.name }; }
    if (ms === 'fascist') { const n = G.NODE.square || h; return { view: 2, x: n.x, y: n.y, name: n.name }; }
    if (ms === 'raid') return { view: 2, x: h.x, y: h.y, name: 'your yard' };
    if (ms.startsWith('gang:')) { const n = G.NODE[G.GANG[ms.slice(5)].nodes[0]] || h; return { view: 2, x: n.x, y: n.y, name: n.name }; }
    if (ms === 'corridor') { const p = PX(132.6, -1.6); return { view: 5, x: p.x, y: p.y, name: 'the Papua zone' }; }
    const t = G.boatTier(S), p = t === 3 ? PX(116, -9.4) : NP(172.3, -39.9); return t === 1 ? { view: 3, x: 120, y: 250, name: 'the Bight' } : t === 2 ? { view: 4, x: p.x, y: p.y, name: 'the western EEZ' } : { view: 5, x: p.x, y: p.y, name: 'Lombok Strait' };
  }
  const calls = v => S.mission.filter(G.located).map(ms => Object.assign({ ms }, whereIs(ms))).filter(c => !v || (c.view === v && (v !== 2 || (S.place || 'pn') === 'pn')));
  function answer(ms) {
    S.mission.splice(S.mission.indexOf(ms), 1);
    if (ms.startsWith('site:')) startSite(ms.split(':')[1], ms.split(':')[2]); else if (ms === 'boat') startBoat(); else if (ms === 'corridor') startCorridor(); else startField(ms.split(':')[0], ms.split(':')[1]);
    say(G.missionName(S, ms)); full();
  }
  // On the ground you keep to the roads, junction to junction. On the water and in the air you are free, and you have weight.
  const trail = {}, GRIP = [0, 0, 6, 3, 2.2, 1.6, 2];
  const aboard = () => { const p = S.at && S.at[3]; return !!p && p.m === 'sea' && Math.hypot(p.x - BARGE_AT.x, p.y - BARGE_AT.y) < 18; };
  function toggleAir() {
    if (mode || modalUp() || S.view !== 3 || S.jobs.length) return; const p = whereYou(3);
    if (p.launch || p.m === 'sea') return say('Not from the water.');
    if (p.m === 'air') { const g = graphOf(3), n = Object.values(g.nodes).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (Math.hypot(n.x - p.x, n.y - p.y) > 45) return say('Nowhere to set down here. Find a town.'); arrive(3, false); say('Set down at ' + n.name + '. Back on the road.'); return full(); }
    if (G.platform(S) < 2) return say('You have nothing that flies free yet. The Kāhu airship changes that.');
    p.m = 'air'; p.b = null; say('Lifting off. V again over a town to set down.'); full();
  }
  function stepYou(dt, v) {
    if (modalUp() || S.over) return; const p = whereYou(v), tr = trail[v] || (trail[v] = []), g = graphOf(v);
    for (let i = tr.length - 1; i >= 0; i--) if ((tr[i].t += dt) > 1.6) tr.splice(i, 1);
    if (p.launch) { // the amphibious launch (or the haul-out): no steering, just watch it happen
      const L = p.launch, d = L.out ? 1 : -1; L.t += dt / 5; const u = clamp(L.t, 0, 1), e = u < 0.5 ? u * 0.9 : 0.45 + (u - 0.5) * 1.1;
      p.x = RAMP.x + d * (15 - 34 * e); p.y = RAMP.y + Math.sin(u * 9) * (u > 0.45 ? 0.5 : 0); p.hx = -d; p.hy = 0; p.vx = p.vy = 0; zgoal[3] = ZMAX[3];
      if (L.t >= 1) { p.launch = null; zgoal[3] = L.z; if (L.out) { p.m = 'sea'; say(S.done.himatangi ? 'Afloat. The barge is out to the south-west.' : 'Afloat.'); } else { p.m = 'road'; p.a = 'ramp'; p.b = null; p.x = g.nodes.ramp.x; p.y = g.nodes.ramp.y; say('Wheels down. Back on the road.'); } full(); }
      return;
    }
    const mx = (keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0), my = (keys.s || keys.ArrowDown ? 1 : 0) - (keys.w || keys.ArrowUp ? 1 : 0), l = Math.hypot(mx, my), ux = l ? mx / l : 0, uy = l ? my / l : 0;
    const sp = [0, 0, 120, 95, 80, 95, 210][v] / Math.pow(zoom[v] || 1, 0.7);
    if (g && p.m !== 'air' && p.m !== 'sea') { // on the road
      if (!g.nodes[p.a] || (p.b && !g.nodes[p.b])) arrive(v, false);
      if (l) {
        if (!p.b) {
          if (v === 3 && p.a === 'ramp' && ux < -0.6) { if (!S.done.himatangi) say('No permit to launch here yet. The Himatangi launch gets you onto the water.'); else { p.launch = { t: 0, out: true, z: clamp(zgoal[3] || 1, 1, ZMAX[3]) }; say('Down the beach at Himatangi…'); } return; }
          let best = null, bd = 0.4; (g.adj[p.a] || []).forEach(id => { const A = g.nodes[p.a], B = g.nodes[id], ln = Math.hypot(B.x - A.x, B.y - A.y) || 1, d = ((B.x - A.x) * ux + (B.y - A.y) * uy) / ln; if (d > bd) { bd = d; best = id; } });
          if (best) { p.b = best; p.t = 0; }
        }
        if (p.b) {
          const A = g.nodes[p.a], B = g.nodes[p.b], ln = Math.hypot(B.x - A.x, B.y - A.y) || 1, dx = (B.x - A.x) / ln, dy = (B.y - A.y) / ln, d = dx * ux + dy * uy;
          if (Math.abs(d) > 0.25) {
            const sg = Math.sign(d); p.t += sg * sp * dt / ln; p.hx = dx * sg; p.hy = dy * sg;
            if (p.t >= 1) { p.a = p.b; p.b = null; p.t = 0; full(); } else if (p.t <= 0) { p.b = null; p.t = 0; full(); }
            const C = p.b ? { x: A.x + (B.x - A.x) * p.t, y: A.y + (B.y - A.y) * p.t } : g.nodes[p.a]; p.x = C.x; p.y = C.y;
            if (!tr.length || Math.hypot(tr[tr.length - 1].x - p.x, tr[tr.length - 1].y - p.y) > 3 / (zoom[v] || 1)) tr.push({ x: p.x, y: p.y, t: 0 });
          }
        }
      }
    } else { // afloat or aloft
      const sea = p.m === 'sea', top = sp * (sea ? 0.7 : 1), f = Math.min(1, dt * (sea ? 1.5 : GRIP[v]));
      p.vx = (p.vx || 0) + (ux * top - (p.vx || 0)) * f; p.vy = (p.vy || 0) + (uy * top - (p.vy || 0)) * f;
      const vel = Math.hypot(p.vx, p.vy);
      if (vel > 1) {
        const nx = clamp(p.x + p.vx * dt, 10, CW - 10), ny = clamp(p.y + p.vy * dt, 32, CH - 10);
        if (sea && inPoly(landR, nx, ny)) { // the shore: you only come out at the ramp
          p.vx = p.vy = 0;
          if (Math.hypot(p.x - RAMP.x, p.y - RAMP.y) < 26) { p.launch = { t: 0, out: false, z: clamp(zgoal[3] || 1, 1, ZMAX[3]) }; say('Lining up on the beach…'); } else say('Surf and dunes here. Come ashore at the Himatangi ramp.');
        } else { p.x = nx; p.y = ny; const h = Math.min(1, dt * 8), ox = p.hx === undefined ? 1 : p.hx; p.hx = ox + (p.vx / vel - ox) * h; p.hy = (p.hy || 0) + (p.vy / vel - (p.hy || 0)) * h; }
        if (sea && vel > top * 0.3 && (!tr.length || Math.hypot(tr[tr.length - 1].x - p.x, tr[tr.length - 1].y - p.y) > 3 / (zoom[v] || 1))) tr.push({ x: p.x, y: p.y, t: 0 });
      }
      if (v === 3) { const ab = aboard(); if (ab !== !!p.ab) { p.ab = ab; if (ab && S.carry) { const nm = G.bargeDeliver(S); say(nm + ' craned aboard and bolted on.'); } else if (ab) say('Alongside the barge.'); full(); } }
    }
    if (v === 5) { const ns = !!canSend(); if (ns !== !!p.ns) { p.ns = ns; full(); } }
    const c = calls(v).find(c => Math.hypot(c.x - p.x, c.y - p.y) < 20); if (c) answer(c.ms);
  }
  function drawYou(v) {
    const p = whereYou(v), tm = performance.now() / 1000, hx = p.hx === undefined ? 1 : p.hx, hy = p.hy || 0, ang = Math.atan2(hy, hx);
    calls(v).forEach(c => { const r = 14 + 5 * Math.sin(tm * 5); disc(c.x, c.y, r, 'rgba(217,99,76,.18)', '#ff7a5c', 2); text(G.missionName(S, c.ms), c.x, c.y - r - 5, { bold: true, size: 10.5, color: '#ffb199' }); ctx.strokeStyle = 'rgba(255,122,92,.35)'; ctx.setLineDash([2, 6]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.setLineDash([]); });
    const L = v === 3 ? p.launch : null, u = L ? clamp(L.t, 0, 1) : 0, wet = L ? (L.out ? u : 1 - u) : 0; // wet: 0 on the sand, 1 afloat
    const how = v >= 4 ? 'air' : L ? 'launch' : v === 3 ? p.m || 'road' : 'van', lvl = G.platform(S), k = Math.pow(cam.z, -0.6);
    (trail[v] || []).forEach(q => { const a = 1 - q.t / 1.6, wetq = v === 3 && !inPoly(landR, q.x, q.y); ctx.fillStyle = wetq ? `rgba(255,255,255,${a * 0.5})` : `rgba(214,192,138,${a * 0.35})`; ctx.beginPath(); ctx.arc(q.x, q.y, (wetq ? 1 + q.t * 3 : 1.5 + q.t * 2) * k, 0, 7); ctx.fill(); });
    if (L && wet > 0.3 && wet < 0.9) for (let i = 0; i < 3; i++) { const r = ((tm * 1.4 + i / 3) % 1) * 9 * k; disc(p.x - 4 * k, p.y, r, null, `rgba(255,255,255,${0.6 * (1 - r / (9 * k))})`, 0.6 * k); } // she goes in
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(k, k);
    if (how === 'air') { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(5, 9, 11, 4, 0, 0, 7); ctx.fill(); }
    ctx.save(); ctx.rotate(ang);
    const crate = () => { if (S.carry && v === 3) { ctx.fillStyle = '#e6b84a'; ctx.fillRect(-10, -3.5, 8, 7); ctx.strokeStyle = '#3a2c00'; ctx.lineWidth = 0.8; ctx.strokeRect(-10, -3.5, 8, 7); } };
    if (how === 'van') { ctx.fillStyle = '#e6efe9'; ctx.fillRect(-8, -5, 16, 10); ctx.fillStyle = '#1f8fb5'; ctx.fillRect(3, -4, 5, 8); }
    else if (how === 'launch' || how === 'sea') { // the amphibious truck: wheels fold into the hull as she floats
      const fold = how === 'sea' ? 1 : clamp((wet - 0.45) * 4, 0, 1); ctx.fillStyle = '#1a1f24'; [[-9, -8], [5, -8], [-9, 6], [5, 6]].forEach(w => ctx.fillRect(w[0], w[1] + (w[1] < 0 ? fold * 2.5 : -fold * 0.5), 5, 2 * (1 - fold)));
      ctx.fillStyle = '#e6efe9'; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(9, -6); ctx.lineTo(-12, -6); ctx.lineTo(-12, 6); ctx.lineTo(9, 6); ctx.fill(); ctx.fillStyle = '#1f8fb5'; ctx.fillRect(1, -4, 6, 8); crate();
    }
    else if (how === 'air') { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 8 + lvl * 1.5, 4 + lvl * 0.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#39424a'; ctx.fillRect(-10 - lvl * 1.5, -3, 3, 6); }
    else { for (let i = 2; i >= 1; i--) { const sd = i === 1 ? 1 : -1; ctx.fillStyle = '#e6b84a'; ctx.fillRect(-18, sd * 8 - 4, 10, 8); ctx.fillStyle = '#39424a'; ctx.fillRect(-11, sd * 8 - 3, 3, 6); } ctx.fillStyle = '#e6efe9'; ctx.fillRect(-12, -5, 22, 10); ctx.fillStyle = '#1f8fb5'; ctx.fillRect(4, -4, 5, 8); crate(); } // the amphibious truck leading two more
    ctx.restore();
    const cap = L ? (L.out ? (wet < 0.35 ? 'down the beach' : wet < 0.7 ? 'into the surf · wheels up' : 'afloat') : (wet > 0.6 ? 'lining up on the ramp' : wet > 0.3 ? 'wheels down · through the surf' : 'up the beach')) : 'you' + (v >= 4 ? ' · ' + ['on the ground', 'aerostat', 'the Kāhu', 'the platform', 'the tether', 'the ring'][lvl] : how === 'sea' ? ' · afloat' : how === 'air' ? ' · the Kāhu' : '') + (S.carry && v === 3 ? ' · carrying a module' : '');
    text(cap, 0, 20, { size: 10 / (k * cam.z * tk), color: '#ffffff' });
    ctx.restore();
  }

  // ───────────────── The World: not countries but a hierarchy of cities, each hanging off the one above it ─────────────────
  const WORLD = [ // id, name, tier, parent, x, y
    ['nyc', 'New York', 1, null, 170, 150], ['lon', 'London', 1, null, 340, 118], ['hkg', 'Hong Kong', 1, null, 540, 190],
    ['tor', 'Toronto', 2, 'nyc', 150, 92], ['chi', 'Chicago', 2, 'nyc', 92, 128], ['lax', 'Los Angeles', 2, 'nyc', 66, 204], ['mex', 'Mexico City', 2, 'nyc', 122, 256], ['sao', 'São Paulo', 2, 'nyc', 216, 322],
    ['par', 'Paris', 2, 'lon', 318, 184], ['fra', 'Frankfurt', 2, 'lon', 398, 148], ['dxb', 'Dubai', 2, 'lon', 428, 232], ['los', 'Lagos', 2, 'lon', 318, 282], ['jnb', 'Johannesburg', 3, 'los', 372, 352], ['bom', 'Mumbai', 3, 'dxb', 474, 276],
    ['sha', 'Shanghai', 2, 'hkg', 576, 132], ['sel', 'Seoul', 3, 'sha', 606, 94], ['tyo', 'Tokyo', 2, 'hkg', 652, 150], ['sin', 'Singapore', 2, 'hkg', 516, 280], ['kul', 'Kuala Lumpur', 3, 'sin', 468, 318], ['jkt', 'Jakarta', 3, 'sin', 536, 334],
    ['syd', 'Sydney', 2, 'hkg', 618, 318], ['mel', 'Melbourne', 3, 'syd', 580, 384], ['pom', 'Port Moresby', 3, 'syd', 648, 262], ['akl', 'Auckland', 3, 'syd', 672, 352], ['ham', 'Hamilton', 4, 'akl', 704, 322], ['wlg', 'Wellington', 4, 'akl', 676, 396], ['pn', 'Palmerston North', 5, 'wlg', 628, 420],
  ].map(q => ({ id: q[0], name: q[1], tier: q[2], up: q[3], x: q[4], y: q[5] }));
  const WCITY = {}; WORLD.forEach(c => (WCITY[c.id] = c));
  const hubOf = c => { while (c.up) c = WCITY[c.up]; return c.id; }, WCOL = { nyc: '#0098d4', lon: '#e32017', hkg: '#00a94f' };
  function drawWorld() {
    const tm = performance.now() / 1000, here = whereYou(6), home = ['pn', 'wlg', 'akl', 'syd', 'hkg'];
    ctx.fillStyle = '#1a1d20'; ctx.fillRect(0, 0, CW, CH);
    ctx.strokeStyle = 'rgba(255,255,255,.045)'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x <= CW; x += 40) { ctx.moveTo(x, 24); ctx.lineTo(x, CH); } for (let y = 40; y <= CH; y += 40) { ctx.moveTo(0, y); ctx.lineTo(CW, y); } ctx.stroke();
    [['THE AMERICAS', 110, 60], ['EUROPE · AFRICA · GULF', 372, 60], ['ASIA · PACIFIC', 600, 60]].forEach(q => text(q[0], q[1], q[2], { size: 9, color: 'rgba(255,255,255,.28)' }));
    [['nyc', 'lon'], ['lon', 'hkg'], ['nyc', 'hkg']].forEach(q => tube(WCITY[q[0]], WCITY[q[1]], '#f2f2f2', 6)); // the three that everything else hangs off
    WORLD.forEach(c => { if (c.up) tube(c, WCITY[c.up], home.includes(c.id) && home.includes(c.up) ? '#ffd300' : WCOL[hubOf(c)], c.tier <= 2 ? 4 : 3); });
    WORLD.forEach(c => {
      const r = [0, 11, 7.5, 5.5, 4.5, 4.5][c.tier], at = here.a === c.id && !here.b;
      station(c.x, c.y, r, true, c.id === 'pn' ? '#ffd300' : '#0c0f12'); if (c.tier === 1) disc(c.x, c.y, r - 5, '#0c0f12');
      if (at) disc(c.x, c.y, r + 5 + 2 * Math.sin(tm * 5), null, '#ffd300', 1.5);
      const right = c.x < 600 || c.tier === 1, lx = c.x + (right ? r + 5 : -r - 5); text(c.name, lx, c.y + 3.5, { align: right ? 'left' : 'right', size: c.tier === 1 ? 12 : c.tier === 2 ? 10 : 9, bold: c.tier <= 2 || c.id === 'pn', color: c.id === 'pn' ? '#ffd300' : '#f2f2f2' });
    });
    hud(() => { ctx.fillStyle = 'rgba(8,10,12,.8)'; ctx.fillRect(8, CH - 62, 180, 54); [['#f2f2f2', 'the three world cities'], ['#e32017', 'a city and the hub it answers to'], ['#ffd300', 'your line home']].forEach((q, i) => { ctx.fillStyle = q[0]; ctx.fillRect(16, CH - 53 + i * 15, 16, 4); text(q[1], 38, CH - 48 + i * 15, { align: 'left', size: 9 }); }); });
    header('The World · a network of cities, not countries · WASD rides a line to the next city: a suborbital hop');
  }

  // ───────────────── Altitude: one continuous zoom from the street to Te Moana ─────────────────
  // Each map has a height band. Descend and the camera closes in and follows you; push past the bottom over
  // somewhere with detail and you come down onto the next map; push past the top and you climb onto the one above.
  const ZMAX = { 2: 2.6, 3: 5, 4: 9, 5: 5.25, 6: 2.6 }, zoom = {}, zgoal = {}, CAMV = { city: 2, town: 2, region: 3, nz: 4, moana: 5, world: 6 };
  const K4 = 9.8, A4 = () => NP(175.61, -40.35); let fade = 0, hop = 0;
  const fit = p => ({ x: clamp(p.x, 10, CW - 10), y: clamp(p.y, 32, CH - 10) });
  function climbTo(v, p) { // where you come out on the next map up
    if (v === 1) { const h = D.city.find(n => n.home); return { x: h.x, y: h.y }; }
    if (v === 2) { const t = G.TOWN[S.place || 'pn'] || G.PN; return { x: t.x, y: t.y }; }
    if (v === 3) { const a = A4(); return { x: a.x + (p.x - G.PN.x) / K4, y: a.y + (p.y - G.PN.y) / K4 }; }
    if (v === 5) return { x: WCITY.pn.x, y: WCITY.pn.y };
    return PX(166 + (p.x - 215) / 24.5, -34 - (p.y - 6) / 32);
  }
  function descendTo(v, p) { // where you come out on the next map down; null when there is nothing mapped below you
    const h = D.city.find(n => n.home); let q;
    if (v === 2) return (S.place || 'pn') === 'pn' && Math.hypot(p.x - h.x, p.y - h.y) < 42 ? {} : null;
    if (v === 3) { const t = G.townsNow(S).find(t => Math.hypot(t.x - p.x, t.y - p.y) < 18); return t ? { place: t.id } : null; }
    if (v === 6) return ['pn', 'wlg', 'akl', 'ham'].some(id => Math.hypot(WCITY[id].x - p.x, WCITY[id].y - p.y) < 14) ? PX(175.6, -40.3) : null;
    if (v === 4) { const a = A4(); q = { x: G.PN.x + (p.x - a.x) * K4, y: G.PN.y + (p.y - a.y) * K4 }; }
    else q = NP(94 + p.x / 6.1, 24 - p.y / 6.1);
    return q.x >= 0 && q.x <= CW && q.y >= 0 && q.y <= CH ? q : null;
  }
  const BELOW = ['', '', 'Come down over your yard to reach your street.', 'Come down over a town to drive its streets.', 'Come down over the Manawatū.', 'Come down over Aotearoa.', 'Come down over a New Zealand city.'];
  function zoomBy(f) { // f > 1 descends, f < 1 climbs
    if (!S || mode || modalUp()) return; const sc = screen(), v = sc === 'home' ? 1 : CAMV[sc]; if (!v) return;
    const max = ZMAX[v] || 1; let g = (zgoal[v] || 1) * f;
    if (g < 0.82 && hop <= 0) {
      if (v < 5 ? v < S.act : v === 5 && G.worldOpen(S)) {
        const q = climbTo(v, v > 1 ? whereYou(v) : null); G.setView(S, v + 1); Object.assign(whereYou(v + 1), fit(q)); arrive(v + 1, v === 3 ? false : v + 1 === 3 && whereYou(3).m === 'air');
        zgoal[v + 1] = ZMAX[v + 1]; zoom[v + 1] = ZMAX[v + 1] * 1.3; zgoal[v] = 1; fade = 1; hop = 0.7; return full();
      }
      if (v < 6) say(v === 5 ? 'The world opens once you have a platform in the stratosphere.' : 'You cannot get that high yet.');
    }
    if (g > max * 1.22 && hop <= 0 && v > 1) {
      const q = descendTo(v, whereYou(v));
      if (q) {
        G.setView(S, v - 1);
        if (v === 3) { S.place = q.place; delete S.at[2]; whereYou(2); } else if (v > 3) { Object.assign(whereYou(v - 1), fit(q)); arrive(v - 1, v - 1 === 3 && G.platform(S) >= 2); }
        zgoal[v - 1] = zoom[v - 1] = 1; zgoal[v] = max; fade = 1; hop = 0.7; return full();
      }
      say(v === 2 && (S.place || 'pn') !== 'pn' ? 'This is as low as the map goes here.' : BELOW[v]); g = max;
    }
    zgoal[v] = clamp(g, 0.78, max * 1.28);
  }
  function keyZoom(dt) { const d = (keys.q ? 1 : 0) - (keys.e ? 1 : 0); if (d) zoomBy(Math.exp(d * dt * 1.5)); if (hop > 0) hop -= dt; }
  function stepCam(dt, v) {
    const max = ZMAX[v]; let g = zgoal[v] || 1;
    if (g < 1) g = zgoal[v] = Math.min(1, g + dt * 0.2); else if (g > max) g = zgoal[v] = Math.max(max, g - dt * 0.2 * max); // a push past the edge that was not enough relaxes
    const z = zoom[v] = (zoom[v] || 1) + (clamp(g, 1, max) - (zoom[v] || 1)) * Math.min(1, dt * 7), zc = Math.max(1, z);
    const p = whereYou(v), tx = clamp(p.x, CW / 2 / zc, CW - CW / 2 / zc), ty = clamp(p.y, CH / 2 / zc, CH - CH / 2 / zc);
    if (cam.v !== v) { cam.v = v; cam.x = tx; cam.y = ty; } else { const f = Math.min(1, dt * 9); cam.x += (tx - cam.x) * f; cam.y += (ty - cam.y) * f; }
    cam.z = zc;
  }
  function mapMouse() { const c = S && !mode && CAMV[screen()] === cam.v; mouse.x = c ? cam.x + (mouse.sx - CW / 2) / cam.z : mouse.sx; mouse.y = c ? cam.y + (mouse.sy - CH / 2) / cam.z : mouse.sy; }
  function drawAlt(v) { // altimeter: where you are between the street and the top of the sky you have reached
    if (v === 6) return; const x = v === 1 ? CW - 82 : 12, y0 = CH - 26, hgt = 112, alt = v === 1 ? 1 : v - Math.log(clamp(zoom[v] || 1, 1, ZMAX[v])) / Math.log(ZMAX[v]), yy = a => y0 - (a - 1) / 4 * hgt;
    ctx.fillStyle = 'rgba(8,18,20,.7)'; ctx.fillRect(x - 6, y0 - hgt - 22, 86, hgt + 44);
    ctx.fillStyle = '#24464a'; ctx.fillRect(x, y0 - hgt, 4, hgt); ctx.fillStyle = '#6fd0e8'; ctx.fillRect(x, yy(Math.min(5, S.act)), 4, yy(1) - yy(Math.min(5, S.act)));
    ['street', 'city', 'region', 'Aotearoa', 'Te Moana'].forEach((n, i) => { ctx.fillStyle = i < S.act ? '#cfe3d6' : '#4f6468'; ctx.fillRect(x - 2, yy(i + 1) - 0.5, 8, 1); text(n, x + 11, yy(i + 1) + 3, { align: 'left', size: 8.5, color: i < S.act ? (i + 1 === v ? '#e6b84a' : '#cfe3d6') : '#4f6468' }); });
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - 5, yy(alt) - 4); ctx.lineTo(x + 2, yy(alt)); ctx.lineTo(x - 5, yy(alt) + 4); ctx.fill();
    text('Q down · E up', x - 2, y0 + 15, { align: 'left', size: 8.5, color: '#8aa69d' }); text('or scroll', x - 2, y0 - hgt - 10, { align: 'left', size: 8.5, color: '#8aa69d' });
  }
  function flown(v, dt, draw) { // a map seen from your vehicle
    stepYou(dt, v); if (mode) return; keyZoom(dt); if (S.view !== v) return; stepCam(dt, v); mapMouse();
    ctx.fillStyle = '#0b2a36'; ctx.fillRect(0, 0, CW, CH);
    ctx.save(); ctx.translate(CW / 2, CH / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y); cam.on = true; tk = Math.pow(cam.z, -0.75);
    try { draw(); drawYou(v); } finally { ctx.restore(); cam.on = false; tk = 1; }
    hudQ.splice(0).forEach(f => f()); drawAlt(v);
  }

  // ───────────────── frame loop, input, side panel ─────────────────
  function frame(t) {
    if (!cv || !cv.isConnected || !wants(S)) { raf = 0; return; }
    const dt = Math.min(0.1, (t - last) / 1000 || 0); last = t;
    render(dt);
    raf = requestAnimationFrame(frame);
  }
  function render(dt) {
    touchSync();
    if (mode && /^(build|tutor|mill|dig|pour)$/.test(mode.type) && !mode.done && S.pendingBuild === null) mode = null;
    if (!mode && !modalUp() && S.mission.length && !S.over) { // things that come to you, whether you were ready or not
      const mi = S.mission.findIndex(x => !G.located(x)), ms = mi < 0 ? '' : S.mission.splice(mi, 1)[0];
      if (ms === 'escort') { startEscort(); say('Your rotation in Papua New Guinea: a convoy needs escorting.'); }
      else if (ms === 'spar') { if (!S.trained && S.sparWins < 5) { startSpar(); say('Someone has turned up at the gym wanting a round.'); } }
      else if (ms.startsWith('fight:') && G.gst(S, ms.slice(6)).stance === 'war') { startSpar(ms.slice(6)); say('They have come looking for you.'); }
      if (mode) full();
    }
    const sc = screen();
    if (sc === 'escort') { if (!modalUp()) stepEscort(dt); drawEscort(); }
    else if (sc === 'boat') { if (!modalUp()) stepBoat(dt); drawBoat(); }
    else if (sc === 'field') { if (!modalUp()) stepField(dt); drawField(); }
    else if (sc === 'site') { if (!modalUp()) stepSite(dt); drawSite(); }
    else if (sc === 'gun') { if (!modalUp()) stepGun(dt); drawGun(); }
    else if (sc === 'mill') { if (!modalUp()) stepMill(dt); drawMill(); }
    else if (sc === 'dig') { if (!modalUp()) stepDig(dt); drawDig(); }
    else if (sc === 'pour') { if (!modalUp()) stepPour(dt); drawPour(); }
    else if (sc === 'bench') { if (!modalUp()) stepBench(dt); drawBench(); }
    else if (sc === 'tutor') { if (!modalUp()) stepTutor(dt); drawTutor(); }
    else if (sc === 'corridor') { if (!modalUp()) stepCorridor(dt); drawCorridor(); }
    else if (sc === 'watch') { if (!modalUp()) stepWatch(dt); drawSea(); }
    else if (sc === 'moana') flown(5, dt, drawSea);
    else if (sc === 'world') flown(6, dt, drawWorld);
    else if (sc === 'nz') flown(4, dt, drawNZ);
    else if (sc === 'spar') { if (!modalUp()) stepSpar(dt); drawSpar(); }
    else if (sc === 'patrol') { if (!modalUp()) stepPatrol(dt); drawPatrol(); }
    else if (sc === 'build') drawBuild();
    else if (sc === 'run' || sc === 'home') { stepRun(dt); if (!mode) { drawStreet(dt); if (sc === 'home' && S.act > 1) { keyZoom(dt); drawAlt(1); } } }
    else if (sc === 'city') flown(2, dt, () => drawCity(dt)); else if (sc === 'town') flown(2, dt, drawTown); else flown(3, dt, () => drawRegion(dt));
    if (fade > 0) { ctx.fillStyle = `rgba(6,14,18,${fade * 0.75})`; ctx.fillRect(0, 0, CW, CH); fade -= dt * 3; }
    if (mode && mode.done) { ctx.fillStyle = 'rgba(8,18,20,.88)'; ctx.fillRect(90, 170, 540, 90); text(mode.done, CW / 2, 208, { bold: true, size: 13, color: '#e6b84a' }); text('Click or press Enter to carry on', CW / 2, 236, { color: '#8aa69d' }); }
    if (toast.t > 0) { toast.t -= dt; ctx.font = 'bold 13px system-ui'; const w = ctx.measureText(toast.m).width + 24; ctx.fillStyle = 'rgba(8,18,20,.9)'; ctx.fillRect(CW / 2 - w / 2, 34, w, 26); text(toast.m, CW / 2, 52, { bold: true, size: 13, color: '#e6b84a' }); }
  }
  function endMode() { if (mode && mode.done) { const after = mode.after; mode = null; full(); if (after) after(); return true; } return false; }
  // The week ends on the strip: once you lead patrols, Saturday night comes whether you feel like it or not.
  function endSeason(state, done, renderCb) {
    S = state; if (renderCb) full = renderCb;
    if (mode) return;
    if (S.over || S.pending.length) return done();
    if (G.patrolDue(S)) { startPatrol(); mode.after = done; full(); if (cv) cv.scrollIntoView({ block: 'nearest' }); say('Out of daylight. Saturday night on the strip.'); }
    else if (G.watchDue(S)) { S.view = 5; startWatch(done); full(); if (cv) cv.scrollIntoView({ block: 'nearest' }); say('Contacts coming south. Marked ports are where they are headed.'); }
    else done();
  }
  window.addEventListener('keydown', e => {
    if (!S || !wants(S) || modalUp()) return;
    if (e.key === 'Enter' && mode) { e.stopImmediatePropagation(); endMode(); return; }
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (/^(Arrow|[wasdjkqelt ]$)/.test(k)) { keys[k] = true; if (k.startsWith('Arrow') || (k === ' ' && mode)) e.preventDefault(); }
    if (mode && mode.type === 'field' && !e.repeat && /^[fgjkl123]$/.test(k)) fieldKey(k);
    if (mode && mode.type === 'site' && !e.repeat && /^[123]$/.test(k)) siteKey(k);
    if (mode && mode.type === 'gun' && !e.repeat && /^[jklrad]$/.test(k)) gunKey(k);
    if (mode && mode.type === 'mill' && !e.repeat && !mode.done) { if (e.key === 'Enter' || e.key === 'Backspace' || k === ' ') { e.preventDefault(); e.stopImmediatePropagation(); millKey(e.key === ' ' ? ' ' : e.key); } else if (/^[123awd]$/.test(k)) millKey(k); }
    if (mode && mode.type === 'dig' && /^[adjk]$/.test(k)) digKey(k);
    if (mode && mode.type === 'pour' && !e.repeat && /^[123tad]$/.test(k)) pourKey(k);
    if (mode && mode.type === 'bench' && !e.repeat && /^[jkl ]$/.test(k)) benchKey(k);
    if (!mode && k === 'v' && !e.repeat) toggleAir();
    if (mode && mode.type === 'boat' && !e.repeat && k === 'f') { mode.form = 1 - (mode.form || 0); say(mode.form ? 'Fleet: line abreast' : 'Fleet: wedge'); }
    if (mode && mode.type === 'spar' && !mode.done && !e.repeat) { if (k === 'j' || k === 'z') attack(mode.a, 'punch'); if (k === 'k' || k === 'x') attack(mode.a, 'kick'); if (k === 'l' || k === 'c') { const a = mode.a; if (a.guard && a.st === 'idle') { a.grap = 0.6; a.guard = false; } else attack(a, 'shove'); } }
  }, true);
  window.addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; });
  window.addEventListener('pointerup', () => { mouse.down = false; if (!S) return; if (mode && mode.type === 'build') buildUp(); else if (mode && mode.type === 'bench') benchUp(); else if (!mode && screen() === 'region') releaseConvoy(); });
  function pos(e) { const r = cv.getBoundingClientRect(); mouse.sx = (e.clientX - r.left) * CW / r.width; mouse.sy = (e.clientY - r.top) * CH / r.height; mapMouse(); if (mode && mode.type === 'build') buildMove(); else if (mode && mode.type === 'bench') benchMove(); }
  function onDown(e) {
    pos(e); mouse.down = true;
    if (endMode()) return;
    const s = screen();
    if (s === 'build') buildDown();
    else if (s === 'gun') gunKey('j');
    else if (s === 'bench') benchDown();
    else if (s === 'tutor') { for (let i = 0; i < 3; i++) if (mouse.x > 210 && mouse.x < 610 && mouse.y > 146 + i * 50 && mouse.y < 188 + i * 50) tutorPick(i); }
    else if (s === 'escort') shootEscort();
    else if (s === 'boat') shootBoat();
    else if (s === 'nz') nzClick();
    else if (s === 'watch' || s === 'moana') { clickSea(); if (s === 'moana') full(); }
    else if (s === 'run') { const H = hood(siteNow()), near = (a, v) => a.reduce((b, q, i) => (Math.abs(q - v) < Math.abs(a[b] - v) ? i : b), 0); goal = { x: near(H.cx, mouse.x), y: near(H.cy, mouse.y) }; }
    else if (s === 'city') clickCity(mouse.x, mouse.y);
    else if (s === 'region') { if (S.launches > 0) charge = 0; else say('No convoys left this season.'); }
  }

  const STANCE = { peace: 'peace, as equals', tolerate: 'keeping apart', tribute: 'paying tribute', war: 'at war', alliance: 'in business together', broken: 'broken' };
  function afterWork() {
    let h = '';
    if (S.done.gym) h += S.sparWins >= 5 ? `<h2>Training</h2><p>The gym is run by the people you trained. Your sparring days are done.</p>` : `<h2>Training</h2><p>Sparring wins: <b>${S.sparWins}</b> (1 to lead patrols, 3 for the security arm, 5 for the reserves, and then you hand the gym on). Walk into a <b style="color:#c058d8">GYM</b> on any job run to train; sometimes a round finds you.</p>`;
    if (S.done.patrols) h += S.patrolWins >= 3 && S.act > 2 ? `<p>Your security arm runs the strip patrols now.</p>` : `<p>Clean patrols: <b>${S.patrolWins}</b> (3 before you can run for council; after that you are only called out now and then).</p>`;
    if (G.boatTier(S)) h += `<h2>At sea</h2><p>Sea patrols: <b>${S.boatWins}</b>. ${['', 'Workboat in the Bight', 'Patrol ship in the EEZ', 'Straits patrol'][G.boatTier(S)]}: ${Math.min(3, S.boat[G.boatTier(S)] || 0)}/3 before your skippers take it over.</p>`;
    if (S.done.png_sec) h += `<p>PNG highway escorts: <b>${Math.min(3, S.escorts)}</b>/3${S.escorts >= 3 ? ' · your officers lead them now' : ''}.</p>`;
    if (S.done.corridor) h += `<p>Corridor convoys driven: <b>${S.corridorLegs}</b>/3.</p>`;
    const met = D.gangs.filter(g => S.gang[g.id] && S.gang[g.id].met);
    if (met.length || S.heat > 0) {
      h += `<h2>Street politics</h2><p>Police heat: <b style="color:${S.heat >= 35 ? '#f0a898' : 'inherit'}">${Math.round(S.heat)}</b>${S.bid === 'member' ? ' · BID member' : S.bid === 'exposed' ? ' · BID exposed' : ''}</p>`;
      met.forEach(g => {
        const st = S.gang[g.id];
        h += `<details><summary><b style="color:${g.col}">${g.name}</b> · ${STANCE[st.stance] || 'undecided'}${st.stance === 'war' ? ` (${st.wins}/3)` : ''}</summary>`;
        if (st.stance !== 'broken') {
          h += G.stanceOptions(S, g.id).filter(o => o.id !== st.stance).map(o => `<button data-stance="${g.id}:${o.id}" ${o.ok ? '' : 'disabled'} title="${o.ok ? o.note : o.why}">${o.t}</button>`).join('');
          if (st.stance !== 'war') h += `<button data-whanau="${g.id}" ${S.cash >= G.whanauCost(S) ? '' : 'disabled'}>Work with their whānau · ${money(G.whanauCost(S))}</button>`;
          else h += `<p style="margin:6px 0 2px">Bring a weapon:</p>` + Object.keys(G.WEAPONS).map(w => `<button data-gun="${g.id}:${w}" style="${G.WEAPONS[w].legal ? '' : 'border-color:#d9634c;color:#f0a898'}" title="+${G.WEAPONS[w].heat} heat">${G.WEAPONS[w].name}${G.WEAPONS[w].legal ? ' (legal)' : ''}</button>`).join('');
        }
        h += `</details>`;
      });
    }
    return h;
  }
  const canSend = () => (S.view === 3 && aboard()) || (S.view === 5 && S.mounts.length > 0 && S.at && S.at[5] && (() => { const q = PX(...G.MOUNT[S.mounts.length - 1].at); return Math.hypot(q.x - S.at[5].x, q.y - S.at[5].y) < 26; })());
  function offshoreHTML() {
    if (!S.done.himatangi) return ''; const p3 = S.at && S.at[3], atPN = S.view === 3 && p3 && p3.m === 'road' && p3.a === 'pn' && !p3.b, n = S.barge.length, i = S.mounts.length, nm = id => G.BARGE.find(b => b[0] === id)[1].toLowerCase();
    let h = `<h2>The barge</h2><p>Moored in the Bight, outside anyone's harbour. Modules: <b>${n}/${G.BARGE.length}</b>${n ? ' · ' + S.barge.map(nm).join(', ') : ''}.</p>`;
    if (S.carry) h += `<p style="color:#e6b84a">On the truck: the ${nm(S.carry)}. Drive to the Himatangi ramp, push west to launch, and take it out to the barge.</p>`;
    else if (n < G.BARGE.length) h += `<button data-bload="1" ${atPN && S.cash >= G.bargeCost(S) ? '' : 'disabled'}>Load the ${G.BARGE[n][1].toLowerCase()} · ${money(G.bargeCost(S))}</button>` + (atPN ? '' : `<p>Modules come out of the Palmerston North shops. Be there, on the ground, to load one.</p>`);
    if (n < 3) h += `<p>Three modules make the logistics line to the coast. The third is the UUV bay.</p>`;
    h += `<h2>The seamount chain</h2>`;
    if (i >= G.MOUNT.length) return h + `<p>Seven sites, from the Three Kings to New Britain. It reaches Papua New Guinea.</p>`;
    const m = G.MOUNT[i], why = G.mountWhy(S), here = canSend(), r = m.cover ? Math.round(S.rel[m.cover]) : 0;
    h += `<p><b>${i}/${G.MOUNT.length}</b> set down. Next: <b>${m.name}</b>. ${!m.cover ? 'Home waters.' : r >= 40 ? `You already work with ${D.partners[m.cover]} (${r}): aid, industry, shared research. Nobody asks why you are in those waters.` : `Near ${D.partners[m.cover]}, where you have little standing (${r} of 40). Setting down there will be noticed by the great powers.`}</p>`;
    for (const k in G.MKIND) h += `<button data-mount="${k}" ${why || !here ? 'disabled' : ''}>${G.MKIND[k]} · ${money(G.mountCost(S, i))}</button>`;
    h += `<p>${why || (here ? 'UUVs carry it out submerged, one site a season.' : i ? 'Send the UUVs from the barge, or from over the last site on Te Moana.' : 'Send the UUVs from the barge: go aboard.')}</p><p>Stockpiles add security, relays technology, sensor posts widen what the watch can hear.</p>`;
    return h;
  }
  function sideHTML() {
    const s = screen(); let h = '';
    if (s === 'run' || s === 'build') {
      h += `<h2>${G.siteName(S.runSite)}</h2><p>Each move costs 1 daylight; jobs cost 2–5. Reach the most value before dark.</p>`;
      h += `<p>` + Object.keys(KLET).filter(k => S.jobs.some(j => j.kind === k)).map(k => `<b style="color:${KCOL[k]}">${KLET[k]}</b> ${G.KIND[k].name.toLowerCase()}`).join(' · ') + `</p>`;
      ['mill', 'dig', 'pour'].forEach(sc => { if (S.mastered['s:' + sc]) h += `<p><button data-auto="h:${sc}">${{ mill: 'Sawmill', dig: 'Excavator', pour: 'Concrete pours' }[sc]}: ${S.auto && S.auto['h:' + sc] ? 'you run it yourself. Hand it back to the foreman' : 'the foreman runs it. Run it yourself'}</button></p>`; });
      if (S.done.tutoring) h += `<p>Tutoring level <b>${G.tutorLevel(S)}</b> of 5. <button data-auto="tutor">${S.auto && S.auto.tutor ? 'Your tutors take the sessions (flat pay, nothing learned). Take them back' : 'You take the sessions yourself. Hand them to your tutors'}</button></p>`;
      h += `<p style="color:#e6b84a">Every job you do yourself is a doorstep. Households met: <b>${S.met}</b> · on the Kaha Tahi books: <b>${S.members}</b> (${money(S.members * 0.03 * G.cashMult(S))} a season, each paying what they can afford).</p>`;
      h += `<p>Jobs ringed in white (tutoring, repairs, property works, road works) are skilled work that waits for you. Each kind of property job is yours once: build one and the crew builds the rest, and you move on to the next size up. With the right machine from your shop the job becomes running that machine: timber jobs are milled on your sawmill, roads and walls are dug with your excavator, and a driveway is a concrete pour. What gets built stays on the street, as true or as crooked as you set it out.${S.done.fences ? ` Property works built: <b>${S.propWorks}</b> · road jobs: <b>${S.roadWorks}</b>${S.done.contractor ? '' : ' (4 and 2 to go contracting)'}.` : ''} Your crew handles the rest, as far as their legs carry them.</p>`;
      if (S.runSite === 'home' && S.done.crew2) h += `<p style="color:#e6b84a">A foreman runs the lawn round now (${money(G.roundValue(S) * G.cashMult(S))} a season, without you). What is left here is the contract work, and other firms want it.</p>`;
      h += `<p>${S.crew.length ? `<b>${S.crew.length}</b> of your crew (gold) are working here.` : S.act === 1 ? 'Hire a worker and they will run the circuit with you.' : 'None of your crews are here: you are on your own.'}${S.rivals.length ? ` <span style="color:#f0a898"><b>${S.rivals.length}</b> rival worker${S.rivals.length > 1 ? 's' : ''} (red) will take what they reach first.</span>` : ''}</p>`;
      h += `<p>${S.done.partner ? 'Your mechanic services the mower nightly; mid-day, get it back to base.' : 'Lawns wear the mower out. The SHOP (top right) fixes it for $200 until you have a mechanic.'}</p>`;
      if (S.act > 1) h += `<button data-finish="1" class="on">Finish the day here</button><p>Out-work the rivals and do at least half the jobs to tip this place your way.</p>`;
    } else if (s === 'home') {
      h += `<h2>Your street</h2><p>Where it started. Your crews run this circuit every season now.</p>`;
      if (S.act > 1) h += `<button data-enter="home" ${G.canEnter(S, 'home') ? '' : 'disabled'}>Work a day here yourself</button><p>You have one working day a season to spend in person, here or in any suburb or town.</p>`;
    } else if (s === 'city') {
      h += `<h2>The network</h2><p>Crews to send: <b>${S.dispatch}</b>. Crews you send work a suburb on autopilot. Go in yourself (once a season) to tip a contested one.</p>`;
      const n = sel && G.NODE[sel];
      if (n && !n.home) {
        const conn = G.connected(S, n.id);
        h += `<h2>${n.name}</h2><p>${conn ? 'Connected.' : `${S.net[n.id] || 0} of ${G.needFor(S, n.id)} to connect.`}${S.rivalNet[n.id] ? ' <span style="color:#f0a898">The franchise is working here.</span>' : ''} Best machine: ${D.machines[n.aff].name}.</p>`;
        if (!conn) h += `<button data-send="${n.id}" ${G.reachable(S, n.id) && S.dispatch > 0 ? '' : 'disabled'}>Send a crew</button>`;
        h += `<button data-enter="city:${n.id}" ${G.canEnter(S, 'city:' + n.id) ? '' : 'disabled'}>Go in and work it yourself</button>`;
      }
      h += `<h2>Workshop</h2>`;
      if (!S.done.engshop) h += `<p>Build the engineering shop to turn scrap into machines.</p><p>Scrap: <b>${S.scrap}</b></p>`;
      else {
        h += `<p>Scrap: <b>${S.scrap}</b> · built so far: <b>${S.built}</b>${S.done.gvcs ? '' : ' (3 needed for the toolkit)'}</p>`;
        if (S.build) h += `<p style="color:#e6b84a">On the bench: ${D.machines[S.build.type].name} (${S.build.left} season${S.build.left === 1 ? '' : 's'})</p>`;
        h += `<p>Workshop level <b>${G.shopLevel(S)}</b> of 5${G.shopLevel(S) < 5 ? ` · ${Math.round((3 - (S.shopXp % 3)) * 10) / 10} to the next` : ''}. By hand it is finished today and you learn from it (one a season). Left to the shop it takes ${S.done.gvcs ? 'a season' : 'two seasons'} and teaches you nothing.</p>`;
        for (const k in D.machines) { const m = D.machines[k], c = G.machineCost(S, k); h += `<p style="margin-bottom:2px"><b>${m.name}</b> [${MLET[k]}] · ${c} scrap <small>· ${m.use}</small></p><button data-bench="${k}" ${S.benched || S.scrap < c ? 'disabled' : ''}>Build it yourself</button><button data-build="${k}" ${S.build || S.scrap < c ? 'disabled' : ''}>Leave it to the shop</button>`; }
        const have = Object.keys(S.pool).filter(k => S.pool[k] > 0);
        if (have.length) h += `<h2>In the yard</h2>` + have.map(k => `<button data-place="${k}" class="${selMachine === k ? 'on' : ''}">Place ${D.machines[k].name} ×${S.pool[k]}</button>`).join('') + `<p>Doubles a suburb's yield where it fits, +30% elsewhere. Towns need them too.</p>`;
      }
    } else if (s === 'region') {
      h += `<h2>Convoys</h2><p>Left this season: <b>${S.launches}</b>. Cost climbs steeply past full charge; a convoy that stops outside a ring comes home empty.</p><p>Drive the highways with WASD${G.platform(S) >= 2 ? '; V lifts off and sets down' : ''}. Descend (Q or scroll) over any town to drive its streets.</p>` + offshoreHTML() + `<h2>Towns</h2>`;
      G.townsNow(S).filter(t => !t.home).forEach(t => {
        const est = G.established(S, t.id), d = S.townDev[t.id] || {}, got = S.towns[t.id] || 0;
        if (!est && !got) return;
        h += `<p><b>${t.name}</b> ${est ? '· established' : `· ${got}/${G.townNeed(S, t.id)}`}</p>`;
        if (!est) h += `<button data-enter="town:${t.id}" ${G.canEnter(S, 'town:' + t.id) ? '' : 'disabled'}>Go there and work</button>`;
        else if (!d.shop) h += `<button data-dev="${t.id}:shop" ${S.cash >= G.devCost(S, 'shop') ? '' : 'disabled'}>Machine shop · ${money(G.devCost(S, 'shop'))}</button>`;
        else if (!d.res) h += `<button data-dev="${t.id}:res" ${S.cash >= G.devCost(S, 'res') && S.pool[t.res.machine] > 0 ? '' : 'disabled'}>Work the ${t.res.name} · ${money(G.devCost(S, 'res'))} + a ${D.machines[t.res.machine].name}</button>`;
        else h += `<p style="color:#e6b84a">${t.res.name}: worked and processed locally.</p>`;
      });
      if (!Object.keys(S.towns).length) h += `<p>Land a convoy to open a town. Then you can go there, and build it up once it is established.</p>`;
    }
    else if (s === 'town') {
      const t = G.TOWN[S.place], est = G.established(S, t.id), d = S.townDev[t.id] || {}, got = S.towns[t.id] || 0;
      h += `<h2>${t.name}</h2><p>${est ? 'Established.' : got ? `${got} of ${G.townNeed(S, t.id)} convoys landed.` : 'No convoy has landed here yet.'} Known for its ${t.res.name}.</p>`;
      if (!est) h += `<button data-enter="town:${t.id}" ${G.canEnter(S, 'town:' + t.id) ? '' : 'disabled'}>Work a day here</button>`;
      else if (!d.shop) h += `<button data-dev="${t.id}:shop" ${S.cash >= G.devCost(S, 'shop') ? '' : 'disabled'}>Machine shop · ${money(G.devCost(S, 'shop'))}</button>`;
      else if (!d.res) h += `<button data-dev="${t.id}:res" ${S.cash >= G.devCost(S, 'res') && S.pool[t.res.machine] > 0 ? '' : 'disabled'}>Work the ${t.res.name} · ${money(G.devCost(S, 'res'))} + a ${D.machines[t.res.machine].name}</button>`;
      else h += `<p style="color:#e6b84a">${t.res.name}: worked and processed locally.</p>`;
      h += `<p>WASD drives the streets. Climb (E or scroll) to get back on the highway.</p>`;
    }
    else if (s === 'nz') {
      const n = G.NZN[nzSel] || G.NZN.pn, on = G.nzDist(S, 'pn'), con = on[n.id] !== undefined, dn = G.nzDist(S, n.id), ch = G.nzChains(S), y = G.nzYield(S), no = S.nzWorks <= 0;
      h += `<h2>The works map</h2><p>Works crews left this season: <b>${S.nzWorks}</b>. Every link, plant, hub stage and electrified section takes one crew and cash.</p>`;
      h += `<p>The map earns <b>${money(y.cash)}</b>, ${y.mana >= 0 ? '+' : ''}${Math.round(y.mana * 10) / 10} mana and +${y.voters} supporters a season.</p>`;
      h += `<button data-nzhub="1" ${S.nz.hub >= 3 || no || S.cash < G.nzCost(S, 'hub') ? 'disabled' : ''}>${S.nz.hub ? 'Extend' : 'Build'} the Palmerston North hub (${S.nz.hub}/3) · ${money(G.nzCost(S, 'hub'))}</button><p>Stage 1 lets you build plants. Each stage adds 15% to every chain; from stage 2 a city plant takes two sources.</p>`;
      h += `<h2>${n.name}</h2><p>${n.kind !== 'city' && (S.nz.fac[n.id] || []).length ? ['Plant just opened · ', 'Stirring · ', 'Growing · ', 'Revived · '][G.nzRev(S, n.id)] : ''}${NKIND[n.kind]}${n.res ? ` · <b style="color:${D.nz.goods[n.res].col}">${D.nz.goods[n.res].name}</b>` : ''} · ${con ? 'on your network' : 'not connected yet'}</p>`;
      D.nz.links.filter(l => l[0] === n.id || l[1] === n.id).forEach(l => {
        const o = l[0] === n.id ? l[1] : l[0], lv = S.nz.links[G.lkey(n.id, o)];
        if (!lv) h += `<button data-nzlink="${n.id}:${o}" ${no || (!con && on[o] === undefined) || S.cash < G.nzCost(S, l[2]) ? 'disabled' : ''}>${l[2] === 'rail' ? 'Main trunk rail' : l[2] === 'ferry' ? 'Ferry' : 'Road'} to ${G.NZN[o].name} · ${money(G.nzCost(S, l[2]))}</button>`;
        else if (l[2] === 'rail' && lv === 1) h += `<button data-nzwire="${n.id}:${o}" ${no || !S.done.grid || S.cash < G.nzCost(S, 'wire') ? 'disabled' : ''} title="${S.done.grid ? 'Goods ride an electrified section for free' : 'Nationalise the grid first'}">Electrify to ${G.NZN[o].name} · ${money(G.nzCost(S, 'wire'))}${S.done.grid ? '' : ' (needs the grid)'}</button>`;
      });
      if (con) {
        const opts = Object.keys(D.nz.goods).filter(g => !(S.nz.fac[n.id] || []).includes(g)).map(g => ({ g, src: D.nz.nodes.filter(r => r.res === g && dn[r.id] !== undefined && !ch.some(c => c.res === r.id && c.at && (n.kind === 'city' || G.NZN[c.at].kind !== 'city'))).sort((a, b) => dn[a.id] - dn[b.id])[0] })).filter(o => o.src).map(o => Object.assign(o, { from: (ch.find(c => c.res === o.src.id && c.at) || {}).at }));
        opts.forEach(o => { h += `<button data-nzplant="${n.id}:${o.g}" ${no || !S.nz.hub || S.cash < G.nzCost(S, 'plant') || (n.kind === 'iwi' && S.influence < 2) ? 'disabled' : ''}>${D.nz.goods[o.g].plant} here · ${money(G.nzCost(S, 'plant'))}${n.kind === 'iwi' ? ' + 2 influence' : ''}<br><small>${D.nz.goods[o.g].name} from ${o.src.id === n.id ? 'right here' : o.src.name + ', ' + dn[o.src.id] + ' hop' + (dn[o.src.id] === 1 ? '' : 's')}${o.from ? ' · taken back from the plant at ' + G.NZN[o.from].name : ''}</small></button>`; });
        if (!opts.length && !(S.nz.fac[n.id] || []).length) h += `<p>Nothing unprocessed can reach here yet. Connect a resource first.</p>`;
        if (!S.nz.hub && opts.length) h += `<p>Plants need the hub's first stage.</p>`;
        if ((S.nz.fac[n.id] || []).length) { const k = (S.nz.line || {})[n.id] || 0; h += `<button data-nzline="${n.id}" ${k >= G.NZLINE || no || S.cash < G.nzCost(S, 'line') ? 'disabled' : ''}>Extend the shed line (${k}/${G.NZLINE}) · ${money(G.nzCost(S, 'line'))}</button><p>Arch sheds added a module at a time, with a rail inside and machines working along it: out toward the ${n.kind === 'city' ? 'farms and forests one way, into the industrial precinct the other' : 'paddocks and forest'}. Food lines alternate greenhouse sections. Roads are left alone: the line stops, and a rail reaches across when nothing is coming. Each module adds 5% to everything processed here. Zoom in to see it.</p>`; }
      }
      ch.filter(c => c.at === n.id || c.res === n.id).forEach(c => { h += `<p style="color:#e6b84a">${D.nz.goods[c.good].name} from ${G.NZN[c.res].name}: ${c.at ? `${D.nz.goods[c.good].plant.toLowerCase()} at ${G.NZN[c.at].name}, ${money(c.cash)}${c.mana ? `, ${c.mana > 0 ? '+' : ''}${c.mana} mana` : ''}` : `trucked out raw, ${money(c.cash)}`}</p>`; });
      h += `<p>Each hop a good travels costs 10% of its value; electrified rail is free. Processing a Māori-land resource somewhere else costs 0.5 mana a season; a partnership plant on the land earns it instead. A plant in a rural district or on Māori land revives the place over three years (the lit houses around it): each step adds 12% to its chain, and more supporters or mana. Regions counted as revived (growing or better, two years after the plant opens): <b>${S.revived}</b>; the honest-broker policy needs 3. A plant out in a district always has first call on that district's goods, even if a city plant was using them. Two partnership plants make the state–iwi enterprises; the whole trunk under the wire is its own milestone.</p>`;
    }
    else if (s === 'world') {
      const p = S.at && S.at[6], c = p && !p.b ? WCITY[p.a] : null;
      h += `<h2>The World</h2><p>Seen from high enough, the world is not countries. It is a ladder of cities: three at the top, the cities that answer to them, and the ones that answer to those. Palmerston North hangs off Wellington, which hangs off Auckland, which hangs off Sydney, which hangs off Hong Kong.</p>`;
      if (c) { const kids = WORLD.filter(q => q.up === c.id); h += `<h2>${c.name}</h2><p>${['', 'One of the three world cities.', 'A second-tier city.', 'A third-tier city.', 'A regional city.', 'Home.'][c.tier]}${c.up ? ` Answers to <b>${WCITY[c.up].name}</b>.` : ' Answers to nobody.'}${kids.length ? ` Below it: ${kids.map(q => q.name).join(', ')}.` : ''}</p>`; } else h += `<p>In flight.</p>`;
      h += `<p>WASD rides a line to the next city. From your platform a suborbital hop reaches anywhere in under an hour. For now this level is for travelling and seeing where you sit; trade and politics between cities are not built yet.</p><p>Descend (Q) over a New Zealand city to come home.</p>`;
    }
    else if (s === 'moana' || s === 'watch') {
      if (s === 'moana') h += offshoreHTML();
      const us = G.fleet(S), n = t => us.filter(u => u.type === t).length;
      h += `<h2>The watch</h2><p>Beijing (<b style="color:${POW.cn}">red</b>) and Washington (<b style="color:${POW.us}">blue</b>) both send ships and submarines south looking for a port to lease. Hold one in your sensors long enough and every member sees the same track; it turns back. Miss it and it becomes a foothold. Six and you are encircled.</p>`;
      h += `<p>Footholds: <b>${S.footholds}</b>/6 · exposed so far: Beijing ${S.exposed.cn}, Washington ${S.exposed.us}. Exposing only one side pulls your lean toward the other.</p>`;
      h += `<h2>What you can place</h2><p><b style="color:#fff">Platform</b> ×${n('air')}: wide radar, ships only.<br><b style="color:#e6b84a">Patrol ships</b> ×${n('opv')}: fast; good on ships, poor on submarines.<br><b style="color:#6fd0e8">UUV pickets</b> ×${n('uuv')}: slow; they hear submarines.</p>`;
      h += `<p>Dashed gold ring: sees ships. Blue disc: hears submarines. ${S.done.seamount ? 'Seamount stations listen north of Aotearoa. ' : ''}${S.done.chain ? 'The sensor chain covers the eastern approach. ' : ''}${S.done.polar ? 'Your satellites show every surface ship. ' : ''}Partners at 60 keep a coast watch.</p>`;
      if (!us.length) h += `<p style="color:#f0a898">You have nothing at sea yet. Patrol vessels, the airship and UUVs all come from projects.</p>`;
    } else if (s === 'boat') h += `<h2>Sea patrol</h2><p>Fishing boats, and boats that are something else. You cannot tell which until they are inside your radar ring${S.done.polar ? ' (wider, thanks to the satellites)' : ''}.</p><p>Three good patrols in each water and your skippers take it over.</p>`;
    else if (s === 'corridor') h += `<h2>The corridor</h2><p>An unarmed convoy from the zone to the port, past people whose land it crosses. Every stop you make for them raises consent. Running a roadblock costs ten; hitting someone costs twenty and ends the run.</p><p>Papuan consent: <b>${Math.round(S.consent)}</b></p>`;
    else if (s === 'field') {
      const m = mode;
      h += `<h2>In the field</h2><p><b>${m.mates.length}</b> turned out with you (hands, security arm, reserves). Sparring made them ${Math.round((m.str - 1) * 100)}% harder to move.</p>`;
      h += `<p><b>F</b> (or 1, 2, 3) changes formation:<br><b>Wedge</b>: they follow behind you; you hit hardest at the tip.<br><b>Line</b>: shoulder to shoulder across your front; takes half the punishment and nothing walks through it.<br><b>Encircle</b>: they close a ring on whoever is in front of you; three or more around one person ends it twice as fast.</p><p><b>G</b> splits off half to hold where you are standing, on their own. G again calls them back.</p>`;
      h += m.kind === 'levin' ? `<p>They are kids in cars, not enemies. Nobody gets hit. Get two trucks beside a car and hold them there to box it in. A line across a street turns them; a ring stops them. The disturbance bar is the town's patience.</p>` : m.kind === 'raid' ? `<p>You cannot win this by force and must not try. Every second they are held up in front of neighbours and cameras costs them. Community out on the street: <b>${m.comm}</b> (from mana). People who would have to answer for it: <b>${m.lia}</b> (a council seat, allies on council, patrol relationships, the BID).</p><p>Those who stand in the line too long are arrested, which costs them more still. Fall back to the next line and reform.</p>` : `<p>Hands only, and the same moves as the gym. Hold the ground: a place goes to whoever has more people standing on it. Some cover up after the first hit: shove (L) to break the guard, then strike while they are open for nearly double. They turn orange before they swing at you: block it (Space), or take a grip (L while blocking) and whoever swings goes down and takes a neighbour with them. Shove at the wrong moment and you are the one pulled over.</p>`;
    }
    if (s === 'gun') { const W = mode.a.w; h += `<h2>A gunfight</h2><p>It is the gym with cover where the block was.</p><p><b>Behind cover</b> you cannot be hit. <b>J</b> (or click) leans out and fires; for that moment you can be hit, and if they are tucked in they get a snap shot at you. A shot at someone in cover does not hurt them but <b>pins</b> them for a second.</p><p><b>K</b> is your own snap shot from cover: it only lands on someone leaning out, and it wounds, never kills.</p><p><b>A/D</b> moves you to the next cover, across open ground. Do it while they are pinned or reloading. ${W.open >= 99 ? 'Anyone caught in the open by an aimed shot from a real gun is finished, and that includes you.' : `Your ${W.name.toLowerCase()} will not kill: someone caught in the open takes ${W.open} of 12.`}</p><p><b>L</b> rushes them from the cover beside theirs. Arrive and it is hand to hand, with the damage so far carried over; someone still fumbling with a gun at arm's length is slow.</p><p>${W.name}: ${W.mag} shot${W.mag === 1 ? '' : 's'} before reloading${W.jam ? ', and it jams about one time in seven' : ''}.</p>`; }
    if (s === 'site') { const m = mode, w = m.kind === 'works'; h += `<h2>${w ? 'Contract site' : 'Site security'}</h2><p>${m.crew.length} of your people came out with you, and every one of them holds all three tickets. Press <b>1</b>, <b>2</b> or <b>3</b> to put one more on that trade; they come off whichever trade has the most.</p>` + (w ? `<p><b>1 Logistics</b> carry the load from the truck to the laydown. Until the first loads are off, digging crawls, and the build can only go as far as what has been unloaded.<br><b>2 Labour</b> dig the trench, then lay the base in it. Stand in the trench yourself and you count as one more.<br><b>3 Security</b> stand the gates. A gate with nobody on it is open, and as the light goes more people try it.</p><p>Finished before dark pays in full; every load that walks off costs 8%.</p>` : `<p><b>1 Rovers</b> walk the fence and catch anyone cutting through it.<br><b>2 Lights</b> rig the towers: once all four are up, intruders move slower.<br><b>3 Gates</b> stand the three gates.</p><p>Lose no more than one item by morning and the contract is kept.</p>`) + `<p>Walk into an intruder yourself and they are turned round; if they were carrying something, it goes back.</p>`; }
    if (s !== 'field' && s !== 'site') { const cs = S.over ? [] : calls(); if (cs.length) h = `<h2 style="color:#ffb199">Where you are needed</h2>` + cs.map(c => `<button data-view="${c.view}">${G.missionName(S, c.ms)} · ${c.name} (${D.acts[c.view].name})</button>`).join('') + `<p>Travel there with WASD before the season ends: climb (E or scroll) to cross to another map, descend (Q) to close in. Not going counts as a loss.</p>` + h; }
    return h + (s === 'spar' || s === 'patrol' ? '' : afterWork()) + window.VIEW.gauge(S);
  }
  function onSide(e) {
    const b = e.target.closest('button'); if (!b) return; e.stopPropagation();
    const d = b.dataset;
    if (d.build) { if (G.buildMachine(S, d.build)) say(D.machines[d.build].name + ' is on the bench.'); }
    else if (d.bench) { if (G.benchStart(S, d.bench)) { startBench(d.bench); say('Scrap on the belt. J plates, K shafts, L gears.'); } else say('Not possible yet.'); }
    else if (d.auto) { S.auto = S.auto || {}; S.auto[d.auto] = !S.auto[d.auto]; }
    else if (d.place) selMachine = selMachine === d.place ? null : d.place;
    else if (d.send) return sendTo(G.NODE[d.send]);
    else if (d.enter) { if (G.enterRun(S, d.enter)) say('A day in ' + G.siteName(d.enter) + '.'); }
    else if (d.finish) { const r = G.finishRun(S); if (r) say(`${r.mine} of ${r.total} jobs done${r.theirs ? ', ' + r.theirs + ' lost to rivals' : ''}. Earned ${money(r.earned)}. ${r.bonus}`); }
    else if (d.dev) { const [id, what] = d.dev.split(':'); if (!G.devTown(S, id, what)) say('Not possible yet.'); }
    else if (d.view) { G.setView(S, +d.view); }
    else if (d.bload) { if (G.bargeLoad(S)) say('Module on the truck. Out to Himatangi with it.'); else say('Not possible yet.'); }
    else if (d.mount) { if (G.mountSend(S, d.mount)) say('UUVs away, running deep.'); else say(G.mountWhy(S) || 'Not possible yet.'); }
    else if (d.nzline) { if (!G.nzExtend(S, d.nzline)) say('Not possible yet.'); }
    else if (d.nzhub) { if (!G.nzHub(S)) say('Not possible yet.'); }
    else if (d.nzlink) { const [a, b] = d.nzlink.split(':'); if (!G.nzBuildLink(S, a, b)) say('Not possible yet.'); }
    else if (d.nzwire) { const [a, b] = d.nzwire.split(':'); if (!G.nzElectrify(S, a, b)) say('Not possible yet.'); }
    else if (d.nzplant) { const [a, g] = d.nzplant.split(':'); if (!G.nzPlant(S, a, g)) say('Not possible yet.'); }
    else if (d.stance) { const [g, st] = d.stance.split(':'); G.setStance(S, g, st); }
    else if (d.whanau) say(G.whanau(S, d.whanau));
    else if (d.gun) { const [gid, w] = d.gun.split(':'), W = G.WEAPONS[w]; if (W.legal || confirm(`A ${W.name.toLowerCase()} on a Palmerston North street. Whatever happens, the police will be told, and so will every parent whose kid trains at your gym. Do it?`)) { startGun(gid, w); say('Stay behind something.'); } }
    full();
  }

  // On-screen controls and the fullscreen map. The buttons press the same keys the keyboard does, so nothing else changes.
  let touchOn = null, fullOn = false, touchSig = '';
  function setFull(on) { fullOn = on; if (!host) return; host.classList.toggle('full', on); host.classList.remove('showside'); document.body.classList.toggle('fs', on); const de = document.documentElement; try { if (on && de.requestFullscreen && !document.fullscreenElement) de.requestFullscreen().catch(() => { }); else if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => { }); } catch (x) { } }
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && fullOn) setFull(false); });
  const TACT = { // which buttons each scene needs: [label, key]
    map: [['Down', 'q'], ['Up', 'e']], region: [['Down', 'q'], ['Up', 'e'], ['Fly', 'v']], run: [], home: [['Up', 'e']],
    spar: [['Punch', 'j'], ['Kick', 'k'], ['Shove', 'l'], ['Block', ' ']], field: [['Punch', 'j'], ['Kick', 'k'], ['Shove', 'l'], ['Block', ' '], ['Form', 'f'], ['Split', 'g']],
    gun: [['Fire', 'j'], ['Snap', 'k'], ['Rush', 'l'], ['Reload', 'r']], site: [['1', '1'], ['2', '2'], ['3', '3']], bench: [['Plate', 'j'], ['Shaft', 'k'], ['Gear', 'l'], ['Seat', ' ']],
    mill: [['25', '1'], ['50', '2'], ['100', '3'], ['Undo', 'Backspace'], ['Saw', ' ']], dig: [['Dig', 'j'], ['Tip/Load', 'k']], pour: [['1', '1'], ['2', '2'], ['3', '3'], ['Truck', 't']], boat: [['Fleet', 'f']],
  };
  function touchSync() {
    if (!host || !touchOn) return; const sc = screen(), key = TACT[sc] ? sc : sc === 'region' ? 'region' : CAMV[sc] ? 'map' : sc, sig = key + (mode && mode.done ? ':done' : '');
    if (sig === touchSig) return; touchSig = sig; const acts = host.querySelector('.touch .acts'), pad = host.querySelector('.touch .pad'); if (!acts) return;
    const list = mode && mode.done ? [['Continue', 'Enter']] : TACT[key] || [];
    acts.innerHTML = list.map(q => `<button data-k="${q[1]}">${q[0]}</button>`).join('');
    pad.style.display = /^(build|tutor|escort|watch|bench)$/.test(sc) ? 'none' : '';
  }
  function mount(state, el, lightCb, fullCb) {
    S = state; light = lightCb; full = fullCb;
    if (S.act !== seenAct) { selMachine = null; charge = -1; seenAct = S.act; }
    if (!cv || !cv.isConnected || host !== el) {
      host = el;
      el.innerHTML = `<div class="scene-main"><div class="cv-wrap"><canvas width="${CW}" height="${CH}" class="play"></canvas><div class="touch"><div class="pad"><button class="u" data-k="w">▲</button><button class="l" data-k="a">◀</button><button class="r" data-k="d">▶</button><button class="d" data-k="s">▼</button></div><div class="acts"></div></div><div class="cv-btns"><button data-ui="full" title="Fullscreen map">⛶</button><button data-ui="touch" title="On-screen controls">🎮</button><button data-ui="side" class="fs-only" title="Panel">☰</button><button data-ui="end" class="fs-only" title="End season">▸▸</button></div></div></div><div class="side"></div>`;
      touchSig = ''; if (touchOn === null) touchOn = matchMedia('(pointer: coarse)').matches || innerWidth < 860; el.classList.toggle('touchy', touchOn); el.classList.toggle('full', fullOn);
      el.querySelector('.cv-btns').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const u = b.dataset.ui; if (u === 'full') setFull(!fullOn); else if (u === 'touch') { touchOn = !touchOn; host.classList.toggle('touchy', touchOn); } else if (u === 'side') host.classList.toggle('showside'); else if (u === 'end') { const eb = document.getElementById('end'); if (eb) eb.click(); } });
      const tc = el.querySelector('.touch'), press = (e, down) => { const b = e.target.closest('button'); if (!b || !b.dataset.k) return; e.preventDefault(); b.classList.toggle('held', down); const k = b.dataset.k; window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k, bubbles: true })); if (down && b.setPointerCapture) { try { b.setPointerCapture(e.pointerId); } catch (x) { } } };
      tc.addEventListener('pointerdown', e => press(e, true)); tc.addEventListener('pointerup', e => press(e, false)); tc.addEventListener('pointercancel', e => press(e, false)); tc.addEventListener('contextmenu', e => e.preventDefault());
      cv = el.querySelector('canvas'); ctx = cv.getContext('2d'); side = el.querySelector('.side');
      cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', pos); side.addEventListener('click', onSide);
      cv.addEventListener('wheel', e => { if (mode || modalUp() || (S.view === 1 && (S.jobs.length || S.act < 2))) return; e.preventDefault(); zoomBy(Math.exp(-clamp(e.deltaY, -60, 60) * 0.004)); }, { passive: false });
    }
    side.innerHTML = sideHTML();
    if (!raf) raf = requestAnimationFrame(frame);
  }
  // test hook: run the current scene forward without waiting for animation frames
  function _tick(n, dt) { const f = { field: stepField, mill: stepMill, dig: stepDig, pour: stepPour, gun: stepGun, site: stepSite, bench: stepBench, tutor: stepTutor, boat: stepBoat, corridor: stepCorridor, watch: stepWatch, escort: stepEscort, patrol: stepPatrol, spar: stepSpar }; for (let i = 0; i < n && mode && !mode.done && f[mode.type]; i++) f[mode.type](dt || 0.05); return mode; }
  window.PLAY = { mount, wants, endSeason, _tick, _render: render, _end: () => { mode = null; }, _zoom: zoomBy, _build: kind => { S.jobs = [{ kind, val: 5, x: 2, y: 2, by: null, claim: -1 }]; S.pendingBuild = 0; S.runSite = 'home'; startBuild(); return mode; }, _pull: (x, y) => { mouse.x = mode.A.x; mouse.y = mode.A.y; buildDown(); mouse.x = x; mouse.y = y; buildMove(); buildUp(); return mode; }, _S: () => S, _cam: cam, _zooms: zoom, _keys: keys, _mouse: mouse, _start: (k, a) => ({ field: () => startField(a || 'fascist', 'bp'), boat: startBoat, gun: () => startGun('bp', a || 'pistol'), escort: startEscort, bench: () => startBench(a || 'tractor'), tutor: () => { S.jobs = [{ kind: 'tutor', val: 2, x: 1, y: 1, by: null, claim: -1 }]; S.pendingBuild = 0; startTutor(); }, site: () => startSite(a || 'works', 'levin'), spar: () => startSpar(), corridor: startCorridor, watch: () => startWatch(() => {}) })[k]() };
})();
