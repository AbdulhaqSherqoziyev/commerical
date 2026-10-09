// Moliya → Shartnomalar. DIQQAT: bu sahifadagi shartnomalar ro'yxati va
// "Shartnomalarni o'tkazish" ustasi hozircha namunaviy (demo) ma'lumot bilan
// ishlaydi — moliyaviy backend endpointlari hali ulanmagan. Statusni
// o'zgartirish / o'chirish / ko'chirish amallari faqat shu komponent
// xotirasida bajariladi (sahifa yangilanganda dastlabki holatga qaytadi).
import { qs, on, escapeHtml } from '../core.js'
import { demoNote } from './demo-kit.js'

const IC_SEARCH = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`
const IC_DL = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>`
const IC_UP = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>`
const IC_CHEV = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`

// [raqam, do'kon, firma, FISH, summa, kechikish summasi, davr (oy), status, yaratilgan]
const ROWS = [
  ['#3000667374','555 ELEGANT MOBILE','OK "555 ELEGANT MOBILE"',"Mavluda Tursunova To'rayeva",'19 500 000',0,'1','Aktiv','30.07 · 13:31'],
  ['#3000667373','Apple Nukus','ALI XAN GROUP MCHJ','Janibek Usenbaev Jaqqsiliq uli','4 100 000',0,'12','Aktiv','30.07 · 13:30'],
  ['#3000667372','iCASE_SHOX','YaTT "IBRAGIMOV SH.A."',"Akramjon Salimov Alisher o'g'li",'5 200 000',0,'4','Aktiv','30.07 · 13:30'],
  ['#3000667371','Javohir market','OOO "JAVOXIR LYUKS"','Quvondiq Berdiyev Hasanovich','1 750 000',0,'4','Tasdiqlash kutilmoqda','30.07 · 13:30'],
  ['#3000667370','SEVEN MOBILE','YaTT "OXUNOV X.SH."','Nasibaxon Abdurashidova Kobiljonovna','2 890 000',0,'10','Aktiv','30.07 · 13:26'],
  ['#3000667369','The_X_Mobile','YaTT "NASIMOV S.A."','Sabina Karimova Sabuldjanovna','10 625 000',0,'6','Aktiv','30.07 · 13:25'],
  ['#3000667368','IMRON2','OOO "IMRONBEK JASURBEK KELAJAGI"',"Muxtaramxon Yo'ldosheva Nishonboy qizi",'4 326 000',260000,'6','Aktiv','30.07 · 13:25'],
  ['#3000667367','SUSAMBIL','MCHJ "SUSAMBIL 1224"','Maxsuda Abduraxmonova Numonovna','3 840 000',0,'12','Muvaffaqiyatli tugatildi','30.07 · 13:20'],
  ['#3000667366','EL MART 1','OOO "EL-MART MUDDATLI TO\'LOV" 1','Elmurod Gaybullayev Rustmajon ugli','15 000 000',0,'6','Bekor qilingan','30.07 · 13:20'],
]

const FILTERS = ['Hammasi','Aktiv','Tasdiqlash kutilmoqda','Muvaffaqiyatli tugatildi','Bekor qilingan']
const STATUS_CLS = {
  'Aktiv':'green',
  'Tasdiqlash kutilmoqda':'amber',
  'Muvaffaqiyatli tugatildi':'teal',
  'Bekor qilingan':'mut',
}

const FIRMS_SEED = [
  { name:'Techno Plaza', contracts:[['#3000661201','Aziz Karimov Baxtiyorovich','12 400 000'],['#3000661187','Dilnoza Rahimova Anvarovna','8 900 000'],['#3000661154',"Jasur To'xtayev Olimovich",'15 200 000'],['#3000661102','Malika Yusupova Shavkatovna','6 750 000']] },
  { name:'Idea Market', contracts:[['#3000660954','Sardor Aliyev Muratovich','9 480 000'],['#3000660911','Nigora Islomova Karimovna','4 320 000'],['#3000660877',"Bobur Ergashev Toshpo'latovich",'21 300 000']] },
  { name:'Mobile House', contracts:[['#3000660712','Kamola Saidova Rustamovna','7 850 000'],['#3000660698',"Otabek Nazarov G'ayratovich",'11 600 000'],['#3000660645','Zilola Xasanova Ismoilovna','3 940 000'],['#3000660601','Farrux Qodirov Akmalovich','18 750 000']] },
  { name:'Smart Savdo', contracts:[['#3000660512',"Gulnora Mirzayeva To'lqinovna",'5 400 000'],['#3000660488','Shohruh Berdiyev Nematovich','13 200 000']] },
  { name:'Premium Store', contracts:[['#3000660390','Umida Tosheva Baxromovna','10 100 000'],['#3000660355','Javlon Raximov Sobirovich','9 300 000'],['#3000660321','Sevara Abdullayeva Ilhomovna','16 400 000']] },
]

