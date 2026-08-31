/* Kaha Tahi shared top bar.
   One <script src="https://kahatahi.co.nz/assets/topbar.js" defer> in any
   Kaha Tahi app injects a slim strip that links back to the main site and
   across to the other apps. Self-contained: no dependencies, own namespace. */
(function () {
  if (document.getElementById('kt-topbar')) return;

  var LINKS = [
    { label: 'Website',    href: 'https://kahatahi.co.nz/',            host: 'kahatahi.co.nz' },
    { label: 'Accounts',   href: 'https://accounts.kahatahi.co.nz/',   host: 'accounts.kahatahi.co.nz' },
    { label: 'Tutoring',   href: 'https://tutoring.kahatahi.co.nz/',   host: 'tutoring.kahatahi.co.nz' },
    { label: 'Membership', href: 'https://kahatahi.co.nz/membership/' },
    { label: 'Contact',    href: 'https://kahatahi.co.nz/#contact' }
  ];
  var here = location.hostname.replace(/^www\./, '');

  var css = [
    '#kt-topbar{position:sticky;top:0;z-index:2147483000;display:flex;align-items:center;',
    'gap:18px;flex-wrap:wrap;padding:8px 18px;font:400 13px/1 Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;',
    'background:#0b1730;color:#cfd7e6;border-bottom:1px solid #1f2c46;-webkit-font-smoothing:antialiased;}',
    '#kt-topbar a{color:#cfd7e6;text-decoration:none;padding:4px 2px;}',
    '#kt-topbar a:hover{color:#fff;}',
    '#kt-topbar .kt-tb-mark{font-family:"Archivo Black","Arial Black",sans-serif;font-size:15px;',
    'letter-spacing:.03em;color:#fff;margin-right:4px;}',
    '#kt-topbar .kt-tb-links{display:flex;gap:16px;flex-wrap:wrap;align-items:center;}',
    '#kt-topbar a[aria-current]{color:#f2a25c;}',
    '@media (max-width:560px){#kt-topbar{gap:10px;padding:7px 12px;}#kt-topbar .kt-tb-links{gap:12px;}}'
  ].join('');

  var style = document.createElement('style');
  style.id = 'kt-topbar-style';
  style.textContent = css;
  document.head.appendChild(style);

  var bar = document.createElement('nav');
  bar.id = 'kt-topbar';
  bar.setAttribute('aria-label', 'Kaha Tahi');

  var mark = document.createElement('a');
  mark.className = 'kt-tb-mark';
  mark.href = 'https://kahatahi.co.nz/';
  mark.textContent = 'KAHA TAHI';
  bar.appendChild(mark);

  var wrap = document.createElement('div');
  wrap.className = 'kt-tb-links';
  LINKS.forEach(function (l) {
    var a = document.createElement('a');
    a.href = l.href;
    a.textContent = l.label;
    if (l.host && l.host === here) a.setAttribute('aria-current', 'page');
    wrap.appendChild(a);
  });
  bar.appendChild(wrap);

  var run = function () { document.body.insertBefore(bar, document.body.firstChild); };
  if (document.body) run();
  else document.addEventListener('DOMContentLoaded', run);
})();
