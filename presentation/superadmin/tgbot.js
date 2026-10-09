/* ICAN Super Admin — "Telegram bot" sidebar item injector.
 *
 * Non-invasive: runs at runtime, adds a menu item next to "Mijozlar", and opens
 * the bot-user admin panel INLINE in the content area (to the right of the
 * sidebar) — so it feels like the other sections, not a popup. Never touches the
 * compiled React bundle; fully reversible by removing the <script> tag.
 */
(function () {
  var ADMIN_URL = "/telegram-bot/";
  var LABEL = "Telegram bot";

  function findByText(text) {
    var all = document.querySelectorAll("a,button,li,span,div,p");
    var hit = null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].textContent.trim() === text) hit = all[i];
    }
    return hit; // deepest match in doc order
  }

  function findSidebar() {
    var m = findByText("Mijozlar");
    if (!m) return null;
    var el = m;
    for (var i = 0; i < 9 && el; i++) {
      el = el.parentElement;
      if (
        el &&
        /Mijozlar/.test(el.textContent) &&
        /Xarita/.test(el.textContent) &&
        el.getBoundingClientRect().width < window.innerWidth * 0.5
      )
        return el;
    }
    return null;
  }

  function rowOf(txt) {
    var e = findByText(txt);
    return e ? e.closest("a") || e.closest("li") || e.closest("button") || e : null;
  }

  function isActive(el) {
    if (!el) return false;
    var bg = getComputedStyle(el).backgroundColor;
    return !!bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
  }

  function navClasses() {
    var m = rowOf("Mijozlar"), x = rowOf("Xarita"), act = null, inact = null;
    [m, x].forEach(function (r) {
      if (!r) return;
      if (isActive(r)) act = act || r.className;
      else inact = inact || r.className;
    });
    return { act: act, inact: inact, rows: [m, x] };
  }

  // Highlight our item as the "active" section and un-highlight Mijozlar/Xarita
  // (React won't do it for us since our item isn't a real route).
  function markActive(on) {
    var me = document.getElementById("tgbot-nav-item");
    var c = navClasses();
    if (on) {
      if (me) {
        if (c.act) me.className = c.act;
        else me.style.background = "rgba(99,91,255,.12)";
      }
      if (c.inact) c.rows.forEach(function (r) { if (r) r.className = c.inact; });
    } else if (me) {
      me.style.background = "";
      if (c.inact) me.className = c.inact;
    }
  }

  function close() {
    markActive(false);
    var o = document.getElementById("tgbot-overlay");
    if (o) o.remove();
  }

  function position(o) {
    // Fill the area to the RIGHT of the sidebar so the sidebar stays visible
    // (just like the Xarita section).
    var sb = findSidebar();
    var left = sb ? Math.max(sb.getBoundingClientRect().right, 0) : 0;
    o.style.left = left + "px";
    o.style.top = "0px";
  }

  function openAdmin() {
    if (document.getElementById("tgbot-overlay")) return;
    var o = document.createElement("div");
    o.id = "tgbot-overlay";
    // no header bar — just the panel content, integrated look
    o.style.cssText =
      "position:fixed;right:0;bottom:0;top:0;z-index:9000;background:#f4f7f8;" +
      "display:flex;flex-direction:column";
    var f = document.createElement("iframe");
    f.src = ADMIN_URL;
    f.style.cssText = "flex:1;border:0;background:#f4f7f8;width:100%";
    o.appendChild(f);
    document.body.appendChild(o);
    position(o);
    markActive(true);   // highlight the Telegram bot item, dim the others
  }

  function inactiveRow() {
    // Xarita is inactive by default → its className carries the normal
    // (non-highlighted) sidebar style WITH working hover. Cloning Mijozlar's
    // structure but using this className avoids the "stuck highlighted" look.
    var x = findByText("Xarita");
    return x ? x.closest("a") || x.closest("li") || x.closest("button") || x : null;
  }

  function inject() {
    if (document.getElementById("tgbot-nav-item")) return;
    var m = findByText("Mijozlar");
    if (!m) return;
    var row = m.closest("a") || m.closest("li") || m.closest("button") || m;
    if (!row || !row.parentNode) return;
    var clone = row.cloneNode(true);
    clone.id = "tgbot-nav-item";
    var inactive = inactiveRow();
    if (inactive) clone.className = inactive.className;  // normal, non-active look
    clone.removeAttribute("style");
    if (clone.tagName === "A") clone.removeAttribute("href");
    clone.innerHTML =
      '<span style="display:inline-flex;align-items:center;gap:10px">' +
      '<span style="font-size:16px">🤖</span>' + LABEL + "</span>";
    clone.style.cursor = "pointer";
    clone.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      openAdmin();
    });
    row.parentNode.insertBefore(clone, row.nextSibling);
  }

  // Close the panel when the user navigates to another sidebar section.
  document.addEventListener("click", function (e) {
    var item = e.target.closest ? e.target.closest("a,button,li,div") : null;
    if (!item) return;
    if (document.getElementById("tgbot-nav-item") &&
        document.getElementById("tgbot-nav-item").contains(e.target)) return;
    var t = (item.textContent || "").trim();
    if (t === "Mijozlar" || t === "Xarita") close();
  }, true);

  window.addEventListener("resize", function () {
    var o = document.getElementById("tgbot-overlay");
    if (o) position(o);
  });

  // Best-effort layout fix for the super-admin's own "Parolni o'zgartirish"
  // modal (labels + inputs were rendering inline). Only touches that modal.
  function fixPasswordModal() {
    var all = document.querySelectorAll("h1,h2,h3,h4,div,span,p");
    var title = null;
    for (var i = 0; i < all.length; i++) {
      var tx = all[i].textContent.trim();
      if (tx === "Parolni o‘zgartirish" || tx === "Parolni o'zgartirish") {
        title = all[i]; break;
      }
    }
    if (!title) return;
    var modal = title;
    for (var j = 0; j < 7 && modal; j++) {
      if (modal.querySelectorAll && modal.querySelectorAll("input").length >= 2) break;
      modal = modal.parentElement;
    }
    if (!modal || modal.getAttribute("data-tgfix")) return;
    modal.setAttribute("data-tgfix", "1");
    modal.querySelectorAll("label").forEach(function (l) {
      l.style.display = "block";
      l.style.margin = "12px 0 4px";
      l.style.fontSize = "13px";
      l.style.fontWeight = "600";
    });
    modal.querySelectorAll("input").forEach(function (inp) {
      inp.style.display = "block";
      inp.style.width = "100%";
      inp.style.boxSizing = "border-box";
      inp.style.padding = "10px 12px";
      inp.style.margin = "0 0 6px";
      inp.style.border = "1px solid #d9dde3";
      inp.style.borderRadius = "8px";
    });
  }

  try {
    new MutationObserver(function () {
      try { inject(); } catch (e) {}
      try { fixPasswordModal(); } catch (e) {}
    }).observe(document.documentElement, { subtree: true, childList: true });
  } catch (e) {}
  if (document.readyState !== "loading") inject();
  else document.addEventListener("DOMContentLoaded", inject);
})();
