import { api, getUser } from '../api.js'
import { qs, qsa, on, escapeHtml } from '../core.js'
import { fmtSum } from '../products.js'
import { REGION_NAMES } from '../uzregions.js'

// CRM — mijozlar bilan bog'liq murojaat/muammolarni bosqichma-bosqich
// kuzatish uchun Kanban doska (Bitrix24 "Сделки" bo'limiga o'xshab, lekin
// o'zimizni dizaynga moslab qilingan). DIQQAT: real CRM/IP-telefoniya
// backend hali ulanmagan — shu sabab kartalar va qo'ng'iroq yozuvlari
// brauzer xotirasida (localStorage) saqlanadi. Mikrofon orqali qo'ng'iroqni
// YOZIB OLISH — haqiqiy ishlaydigan funksiya (Chatlar bo'limidagi kabi) va
// darhol shu yerda saqlanib, istalgan vaqt qayta tinglash mumkin; faqat
// hali IP-telefoniya ulanmagani uchun kiruvchi qo'ng'iroqlar avtomatik
// yozib olinmaydi — xodim o'zi "Yozib olish" tugmasi orqali qo'shadi.

const DEALS_KEY = 'zood-crm-deals'
const CALLS_KEY = 'zood-crm-calls'

export function loadDeals(){ try{ return JSON.parse(localStorage.getItem(DEALS_KEY) || '[]') }catch(e){ return [] } }
function saveDeals(a){ try{ localStorage.setItem(DEALS_KEY, JSON.stringify(a)) }catch(e){} }
function loadCalls(){ try{ return JSON.parse(localStorage.getItem(CALLS_KEY) || '{}') }catch(e){ return {} } }
function saveCalls(m){ try{ localStorage.setItem(CALLS_KEY, JSON.stringify(m)) }catch(e){} }

function hashStr(s){
  let h = 0
  const str = String(s||'')
  for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0 }
  return Math.abs(h)
}
function genId(prefix){ return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8) }
export function clientName(c){ return c.name || c.company || c.dirLogin || 'Mijoz' }

export const STAGES = [
  { key:'missed', label:"O'tkazib yuborilgan", color:'#E05B4E' },
  { key:'fromsales', label:"Sotuvdan o'tdi", color:'#5FC3DE' },
  { key:'newtask', label:'Yangi vazifa', color:'#3D9DC9' },
  { key:'fromwasyt', label:"Wasytdan o'tdi", color:'#5FC3DE' },
  { key:'resolving', label:'Yechim jarayonida', color:'#17A2A0' },
  { key:'bankissue', label:'Bank bilan muammo', color:'#E06BA8' },
  { key:'resolved', label:'Muammo yechildi', color:'#8DC63F' },
]
function stageOf(key){ return STAGES.find(s=>s.key===key) || STAGES[0] }

const DEMO_MANAGERS = ['Sarvar Alijonov','Nilufar Qosimova','Bobur Rashidov','Dilnoza Qodirova','Javlon Mirzayev']

// "Vazifa biriktirish" — ikki guruh: Sotuvdagi xodimlar yoki Tex loyihadagi
// menejerlar. Bo'lim nomi (department) shu kalit so'zga mos kelsa haqiqiy
// xodim ro'yxatidan, aks holda namuna ro'yxatdan olinadi.
const TASK_DEPTS = [
  { key:'sotuv', label:'Sotuvdagi hodimlar', match:/sotuv/i },
  { key:'tex', label:'Tex loyihadagi menejerlar', match:/tex/i },
]
const DEMO_TASK_STAFF = {
  sotuv: ['Gulnora Rasulova','Shahnoza Yusupova','Aziz Sharipov'],
  tex: ['Bobur Rashidov','Dilnoza Qodirova','Javlon Mirzayev'],
}

// Namuna murojaat sarlavhalari — har bir mijozga hash orqali bittasi
// biriktiriladi.
const DEMO_TITLES = [
  'Tizimga kirishda xatolik', "To'lov o'tmadi", 'SMS kod kelmayapti',
  "Hisobot noto'g'ri chiqmoqda", "Ilova sekin ishlamoqda", 'Yangi xodim qo\'shib bo\'lmayapti',
  "Balans noto'g'ri ko'rsatilmoqda", 'Chek chop etilmayapti', "Qo'ng'iroq uzilib qolgan",
  "Shartnoma nusxasi kerak", 'Tarif almashtirish so\'rovi', "Litsenziya muddati tugagan",
]

const TARIFFS_CRM = ['Standart',"Standart+",'Premium']
const BIZ_TYPES = ["Savdo do'koni",'Restoran/kafe',"Ishlab chiqarish","Ta'lim markazi","Go'zallik saloni",'Qurilish',"Logistika","Xizmat ko'rsatish"]
const CURRENT_SYSTEMS = ['Excel jadval','Qog\'ozda yuritiladi','Boshqa CRM','1C',"Hech narsa ishlatmaydi"]
const LEAD_CHANNELS = [
  { key:'instagram', label:'Instagram' },
  { key:'facebook', label:'Facebook' },
  { key:'telegram', label:'Telegram' },
  { key:'sayt', label:'Sayt' },
  { key:'tavsiya', label:"Tavsiya (do'stdan)" },
  { key:'qongiroq', label:"Qo'ng'iroq" },
  { key:'boshqa', label:'Boshqa' },
]
function channelLabel(key){ const c = LEAD_CHANNELS.find(x=>x.key===key); return c ? c.label : '' }

