import { api } from '../api.js'
import { qs, qsa, on, escapeHtml } from '../core.js'
import { fmtSum } from '../products.js'
import { getEffectiveSalary, setLocalSalary } from '../staffSalary.js'
import { dayStatus, rowSummary, ymNow, MONTHS_UZ } from './tabel.js'
import { computeRow, ledgerForStaff, addLedgerEntry, loadLedger, KIND_LABEL, PAY_METHOD_LABEL, fmtHistDate } from './payroll.js'
import { getPayrollSettings } from './settings.js'
import { loadDeals, clientName } from './crm.js'

const IC_SEARCH = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`
const IC_FILTER = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>`
const IC_EDIT = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`
const IC_TRASH = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`
const IC_EYE = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function fmtDate(ts){ if(!ts) return '—'; const d=new Date(ts); const p=x=>String(x).padStart(2,'0'); return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} - ${p(d.getHours())}:${p(d.getMinutes())}` }

// Demo (na'muna) xodimlar — "Tabel"/"Ish haqi to'lovlari" bo'limlari bo'sh
// ko'rinmasligi uchun, foydalanuvchi so'rovi bilan qo'shiladi. Haqiqiy
// xodimlar bilan bir xil "+ Qo'shish" API orqali yaratiladi.
const DEMO_STAFF = [
  { firstName:'Aziz', lastName:'Sharipov', position:'Menejer', department:'Menejer', phone:'+998 90 111 11 01', login:'aziz.sharipov', salary:6500000 },
  { firstName:'Shahnoza', lastName:'Yusupova', position:'Menejer', department:'Menejer', phone:'+998 90 111 11 02', login:'shahnoza.yusupova', salary:6200000 },
  { firstName:'Diyorbek', lastName:'Ismoilov', position:'Kassir', department:'Kassa', phone:'+998 90 111 11 03', login:'diyorbek.ismoilov', salary:3200000 },
  { firstName:'Islom', lastName:"Toshpo'latov", position:'Kassir', department:'Kassa', phone:'+998 90 111 11 07', login:'islom.toshpolatov', salary:3100000 },
  { firstName:'Gulnora', lastName:'Rasulova', position:'Sotuvchi', department:'Sotuvchilar', phone:'+998 90 111 11 08', login:'gulnora.rasulova', salary:3200000 },
  { firstName:'Feruza', lastName:'Nabiyeva', position:'Bugalter', department:'Buxgalteriya', phone:'+998 90 111 11 10', login:'feruza.nabiyeva', salary:4200000 },
]
const DEMO_PASSWORD = 'Demo12345'

function hashStr(s){
  let h = 0
  const str = String(s||'')
  for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0 }
  return Math.abs(h)
}

// "Bonusni kartaga chiqarish" — xodim hero kartasidagi "Olinadigan Oylik"
// bloki uchun. Faqat BONUS (Ustanovka/Undiruv/qo'lda berilgan bonus)
// chiqariladi — asosiy oylik bu orqali chiqarilmaydi (u Ish haqi to'lovlari
// bo'limida to'lanadi). Kartalar va chiqarish tarixi — Payroll/Undiruv
// bo'limlaridagi kabi localStorage'da (real backend hali ulanmagan).
const WD_CARDS_KEY = 'zood-staff-wd-cards'
const WD_HIST_KEY = 'zood-staff-wd-history'
function groupDigits(v, max){ return String(v||'').replace(/\D/g,'').slice(0,max).replace(/(.{4})/g,'$1 ').trim() }
function genWid(){ return 'wd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8) }
function loadWdCards(){ try{ return JSON.parse(localStorage.getItem(WD_CARDS_KEY) || '{}') }catch(e){ return {} } }
function saveWdCards(obj){ try{ localStorage.setItem(WD_CARDS_KEY, JSON.stringify(obj)) }catch(e){} }
function loadWdHistory(){ try{ return JSON.parse(localStorage.getItem(WD_HIST_KEY) || '[]') }catch(e){ return [] } }
function saveWdHistory(arr){ try{ localStorage.setItem(WD_HIST_KEY, JSON.stringify(arr)) }catch(e){} }
function cardsForStaff(staffId){ return loadWdCards()[staffId] || [] }
function wdHistoryForStaff(staffId){ return loadWdHistory().filter(w=>w.staffId===staffId).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')) }
function wdWithdrawnThisMonth(staffId){
  const ym = new Date().toISOString().slice(0,7)
  return loadWdHistory().filter(w=>w.staffId===staffId && String(w.createdAt||'').slice(0,7)===ym).reduce((a,w)=>a+(w.amount||0),0)
}

// "Sotuv ko'rsatkichlari" — CRM Kanbandagi (crm.js) murojaat (deal) yozuvlari
// managerName maydoni orqali shu xodimning ismiga (Ism Familiya) mos kelsa,
// haqiqiy sotuv ko'rsatkichlari hisoblanadi (crm-stats.js/crm-sotuv.js bilan
// bir xil formula: Ulangan firma = "Muammo yechildi" bosqichiga yetgan
// murojaat). Mos murojaat topilmasa (masalan kassir/bugalter kabi sotuvga
// aloqasi yo'q xodim) — bo'lim umuman ko'rsatilmaydi, shu bilan mavjud
// "Bonus/Avans/Amallar tarixi" bilan chalkashib ketmaydi.
// Firma nomi — bitim haqiqiy mijozga (clientId) bog'langan bo'lsa clients
// ro'yxatidagi nomi (crm.js dagi bilan bir xil clientName()), aks holda lead
// sifatida kiritilgan ism/firma nomi (leadName) — HECH QACHON murojaat
// sarlavhasi (title, masalan "Balans noto'g'ri ko'rsatilmoqda") ishlatilmaydi.
// To'langan/qoldiq/bonus — CRM da to'lov bosqichi hali kuzatilmagani uchun har
// bir bitim uchun barqaror (hashStr bilan) namuna ulush hisoblanadi.
function salesStatsFor(s, clients){
  const fullName = [s.firstName, s.lastName].filter(Boolean).join(' ').trim().toLowerCase()
  if(!fullName) return null
  const deals = loadDeals().filter(d => String(d.managerName||'').trim().toLowerCase() === fullName)
  if(!deals.length) return null
  const cmap = new Map((clients||[]).map(c=>[c.id, c]))
  const resolved = deals.filter(d=>d.stage==='resolved')
  const totalAmount = resolved.reduce((a,d)=>a+(d.amount||0),0)
  const conv = Math.round(resolved.length / deals.length * 100)
  const ym = new Date().toISOString().slice(0,7)
  const monthResolved = resolved.filter(d => String(d.createdAt||'').slice(0,7) === ym)
  const monthAmount = monthResolved.reduce((a,d)=>a+(d.amount||0),0)
  const withFirm = resolved.map(d=>{
    const c = d.clientId ? cmap.get(d.clientId) : null
    const firmName = c ? clientName(c) : (d.leadName || 'Nomsiz mijoz')
    const amount = d.amount || 0
    const pct = 50 + (hashStr(d.id) % 46) // 50–95% — namuna to'lov ulushi
    const paid = Math.round(amount * pct / 100)
    const remaining = Math.max(0, amount - paid)
    const bonus = Math.round(paid * 0.10)
    return { ...d, firmName, amount, paid, remaining, bonus }
  })
  const topDeals = [...withFirm].sort((a,b)=>b.amount-a.amount).slice(0,6)
  const maxAmt = Math.max(1, ...topDeals.map(d=>d.amount))
  const topTotals = topDeals.reduce((a,d)=>({ amount:a.amount+d.amount, paid:a.paid+d.paid, remaining:a.remaining+d.remaining, bonus:a.bonus+d.bonus }), { amount:0, paid:0, remaining:0, bonus:0 })
  return { totalDeals: deals.length, resolvedCount: resolved.length, totalAmount, conv, resolvedDeals: resolved, monthResolved, monthAmount, topDeals, maxAmt, topTotals }
}

function pagerNums(page, pageCount){
  const out=[]
  if(pageCount<=7){ for(let i=1;i<=pageCount;i++) out.push(i); return out }
  out.push(1)
  let a=Math.max(2,page-1), b=Math.min(pageCount-1,page+1)
  if(page<=3){ a=2; b=4 }
  if(page>=pageCount-2){ a=pageCount-3; b=pageCount-1 }
  if(a>2) out.push('…l')
  for(let i=a;i<=b;i++) out.push(i)
  if(b<pageCount-1) out.push('…r')
  out.push(pageCount)
  return out
}
function renderPagerHtml(page, pageCount, pageSize, total){
  const from = total===0 ? 0 : (page-1)*pageSize + 1
  const to = Math.min(total, page*pageSize)
  return `
    <div class="pager">
      <div class="pager-info">${from}–${to} / ${total} ta</div>
      <div class="pager-nav">
        <button class="pg" data-page="${Math.max(1,page-1)}" ${page<=1?'disabled':''} aria-label="Oldingi">‹</button>
        ${pagerNums(page,pageCount).map(n=> typeof n==='number'
          ? `<button class="pg${n===page?' on':''}" data-page="${n}">${n}</button>`
          : `<span class="pg-gap">…</span>`).join('')}
        <button class="pg" data-page="${Math.min(pageCount,page+1)}" ${page>=pageCount?'disabled':''} aria-label="Keyingi">›</button>
      </div>
      <select class="pager-size" id="st-page-size">
        ${[10,25,50,100].map(s=>`<option value="${s}" ${pageSize===s?'selected':''}>${s} / sahifa</option>`).join('')}
      </select>
    </div>
  `
}

// Dashboard.jsx'ning "Xodimlar" bo'limining vanilla JS ko'chirmasi
// (StaffView.jsx): xodimlar ro'yxati + StaffForm modal + DeptManager modal.
// Ilgari bu joylarda emoji (💳 ✈ 🔄 …) ishlatilgan edi. Windows ularni
// rangsiz belgi shrifti bilan chizadi — natijada tugmalarda qandaydir
// tirechaga o'xshash, sifatsiz belgi ko'rinardi. Endi sahifaning qolgan
// ikonkalari bilan bir xil chiziqli SVG.
const IC_CARD = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>`
const IC_PLUS = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`
const IC_MINUS = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>`
const IC_WALLET = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h12v4"/><rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="17" cy="13" r="1.4"/></svg>`