const toNum = s => Number(String(s).replace(/[^\d]/g,'')) || 0
const firmSum = f => (f.contracts.reduce((a,c)=>a+toNum(c[2]), 0) / 1e6).toFixed(1)

export function mountShartnomalar(root, { toast }){
  let tab = 'list'                 // 'list' | 'transfer'
  // --- ro'yxat holati ---
  let rows = ROWS.map(r=>({ id:r[0], shop:r[1], firm:r[2], fish:r[3], summa:r[4], overdue:r[5], davr:r[6], status:r[7], date:r[8] }))
  let filter = 'Hammasi'
  let menuOpen = null
  let sq = { num:'', fish:'', pass:'' }
  let applied = { num:'', fish:'' }
  // --- o'tkazish (transfer) holati ---
  let inner = 'move'               // 'move' | 'history'
  let firms = FIRMS_SEED.map(f=>({ name:f.name, contracts:f.contracts.map(c=>c.slice()) }))
  let openFirm = null
  let sel = new Set()
  let target = null
  let firmQ = ''
  let targetQ = ''
  let history = []
  let histOpen = null
  let focusId = null

  const visibleRows = ()=> rows.filter(r=>{
    if(filter !== 'Hammasi' && r.status !== filter) return false
    if(applied.num && !r.id.toLowerCase().includes(applied.num.trim().toLowerCase())) return false
    if(applied.fish && !r.fish.toLowerCase().includes(applied.fish.trim().toLowerCase())) return false
    return true
  })
  const countOf = f => f === 'Hammasi' ? rows.length : rows.filter(r=>r.status===f).length

  // ---------- ro'yxat ----------
  function listHtml(){
    const shown = visibleRows()
    return `
      <div class="mol-ctr-tiles">
        <div class="mol-tilecard"><span>Jami shartnomalar</span><b>663 027</b></div>
        <div class="mol-tilecard teal"><span>Faol</span><b>10 533</b></div>
        <div class="mol-tilecard amber"><span>Tasdiqlash kutilmoqda</span><b>214</b></div>
        <div class="mol-tilecard red"><span>Muddati o'tgan</span><b>339</b></div>
      </div>

      <div class="mol-card">
        <div class="mol-pill-row">
          ${FILTERS.map(f=>`<button type="button" class="mol-pill mol-pill-out${f===filter?' on':''}" data-filter="${escapeHtml(f)}">${escapeHtml(f)} <em>${countOf(f)}</em></button>`).join('')}
        </div>

        <div class="mol-filter-row">
          <input class="mol-inp" id="mol-q-num" placeholder="Shartnoma raqami" value="${escapeHtml(sq.num)}" />
          <input class="mol-inp" id="mol-q-fish" placeholder="FISH" value="${escapeHtml(sq.fish)}" />
          <input class="mol-inp" id="mol-q-pass" placeholder="Passport" value="${escapeHtml(sq.pass)}" />
          <button type="button" class="mol-btn ghost" id="mol-q-reset">↺ Qayta o'rnatish</button>
          <button type="button" class="mol-btn" id="mol-q-apply">Qo'llash</button>
        </div>

        <div style="overflow-x:auto">
          <table class="mol-table mol-ctr-table">
            <thead><tr>
              <th>№</th><th>Raqam</th><th>Kompaniya</th><th>FISH</th>
              <th class="num">Summa</th><th class="num">Kechikish</th><th class="num">Davr</th>
              <th>Status</th><th class="num">Yaratilgan</th><th></th>
            </tr></thead>
            <tbody>
              ${shown.length ? shown.map((r,i)=>`
                <tr>
                  <td style="color:var(--mut);font-weight:800">${i+1}</td>
                  <td><span class="mol-idbadge">${escapeHtml(r.id)}</span></td>
                  <td><div style="font:800 12.5px system-ui,sans-serif;color:var(--ink)">${escapeHtml(r.shop)}</div><div style="font:600 11px system-ui,sans-serif;color:var(--mut);margin-top:2px">${escapeHtml(r.firm)}</div></td>
                  <td>${escapeHtml(r.fish)}</td>
                  <td class="num" style="font-weight:800;color:var(--ink)">${escapeHtml(r.summa)}</td>
                  <td class="num">${r.overdue > 0
                    ? `<span class="mol-st red">${(r.overdue/1000).toFixed(0)} ming</span>`
                    : `<span class="mol-st mut">0</span>`}</td>
                  <td class="num">${escapeHtml(r.davr)}</td>
                  <td><span class="mol-st ${STATUS_CLS[r.status]||'mut'}">${escapeHtml(r.status)}</span></td>
                  <td class="num" style="color:var(--mut)">${escapeHtml(r.date)}</td>
                  <td class="num">
                    <span class="mol-menu-wrap">
                      <button type="button" class="mol-dots" data-menu="${escapeHtml(r.id)}" title="Amallar">⋮</button>
                      ${menuOpen === r.id ? `
                        <span class="mol-menu">
                          <button type="button" data-act="view" data-id="${escapeHtml(r.id)}">Shartnomani ko'rish</button>
                          <button type="button" data-act="activate" data-id="${escapeHtml(r.id)}">Aktiv qilish</button>
                          <button type="button" data-act="cancel" data-id="${escapeHtml(r.id)}">Bekor qilish</button>
                          <span class="mol-menu-sep"></span>
                          <button type="button" class="danger" data-act="delete" data-id="${escapeHtml(r.id)}">O'chirish</button>
                        </span>` : ''}
                    </span>
                  </td>
                </tr>`).join('')
                : `<tr><td colspan="10" style="text-align:center;color:var(--mut);padding:40px 0;font-weight:700">Shartnoma topilmadi</td></tr>`}
            </tbody>
          </table>
        </div>

        <div class="mol-pager">
          <span>${shown.length} ta ko'rsatilmoqda · jami 663 027</span>
          <span class="mol-pager-nav">
            <button type="button" class="mol-pg" data-page="prev">‹</button>
            <button type="button" class="mol-pg on" data-page="1">1</button>
            <button type="button" class="mol-pg" data-page="2">2</button>
            <button type="button" class="mol-pg" data-page="3">3</button>
            <button type="button" class="mol-pg" data-page="next">›</button>
            <button type="button" class="mol-pg mol-pg-size" data-page="size">10 ⌄</button>
          </span>
        </div>
      </div>
    `
  }

  // ---------- o'tkazish ----------
  function moveHtml(){
    const src = openFirm != null ? firms[openFirm] : null
    const firmList = firms.filter(f=> f.name.toLowerCase().includes(firmQ.trim().toLowerCase()))
    const targets = firms
      .map((f,i)=>({ f, i }))
      .filter(x=> x.i !== openFirm && x.f.name.toLowerCase().includes(targetQ.trim().toLowerCase()))

    if(!src){
      return `
        <div class="mol-card">
          <div class="mol-step"><span class="mol-step-badge">1</span><span class="mol-step-t">Qaysi firmadan ko'chiriladi?</span></div>
          <div class="mol-search">${IC_SEARCH}<input id="mol-firm-q" placeholder="Firma nomini qidiring…" value="${escapeHtml(firmQ)}" /></div>
          <div class="mol-firm-grid">
            ${firmList.length ? firmList.map(f=>{
              const idx = firms.indexOf(f)
              return `<button type="button" class="mol-firm" data-firm="${idx}">
                <span class="mol-firm-av">${escapeHtml((f.name[0]||'?').toUpperCase())}</span>
                <span style="min-width:0"><b>${escapeHtml(f.name)}</b><small>${f.contracts.length} ta shartnoma · ${firmSum(f)} mln</small></span>
              </button>`
            }).join('') : `<div style="color:var(--mut);font-weight:700;font-size:13px;padding:20px 4px">Firma topilmadi</div>`}
          </div>
        </div>
      `
    }

    const canMove = sel.size > 0 && target != null
    return `
      <div class="mol-card">
        <button type="button" class="mol-back" id="mol-back-firms">← Firmalar ro'yxati</button>
        <div class="mol-step" style="margin-top:14px">
          <span class="mol-step-badge">2</span>
          <span class="mol-step-t">Ko'chiriladigan shartnomalarni belgilang · ${escapeHtml(src.name)}</span>
          <button type="button" class="mol-btn ghost" id="mol-sel-all" style="margin-left:auto">
            ${sel.size === src.contracts.length && src.contracts.length ? 'Tanlovni bekor qilish' : 'Hammasini tanlash'}
          </button>
        </div>
        ${src.contracts.length ? src.contracts.map(c=>`
          <div class="mol-crow${sel.has(c[0])?' on':''}" data-contract="${escapeHtml(c[0])}">
            <span class="mol-chk">✓</span>
            <span class="mol-idbadge">${escapeHtml(c[0])}</span>
            <span style="font:700 12.5px system-ui,sans-serif;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c[1])}</span>
            <b style="margin-left:auto;font:800 12.5px system-ui,sans-serif;color:var(--ink);white-space:nowrap">${escapeHtml(c[2])}</b>
          </div>`).join('') : `<div style="color:var(--mut);font-weight:700;font-size:13px;padding:16px 4px">Bu firmada shartnoma qolmadi</div>`}
      </div>

      <div class="mol-card">
        <div class="mol-step"><span class="mol-step-badge">3</span><span class="mol-step-t">Qaysi firmaga ko'chirilsin?</span></div>
        ${target != null
          ? `<div style="margin-bottom:14px"><span class="mol-chip">${escapeHtml(firms[target].name)}<button type="button" id="mol-clear-target" title="Bekor qilish">✕</button></span></div>`
          : `<div class="mol-search">${IC_SEARCH}<input id="mol-target-q" placeholder="Qabul qiluvchi firmani qidiring…" value="${escapeHtml(targetQ)}" /></div>
             <div class="mol-firm-grid">
               ${targets.length ? targets.map(x=>`
                 <button type="button" class="mol-firm" data-target="${x.i}">
                   <span class="mol-firm-av">${escapeHtml((x.f.name[0]||'?').toUpperCase())}</span>
                   <span style="min-width:0"><b>${escapeHtml(x.f.name)}</b><small>${x.f.contracts.length} ta shartnoma · ${firmSum(x.f)} mln</small></span>
                 </button>`).join('') : `<div style="color:var(--mut);font-weight:700;font-size:13px;padding:20px 4px">Firma topilmadi</div>`}
             </div>`}
        <div class="mol-move-foot">
          <span>${sel.size === 0
            ? "Ko'chirish uchun shartnomalarni belgilang"
            : target == null
              ? `${sel.size} ta shartnoma tanlandi — endi firmani tanlang`
              : `${sel.size} ta shartnoma: ${escapeHtml(src.name)} → ${escapeHtml(firms[target].name)}`}</span>
          <button type="button" class="mol-btn" id="mol-do-move" ${canMove?'':'disabled'}>Ko'chirish →</button>
        </div>
      </div>
    `
  }

  function historyHtml(){
    if(!history.length){
      return `<div class="mol-card"><div class="mol-hist-empty">Hozircha ko'chirishlar tarixi bo'sh — «Shartnomalarni ko'chirish» tab'idan boshlang</div></div>`
    }
    return `
      <div class="mol-card">
        ${history.map((h,i)=>`
          <div class="mol-hist" data-hist="${i}">
            <span class="mol-firm-av" style="width:36px;height:36px;border-radius:12px;font-size:13px">${h.count}</span>
            <span style="min-width:0">
              <b style="display:block;font:800 13px system-ui,sans-serif;color:var(--ink)">${h.count} ta shartnoma</b>
              <small style="font:600 11.5px system-ui,sans-serif;color:var(--mut)">${escapeHtml(h.date)} · ${escapeHtml(h.time)}</small>
            </span>
            <span style="margin-left:auto;display:flex;align-items:center;gap:8px">
              <span class="mol-st mut">${escapeHtml(h.from)}</span>
              <span style="color:var(--mut)">→</span>
              <span class="mol-st teal">${escapeHtml(h.to)}</span>
              <span class="mol-hist-chev${histOpen===i?' on':''}">${IC_CHEV}</span>
            </span>
          </div>
          ${histOpen === i ? `
            <div class="mol-hist-panel">
              <table class="mol-table">
                <thead><tr><th>Shartnoma №</th><th>FISH</th><th class="num">Summa</th></tr></thead>
                <tbody>
                  ${h.items.map(c=>`<tr><td><span class="mol-idbadge">${escapeHtml(c[0])}</span></td><td>${escapeHtml(c[1])}</td><td class="num" style="font-weight:800;color:var(--ink)">${escapeHtml(c[2])}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>` : ''}
        `).join('')}
      </div>
    `
  }

  function transferHtml(){
    return `
      <div class="mol-pill-row" style="margin-bottom:16px">
        <button type="button" class="mol-pill mol-pill-out${inner==='move'?' on':''}" data-inner="move">Shartnomalarni ko'chirish</button>
        <button type="button" class="mol-pill mol-pill-out${inner==='history'?' on':''}" data-inner="history">Tarix · ${history.length}</button>
      </div>
      ${inner === 'move' ? moveHtml() : historyHtml()}
    `
  }

  // ---------- chizish ----------
  function render(){
    root.innerHTML = `
      <div class="mol-page" id="mol-ctr">
        <div class="mol-page-head">
          <div>
            <div class="mol-h1">Shartnomalar</div>
            <div class="mol-sub">663 027 ta shartnoma · barcha filiallar</div>
          </div>
          <div class="mol-head-actions">
            <button type="button" class="mol-btn ghost" data-toast="Namuna fayl tez orada qo'shiladi">${IC_DL} Namuna yuklab olish</button>
            <button type="button" class="mol-btn" data-toast="Import qilish tez orada qo'shiladi">${IC_UP} Import qilish</button>
          </div>
        </div>
        ${demoNote("Namuna (demo) ma'lumot — shartnomalar backendi hali ulanmagan. Jadval, filtr va sahifalash ishlaydi, lekin o'zgarishlar saqlanmaydi.")}

        <div class="mol-pillgroup" style="margin-bottom:16px">
          <button type="button" class="mol-pill${tab==='list'?' on':''}" data-tab="list">Shartnomalar ro'yxati</button>
          <button type="button" class="mol-pill${tab==='transfer'?' on':''}" data-tab="transfer">Shartnomalarni o'tkazish</button>
        </div>

        ${tab === 'list' ? listHtml() : transferHtml()}
      </div>
    `
    wire()
  }

  function wire(){
    const page = qs('#mol-ctr', root)
    if(!page) return

    on(page, 'click', '[data-toast]', (e, el)=> toast(el.dataset.toast))
    on(page, 'click', '[data-tab]', (e, el)=>{ tab = el.dataset.tab; menuOpen = null; render() })

    // --- ro'yxat ---
    on(page, 'click', '[data-filter]', (e, el)=>{ filter = el.dataset.filter; menuOpen = null; render() })
    on(page, 'click', '[data-menu]', (e, el)=>{
      e.stopPropagation()
      const id = el.dataset.menu
      menuOpen = (menuOpen === id) ? null : id
      render()
    })
    on(page, 'click', '[data-act]', (e, el)=>{
      e.stopPropagation()
      const id = el.dataset.id
      const act = el.dataset.act
      const row = rows.find(r=>r.id===id)
      menuOpen = null
      if(act === 'view'){ toast("Shartnoma kartasi tez orada qo'shiladi"); render(); return }
      if(!row){ render(); return }
      if(act === 'activate'){ row.status = 'Aktiv'; toast('Shartnoma aktiv qilindi') }
      else if(act === 'cancel'){ row.status = 'Bekor qilingan'; toast('Shartnoma bekor qilindi') }
      else if(act === 'delete'){ rows = rows.filter(r=>r.id!==id); toast("O'chirildi") }
      render()
    })
    on(page, 'click', '[data-page]', (e, el)=>{
      if(el.dataset.page !== '1') toast("Sahifalash tez orada backendga ulanadi")
    })

    const qNum = qs('#mol-q-num', page), qFish = qs('#mol-q-fish', page), qPass = qs('#mol-q-pass', page)
    if(qNum) qNum.addEventListener('input', ()=>{ sq.num = qNum.value })
    if(qFish) qFish.addEventListener('input', ()=>{ sq.fish = qFish.value })
    if(qPass) qPass.addEventListener('input', ()=>{ sq.pass = qPass.value })
    const applyBtn = qs('#mol-q-apply', page)
    if(applyBtn) applyBtn.addEventListener('click', ()=>{
      applied = { num:sq.num, fish:sq.fish }
      if(sq.pass.trim()) toast("Passport bo'yicha qidiruv tez orada qo'shiladi")
      menuOpen = null
      render()
    })
    const resetBtn = qs('#mol-q-reset', page)
    if(resetBtn) resetBtn.addEventListener('click', ()=>{
      sq = { num:'', fish:'', pass:'' }; applied = { num:'', fish:'' }; filter = 'Hammasi'; menuOpen = null
      render()
    })

    // --- o'tkazish ---
    on(page, 'click', '[data-inner]', (e, el)=>{ inner = el.dataset.inner; render() })
    on(page, 'click', '[data-firm]', (e, el)=>{
      openFirm = Number(el.dataset.firm); sel = new Set(); target = null; targetQ = ''
      render()
    })
    on(page, 'click', '[data-target]', (e, el)=>{ target = Number(el.dataset.target); render() })
    on(page, 'click', '[data-contract]', (e, el)=>{
      const id = el.dataset.contract
      if(sel.has(id)) sel.delete(id); else sel.add(id)
      render()
    })
    on(page, 'click', '[data-hist]', (e, el)=>{
      const i = Number(el.dataset.hist)
      histOpen = (histOpen === i) ? null : i
      render()
    })

    const back = qs('#mol-back-firms', page)
    if(back) back.addEventListener('click', ()=>{ openFirm = null; sel = new Set(); target = null; render() })

    const selAll = qs('#mol-sel-all', page)
    if(selAll) selAll.addEventListener('click', ()=>{
      const src = firms[openFirm]
      if(!src) return
      if(sel.size === src.contracts.length) sel = new Set()
      else sel = new Set(src.contracts.map(c=>c[0]))
      render()
    })

    const clearTarget = qs('#mol-clear-target', page)
    if(clearTarget) clearTarget.addEventListener('click', ()=>{ target = null; render() })

    const firmQEl = qs('#mol-firm-q', page)
    if(firmQEl) firmQEl.addEventListener('input', ()=>{ firmQ = firmQEl.value; focusId = 'mol-firm-q'; render() })
    const targetQEl = qs('#mol-target-q', page)
    if(targetQEl) targetQEl.addEventListener('input', ()=>{ targetQ = targetQEl.value; focusId = 'mol-target-q'; render() })

    const doMove = qs('#mol-do-move', page)
    if(doMove) doMove.addEventListener('click', ()=>{
      const src = firms[openFirm]
      if(!src || target == null || !sel.size) return
      const moved = src.contracts.filter(c=>sel.has(c[0]))
      if(!moved.length) return
      src.contracts = src.contracts.filter(c=>!sel.has(c[0]))
      const dst = firms[target]
      dst.contracts = moved.concat(dst.contracts)
      const d = new Date()
      const p = x => String(x).padStart(2,'0')
      history.unshift({
        date: `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()}`,
        time: `${p(d.getHours())}:${p(d.getMinutes())}`,
        count: moved.length, from: src.name, to: dst.name, items: moved,
      })
      toast(`${moved.length} ta shartnoma ko'chirildi`)
      sel = new Set(); target = null; openFirm = null; targetQ = ''; histOpen = null
      inner = 'history'
      render()
    })

    // qidiruv maydonlariga fokusni qaytarish (qayta chizishdan keyin)
    if(focusId){
      const el = qs('#' + focusId, page)
      focusId = null
      if(el){ el.focus(); const v = el.value; el.value = ''; el.value = v }
    }

  }

  function onDocClick(){
    if(menuOpen != null){ menuOpen = null; render() }
  }
  document.addEventListener('click', onDocClick)

  render()

  return function cleanup(){
    document.removeEventListener('click', onDocClick)
  }
}