const CALL_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 2.9a2 2 0 0 1-.4 2.1L8 10.1a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.4c.9.4 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg>`
const IC_MIC = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><path d="M12 18v4"/><path d="M8 22h8"/></svg>`
const IC_STOP = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>`
const IC_SEARCH = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`
const IC_PLAY = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
const IC_PAUSE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`
const IC_TRASH = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`
const IC_CHEVRON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`
const IC_CLOCK = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>`
const IC_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
const IC_EDIT = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`

const MANAGER_COLORS = ['#2FA9BF','#8DC63F','#E8A13F','#E06BA8','#3D9DC9','#17A2A0','#E05B4E']
function managerColor(name){ return MANAGER_COLORS[hashStr(name||'') % MANAGER_COLORS.length] }

function fmtDur(sec){ const s = Math.max(0, Math.round(sec||0)); const m = Math.floor(s/60); const r = s%60; return `${m}:${String(r).padStart(2,'0')}` }
function fmtHistDate(v){
  if(!v) return '—'
  const d = new Date(v)
  if(isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function fmtDateShort(v){
  if(!v) return '—'
  const parts = String(v).split('-')
  if(parts.length!==3) return v
  const [y,m,dd] = parts
  return `${dd}.${m}.${y}`
}
function isOverdue(v){
  if(!v) return false
  const d = new Date(v+'T00:00:00')
  if(isNaN(d.getTime())) return false
  const today = new Date(); today.setHours(0,0,0,0)
  return d.getTime() < today.getTime()
}

function shortTime(v){
  const d = new Date(v)
  if(isNaN(d.getTime())) return '—'
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

// Bitrix uslubidagi "qo'ng'iroq" tarix kartasi — audio bo'lsa, o'ziga xos
// progress-bar/tezlik boshqaruvi bilan chalinadi (wireAudioPlayers orqali).
function callCardHtml(cl, displayPhone){
  const has = !!cl.audioData
  const color = managerColor(cl.managerName)
  return `
  <div class="crm-call-card">
    <div class="crm-call-card-head">
      <span class="crm-call-card-title">${has ? "Qo'ng'iroq yozib olindi" : 'Arxiv yozuvi'}</span>
      <span class="crm-call-card-time">${shortTime(cl.date)}</span>
    </div>
    <div class="crm-call-card-body">
      <div class="crm-call-ava${has?' playable':''}" ${has?`data-audio-play="${cl.id}"`:''} style="background:${color}1f;color:${color}">
        ${has ? IC_PLAY : CALL_ICON}
      </div>
      <div class="crm-call-card-main">
        <div class="crm-call-client">
          <span>Mijoz</span><b>${escapeHtml(displayPhone||'—')}</b>
          <span class="crm-call-mgr">${escapeHtml(cl.managerName||'—')}</span>
        </div>
        ${has ? `
        <audio data-audio-el="${cl.id}" src="${cl.audioData}" preload="metadata" style="display:none"></audio>
        <div class="crm-call-audio-row">
          <div class="crm-call-audio-track" data-audio-track="${cl.id}"><div class="crm-call-audio-fill" data-audio-fill="${cl.id}"></div></div>
          <span class="crm-call-audio-time" data-audio-time="${cl.id}">0:00 / ${fmtDur(cl.duration)}</span>
          <button type="button" class="crm-call-speed" data-audio-speed="${cl.id}">1x</button>
        </div>` : `<div class="crm-call-noaudio">Audio yozuv saqlanmagan</div>`}
        <div class="crm-call-caption">${fmtHistDate(cl.date)} · davomiyligi ${fmtDur(cl.duration)}${cl.note?' · '+escapeHtml(cl.note):''}</div>
        <div class="crm-call-actions">
          <button type="button" class="crm-call-act" data-call-act="callback">${CALL_ICON} Qayta bog'lanish</button>
          <button type="button" class="crm-call-act" data-call-act="rate">${IC_CHEVRON} Baholash</button>
          <button type="button" class="crm-call-act danger" data-call-act="del" data-call-id="${cl.id}">${IC_TRASH} O'chirish</button>
        </div>
      </div>
    </div>
  </div>`
}

// Har bir karta o'zining <audio> elementiga ega — play/pauza, siljitish
// (scrubber) va tezlik (1x/1.5x/2x) shu yerda boshqariladi.
function wireAudioPlayers(container){
  qsa('audio[data-audio-el]', container).forEach(audioEl=>{
    const id = audioEl.dataset.audioEl
    const ava = qs(`[data-audio-play="${id}"]`, container)
    const track = qs(`[data-audio-track="${id}"]`, container)
    const fill = qs(`[data-audio-fill="${id}"]`, container)
    const timeEl = qs(`[data-audio-time="${id}"]`, container)
    const speedBtn = qs(`[data-audio-speed="${id}"]`, container)
    const speeds = [1, 1.5, 2]
    let speedIdx = 0
    const setPlayIcon = ()=>{ if(ava) ava.innerHTML = audioEl.paused ? IC_PLAY : IC_PAUSE }
    if(ava) ava.addEventListener('click', ()=>{
      qsa('audio[data-audio-el]', container).forEach(a=>{ if(a!==audioEl) a.pause() })
      if(audioEl.paused) audioEl.play().catch(()=>{}); else audioEl.pause()
    })
    audioEl.addEventListener('play', setPlayIcon)
    audioEl.addEventListener('pause', setPlayIcon)
    audioEl.addEventListener('ended', setPlayIcon)
    audioEl.addEventListener('timeupdate', ()=>{
      const dur = audioEl.duration
      const okDur = dur && isFinite(dur) ? dur : 0
      const pct = okDur ? (audioEl.currentTime/okDur)*100 : 0
      if(fill) fill.style.width = pct+'%'
      if(timeEl) timeEl.textContent = `${fmtDur(audioEl.currentTime)} / ${fmtDur(okDur)}`
    })
    if(track) track.addEventListener('click', e=>{
      const rect = track.getBoundingClientRect()
      const pct = Math.min(1, Math.max(0, (e.clientX-rect.left)/rect.width))
      if(audioEl.duration && isFinite(audioEl.duration)) audioEl.currentTime = pct*audioEl.duration
    })
    if(speedBtn) speedBtn.addEventListener('click', ()=>{
      speedIdx = (speedIdx+1) % speeds.length
      audioEl.playbackRate = speeds[speedIdx]
      speedBtn.textContent = speeds[speedIdx]+'x'
    })
  })
}

function relDate(v){
  if(!v) return '—'
  const d = new Date(v)
  const now = new Date()
  const diffDays = Math.floor((now.setHours(0,0,0,0) - new Date(d).setHours(0,0,0,0)) / 86400000)
  if(diffDays<=0) return `Bugun, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  if(diffDays===1) return `Kecha, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`
}

