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
    // Bir nechta ichma-ich element (masalan sb-nav, keyin uning tashqi
    // sidebar konteyneri) ham "Mijozlar"+"Xarita" matnini o'z ichiga oladi
    // va ikkalasi ham < 50vw. Birinchisini (ICHKI, torroq) qaytarsak,
    // overlay sidebarning haqiqiy o'ng chetidan bir necha piksel ichkariga
    // chizilib, "ichkariga kirib ketgan" ko'rinish paydo bo'ladi. Shu sabab
    // birinchi mosini emas, TASHQI (eng kattasi, ya'ni oxirgi mos kelgan)
    // ajdodni qaytaramiz.
    var m = findByText("Mijozlar");
    if (!m) return null;
    var el = m;
    var found = null;
    for (var i = 0; i < 9 && el; i++) {
      el = el.parentElement;
      if (
        el &&
        /Mijozlar/.test(el.textContent) &&
        /Xarita/.test(el.textContent) &&
        el.getBoundingClientRect().width < window.innerWidth * 0.5
      )
        found = el; // davom etamiz — tashqarida kattarog'i bo'lishi mumkin
    }
    return found;
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

  // CSS orqali faol ko'rinishni boshqaramiz (React klasslari bilan urishmaydi):
  // bot ochiq -> boshqa faol (.sb-item.on) so'nadi, bizning element yonadi.
  function ensureStyle() {
    if (document.getElementById("tgbot-style")) return;
    var st = document.createElement("style");
    st.id = "tgbot-style";
    st.textContent =
      "body.tgbot-open .sb-item.on{background:transparent!important;color:var(--mut)!important}" +
      "body.tgbot-open #tgbot-nav-item{background:var(--soft)!important;color:var(--b)!important}";
    document.head.appendChild(st);
  }
  // Bot bo'limini faol/nofaol qilish — faqat <body> klassi (CSS qolganini bajaradi).
  function markActive(on) {
    ensureStyle();
    document.body.classList.toggle("tgbot-open", !!on);
  }

  function close() {
    markActive(false);
    var o = document.getElementById("tgbot-overlay");
    if (o) o.remove();
  }

  function findHeader() {
    return document.querySelector(".dash-top");
  }

  function position(o) {
    // Fill the area to the RIGHT of the sidebar AND below the top header bar
    // (balans/qidiruv/bildirishnoma paneli), so both stay visible — just like
    // every other section (Xarita, Mijozlar, Prezintatsiya).
    var sb = findSidebar();
    var left = sb ? Math.max(sb.getBoundingClientRect().right, 0) : 0;
    var hdr = findHeader();
    var top = hdr ? Math.max(hdr.getBoundingClientRect().bottom, 0) : 0;
    o.style.left = left + "px";
    o.style.top = top + "px";
  }

  function openAdmin() {
    if (document.getElementById("tgbot-overlay")) return;
    var o = document.createElement("div");
    o.id = "tgbot-overlay";
    // panel content only — header (with nav/balans/qidiruv/profil) stays visible above it
    o.style.cssText =
      "position:fixed;right:0;bottom:0;z-index:5000;background:#f4f7f8;" +
      "display:flex;flex-direction:column";
    var f = document.createElement("iframe");
    // cache-bust: bot admin sahifasi hech qanday versiyalash headerisiz
    // xizmat qilinadi, shu sababli brauzer uni eski holda keshlab qo'yishi
    // mumkin — har ochilishda majburan yangi nusxa so'raladi.
    f.src = ADMIN_URL + "?_=" + Date.now();
    f.style.cssText = "flex:1;border:0;background:#f4f7f8;width:100%";
    // "Xarita" bo'limi uchun — lokatsiyasi bor mijozlar ro'yxati (viloyat/
    // tuman ma'lumotlari bilan) shu sahifada (React state) allaqachon bor,
    // shuni bir marta iframe yuklangach ichkariga uzatamiz (postMessage).
    f.addEventListener("load", function () {
      try {
        var payload = window.__ICAN_MAP_DATA__;
        if (payload) f.contentWindow.postMessage({ type: "ican-map-data", payload: payload }, window.location.origin);
      } catch (e) {}
    });
    o.appendChild(f);
    document.body.appendChild(o);
    position(o);
    markActive(true);   // highlight the Telegram bot item, dim the others
    // "load" hodisasini KUTMASDAN, iframe qo'shilgan zahoti boshlaymiz —
    // shunda CSS qoidasi sahifa hali chizilib ulgurmasdan turib qo'yiladi va
    // "yangilaganda bir lahza ko'rinib qolish" (flash) muammosi yo'qoladi.
    startInnerTabPatch(f);
  }

  // Bir qatorning HAQIQIY holatini aniqlaymiz — bu React ilovaning o'zi
  // chizgan "Holat" ustunidagi belgi (<span class="badge on">Faol</span>)
  // asosida, hech narsa "o'ylab topilmaydi": faqat bor ma'lumotni o'qiymiz.
  function rowIsActive(tr) {
    var badge = tr.querySelector(".badge");
    if (!badge) return true;
    if ((badge.className || "").indexOf("on") !== -1) return true;
    return badge.textContent.trim() === "Faol";
  }

  // Jadval qatorlarini joriy qidiruv so'ziga VA tanlangan "Faol/Faolsiz"
  // tabiga qarab ko'rsatish/yashirish.
  function applyFilter(doc) {
    var input = doc.getElementById("tgbot-search-input");
    var wrap = doc.getElementById("tgbot-search-wrap");
    if (!input || !wrap) return;
    var q = input.value.trim().toLowerCase();
    var mode = wrap.getAttribute("data-mode") || "all"; // all | on | off
    var rows = doc.querySelectorAll("table tbody tr");
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      var matchesQ = !q || tr.textContent.toLowerCase().indexOf(q) !== -1;
      var active = rowIsActive(tr);
      var matchesMode = mode === "all" || (mode === "on" && active) || (mode === "off" && !active);
      tr.style.display = (matchesQ && matchesMode) ? "" : "none";
    }
  }

  // Xodimlar bo'limidagi ".fil-search" + ".fil-tabs" uslubiga o'xshash
  // qidiruv maydoni va Faol/Faolsiz tabini jadval ustiga (bir marta)
  // qo'shib qo'yamiz — Filtr tugmasisiz, chunki shunday so'ralgan edi.
  // Bular FAQAT allaqachon chizilgan haqiqiy qatorlarni ko'rsatish/yashirish
  // — hech qanday yangi ma'lumot o'ylab topilmaydi yoki backend'ga
  // murojaat qilinmaydi, shu sabab xavfsiz.
  function ensureSearchBox(doc) {
    if (doc.getElementById("tgbot-search-wrap")) { applyFilter(doc); restyleToggles(doc); return; }
    var table = doc.querySelector("table");
    if (!table || !table.parentNode) return;

    var wrap = doc.createElement("div");
    wrap.id = "tgbot-search-wrap";
    wrap.setAttribute("data-mode", "on");
    wrap.style.cssText =
      "display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #e7eaf2;" +
      "border-radius:14px;padding:10px 14px;margin:0 0 0;box-shadow:0 1px 3px rgba(0,0,0,.05)";
    wrap.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa1b5" stroke-width="2" stroke-linecap="round">' +
      '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>' +
      '<input id="tgbot-search-input" placeholder="Ism, login yoki telefon bo‘yicha qidirish…" ' +
      'style="flex:1;border:none;outline:none;font:600 14px system-ui,sans-serif;background:transparent;color:#1a1c2e;min-width:0" />';

    var rows0 = table.querySelectorAll("tbody tr");
    var onCount = 0;
    for (var i = 0; i < rows0.length; i++) { if (rowIsActive(rows0[i])) onCount++; }
    var offCount = rows0.length - onCount;

    // Xodimlar bo'limidagi kabi 3 ta KPI kartasi (Jami/Faol/Faolsiz) —
    // faqat allaqachon bor qatorlarni sanash, yangi ma'lumot yo'q.
    var kpi = doc.createElement("div");
    kpi.id = "tgbot-kpi";
    kpi.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:0 0 14px";
    var tileCss = "background:#fff;border:1px solid #E4ECEF;border-radius:16px;padding:15px 16px;" +
      "display:flex;flex-direction:column;gap:3px;box-shadow:0 10px 30px -18px rgba(21,58,70,.22)";
    kpi.innerHTML =
      '<div style="' + tileCss + '"><b style="font:900 22px system-ui,sans-serif;color:#243642">' + rows0.length + '</b><span style="font:700 12.5px system-ui,sans-serif;color:#8CA0A8">Jami foydalanuvchi</span></div>' +
      '<div style="' + tileCss + '"><b style="font:900 22px system-ui,sans-serif;color:#46B26C">' + onCount + '</b><span style="font:700 12.5px system-ui,sans-serif;color:#8CA0A8">Faol</span></div>' +
      '<div style="' + tileCss + '"><b style="font:900 22px system-ui,sans-serif;color:#8CA0A8">' + offCount + '</b><span style="font:700 12.5px system-ui,sans-serif;color:#8CA0A8">Faolsiz</span></div>';
    table.parentNode.insertBefore(kpi, table);

    // Xodimlar bo'limidagi kabi FAQAT ikkita tab (Faol/Faolsiz, "Barchasi"
    // yo'q), boshlanishida "Faol" tanlangan bo'ladi.
    var tabs = doc.createElement("div");
    tabs.id = "tgbot-tabs";
    tabs.style.cssText = "display:flex;align-items:center;gap:20px;margin:12px 2px 12px;border-bottom:1px solid #E4ECEF";
    // border-radius:0 — bu tugmalar ilovaning umumiy tugma uslubidan
    // (yumaloq burchak) meros olib, ostidagi chiziq egri ko'rinib qolgan
    // edi; bu yerda aniq to'g'ri chiziq bo'lishi uchun majburlaymiz.
    tabs.innerHTML =
      '<button data-mode="on" style="background:none;border-radius:0!important;border:none;border-bottom:2px solid #2FA9BF;padding:10px 2px;font:800 13.5px system-ui,sans-serif;color:#1B7488;cursor:pointer;margin-bottom:-1px">Faol <span style="color:#8CA0A8">' + onCount + '</span></button>' +
      '<button data-mode="off" style="background:none;border-radius:0!important;border:none;border-bottom:2px solid transparent;padding:10px 2px;font:800 13.5px system-ui,sans-serif;color:#8CA0A8;cursor:pointer;margin-bottom:-1px">Faolsiz <span>' + offCount + '</span></button>';

    table.parentNode.insertBefore(tabs, table);
    table.parentNode.insertBefore(wrap, tabs);

    wrap.querySelector("input").addEventListener("input", function () { applyFilter(doc); });
    var tabBtns = tabs.querySelectorAll("button");
    for (var j = 0; j < tabBtns.length; j++) {
      tabBtns[j].addEventListener("click", function () {
        wrap.setAttribute("data-mode", this.getAttribute("data-mode"));
        for (var t = 0; t < tabBtns.length; t++) {
          var on = tabBtns[t] === this;
          tabBtns[t].style.color = on ? "#1B7488" : "#8CA0A8";
          tabBtns[t].style.borderBottomColor = on ? "#2FA9BF" : "transparent";
        }
        applyFilter(doc);
      });
    }
    restyleToggles(doc);
  }

  // Har bir qatordagi HAQIQIY bloklash/faollashtirish tugmasini (uning
  // asl onclick'i — masalan onclick="toggle('login',false)" — TEGILMAYDI,
  // xuddi shu tugma, xuddi shu funksiyani chaqiraveradi) Xodimlar
  // bo'limidagi ".tgl" svichiga o'xshab ko'rinishga o'zgartiramiz — faqat
  // KO'RINISH, bosilganda ILOVANING O'ZI ishlaydi. Xodimlar bo'limida bu
  // svich ISM ustunidan OLDIN (eng chapda) turadi — shu joyga ko'chiramiz:
  // tugmani o'zi turgan (Amallar) katakchadan olib, qatorning YANGI,
  // eng birinchi katakchasiga o'tkazamiz.
  function restyleToggles(doc) {
    ensureToggleHeaderCell(doc);
    var rows = doc.querySelectorAll("table tbody tr");
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      var btn = tr.querySelector('button[onclick^="toggle("]');
      if (!btn || btn.getAttribute("data-tgl-done")) continue;
      btn.setAttribute("data-tgl-done", "1");
      var active = rowIsActive(tr);
      btn.textContent = "";
      btn.title = active ? "Bloklash" : "Faollashtirish";
      btn.style.cssText =
        "width:44px;height:26px;border-radius:20px;border:none;position:relative;cursor:pointer;" +
        "transition:.15s;flex:0 0 auto;padding:0;background:" + (active ? "#2FA9BF" : "#D7DEE1");
      var knob = doc.createElement("span");
      knob.style.cssText =
        "position:absolute;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;" +
        "transition:.15s;box-shadow:0 1px 3px rgba(0,0,0,.2);left:" + (active ? "21px" : "3px");
      btn.appendChild(knob);

      var tglTd = doc.createElement("td");
      tglTd.appendChild(btn);
      tr.insertBefore(tglTd, tr.firstChild);

      // Xodimlar bo'limidagi kabi eng chapda "№" (qator raqami) ustuni.
      var idxTd = doc.createElement("td");
      idxTd.textContent = String(i + 1);
      idxTd.style.cssText = "color:#8CA0A8;font-weight:800";
      tr.insertBefore(idxTd, tr.firstChild);
    }
  }

  // Jadval boshida (thead) "№" va svich ustunlariga mos katakchalar — Ism
  // ustuni egri chizilib qolmasligi (ustunlar soni to'g'ri kelishi) uchun.
  function ensureToggleHeaderCell(doc) {
    var headRow = doc.querySelector("table thead tr");
    if (!headRow || headRow.getAttribute("data-tgl-th-done")) return;
    headRow.setAttribute("data-tgl-th-done", "1");
    var thTgl = doc.createElement("th");
    headRow.insertBefore(thTgl, headRow.firstChild);
    var thIdx = doc.createElement("th");
    thIdx.textContent = "№";
    headRow.insertBefore(thIdx, headRow.firstChild);
  }

  // "Foydalanuvchilar / Xarita" almashtirgichi va har bir qatordagi
  // "O'chirish" tugmasi bot admin sahifasining O'ZINIKI (React ilova ichida)
  // — biz uning source kodiga ega emasmiz, shu sabab to'g'ridan-to'g'ri
  // o'zgartira olmaymiz. Lekin /telegram-bot/ SHU saytning o'zida (bir xil
  // domenda) joylashgani uchun iframe ICHIGA kirib DOM'ni CSS bilan
  // yashirib/qo'shib qo'yamiz — React kodiga tegmaymiz ("non-invasive").
  //
  // MUHIM: avval bu ikkalasini JS orqali (har 250-400ms'da) qidirib
  // yashirar edik — shu sabab sahifa yangilanganda ular bir lahzaga
  // ko'rinib, keyin yashirinar edi ("flash"). Endi buning o'rniga bitta
  // <style> qoidasi (CSS) qo'shamiz — CSS qoidasi elementlar hali DOM'ga
  // qo'shilmagan bo'lsa ham oldindan "kutib turadi" va ular paydo bo'lishi
  // bilan DARHOL (chizilishidan oldin) yashiradi — flash butunlay yo'qoladi.
  // Bu <style> ni iframe ICHIGA (o'z <head>'iga) qo'shamiz, chunki bizning
  // tashqi styles.css bu yerga umuman ta'sir qilmaydi (alohida hujjat).
  function ensureHideStyle(doc) {
    if (doc.getElementById("tgbot-hide-style")) return;
    if (!doc.head) return;
    var st = doc.createElement("style");
    st.id = "tgbot-hide-style";
    // 1-2 qator: yashirish. 3-qatordan keyingilar — Xodimlar bo'limi bilan
    // vizual uyg'unlik uchun rang/shrift moslashtirish (faqat ko'rinish,
    // xatti-harakatga tegmaymiz — tugmalarning onclick funksiyalari o'zicha
    // ishlayveradi).
    st.textContent =
      ".page-tabs{display:none!important}" +
      // ".page-tabs" ning atasi ".wrap" o'zining padding'iga ega — shu
      // sabab tugmalarni yashirsak ham, atrofidagi bo'sh joy (padding)
      // qolib ketib, sahifa tepasida katta ochiq joy ko'rinar edi.
      ".wrap{padding:0!important;margin:0!important;min-height:0!important}" +
      "table button.danger{display:none!important}" +
      "body{font-family:'Nunito Sans',system-ui,sans-serif!important}" +
      "table thead th{color:#8CA0A8!important;background:#F7FBFC!important;border-bottom:1px solid #E4ECEF!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:.04em!important}" +
      "table tbody td{border-bottom:1px solid #E4ECEF!important;color:#31434F!important}" +
      "table tbody tr:hover{background:#F7FBFC!important}" +
      "table button.ghost{border-radius:10px!important;font-weight:800!important}";
    doc.head.appendChild(st);
  }

  // Panel ochiq turgan davomida doim ishlab turadi (jadval qayta chizilsa —
  // masalan tahrirlash/bloklashdan keyin — ham qidiruv qayta tiklanadi).
  // Agar domen boshqacha bo'lib chiqsa (cross-origin), brauzer
  // contentDocument'ga kirishga yo'l qo'ymaydi — bunda urinish xatosiz,
  // jim tarzda hech narsa qilmay to'xtaydi.
  function startInnerTabPatch(f) {
    var timer = setInterval(function () {
      if (!document.body.contains(f)) { clearInterval(timer); return; }
      var doc;
      try { doc = f.contentDocument || f.contentWindow.document; } catch (e) { clearInterval(timer); return; }
      if (!doc) return;
      ensureHideStyle(doc);
      if (!doc.body) return;
      ensureSearchBox(doc);
    }, 150);
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
    // Klon "Mijozlar" tugmasidan nusxa olingani uchun uning data-view="mijozlar"
    // atributini ham olib keladi. Bosh sahifa shu atribut orqali qaysi tugma
    // "faol (yonib turgan)" ekanini aniqlaydi (setActive()) — shu sabab "Mijozlar"
    // bo'limiga o'tilganda haqiqiy Mijozlar tugmasi bilan birga BU klon ham
    // "yonib" qolar edi. Bu atributni olib tashlab, klonni haqiqiy nav
    // ro'yxatidan butunlay mustaqil qilamiz (faol holati faqat tgbot-open
    // klassi orqali boshqariladi).
    clone.removeAttribute("data-view");
    clone.title = LABEL;
    // boshqa sb-item'lar bilan bir xil struktura: 18x18 stroke SVG + matn,
    // o'rovchi <span> yo'q — shunda .sb-item{gap:12px} boshqa qatorlardagi
    // kabi bir xil joylashuvni beradi va icon rangi ham (currentColor)
    // faol/nofaol holatda avtomatik moslashadi.
    var ICON =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4"/>' +
      '<circle cx="12" cy="3" r="1"/><path d="M9 13v2M15 13v2"/></svg>';
    clone.innerHTML = ICON + " " + LABEL;
    clone.style.cursor = "pointer";
    clone.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      openAdmin();
    });
    row.parentNode.insertBefore(clone, row.nextSibling);
  }

  // Close the panel when the user navigates to ANY other sidebar section.
  document.addEventListener("click", function (e) {
    if (!document.getElementById("tgbot-overlay")) return;
    var me = document.getElementById("tgbot-nav-item");
    if (me && me.contains(e.target)) return;
    var sbItem = e.target.closest ? e.target.closest(".sb-item") : null;
    var item = e.target.closest ? e.target.closest("a,button,li,div") : null;
    var t = item ? (item.textContent || "").trim() : "";
    if (sbItem || t === "Prezintatsiya" || t === "Mijozlar" || t === "Xarita" || t === "Boshqaruv") close();
  }, true);

  function repositionIfOpen() {
    var o = document.getElementById("tgbot-overlay");
    if (o) position(o);
  }
  window.addEventListener("resize", repositionIfOpen);
  // Sarlavha (.dash-top-mini) sahifa bilan birga skroll bo'ladi (u "sticky"
  // emas, statik) — shu sababli overlay balandligini FAQAT ochilish paytida
  // hisoblasak, keyinchalik yuqoriga/pastga skroll qilinganda eski (endi
  // noto'g'ri) qiymat qolib ketadi va Xarita bo'limining tepa qatori
  // (select/tugmalar) ustidan bir oz ko'rinib qoladi. Skroll bo'lganda ham
  // qayta hisoblab, overlay har doim sarlavhaning joriy pastki chetiga
  // yopishib tursin.
  window.addEventListener("scroll", repositionIfOpen, { passive: true });
  document.addEventListener("scroll", repositionIfOpen, true);

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
