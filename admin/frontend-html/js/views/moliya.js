// Moliya bo'limining navigatsiyasi va sahifa-mount'lagichi.
//
// TUZILISH asl super admindan (dev-admin.icanbusiness.uz) olindi — u yerda
// menyu guruhlangan (Boshqaruv kabi), yassi ro'yxat emas:
//   Statistika · Kreditlar
//   Filiallar    → Tariflar, Debet / Kredit
//   Qora ro'yxat → Qora ro'yxat, Tranzaksiyalar
//   KATM         → KATM kreditlar, Ommaviy to'lov
//   Kartalar
//   Tarix        → KATM, ATMOS, MYUZCARD, EGOV, UNIACCESS, CRIF, CLICK, PAYME
//   Hisobotlar · Qo'llanma
//
// "Statistika" va "Kreditlar" (avvalgi "Shartnomalar") — to'liq sahifalar.
// Qolganlari moliya-demo.js dagi NAMUNA (demo) sahifalar; backend ulangach
// faqat ma'lumot manbasini almashtirish kifoya.
import { escapeHtml } from '../core.js'
import { mountWithCrumb, groupCrumb } from './demo-kit.js'
import { mountStatistika } from './moliya-stats.js'
import { mountShartnomalar } from './moliya-contracts.js'
import { mountPayroll } from './payroll.js'
import { mountUndiruv } from './undiruv.js'
import { MOLIYA_DEMO_MOUNTS } from './moliya-demo.js'
import { MOLIYA_DEMO2_MOUNTS } from './moliya-demo2.js'

const ic = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"></path></svg>`

const IC_STATS = ic('M18 20V10M12 20V4M6 20v-6')
const IC_CREDIT = ic('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6')
const IC_BRANCH = ic('M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6')
const IC_BLACK = ic('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8')
const IC_KATM = ic('M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15')
const IC_CARD = ic('M2 7.5A2.5 2.5 0 0 1 4.5 5h15A2.5 2.5 0 0 1 22 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 16.5zM2 10h20M6 15h4')
const IC_HIST = ic('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2')
const IC_REPORT = ic('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v4M12 16h.01')
const IC_GUIDE = ic('M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5')
const IC_PAYROLL = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/></svg>`
const IC_UNDIRUV = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v13"/><path d="m8 11 4 4 4-4"/><rect x="3" y="19" width="18" height="3" rx="1"/></svg>`

// items:null — bevosita bosiladigan yakka band; items bor — ochib-yopiladigan guruh
export const MOLIYA_GROUPS = [
  { key:'stats',     label:'Statistika', icon:IC_STATS,  items:null },
  { key:'contracts', label:'Shartnomalar',  icon:IC_CREDIT, items:null },
  { key:'filiallar-grp', label:'Filiallar', icon:IC_BRANCH, items:[
    { key:'tariflar',     label:'Tariflar' },
    { key:'debet-kredit', label:'Debet / Kredit' },
  ]},
  { key:'qora-grp', label:"Qora ro'yxat", icon:IC_BLACK, items:[
    { key:'qora',     label:"Qora ro'yxat" },
    { key:'qora-tranz', label:'Tranzaksiyalar' },
  ]},
  { key:'katm-grp', label:'KATM', icon:IC_KATM, items:[
    { key:'katm',         label:'KATM kreditlar' },
    { key:'ommaviy-tolov', label:"Ommaviy to'lov" },
  ]},
  { key:'kartalar', label:'Kredit foydalanuvchisi', icon:IC_CARD, items:null },
  { key:'tarix-grp', label:'Tarix', icon:IC_HIST, items:[
    { key:'tarix-katm',      label:'KATM tarixi' },
    { key:'tarix-atmos',     label:'ATMOS tarixi' },
    { key:'tarix-myuzcard',  label:'MYUZCARD tarixi' },
    { key:'tarix-egov',      label:'EGOV tarixi' },
    { key:'tarix-uniaccess', label:'UNIACCESS tarixi' },
    { key:'tarix-crif',      label:'CRIF tarixi' },
    { key:'tarix-click',     label:'CLICK tarixi' },
    { key:'tarix-payme',     label:'PAYME tarixi' },
  ]},
  { key:'hisobot',  label:'Hisobotlar', icon:IC_REPORT, items:null },
  { key:'qollanma', label:"Qo'llanma",  icon:IC_GUIDE,  items:null },
  // HR dan ko'chirildi: ikkalasi ham pul harakati bilan bog'liq —
  // ish haqi to'lovi ham, undiruv ham moliyaviy amal.
  { key:'payroll', label:"Ish haqi to'lovlari", icon:IC_PAYROLL, items:null },
  { key:'undiruv', label:'Undiruv', icon:IC_UNDIRUV, items:null },
]

function findLabel(key){
  for(const g of MOLIYA_GROUPS){
    if(g.key===key && !g.items) return { label:g.label, icon:g.icon }
    if(g.items){ const it = g.items.find(i=>i.key===key); if(it) return { label:it.label, icon:g.icon } }
  }
  return { label:key, icon:'' }
}

const MOUNTS = { stats: mountStatistika, contracts: mountShartnomalar, payroll: mountPayroll, undiruv: mountUndiruv, ...MOLIYA_DEMO_MOUNTS, ...MOLIYA_DEMO2_MOUNTS }

// root — Moliya sahifasi uchun ajratilgan kontent konteyneri (sidebar emas,
// shell.js'dagi #mol-content). key — tanlangan bo'lim.
export function mountMoliyaContent(root, key, { toast }){
  const mountFn = MOUNTS[key]
  if(mountFn){
    const [mod, page] = groupCrumb(MOLIYA_GROUPS, key, 'Moliya')
    return mountWithCrumb(root, mod, page, mountFn, { toast })
  }
  const { label, icon } = findLabel(key)
  root.innerHTML = `
    <div class="mol-empty">
      <div class="mol-empty-ic">${icon}</div>
      <div style="font-size:15px;font-weight:800">${escapeHtml(label)}</div>
      <div style="color:var(--mut);font-size:13px">Bu bo'lim tez orada qo'shiladi</div>
    </div>
  `
  return function cleanup(){}
}