export function mountCrm(root, { toast }){
  let clients = null, staffList = [], err = ''
  let q = ''
  // ICAN uslubidagi jadval holati: bosqich kanban ustuni emas, filtr chipi
  let stageFilter = 'all'
  let page = 1
  const PER_PAGE = 20
  let dragId = null
  let openId = null
  let newOpen = false, newState = null
  let callNote = ''
  let recorder = null
  let managerPickerOpen = false
  let taskModalOpen = false
  let taskDeptSel = 'sotuv'
  let taskDraft = { text:'', due:'', person:'' }
  let editInfoOpen = false
  let editInfoState = null

  async function load(){
    try{
      clients = await api.clientsList()
      try{ staffList = (await api.staffList()).filter(s=>s.active) }catch(e){ staffList = [] }
      err = ''
    }catch(ex){ err = ex.error || 'Xatolik' }
    ensureSeeded()
    render()
  }

  function managerNames(){
    return staffList.length>=3 ? staffList.map(s=>[s.firstName,s.lastName].filter(Boolean).join(' ')).filter(Boolean) : DEMO_MANAGERS
  }

  function taskAssigneeOptions(deptKey){
    const dept = TASK_DEPTS.find(t=>t.key===deptKey) || TASK_DEPTS[0]
    const real = (staffList||[]).filter(s=>dept.match.test(s.department||'')).map(s=>[s.firstName,s.lastName].filter(Boolean).join(' ')).filter(Boolean)
    return real.length ? real : DEMO_TASK_STAFF[dept.key]
  }

  function ensureSeeded(){
    let deals = loadDeals()
    const calls = loadCalls()
    const existingClientIds = new Set(deals.map(d=>d.clientId))
    const names = managerNames()
    let changed = false
    ;(clients||[]).forEach(c=>{
      if(existingClientIds.has(c.id)) return
      const h = hashStr(String(c.id))
      const stage = STAGES[h % STAGES.length].key
      const daysAgo = h % 20
      const createdAt = new Date(Date.now() - daysAgo*86400000).toISOString()
      const deal = {
        id: genId('deal'),
        clientId: c.id,
        leadName: '', leadPhone: '', extraPhone: '',
        title: DEMO_TITLES[h % DEMO_TITLES.length],
        amount: (h % 6 === 0) ? (((h>>3)%15)+1)*100000 : 0,
        stage,
        managerName: names[h % names.length],
        bizType: BIZ_TYPES[h % BIZ_TYPES.length],
        region: REGION_NAMES[h % REGION_NAMES.length],
        source: '',
        leadChannel: LEAD_CHANNELS[h % LEAD_CHANNELS.length].key,
        currentSystem: CURRENT_SYSTEMS[h % CURRENT_SYSTEMS.length],
        dailyRevenue: (((h>>4)%40)+2)*100000,
        tariff: TARIFFS_CRM[h % TARIFFS_CRM.length],
        createdAt,
        updatedAt: createdAt,
      }
      deals.push(deal)
      changed = true
      if(h % 2 === 0){
        const n = (h % 3) + 1
        calls[deal.id] = Array.from({length:n},(_,i)=>({
          id: genId('call'),
          date: new Date(Date.now() - (daysAgo+i+1)*86400000).toISOString(),
          duration: 30 + ((h>>i)%240),
          managerName: deal.managerName,
          note: '',
          audioData: null,
        }))
      }
    })
    if(changed){ saveDeals(deals); saveCalls(calls) }
  }

  // Bitim/murojaat yoki haqiqiy mijozga (clientId) yoki mustaqil lidga
  // (leadName/leadPhone) tegishli bo'lishi mumkin — ikkalasi ham
  // "displayName"/"displayPhone" orqali bir xil ko'rinishda ishlatiladi.
  function dealsEnriched(){
    const cmap = new Map((clients||[]).map(c=>[c.id,c]))
    return loadDeals().map(d=>{
      const client = d.clientId ? cmap.get(d.clientId) : null
      const displayName = client ? clientName(client) : (d.leadName || 'Lid')
      const displayPhone = client ? client.phone : d.leadPhone
      return { ...d, client, displayName, displayPhone }
    })
  }

  function render(){
    if(clients===null){ root.innerHTML = `<div style="padding:40px;text-align:center;color:var(--mut)">Yuklanmoqda…</div>`; return }
    const all = dealsEnriched()
    const ql = q.trim().toLowerCase()
    const filtered = all.filter(d=>{
      if(!ql) return true
      return d.displayName.toLowerCase().includes(ql) || (d.displayPhone||'').includes(ql) || d.title.toLowerCase().includes(ql)
    })

    // Ilgari bu yerda kanban doskasi (7 ta ustun, sudrab o'tkazish) edi.
    // Endi ICAN admini uslubidagi oddiy jadval: bosqich — ustun emas, filtr
    // chipi va qatordagi status pill'i. Bosqichni o'zgartirish murojaat
    // kartasidagi bosqich chizig'i orqali bajariladi (o'zgarishsiz qoldi).
    const byStage = filtered.filter(d => stageFilter === 'all' || d.stage === stageFilter)
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    const pages = Math.max(1, Math.ceil(byStage.length / PER_PAGE))
    if(page > pages) page = pages
    const slice = byStage.slice((page - 1) * PER_PAGE, page * PER_PAGE)
    const sumAll = filtered.reduce((a, d) => a + (d.amount || 0), 0)
    const cnt = k => filtered.filter(d => d.stage === k).length

    root.innerHTML = `
      <div class="ic-page">
        <div class="ic-head">
          <div>
            <div class="ic-title">CRM</div>
            <div class="ic-sub">Mijoz murojaatlari — bosqichlar bo'yicha kuzatuv</div>
          </div>
          <div class="ic-head-act">
            <button class="ic-btn" id="crm-new">+ Yaratish</button>
          </div>
        </div>

        ${err ? `<div class="err-box">${escapeHtml(err)}</div>` : ''}

        <div class="ic-kpis">
          <div class="ic-kpi"><div class="ic-kpi-lbl">Jami murojaat</div><div class="ic-kpi-val">${filtered.length}</div><div class="ic-kpi-sub">ta</div></div>
          <div class="ic-kpi"><div class="ic-kpi-lbl">Jami summa</div><div class="ic-kpi-val">${fmtSum(sumAll)}</div><div class="ic-kpi-sub">UZS</div></div>
          <div class="ic-kpi"><div class="ic-kpi-lbl">Yangi vazifa</div><div class="ic-kpi-val">${cnt('newtask')}</div><div class="ic-kpi-sub">ta</div></div>
          <div class="ic-kpi"><div class="ic-kpi-lbl">Yechim jarayonida</div><div class="ic-kpi-val">${cnt('resolving')}</div><div class="ic-kpi-sub">ta</div></div>
          <div class="ic-kpi"><div class="ic-kpi-lbl">Muammo yechildi</div><div class="ic-kpi-val">${cnt('resolved')}</div><div class="ic-kpi-sub">ta</div></div>
        </div>

        <div class="ic-chips">
          <button type="button" class="ic-chip${stageFilter === 'all' ? ' on' : ''}" data-stgf="all">Hammasi · ${filtered.length}</button>
          ${STAGES.map(s => `<button type="button" class="ic-chip${stageFilter === s.key ? ' on' : ''}" data-stgf="${s.key}">${escapeHtml(s.label)} · ${cnt(s.key)}</button>`).join('')}
        </div>

        <div class="ic-toolbar">
          <div class="ic-search">${IC_SEARCH}<input id="crm-q" value="${escapeHtml(q)}" placeholder="Mijoz, telefon, mavzu…" /></div>
        </div>

        <div class="ic-meta"><span>${byStage.length} topildi</span><span>·</span><b>${fmtSum(byStage.reduce((a, d) => a + (d.amount || 0), 0))} UZS</b></div>

        <div class="ic-tblwrap" id="crm-board">
          <div class="ic-tblscroll">
            <table class="ic-tbl">
              <thead><tr><th class="ic-idx"></th><th>Mijoz</th><th>Telefon</th><th>Murojaat</th><th>Bosqich</th><th>Mas'ul</th><th class="num">Summa</th><th>Yangilangan</th></tr></thead>
              <tbody>
                ${slice.length ? slice.map((d, i) => {
                  const s = stageOf(d.stage)
                  return `<tr class="clk crm-card" data-id="${escapeHtml(d.id)}">
                    <td class="ic-idx">${(page - 1) * PER_PAGE + i + 1}</td>
                    <td class="name">${escapeHtml(d.displayName)}</td>
                    <td>${escapeHtml(d.displayPhone || '—')}</td>
                    <td>${escapeHtml(d.title || '—')}</td>
                    <td><span class="ic-st" style="background:${s.color}1F;color:${s.color}">${escapeHtml(s.label)}</span></td>
                    <td>${escapeHtml(d.manager || '—')}</td>
                    <td class="num">${d.amount ? `<b class="ic-money">${fmtSum(d.amount)}</b>` : '—'}</td>
                    <td>${escapeHtml((d.updatedAt || '').slice(0, 10).split('-').reverse().join('.'))}</td>
                  </tr>`
                }).join('') : `<tr><td colspan="8" style="text-align:center;color:var(--ic-mut);padding:30px 0">Murojaat topilmadi</td></tr>`}
              </tbody>
            </table>
          </div>
          <div class="ic-pager">
            <button type="button" class="ic-pg" data-crmpg="prev"${page === 1 ? ' disabled' : ''}>&lsaquo;</button>
            ${Array.from({length: Math.min(pages, 7)}, (_, i) => i + 1).map(n => `<button type="button" class="ic-pg${n === page ? ' on' : ''}" data-crmpg="${n}">${n}</button>`).join('')}
            <button type="button" class="ic-pg" data-crmpg="next"${page === pages ? ' disabled' : ''}>&rsaquo;</button>
            <span class="ic-kpi-lbl" style="margin-left:8px">${page}/${pages}</span>
          </div>
        </div>

        <div class="ic-note" style="margin-top:10px">Bosqichni o'zgartirish uchun qatorni bosing — murojaat kartasidagi bosqich chizig'idan tanlanadi. Qo'ng'iroq tarixi va yozuvlar ham shu kartada.</div>

        <div id="crm-modal-slot"></div>
      </div>
    `

    const qEl = qs('#crm-q', root)
    if(qEl) qEl.addEventListener('input', e=>{ const pos=e.target.selectionStart; q = e.target.value; page = 1; render(); const again=qs('#crm-q', root); if(again){ again.focus(); try{ again.setSelectionRange(pos,pos) }catch(_){} } })
    // delegatsiya root'ga faqat BIR marta bog'lanadi (render har safar chaqiriladi)
    if(!root.__stgfBound){ root.__stgfBound = 1
      on(root, 'click', '[data-stgf]', (e,b)=>{ stageFilter = b.dataset.stgf; page = 1; render() })
      on(root, 'click', '[data-crmpg]', (e,b)=>{ const v = b.dataset.crmpg
        const pp = Math.max(1, Math.ceil(dealsEnriched().filter(d => stageFilter === 'all' || d.stage === stageFilter).length / PER_PAGE))
        if(v === 'prev') page = Math.max(1, page - 1); else if(v === 'next') page = Math.min(pp, page + 1); else page = Number(v)
        render() })
    }
    qs('#crm-new', root).addEventListener('click', ()=>{ newOpen = true; newState = null; renderModals() })

    const board = qs('#crm-board', root)
    on(board, 'click', '.crm-card', (e,card)=>{ openId = card.dataset.id; callNote=''; taskModalOpen=false; managerPickerOpen=false; taskDeptSel='sotuv'; taskDraft={text:'',due:'',person:''}; editInfoOpen=false; editInfoState=null; renderModals() })
    qsa('.crm-card', board).forEach(card=>{
      card.addEventListener('dragstart', e=>{ dragId = card.dataset.id; card.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move' })
      card.addEventListener('dragend', ()=>{ card.classList.remove('dragging') })
    })
    qsa('.crm-col-body', board).forEach(col=>{
      col.addEventListener('dragover', e=>{ e.preventDefault(); col.classList.add('drag-over') })
      col.addEventListener('dragleave', ()=> col.classList.remove('drag-over'))
      col.addEventListener('drop', e=>{
        e.preventDefault(); col.classList.remove('drag-over')
        if(!dragId) return
        const deals = loadDeals()
        const d = deals.find(x=>x.id===dragId)
        if(d && d.stage!==col.dataset.drop){ d.stage = col.dataset.drop; d.updatedAt = new Date().toISOString(); saveDeals(deals); toast("Bosqich o'zgartirildi") }
        dragId = null
        render()
      })
    })

    renderModals()
  }

  function cardHtml(d){
    const st = stageOf(d.stage)
    const calls = (loadCalls())[d.id] || []
    return `
      <div class="crm-card" draggable="true" data-id="${d.id}" style="border-top-color:${st.color}">
        <div class="crm-card-title">${escapeHtml(d.displayName)}${!d.client?` <span class="crm-lead-tag">LID</span>`:''}</div>
        <div class="crm-card-sub">${escapeHtml(d.title)}</div>
        ${d.amount>0 ? `<div class="crm-card-amount">${fmtSum(d.amount)} UZS</div>` : ''}
        ${d.displayPhone ? `<div class="crm-card-phone">${CALL_ICON} ${escapeHtml(d.displayPhone)}</div>` : ''}
        <div class="crm-card-foot">
          <span class="crm-card-date">${relDate(d.updatedAt)}</span>
          <span style="display:flex;align-items:center;gap:6px">
            ${calls.length ? `<span class="crm-card-callcnt">${CALL_ICON}${calls.length}</span>` : ''}
            <span class="prof-av" style="width:26px;height:26px;font-size:11px" title="${escapeHtml(d.managerName||'')}">${escapeHtml((d.managerName||'?')[0]||'?')}</span>
          </span>
        </div>
      </div>
    `
  }

  // ---------------- Modallar ----------------
  function renderModals(){
    const slot = qs('#crm-modal-slot', root)
    if(!slot) return
    if(newOpen) renderNewModal(slot)
    else if(openId) renderDealModal(slot)
    else slot.innerHTML = ''
  }

  function renderNewModal(slot){
    if(!newState){
      const names = managerNames()
      newState = {
        mode: 'existing', // existing | lead
        clientId: (clients&&clients[0]) ? clients[0].id : '',
        leadName:'', leadPhone:'', extraPhone:'',
        title:'', stage:'newtask', amount:'',
        managerName: names[0] || '',
        bizType:'', region:'', source:'', leadChannel:'', currentSystem:'', dailyRevenue:'', tariff:'',
      }
    }
    const st = newState
    const names = managerNames()
    slot.innerHTML = `
      <div class="modal-bg" id="crmn-bg">
        <div class="modal" style="max-width:560px">
          <div class="form-col">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <h3>Yangi murojaat</h3>
              <button class="lnk" id="crmn-close" style="font-size:20px;line-height:1">×</button>
            </div>

            <label class="ud-lbl" style="margin-top:10px">Mijoz turi</label>
            <div class="pay-pill-row">
              <button type="button" class="pay-pill${st.mode==='existing'?' on':''}" data-mode="existing">Mavjud sdelka</button>
              <button type="button" class="pay-pill${st.mode==='lead'?' on':''}" data-mode="lead">Yangi sdelka</button>
            </div>

            ${st.mode==='existing' ? `
            <div class="wf" style="margin-top:12px"><label>Mijoz</label>
              <select id="crmn-client">
                ${(clients||[]).map(c=>`<option value="${c.id}" ${st.clientId===c.id?'selected':''}>${escapeHtml(clientName(c))}</option>`).join('')}
              </select>
            </div>` : `
            <div class="wiz-grid" style="margin-top:12px">
              <div class="wf"><label>F.I.Sh / Tashkilot nomi</label><input id="crmn-leadname" value="${escapeHtml(st.leadName)}" placeholder="Ism familiya yoki firma nomi" /></div>
              <div class="wf"><label>Telefon</label><input id="crmn-leadphone" value="${escapeHtml(st.leadPhone)}" placeholder="+998 90 000 00 00" /></div>
              <div class="wf"><label>Qo'shimcha nomer</label><input id="crmn-extraphone" value="${escapeHtml(st.extraPhone)}" placeholder="ixtiyoriy" /></div>
            </div>`}

            <div class="wf" style="margin-top:12px"><label>Mavzu</label><input id="crmn-title" value="${escapeHtml(st.title)}" placeholder="Masalan: Tizimga kirishda xatolik" /></div>

            <div class="wiz-grid" style="margin-top:12px">
              <div class="wf"><label>Bosqich</label>
                <select id="crmn-stage">${STAGES.map(s=>`<option value="${s.key}" ${st.stage===s.key?'selected':''}>${escapeHtml(s.label)}</option>`).join('')}</select>
              </div>
              <div class="wf"><label>Mas'ul menejer</label>
                <select id="crmn-manager">${names.map(n=>`<option value="${escapeHtml(n)}" ${st.managerName===n?'selected':''}>${escapeHtml(n)}</option>`).join('')}</select>
              </div>
            </div>

            <div class="wiz-grid" style="margin-top:12px">
              <div class="wf"><label>Biznes turi</label>
                <select id="crmn-biztype"><option value="">—</option>${BIZ_TYPES.map(b=>`<option value="${escapeHtml(b)}" ${st.bizType===b?'selected':''}>${escapeHtml(b)}</option>`).join('')}</select>
              </div>
              <div class="wf"><label>Region</label>
                <select id="crmn-region"><option value="">—</option>${REGION_NAMES.map(r=>`<option value="${escapeHtml(r)}" ${st.region===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select>
              </div>
            </div>

            <div class="wiz-grid" style="margin-top:12px">
              <div class="wf"><label>Mijoz qayerdan (izoh)</label><input id="crmn-source" value="${escapeHtml(st.source)}" placeholder="Masalan: do'stidan eshitgan" /></div>
              <div class="wf"><label>Lid qayerdan</label>
                <select id="crmn-channel"><option value="">—</option>${LEAD_CHANNELS.map(c=>`<option value="${c.key}" ${st.leadChannel===c.key?'selected':''}>${escapeHtml(c.label)}</option>`).join('')}</select>
              </div>
            </div>

            <div class="wiz-grid" style="margin-top:12px">
              <div class="wf"><label>Joriy tizim</label>
                <select id="crmn-cursys"><option value="">—</option>${CURRENT_SYSTEMS.map(s=>`<option value="${escapeHtml(s)}" ${st.currentSystem===s?'selected':''}>${escapeHtml(s)}</option>`).join('')}</select>
              </div>
              <div class="wf"><label>Kunlik tushumi (so'm)</label><input id="crmn-revenue" value="${st.dailyRevenue?fmtSum(st.dailyRevenue):''}" inputmode="numeric" placeholder="ixtiyoriy" /></div>
            </div>

            <div class="wiz-grid" style="margin-top:12px">
              <div class="wf"><label>Qiziqqan tarif</label>
                <select id="crmn-tariff"><option value="">—</option>${TARIFFS_CRM.map(t=>`<option value="${escapeHtml(t)}" ${st.tariff===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select>
              </div>
              <div class="wf"><label>Summa (ixtiyoriy, UZS)</label><input id="crmn-amount" value="${st.amount?fmtSum(st.amount):''}" inputmode="numeric" placeholder="0" /></div>
            </div>

            <div class="modal-actions">
              <button class="btn ghost" id="crmn-cancel">Bekor qilish</button>
              <button class="btn" id="crmn-save">Yaratish</button>
            </div>
          </div>
        </div>
      </div>
    `
    const bg = qs('#crmn-bg', slot), modal = qs('.modal', slot)
    const close = ()=>{ newOpen = false; newState = null; renderModals() }
    bg.addEventListener('mousedown', e=>{ if(e.target===bg) close() })
    modal.addEventListener('mousedown', e=>e.stopPropagation())
    qs('#crmn-close', slot).addEventListener('click', close)
    qs('#crmn-cancel', slot).addEventListener('click', close)
    on(bg, 'click', '[data-mode]', (e,btn)=>{ st.mode = btn.dataset.mode; renderModals() })
    const clientEl = qs('#crmn-client', slot); if(clientEl) clientEl.addEventListener('change', e=>{ st.clientId = e.target.value })
    const leadNameEl = qs('#crmn-leadname', slot); if(leadNameEl) leadNameEl.addEventListener('input', e=>{ st.leadName = e.target.value })
    const leadPhoneEl = qs('#crmn-leadphone', slot); if(leadPhoneEl) leadPhoneEl.addEventListener('input', e=>{ st.leadPhone = e.target.value })
    const extraPhoneEl = qs('#crmn-extraphone', slot); if(extraPhoneEl) extraPhoneEl.addEventListener('input', e=>{ st.extraPhone = e.target.value })
    qs('#crmn-title', slot).addEventListener('input', e=>{ st.title = e.target.value })
    qs('#crmn-stage', slot).addEventListener('change', e=>{ st.stage = e.target.value })
    qs('#crmn-manager', slot).addEventListener('change', e=>{ st.managerName = e.target.value })
    qs('#crmn-biztype', slot).addEventListener('change', e=>{ st.bizType = e.target.value })
    qs('#crmn-region', slot).addEventListener('change', e=>{ st.region = e.target.value })
    qs('#crmn-source', slot).addEventListener('input', e=>{ st.source = e.target.value })
    qs('#crmn-channel', slot).addEventListener('change', e=>{ st.leadChannel = e.target.value })
    qs('#crmn-cursys', slot).addEventListener('change', e=>{ st.currentSystem = e.target.value })
    qs('#crmn-revenue', slot).addEventListener('input', e=>{ st.dailyRevenue = e.target.value.replace(/\D/g,''); e.target.value = st.dailyRevenue?fmtSum(st.dailyRevenue):'' })
    qs('#crmn-tariff', slot).addEventListener('change', e=>{ st.tariff = e.target.value })
    qs('#crmn-amount', slot).addEventListener('input', e=>{ st.amount = e.target.value.replace(/\D/g,''); e.target.value = st.amount?fmtSum(st.amount):'' })
    qs('#crmn-save', slot).addEventListener('click', ()=>{
      if(st.mode==='existing' && !st.clientId){ toast('Mijozni tanlang'); return }
      if(st.mode==='lead' && !st.leadName.trim()){ toast('Ism yoki firma nomini kiriting'); return }
      if(!st.title.trim()){ toast('Mavzuni kiriting'); return }
      const deals = loadDeals()
      const now = new Date().toISOString()
      deals.push({
        id: genId('deal'),
        clientId: st.mode==='existing' ? st.clientId : null,
        leadName: st.mode==='lead' ? st.leadName.trim() : '',
        leadPhone: st.mode==='lead' ? st.leadPhone.trim() : '',
        extraPhone: st.extraPhone.trim(),
        title: st.title.trim(),
        amount: Number(st.amount)||0,
        stage: st.stage,
        managerName: st.managerName || getUser() || 'Admin',
        bizType: st.bizType, region: st.region, source: st.source.trim(),
        leadChannel: st.leadChannel, currentSystem: st.currentSystem,
        dailyRevenue: Number(st.dailyRevenue)||0, tariff: st.tariff,
        createdAt: now, updatedAt: now,
      })
      saveDeals(deals)
      toast('Murojaat yaratildi')
      close(); render()
    })
  }

  function renderDealModal(slot){
    const deals = loadDeals()
    const d = deals.find(x=>x.id===openId)
    if(!d){ openId = null; slot.innerHTML = ''; return }
    const cmap = new Map((clients||[]).map(c=>[c.id,c]))
    const c = d.clientId ? cmap.get(d.clientId) : null
    const displayName = c ? clientName(c) : (d.leadName || 'Lid')
    const displayPhone = c ? c.phone : d.leadPhone
    const calls = ((loadCalls())[d.id] || []).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''))
    const isRecording = recorder && recorder.dealId===d.id
    const names = managerNames()
    const Info = (label, val) => val ? `<div class="crm-info-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(String(val))}</b></div>` : ''

    slot.innerHTML = `
      <div class="modal-bg" id="crmd-bg">
        <div class="modal" style="max-width:1220px;width:94vw">
          <div class="form-col">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <h3>${escapeHtml(displayName)}${!c?` <span class="crm-lead-tag">LID</span>`:''}</h3>
              <button class="lnk" id="crmd-close" style="font-size:20px;line-height:1">×</button>
            </div>
            <div style="color:var(--mut);font-size:12.5px;font-weight:700;margin-top:-6px">${escapeHtml(d.title)}${displayPhone?' · '+escapeHtml(displayPhone):''}</div>

            <div class="crm-stage-bar">
              ${STAGES.map((s,i)=>{
                const active = d.stage===s.key
                const cls = ['crm-stage-seg']
                if(active) cls.push('active')
                if(i===0) cls.push('first')
                if(i===STAGES.length-1) cls.push('last')
                const style = active ? `background:${s.color};color:#fff;z-index:${STAGES.length-i}` : `background:${s.color}1c;color:${s.color};z-index:${STAGES.length-i}`
                return `<button type="button" class="${cls.join(' ')}" data-stage="${s.key}" style="${style}"><span>${escapeHtml(s.label)}</span></button>`
              }).join('')}
            </div>

            <div class="crm-detail-grid">
              <div class="crm-detail-left">
                <div class="crm-section-title">Mas'ul menejer</div>
                <div class="crm-manager-wrap">
                  <button type="button" class="crm-manager-box" id="crmd-manager-trigger">
                    <span class="prof-av" style="background:${managerColor(d.managerName)}1f;color:${managerColor(d.managerName)}">${escapeHtml((d.managerName||'?')[0]||'?')}</span>
                    <span class="crm-manager-name">${escapeHtml(d.managerName||'Tanlanmagan')}</span>
                    <span class="crm-manager-arrow${managerPickerOpen?' open':''}">${IC_CHEVRON}</span>
                  </button>
                  ${managerPickerOpen ? `
                  <div class="menu-back" id="crmd-manager-back"></div>
                  <div class="crm-manager-dropdown">
                    ${names.map(n=>`
                      <button type="button" class="crm-manager-opt${d.managerName===n?' sel':''}" data-manager="${escapeHtml(n)}">
                        <span class="prof-av" style="background:${managerColor(n)}1f;color:${managerColor(n)}">${escapeHtml(n[0]||'?')}</span>
                        <span>${escapeHtml(n)}</span>
                        ${d.managerName===n?IC_CHECK:''}
                      </button>`).join('')}
                  </div>` : ''}
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px">
                  <div class="crm-section-title" style="margin-bottom:0">Mijoz ma'lumotlari</div>
                  <button type="button" class="ic-btn" id="crmd-info-edit" title="Tahrirlash" style="width:26px;height:26px;border-radius:7px">${IC_EDIT}</button>
                </div>
                <div class="crm-info-box">
                  ${Info('Telefon', displayPhone)}
                  ${Info("Qo'shimcha nomer", d.extraPhone)}
                  ${Info('Biznes turi', d.bizType)}
                  ${Info('Region', d.region)}
                  ${Info('Lid qayerdan', channelLabel(d.leadChannel))}
                  ${Info('Mijoz qayerdan (izoh)', d.source)}
                  ${Info('Joriy tizim', d.currentSystem)}
                  ${Info('Kunlik tushumi', d.dailyRevenue ? fmtSum(d.dailyRevenue)+" so'm" : '')}
                  ${Info('Qiziqqan tarif', d.tariff)}
                  ${Info('Summa', d.amount ? fmtSum(d.amount)+' UZS' : '')}
                </div>
              </div>

              <div class="crm-detail-right">
                <div class="crm-section-title">Qo'ng'iroqlar tarixi</div>

                ${isRecording ? `
                <div class="crm-rec-bar">
                  <span class="crm-rec-dot"></span>
                  <span>Qo'ng'iroq davom etmoqda — ovoz avtomatik yozilmoqda…</span>
                  <button type="button" class="btn ghost" id="crmd-mic-stop">${IC_STOP} Yakunlash</button>
                </div>` : `
                <button type="button" class="crm-add-call-btn" id="crmd-mic-start">${CALL_ICON} Qo'ng'iroq qilish</button>
                <div class="hint" style="margin:-8px 0 14px">Qo'ng'iroq boshlanganda ovoz avtomatik yozib olinadi.</div>`}

                <div class="crm-task-box">
                  <div class="crm-task-head">
                    <span>Vazifa</span>
                    ${d.taskAssignee ? `<button type="button" class="lnk" id="crmd-task-clear">Bekor qilish</button>` : ''}
                  </div>
                  ${d.taskAssignee ? `
                  <div class="crm-task-assigned">
                    <span class="prof-av" style="background:${managerColor(d.taskAssignee)}1f;color:${managerColor(d.taskAssignee)}">${escapeHtml((d.taskAssignee||'?')[0]||'?')}</span>
                    <div class="prof-meta"><b>${escapeHtml(d.taskAssignee)}</b><small>${escapeHtml((TASK_DEPTS.find(t=>t.key===d.taskDeptKey)||TASK_DEPTS[0]).label)}</small></div>
                  </div>
                  ${d.taskText ? `<div class="crm-task-text">${escapeHtml(d.taskText)}</div>` : ''}
                  ${d.taskDue ? `<div class="crm-task-due${isOverdue(d.taskDue)?' overdue':''}">${IC_CLOCK} Muddat: ${fmtDateShort(d.taskDue)}${isOverdue(d.taskDue)?' · muddati o\'tgan':''}</div>` : ''}
                  <button type="button" class="btn ghost" id="crmd-task-edit" style="width:100%;margin-top:10px">O'zgartirish</button>
                  ` : `
                  <button type="button" class="crm-add-call-btn" id="crmd-task-open" style="margin-bottom:0">+ Vazifa qo'shish</button>`}
                </div>

                ${calls.length===0 ? `<div class="empty" style="padding:20px">Hali qo'ng'iroq yozuvi yo'q.</div>` : `
                <div class="crm-call-list">
                  ${calls.map(cl=>callCardHtml(cl, displayPhone)).join('')}
                </div>`}
              </div>
            </div>

            <div class="modal-actions">
              <button class="btn ghost" id="crmd-close2">Yopish</button>
            </div>
          </div>
        </div>
      </div>

      ${taskModalOpen ? `
      <div class="modal-bg" id="crmt-bg">
        <div class="modal" style="max-width:440px">
          <div class="form-col">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <h3>Vazifa biriktirish</h3>
              <button class="lnk" id="crmt-close" style="font-size:20px;line-height:1">×</button>
            </div>

            <label class="ud-lbl" style="margin-top:8px">Loyiha</label>
            <div class="crm-project-grid">
              ${TASK_DEPTS.map(t=>`
                <button type="button" class="crm-project-card${taskDeptSel===t.key?' on':''}" data-taskdept="${t.key}">
                  <span class="crm-project-name">${escapeHtml(t.label)}</span>
                  <span class="crm-project-count">${taskAssigneeOptions(t.key).length} ta xodim</span>
                </button>`).join('')}
            </div>

            <div class="wf" style="margin-top:14px"><label>Xodim</label>
              <select id="crmd-task-person">${taskAssigneeOptions(taskDeptSel).map(n=>`<option value="${escapeHtml(n)}" ${taskDraft.person===n?'selected':''}>${escapeHtml(n)}</option>`).join('')}</select>
            </div>
            <div class="wf" style="margin-top:12px"><label>Vazifa matni</label>
              <textarea id="crmd-task-text" placeholder="Nima qilish kerakligini yozing…">${escapeHtml(taskDraft.text)}</textarea>
            </div>
            <div class="wf" style="margin-top:12px"><label>Muddat</label>
              <input type="date" id="crmd-task-due" value="${escapeHtml(taskDraft.due)}" />
            </div>

            <div class="modal-actions">
              <button class="btn ghost" id="crmt-cancel">Bekor qilish</button>
              <button class="btn" id="crmd-task-assign">Biriktirish</button>
            </div>
          </div>
        </div>
      </div>` : ''}

      ${editInfoOpen ? `
      <div class="modal-bg" id="crmi-bg">
        <div class="modal" style="max-width:560px">
          <div class="form-col">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <h3>Mijoz ma'lumotlarini tahrirlash</h3>
              <button class="lnk" id="crmi-close" style="font-size:20px;line-height:1">×</button>
            </div>

            ${c ? `<div class="hint" style="margin-top:6px">Telefon raqami mijoz profiliga bog'langan — uni "Mijozlar" bo'limidan o'zgartiring.</div>` : `
            <div class="wiz-grid" style="margin-top:12px">
              <div class="wf"><label>Telefon</label><input id="crmi-phone" value="${escapeHtml(editInfoState.leadPhone)}" placeholder="+998 90 000 00 00" /></div>
              <div class="wf"><label>Qo'shimcha nomer</label><input id="crmi-extraphone" value="${escapeHtml(editInfoState.extraPhone)}" placeholder="ixtiyoriy" /></div>
            </div>`}

            <div class="wiz-grid" style="margin-top:12px">
              <div class="wf"><label>Biznes turi</label>
                <select id="crmi-biztype"><option value="">—</option>${BIZ_TYPES.map(b=>`<option value="${escapeHtml(b)}" ${editInfoState.bizType===b?'selected':''}>${escapeHtml(b)}</option>`).join('')}</select>
              </div>
              <div class="wf"><label>Region</label>
                <select id="crmi-region"><option value="">—</option>${REGION_NAMES.map(r=>`<option value="${escapeHtml(r)}" ${editInfoState.region===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select>
              </div>
            </div>

            <div class="wiz-grid" style="margin-top:12px">
              <div class="wf"><label>Mijoz qayerdan (izoh)</label><input id="crmi-source" value="${escapeHtml(editInfoState.source)}" placeholder="Masalan: do'stidan eshitgan" /></div>
              <div class="wf"><label>Lid qayerdan</label>
                <select id="crmi-channel"><option value="">—</option>${LEAD_CHANNELS.map(ch=>`<option value="${ch.key}" ${editInfoState.leadChannel===ch.key?'selected':''}>${escapeHtml(ch.label)}</option>`).join('')}</select>
              </div>
            </div>

            <div class="wiz-grid" style="margin-top:12px">
              <div class="wf"><label>Joriy tizim</label>
                <select id="crmi-cursys"><option value="">—</option>${CURRENT_SYSTEMS.map(s=>`<option value="${escapeHtml(s)}" ${editInfoState.currentSystem===s?'selected':''}>${escapeHtml(s)}</option>`).join('')}</select>
              </div>
              <div class="wf"><label>Kunlik tushumi (so'm)</label><input id="crmi-revenue" value="${editInfoState.dailyRevenue?fmtSum(editInfoState.dailyRevenue):''}" inputmode="numeric" placeholder="ixtiyoriy" /></div>
            </div>

            <div class="wiz-grid" style="margin-top:12px">
              <div class="wf"><label>Qiziqqan tarif</label>
                <select id="crmi-tariff"><option value="">—</option>${TARIFFS_CRM.map(t=>`<option value="${escapeHtml(t)}" ${editInfoState.tariff===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select>
              </div>
              <div class="wf"><label>Summa (ixtiyoriy, UZS)</label><input id="crmi-amount" value="${editInfoState.amount?fmtSum(editInfoState.amount):''}" inputmode="numeric" placeholder="0" /></div>
            </div>

            <div class="modal-actions">
              <button class="btn ghost" id="crmi-cancel">Bekor qilish</button>
              <button class="btn" id="crmi-save">Saqlash</button>
            </div>
          </div>
        </div>
      </div>` : ''}
    `
    const bg = qs('#crmd-bg', slot), modal = qs('.modal', slot)
    const close = ()=>{ if(recorder && recorder.dealId===d.id) discardRecording(); openId = null; taskModalOpen = false; managerPickerOpen = false; editInfoOpen = false; renderModals() }
    bg.addEventListener('mousedown', e=>{ if(e.target===bg) close() })
    modal.addEventListener('mousedown', e=>e.stopPropagation())
    qs('#crmd-close', slot).addEventListener('click', close)
    qs('#crmd-close2', slot).addEventListener('click', close)
    on(bg, 'click', '[data-stage]', (e,btn)=>{
      const arr = loadDeals()
      const dd = arr.find(x=>x.id===d.id)
      if(dd){ dd.stage = btn.dataset.stage; dd.updatedAt = new Date().toISOString(); saveDeals(arr); toast("Bosqich o'zgartirildi") }
      renderModals(); render()
    })
    qs('#crmd-manager-trigger', slot).addEventListener('click', ()=>{ managerPickerOpen = !managerPickerOpen; renderModals() })
    const managerBack = qs('#crmd-manager-back', slot)
    if(managerBack) managerBack.addEventListener('click', ()=>{ managerPickerOpen = false; renderModals() })
    on(bg, 'click', '[data-manager]', (e,btn)=>{
      const arr = loadDeals()
      const dd = arr.find(x=>x.id===d.id)
      if(dd){ dd.managerName = btn.dataset.manager; dd.updatedAt = new Date().toISOString(); saveDeals(arr); toast('Mas\'ul menejer o\'zgartirildi') }
      managerPickerOpen = false
      renderModals(); render()
    })
    const micStart = qs('#crmd-mic-start', slot); if(micStart) micStart.addEventListener('click', ()=> startRecording(d.id))
    const micStop = qs('#crmd-mic-stop', slot); if(micStop) micStop.addEventListener('click', stopRecording)

    const openTaskModal = ()=>{
      taskDeptSel = d.taskDeptKey || 'sotuv'
      taskDraft = { text: d.taskText||'', due: d.taskDue||'', person: d.taskAssignee||'' }
      taskModalOpen = true
      renderModals()
    }
    const taskOpenBtn = qs('#crmd-task-open', slot); if(taskOpenBtn) taskOpenBtn.addEventListener('click', openTaskModal)
    const taskEditBtn = qs('#crmd-task-edit', slot); if(taskEditBtn) taskEditBtn.addEventListener('click', openTaskModal)
    const taskClearBtn = qs('#crmd-task-clear', slot)
    if(taskClearBtn) taskClearBtn.addEventListener('click', ()=>{
      const arr = loadDeals()
      const dd = arr.find(x=>x.id===d.id)
      if(dd){ dd.taskAssignee = ''; dd.taskDeptKey = ''; dd.taskText = ''; dd.taskDue = ''; dd.updatedAt = new Date().toISOString(); saveDeals(arr); toast('Vazifa bekor qilindi') }
      renderModals(); render()
    })

    const taskBg = qs('#crmt-bg', slot)
    if(taskBg){
      const taskModal = qs('.modal', taskBg)
      const closeTask = ()=>{ taskModalOpen = false; renderModals() }
      taskBg.addEventListener('mousedown', e=>{ if(e.target===taskBg) closeTask() })
      if(taskModal) taskModal.addEventListener('mousedown', e=>e.stopPropagation())
      qs('#crmt-close', slot).addEventListener('click', closeTask)
      qs('#crmt-cancel', slot).addEventListener('click', closeTask)
      on(taskBg, 'click', '[data-taskdept]', (e,btn)=>{
        const textEl = qs('#crmd-task-text', slot); if(textEl) taskDraft.text = textEl.value
        const dueEl = qs('#crmd-task-due', slot); if(dueEl) taskDraft.due = dueEl.value
        const personEl = qs('#crmd-task-person', slot); if(personEl) taskDraft.person = personEl.value
        taskDeptSel = btn.dataset.taskdept
        renderModals()
      })
      qs('#crmd-task-assign', slot).addEventListener('click', ()=>{
        const personEl = qs('#crmd-task-person', slot)
        const name = personEl ? personEl.value : ''
        const textEl = qs('#crmd-task-text', slot)
        const dueEl = qs('#crmd-task-due', slot)
        if(!name){ toast('Xodimni tanlang'); return }
        const arr = loadDeals()
        const dd = arr.find(x=>x.id===d.id)
        if(dd){
          dd.taskAssignee = name
          dd.taskDeptKey = taskDeptSel
          dd.taskText = textEl ? textEl.value.trim() : ''
          dd.taskDue = dueEl ? dueEl.value : ''
          dd.updatedAt = new Date().toISOString()
          saveDeals(arr)
          toast('Vazifa biriktirildi')
        }
        taskModalOpen = false
        renderModals(); render()
      })
    }

    const infoEditBtn = qs('#crmd-info-edit', slot)
    if(infoEditBtn) infoEditBtn.addEventListener('click', ()=>{
      editInfoState = {
        leadPhone: d.leadPhone||'', extraPhone: d.extraPhone||'',
        bizType: d.bizType||'', region: d.region||'', source: d.source||'',
        leadChannel: d.leadChannel||'', currentSystem: d.currentSystem||'',
        dailyRevenue: d.dailyRevenue||'', tariff: d.tariff||'', amount: d.amount||'',
      }
      editInfoOpen = true
      renderModals()
    })
    const infoBg = qs('#crmi-bg', slot)
    if(infoBg){
      const infoModal = qs('.modal', infoBg)
      const closeInfo = ()=>{ editInfoOpen = false; editInfoState = null; renderModals() }
      infoBg.addEventListener('mousedown', e=>{ if(e.target===infoBg) closeInfo() })
      if(infoModal) infoModal.addEventListener('mousedown', e=>e.stopPropagation())
      qs('#crmi-close', slot).addEventListener('click', closeInfo)
      qs('#crmi-cancel', slot).addEventListener('click', closeInfo)
      const phoneEl = qs('#crmi-phone', slot); if(phoneEl) phoneEl.addEventListener('input', e=>{ editInfoState.leadPhone = e.target.value })
      const extraPhoneEl = qs('#crmi-extraphone', slot); if(extraPhoneEl) extraPhoneEl.addEventListener('input', e=>{ editInfoState.extraPhone = e.target.value })
      qs('#crmi-biztype', slot).addEventListener('change', e=>{ editInfoState.bizType = e.target.value })
      qs('#crmi-region', slot).addEventListener('change', e=>{ editInfoState.region = e.target.value })
      qs('#crmi-source', slot).addEventListener('input', e=>{ editInfoState.source = e.target.value })
      qs('#crmi-channel', slot).addEventListener('change', e=>{ editInfoState.leadChannel = e.target.value })
      qs('#crmi-cursys', slot).addEventListener('change', e=>{ editInfoState.currentSystem = e.target.value })
      qs('#crmi-revenue', slot).addEventListener('input', e=>{ editInfoState.dailyRevenue = e.target.value.replace(/\D/g,''); e.target.value = editInfoState.dailyRevenue?fmtSum(editInfoState.dailyRevenue):'' })
      qs('#crmi-tariff', slot).addEventListener('change', e=>{ editInfoState.tariff = e.target.value })
      qs('#crmi-amount', slot).addEventListener('input', e=>{ editInfoState.amount = e.target.value.replace(/\D/g,''); e.target.value = editInfoState.amount?fmtSum(editInfoState.amount):'' })
      qs('#crmi-save', slot).addEventListener('click', ()=>{
        const arr = loadDeals()
        const dd = arr.find(x=>x.id===d.id)
        if(dd){
          if(!c){ dd.leadPhone = editInfoState.leadPhone.trim(); dd.extraPhone = editInfoState.extraPhone.trim() }
          dd.bizType = editInfoState.bizType
          dd.region = editInfoState.region
          dd.source = editInfoState.source.trim()
          dd.leadChannel = editInfoState.leadChannel
          dd.currentSystem = editInfoState.currentSystem
          dd.dailyRevenue = Number(editInfoState.dailyRevenue)||0
          dd.tariff = editInfoState.tariff
          dd.amount = Number(editInfoState.amount)||0
          dd.updatedAt = new Date().toISOString()
          saveDeals(arr)
          toast("Mijoz ma'lumotlari yangilandi")
        }
        editInfoOpen = false; editInfoState = null
        renderModals(); render()
      })
    }
    on(bg, 'click', '[data-call-act]', (e,btn)=>{
      const act = btn.dataset.callAct
      if(act==='del'){
        const callId = btn.dataset.callId
        const allCalls = loadCalls()
        if(allCalls[d.id]) allCalls[d.id] = allCalls[d.id].filter(x=>x.id!==callId)
        saveCalls(allCalls)
        toast("Qo'ng'iroq yozuvi o'chirildi")
        renderModals(); render()
      } else {
        toast('Bu funksiya tez orada ulanadi')
      }
    })
    wireAudioPlayers(slot)
  }

  // ---------------- Ovozli qo'ng'iroq yozib olish (MediaRecorder) ----------------
  function startRecording(dealId){
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder==='undefined'){
      toast("Brauzeringiz ovoz yozishni qo'llamaydi"); return
    }
    navigator.mediaDevices.getUserMedia({ audio:true }).then(stream=>{
      let mr
      try{ mr = new MediaRecorder(stream) }catch(ex){ toast("Yozib olishni boshlab bo'lmadi"); stream.getTracks().forEach(t=>t.stop()); return }
      const chunks = []
      const rec = { stream, mediaRecorder:mr, dealId, startTs: Date.now(), discard:false }
      mr.ondataavailable = e=>{ if(e.data && e.data.size>0) chunks.push(e.data) }
      mr.onstop = ()=>{
        stream.getTracks().forEach(t=>t.stop())
        if(rec.discard){ if(recorder===rec) recorder = null; return }
        const durationSec = Math.max(1, Math.round((Date.now()-rec.startTs)/1000))
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' })
        const reader = new FileReader()
        reader.onload = ()=>{
          const calls = loadCalls()
          if(!calls[dealId]) calls[dealId] = []
          calls[dealId].push({ id: genId('call'), date: new Date().toISOString(), duration: durationSec, managerName: getUser()||'Admin', note:'', audioData: reader.result })
          saveCalls(calls)
          if(recorder===rec) recorder = null
          toast("Qo'ng'iroq yozuvi saqlandi")
          renderModals()
        }
        reader.readAsDataURL(blob)
      }
      recorder = rec
      mr.start()
      toast("Qo'ng'iroq boshlandi — ovoz avtomatik yozilmoqda")
      renderModals()
    }).catch(()=>{ toast('Mikrofonga ruxsat berilmadi') })
  }
  function stopRecording(){
    if(recorder && recorder.mediaRecorder && recorder.mediaRecorder.state!=='inactive') recorder.mediaRecorder.stop()
  }
  function discardRecording(){
    if(!recorder) return
    recorder.discard = true
    try{
      if(recorder.mediaRecorder && recorder.mediaRecorder.state!=='inactive') recorder.mediaRecorder.stop()
      else if(recorder.stream) recorder.stream.getTracks().forEach(t=>t.stop())
    }catch(ex){}
    recorder = null
  }

  load()
  return function cleanup(){ discardRecording() }
}