export function mountStaff(root, { toast }){
  let staff = null, err = ''
  let depts = []
  let managingDepts = false
  let editing = null // null | 'new' | staff-obj
  let viewing = null // null | staff-obj (Ko'rish uchun)
  let q = '', fDept = '', fRole = ''
  let showFilter = false
  let tab = 'on'
  let page = 1, pageSize = 10
  let formState = null // StaffForm uchun vaqtinchalik holat
  let deptState = null // DeptManager uchun vaqtinchalik holat
  let giveOpen = null // null | 'bonus' | 'avans' (Xodim ko'rish sahifasidagi tezkor amal)
  let giveAmount = ''
  let clients = null // "Sotuv ko'rsatkichlari" uchun — bitim haqiqiy mijozga bog'langanda firma nomini aniqlash uchun
  let withdrawOpen = false // "Bonusni kartaga chiqarish" modali ochiqmi
  let withdrawState = null // { cardId, amount, addCard, cardNumber, cardExpiry, cardPhone, err }

  async function load(){ try{ staff = await api.staffList(); err = '' }catch(ex){ err = ex.error||'Xatolik' } render() }
  async function loadDepts(){ try{ depts = await api.deptList() }catch(e){} }
  async function loadClients(){ try{ clients = await api.clientsList() }catch(e){ clients = [] } if(viewing) render() }

  async function seedDemoStaff(){
    toast("Demo xodimlar qo'shilmoqda…")
    try{
      const existing = new Set((depts||[]).map(d=>d.name))
      const neededDepts = [...new Set(DEMO_STAFF.map(d=>d.department))]
      for(const name of neededDepts){ if(!existing.has(name)){ try{ await api.deptCreate(name) }catch(e){} } }
      await loadDepts()
      for(const d of DEMO_STAFF){
        try{
          const created = await api.staffCreate({ firstName:d.firstName, lastName:d.lastName, login:d.login, position:d.position, phone:d.phone, department:d.department, role:'xodim', sip:'', password:DEMO_PASSWORD, salary:d.salary })
          // Backend "salary"ni saqlamasligi mumkin — shu sabab zaxira sifatida localStorage'ga ham yozib qo'yamiz.
          setLocalSalary((created && (created.id||created.login)) || d.login, d.salary)
        }catch(e){ /* login band bo'lsa — o'tkazib yuboriladi */ }
      }
      toast("Demo xodimlar qo'shildi")
    }catch(e){ toast('Xatolik yuz berdi') }
    load()
  }

  function computeShown(){
    const ql = q.trim().toLowerCase()
    return (staff||[])
      .filter(s => tab==='on' ? s.active : !s.active)
      .filter(s => !fDept || s.department===fDept)
      .filter(s => !fRole || s.role===fRole)
      .filter(s => !ql || [s.firstName,s.lastName,s.login,s.position,s.phone,s.department].map(x=>String(x||'').toLowerCase()).join(' ').includes(ql))
      .sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))
  }

  function render(){
    if(viewing) return renderDetail()
    renderList()
    if(editing) renderStaffForm()
    if(managingDepts) renderDeptManager()
  }

  function renderList(){
    const shown = computeShown()
    const pageCount = Math.max(1, Math.ceil(shown.length / pageSize))
    if(page>pageCount) page = pageCount
    const pageItems = shown.slice((page-1)*pageSize, page*pageSize)
    const onCount = (staff||[]).filter(s=>s.active).length
    const offCount = (staff||[]).length - onCount

    root.innerHTML = `
      <div class="dash-head" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div><h2>Xodimlar</h2><div>Tizim foydalanuvchilari, lavozimi va huquqlari</div></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${(staff||[]).length<=1 ? `<button class="btn ghost" id="st-demo">+ Demo xodimlar qo'shish</button>` : ''}
          <button class="btn" id="st-new">+ Qo'shish</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="stat-tile"><b>${(staff||[]).length}</b><span>Jami xodim</span></div>
        <div class="stat-tile"><b style="color:var(--green)">${onCount}</b><span>Faol</span></div>
        <div class="stat-tile"><b style="color:var(--mut)">${offCount}</b><span>Faolsiz</span></div>
      </div>

      <div class="fil-search">
        ${IC_SEARCH}
        <input id="st-q" value="${escapeHtml(q)}" placeholder="Ism, login yoki telefon bo'yicha qidirish…" />
        <button class="fil-btn${showFilter?' on':''}" id="st-filter-toggle">${IC_FILTER} Filtr</button>
      </div>

      ${showFilter ? `
      <div class="fil-panel">
        <div class="fil-grid">
          <div class="wf"><label>Bo'lim</label><select id="st-fdept"><option value="">Barchasi</option>${depts.map(d=>`<option value="${escapeHtml(d.name)}" ${fDept===d.name?'selected':''}>${escapeHtml(d.name)}</option>`).join('')}</select></div>
          <div class="wf"><label>Roli</label><select id="st-frole">
            <option value="">Barchasi</option>
            <option value="admin" ${fRole==='admin'?'selected':''}>Admin</option>
            <option value="xodim" ${fRole==='xodim'?'selected':''}>Xodim</option>
          </select></div>
        </div>
        <div class="fil-acts">
          <button class="btn ghost" id="st-filter-reset">↺ Qayta o'rnatish</button>
          <button class="btn" id="st-filter-apply">Qo'llash</button>
        </div>
      </div>` : ''}

      <div class="fil-tabs">
        <button class="${tab==='on'?'on':''}" data-tab="on">Faol ${staff ? `<span class="cnt">${onCount}</span>` : ''}</button>
        <button class="${tab==='off'?'on':''}" data-tab="off">Faolsiz ${staff ? `<span class="cnt">${offCount}</span>` : ''}</button>
        <span class="count" style="margin-left:auto">${staff ? shown.length : '…'} topildi</span>
      </div>

      ${err ? `<div class="err-box">${escapeHtml(err)}</div>` : ''}
      ${staff && shown.length===0 ? `<div class="empty">${tab==='off' ? "Faolsiz xodim yo'q." : "Xodim topilmadi. \"+ Qo'shish\" bilan qo'shing."}</div>` : ''}

      ${staff && shown.length>0 ? `
      <div class="tbl-wrap">
        <table class="tbl fil-tbl">
          <thead><tr>
            <th class="t-idx">№</th><th>YoQ/O'Ch</th><th>Login</th><th>FISH</th><th>Lavozim</th><th>Bo'lim</th><th>Roli</th><th>Telefon</th><th>Yaratilgan</th><th></th>
          </tr></thead>
          <tbody id="st-tbody"></tbody>
        </table>
        <div id="st-pager">${renderPagerHtml(page, pageCount, pageSize, shown.length)}</div>
      </div>` : ''}

      <div id="st-modal-slot"></div>
    `

    renderRows(pageItems, page, pageSize)
    wireList(shown)
  }

  function renderRows(items, page, pageSize){
    const tb = qs('#st-tbody', root)
    if(!tb) return
    tb.innerHTML = items.map((s,i)=>`
      <tr data-id="${s.id}">
        <td class="t-idx">${(page-1)*pageSize + i + 1}</td>
        <td><button type="button" class="tgl${s.active?' on':''}" data-toggle><span></span></button></td>
        <td style="white-space:nowrap">${escapeHtml(s.login)}</td>
        <td style="white-space:nowrap">${escapeHtml([s.lastName,s.firstName].filter(Boolean).join(' ').toUpperCase()) || '—'}</td>
        <td style="white-space:nowrap">${s.position ? escapeHtml(s.position) : `<span style="color:var(--mut)">—</span>`}</td>
        <td style="white-space:nowrap">${s.department ? escapeHtml(s.department) : `<span style="color:var(--mut)">—</span>`}</td>
        <td style="white-space:nowrap">${s.role==='admin' ? `<b style="color:var(--b7)">Admin</b>` : 'Xodim'}</td>
        <td style="white-space:nowrap">${s.phone ? `<a href="tel:${s.phone.replace(/\s/g,'')}" style="color:var(--b7);text-decoration:none;font-weight:700">${escapeHtml(s.phone)}</a>` : `<span style="color:var(--mut)">—</span>`}</td>
        <td style="white-space:nowrap;color:var(--mut)">${fmtDate(s.createdAt)}</td>
        <td>
          <div class="row-acts">
            <button class="ic-btn" title="Ko'rish" data-view>${IC_EYE}</button>
            <button class="ic-btn" title="Tahrirlash" data-edit>${IC_EDIT}</button>
          </div>
        </td>
      </tr>
    `).join('')
  }

  function wireList(shown){
    qs('#st-new', root).addEventListener('click', ()=>{ formState = null; editing = 'new'; render() })
    const demoBtn = qs('#st-demo', root)
    if(demoBtn) demoBtn.addEventListener('click', seedDemoStaff)

    const qInput = qs('#st-q', root)
    qInput.addEventListener('input', e=>{ q = e.target.value; page = 1 })
    qInput.addEventListener('keydown', e=>{ if(e.key==='Enter') render() })
    qInput.addEventListener('blur', ()=> render())

    qs('#st-filter-toggle', root).addEventListener('click', ()=>{ showFilter = !showFilter; render() })
    const fd = qs('#st-fdept', root); if(fd) fd.addEventListener('change', e=>{ fDept = e.target.value })
    const fr = qs('#st-frole', root); if(fr) fr.addEventListener('change', e=>{ fRole = e.target.value })
    const fReset = qs('#st-filter-reset', root); if(fReset) fReset.addEventListener('click', ()=>{ fDept=''; fRole=''; q=''; page=1; render() })
    const fApply = qs('#st-filter-apply', root); if(fApply) fApply.addEventListener('click', ()=>{ showFilter=false; page=1; render() })

    on(qs('.fil-tabs', root), 'click', 'button[data-tab]', (e,btn)=>{ tab = btn.dataset.tab; page = 1; render() })

    const pager = qs('#st-pager', root)
    if(pager){
      on(pager, 'click', '.pg', (e,btn)=>{ if(btn.disabled) return; page = Number(btn.dataset.page); render() })
      const sizeSel = qs('#st-page-size', pager); if(sizeSel) sizeSel.addEventListener('change', e=>{ pageSize = Number(e.target.value); page = 1; render() })
    }

    const tbody = qs('#st-tbody', root)
    if(tbody){
      on(tbody, 'click', '[data-toggle]', async (e,btn)=>{
        const tr = btn.closest('tr'); const s = shown.find(x=>x.id===tr.dataset.id)
        try{ await api.staffToggle(s.id); toast(s.active ? 'Faolsizlantirildi: '+s.login : 'Faollashtirildi: '+s.login); load() }catch(ex){ toast(ex.error) }
      })
      on(tbody, 'click', '[data-edit]', (e,btn)=>{ const tr = btn.closest('tr'); formState = null; editing = shown.find(x=>x.id===tr.dataset.id); render() })
      on(tbody, 'click', '[data-view]', (e,btn)=>{ const tr = btn.closest('tr'); viewing = shown.find(x=>x.id===tr.dataset.id); giveOpen = null; giveAmount = ''; render() })
    }
  }

  // ---------------- "Bonusni kartaga chiqarish" modali ----------------
  // Xodim hero kartasidagi "Olinadigan Oylik (bonus)" blokidan ochiladi.
  // Faqat bonus (Ustanovka bonusi + Undiruv bonusi) chiqariladi; asosiy oylik
  // va qo'lda berilgan umumiy "Bonus" bu yerdan chiqarilmaydi. Kartalar va
  // chiqarish tarixi — Payroll/Undiruv'dagi kabi localStorage'da saqlanadi.
  function renderWithdrawModalHtml(staffId, row){
    const st = withdrawState || {}
    const cards = cardsForStaff(staffId)
    const withdrawableBonus = (row.ustanovkaBonus||0) + (row.undiruvBonus||0)
    const availableBonus = Math.max(0, withdrawableBonus - wdWithdrawnThisMonth(staffId))
    const hist = wdHistoryForStaff(staffId)
    return `
      <div class="modal-bg" id="wd-bg">
        <div class="modal" style="max-width:820px">
          <div class="modal-grid">
            <div class="form-col">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <h3>${IC_CARD} Bonusni kartaga chiqarish</h3>
                <button class="lnk" id="wd-close" style="font-size:20px;line-height:1">×</button>
              </div>
              <div style="background:var(--soft);border-radius:14px;padding:16px 18px;margin-top:10px">
                <span style="font-size:11px;font-weight:800;color:var(--b7);text-transform:uppercase;letter-spacing:.3px">Mavjud bonus</span><br>
                <b style="font-size:24px">${fmtSum(availableBonus)} so'm</b>
              </div>
              <div class="hint" style="margin-top:8px">Faqat shu oy tegilgan bonus (Ustanovka/Undiruv/qo'lda berilgan bonus) kartaga chiqariladi. Asosiy oylik (maosh) bu orqali chiqarilmaydi — u Ish haqi to'lovlari bo'limida to'lanadi.</div>

              <label>Kartani tanlang</label>
              <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
                ${cards.length===0 ? `<div class="hint">Hali karta qo'shilmagan — pastdan qo'shing.</div>` : cards.map(c=>`
                  <div class="wd-card-opt" data-card="${c.id}" style="border:1.5px solid ${st.cardId===c.id&&!st.addCard?'var(--b2)':'var(--line)'};border-radius:12px;padding:12px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;${st.cardId===c.id&&!st.addCard?'background:var(--soft)':''}">
                    <span style="font-weight:800;font-size:13.5px">${escapeHtml(c.number)}</span>
                    ${st.cardId===c.id&&!st.addCard?`<span style="color:var(--b7);font-weight:800;font-size:12px">✓ Tanlangan</span>`:''}
                  </div>
                `).join('')}
                <div id="wd-addcard-toggle" style="border:1.5px dashed var(--line);border-radius:12px;padding:12px 14px;text-align:center;color:var(--b7);font-weight:800;font-size:13px;cursor:pointer;${st.addCard?'background:var(--soft);border-color:var(--b2)':''}">+ Yangi karta qo'shish</div>
              </div>
              ${st.addCard ? `
              <div class="wiz-grid" style="margin-top:10px">
                <div class="wf"><label>Karta raqami</label><input id="wd-card-number" inputmode="numeric" placeholder="0000 0000 0000 0000" value="${groupDigits(st.cardNumber,16)}" /></div>
                <div class="wf"><label>Amal qilish muddati</label><input id="wd-card-expiry" placeholder="OO/YY" value="${escapeHtml(st.cardExpiry)}" /></div>
                <div class="wf"><label>Telefon</label><input id="wd-card-phone" placeholder="+998 90 000 00 00" value="${escapeHtml(st.cardPhone)}" /></div>
              </div>` : ''}

              <div class="wf" style="margin-top:14px">
                <label>Chiqariladigan summa (so'm)</label>
                <input id="wd-amount" inputmode="numeric" placeholder="masalan: 300 000" value="${st.amount?fmtSum(st.amount):''}" />
              </div>
              ${st.err ? `<div class="auth-err" style="margin-top:10px">${escapeHtml(st.err)}</div>` : ''}
              <div class="modal-actions">
                <button class="btn ghost" id="wd-cancel">Bekor qilish</button>
                <button class="btn" id="wd-confirm">Kartaga chiqarish</button>
              </div>
            </div>
            <div class="preview-col">
              <div class="pv-label">Chiqarish tarixi</div>
              ${hist.length===0 ? `<div class="empty" style="padding:20px">Hali chiqarish bo'lmagan.</div>` : `
              <div style="display:flex;flex-direction:column;gap:2px">
                ${hist.map(w=>`
                  <div class="dl-item">
                    <span class="prof-av" style="flex:0 0 auto;background:var(--soft);color:var(--b7)">💳</span>
                    <span>${escapeHtml(w.cardLabel||'Karta')}<br><small style="color:var(--mut)">${fmtHistDate(w.date||w.createdAt)}</small></span>
                    <b style="white-space:nowrap;color:var(--green)">${fmtSum(w.amount)} so'm</b>
                  </div>
                `).join('')}
              </div>`}
            </div>
          </div>
        </div>
      </div>
    `
  }

  function wireWithdrawModal(staffId, row){
    const st = withdrawState
    const bg = qs('#wd-bg', root)
    if(!bg || !st) return
    const modal = qs('.modal', bg)
    const closeWd = ()=>{ withdrawOpen = false; withdrawState = null; render() }
    bg.addEventListener('mousedown', e=>{ if(e.target===bg) closeWd() })
    modal.addEventListener('mousedown', e=>e.stopPropagation())
    qs('#wd-close', bg).addEventListener('click', closeWd)
    qs('#wd-cancel', bg).addEventListener('click', closeWd)
    on(qs('.form-col', bg), 'click', '.wd-card-opt', (e,el)=>{ st.cardId = el.dataset.card; st.addCard = false; renderDetail() })
    const addToggle = qs('#wd-addcard-toggle', bg)
    if(addToggle) addToggle.addEventListener('click', ()=>{ st.addCard = !st.addCard; renderDetail() })
    const cardNumInp = qs('#wd-card-number', bg)
    if(cardNumInp) cardNumInp.addEventListener('input', e=>{ st.cardNumber = e.target.value.replace(/\D/g,'').slice(0,16); e.target.value = groupDigits(st.cardNumber,16) })
    const cardExpInp = qs('#wd-card-expiry', bg)
    if(cardExpInp) cardExpInp.addEventListener('input', e=>{
      let v = e.target.value.replace(/\D/g,'').slice(0,4)
      if(v.length>=3) v = v.slice(0,2)+'/'+v.slice(2)
      st.cardExpiry = v; e.target.value = v
    })
    const cardPhoneInp = qs('#wd-card-phone', bg)
    if(cardPhoneInp) cardPhoneInp.addEventListener('input', e=>{ st.cardPhone = e.target.value })
    const amtInp = qs('#wd-amount', bg)
    if(amtInp) amtInp.addEventListener('input', e=>{ st.amount = e.target.value.replace(/\D/g,''); e.target.value = st.amount ? fmtSum(st.amount) : '' })
    qs('#wd-confirm', bg).addEventListener('click', ()=>{
      st.err = ''
      const withdrawableBonus = (row.ustanovkaBonus||0) + (row.undiruvBonus||0)
      const availableBonus = Math.max(0, withdrawableBonus - wdWithdrawnThisMonth(staffId))
      let cardId = st.cardId, cardLabel = ''
      if(st.addCard || !cardId){
        const num = groupDigits(st.cardNumber,16)
        if(num.replace(/\s/g,'').length < 16){ st.err = "To'liq karta raqamini kiriting"; renderDetail(); return }
        const cardsMap = loadWdCards()
        const arr = cardsMap[staffId] || []
        const newCard = { id: genWid(), number: num, expiry: st.cardExpiry, phone: st.cardPhone }
        arr.push(newCard); cardsMap[staffId] = arr; saveWdCards(cardsMap)
        cardId = newCard.id
      }
      const cards = cardsForStaff(staffId)
      const card = cards.find(c=>c.id===cardId)
      cardLabel = card ? card.number : ''
      const amt = Number(st.amount)
      if(!amt || amt<=0){ st.err = 'Summani kiriting'; renderDetail(); return }
      if(amt > availableBonus){ st.err = `Mavjud bonusdan (${fmtSum(availableBonus)} so'm) ko'p summa chiqarib bo'lmaydi`; renderDetail(); return }
      const arr = loadWdHistory()
      arr.push({ id: genWid(), staffId, amount: amt, cardId, cardLabel, date: new Date().toISOString().slice(0,10), createdAt: new Date().toISOString() })
      saveWdHistory(arr)
      toast('Bonus kartaga chiqarildi')
      withdrawOpen = false; withdrawState = null
      render()
    })
  }

  // ---------------- Xodimni ko'rish (ko'z ikonkasi) ----------------
  // DIQQAT: "Davomat" — Tabel bo'limi bilan AYNAN bir xil formula (dayStatus/
  // rowSummary, tabel.js'dan import qilingan) orqali hisoblanadi, shu sabab
  // sonlar ikkala sahifada ham bir xil chiqadi. "Amallar tarixi" va
  // "+ Bonus"/"Avans" — Ish haqi to'lovlari bo'limi bilan BIR XIL ledger'ga
  // (localStorage) yoziladi/o'qiladi — shu yerda berilgan bonus/avans
  // Payroll sahifasida ham darhol ko'rinadi.
  function renderDetail(){
    const s = viewing
    const staffId = s.id||s.login
    const fullName = [s.lastName, s.firstName].filter(Boolean).join(' ').toUpperCase() || s.login
    const ini = (((s.firstName&&s.firstName[0])||'') + ((s.lastName&&s.lastName[0])||'')) || (s.login[0]||'X')
    const F = (label,val) => `<div class="dv-f"><label>${escapeHtml(label)}</label><div>${val?escapeHtml(String(val)):`<span style="color:var(--mut)">—</span>`}</div></div>`

    const settings = getPayrollSettings()
    const row = computeRow(s, settings, loadLedger())
    const avansGiven = row.avans ? -row.avans : 0

    const { y, m } = ymNow()
    const daysInMonth = new Date(y, m+1, 0).getDate()
    const att = rowSummary(staffId, y, m, daysInMonth)
    const monthLabel = `${MONTHS_UZ[m]} ${y}`
    const dayColor = st => st==='present' ? { bg:'#E7F5EC', fg:'var(--green)', ch:'✓' }
      : st==='late' ? { bg:'#FEF3E2', fg:'var(--amber)', ch:'K' }
      : st==='absent' ? { bg:'#FBEDEB', fg:'var(--red)', ch:'X' }
      : { bg:'#F1F4F5', fg:'var(--mut)', ch:'D' }

    const history = ledgerForStaff(staffId).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))
    const sales = salesStatsFor(s, clients)
    const oylikVal = getEffectiveSalary(s) || 0
    // Kartaga chiqariladigan bonus — FAQAT Ustanovka bonusi + Undiruv bonusi
    // (qo'lda berilgan umumiy "Bonus" bu yerga kirmaydi). "Olishi kerak" ham
    // shu ikkalasidan hisoblanadi: Oylik + Ustanovka bonus + Undiruv bonus -
    // Avans - Jarima.
    const withdrawableBonus = (row.ustanovkaBonus||0) + (row.undiruvBonus||0)
    const olishKerak = Math.max(0, oylikVal + withdrawableBonus - avansGiven - Math.abs(row.jarima||0))
    // Asosiy maosh/Avans/Jarima/Olishi-kerak — HAR DOIM chiqadi (sotuvga
    // aloqasi bo'lmagan xodimlar uchun ham); faqat joylashuvi o'zgaradi — agar
    // sotuv (sales) mavjud bo'lsa "Sotuv" hero kartasidan keyin, aks holda
    // profil kartasidan keyin.
    const salaryGridHtml = `
      <div class="kpi-grid lg" style="margin-top:${sales?'14px':'0'};grid-template-columns:repeat(4,1fr)">
        <div class="stat-tile"><b>${oylikVal ? fmtSum(oylikVal) : '—'}</b><span>Asosiy maosh${oylikVal?" (so'm)":''}</span></div>
        <div class="stat-tile"><b style="${avansGiven>0?'color:var(--amber)':''}">${avansGiven?fmtSum(avansGiven):'—'}</b><span>Avans (bu oy)</span></div>
        <div class="stat-tile"><b style="${row.jarima<0?'color:var(--red)':''}">${row.jarima?fmtSum(row.jarima):'—'}</b><span>Kechikish jarimasi</span></div>
        <div class="stat-tile"><b>${olishKerak?fmtSum(olishKerak):'—'}</b><span>Olishi kerak</span></div>
      </div>
    `

    root.innerHTML = `
      <div>
        <div class="wiz-head">
          <button class="wiz-back" id="stv-back" title="Orqaga">‹</button>
          <b>${escapeHtml(fullName)}</b>
          <div style="margin-left:auto;display:flex;gap:10px">
            <button class="btn ghost small${giveOpen==='bonus'?' on':''}" id="stv-bonus">+ Bonus</button>
            <button class="btn small${giveOpen==='avans'?' on':''}" id="stv-avans">Avans</button>
            <button class="btn ghost small" id="stv-edit">${IC_EDIT} Tahrirlash</button>
          </div>
        </div>

        ${giveOpen ? `
        <div class="dv-give-bar">
          <b style="white-space:nowrap;color:${giveOpen==='bonus'?'var(--green)':'var(--amber)'}">${giveOpen==='bonus'?IC_PLUS+' Bonus summasi':IC_WALLET+' Avans summasi'}</b>
          <input id="stv-give-amt" placeholder="Summa (so'm)" value="${giveAmount?fmtSum(giveAmount):''}" inputmode="numeric" />
          <button class="btn" id="stv-give-confirm">Tasdiqlash</button>
          <button class="ic-btn" id="stv-give-cancel" title="Bekor qilish">×</button>
        </div>` : ''}

        <div class="wiz-card">
          <div class="dv-top">
            <div class="prof-bigav" style="width:64px;height:64px;font-size:24px;flex:0 0 auto">${escapeHtml(ini.toUpperCase())}</div>
            <div class="dv-grid">
              ${F('FISH', fullName)}
              ${F('Lavozim', s.position)}
              ${F('Telefon', s.phone)}
              ${F('Login', s.login)}
              ${F('Roli', s.role)}
              ${F("Bo'lim", s.department)}
            </div>
          </div>
        </div>

        ${!sales ? salaryGridHtml : ''}

        ${sales ? (()=>{
          // Kartaga chiqarish uchun mavjud bonus — Ustanovka bonusi + Undiruv
          // bonusi (withdrawableBonus, yuqorida hisoblangan) minus shu oy
          // allaqachon kartaga chiqarilgan summa. Asosiy oylik (maosh) va
          // qo'lda berilgan umumiy "Bonus" bu yerga kirmaydi.
          const availableBonus = Math.max(0, withdrawableBonus - wdWithdrawnThisMonth(staffId))
          return `
        <div style="margin-bottom:16px">
          <div style="background:linear-gradient(135deg,#0f8fa2 0%,#1cb0c4 55%,#62d1de 100%);border-radius:20px;padding:30px 32px;position:relative;overflow:hidden;box-shadow:0 14px 34px rgba(28,176,196,.25)">
            <div style="position:absolute;right:-30px;top:-30px;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.09)"></div>
            <div style="position:absolute;right:30px;bottom:-50px;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,.07)"></div>
            <div style="position:relative;display:flex;flex-direction:column;gap:14px">
              <div style="display:flex;gap:24px;flex-wrap:wrap;justify-content:space-between;align-items:flex-end">
                <div style="display:flex;flex-direction:column;gap:14px">
                  <span style="font-size:13px;font-weight:800;color:rgba(255,255,255,.85);text-transform:uppercase;letter-spacing:1.1px">Maosh</span>
                  <span class="mono-num" style="font-size:52px;font-weight:800;color:#fff;letter-spacing:-1.5px;line-height:1">${fmtSum(sales.monthAmount)} <span style="font-size:22px;font-weight:800;opacity:.75">so'm</span></span>
                </div>
                <div style="background:rgba(255,255,255,.16);border-radius:18px;padding:16px 20px;display:flex;flex-direction:column;gap:9px;min-width:230px">
                  <span style="font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.4px;opacity:.9">Olinadigan Oylik (bonus)</span>
                  <span class="mono-num" style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-.5px">${fmtSum(availableBonus)} <span style="font-size:13px;font-weight:800;opacity:.75">so'm</span></span>
                  <button class="btn" id="stv-withdraw-open" style="background:#fff;color:#0f8fa2;padding:10px 16px;border-radius:11px;font-size:12.5px" ${availableBonus<=0?'disabled':''}>💳 Kartaga chiqarish</button>
                </div>
              </div>
              <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:2px">
                <div style="background:#fff;border-radius:14px;padding:13px 19px;display:flex;flex-direction:column;gap:3px">
                  <span style="font-size:11px;font-weight:800;color:#2f9e63;text-transform:uppercase;letter-spacing:.4px">Bu oy ulangan</span>
                  <span class="mono-num" style="font-size:20px;font-weight:800;color:#2f9e63">${sales.monthResolved.length} ta firma</span>
                </div>
                <div style="background:rgba(255,255,255,.2);border-radius:14px;padding:13px 19px;display:flex;flex-direction:column;gap:3px">
                  <span style="font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.4px;opacity:.85">Konversiya</span>
                  <span class="mono-num" style="font-size:20px;font-weight:800;color:#fff">${sales.conv}%</span>
                </div>
                ${(()=>{
                  // Oylik — Asosiy maosh (getEffectiveSalary) bilan bir xil real
                  // qiymat. Ustanovka/Undiruv bonusi va Jarima — Ish haqi
                  // to'lovlari bo'limidagi (payroll.js/computeRow) bilan AYNAN
                  // bir xil (o'sha hashStr-namuna) formuladan — shu sabab ikkala
                  // sahifada ham bir xil son chiqadi. Avans — shu oy haqiqatan
                  // berilgan avans (ledger'dan, real).
                  const pill = (bg, fg, label, val) => `
                    <div style="background:${bg};border-radius:14px;padding:13px 19px;display:flex;flex-direction:column;gap:3px">
                      <span style="font-size:11px;font-weight:800;color:${fg};text-transform:uppercase;letter-spacing:.4px">${label}</span>
                      <span class="mono-num" style="font-size:20px;font-weight:800;color:${fg}">${val?fmtSum(val):'—'}</span>
                    </div>`
                  return pill('rgba(255,255,255,.2)', '#fff', 'Oylik', oylikVal)
                    + pill('#fff', '#2f9e63', 'Ustanovka bonusi', row.ustanovkaBonus)
                    + pill('#fff', '#0f8fa2', 'Undiruv bonusi', row.undiruvBonus)
                    + pill('rgba(255,255,255,.2)', '#fff', 'Avans', avansGiven)
                    + pill('#fff', row.jarima<0?'var(--red)':'#0f8fa2', 'Jarima', row.jarima)
                })()}
              </div>
              <span class="hint" style="color:rgba(255,255,255,.75);margin-top:-4px">Oylik — asosiy maosh; Avans — shu oy berilgan avans (real). Ustanovka/Undiruv bonusi va Jarima — Ish haqi to'lovlari bo'limidagi bilan bir xil (namuna) formula asosida.</span>
            </div>
          </div>

          ${salaryGridHtml}

          ${sales.topDeals.length ? `
          <div class="wiz-card" style="margin-top:14px;margin-bottom:0">
            <h4>So'nggi ulangan firmalar</h4>
            ${sales.topDeals.map(d=>{
              const steps = ["Hujjatlar kelgan", "Onlayn ID ochilgan", "Terminal ulangan", d.tariff || 'Tarif ulangan']
              return `
              <div style="border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:16px">
                  <span style="font-size:14.5px;font-weight:800">${escapeHtml(d.firmName)}</span>
                  ${d.tariff ? `<span style="font-size:11px;font-weight:800;padding:4px 12px;border-radius:20px;background:#e7f7fa;color:#0f8fa2;white-space:nowrap">${escapeHtml(d.tariff)}</span>` : ''}
                </div>
                <div style="display:flex;align-items:flex-start;margin-bottom:18px">
                  ${steps.map((label,i)=>`
                    <div style="display:flex;align-items:center;${i<steps.length-1?'flex:1':'flex:0 0 auto'}">
                      <div style="display:flex;flex-direction:column;align-items:center;gap:5px;flex:0 0 auto">
                        <div style="width:22px;height:22px;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">✓</div>
                        <span style="font-size:9.5px;color:var(--mut);font-weight:700;text-align:center;width:74px;line-height:1.25">${escapeHtml(label)}</span>
                      </div>
                      ${i<steps.length-1?`<div style="flex:1;height:2px;background:var(--green);margin:0 2px 22px"></div>`:''}
                    </div>
                  `).join('')}
                </div>
                <div style="display:flex;gap:24px;flex-wrap:wrap">
                  <div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10.5px;color:var(--mut);font-weight:700">Kelishilgan</span><b class="mono-num" style="font-size:14.5px">${fmtSum(d.amount)}</b></div>
                  <div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10.5px;color:var(--mut);font-weight:700">To'langan</span><b class="mono-num" style="font-size:14.5px;color:var(--green)">${fmtSum(d.paid)}</b></div>
                  <div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10.5px;color:var(--mut);font-weight:700">Qoldiq</span><b class="mono-num" style="font-size:14.5px;${d.remaining>0?'color:var(--amber)':''}">${d.remaining ? fmtSum(d.remaining) : '—'}</b></div>
                  <div style="display:flex;flex-direction:column;gap:2px;margin-left:auto"><span style="font-size:10.5px;color:var(--mut);font-weight:700">Bonus summasi (10%)</span><b class="mono-num" style="font-size:14.5px;color:var(--green)">${fmtSum(d.bonus)}</b></div>
                </div>
              </div>`
            }).join('')}
            <div style="display:flex;gap:24px;flex-wrap:wrap;padding:16px 18px;background:#f7fafb;border-radius:14px;margin-top:4px">
              <div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10.5px;color:var(--mut);font-weight:800;text-transform:uppercase;letter-spacing:.3px">Umumiy kelishilgan</span><b class="mono-num" style="font-size:16px">${fmtSum(sales.topTotals.amount)}</b></div>
              <div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10.5px;color:var(--mut);font-weight:800;text-transform:uppercase;letter-spacing:.3px">Umumiy to'langan</span><b class="mono-num" style="font-size:16px;color:var(--green)">${fmtSum(sales.topTotals.paid)}</b></div>
              <div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10.5px;color:var(--mut);font-weight:800;text-transform:uppercase;letter-spacing:.3px">Umumiy qoldiq</span><b class="mono-num" style="font-size:16px;${sales.topTotals.remaining>0?'color:var(--amber)':''}">${sales.topTotals.remaining ? fmtSum(sales.topTotals.remaining) : '—'}</b></div>
              <div style="display:flex;flex-direction:column;gap:2px;margin-left:auto"><span style="font-size:10.5px;color:var(--mut);font-weight:800;text-transform:uppercase;letter-spacing:.3px">Jami bonus</span><b class="mono-num" style="font-size:16px;color:var(--green)">${fmtSum(sales.topTotals.bonus)}</b></div>
            </div>
          </div>` : ''}
          <div class="hint" style="margin-top:10px">Firma nomi va kelishilgan summa — CRM bo'limidagi haqiqiy ma'lumotlardan. Bosqichlar (hujjat/ID/terminal), to'langan/qoldiq va bonus summasi — to'lov kuzatuvi hali ulanmagani uchun namuna sifatida hisoblangan.</div>
        </div>`
        })() : ''}

        ${sales && withdrawOpen ? renderWithdrawModalHtml(staffId, row) : ''}

        ${sales ? `
        <div class="wiz-card">
          <h4>Sotuv ko'rsatkichlari</h4>
          <div class="kpi-grid" style="margin-top:12px">
            <div class="stat-tile"><b>${sales.totalDeals}</b><span>Jami murojaat</span></div>
            <div class="stat-tile"><b style="color:var(--green)">${sales.resolvedCount}</b><span>Ulangan firma</span></div>
            <div class="stat-tile"><b>${fmtSum(sales.totalAmount)}</b><span>Umumiy summa (so'm)</span></div>
            <div class="stat-tile"><b style="color:var(--green)">${sales.conv}%</b><span>Konversiya</span></div>
          </div>
        </div>` : ''}

        <div class="wiz-card">
          <h4>Davomat — ${escapeHtml(monthLabel)}</h4>
          <div class="kpi-grid" style="margin-top:12px">
            <div class="stat-tile"><b style="color:var(--green)">${att.kelgan}</b><span>Kelgan</span></div>
            <div class="stat-tile"><b style="${att.kelmagan>0?'color:var(--red)':''}">${att.kelmagan}</b><span>Kelmagan</span></div>
            <div class="stat-tile"><b style="${att.kech>0?'color:var(--amber)':''}">${att.kech}</b><span>Kech qolgan</span></div>
            <div class="stat-tile"><b>${att.soat||'—'}</b><span>Ishlagan soat</span></div>
          </div>
          <div class="dv-daygrid" style="gap:7px">
            ${Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
              const st = dayStatus(staffId, y, m, d)
              const c = dayColor(st)
              return `<div class="dv-daycell" style="background:${c.bg};color:${c.fg};width:40px;height:40px;font-size:14px;border-radius:10px" title="${d}-kun: ${st==='present'?'kelgan':st==='late'?'kech qolgan':st==='absent'?'kelmagan':'dam olish'}">${d}</div>`
            }).join('')}
          </div>
          <div class="hint" style="margin-top:12px">Davomat — Tabel bo'limidagi bilan bir xil (demo) ma'lumot; real davomat tizimi ulanmaguncha shunday ko'rsatiladi.</div>
        </div>

        <div class="wiz-card">
          <h4>Amallar tarixi (oylik / avans / bonus / jarima)</h4>
          ${history.length===0 ? `<div class="empty" style="padding:34px">Hali amallar tarixi yo'q.</div>` : `
          <div style="display:flex;flex-direction:column;gap:2px;margin-top:10px">
            ${history.map(h=>`
              <div class="dl-item">
                <span class="prof-av" style="flex:0 0 auto;background:${h.kind==='oylik'?'var(--soft)':h.kind==='avans'?'#FEF3E2':h.kind==='bonus'?'#E7F5EC':'#FBEDEB'};color:${h.kind==='oylik'?'var(--b7)':h.kind==='avans'?'var(--amber)':h.kind==='bonus'?'var(--green)':'var(--red)'}">${h.kind==='oylik'?'💳':h.kind==='avans'?'💸':h.kind==='bonus'?'➕':'➖'}</span>
                <span>${escapeHtml(KIND_LABEL[h.kind]||h.kind)}${h.method?' · '+escapeHtml(PAY_METHOD_LABEL[h.method]||h.method):''}<br><small style="color:var(--mut)">${fmtHistDate(h.date||h.createdAt)}</small></span>
                <b style="white-space:nowrap;color:${h.kind==='jarima'?'var(--red)':'var(--ink)'}">${fmtSum(h.amount)} so'm</b>
              </div>
            `).join('')}
          </div>`}
        </div>
      </div>
    `
    qs('#stv-back', root).addEventListener('click', ()=>{ viewing = null; giveOpen = null; giveAmount = ''; render() })
    qs('#stv-edit', root).addEventListener('click', ()=>{ const ss = viewing; viewing = null; formState = null; editing = ss; render() })
    qs('#stv-bonus', root).addEventListener('click', ()=>{ giveOpen = giveOpen==='bonus' ? null : 'bonus'; giveAmount = ''; render() })
    qs('#stv-avans', root).addEventListener('click', ()=>{ giveOpen = giveOpen==='avans' ? null : 'avans'; giveAmount = ''; render() })
    const wdOpenBtn = qs('#stv-withdraw-open', root)
    if(wdOpenBtn) wdOpenBtn.addEventListener('click', ()=>{
      const existingCards = cardsForStaff(staffId)
      withdrawState = { cardId: existingCards[0] ? existingCards[0].id : '', amount: '', addCard: existingCards.length===0, cardNumber:'', cardExpiry:'', cardPhone:'', err:'' }
      withdrawOpen = true
      render()
    })
    if(withdrawOpen && sales) wireWithdrawModal(staffId, row)
    const giveCancel = qs('#stv-give-cancel', root); if(giveCancel) giveCancel.addEventListener('click', ()=>{ giveOpen = null; giveAmount = ''; render() })
    const giveAmt = qs('#stv-give-amt', root)
    if(giveAmt) giveAmt.addEventListener('input', e=>{ giveAmount = e.target.value.replace(/\D/g,''); e.target.value = giveAmount ? fmtSum(giveAmount) : '' })
    const giveConfirm = qs('#stv-give-confirm', root)
    if(giveConfirm) giveConfirm.addEventListener('click', ()=>{
      const amt = Number(giveAmount)
      if(!amt || amt<=0){ toast('Summani kiriting'); return }
      addLedgerEntry({ staffId, kind: giveOpen, amount: amt, date: new Date().toISOString().slice(0,10) })
      toast(giveOpen==='bonus' ? "Bonus qo'shildi" : "Avans berildi")
      giveOpen = null; giveAmount = ''
      render()
    })
  }

  // ---------------- StaffForm (qo'shish/tahrirlash) ----------------
  function renderStaffForm(){
    const s = editing==='new' ? null : editing
    const isEditing = !!s
    if(!formState){
      formState = {
        firstName: s?.firstName||'', lastName: s?.lastName||'', position: s?.position||'', phone: s?.phone||'+998 ',
        login: s?.login||'', department: s?.department||'', role: s?.role||'xodim', sip: s?.sip||'',
        salary: s && getEffectiveSalary(s) ? String(getEffectiveSalary(s)) : '',
        pw: '', pw2: '', err: '', busy: false,
      }
    }
    const st = formState
    const slot = qs('#st-modal-slot', root)
    if(!slot) return
    slot.innerHTML = `
      <div class="modal-bg" id="stf-bg">
        <div class="modal" style="max-width:560px">
          <div class="form-col">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <h3>${isEditing ? 'Xodimni tahrirlash' : "Qo'shish"}</h3>
              <button class="lnk" id="stf-close" style="font-size:20px;line-height:1">×</button>
            </div>
            <div class="wiz-grid" style="margin-top:10px">
              <div class="wf"><label>Ism <span class="req">*</span></label><input name="firstName" value="${escapeHtml(st.firstName)}" placeholder="Ism" /></div>
              <div class="wf"><label>Familiya</label><input name="lastName" value="${escapeHtml(st.lastName)}" placeholder="Familiya" /></div>
              <div class="wf"><label>Lavozim</label><input name="position" value="${escapeHtml(st.position)}" placeholder="Lavozim" /></div>
              <div class="wf"><label>Telefon</label><input name="phone" value="${escapeHtml(st.phone)}" placeholder="+998 90 000 00 00" /></div>
              <div class="wf"><label>Login <span class="req">*</span></label><input name="login" value="${escapeHtml(st.login)}" placeholder="Login" autocomplete="off" /></div>
              <div class="wf"><label>Roli</label>
                <select name="role">
                  <option value="xodim" ${st.role==='xodim'?'selected':''}>Xodim</option>
                  <option value="admin" ${st.role==='admin'?'selected':''}>Admin</option>
                </select>
              </div>
              <div class="wf"><label>Sipuni (SIP-raqam)</label><input name="sip" value="${escapeHtml(st.sip)}" placeholder="Sipuni (SIP-raqam)" /></div>
              <div class="wf"><label>Oylik maosh (so'm)</label><input name="salary" value="${st.salary ? fmtSum(st.salary) : ''}" placeholder="masalan: 4 000 000" inputmode="numeric" /></div>
              <div class="wf"><label>${isEditing ? 'Yangi parol' : 'Parol'} ${!isEditing ? '<span class="req">*</span>' : ''}</label>
                <input type="password" name="pw" placeholder="${isEditing ? "o'zgartirmasangiz bo'sh qoldiring" : 'kamida 8 belgi, harf+raqam'}" autocomplete="new-password" /></div>
              <div class="wf"><label>Yangi parolni tasdiqlash</label><input type="password" name="pw2" placeholder="••••••••" autocomplete="new-password" /></div>
            </div>
            <div class="hint" style="margin-top:4px">"Roli": Admin — Xodimlar bo'limini ham boshqara oladi; Xodim — cheklangan.${isEditing ? " Parolni bo'sh qoldirsangiz — eskisi saqlanadi." : ''}</div>
            ${st.err ? `<div class="auth-err" style="margin-top:12px">${escapeHtml(st.err)}</div>` : ''}
            <div class="modal-actions">
              <button class="btn ghost" id="stf-cancel">Bekor qilish</button>
              <button class="btn" id="stf-save" ${st.busy?'disabled':''}>${st.busy?'Saqlanmoqda…':'Saqlash'}</button>
            </div>
          </div>
        </div>
      </div>
    `
    wireStaffForm(st, isEditing)
  }

  function wireStaffForm(st, isEditing){
    const slot = qs('#st-modal-slot', root)
    const bg = qs('#stf-bg', slot)
    const modal = qs('.modal', slot)
    const closeForm = ()=>{ formState = null; editing = null; render() }
    bg.addEventListener('mousedown', e=>{ if(e.target===bg) closeForm() })
    modal.addEventListener('mousedown', e=>e.stopPropagation())
    qs('#stf-close', slot).addEventListener('click', closeForm)
    qs('#stf-cancel', slot).addEventListener('click', closeForm)
    modal.querySelector('[name="firstName"]').addEventListener('input', e=>{ st.firstName = e.target.value })
    modal.querySelector('[name="lastName"]').addEventListener('input', e=>{ st.lastName = e.target.value })
    modal.querySelector('[name="position"]').addEventListener('input', e=>{ st.position = e.target.value })
    modal.querySelector('[name="phone"]').addEventListener('input', e=>{ st.phone = e.target.value })
    modal.querySelector('[name="login"]').addEventListener('input', e=>{ st.login = e.target.value.trim() })
    modal.querySelector('[name="role"]').addEventListener('change', e=>{ st.role = e.target.value })
    modal.querySelector('[name="sip"]').addEventListener('input', e=>{ st.sip = e.target.value })
    modal.querySelector('[name="salary"]').addEventListener('input', e=>{ st.salary = e.target.value.replace(/\D/g,''); e.target.value = st.salary ? fmtSum(st.salary) : '' })
    modal.querySelector('[name="pw"]').addEventListener('input', e=>{ st.pw = e.target.value })
    modal.querySelector('[name="pw2"]').addEventListener('input', e=>{ st.pw2 = e.target.value })
    qs('#stf-save', slot).addEventListener('click', ()=> saveStaffForm(st, isEditing))
  }

  async function saveStaffForm(st, isEditing){
    st.err = ''
    if(!st.firstName.trim()){ st.err = 'Ism kerak'; renderStaffForm(); return }
    if(!/^[a-zA-Z0-9._@-]{3,40}$/.test(st.login.trim())){ st.err = "Login 3-40 belgi (a-z, 0-9, . _ - @)"; renderStaffForm(); return }
    if(!isEditing || st.pw){
      if(st.pw.length < 8){ st.err = 'Parol kamida 8 belgi'; renderStaffForm(); return }
      if(!/[A-Za-z]/.test(st.pw) || !/\d/.test(st.pw)){ st.err = "Parolda kamida bitta harf va bitta raqam bo'lsin"; renderStaffForm(); return }
      if(st.pw !== st.pw2){ st.err = 'Parollar mos emas'; renderStaffForm(); return }
    }
    st.busy = true; renderStaffForm()
    const _pd = st.phone.replace(/\D/g,''); const phoneClean = (_pd===''||_pd==='998') ? '' : st.phone.trim()
    const payload = { firstName: st.firstName.trim(), lastName: st.lastName.trim(), login: st.login.trim(), position: st.position.trim(), phone: phoneClean, department: st.department, role: st.role, sip: st.sip.trim(), salary: st.salary ? Number(st.salary) : undefined, password: st.pw||undefined }
    try{
      const s = editing==='new' ? null : editing
      const salaryNum = st.salary ? Number(st.salary) : 0
      if(isEditing){
        await api.staffUpdate(s.id, payload)
        // Backend "salary"ni saqlab qaytarmasligi mumkin — shu sabab
        // localStorage'ga ham zaxira sifatida yozib qo'yamiz (ishonchli manba).
        setLocalSalary(s.id||s.login, salaryNum)
      } else {
        const created = await api.staffCreate(payload)
        setLocalSalary((created && (created.id||created.login)) || payload.login, salaryNum)
      }
      formState = null; editing = null; toast('Saqlandi'); load()
    }catch(ex){ st.err = ex.error || 'Xatolik'; st.busy = false; renderStaffForm() }
  }

  // ---------------- DeptManager (bo'limlar ro'yxati) ----------------
  function renderDeptManager(){
    const st = deptState
    const slot = qs('#st-modal-slot', root)
    if(!slot) return
    slot.innerHTML = `
      <div class="modal-bg" id="dm-bg">
        <div class="modal" style="max-width:420px">
          <div class="form-col">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <h3>Bo'limlar</h3>
              <button class="lnk" id="dm-close" style="font-size:20px;line-height:1">×</button>
            </div>
            <div style="display:flex;gap:8px;margin-top:12px">
              <input id="dm-name" value="${escapeHtml(st.name)}" placeholder="Yangi bo'lim nomi" style="flex:1" />
              <button class="btn" id="dm-add" ${st.busy?'disabled':''}>+ Qo'shish</button>
            </div>
            ${st.err ? `<div class="auth-err" style="margin-top:10px">${escapeHtml(st.err)}</div>` : ''}
            <div style="margin-top:14px;display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto" id="dm-list">
              ${depts.length===0 ? `<div class="empty" style="padding:16px">Hali bo'lim yo'q.</div>` : ''}
              ${depts.map(d=>`
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border:1px solid var(--ln);border-radius:8px" data-id="${d.id}">
                  <span>${escapeHtml(d.name)}</span>
                  <button class="ic-btn" title="O'chirish" data-remove-dept>${IC_TRASH}</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `
    wireDeptManager(st)
  }

  function wireDeptManager(st){
    const slot = qs('#st-modal-slot', root)
    const bg = qs('#dm-bg', slot)
    const modal = qs('.modal', slot)
    const closeDepts = ()=>{ deptState = null; managingDepts = false; render() }
    bg.addEventListener('mousedown', e=>{ if(e.target===bg) closeDepts() })
    modal.addEventListener('mousedown', e=>e.stopPropagation())
    qs('#dm-close', slot).addEventListener('click', closeDepts)
    const nameInput = qs('#dm-name', slot)
    nameInput.addEventListener('input', e=>{ st.name = e.target.value })
    nameInput.addEventListener('keydown', e=>{ if(e.key==='Enter') addDept(st) })
    qs('#dm-add', slot).addEventListener('click', ()=> addDept(st))
    on(qs('#dm-list', slot), 'click', '[data-remove-dept]', async (e,btn)=>{
      const row = btn.closest('[data-id]'); const d = depts.find(x=>x.id===row.dataset.id)
      if(!d) return
      if(!confirm(`"${d.name}" bo'limi o'chirilsinmi?`)) return
      try{ await api.deptRemove(d.id); await loadDepts(); toast("Bo'lim o'chirildi"); renderDeptManager() }catch(ex){ toast(ex.error) }
    })
  }

  async function addDept(st){
    st.err = ''
    const n = st.name.trim()
    if(!n){ st.err = "Bo'lim nomini kiriting"; renderDeptManager(); return }
    st.busy = true; renderDeptManager()
    try{
      await api.deptCreate(n); st.name = ''; await loadDepts(); toast("Bo'lim qo'shildi: "+n)
      st.busy = false; renderDeptManager()
    }catch(ex){ st.err = ex.error || 'Xatolik'; st.busy = false; renderDeptManager() }
  }

  load(); loadDepts(); loadClients()
  return function cleanup(){}
}
