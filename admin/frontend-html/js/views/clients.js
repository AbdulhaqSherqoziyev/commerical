import { api } from '../api.js'
import { UZ_REGIONS, REGION_NAMES, REGION_COORDS, yandexSearchUrl } from '../uzregions.js'
import { qs, qsa, on, escapeHtml } from '../core.js'
import { smartLogoEl, resizeImage, mountCoordPicker } from '../widgets.js'
import { STATUS_LIST, initials } from '../tasksShared.js'
// Ommaviy amal ro'yxatlari — Tashkilot kartasi bilan bir manba, ya'ni
// ikki joyda ikki xil ro'yxat bo'lib qolmaydi.
import { CAPABILITIES, BLOCKERS, PAY_ORGS } from './boshqaruv-company.js'
import { setCompanyCardTarget, takeClientEditTarget, goto } from './nav-intent.js'

const IMPORT_COLS = ['Firma nomi','Telefon','Manzil','Viloyat','Tuman']

const IC_SEARCH = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`
const IC_FILTER = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>`
const IC_EDIT = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`
const IC_CARD = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5 16.6c.5-1.6 1.9-2.4 3.5-2.4s3 .8 3.5 2.4M15 10h4M15 13.5h4"/></svg>`
const IC_ENTER = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>`
const IC_DOTS = `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`
const CHK = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#46B26C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
// Qora ro'yxat / Atmos terminal ID / MyUzcard ustunlari asl super admindagi
// kabi turadi, lekin bizning tashkilot yozuvimizda hali bunday maydonlar
// YO'Q. Ilgari har bir qatorda qotib qolgan bir xil ✓ ✗ ✓ chizilardi — bu
// haqiqiy ma'lumotdek ko'rinib chalg'itardi. Endi maydon bo'lsa o'sha
// qiymat, bo'lmasa — chiziqcha.
function flagCell(v){
  if(v === undefined || v === null || v === '') return '<td style="text-align:center;color:var(--mut)">—</td>'
  return '<td style="text-align:center">' + (v ? CHK : CROSS) + '</td>'
}
function idCell(v){
  return v ? '<td style="text-align:center;white-space:nowrap">' + escapeHtml(String(v)) + '</td>'
           : '<td style="text-align:center;color:var(--mut)">—</td>'
}
const CROSS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E05B4E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`
const PENCIL = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`
const IMGICON = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="m21 15-5-5L5 21"/></svg>`
// Qator menyusi. Bandning manzili bo'lsa (go) — bosilganda o'sha
// bo'limga o'tadi; "card" bo'lsa Tashkilot kartasi AYNAN shu tashkilot
// bilan va kerakli yorliqda ochiladi. Manzilsiz bandlar asl tizimda bor,
// lekin bizda hali yo'q — ular "tez orada" deb ochiq aytiladi.
const ROW_MENU = [
  { label:'Telegram obunalari' },
  { label:'SMS huquqlari', go:['boshqaruv','sms-shablon'] },
  { label:'Balans',        card:'umumiy' },
  { label:'Narxlar',       card:'narx' },
  { label:'Imkoniyatlar',  card:'imkoniyat' },
  { label:'Limitni tiklash', go:['boshqaruv','balans-limiti'] },
  { label:'Hisob-faktura' },
  { label:'Shartnoma',     go:['moliya','contracts'] },
  { label:'Shartnomani yangilash new' },
  { label:'Pochta xatini yangilash' },
]

// ---- Mijozlar dashboard (statistika) ikonkalari ----
const IC_M_USERS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
const IC_M_CHECK = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
const IC_M_MINUS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>`
const IC_M_ALERT = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`
const IC_M_LOCK = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`

const STEP_LABELS = ['Filial','Direktor','Imkoniyatlar','Narxlar','Xizmatlar']
const TARIFFS = ['Standart',"Standart+",'Premium']
const LIMITS  = ['limit 10 mln','limit 20 mln','limit 50 mln','Cheksiz']
const CLIENT_STATUSES = [
  { key:'faol', label:'Faol', cls:'green' },
  { key:'yopilgan', label:'Yopilgan', cls:'gray' },
  { key:'limit', label:'Limit qo\'yilgan', cls:'amber' },
  { key:'bloklangan', label:'Bloklangan', cls:'red' },
]
function clientStatus(c){ return CLIENT_STATUSES.find(s=>s.key===c.status) ? c.status : 'faol' }
function clientStatusInfo(c){ return CLIENT_STATUSES.find(s=>s.key===clientStatus(c)) }
// Kirish/onlayn statistikasi uchun HAQIQIY login-kuzatuv hali yo'q — shu sabab
// har bir mijoz uchun ID asosida barqaror (doim bir xil) taxminiy son hosil
// qilinadi, shunda sahifa har safar qayta chizilganda raqamlar sakramaydi.
const ROLES   = ['Direktor','Menejer','Operator','mko +','Admin']
const CAPS    = ['EGOV','KATM','ANIQ','ASAXIY','APPLE','GET','SCORING','AUTO','MY UZCARD','PRIZMA','UNIACCESS']
const PRICES  = ['Shartnomani karta bilan rasmiylashtirish','Shartnomani kartasiz rasmiylashtirish',"Asaxiy MDM (ro'yxatdan o'tkazish)",'Apple MDM (регистрация)','Shartnomada Uniaccess kartalarini yangilash','Egov (soliq)',"GetMobi (ro'yxatdan o'tkazish)","Ican (mijoz haqida ma'lumot)","IMEI (ro'yxatdan o'tkazish)",'IMEI (qulflash)','Pochta','Prizma (контракты)','Скоринг (Akslab - KATM 023) (свой аккаунт)','Скоринг (Akslab - KATM 077) (свой аккаунт)','Скоринг (Akslab - KATM 023) (I can аккаунт)','Скоринг (Akslab - KATM 077) (I can аккаунт)','Baholash (Atmos)','Baholash (MyUzcard)','Baholash (Uniaccess - Humo)','Baholash (Uniaccess - Uzcard)','Uniaccess (чёрный список)','Uniaccess (контракты)','Aniq score (ID.Standart)','Aniq score (ID Pro Max (INPS + Card))','Aniq score (Aniq Limit)']
const SERVICES = [{l:'Click ga kirish'},{l:'MyUzcard ga kirish'},{l:'MyUzcard ga kirish (App)'},{l:'SMS ga kirish'},{l:'Pochtaga kirish'},{l:'IMEI ga kirish'},{l:'Crif ga kirish',b:1},{l:'Airba ga kirish'},{l:'Allgood ga kirish',b:1},{l:'Atmos Terminalining ID raqami'},{l:"Uniaccess-da avtomatik yechib olish boshlanishi uchun muddati o'tgan kunlar soni"},{l:'Sipuni ga kirish'},{l:'Aniq score ga kirish',b:1},{l:'Uniaccess branch ID'},{l:'-prizma_branch_id-'},{l:'Payme ga kirish'},{l:'KATM ga kirish'},{l:'-plum_my_uzcard-'},{l:'Asaxiy MDM ga kirish'},{l:'Akslab ga kirish'}]

// ---- Geo: havoladan koordinata ajratish + viloyat/tuman aniqlash ----
function parseGeo(s){
  if(!s) return null; s = String(s).trim()
  let m = s.match(/^\s*(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})\s*$/)
  if(m) return normLL(+m[1], +m[2])
  let lat=null, lng=null
  if((m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/))){ lat=+m[1]; lng=+m[2] }
  if(lat==null && (m = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/))){ lat=+m[1]; lng=+m[2] }
  if(lat==null && /google|goo\.gl|maps\.app/i.test(s) && (m = s.match(/[?&](?:q|query|ll|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/))){ lat=+m[1]; lng=+m[2] }
  if(lat==null && /yandex/i.test(s) && (m = s.match(/[?&](?:ll|pt)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i))){ lng=+m[1]; lat=+m[2] }
  if(lat==null && (m = s.match(/whatshere\[point\]=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i))){ lng=+m[1]; lat=+m[2] }
  if(lat==null && /2gis/i.test(s) && (m = s.match(/(-?\d+\.\d+),(-?\d+\.\d+)/))){ lng=+m[1]; lat=+m[2] }
  if(lat==null && (m = s.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/i))){ lat=+m[1]; lng=+m[2] }
  if(lat==null) return null
  return normLL(lat, lng)
}
function normLL(a, b){
  let lat=a, lng=b
  const inUz = (la,ln)=> la>=36 && la<=46 && ln>=54 && ln<=75
  if(!inUz(lat,lng) && inUz(lng,lat)){ const t=lat; lat=lng; lng=t }
  if(lat<-90||lat>90||lng<-180||lng>180) return null
  return { lat:+lat.toFixed(6), lng:+lng.toFixed(6) }
}
function nearestRegion(lat,lng){
  let best=null, bd=Infinity
  for(const name of Object.keys(REGION_COORDS)){
    const c=REGION_COORDS[name]; const d=(c[0]-lat)**2+(c[1]-lng)**2
    if(d<bd){ bd=d; best=name }
  }
  return best
}
const stripSfx = s => String(s||'').toLowerCase().replace(/[ʻ'’‘`´]/g,"'")
  .replace(/\s*(viloyati|respublikasi|shahri|shahar|tumani|tuman|sha\.|t\.|район[аи]?|области|область|вилояти|тумани|шаҳри|шахри)\.?\s*$/i,'').trim()
