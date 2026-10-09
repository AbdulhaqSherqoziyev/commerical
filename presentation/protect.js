/**
 * protect.js — skrinshot/nusxa TO'SIQLARI (100% himoya EMAS, faqat jilovlash).
 * Eslatma: brauzerда OT darajasidagi skrinshotni yoki telefon kamerasini
 * dastur bilan to'liq to'xtatib BO'LMAYDI. Bu qatlam faqat qiyinlashtiradi:
 *  - o'ng tugma (contextmenu) o'chirilgan
 *  - PrintScreen / Ctrl+P / Ctrl+S / F12 / DevTools -> ekran vaqtincha xiralashadi
 *  - oyna fokusdan ketganда yoki yashiринganда -> xiralashadi (kutilmagan capture'ga qarshi)
 *  - nusxa/kesish cheklangan
 * Faqat asosiy oynага ulanadi; iframe'larга avtomatik tarqaladi.
 * Ulash: <script src="/protect.js" defer></script>
 */
(function () {
  'use strict';
  var isTop; try { isTop = (window.self === window.top); } catch (e) { isTop = true; }

  var GID = 'zsec-guard';
  function guardEl() {
    var el = document.getElementById(GID);
    if (!el && document.body) {
      el = document.createElement('div');
      el.id = GID;
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:rgba(12,15,22,.9);' +
        'backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);display:flex;align-items:center;' +
        'justify-content:center;text-align:center;color:#fff;opacity:0;transition:opacity .12s;' +
        'pointer-events:none;font-family:"Nunito Sans",system-ui,sans-serif';
      el.innerHTML = '<div><div style="font-weight:900;font-size:19px;letter-spacing:.02em">🔒 Maxfiy demo</div>' +
        '<div style="font-weight:600;font-size:13.5px;opacity:.82;margin-top:6px">Skrinshot va nusxa cheklangan</div></div>';
      document.body.appendChild(el);
    }
    return el;
  }
  function shield(on) { var el = guardEl(); if (el) el.style.opacity = on ? '1' : '0'; }
  function flash(ms) { shield(true); setTimeout(function () { if (document.hasFocus && document.hasFocus()) shield(false); }, ms || 1200); }

  function clearClip() { try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(' ').catch(function () {}); } catch (e) {} }

  function onKey(e) {
    var k = e.key || '', c = e.ctrlKey || e.metaKey, s = e.shiftKey;
    if (k === 'PrintScreen') { clearClip(); flash(1500); try { e.preventDefault(); } catch (_) {} return; }
    if (c && (k === 'p' || k === 'P' || k === 's' || k === 'S')) { try { e.preventDefault(); } catch (_) {} flash(1000); return; }
    if (k === 'F12' || (c && s && /^[ijcIJC]$/.test(k))) { try { e.preventDefault(); } catch (_) {} flash(1100); return; }
  }
  function onCtx(e) { try { e.preventDefault(); } catch (_) {} }
  function onCopy(e) { try { e.preventDefault(); } catch (_) {} }

  function install(doc) {
    try {
      if (!doc || doc.__zsec) return; doc.__zsec = 1;
      doc.addEventListener('contextmenu', onCtx, true);
      doc.addEventListener('keydown', onKey, true);
      doc.addEventListener('copy', onCopy, true);
      doc.addEventListener('cut', onCopy, true);
    } catch (e) {}
  }
  install(document);

  if (isTop) {
    // fokus/ko'rinuvchanlik: focus IChKI iframe'га o'tса (document.hasFocus=true) xiralashtirmaymiz
    window.addEventListener('blur', function () { setTimeout(function () { if (!document.hasFocus()) shield(true); }, 0); });
    window.addEventListener('focus', function () { shield(false); });
    document.addEventListener('visibilitychange', function () { shield(!!document.hidden); });

    // DevTools ochilishini taxminiy aniqlash (oyna o'lchamlari farqi)
    var devOpen = false;
    setInterval(function () {
      var th = 180;
      var open = (window.outerWidth - window.innerWidth > th) || (window.outerHeight - window.innerHeight > th);
      if (open && !devOpen) { devOpen = true; shield(true); }
      else if (!open && devOpen) { devOpen = false; if (document.hasFocus()) shield(false); }
    }, 1000);

    // iframe demolarга ham o'rnatamiz (o'ng tugma/klaviatura ular ichida ham ishlashi uchun)
    function hookFrames() { var fs = document.querySelectorAll('iframe'); for (var i = 0; i < fs.length; i++) { try { install(fs[i].contentDocument); } catch (e) {} } }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookFrames); else hookFrames();
    setInterval(hookFrames, 3000);
  }
})();
