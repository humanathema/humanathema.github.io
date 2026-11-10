// KAITIAKI — scene views. One per zoom scale:
// Scales 1–3 are playable canvases (play.js); 4 Aotearoa and 5 Indo-Pacific are SVG maps here.
(function () {
  const G = window.G;
  let S = null;
  const has = id => !!S.done[id];
  const busy = id => S.active.some(a => a.id === id);

  // ───────── SVG helpers ─────────
  const mk = (lon0, lat0, kx, ky) => (lon, lat) => [((lon - lon0) * kx).toFixed(1), ((lat0 - lat) * ky).toFixed(1)];
  const poly = (pr, pts, cls, extra = '') => `<polygon class="${cls}" ${extra} points="${pts.map(p => pr(p[0], p[1]).join(',')).join(' ')}"/>`;
  const line = (pr, pts, cls) => `<polyline class="${cls}" points="${pts.map(p => pr(p[0], p[1]).join(',')).join(' ')}"/>`;
  function node(x, y, label, state, o = {}) { // state: 0 dim, 1 building, 2 lit
    const a = o.anchor || 'start', dx = a === 'end' ? -9 : a === 'middle' ? 0 : 9, dy = a === 'middle' ? -10 : 3.5;
    return `<g class="node s${state}"><circle cx="${x}" cy="${y}" r="${o.r || 5}"/><text x="${+x + dx}" y="${+y + dy}" text-anchor="${a}">${label}</text></g>`;
  }
  const st = (...ids) => (ids.some(has) ? 2 : ids.some(busy) ? 1 : 0);
  const airship = (x, y, s = 1, label = '') => `<g class="airship" transform="translate(${x},${y}) scale(${s})"><ellipse rx="22" ry="8"/><rect x="-6" y="8" width="12" height="4" rx="1"/><path d="M-22,0 l-7,-6 v12z"/>${label ? `<text y="-13" text-anchor="middle">${label}</text>` : ''}</g>`;

  // ───────── shared outlines ─────────
  const NI = [[172.7, -34.4], [174.3, -35.3], [175.5, -36.7], [176, -37.6], [178, -37.6], [178.5, -37.7], [177.9, -39.2], [176.9, -39.5], [176.3, -41], [175.2, -41.6], [174.7, -41.3], [175.2, -40.2], [174.6, -39.8], [173.8, -39.3], [174.6, -38.8], [174.8, -37.8], [174.2, -36.5], [173, -35.2]];
  const SI = [[172.7, -40.5], [174.3, -41.7], [173, -43], [172.8, -43.9], [171.3, -44.3], [170.8, -45.9], [169, -46.6], [167.5, -46.2], [166.5, -45.8], [168.2, -44.2], [170.5, -43], [171.8, -41.7]];

  // ───────── Scale 4: Aotearoa ─────────
  function nz() {
    const pr = mk(165.5, -33.6, 26, 34);
    const N = (lon, lat, label, state, o) => { const p = pr(lon, lat); return node(p[0], p[1], label, state, o); };
    let g = poly(pr, NI, 'land') + poly(pr, SI, 'land') + poly(pr, [[167.6, -46.8], [168.2, -46.9], [168, -47.3], [167.5, -47.2]], 'land');
    if (st('grid')) g += line(pr, [[174.7, -36.9], [175.3, -37.8], [175.9, -38.7], [175.6, -40.36], [174.78, -41.29], [173.5, -42.3], [172.6, -43.5], [170.5, -44.9], [168.4, -46.4]], 'gridline' + (has('grid') ? '' : ' building'));
    if (st('ferries')) g += line(pr, [[174.78, -41.29], [174.0, -41.29]], 'route' + (has('ferries') ? '' : ' building'));
    if (st('cargo')) g += line(pr, [[174.5, -35.85], [172, -34.5], [166, -34]], 'route' + (has('cargo') ? '' : ' building')) + `<text class="callout" x="6" y="22">← circuit route to Australia</text>`;
    if (st('seamount')) { g += line(pr, [[175.23, -40.42], [173.2, -38.5], [171.5, -35.5], [171, -33.8]], 'sensor' + (has('seamount') ? '' : ' building')); [[173.2, -38.5], [172.2, -36.8], [171.5, -35.5]].forEach(p => { const q = pr(p[0], p[1]); g += `<circle class="seamount" cx="${q[0]}" cy="${q[1]}" r="3"/>`; }); g += `<text class="callout" x="${pr(169.6, -35.9)[0]}" y="${pr(169.6, -35.9)[1]}" text-anchor="end">seamount stations</text>`; }
    g += N(175.6, -40.36, 'Palmerston North', 2, { r: 5 });
    g += N(174.78, -41.29, 'Wellington · Ministry of Works', st('mow'));
    g += N(174.5, -35.85, 'Northport drydock', st('northport', 'drumbeat'));
    g += N(174.76, -36.85, 'Auckland · undulator', st('undulator'));
    g += N(177.9, -38.4, 'State–iwi enterprises', st('iwiagri'), { anchor: 'end' });
    g += N(172.6, -43.5, 'Housing & schools', st('housingnat', 'schoolnat'));
    if (st('massdriver')) { const a = pr(170.6, -43.3), b = pr(169.9, -44.0), c = pr(169.0, -47.4); g += `<line class="rail-launch${has('massdriver') ? '' : ' building'}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; if (has('massdriver')) g += `<line class="trajectory" x1="${b[0]}" y1="${b[1]}" x2="${c[0]}" y2="${c[1]}"/><text class="callout" x="${c[0] - 6}" y="${c[1] - 4}" text-anchor="end">${has('polar') ? 'polar orbit ↓ constellation up' : 'to polar orbit ↓'}</text>`; }
    g += N(170.25, -43.65, 'Southern Alps launch rail', st('massdriver'), { anchor: 'end' });
    const p = pr(177.3, -41.3);
    if (has('hap')) g += airship(p[0], p[1], 1, 'platform · 20 km'); else if (has('airship')) g += airship(p[0], p[1], 0.7, 'Kāhu');
    return `<svg viewBox="0 0 364 476" class="map sea">${g}</svg>`;
  }

  // ───────── Scale 5: Te Moana ─────────
  const LANDS = {
    aus: [[[114, -22], [113.5, -26], [115, -34], [118, -35], [124, -33], [129, -31.5], [134, -32.5], [138, -35], [140, -38], [146, -39], [150, -37.5], [153, -31], [153.5, -27], [149, -21], [146, -19], [145.5, -15], [142.5, -11], [141, -16], [139.5, -17.5], [136, -15], [137, -12], [132, -11.5], [130, -13], [129, -15], [126, -14], [122, -17], [119, -20]], [[145, -41], [148, -41], [148, -43.5], [146, -43.5]]],
    idn: [[[95.3, 5.5], [98, 4], [100.5, 2], [103.5, -1], [106, -3.5], [105.7, -5.8], [104, -5.5], [101, -2.5], [98.7, 1.5], [96, 4]], [[105.3, -6.5], [108.5, -6.5], [111, -6.5], [114.5, -7.5], [114.3, -8.6], [110, -8.1], [106.5, -7.4]], [[109, 1.5], [111, 1], [114, 1.5], [115.5, 3.5], [117.8, 4.2], [118, 1], [116.3, -1.5], [116, -4], [114.5, -3.5], [111.5, -3.2], [110, -1.5], [109, 0]], [[119.5, -5.5], [120.5, -2.5], [119.8, 0.5], [121, 1.2], [125, 1.5], [123, 0.3], [121, -0.8], [123, -1], [121.8, -2], [122.8, -4.5], [121.5, -4.5], [120.5, -5.6]], [[115, -8.3], [119, -8.4], [123, -8.4], [127, -8.4], [125, -9.6], [123.5, -10.4], [119, -9.5]], [[131, -0.8], [134, -0.8], [135, -3.3], [138, -1.8], [141, -2.6], [141, -9.1], [138.5, -8.3], [138, -5.5], [135, -4.4], [133, -4], [132, -2.8]], [[127.5, 1.8], [128.6, 1], [128, -0.8], [127.4, 0.3]], [[128, -3], [130.5, -3], [130, -3.7], [128, -3.6]]],
    png: [[[141, -2.6], [145, -4.3], [147.8, -6], [147, -6.8], [150.8, -10.3], [147.5, -9.8], [144.5, -7.7], [143, -9.2], [141, -9.1]], [[148.5, -5.5], [152, -4.2], [152.3, -5], [150, -6.2]], [[154.6, -5.4], [155.9, -6.5], [155.4, -6.8]]],
    mys: [[[100.2, 6.5], [102.2, 6.2], [103.4, 4.5], [104.2, 1.5], [103.4, 1.5], [101.3, 2.8], [100.4, 5]], [[109.6, 1.8], [111, 1.5], [113, 3], [115, 5], [117, 7], [119, 5.2], [117.8, 4.2], [115.5, 3.5], [114, 1.5], [111, 1]]],
    vnm: [[[104.8, 8.6], [106.8, 10.4], [109.3, 12], [108.8, 15.5], [106.5, 18], [107.8, 21.5], [105, 23], [103, 22], [105.5, 19], [107, 16], [107.4, 13.5], [106, 11.3]]],
    phl: [[[120.3, 18.5], [122.2, 18.4], [122, 16], [124, 13], [123.5, 12.7], [121.5, 13.7], [120, 15]], [[122, 7], [123.5, 8.5], [125.5, 9.7], [126.5, 7.5], [125.5, 6], [124, 6.2]], [[122, 11.5], [125, 12.3], [125.3, 10.3], [123, 9.5]], [[117.3, 8.5], [119.5, 10.8], [119.3, 11.3], [117, 8.9]]],
  };
  const GREY = [[[98, 8], [100.2, 6.5], [102.2, 6.2], [101, 12.5], [103, 11], [104.8, 8.6], [106, 11.3], [107.4, 13.5], [107, 16], [105.5, 19], [103, 22], [105, 23], [100, 24], [94, 24], [94, 16], [97.5, 16.5], [98.5, 12]], [[108, 21.6], [110, 20.3], [113, 22], [117, 23.3], [118.5, 24], [105, 24]], [[120.2, 22], [121.8, 24], [120.8, 24], [120, 23]], [[164.2, -20.2], [166.9, -22.2], [166.4, -22.4], [164, -20.6]]];
  const LABEL = { aus: [134, -25], idn: [113, -1.2], png: [146.5, -4.2], mys: [113.5, 6.8], vnm: [110.5, 15], phl: [127, 13], sgp: [103.8, -0.4], pac: [172, -13] };
  const ISLES = [[160, -9.5, 'Solomons'], [168, -16.5, 'Vanuatu'], [178, -18, 'Fiji'], [184.8, -21, 'Tonga'], [188, -13.8, 'Sāmoa'], [173, 1.4, 'Kiribati'], [179.2, -8.5, 'Tuvalu'], [200, 0, '']];

  function moana() {
    const pr = mk(94, 24, 7, 7), rel = S.rel;
    const cls = k => 'terr' + (rel[k] >= 60 ? ' joined' : ''), op = k => `style="fill-opacity:${(0.18 + 0.82 * rel[k] / 100).toFixed(2)}"`;
    let g = GREY.map(p => poly(pr, p, 'land grey')).join('');
    if (has('aa2d')) { const c = pr(128, -6); g += `<ellipse class="denial" cx="${c[0]}" cy="${c[1]}" rx="${34 * 7}" ry="${15 * 7}"/>`; }
    for (const k in LANDS) g += LANDS[k].map(p => poly(pr, p, cls(k), op(k))).join('');
    g += poly(pr, NI, 'terr joined home') + poly(pr, SI, 'terr joined home');
    ISLES.forEach(i => { if (!i[2]) return; const p = pr(i[0], i[1]); g += `<circle class="${cls('pac')}" ${op('pac')} cx="${p[0]}" cy="${p[1]}" r="4"/><text class="isle" x="${+p[0] + 6}" y="${+p[1] + 3}">${i[2]}</text>`; });
    const sg = pr(103.8, 1.35); g += `<circle class="${cls('sgp')}" ${op('sgp')} cx="${sg[0]}" cy="${sg[1]}" r="4.5"/>`;
    if (st('cargo', 'circuit')) g += line(pr, [[174.5, -35.85], [153.3, -27.5], [151.2, -23.8], [146.8, -19.3], [147, -6.9], [160, -9.5], [168, -16.5], [178, -18], [184.8, -21], [174.5, -35.85]], 'route');
    if (st('chain')) g += line(pr, [[174, -35], [171.5, -31], [168, -27], [165, -21], [162, -14.5], [157, -10], [151.5, -7]], 'sensor' + (has('chain') ? '' : ' building'));
    if (has('darwin')) g += line(pr, [[130.8, -12.5], [124, -9], [116, -8.6], [116, -3], [119, 1.5]], 'patrol') + line(pr, [[130.8, -12.5], [106, -6], [104.5, 1]], 'patrol');
    if (has('fabs')) g += line(pr, [[174.76, -36.85], [140, -30], [110, -12], [103.8, 1.35]], 'beam');
    if (st('corridor')) g += line(pr, [[132.6, -1.6], [131.25, -0.9]], 'corridor' + (has('corridor') ? '' : ' building'));
    const N = (lon, lat, label, state, o) => { const p = pr(lon, lat); return node(p[0], p[1], label, state, o); };
    if (st('aa2d', 'darwin')) g += N(130.8, -12.5, 'Darwin', st('darwin'), { anchor: 'end', r: 4 });
    if (st('retired', 'siz')) g += N(132.6, -1.6, `Papua zone${has('siz') ? ' · consent ' + Math.round(S.consent) : ''}`, st('siz'), { anchor: 'middle', r: 4 });
    if (st('pngind', 'png_sec')) g += N(147, -6.7, 'Lae', st('pngind'), { r: 4 });
    for (const k in LABEL) { const p = pr(LABEL[k][0], LABEL[k][1]); g += `<text class="terr-l${rel[k] >= 60 ? ' joined' : ''}" x="${p[0]}" y="${p[1]}" text-anchor="middle">${G.DATA.partners[k]} ${Math.round(rel[k])}</text>`; }
    const h = pr(180, -39), lvl = G.platform(S);
    g += airship(h[0], h[1], 0.8, lvl >= 3 ? 'platform' : 'Kāhu');
    if (has('ring')) { const a = pr(94, 0), b = pr(190, 0); g += `<line class="ring" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/><text class="callout" x="${b[0] - 6}" y="${+b[1] - 6}" text-anchor="end">orbital ring</text>`; }
    g += `<text class="callout" x="8" y="16">↑ great-power attention ${Math.round(S.gpa)}${G.windowOpen(S) ? ' — window open' : G.pressured(S) ? ' — pressure' : ''}</text>`;
    return `<svg viewBox="0 0 700 504" class="map sea">${g}</svg>`;
  }

  // ───────── altitude gauge ─────────
  const LEVELS = [['Ground', '0 m'], ['Aerostat', '300 m'], ['Kāhu airship', '6 km'], ['Stratospheric platform', '20 km'], ['Sky tether', '100 km+'], ['Orbital ring', '300 km']];
  function gauge(state) {
    const lvl = G.platform(state || S);
    return '<div class="gauge"><div class="gauge-t">Your base</div>' + LEVELS.map((l, i) => `<div class="lvl${i === lvl ? ' on' : i < lvl ? ' past' : ''}"><b>${l[0]}</b><span>${l[1]}</span></div>`).reverse().join('') + '</div>';
  }

  function render(state, el, light, full) {
    S = state;
    if (window.PLAY.wants(S)) return window.PLAY.mount(S, el, light, full);
    el.innerHTML = `<div class="scene-main">${S.view === 4 ? nz() : moana()}</div><div class="side">${gauge()}</div>`;
  }
  window.VIEW = { render, gauge, geo: { LANDS, GREY, NI, SI, LABEL, ISLES } };

})();