async function reverseTuman(lat,lng,region){
  try{
    const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),6500)
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=uz`,{signal:ctrl.signal,headers:{'Accept':'application/json'}})
    clearTimeout(t); const j=await r.json(); const a=j.address||{}
    const list=UZ_REGIONS[region]||[]
    const cand=[a.county,a.city_district,a.municipality,a.town,a.city,a.district,a.suburb,a.village].filter(Boolean)
    for(const c of cand){ const hit=list.find(d=>stripSfx(d)===stripSfx(c)); if(hit) return hit }
    return ''
  }catch(e){ return '' }
}
const RSHORT = r => String(r||'').replace(/\s*(viloyati|respublikasi)\s*$/i,'').trim()
const isUrl = s => /^https?:\/\//i.test(String(s||'').trim())
function locHref(c){
  if(c.lat!=null && c.lng!=null) return `https://yandex.uz/maps/?pt=${c.lng},${c.lat}&z=16`
  if(c.address && isUrl(c.address)) return c.address
  if(c.address) return 'https://yandex.uz/maps/?text='+encodeURIComponent(c.address+', Uzbekistan')
  if(c.region||c.district) return yandexSearchUrl(c.region,c.district)
  return null
}
function shortId(c){ const h=String(c.id||''); let n=0; for(let i=0;i<Math.min(h.length,8);i++) n=(n*31 + h.charCodeAt(i))>>>0; return String(1000 + (n%9000)) }
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function fmtDate(ts){ if(!ts) return '—'; const d=new Date(ts); const p=x=>String(x).padStart(2,'0'); return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} - ${p(d.getHours())}:${p(d.getMinutes())}` }

// Yangi qo'shilgan filial 3 oy davomida "NEW" belgisi bilan turadi.
// Muddat aynan uch oy oldingi shu kun bo'yicha hisoblanadi (30x3 kun emas) —
// shunda oy uzunligi farq qilsa ham chegara kutilganday chiqadi.
const YANGI_OY = 3
function yangimi(ts){
  if(!ts) return false
  const chegara = new Date()
  chegara.setMonth(chegara.getMonth() - YANGI_OY)
  return Number(ts) >= chegara.getTime()
}

// ICAN uslubidagi sahifalash — orgs.js'dagi pager bilan bir xil vizual, lekin
// bu yerda "…" bilan qisqartirilgan raqamlar ro'yxati ishlatiladi.
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
      <select class="pager-size" id="cl-page-size">
        ${[10,25,50,100].map(s=>`<option value="${s}" ${pageSize===s?'selected':''}>${s} / sahifa</option>`).join('')}
      </select>
    </div>
  `
}

