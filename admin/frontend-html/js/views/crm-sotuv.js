// CRM → "CRM" sahifasi. Yuqorida referensdagi "Sotuv" bo'limidan olingan
// davr/filtr + 5ta KPI paneli, pastda esa bizning haqiqiy CRM Kanban
// doskamiz (crm.js — avval Monitoring bo'limida edi, shu yerga ko'chirildi,
// o'zi o'zgarishsiz qoldi).
//
// "Ulangan firmalar / Umumiy summa / Yangi leadlar / Konversiya" — HAQIQIY:
// CRM Kanbandagi murojaat (deal) ma'lumotlaridan, tanlangan davrga qarab
// hisoblanadi ("Ulangan firma" = shu davrda "Muammo yechildi" bosqichiga
// yetgan murojaat, "Yangi lead" = shu davrda tushgan, hali yechilmagan
// murojaat).
// "Qarzdor firmalar" va pastdagi to'lov/bank/hujjat filtr chiplari — bular
// uchun hali mos maydon (to'lov qarzi, bank holati, hujjat holati) tizimda
// kuzatilmagani sababli barqaror NAMUNA (demo) qiymatlar, aniq belgilangan.
// Chiplardan "Barchasi"dan boshqasi hozircha faqat ko'rinish uchun (bosilsa
// ogohlantirish chiqadi) — ular ulanadigan haqiqiy ma'lumot yo'q.
import { qs, on, escapeHtml, toast as toastFn } from '../core.js'
import { api } from '../api.js'
import { fmtSum } from '../products.js'
import { loadDeals, mountCrm } from './crm.js'

const IC_FIRM = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01"/></svg>`
const IC_SUM = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/></svg>`
const IC_DEBT = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>`
const IC_LEAD = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>`
const IC_CONV = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 6 13.5 15.5l-5-5L1 18"/><path d="M17 6h6v6"/></svg>`

const FCHIPS = [
  { key:'all',  label:'Barchasi' },
  { key:'full', label:"To'liq to'lagan" },
  { key:'debt', label:'Ustanovkadan qarzi bor' },
  { key:'bank', label:'Bank ulanmagan' },
  { key:'docs', label:'Dokument kelmagan' },
]
const AY_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']

function hashStr(s){
  let h = 0
  const str = String(s||'')
  for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0 }
  return Math.abs(h)
}

