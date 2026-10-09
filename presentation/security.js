/*!
 * security.js — ICAN prezentatsiya himoya qatlami (client-side).
 * MAQSAD: skrinshot/ekran yozib olish/nusxa/inspeksiyani IMKON QADAR qiyinlashtirish.
 * MUHIM: UI, layout, ranglar, biznes-mantiqqa TEGMAYDI. Faqat himoya hodisalarini qo'shadi.
 * ESLATMA (halol chegara): brauzer OT darajasidagi skrinshotni yoki telefon/tashqi
 *   dastur yozuvini 100% BLOKLAY OLMAYDI. Bu qatlam faqat qiyinlashtiradi + kuzatuvchan qiladi.
 * Ulanish: <script src="/security.js" defer></script>  (faqat asosiy oynaga; iframe'larga o'zi tarqaladi)
 */
(function () {
  'use strict';
  var isTop; try { isTop = (window.self === window.top); } catch (e) { isTop = true; }

  /* ---------------- Shield / blur overlay (faqat asosiy oyna) ---------------- */
  var GID = 'zsec-guard';
  function guardEl() {
    var el = document.getElementById(GID);
    if (!el && document.body) {
      el = document.createElement('div');
      el.id = GID;
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:rgba(10,13,20,.94);' +
        'backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);display:flex;align-items:center;' +
        'justify-content:center;text-align:center;color:#fff;opacity:0;transition:opacity .1s;' +
        'pointer-events:none;font-family:"Nunito Sans",system-ui,sans-serif';
      el.innerHTML = '<div><div style="font-weight:900;font-size:20px">🔒 Himoyalangan maxfiy demo</div>' +
        '<div id="zsec-msg" style="font-weight:600;font-size:13.5px;opacity:.82;margin-top:7px">Skrinshot, nusxa va tekshiruv cheklangan</div></div>';
      document.body.appendChild(el);
    }
    return el;
  }
  var shieldLocks = 0;
  function shield(on, msg) {
    var el = guardEl(); if (!el) return;
    el.style.opacity = on ? '1' : '0';
    if (on && msg) { var m = el.querySelector('#zsec-msg'); if (m) m.textContent = msg; }
  }
  function flash(ms, msg) { shield(true, msg); setTimeout(function () { if (!hardLock()) shield(false); }, ms || 1200); }
  var _cap = false;
  function hardLock() { return _cap; }                // faqat aniq ekran-yozuv aniqlanganда doimiy yopiq
  function refresh() { shield(hardLock(), _cap ? 'Ekran yozib olish aniqlandi' : ''); }

  /* ---------------- Nusxa/tanlash/kontekst/drag himoyasi ---------------- */
  function isField(t) { return t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '') || t.isContentEditable); }
  function block(e) { try { if (isField(e.target)) return; e.preventDefault(); } catch (_) {} }
  function injectCSS(doc) {
    try {
      if (!doc || doc.getElementById('zsec-css')) return;
      var css =
        // matn tanlashni o'chirish — LEKIN inputlar/textarea/contenteditable'da qoldirish
        '*:not(input):not(textarea):not([contenteditable]):not([contenteditable] *){-webkit-user-select:none!important;-moz-user-select:none!important;-ms-user-select:none!important;user-select:none!important}' +
        'input,textarea,[contenteditable],[contenteditable] *{-webkit-user-select:text!important;-moz-user-select:text!important;user-select:text!important}' +
        // rasmni sudrab olish / uzoq bosib saqlashni o'chirish
        'img,svg{-webkit-user-drag:none!important;user-drag:none!important;-webkit-touch-callout:none!important}' +
        // chop etishda butun kontentni yashirish
        '@media print{html,body{background:#fff!important}body *{visibility:hidden!important}' +
        'body::before{visibility:visible!important;content:"🔒 Bu hujjat chop etish uchun himoyalangan — MAXFIY";' +
        'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
        'font:800 20px system-ui,sans-serif;color:#111}}';
      var el = doc.createElement('style'); el.id = 'zsec-css'; el.textContent = css;
      (doc.head || doc.documentElement).appendChild(el);
    } catch (e) {}
  }

  /* ---------------- Klaviatura: inspeksiya va capture yorliqlari ---------------- */
  function clearClip() { try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(' ').catch(function () {}); } catch (e) {} }
  function onKey(e) {
    var k = e.key || '', c = e.ctrlKey || e.metaKey, s = e.shiftKey;
    // PrintScreen — rasm allaqachon olingan bo'lishi mumkin, lekin bufer tozalanadi + ogohlantirish
    if (k === 'PrintScreen') { clearClip(); flash(1500, 'Skrinshot urinishi — bufer tozalandi'); try { e.preventDefault(); } catch (_) {} return; }
    // DevTools / manba: F12, Ctrl+Shift+I/C/J, Ctrl+U
    if (k === 'F12' || (c && s && /^[ijcIJC]$/.test(k)) || (c && /^[uU]$/.test(k))) { try { e.preventDefault(); } catch (_) {} flash(1100, 'Tekshiruv oynasi bloklandi'); return; }
    // chop / saqlash
    if (c && /^[psPS]$/.test(k)) { try { e.preventDefault(); } catch (_) {} flash(1000, 'Chop etish / saqlash cheklangan'); return; }
  }

  /* ---------------- Bitta hujjatga o'rnatish (asosiy + iframe) ---------------- */
  function install(doc) {
    try {
      if (!doc || doc.__zsec) return; doc.__zsec = 1;
      injectCSS(doc);
      doc.addEventListener('contextmenu', block, true);
      doc.addEventListener('copy', block, true);
      doc.addEventListener('cut', block, true);
      doc.addEventListener('dragstart', block, true);
      doc.addEventListener('selectstart', block, true);
      doc.addEventListener('keydown', onKey, true);
    } catch (e) {}
  }
  install(document);

  if (isTop) {
    /* ---- fokus/ko'rinuvchanlik: tashqi capture/tab almashinuvida xiralashtirish ----
       (fokus ichki iframe'ga o'tsa document.hasFocus()=true -> xiralashtirmaymiz) */
    window.addEventListener('blur', function () { setTimeout(function () { if (!document.hasFocus()) shield(true); else refresh(); }, 0); });
    window.addEventListener('focus', function () { refresh(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) shield(true); else refresh(); });

    /* ---- chop etishni bloklash ---- */
    window.addEventListener('beforeprint', function () { shield(true, 'Chop etish himoyalangan'); });
    window.addEventListener('afterprint', function () { refresh(); });
    try {
      var mq = window.matchMedia && window.matchMedia('print');
      if (mq && mq.addEventListener) mq.addEventListener('change', function (ev) { if (ev.matches) shield(true, 'Chop etish himoyalangan'); else refresh(); });
    } catch (e) {}

    /* ---- Screen Capture API (sahifa o'zi chaqirса) aniqlash ---- */
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        var _gdm = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getDisplayMedia = function () {
          _cap = true; refresh();
          var pr = _gdm.apply(this, arguments);
          try {
            pr.then(function (stream) {
              try {
                var tr = stream.getVideoTracks && stream.getVideoTracks()[0];
                if (tr) tr.addEventListener('ended', function () { _cap = false; refresh(); });
              } catch (e) {}
            }).catch(function () { _cap = false; refresh(); });
          } catch (e) {}
          return pr;
        };
      }
    } catch (e) {}

    /* ---- DevTools ----
       DIQQAT: avtomatik DevTools "o'lcham/console/timing" aniqlash OLIB TASHLANDI —
       u soxta ishga tushib (brauzer paneli/xatcho'plar balandligi sababli) sahifani
       noto'g'ri yopib qo'yardi. DevTools yorliqlari (F12, Ctrl+Shift+I/J/C, Ctrl+U)
       onKey() da bloklanadi va qisqa flash ko'rsatadi — bu soxta ishga tushmaydi. */

    /* ---- iframe demolarga ham o'rnatish (o'ng tugma/klaviatura ular ichida ham) ---- */
    function hookFrames() { var fs = document.querySelectorAll('iframe'); for (var i = 0; i < fs.length; i++) { try { install(fs[i].contentDocument); } catch (e) {} } }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookFrames); else hookFrames();
    setInterval(hookFrames, 3000);
  }
})();