// Dashboard.jsx'ning "Mijozlar/Filiallar" bo'limining vanilla JS ko'chirmasi.
export function mountClients(root, { toast }){
  let clients = null, err = ''
  let q = '', fRegion = '', fDistrict = '', fInn = '', fId = ''
  let editing = null // null | 'new' | client-obj
  let viewing = null // null | client-obj
  let detailTab = 'trans' // 'trans' | 'tasks'
  let tab = 'on'
  // Holat kartasi bosilganda shu bo'yicha filtrlash: 'all' — filtrsiz,
  // qolganlari ('faol'/'yopilgan'/'limit'/'bloklangan') — mijozning
  // haqiqiy status maydoni bo'yicha.
  let fCard = 'all'
  let showFilter = false
  let enabledMap = {}
  let menuFor = null
  let importBusy = false
  let page = 1, pageSize = 10
  let coordCleanup = null
  let wizState = null // 5-bosqichli wizard uchun vaqtinchalik holat (editing o'zgarganda qayta tiklanadi)
  let clientTasks = [] // shu kompaniyaga biriktirilgan vazifalar (ko'rish oynasida)
  let clientTasksLoaded = false
  let clientTaskProjects = [], clientTaskTeam = []

  // Qora ro'yxat / Atmos ID / MyUzcard ustunlari tashkilot yozuvida emas,
  // alohida sozlamalar faylida saqlanadi (Tashkilot kartasidagi kabi).
  // Ro'yxat bilan birga yuklab, jadvalda ko'rsatamiz.
  let cfgAll = {}
  // Balans ustuni: tashkilot yozuvida saqlanmaydi, tranzaksiyalardan
  // hisoblanadi. Faqat tranzaksiyasi bor tashkilotlar keladi.
  let balAll = {}
  // Ommaviy amal uchun tanlangan tashkilotlar (id'lar). Sahifa almashsa
  // ham saqlanadi — foydalanuvchi bir necha sahifadan yig'ishi mumkin.
  // Sozlama bo'yicha filtr: '' (yo'q) yoki 'bl' | 'mu' | 'cap:KATM' | 'blk:...' | 'pay:...'
  let fSetting = ''
  // Tanlangan sozlama BOR firmalarni ko'rsatamizmi ('on') yoki YO'Q
  // bo'lganlarini ('off'). Ilgari faqat 'bor' bo'yicha filtrlash mumkin edi.
  let fSettingOn = 'on'
  // "NEW" belgisi bo'yicha filtr — faqat oxirgi 3 oyda qo'shilganlar.
  // Jadvaldagi belgi bilan bir xil mantiq (yangimi()), shuning uchun
  // "NEW" yozuvi turgan qatorlar bilan filtr natijasi doim mos keladi.
  let fNew = false
  let picked = new Set()
  let bulkBusy = false
  async function load(){
    try{ clients = await api.clientsList(); err = '' }catch(ex){ err = ex.error||'Xatolik' }
    // Tashkilot kartasidagi "Tahrirlash" shu sahifaga qaysi tashkilotni
    // ochish kerakligini qoldirgan bo'lishi mumkin — ro'yxat kelgach
    // darhol o'sha tashkilotning tahrirlash oynasini ochamiz.
    const wantEdit = takeClientEditTarget()
    if(wantEdit){
      const c0 = (clients || []).find(x => x.id === wantEdit)
      if(c0){ wizState = null; viewing = null; editing = c0 }
      else toast('Tashkilot topilmadi')
    }
    render()
    try{ cfgAll = await api.clientSettingsAll() || {}; render() }catch(ex){ /* sozlama yo'q — ustunlar bo'sh qoladi */ }
    try{ balAll = await api.txBalances() || {}; render() }catch(ex){ /* tranzaksiya yo'q — ustun bo'sh qoladi */ }
  }

  async function loadClientTasks(clientId){
    clientTasksLoaded = false
    try{
      const [allTasks, projs, tm] = await Promise.all([api.tasksList(), api.projectsList().catch(()=>[]), api.team().catch(()=>[])])
      clientTasks = allTasks.filter(t=>t.clientId===clientId)
      clientTaskProjects = projs; clientTaskTeam = tm
    }catch(e){ clientTasks = [] }
    clientTasksLoaded = true
    if(viewing && viewing.id===clientId) render()
  }

  const normR = s => String(s==null?'':s).toLowerCase().replace(/[ʻ'’‘`´]/g,"'").replace(/\s+(viloyati|respublikasi)\s*$/,'').trim()
  const isOn = c => enabledMap[c.id] !== false

  function computeShown(){
    const ql = q.trim().toLowerCase()
    const fr = normR(fRegion), fd = normR(fDistrict)
    const inn = fInn.trim().toLowerCase(), fid = fId.trim().toLowerCase()
    return (clients||[])
      .filter(c => tab==='on' ? isOn(c) : !isOn(c))
      .filter(c => !fNew || yangimi(c.createdAt))
      .filter(c => !fr || normR(c.region)===fr)
      .filter(c => !fd || normR(c.district)===fd)
      .filter(c => !inn || String(c.inn||'').toLowerCase().includes(inn))
      .filter(c => !fid || shortId(c).toLowerCase().includes(fid) || String(c.id||'').includes(fid))
      .filter(c => !ql || [c.name,c.company,c.phone,c.dirLogin,c.address,c.region,c.district].map(x=>String(x||'').toLowerCase()).join(' ').includes(ql))
      .filter(matchCardFilter)
      .filter(matchSettingFilter)
      .sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))
  }

  // Yuqoridagi Monitoring/Mijozlar holati kartalaridan biri bosilganda shu
  // bo'yicha ro'yxatni filtrlaydi (mijDashboardHtml()dagi hisoblash bilan
  // bir xil mantiq — kartadagi son va jadvaldagi qatorlar mos kelishi uchun).
  // Sozlamalar fayli bo'yicha filtr (Qora ro'yxat, MyUzcard, imkoniyat va h.k.)
  function matchSettingFilter(c){
    if(!fSetting) return true
    const cfg = cfgAll[c.id] || {}
    let bor
    if(fSetting === 'bl') bor = cfg.blacklist === true
    else if(fSetting === 'mu') bor = cfg.myuzcard === true
    else {
      const i = fSetting.indexOf(':')
      const kind = fSetting.slice(0, i), key = fSetting.slice(i + 1)
      if(kind === 'cap') bor = !!(cfg.capabilities || {})[key]
      else if(kind === 'blk') bor = !!(cfg.blockers || {})[key]
      else if(kind === 'pay') bor = !!(cfg.payOrgs || {})[key]
      else return true
    }
    return fSettingOn === 'off' ? !bor : bor
  }

  function settingFilterLabel(v){
    if(v === 'bl') return "Qora ro'yxatda"
    if(v === 'mu') return 'MyUzcard yoqilgan'
    const i = v.indexOf(':')
    return v.slice(i + 1)
  }

  function matchCardFilter(c){
    if(!fCard || fCard==='all') return true
    return clientStatus(c) === fCard
  }
  function cardFilterLabel(key){
    return ({
      faol:'Faol mijozlar', yopilgan:'Yopilgan mijozlar', limit:"Limit qo'yilgan mijozlar", bloklangan:'Bloklangan mijozlar',
    })[key] || ''
  }

  // (lekin barqaror — ID hash asosida) sonlar ko'rsatiladi. MIJOZLAR HOLATI
  // qatori esa haqiqiy — har bir mijozning "status" maydonidan hisoblanadi.
  function mijDashboardHtml(list){
    const total = list.length
    const byStatus = key => list.filter(c => clientStatus(c) === key).length

    const statCard = (cls, ic, num, title, sub, key) => `
      <div class="mij-card top-${cls} mij-card-sm${fCard===key?' active':''}" data-card="${key}" title="Bosib, shu bo'yicha firmalarni ko'rish">
        <div class="mij-card-top"><span class="mij-card-ic">${ic}</span></div>
        <div class="mij-card-num">${num}</div>
        <div class="mij-card-title">${escapeHtml(title)}</div>
        <div class="mij-card-sub">${escapeHtml(sub)}</div>
      </div>`

    return `
      <div class="mij-dash">
        <div class="mij-dash-row cols-5">
          ${statCard('blue', IC_M_USERS, total, 'Jami mijozlar', 'biriktirilgan', 'all')}
          ${statCard('green', IC_M_CHECK, byStatus('faol'), 'Faol mijozlar', 'ishlayapti', 'faol')}
          ${statCard('gray', IC_M_MINUS, byStatus('yopilgan'), 'Yopilgan mijozlar', 'nofaol', 'yopilgan')}
          ${statCard('amber', IC_M_ALERT, byStatus('limit'), "Limit qo'yilgan mijozlar", 'cheklangan', 'limit')}
          ${statCard('red', IC_M_LOCK, byStatus('bloklangan'), 'Bloklangan mijozlar', 'kirish yo\'q', 'bloklangan')}
        </div>
      </div>
    `
  }

  function render(){
    if(editing) return renderWizard()
    if(viewing) return renderDetails()
    renderList()
  }

  // ---------------- Ro'yxat (asosiy sahifa) ----------------
  function pageAllPicked(items){ return items.length > 0 && items.every(c => picked.has(c.id)) }

  // Tanlanganda jadval tepasida chiqadigan amal paneli
  function bulkBarHtml(){
    if(!picked.size) return ''
    return `
      <div class="cl-bulk">
        <b>${picked.size} ta tanlandi</b>
        <span class="cl-bulk-sep"></span>
        <button type="button" class="btn small ghost" data-bulk="bl-on">Qora ro'yxatga</button>
        <button type="button" class="btn small ghost" data-bulk="bl-off">Qora ro'yxatdan chiqarish</button>
        <button type="button" class="btn small ghost" data-bulk="mu-on">MyUzcard yoqish</button>
        <button type="button" class="btn small ghost" data-bulk="mu-off">MyUzcard o'chirish</button>
        <span class="cl-bulk-sep"></span>
        <select id="cl-bulk-item" class="cl-bulk-sel">
          <optgroup label="Imkoniyat (dostup)">
            ${CAPABILITIES.map(g => `<option value="cap:${escapeHtml(g.key)}">${escapeHtml(g.key)}</option>`).join('')}
          </optgroup>
          <optgroup label="Bloklash moslamasi">
            ${BLOCKERS.map(b => `<option value="blk:${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('')}
          </optgroup>
          <optgroup label="To'lov tashkiloti">
            ${PAY_ORGS.map(o => `<option value="pay:${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}
          </optgroup>
        </select>
        <button type="button" class="btn small" data-bulk="item-on">Yoqish</button>
        <button type="button" class="btn small ghost" data-bulk="item-off">O'chirish</button>
        <span style="margin-left:auto"></span>
        <button type="button" class="btn small ghost" data-bulk="copy" title="Bitta tashkilotning barcha sozlamalarini tanlanganlarga ko'chirish">Shablondan nusxalash</button>
        <button type="button" class="btn small ghost" data-bulk="clear">Tanlovni bekor qilish</button>
      </div>`
  }

  function renderList(){
    const shown = computeShown()
    const pageCount = Math.max(1, Math.ceil(shown.length / pageSize))
    if(page>pageCount) page = pageCount
    const pageItems = shown.slice((page-1)*pageSize, page*pageSize)

    root.innerHTML = `
      <div class="dash-head" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <h2>Filiallar</h2>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <button class="btn small ghost" id="cl-template">⬇ Shablon</button>
          <button class="btn small ghost" id="cl-import-btn" ${importBusy?'disabled':''}>⬆ Import</button>
          <button class="btn small ghost" id="cl-export">⬇ Eksport</button>
          <button class="btn" id="cl-new">+ Qo'shish</button>
        </div>
      </div>

      ${clients ? mijDashboardHtml(clients) : ''}

      <div class="fil-tabs">
        <button class="${tab==='on'?'on':''}" data-tab="on">Yoqilgan</button>
        <button class="${tab==='off'?'on':''}" data-tab="off">O'chirilgan</button>
        <button class="fil-new${fNew?' on':''}" id="cl-newfilter" title="Faqat oxirgi 3 oyda qo'shilganlar">new <b>${(clients||[]).filter(c => (tab==='on'?isOn(c):!isOn(c)) && yangimi(c.createdAt)).length}</b></button>
        <div class="fil-search">
          ${IC_SEARCH}
          <input id="cl-q" value="${escapeHtml(q)}" placeholder="Kompaniya nomi yoki telefon bo'yicha qidirish…" />
          <button class="fil-btn${showFilter?' on':''}" id="cl-filter-toggle">${IC_FILTER} Filtr</button>
        </div>
        ${fCard && fCard!=='all' ? `
        <span class="mij-filter-chip">Filtr: ${escapeHtml(cardFilterLabel(fCard))} <button type="button" id="cl-card-filter-clear" title="Filtrni tozalash">✕</button></span>
        ` : ''}
        <select id="cl-setfilter" class="cl-bulk-sel" title="Sozlama bo'yicha filtr">
          <option value="">Sozlama bo'yicha filtr yo'q</option>
          <option value="bl"${fSetting==='bl'?' selected':''}>Qora ro'yxat</option>
          <option value="mu"${fSetting==='mu'?' selected':''}>MyUzcard'ga kirish</option>
          <optgroup label="Imkoniyat">
            ${CAPABILITIES.map(g=>`<option value="cap:${escapeHtml(g.key)}"${fSetting==='cap:'+g.key?' selected':''}>${escapeHtml(g.key)}</option>`).join('')}
          </optgroup>
          <optgroup label="Bloklash moslamasi">
            ${BLOCKERS.map(b=>`<option value="blk:${escapeHtml(b)}"${fSetting==='blk:'+b?' selected':''}>${escapeHtml(b)}</option>`).join('')}
          </optgroup>
          <optgroup label="To'lov tashkiloti">
            ${PAY_ORGS.map(o=>`<option value="pay:${escapeHtml(o)}"${fSetting==='pay:'+o?' selected':''}>${escapeHtml(o)}</option>`).join('')}
          </optgroup>
        </select>
        ${fSetting ? `<select id="cl-setstate" class="cl-bulk-sel" title="Ulangan yoki ulanmagan">
          <option value="on"${fSettingOn==='on'?' selected':''}>ulangan</option>
          <option value="off"${fSettingOn==='off'?' selected':''}>ulanmagan</option>
        </select>` : ''}
        <span class="count">${clients ? shown.length : '…'} topildi</span>
      </div>

      ${showFilter ? `
      <div class="fil-panel">
        <div class="fil-grid">
          <div class="wf"><label>Viloyat</label><select id="cl-fregion"><option value="">Barchasi</option>${REGION_NAMES.map(r=>`<option value="${escapeHtml(r)}" ${fRegion===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select></div>
          <div class="wf"><label>Tuman</label><select id="cl-fdistrict" ${fRegion?'':'disabled'}><option value="">Barchasi</option>${(UZ_REGIONS[fRegion]||[]).map(d=>`<option value="${escapeHtml(d)}" ${fDistrict===d?'selected':''}>${escapeHtml(d)}</option>`).join('')}</select></div>
          <div class="wf"><label>INN</label><input id="cl-finn" value="${escapeHtml(fInn)}" placeholder="INN" /></div>
          <div class="wf"><label>ID</label><input id="cl-fid" value="${escapeHtml(fId)}" placeholder="ID" /></div>
        </div>
        <div class="fil-acts">
          <button class="btn ghost" id="cl-filter-reset">↺ Qayta o'rnatish</button>
          <button class="btn" id="cl-filter-apply">Qo'llash</button>
        </div>
      </div>` : ''}

      ${err ? `<div class="err-box">${escapeHtml(err)}</div>` : ''}
      ${clients && shown.length===0 ? `<div class="empty">${tab==='off' ? "O'chirilgan filial yo'q." : "Filial topilmadi. \"+ Qo'shish\" bilan qo'shing."}</div>` : ''}

      ${bulkBarHtml()}

      ${clients && shown.length>0 ? `
      <div class="tbl-wrap">
        <table class="tbl fil-tbl">
          <thead><tr>
            <th class="cl-pick-th"><span class="ic-chk${pageAllPicked(pageItems) ? ' on' : ''}" id="cl-pick-all" title="Shu sahifadagilarni tanlash"></span></th>
            <th class="t-idx">№</th><th>YoQ/O'Ch</th><th>Kompaniya</th><th>ID</th><th>Balans</th>
            <th>Черный список</th><th>Atmos Terminalining ID raqami</th><th>MyUzcard ga kirish</th><th>Telefon</th><th>ICAN tarif</th><th>Yaratilgan</th><th></th>
          </tr></thead>
          <tbody id="cl-tbody"></tbody>
        </table>
        <div id="cl-pager">${renderPagerHtml(page, pageCount, pageSize, shown.length)}</div>
      </div>` : ''}

      <input id="cl-import-file" type="file" accept=".xlsx,.xls,.csv" style="display:none" />
    `

    renderRows(pageItems, page, pageSize)
    wireList(shown)
  }

  // Balans: musbat yashil, manfiy qizil, tranzaksiyasi yo'q bo'lsa "—".
  // Son o'ylab topilmaydi — ma'lumot yo'q bo'lsa bo'sh chiziq turadi.
  function balCell(b){
    if(!b) return '<td style="white-space:nowrap;color:var(--mut)">—</td>'
    const v = b.balans || 0
    const rang = v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--mut)'
    return '<td class="mono-num" style="white-space:nowrap;font-weight:800;color:' + rang + '">'
      + (v > 0 ? '+' : '') + v.toLocaleString('ru-RU').replace(/,/g, ' ') + '</td>'
  }

  function renderRows(items, page, pageSize){
    const tb = qs('#cl-tbody', root)
    if(!tb) return
    tb.innerHTML = items.map((c,i)=>`
      <tr data-id="${c.id}"${picked.has(c.id) ? ' class="cl-picked"' : ''}>
        <td class="cl-pick-td"><span class="ic-chk${picked.has(c.id) ? ' on' : ''}" data-pick="${c.id}"></span></td>
        <td class="t-idx">${(page-1)*pageSize + i + 1}</td>
        <td><button type="button" class="tgl${isOn(c)?' on':''}" data-toggle><span></span></button></td>
        <td class="t-firm"><div style="display:flex;align-items:center;gap:9px;min-width:170px">
          <span data-logo-host></span>
          <div style="line-height:1.2"><div>${escapeHtml(c.name)}${yangimi(c.createdAt) ? '<span class="t-new">new</span>' : ''}</div>${c.company ? `<small style="color:var(--mut);font-weight:700">${escapeHtml(c.company)}</small>` : ''}</div></div></td>
        <td class="mono-num" style="white-space:nowrap;color:var(--mut);font-weight:800">${shortId(c)}</td>
        ${balCell(balAll[c.id])}
        ${flagCell((cfgAll[c.id]||{}).blacklist)}
        ${idCell((cfgAll[c.id]||{}).atmosId)}
        ${flagCell((cfgAll[c.id]||{}).myuzcard)}
        <td style="white-space:nowrap">${c.phone ? `<a href="tel:${c.phone.replace(/\s/g,'')}" style="color:var(--b7);text-decoration:none;font-weight:700">${escapeHtml(c.phone)}</a>` : `<span style="color:var(--mut)">—</span>`}</td>
        <td style="white-space:nowrap">${c.tariff ? escapeHtml(c.tariff) : `<span style="color:var(--mut)">—</span>`}</td>
        <td style="white-space:nowrap;color:var(--mut)">${fmtDate(c.createdAt)}</td>
        <td>
          <div class="row-acts">
            <button class="ic-btn" title="Tahrirlash" data-edit>${IC_EDIT}</button>
            <button class="ic-btn" title="Tashkilot kartasi — imkoniyat, narx va xizmatlar" data-card>${IC_CARD}</button>
            <button class="ic-btn accent" title="Kompaniya paneliga kirish" data-enter>${IC_ENTER}</button>
            <div style="position:relative">
              <button class="ic-btn" title="Boshqa amallar" data-menu>${IC_DOTS}</button>
              ${menuFor===c.id ? `
                <div class="menu-back" data-menu-back></div>
                <div class="row-menu">
                  ${ROW_MENU.map((m,i)=>`<button data-menu-item="${i}"${m.go||m.card?'':' class="soon"'}>${escapeHtml(m.label)}</button>`).join('')}
                  <div class="row-menu-sep"></div>
                  <button class="danger" data-menu-remove>O'chirish</button>
                </div>` : ''}
            </div>
          </div>
        </td>
      </tr>
    `).join('')
    qsa('tr', tb).forEach(tr=>{
      const c = items.find(x=>x.id===tr.dataset.id)
      if(c && c.logo){ const host = qs('[data-logo-host]', tr); host.appendChild(smartLogoEl(c.logo, {height:26,maxWidth:44})) }
    })
  }

  function wireList(shown){
    qs('#cl-new', root).addEventListener('click', ()=>{ wizState = null; editing = 'new'; render() })
    qs('#cl-template', root).addEventListener('click', doTemplate)
    qs('#cl-export', root).addEventListener('click', ()=>doExport(shown))
    const importBtn = qs('#cl-import-btn', root)
    const importFile = qs('#cl-import-file', root)
    importBtn.addEventListener('click', ()=>{ if(!importBusy) importFile.click() })
    importFile.addEventListener('change', onImport)

    const qInput = qs('#cl-q', root)
    qInput.addEventListener('input', e=>{ q = e.target.value; page = 1 })
    qInput.addEventListener('keydown', e=>{ if(e.key==='Enter') render() })
    qInput.addEventListener('blur', ()=> render())

    qs('#cl-filter-toggle', root).addEventListener('click', ()=>{ showFilter = !showFilter; render() })
    const fr = qs('#cl-fregion', root); if(fr) fr.addEventListener('change', e=>{ fRegion = e.target.value; fDistrict = ''; render() })
    const fd = qs('#cl-fdistrict', root); if(fd) fd.addEventListener('change', e=>{ fDistrict = e.target.value })
    const fin = qs('#cl-finn', root); if(fin) fin.addEventListener('input', e=>{ fInn = e.target.value })
    const fidEl = qs('#cl-fid', root); if(fidEl) fidEl.addEventListener('input', e=>{ fId = e.target.value })
    const fReset = qs('#cl-filter-reset', root); if(fReset) fReset.addEventListener('click', ()=>{ fRegion=''; fDistrict=''; fInn=''; fId=''; q=''; page=1; render() })
    const fApply = qs('#cl-filter-apply', root); if(fApply) fApply.addEventListener('click', ()=>{ showFilter=false; page=1; render() })

    on(qs('.fil-tabs', root), 'click', 'button[data-tab]', (e,btn)=>{ tab = btn.dataset.tab; page = 1; menuFor = null; render() })
    const newF = qs('#cl-newfilter', root)
    if(newF) newF.addEventListener('click', ()=>{ fNew = !fNew; page = 1; menuFor = null; render() })

    const clearChipBtn = qs('#cl-card-filter-clear', root)
    if(clearChipBtn) clearChipBtn.addEventListener('click', ()=>{ fCard = 'all'; page = 1; render() })

    const dash = qs('.mij-dash', root)
    if(dash){
      on(dash, 'click', '.mij-card[data-card]', (e,btn)=>{
        const key = btn.dataset.card
        fCard = (fCard===key) ? 'all' : key
        page = 1; menuFor = null
        render()
        const target = qs('.tbl-wrap', root) || qs('.fil-tabs', root)
        if(target) target.scrollIntoView({ behavior:'smooth', block:'start' })
      })
    }

    const pager = qs('#cl-pager', root)
    if(pager){
      on(pager, 'click', '.pg', (e,btn)=>{ if(btn.disabled) return; page = Number(btn.dataset.page); render() })
      const sizeSel = qs('#cl-page-size', pager); if(sizeSel) sizeSel.addEventListener('change', e=>{ pageSize = Number(e.target.value); page = 1; render() })
    }

    // ---- ommaviy tanlov ----
    const setF = qs('#cl-setfilter', root)
    if(setF) setF.addEventListener('change', ()=>{ fSetting = setF.value; page = 1; render() })
    const setS = qs('#cl-setstate', root)
    if(setS) setS.addEventListener('change', ()=>{ fSettingOn = setS.value; page = 1; render() })

    const pickAll = qs('#cl-pick-all', root)
    if(pickAll) pickAll.addEventListener('click', ()=>{
      const items = computeShown().slice((page-1)*pageSize, page*pageSize)
      if(pageAllPicked(items)) items.forEach(c => picked.delete(c.id))
      else items.forEach(c => picked.add(c.id))
      render()
    })

    const bulkBar = qs('.cl-bulk', root)
    if(bulkBar) on(bulkBar, 'click', '[data-bulk]', async (e, btn)=>{
      const act = btn.dataset.bulk
      if(act === 'clear'){ picked.clear(); render(); return }
      // Shablondan nusxalash: manba tashkilotning BARCHA sozlamasi
      // (imkoniyat, narx, bloklash, to'lov, qora ro'yxat, MyUzcard)
      // tanlanganlarga ko'chiriladi. Atmos ID ko'chirilmaydi — u har
      // tashkilot uchun o'ziga xos raqam.
      if(act === 'copy'){
        if(bulkBusy) return
        const withCfg = Object.keys(cfgAll)
        if(!withCfg.length) return toast("Sozlamasi bor tashkilot yo'q — avval bittasini sozlang")
        const nameOf = id => { const c = (clients||[]).find(x => x.id === id); return c ? c.name : id }
        const src = prompt(
          'Qaysi tashkilot shablon bo\'lsin? Raqamini kiriting:\n\n' +
          withCfg.map((id, i) => (i + 1) + '. ' + nameOf(id)).join('\n')
        )
        const n = Number(src)
        if(!n || n < 1 || n > withCfg.length) return
        const srcId = withCfg[n - 1]
        const ids = [...picked].filter(id => id !== srcId)
        if(!ids.length) return toast('Manbadan boshqa tashkilot tanlanmagan')
        const c = cfgAll[srcId] || {}
        const patch = {
          capabilities: c.capabilities || {},
          prices: c.prices || {},
          blockers: c.blockers || {},
          payOrgs: c.payOrgs || {},
        }
        if(typeof c.blacklist === 'boolean') patch.blacklist = c.blacklist
        if(typeof c.myuzcard === 'boolean') patch.myuzcard = c.myuzcard
        const nPx = Object.keys(c.prices || {}).length
        const msg = nameOf(srcId) + " sozlamalari " + ids.length + " ta tashkilotga ko'chirilsinmi?\n\n" +
          "Ko'chiriladi: imkoniyatlar, bloklash moslamalari, to'lov tashkilotlari, qora ro'yxat, MyUzcard" +
          (nPx ? ", narxlar (" + nPx + " ta)" : "") + ".\n" +
          "Ko'chirilmaydi: Atmos terminal ID."
        if(!confirm(msg)) return
        bulkBusy = true
        try{
          const r = await api.clientSettingsBulk(ids, patch)
          cfgAll = await api.clientSettingsAll() || {}
          toast(r.changed + " ta tashkilotga ko'chirildi")
          picked.clear()
        }catch(ex){ toast(ex.error || 'Xatolik') }
        bulkBusy = false
        render()
        return
      }
      if(bulkBusy) return
      let patch =
        act === 'bl-on'  ? { blacklist:true }  :
        act === 'bl-off' ? { blacklist:false } :
        act === 'mu-on'  ? { myuzcard:true }   :
        act === 'mu-off' ? { myuzcard:false }  : null
      // Tanlagichdagi band: "cap:KATM", "blk:Mobilock", "pay:Payme"
      if(act === 'item-on' || act === 'item-off'){
        const sel = qs('#cl-bulk-item', root)
        const val = sel ? sel.value : ''
        const on = act === 'item-on'
        const i = val.indexOf(':')
        const kind = val.slice(0, i), key = val.slice(i + 1)
        if(kind === 'cap'){
          const caps = { [key]: on }
          // Guruh o'chirilsa ichidagi huquqlar ham o'chadi — karta bilan bir xil mantiq
          if(!on){
            const g = CAPABILITIES.find(x => x.key === key)
            if(g) g.items.forEach(it => { caps[key + '|' + it] = false })
          }
          patch = { capabilities: caps }
        }
        else if(kind === 'blk') patch = { blockers: { [key]: on } }
        else if(kind === 'pay') patch = { payOrgs: { [key]: on } }
      }
      if(!patch) return
      const ids = [...picked]
      const selEl = qs('#cl-bulk-item', root)
      const nomi = (act === 'item-on' || act === 'item-off') && selEl
        ? selEl.options[selEl.selectedIndex].textContent + (act === 'item-on' ? ' — yoqilsinmi' : " — o'chirilsinmi")
        : btn.textContent.trim()
      if(!confirm(ids.length + ' ta tashkilot · ' + nomi + '?')) return
      bulkBusy = true
      try{
        const r = await api.clientSettingsBulk(ids, patch)
        cfgAll = await api.clientSettingsAll() || {}
        toast(r.changed + " ta tashkilot yangilandi" + (r.skipped ? ' · ' + r.skipped + ' tashlab ketildi' : ''))
        picked.clear()
      }catch(ex){ toast(ex.error || 'Xatolik') }
      bulkBusy = false
      render()
    })

    const tbody = qs('#cl-tbody', root)
    if(tbody){
      on(tbody, 'click', '[data-pick]', (e,btn)=>{
        const id = btn.dataset.pick
        if(picked.has(id)) picked.delete(id); else picked.add(id)
        render()
      })
      on(tbody, 'click', '[data-toggle]', (e,btn)=>{
        const tr = btn.closest('tr'); const c = shown.find(x=>x.id===tr.dataset.id)
        enabledMap = { ...enabledMap, [c.id]: (enabledMap[c.id]===false) ? true : false }
        render()
      })
      on(tbody, 'click', '[data-edit]', (e,btn)=>{ const tr = btn.closest('tr'); wizState = null; editing = shown.find(x=>x.id===tr.dataset.id); render() })
      // "Tashkilot kartasi" — Boshqaruv → Filiallar → Tashkilot kartasi
      // sahifasini AYNAN shu tashkilot bilan ochadi (u yerdagi ro'yxatdan
      // qayta qidirishga hojat qolmaydi).
      on(tbody, 'click', '[data-card]', (e,btn)=>{
        const tr = btn.closest('tr')
        setCompanyCardTarget(tr.dataset.id)
        goto('boshqaruv', 'filial-kartasi')
      })
      on(tbody, 'click', '[data-enter]', ()=> toast("Kompaniya paneliga kirish — tez orada"))
      on(tbody, 'click', '[data-menu]', (e,btn)=>{ const tr = btn.closest('tr'); const id = tr.dataset.id; menuFor = menuFor===id ? null : id; render() })
      on(tbody, 'click', '[data-menu-back]', ()=>{ menuFor = null; render() })
      on(tbody, 'click', '[data-menu-item]', (e,btn)=>{
        const m = ROW_MENU[Number(btn.dataset.menuItem)]
        const id = btn.closest('tr').dataset.id
        menuFor = null
        if(!m) return render()
        if(m.card){ setCompanyCardTarget(id, m.card); return goto('boshqaruv', 'filial-kartasi') }
        if(m.go){ render(); return goto(m.go[0], m.go[1]) }
        toast(m.label + " — bu bo'lim hali qo'shilmagan")
        render()
      })
      on(tbody, 'click', '[data-menu-remove]', async (e,btn)=>{
        const tr = btn.closest('tr'); const c = shown.find(x=>x.id===tr.dataset.id)
        menuFor = null
        if(!confirm(`"${c.name}" o'chirilsinmi?`)) { render(); return }
        try{ await api.clientRemove(c.id); toast("O'chirildi"); load() }catch(ex){ toast(ex.error) }
      })
    }
  }

  // ---------------- Excel: shablon / import / eksport ----------------
  function doTemplate(){
    const X = window.XLSX; if(!X) return toast('Excel kutubxonasi yuklanmadi')
    const sample = [['Abu Mobile','+998 90 123 45 67','Chilonzor 5-kv','Toshkent shahri','Chilonzor'],
      ['Zara Shop','+998 91 234 56 78','Registon 12','Samarqand viloyati','Samarqand shahri']]
    const ws = X.utils.aoa_to_sheet([IMPORT_COLS, ...sample]); ws['!cols']=IMPORT_COLS.map(()=>({wch:24}))
    const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'Mijozlar'); X.writeFile(wb, 'mijozlar_shablon.xlsx')
  }
  function onImport(e){
    const f = e.target.files && e.target.files[0]; e.target.value = ''
    if(!f) return
    const X = window.XLSX; if(!X) return toast('Excel kutubxonasi yuklanmadi')
    importBusy = true; render()
    const r = new FileReader()
    r.onload = async ()=>{
      try{
        const wb = X.read(r.result, {type:'array'}); const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = X.utils.sheet_to_json(ws, {defval:''})
        const pick = (row,names)=>{ for(const n of names) for(const k of Object.keys(row)) if(String(k).trim().toLowerCase()===n.toLowerCase()) return row[k]; return '' }
        const out = []
        rows.forEach(row=>{
          const name = String(pick(row,['Firma nomi','firma','company','nomi'])||'').trim(); if(!name) return
          let region = String(pick(row,['Viloyat','region'])||'').trim()
          let district = String(pick(row,['Tuman','district'])||'').trim()
          if(region && !REGION_NAMES.includes(region)){ region=''; district='' }
          else if(region && district && !(UZ_REGIONS[region]||[]).includes(district)) district=''
          out.push({ name, phone:String(pick(row,['Telefon','phone','tel'])||'').trim(), address:String(pick(row,['Manzil','address'])||'').trim(), region, district })
        })
        if(!out.length){ toast('Faylda mijoz topilmadi'); importBusy = false; render(); return }
        const res = await api.clientsImport(out)
        toast(`✅ ${res.added} ta qo'shildi${res.skipped?`, ${res.skipped} o'tkazildi`:''}`)
        importBusy = false; load()
      }catch(ex){ toast('Import xatosi: '+(ex.error||ex.message||'')); importBusy = false; render() }
    }
    r.onerror = ()=>{ importBusy = false; toast("Faylni o'qib bo'lmadi"); render() }
    r.readAsArrayBuffer(f)
  }
  function doExport(shown){
    const X = window.XLSX; if(!X) return toast('Excel kutubxonasi yuklanmadi')
    const head=['Firma nomi','Telefon','Manzil','Viloyat','Tuman','Lat','Lng']
    const aoa=[head]; shown.forEach(c=>aoa.push([c.name,c.phone||'',c.address||'',c.region||'',c.district||'',c.lat??'',c.lng??'']))
    const ws=X.utils.aoa_to_sheet(aoa); ws['!cols']=head.map(()=>({wch:20}))
    const wb=X.utils.book_new(); X.utils.book_append_sheet(wb,ws,'Mijozlar'); X.writeFile(wb,'mijozlar.xlsx')
  }

  // ---------------- Ma'lumotlarni ko'rish (ko'z ikonkasi) ----------------
  function renderDetails(){
    const c = viewing
    const F = (label,val,link) => `<div class="dv-f"><label>${escapeHtml(label)}</label>${link&&val ? `<a href="${link}" target="_blank" rel="noopener">${escapeHtml(val)}</a>` : `<div>${val?escapeHtml(val):`<span style="color:var(--mut)">—</span>`}</div>`}</div>`
    // Bo'sh maydonlar alohida-alohida "—" bo'lib turmasin: to'ldirilganlari
    // odatdagidek, qolganlari esa pastda bitta kulrang qatorda sanaladi.
    const FLIST = list => {
      const bor = list.filter(x => x[1] != null && String(x[1]).trim() !== '')
      const yoq = list.filter(x => x[1] == null || String(x[1]).trim() === '').map(x => x[0])
      return '<div class="dv-body">'
        + (bor.length ? '<div class="dv-grid">' + bor.map(x => F(x[0], x[1], x[2])).join('') + '</div>' : '')
        + (yoq.length ? '<div class="dv-empty">To' + "'" + 'ldirilmagan: ' + escapeHtml(yoq.join(', ')) + '</div>' : '')
        + '</div>'
    }
    const href = locHref(c)
    root.innerHTML = `
      <div>
        <div class="wiz-head"><button class="wiz-back" id="cl-dv-back" title="Orqaga">‹</button><b>${escapeHtml(c.name)}</b>
          <div style="margin-left:auto;display:flex;gap:10px">
            <button class="btn ghost" id="cl-dv-card">Tashkilot kartasi</button>
            <button class="btn ghost" id="cl-dv-edit">Tahrirlash</button>
            <button class="btn" id="cl-dv-sync">↻ Ombor bilan sinxronlashtirish</button>
          </div>
        </div>
        <div class="wiz-card">
          <div class="dv-top">
            <div class="dv-logo">${c.logo ? `<img src="${c.logo}" alt="" />` : IMGICON}</div>
              ${FLIST([
                ['Nomlanish', c.name], ['Kompaniya', c.company], ['Telefon', c.phone],
                ['Manzil', c.address, href], ['Direktorning FISH', c.dirName],
                ['Direktor telefoni', c.dirPhone], ['Login', c.dirLogin],
                ['Bank', c.bank], ['INN', c.inn], ['MFO', c.mfo],
                ["To'lov hisob raqami", c.account],
                ['Viloyat / Tuman', [c.region, c.district].filter(Boolean).join(', ')],
                ['ICAN tarif', c.tariff], ['Shartnoma raqami', c.contractNo],
                ['Ota-ona', c.parent], ['Izoh', c.note],
              ])}
          </div>
        </div>
        <div class="wiz-card">
          <div class="seg" id="cl-dv-tabs" style="margin-bottom:14px">
            <button type="button" class="${detailTab==='trans'?'on':''}" data-tab="trans">Tranzaksiyalar</button>
            <button type="button" class="${detailTab==='tasks'?'on':''}" data-tab="tasks">Vazifalar${clientTasksLoaded && clientTasks.length>0 ? ` <span class="cnt">${clientTasks.length}</span>` : ''}</button>
            <button type="button" class="${detailTab==='calls'?'on':''}" data-tab="calls">Qo'ng'iroqlar</button>
          </div>
          ${detailTab==='trans' ? `
            <div class="empty" style="padding:34px">Tranzaksiyalar mavjud emas.</div>
          ` : detailTab==='calls' ? `
            <div class="empty" style="padding:34px">Qo'ng'iroqlar mavjud emas.</div>
          ` : `
            ${!clientTasksLoaded ? `<div class="empty" style="padding:34px">Yuklanmoqda…</div>` :
              clientTasks.length===0 ? `<div class="empty" style="padding:34px">Bu kompaniyaga biriktirilgan vazifa yo'q.</div>` : `
              <div class="tbl-wrap" style="box-shadow:none;border:1px solid var(--line)">
                <table class="tbl">
                  <thead><tr><th>Vazifa nomi</th><th>Loyiha</th><th>Ijrochi</th><th>Holat</th></tr></thead>
                  <tbody>
                    ${clientTasks.map(t=>{
                      const proj = clientTaskProjects.find(p=>p.id===t.projectId)
                      const assigneeName = (clientTaskTeam.find(x=>x.id===t.assignee)||{}).name
                      const st = STATUS_LIST.find(s=>s.key===t.status)
                      return `
                      <tr>
                        <td class="t-firm">${escapeHtml(t.title)}</td>
                        <td>${proj ? escapeHtml(proj.icon)+' '+escapeHtml(proj.name) : '—'}</td>
                        <td>${assigneeName ? escapeHtml(assigneeName) : '—'}</td>
                        <td><span style="display:inline-flex;align-items:center;gap:6px"><span style="width:7px;height:7px;border-radius:50%;background:${st?st.color:'#8CA0A8'};display:inline-block"></span>${escapeHtml(st?st.label:t.status)}</span></td>
                      </tr>`
                    }).join('')}
                  </tbody>
                </table>
              </div>`}
          `}
        </div>
      </div>
    `
    qs('#cl-dv-back', root).addEventListener('click', ()=>{ viewing = null; render() })
    qs('#cl-dv-card', root).addEventListener('click', ()=>{
      setCompanyCardTarget(viewing.id)
      goto('boshqaruv', 'filial-kartasi')
    })
    qs('#cl-dv-edit', root).addEventListener('click', ()=>{ const cc = viewing; viewing = null; wizState = null; editing = cc; render() })
    qs('#cl-dv-sync', root).addEventListener('click', ()=> toast('Ombor bilan sinxronlash — tez orada'))
    on(qs('#cl-dv-tabs', root), 'click', 'button', (e,btn)=>{ detailTab = btn.dataset.tab; render() })
  }

  // ---------------- 5-bosqichli mijoz (kompaniya) wizard ----------------
  function renderWizard(){
    const client = editing==='new' ? null : editing
    const isEditing = !!client
    if(!wizState){
      wizState = {
        step: 1,
        name: client?.name||'', company: client?.company||'', parent: client?.parent||'', partner: client?.partner||'',
        tariff: client?.tariff||'', balanceLimit: client?.balanceLimit||'', status: client?client.status||'faol':'faol', region: client?.region||'', district: client?.district||'',
        address: client?.address||'', phone: client?.phone||'+998 ', qqs: client?.qqs||'', bonusMonths: client?.bonusMonths||'',
        logo: client?.logo||'', note: client?.note||'', setupDate: client?.setupDate||'', bank: client?.bank||'', inn: client?.inn||'',
        mfo: client?.mfo||'', account: client?.account||'', contractNo: client?.contractNo||'',
        locLink: '', lat: typeof client?.lat==='number'?client.lat:null, lng: typeof client?.lng==='number'?client.lng:null,
        geoBusy: false, geoMsg: '',
        dirName: client?.dirName||'', dirLogin: client?.dirLogin||'', dirPhone: client?.dirPhone||'', dirRole: client?.dirRole||'',
        caps: { ANIQ:true, AUTO:true, 'MY UZCARD':true, PRIZMA:true },
        err: '', busy: false,
      }
    }
    renderWizardBody(wizState, isEditing)
  }

  async function onLoc(st, v, isEditing){
    st.locLink = v
    const g = parseGeo(v); if(!g){ st.geoMsg = ''; renderWizardBody(st, isEditing); return }
    st.lat = g.lat; st.lng = g.lng
    const reg = nearestRegion(g.lat, g.lng); if(reg){ st.region = reg; st.district = '' }
    st.geoBusy = true; st.geoMsg = 'Viloyat/tuman aniqlanmoqda…'
    renderWizardBody(st, isEditing)
    const tum = await reverseTuman(g.lat, g.lng, reg); if(tum) st.district = tum
    st.geoBusy = false
    st.geoMsg = `📍 ${g.lat.toFixed(5)}, ${g.lng.toFixed(5)} — ${RSHORT(reg)}${tum?' · '+tum:" (tumanni qo'lda tanlang)"}`
    renderWizardBody(st, isEditing)
  }

  function renderWizardBody(st, isEditing){
    if(coordCleanup){ coordCleanup(); coordCleanup = null }
    root.innerHTML = `
      <div class="wiz">
        <div class="wiz-head">
          <button class="wiz-back" id="wz-back" title="Orqaga">‹</button>
          <b>${isEditing ? 'Filialni tahrirlash' : 'Yangi filial'}</b>
        </div>
        <div class="wiz-steps">
          ${STEP_LABELS.map((lb,i)=>{ const n=i+1; return `<div class="wiz-step${n===st.step?' on':''}${n<st.step?' done':''}" data-step="${n}"><span class="dot">${n}</span><em>${escapeHtml(lb)}</em></div>` }).join('')}
        </div>
        <div class="wiz-body">
          ${st.step===1 ? wizStep1Html(st) : ''}
          ${st.step===2 ? wizStep2Html(st) : ''}
          ${st.step===3 ? wizStep3Html(st) : ''}
          ${st.step===4 ? wizStep4Html() : ''}
          ${st.step===5 ? wizStep5Html() : ''}
          ${st.err ? `<div class="auth-err" style="margin-top:14px">${escapeHtml(st.err)}</div>` : ''}
        </div>
        <div class="wiz-foot">
          <div>${st.step>1 ? `<button class="btn ghost" id="wz-prev">‹ Orqaga</button>` : ''}</div>
          <div style="display:flex;gap:10px">
            <button class="btn ghost" id="wz-cancel">Bekor</button>
            ${st.step<5 ? `<button class="btn ghost" id="wz-next">Keyin ›</button>` : ''}
            <button class="btn" id="wz-save" ${st.busy?'disabled':''}>${st.busy?'Saqlanmoqda…':(isEditing?'Yangilash':'Saqlash')}</button>
          </div>
        </div>
      </div>
    `
    if(st.step===1){
      coordCleanup = mountCoordPicker(qs('#wz-coord', root), {
        lat: st.lat, lng: st.lng, center: st.region ? REGION_COORDS[st.region] : null,
        onPick(la,ln){ st.lat = la; st.lng = ln; renderWizardBody(st, isEditing) }
      })
    }
    wireWizard(st, isEditing)
  }

  function wizStep1Html(st){
    return `
      <div class="wiz-card">
        <h4>Filial</h4>
        <div class="wiz-grid">
          <div class="wf"><label>Nomlanish<span class="req"> *</span></label><input name="name" value="${escapeHtml(st.name)}" placeholder="Kompaniya nomi" /></div>
          <div class="wf"><label>Kompaniya</label><input name="company" value="${escapeHtml(st.company)}" placeholder="Kompaniya" /></div>
          <div class="wf"><label>Ota-ona</label><input name="parent" value="${escapeHtml(st.parent)}" placeholder="Ota-ona tashkilot" /></div>
          <div class="wf"><label>Hamkor</label><input name="partner" value="${escapeHtml(st.partner)}" placeholder="Hamkor" /></div>
          <div class="wf"><label>ICAN tarif</label><select name="tariff" style="width:100%"><option value="">—</option>${TARIFFS.map(t=>`<option ${st.tariff===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select></div>
          <div class="wf"><label>Balans limiti</label><select name="balanceLimit" style="width:100%"><option value="">—</option>${LIMITS.map(t=>`<option ${st.balanceLimit===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select></div>
          <div class="wf"><label>Holat</label><select name="status" style="width:100%">${CLIENT_STATUSES.map(s=>`<option value="${s.key}" ${st.status===s.key?'selected':''}>${escapeHtml(s.label)}</option>`).join('')}</select></div>
          <div class="wf"><label>Viloyat</label><select name="region" style="width:100%"><option value="">—</option>${REGION_NAMES.map(r=>`<option ${st.region===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select></div>
          <div class="wf"><label>Tuman</label><select name="district" style="width:100%" ${st.region?'':'disabled'}><option value="">—</option>${(UZ_REGIONS[st.region]||[]).map(d=>`<option ${st.district===d?'selected':''}>${escapeHtml(d)}</option>`).join('')}</select></div>
          <div class="wf"><label>Manzil</label><input name="address" value="${escapeHtml(st.address)}" placeholder="Ko'cha, uy" /></div>
          <div class="wf"><label>Telefon<span class="req"> *</span></label><input name="phone" value="${escapeHtml(st.phone)}" placeholder="+998 90 123 45 67" /></div>
          <div class="wf"><label>QQS (%)</label><input name="qqs" value="${escapeHtml(st.qqs)}" placeholder="0" inputmode="numeric" /></div>
          <div class="wf"><label>Bonuslar hisob davri (oylarda)</label><input name="bonusMonths" value="${escapeHtml(st.bonusMonths)}" placeholder="12" inputmode="numeric" /></div>
          <div class="wf full"><label>Lokatsiya (xarita havolasi)<span class="req"> *</span></label>
            <input name="locLink" value="${escapeHtml(st.locLink)}" placeholder="https://yandex.uz/maps/... yoki https://maps.google.com/..." />
            <div class="wf-hint">Yandex/Google xarita havolasini joylang — viloyat/tuman avtomatik tanlanadi. Yoki yuqoridagi Manzil/Viloyatni to'ldiring.</div>
          </div>
          ${st.geoMsg ? `<div class="wf full" style="margin-top:-4px"><div class="hint" style="color:${st.geoBusy?'var(--mut)':'var(--b7)'};font-weight:700;display:flex;align-items:center;gap:7px">${st.geoBusy?'<span class="mini-spin dark"></span>':''}${escapeHtml(st.geoMsg)}</div></div>` : ''}
          <div class="wf full">
            <div id="wz-coord"></div>
            ${(st.lat!=null && st.lng!=null) ? `<div class="hint" style="margin-top:4px;display:flex;justify-content:space-between"><span>Tanlandi: ${st.lat.toFixed(5)}, ${st.lng.toFixed(5)}</span><span id="wz-coord-clear" style="color:var(--red);cursor:pointer;font-weight:700">tozalash</span></div>` : ''}
          </div>
          <div class="wf full"><label>Logotip<span class="req"> *</span></label>
            <div class="logo-row">
              <div class="logo-box" id="wz-logo-box">${st.logo ? `<img src="${st.logo}" alt="" />` : IMGICON}</div>
              <label class="btn-attach">📎 Biriktirish<input type="file" accept="image/*" hidden name="logoFile" /></label>
              ${st.logo ? `<button type="button" class="lnk danger" style="margin-left:4px" id="wz-logo-remove">O'chirish</button>` : ''}
            </div>
          </div>
          <div class="wf full"><label>Izoh</label><textarea name="note" rows="3" placeholder="Izoh…">${escapeHtml(st.note)}</textarea></div>
        </div>
      </div>
      <div class="wiz-card">
        <h4>O'rnatish balansi</h4>
        <div class="wiz-grid">
          <div class="wf"><label>Boshlang'ich balansni to'lash sanasi</label><input type="date" name="setupDate" value="${escapeHtml(st.setupDate)}" /></div>
        </div>
      </div>
      <div class="wiz-card">
        <h4>Rekvizitlar</h4>
        <div class="wiz-grid">
          <div class="wf full"><label>Bank</label><input name="bank" value="${escapeHtml(st.bank)}" placeholder="Bank nomi" /></div>
          <div class="wf"><label>INN</label><input name="inn" value="${escapeHtml(st.inn)}" placeholder="000000000" /></div>
          <div class="wf"><label>MFO</label><input name="mfo" value="${escapeHtml(st.mfo)}" placeholder="00000" /></div>
          <div class="wf"><label>To'lov hisob raqami</label><input name="account" value="${escapeHtml(st.account)}" placeholder="0000 0000 0000 0000 0000" /></div>
          <div class="wf"><label>Shartnoma raqami</label><input name="contractNo" value="${escapeHtml(st.contractNo)}" placeholder="00/00" /></div>
        </div>
      </div>
    `
  }
  function wizStep2Html(st){
    return `
      <div class="wiz-card">
        <h4>Direktor</h4>
        <div class="wiz-grid">
          <div class="wf"><label>Direktorning FISH</label><input name="dirName" value="${escapeHtml(st.dirName)}" placeholder="F.I.Sh" /></div>
          <div class="wf"><label>Login</label><input name="dirLogin" value="${escapeHtml(st.dirLogin)}" placeholder="login@ican.uz" /></div>
          <div class="wf"><label>Telefon</label><input name="dirPhone" value="${escapeHtml(st.dirPhone)}" placeholder="+998 90 000 00 00" /></div>
          <div class="wf"><label>Roli</label><select name="dirRole" style="width:100%"><option value="">—</option>${ROLES.map(r=>`<option ${st.dirRole===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select></div>
          <div class="wf"><label>Yangi parol</label><input type="password" name="pw1" placeholder="••••••••" autocomplete="new-password" /></div>
          <div class="wf"><label>Yangi parolni tasdiqlash</label><input type="password" name="pw2" placeholder="••••••••" autocomplete="new-password" /></div>
        </div>
        <div class="wiz-note">Parol xavfsizlik yuzasidan bu yerda saqlanmaydi — haqiqiy direktor hisobini ICAN tizimida yarating.</div>
      </div>
    `
  }
  function wizStep3Html(st){
    return `
      <div class="wiz-card">
        <h4>Imkoniyatlar</h4>
        ${CAPS.map(c=>`<div class="cap-row"><span>${escapeHtml(c)}</span><button type="button" class="tgl${st.caps[c]?' on':''}" data-cap="${escapeHtml(c)}"><span></span></button></div>`).join('')}
      </div>
      <div class="wiz-note">Bu bo'lim hozircha ko'rinish uchun — sozlamalar saqlanmaydi.</div>
    `
  }
  function wizStep4Html(){
    return `
      <div class="wiz-card">
        <h4>Narxlar</h4>
        <div class="price-grid">${PRICES.map(p=>`<div class="price-cell"><span>${escapeHtml(p)}</span><input placeholder="0" disabled /></div>`).join('')}</div>
      </div>
      <div class="wiz-note">Bu bo'lim hozircha ko'rinish uchun — narxlar saqlanmaydi.</div>
    `
  }
  function wizStep5Html(){
    return `
      <div class="wiz-card">
        <h4>Xizmatlar</h4>
        <div class="svc-grid">${SERVICES.map(s=>`<div class="svc-cell"><div><span>${escapeHtml(s.l)}</span>${s.b?`<em class="svc-badge">Ulangan</em>`:''}</div><button type="button" class="svc-edit">${PENCIL}</button></div>`).join('')}</div>
      </div>
      <div class="wiz-note">Bu bo'lim hozircha ko'rinish uchun — ma'lumotlar saqlanmaydi.</div>
    `
  }

  function wireWizard(st, isEditing){
    qs('#wz-back', root).addEventListener('click', ()=> cancelWizard())
    qs('#wz-cancel', root).addEventListener('click', ()=> cancelWizard())
    on(qs('.wiz-steps', root), 'click', '.wiz-step', (e,node)=>{ st.step = Number(node.dataset.step); renderWizardBody(st, isEditing) })
    const prev = qs('#wz-prev', root); if(prev) prev.addEventListener('click', ()=>{ st.step--; renderWizardBody(st, isEditing) })
    const next = qs('#wz-next', root); if(next) next.addEventListener('click', ()=>{ st.step++; renderWizardBody(st, isEditing) })
    qs('#wz-save', root).addEventListener('click', ()=> saveWizard(st, isEditing))

    if(st.step===1){
      const body = qs('.wiz-body', root)
      body.querySelector('[name="name"]').addEventListener('input', e=>{ st.name = e.target.value })
      body.querySelector('[name="company"]').addEventListener('input', e=>{ st.company = e.target.value })
      body.querySelector('[name="parent"]').addEventListener('input', e=>{ st.parent = e.target.value })
      body.querySelector('[name="partner"]').addEventListener('input', e=>{ st.partner = e.target.value })
      body.querySelector('[name="tariff"]').addEventListener('change', e=>{ st.tariff = e.target.value })
      body.querySelector('[name="balanceLimit"]').addEventListener('change', e=>{ st.balanceLimit = e.target.value })
      body.querySelector('[name="status"]').addEventListener('change', e=>{ st.status = e.target.value })
      body.querySelector('[name="region"]').addEventListener('change', e=>{ st.region = e.target.value; st.district = ''; renderWizardBody(st, isEditing) })
      body.querySelector('[name="district"]').addEventListener('change', e=>{ st.district = e.target.value })
      body.querySelector('[name="address"]').addEventListener('input', e=>{ st.address = e.target.value })
      body.querySelector('[name="phone"]').addEventListener('input', e=>{ st.phone = e.target.value })
      body.querySelector('[name="qqs"]').addEventListener('input', e=>{ st.qqs = e.target.value })
      body.querySelector('[name="bonusMonths"]').addEventListener('input', e=>{ st.bonusMonths = e.target.value })
      const locInput = body.querySelector('[name="locLink"]')
      locInput.addEventListener('input', e=> onLoc(st, e.target.value, isEditing))
      locInput.addEventListener('paste', e=>{
        const t = (e.clipboardData||window.clipboardData).getData('text')
        if(t && parseGeo(t)){ e.preventDefault(); onLoc(st, t, isEditing) }
      })
      const coordClear = qs('#wz-coord-clear', root); if(coordClear) coordClear.addEventListener('click', ()=>{ st.lat = null; st.lng = null; st.geoMsg = ''; renderWizardBody(st, isEditing) })
      body.querySelector('[name="logoFile"]').addEventListener('change', e=>{
        const f = e.target.files[0]; if(!f) return
        if(f.size > 8*1024*1024){ st.err = "Rasm 8MB dan katta"; renderWizardBody(st, isEditing); return }
        resizeImage(f, data=>{
          if(!data){ st.err = "Rasmni o'qib bo'lmadi"; renderWizardBody(st, isEditing); return }
          st.err = ''; st.logo = data; renderWizardBody(st, isEditing)
        })
      })
      const logoRemove = qs('#wz-logo-remove', root); if(logoRemove) logoRemove.addEventListener('click', ()=>{ st.logo = ''; renderWizardBody(st, isEditing) })
      body.querySelector('[name="note"]').addEventListener('input', e=>{ st.note = e.target.value })
      body.querySelector('[name="setupDate"]').addEventListener('change', e=>{ st.setupDate = e.target.value })
      body.querySelector('[name="bank"]').addEventListener('input', e=>{ st.bank = e.target.value })
      body.querySelector('[name="inn"]').addEventListener('input', e=>{ st.inn = e.target.value })
      body.querySelector('[name="mfo"]').addEventListener('input', e=>{ st.mfo = e.target.value })
      body.querySelector('[name="account"]').addEventListener('input', e=>{ st.account = e.target.value })
      body.querySelector('[name="contractNo"]').addEventListener('input', e=>{ st.contractNo = e.target.value })
    }
    if(st.step===2){
      const body = qs('.wiz-body', root)
      body.querySelector('[name="dirName"]').addEventListener('input', e=>{ st.dirName = e.target.value })
      body.querySelector('[name="dirLogin"]').addEventListener('input', e=>{ st.dirLogin = e.target.value })
      body.querySelector('[name="dirPhone"]').addEventListener('input', e=>{ st.dirPhone = e.target.value })
      body.querySelector('[name="dirRole"]').addEventListener('change', e=>{ st.dirRole = e.target.value })
    }
    if(st.step===3){
      on(qs('.wiz-body', root), 'click', '[data-cap]', (e,btn)=>{ const k = btn.dataset.cap; st.caps = { ...st.caps, [k]: !st.caps[k] }; renderWizardBody(st, isEditing) })
    }
  }

  function cancelWizard(){ wizState = null; editing = null; render() }

  async function saveWizard(st, isEditing){
    st.err = ''
    const _pd = st.phone.replace(/\D/g,''); const phoneClean = (_pd===''||_pd==='998') ? '' : st.phone.trim()
    const fail = (m)=>{ st.step = 1; st.err = m; renderWizardBody(st, isEditing) }
    if(!st.name.trim()) return fail("Kompaniya nomi (Nomlanish) kerak")
    if(!phoneClean) return fail('Telefon raqami kerak')
    if(!st.logo) return fail("Logo majburiy — rasm biriktiring")
    const hasLoc = (st.lat!=null && st.lng!=null) || st.address.trim() || st.region
    if(!hasLoc) return fail("Lokatsiya belgilang — xarita havolasi yoki manzil/viloyat")
    st.busy = true; renderWizardBody(st, isEditing)
    const payload = {
      name: st.name.trim(), phone: phoneClean, company: st.company.trim(), parent: st.parent.trim(), partner: st.partner.trim(),
      tariff: st.tariff, balanceLimit: st.balanceLimit, status: st.status, region: st.region, district: st.district, address: st.address.trim(),
      qqs: st.qqs, bonusMonths: st.bonusMonths, logo: st.logo, note: st.note.trim(), setupDate: st.setupDate,
      bank: st.bank.trim(), inn: st.inn.trim(), mfo: st.mfo.trim(), account: st.account.trim(), contractNo: st.contractNo.trim(),
      dirName: st.dirName.trim(), dirLogin: st.dirLogin.trim(), dirPhone: st.dirPhone.trim(), dirRole: st.dirRole, lat: st.lat, lng: st.lng,
    }
    try{
      const client = editing==='new' ? null : editing
      if(isEditing) await api.clientUpdate(client.id, payload); else await api.clientCreate(payload)
      wizState = null; editing = null; toast('Saqlandi'); load()
    }catch(ex){ st.err = ex.error || 'Xatolik'; st.busy = false; renderWizardBody(st, isEditing) }
  }

  load()
  return function cleanup(){ if(coordCleanup) coordCleanup() }
}