export function mountCrmSotuv(root, { toast }){
  const say = toast || toastFn
  let clients = null
  let period = 'this' // 'this' | 'prev' | 'range'
  let rangeFrom = '', rangeTo = ''
  let flt = 'all'
  let kanbanCleanup = null

  root.innerHTML = `<div id="cs-kpi"></div><div id="cs-kanban" style="margin-top:18px"></div>`
  const kpiSlot = qs('#cs-kpi', root)
  const kanbanSlot = qs('#cs-kanban', root)

  async function load(){
    clients = await api.clientsList().catch(()=>[])
    renderKpi()
  }

  function periodRange(){
    const now = new Date()
    if(period==='this') return { from: now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01', to: null, label: AY_UZ[now.getMonth()]+' '+now.getFullYear() }
    if(period==='prev'){
      const d = new Date(now.getFullYear(), now.getMonth()-1, 1)
      const nextM = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: d.toISOString().slice(0,10), to: nextM.toISOString().slice(0,10), label: AY_UZ[d.getMonth()]+' '+d.getFullYear() }
    }
    return { from: rangeFrom || '2000-01-01', to: rangeTo ? addOneDay(rangeTo) : null, label: (rangeFrom||'…')+' — '+(rangeTo||'…') }
  }
  function addOneDay(iso){ const d = new Date(iso+'T00:00:00'); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10) }

  function inPeriod(deal, r){
    const day = (deal.createdAt||'').slice(0,10)
    if(!day) return false
    if(r.from && day < r.from) return false
    if(r.to && day >= r.to) return false
    return true
  }

  function kpiCard(bg, fg, ic, num, title){
    return `
      <div class="mij-card mij-card-sm" style="border-top-color:${fg}">
        <div class="mij-card-top"><span class="mij-card-ic" style="background:${bg};color:${fg}">${ic}</span></div>
        <div class="mij-card-num" style="color:${fg}">${num}</div>
        <div class="mij-card-title">${escapeHtml(title)}</div>
      </div>
    `
  }

  function renderKpi(){
    const deals = loadDeals()
    const r = periodRange()
    const inP = deals.filter(d=>inPeriod(d,r))
    const wonInP = inP.filter(d=>d.stage==='resolved')
    const leadsInP = inP.filter(d=>d.stage!=='resolved')
    const totalSum = wonInP.reduce((a,d)=>a+(d.amount||0),0)
    const conv = Math.round(wonInP.length / Math.max(wonInP.length+leadsInP.length,1) * 100)

    // "Qarzdor firmalar" — NAMUNA (demo): to'lov qarzi hali kuzatilmagani uchun,
    // davrga bog'liq barqaror namuna son.
    const seed = period+':'+r.from+':'+(r.to||'')
    const debtorsCount = Math.min(wonInP.length, 1 + (hashStr(seed)%4))
    const debtorsSum = debtorsCount * (2000000 + (hashStr(seed+'s')%8)*1250000)

    kpiSlot.innerHTML = `
      <div class="dash-head">
        <h2>Sotuv</h2>
        <div style="color:var(--mut);font-size:12.5px;font-weight:700;margin-top:2px">Ulangan firmalar va murojaatlar — ${escapeHtml(r.label)}</div>
      </div>

      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
        <div class="seg seg-sm" id="cs-period-seg" style="flex:0 0 auto">
          <button class="${period==='this'?'on':''}" data-period="this">Bu oy</button>
          <button class="${period==='prev'?'on':''}" data-period="prev">O'tgan oy</button>
          <button class="${period==='range'?'on':''}" data-period="range">Sana oralig'i</button>
        </div>
        ${period==='range' ? `
        <input type="date" id="cs-from" value="${escapeHtml(rangeFrom)}" style="border:1.5px solid var(--line);border-radius:10px;padding:8px 10px;font:700 12.5px system-ui,sans-serif" />
        <span style="color:var(--mut);font-weight:800">—</span>
        <input type="date" id="cs-to" value="${escapeHtml(rangeTo)}" style="border:1.5px solid var(--line);border-radius:10px;padding:8px 10px;font:700 12.5px system-ui,sans-serif" />
        ` : ''}
        <div class="spacer" style="flex:1"></div>
      </div>

      <div class="fil-search" style="margin-bottom:16px">
        ${FCHIPS.map(c=>`<button class="fil-btn${flt===c.key?' on':''}" data-flt="${c.key}">${escapeHtml(c.label)}</button>`).join('')}
      </div>

      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:6px">
        ${kpiCard('#e7f7fa','#0f8fa2', IC_FIRM, clients===null ? '…' : wonInP.length, 'Ulangan firmalar')}
        ${kpiCard('#e9f7ee','#2f9e63', IC_SUM, fmtSum(totalSum)+" so'm", 'Umumiy summa')}
        ${kpiCard('#fdf1f0','#e05252', IC_DEBT, debtorsCount+' ta · '+fmtSum(debtorsSum), 'Qarzdor firmalar (namuna)')}
        ${kpiCard('#fdf6e7','#b07d2a', IC_LEAD, leadsInP.length, 'Yangi leadlar')}
        ${kpiCard('#e9f7ee','#2f9e63', IC_CONV, conv+'%', 'Konversiya')}
      </div>
      <div class="ic-note">"Ulangan firmalar/Umumiy summa/Yangi leadlar/Konversiya" — CRM murojaatlaridan (pastdagi Kanban) tanlangan davr bo'yicha haqiqiy hisoblanadi. "Qarzdor firmalar" hamda yuqoridagi to'lov/bank/hujjat filtrlari ("Barchasi"dan boshqasi) — to'lov qarzi/bank/hujjat holati hali kuzatilmagani uchun NAMUNA (demo).</div>
    `
    wireKpi()
  }

  function wireKpi(){
    const seg = qs('#cs-period-seg', kpiSlot)
    if(seg) on(seg, 'click', 'button[data-period]', (e,btn)=>{ period = btn.dataset.period; renderKpi() })
    const from = qs('#cs-from', kpiSlot)
    if(from) from.addEventListener('change', e=>{ rangeFrom = e.target.value; renderKpi() })
    const to = qs('#cs-to', kpiSlot)
    if(to) to.addEventListener('change', e=>{ rangeTo = e.target.value; renderKpi() })
    on(kpiSlot, 'click', 'button[data-flt]', (e,btn)=>{
      const k = btn.dataset.flt
      if(k==='all'){ flt = 'all'; renderKpi(); return }
      say("Bu filtr hali ulanmagan — to'lov/bank/hujjat holati kuzatilmagani uchun (namuna)")
    })
  }

  kanbanCleanup = mountCrm(kanbanSlot, { toast: say })

  load()

  return function cleanup(){ if(kanbanCleanup) kanbanCleanup() }
}
