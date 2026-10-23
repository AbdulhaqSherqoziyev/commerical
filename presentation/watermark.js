/**
 * watermark.js — dinamik, olib tashlash qiyin diagonal watermark (tarqatishga qarshi).
 * Ko'rsatadi: tashkilot nomi · ICAN · sessiya ID · sana/vaqt · MAXFIY.
 * - Faqat asosiy oynada (iframe'lar ustidan ham qoplaydi)
 * - pointer-events:none, user-select:none — UI'ga xalaqit bermaydi
 * - Har daqiqa yangilanadi; o'chirib tashlansa qayta tiklanadi (MutationObserver + interval)
 * Ulanish: <script src="/watermark.js" defer></script>
 */
(function () {
  'use strict';
  try { if (window.self !== window.top) return; } catch (e) { return; }

  var ID = 'ican-watermark';

  function sid() {
    try {
      var s = sessionStorage.getItem('zsec-sid');
      if (!s) {
        s = (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toUpperCase().slice(-9);
        sessionStorage.setItem('zsec-sid', s);
      }
      return s;
    } catch (e) { return '—'; }
  }

  function org() {
    // joriy sahifaning tashkiloti (brand.js beradi) — boshqa do'kon keshidan emas
    try { if (window.BRAND && window.BRAND.name) return String(window.BRAND.name).toUpperCase(); } catch (e) {}
    return 'ICAN BUSINESS';
  }

  function lines() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    var dt = p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    return [org() + ' · ICAN · MAXFIY', 'SID:' + sid() + ' · ' + dt];
  }

  function buildSvg(ls) {
    var esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    var a = esc(ls[0]), b = esc(ls[1]);
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360">' +
      '<style>text{font-family:&quot;Nunito Sans&quot;,-apple-system,&quot;Segoe UI&quot;,sans-serif;fill:#7A8794}' +
      '.a{font-weight:800;font-size:16px;letter-spacing:.14em;fill-opacity:.06}' +
      '.b{font-weight:700;font-size:12px;letter-spacing:.10em;fill-opacity:.05}</style>' +
      '<g transform="rotate(-30 300 180)">' +
      '<text class="a" x="20" y="90">' + a + '</text><text class="b" x="20" y="110">' + b + '</text>' +
      '<text class="a" x="-260" y="250">' + a + '</text><text class="b" x="-260" y="270">' + b + '</text>' +
      '<text class="a" x="320" y="250">' + a + '</text><text class="b" x="320" y="270">' + b + '</text>' +
      '</g></svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }

  function createEl() {
    var el = document.createElement('div');
    el.id = ID;
    el.setAttribute('aria-hidden', 'true');
    var ls = lines(); el.__key = ls.join('|');
    el.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483000',
      'pointer-events:none', 'user-select:none', '-webkit-user-select:none', '-moz-user-select:none',
      'background-image:' + buildSvg(ls), 'background-repeat:repeat', 'background-size:600px 360px'
    ].join(';');
    return el;
  }

  function mount() {
    if (!document.body) return;
    var el = document.getElementById(ID);
    if (!el) { document.body.appendChild(createEl()); return; }
    var ls = lines(), key = ls.join('|');
    if (el.__key !== key) { el.__key = key; el.style.backgroundImage = buildSvg(ls); } // vaqt/tenant yangilanса
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();

  // olib tashlansa/yo'qolsa tiklaymiz + har daqiqada vaqt yangilanadi (yengil, faqat interval)
  setInterval(mount, 3000);
})();
