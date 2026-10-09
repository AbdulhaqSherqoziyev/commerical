import { api } from '../api.js'
import { qs, qsa, on, escapeHtml } from '../core.js'
import { STATUS_LIST, PRIORITY_LIST, initials, fmtDate, isOverdue, getColumnLabel, setColumnLabel } from '../tasksShared.js'
import { mountNotifBell, openTaskModal } from '../tasksWidgets.js'

const IC_SEARCH = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`
const IC_FILTER = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>`
const IC_CLOCK = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`
const IC_CHK = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
const IC_CAL = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`
const IC_XLS = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 13 6 6M15 13l-6 6"/></svg>`
const IC_EDIT = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>`
const IC_PLUS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`
const IC_KANBAN = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="6" height="16" rx="1.3"/><rect x="11" y="4" width="6" height="10" rx="1.3"/><rect x="19" y="4" width="2" height="7" rx="1"/></svg>`
const IC_LIST = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>`
const IC_BACK = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`

const RANGE_TABS = [
  { key:'all',   label:'Barchasi' },
  { key:'year',  label:'Joriy yil' },
  { key:'month', label:'Joriy oy' },
  { key:'week',  label:'Joriy hafta' },
]
const LATE_KEY = '__late__'

// "Analitika" — Loyihani ichidagi Kanban tepasidagi "Kanban doska / Analitika"
// tugmasi orqali ochiladigan bo'lim. Jami/Bajarildi/Jarayonda/Muddati o'tgan,
// "Hodimlar bo'yicha" va "Muddati o'tgan tasklar" — HAQIQIY vazifa
// ma'lumotlaridan hisoblanadi. Javob/hal qilish vaqti (soat), SLA, kategoriya
// va tashqi/ichki klassifikatsiyasi hali tizimda umuman kuzatilmagani uchun —
// loyiha/task id'siga bog'liq barqaror NAMUNA (demo) qiymatlardan foydalaniladi
// (pastda "NAMUNA" deb aniq belgilangan).
function hashStr(s){
  let h = 0
  const str = String(s||'')
  for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0 }
  return Math.abs(h)
}
const ANA_CATS = [
  { key:'terminal', label:'Terminal', color:'#3D9DC9' },
  { key:'tolov',     label:"To'lov",   color:'#E05B4E' },
  { key:'bank',      label:'Bank',     color:'#E8A13F' },
  { key:'skoring',   label:'Skoring',  color:'#8B5CF6' },
  { key:'sms',       label:'SMS',      color:'#46B26C' },
  { key:'boshqa',    label:'Boshqalar',color:'#8CA0A8' },
]

function weekBounds(d){
  const day = (d.getDay()+6)%7 // 0=Dushanba
  const mon = new Date(d); mon.setDate(d.getDate()-day); mon.setHours(0,0,0,0)
  const sun = new Date(mon); sun.setDate(mon.getDate()+6); sun.setHours(23,59,59,999)
  return [mon, sun]
}

// Umumiy vazifalar — Vazifalar → barcha loyihalar bo'yicha bitta Kanban
// (Loyihalar bo'limidagi kanban bitta loyihaga qarab ochiladi; bu sahifa
// esa hammasini birdan, KPI + qidiruv/filtr bilan ko'rsatadi).
export function mountTasksAll(root, { toast, projectId, onBack, initialTaskId }){
  let projects = [], tasks = [], labels = [], team = [], clients = []
  let loaded = false
  let draggedId = null
  let modalCleanup = null
  let q = ''
  let range = 'all'
  let customFrom = '', customTo = ''
  let rangePickerOpen = false
  let filterOpen = false
  let fEmployee = ''
  let fStatus = ''
  let viewMode = 'kanban'
  let pageMode = 'kanban' // 'kanban' | 'analitika' — faqat loyiha ichida (projectId bo'lsa) ishlatiladi

  async function load(){
    const [p,t,l,tm,cl] = await Promise.all([
      api.projectsList().catch(()=>[]), api.tasksList().catch(()=>[]), api.labelsList().catch(()=>[]), api.team().catch(()=>[]), api.clientsList().catch(()=>[])
    ])
    projects = p; tasks = t; labels = l; team = tm; clients = cl; loaded = true
    render()
    if(initialTaskId){ const t = tasks.find(x=>x.id===initialTaskId); if(t) openTask(t) }
  }
  async function reloadTasks(){ try{ tasks = await api.tasksList() }catch(e){} }
  async function reloadLabels(){ try{ labels = await api.labelsList() }catch(e){} }

  function inRange(t){
    if(range==='custom'){
      if(!t.dueDate) return false
      if(customFrom && t.dueDate<customFrom) return false
      if(customTo && t.dueDate>customTo) return false
      return true
    }
    if(range==='all') return true
    if(!t.dueDate) return false
    const d = new Date(t.dueDate+'T00:00:00')
    const now = new Date()
    if(range==='year') return d.getFullYear()===now.getFullYear()
    if(range==='month') return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth()
    if(range==='week'){ const [mon,sun] = weekBounds(now); return d>=mon && d<=sun }
    return true
  }

  function filteredTasks(){
    const ql = q.trim().toLowerCase()
    return tasks
      .filter(t=> !projectId || t.projectId===projectId)
      .filter(t=> !ql || t.title.toLowerCase().includes(ql) || (t.desc||'').toLowerCase().includes(ql))
      .filter(t=> !fEmployee || t.assignee===fEmployee)
      .filter(t=> !fStatus || (fStatus===LATE_KEY ? isOverdue(t.dueDate,t.status) : t.status===fStatus))
      .filter(inRange)
  }

  // Loyiha ichidagi "Analitika" bo'limi. `real:*` bilan izohlangan qismlar
  // haqiqiy vazifa ma'lumotlaridan hisoblanadi; qolganlari (javob/hal qilish
  // vaqti, SLA, kategoriya, tashqi/ichki) — loyiha/task id'siga bog'liq
  // barqaror NAMUNA (demo) qiymatlar, chunki bular hali kuzatilmaydi.
  function analitikaHTML(pTasksAll){
    const seed = String(projectId||'x')
    const total = pTasksAll.length
    const doneCount = pTasksAll.filter(t=>t.status==='done').length
    const overdueCount = pTasksAll.filter(t=>isOverdue(t.dueDate,t.status)).length
    const jarayonda = Math.max(0, total - doneCount - overdueCount)

    const avgFirstResp = (1 + (hashStr(seed+'fr')%42)/10).toFixed(1)
    const avgResolve = (6 + (hashStr(seed+'rs')%220)/10).toFixed(1)
    const slaPct = 55 + (hashStr(seed+'sla')%40)

    function metricCard(label, value, color, sub){
      return `
        <div style="background:#fff;border:1px solid var(--line);border-left:4px solid ${color};border-radius:14px;padding:16px 18px;box-shadow:var(--shadow)">
          <div style="font:800 10.5px system-ui,sans-serif;color:var(--mut);text-transform:uppercase;letter-spacing:.05em">${escapeHtml(label)}</div>
          <div style="font:900 24px system-ui,sans-serif;color:${color};margin-top:6px">${value}</div>
          ${sub ? `<div style="font:700 11.5px system-ui,sans-serif;color:var(--mut);margin-top:2px">${escapeHtml(sub)}</div>` : ''}
        </div>
      `
    }

    // Javob vaqti — tashqi tasklar (NAMUNA): haqiqiy task nomlaridan, demo soat/kategoriya bilan.
    const respRows = pTasksAll.slice(0, 6).map(t=>{
      const cat = ANA_CATS[hashStr(t.id)%ANA_CATS.length]
      const firstResp = (0.3 + (hashStr(t.id+'a')%60)/10).toFixed(1)
      const resolve = (2 + (hashStr(t.id+'b')%320)/10).toFixed(1)
      return { t, cat, firstResp, resolve }
    })

    // Takrorlanuvchi muammolar (NAMUNA): kategoriya bo'yicha barqaror demo son.
    const repeatCounts = ANA_CATS.map(c=>({ ...c, count: 3 + (hashStr(seed+c.key)%40) })).sort((a,b)=>b.count-a.count)
    const repeatTotal = repeatCounts.reduce((a,c)=>a+c.count,0) || 1
    const maxRepeat = Math.max(1, ...repeatCounts.map(c=>c.count))

    // Hodimlar bo'yicha (HAQIQIY): shu loyihada vazifasi bor xodimlar.
    const memberIds = [...new Set(pTasksAll.map(t=>t.assignee).filter(Boolean))]
    const memberRows = memberIds.map(id=>{
      const m = team.find(x=>x.id===id)
      if(!m) return null
      const mine = pTasksAll.filter(t=>t.assignee===id)
      const done = mine.filter(t=>t.status==='done').length
      const pct = mine.length ? Math.round(done/mine.length*100) : 0
      return { m, total:mine.length, done, pct }
    }).filter(Boolean).sort((a,b)=>b.total-a.total)

    // Tashqi/Ichki taqsimot (NAMUNA): tasnif hali yo'q.
    const extPct = 40 + (hashStr(seed+'ext')%40)
    const intPct = 100 - extPct
    const extCount = Math.round(total*extPct/100)
    const intCount = total - extCount
    const avgDoneDays = (1.5 + (hashStr(seed+'days')%80)/10).toFixed(1)

    // Muddati o'tgan tasklar (HAQIQIY).
    const overdueTasks = pTasksAll.filter(t=>isOverdue(t.dueDate,t.status))

    return `
      <div id="ta-analitika">
      <div class="kpi-grid lg" style="grid-template-columns:repeat(4,1fr)">
        <div class="stat-tile"><b>${total}</b><span>Jami tasklar</span></div>
        <div class="stat-tile"><b style="color:var(--green)">${doneCount}</b><span>Bajarildi</span></div>
        <div class="stat-tile"><b style="color:var(--amber)">${jarayonda}</b><span>Jarayonda</span></div>
        <div class="stat-tile"><b style="color:var(--red)">${overdueCount}</b><span>Muddati o'tgan</span></div>
      </div>

      <div class="dash-widgets-3" style="margin-bottom:16px">
        ${metricCard("O'RTACHA BIRINCHI JAVOB (NAMUNA)", avgFirstResp+' soat', 'var(--b)')}
        ${metricCard("O'RTACHA HAL QILISH (NAMUNA)", avgResolve+' soat', 'var(--b7)')}
        ${metricCard(`SLA BAJARILISHI (NAMUNA)`, slaPct+'%', 'var(--green)', overdueCount+' buzilgan (haqiqiy)')}
      </div>

      <div class="dash-widgets" style="margin-bottom:16px">
        <div class="wiz-card" style="margin-bottom:0">
          <h4>Javob vaqti · tashqi tasklar <span style="color:var(--mut);font-weight:700;font-size:11.5px">(NAMUNA)</span></h4>
          <div class="tbl-wrap" style="margin-top:6px">
            <table class="tbl">
              <thead><tr><th>Task</th><th>Kategoriya</th><th>1-javob</th><th>Hal qilish</th></tr></thead>
              <tbody>
                ${respRows.map(r=>{
                  const bad = r.firstResp>=3
                  return `
                  <tr data-task="${r.t.id}" style="cursor:pointer">
                    <td class="t-firm">${escapeHtml(r.t.title)}</td>
                    <td>${escapeHtml(r.cat.label)}</td>
                    <td><span style="display:inline-block;padding:3px 9px;border-radius:20px;font:800 11px system-ui,sans-serif;background:${bad?'#FBEDEB':'#E7F5EC'};color:${bad?'var(--red)':'var(--green)'}">${r.firstResp} soat</span></td>
                    <td>${r.resolve} soat</td>
                  </tr>`
                }).join('')}
                ${respRows.length===0 ? `<tr><td colspan="4" style="text-align:center;color:var(--mut)">Vazifa yo'q</td></tr>` : ''}
              </tbody>
            </table>
          </div>
        </div>
        <div class="widget">
          <h4>Takrorlanuvchi muammolar <span style="color:var(--mut);font-weight:700;font-size:11.5px">(NAMUNA)</span></h4>
          <div style="color:var(--mut);font:700 12px system-ui,sans-serif;margin-bottom:12px">kategoriya bo'yicha · oxirgi 30 kun</div>
          ${repeatCounts.map(c=>`
            <div class="bar-row">
              <span style="width:96px">${escapeHtml(c.label)}</span>
              <div class="bar-track"><span class="bar-fill" style="width:${Math.round(c.count/maxRepeat*100)}%;background:${c.color}"></span></div>
              <b>${c.count} · ${Math.round(c.count/repeatTotal*100)}%</b>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="dash-widgets" style="margin-bottom:16px">
        <div class="widget">
          <h4>Hodimlar bo'yicha</h4>
          <div style="color:var(--mut);font:700 12px system-ui,sans-serif;margin-bottom:12px">haqiqiy ma'lumotlar</div>
          ${memberRows.length===0 ? `<div style="color:var(--mut);font:700 12.5px system-ui,sans-serif">Bu loyihada hali ijrochi biriktirilmagan.</div>` : memberRows.map(r=>`
            <div class="bar-row">
              <span style="width:120px">${escapeHtml(r.m.name)}</span>
              <div class="bar-track"><span class="bar-fill" style="width:${r.pct}%;background:var(--b)"></span></div>
              <b>${r.done}/${r.total} · ${r.pct}%</b>
            </div>
          `).join('')}
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="widget">
            <h4>Tashqi / Ichki taqsimot <span style="color:var(--mut);font-weight:700;font-size:11.5px">(NAMUNA)</span></h4>
            <div class="bar-track" style="height:14px;margin:10px 0"><span class="bar-fill" style="width:${extPct}%;background:var(--b)"></span></div>
            <div style="display:flex;justify-content:space-between;font:800 12px system-ui,sans-serif;color:var(--mut)">
              <span>Tashqi · ${extCount} ta · ${extPct}%</span>
              <span>Ichki · ${intCount} ta · ${intPct}%</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--line)">
              <span style="font:700 12.5px system-ui,sans-serif;color:var(--mut)">O'rtacha bajarish vaqti</span>
              <b style="font-size:15px">${avgDoneDays} kun</b>
            </div>
          </div>
          <div class="widget">
            <h4 style="color:var(--red)">Muddati o'tgan tasklar</h4>
            ${overdueTasks.length===0 ? `<div style="color:var(--mut);font:700 12.5px system-ui,sans-serif">Muddati o'tgan vazifa yo'q.</div>` : overdueTasks.map(t=>{
              const assigneeName = (team.find(x=>x.id===t.assignee)||{}).name
              const pr = PRIORITY_LIST.find(p=>p.key===t.priority)
              return `
              <div data-task="${t.id}" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 13px;background:#FBEDEB;border-radius:12px;margin-bottom:8px">
                <div style="min-width:0">
                  <div style="font:800 13px system-ui,sans-serif;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(t.title)}</div>
                  <div style="font:700 12px system-ui,sans-serif;color:var(--mut);margin-top:2px">${assigneeName?escapeHtml(assigneeName):'Ijrochisiz'}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex:0 0 auto">
                  ${pr ? `<span class="pri-pill ${t.priority}">${escapeHtml(pr.label)}</span>` : ''}
                  <span style="font:800 11.5px system-ui,sans-serif;color:var(--red);display:flex;align-items:center;gap:4px">${IC_CLOCK}${fmtDate(t.dueDate)}</span>
                </div>
              </div>`
            }).join('')}
          </div>
        </div>
      </div>

      <div class="hint">NAMUNA (demo) deb belgilangan qismlar — javob/hal qilish vaqti, SLA, kategoriya va tashqi/ichki tasnifi — hali tizimda kuzatilmagani uchun loyiha/task ID'siga asoslangan barqaror (o'zgarmas) namuna qiymatlar bilan ko'rsatilmoqda. "Jami tasklar/Bajarildi/Jarayonda/Muddati o'tgan", "Hodimlar bo'yicha" va "Muddati o'tgan tasklar" — haqiqiy vazifa ma'lumotlari.</div>
      </div>
    `
  }

  function render(){
    if(modalCleanup){ modalCleanup(); modalCleanup = null }
    if(!loaded){ root.innerHTML = `<div style="padding:40px;text-align:center;color:var(--mut)">Yuklanmoqda…</div>`; return }

    const openProject = projectId ? projects.find(p=>p.id===projectId) : null
    const shown = filteredTasks()
    const rangeActive = range==='custom'
    // Analitika — qidiruv/filtrga qaramay, shu loyihaning BARCHA vazifalari asosida.
    const pTasksAll = projectId ? tasks.filter(t=>t.projectId===projectId) : tasks
    const inAnalitika = pageMode==='analitika' && !!projectId

    root.innerHTML = `
      <div>
        <div class="dash-head" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div style="display:flex;align-items:center;gap:10px">
            ${onBack ? `<button class="ic-btn" id="ta-back">${IC_BACK}</button>` : ''}
            ${openProject ? `<span style="font-size:20px">${escapeHtml(openProject.icon)}</span>` : ''}
            <h2>${openProject ? escapeHtml(openProject.name) : 'Umumiy vazifalar'}</h2>
            ${projectId ? `
            <div class="view-toggle" id="ta-pagemode-toggle" style="margin-left:6px">
              <button class="${pageMode==='kanban'?'on':''}" data-pagemode="kanban">Kanban doska</button>
              <button class="${pageMode==='analitika'?'on':''}" data-pagemode="analitika">Analitika</button>
            </div>` : ''}
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <button class="btn small" id="ta-new">+ Yangi vazifa</button>
            <div id="ta-notif"></div>
          </div>
        </div>

        ${inAnalitika ? analitikaHTML(pTasksAll) : `
        <div class="fil-search">
          <div class="seg seg-sm" style="flex:0 0 auto">
            ${RANGE_TABS.map(r=>`<button class="${range===r.key?'on':''}" data-range="${r.key}">${escapeHtml(r.label)}</button>`).join('')}
          </div>
          <div style="position:relative;flex:0 0 auto" data-cal-wrap>
            <button class="fil-btn${rangeActive?' on':''}" id="ta-range-cal" title="Vaqt oralig'i bo'yicha ko'rish">${IC_CAL}${rangeActive ? (fmtDate(customFrom)||'…')+' — '+(fmtDate(customTo)||'…') : ''}</button>
            ${rangePickerOpen ? `
              <div class="menu-back" data-cal-back></div>
              <div class="row-menu" style="min-width:260px;padding:14px">
                <div class="fil-grid" style="grid-template-columns:1fr 1fr">
                  <div class="wf"><label>Dan</label><input type="date" id="ta-range-from" value="${escapeHtml(customFrom)}" /></div>
                  <div class="wf"><label>Gacha</label><input type="date" id="ta-range-to" value="${escapeHtml(customTo)}" /></div>
                </div>
                <div class="fil-acts" style="margin-top:12px">
                  <button class="btn ghost" id="ta-range-clear">↺ Tozalash</button>
                  <button class="btn" id="ta-range-apply">Qo'llash</button>
                </div>
              </div>` : ''}
          </div>
          <div class="search-box">
            ${IC_SEARCH}
            <input id="ta-q" value="${escapeHtml(q)}" placeholder="Vazifa qidirish…" />
          </div>
          <div class="view-toggle" id="ta-view-toggle">
            <button class="${viewMode==='kanban'?'on':''}" data-viewmode="kanban">${IC_KANBAN}Kanban</button>
            <button class="${viewMode==='list'?'on':''}" data-viewmode="list">${IC_LIST}Ro'yxat</button>
          </div>
          <button class="fil-btn" id="ta-export" title="Excelga yuklab olish">${IC_XLS} Excel</button>
          <button class="fil-btn${filterOpen?' on':''}" id="ta-filter-toggle">${IC_FILTER} Filtr</button>
        </div>

        ${filterOpen ? `
        <div class="fil-panel">
          <div class="fil-grid">
            <div class="wf"><label>Xodim</label>
              <select id="ta-femployee">
                <option value="">Barchasi</option>
                ${team.map(m=>`<option value="${m.id}" ${fEmployee===m.id?'selected':''}>${escapeHtml(m.name)}</option>`).join('')}
              </select>
            </div>
            <div class="wf"><label>Vazifa holati</label>
              <select id="ta-fstatus">
                <option value="">Barchasi</option>
                ${STATUS_LIST.map(s=>`<option value="${s.key}" ${fStatus===s.key?'selected':''}>${escapeHtml(s.label)}</option>`).join('')}
                <option value="${LATE_KEY}" ${fStatus===LATE_KEY?'selected':''}>Kechikkan</option>
              </select>
            </div>
          </div>
          <div class="fil-acts">
            <button class="btn ghost" id="ta-filter-reset">↺ Qayta o'rnatish</button>
            <button class="btn" id="ta-filter-apply">Qo'llash</button>
          </div>
        </div>` : ''}

        ${viewMode==='list' ? `
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr>
              <th>Sarlavha</th><th>Loyiha</th><th>Holat</th><th>Muhimlik</th><th>Ijrochi</th><th>Muddat</th><th></th>
            </tr></thead>
            <tbody id="ta-list-body">
              ${shown.length===0 ? `<tr><td colspan="7" style="text-align:center;color:var(--mut);padding:22px">Vazifa topilmadi</td></tr>` : ''}
              ${shown.map(t=>{
                const proj = projects.find(p=>p.id===t.projectId)
                const st = STATUS_LIST.find(s=>s.key===t.status)
                const stLabel = st ? getColumnLabel(st.key, st.label, projectId) : t.status
                const pr = PRIORITY_LIST.find(p=>p.key===t.priority)
                const assigneeName = (team.find(x=>x.id===t.assignee)||{}).name
                const overdue = isOverdue(t.dueDate, t.status)
                return `
                <tr data-task="${t.id}" style="cursor:pointer">
                  <td class="t-firm">${escapeHtml(t.title)}</td>
                  <td>${proj ? escapeHtml(proj.icon)+' '+escapeHtml(proj.name) : ''}</td>
                  <td><span style="display:inline-flex;align-items:center;gap:6px"><span style="width:7px;height:7px;border-radius:50%;background:${st?st.color:'#8CA0A8'};display:inline-block"></span>${escapeHtml(stLabel)}</span></td>
                  <td><span class="pri-pill ${t.priority}">${escapeHtml(pr?pr.label:'')}</span></td>
                  <td>${assigneeName ? escapeHtml(assigneeName) : '—'}</td>
                  <td style="${overdue?'color:var(--red);font-weight:800':''}">${fmtDate(t.dueDate)||'—'}${t.dueTime?' · '+escapeHtml(t.dueTime):''}</td>
                  <td><button class="kc-star${t.star?' on':''}" data-star="${t.id}" style="font-size:16px">★</button></td>
                </tr>`
              }).join('')}
            </tbody>
          </table>
        </div>
        ` : `
        <div class="kanban-wrap" id="ta-kanban-wrap">
          ${STATUS_LIST.map(col=>{
            const list = shown.filter(t=>t.status===col.key)
            const colLabel = getColumnLabel(col.key, col.label, projectId)
            return `
            <div class="kanban-col" data-col="${col.key}" style="--col-accent:${col.color}">
              <div class="kanban-col-head"><span style="width:8px;height:8px;border-radius:50%;background:${col.color};display:inline-block;flex:0 0 auto"></span><span class="col-title">${escapeHtml(colLabel)}</span><span class="cnt">${list.length}</span><button class="kc-edit-col" data-edit-col="${col.key}" title="Nomini o'zgartirish">${IC_EDIT}</button></div>
              <div class="kanban-col-body">
              ${list.map(t=>{
                const proj = projects.find(p=>p.id===t.projectId)
                const assigneeName = (team.find(x=>x.id===t.assignee)||{}).name
                const done = (t.checklist||[]).filter(c=>c.done).length
                const chkLen = (t.checklist||[]).length
                const overdue = isOverdue(t.dueDate, t.status)
                return `
                <div class="kanban-card" draggable="true" data-task="${t.id}">
                  ${proj ? `<div class="kc-proj">${escapeHtml(proj.icon)} ${escapeHtml(proj.name)}</div>` : ''}
                  <div class="kc-title">${escapeHtml(t.title)}</div>
                  ${(t.labels && t.labels.length>0) ? `<div class="kc-labels">${t.labels.map(lid=>{ const l = labels.find(x=>x.id===lid); if(!l) return ''; return `<span class="label-chip" style="background:${l.color}1e;color:${l.color}">● ${escapeHtml(l.name)}</span>` }).join('')}</div>` : ''}
                  <div class="kc-foot">
                    <span class="pri-pill ${t.priority}">${escapeHtml((PRIORITY_LIST.find(p=>p.key===t.priority)||{}).label||'')}</span>
                    ${assigneeName ? `<span class="kc-assignee" title="${escapeHtml(assigneeName)}">${escapeHtml(initials(assigneeName))}</span>` : ''}
                  </div>
                  <div class="kc-foot" style="margin-top:6px">
                    ${t.dueDate ? `<span class="kc-due${overdue?' overdue':''}">${IC_CLOCK}${fmtDate(t.dueDate)}${t.dueTime?' · '+escapeHtml(t.dueTime):''}</span>` : '<span></span>'}
                    <div style="display:flex;align-items:center;gap:8px">
                      ${chkLen>0 ? `<span class="kc-check">${IC_CHK}${done}/${chkLen}</span>` : ''}
                      <button class="kc-star${t.star?' on':''}" data-star="${t.id}">★</button>
                    </div>
                  </div>
                </div>`
              }).join('')}
              ${list.length===0 ? `<div style="text-align:center;color:var(--mut);font:700 11.5px system-ui,sans-serif;padding:14px 4px">Bo'sh</div>` : ''}
              <button class="fil-btn" style="width:100%;justify-content:center;margin-top:6px" data-col-add="${col.key}">+ Karta qo'shish</button>
              </div>
            </div>`
          }).join('')}
          <div class="kanban-col-add">
            <button id="ta-newcol-btn">${IC_PLUS}Ustun qo'shish</button>
          </div>
        </div>
        `}
        `}

        <div id="ta-modal-slot"></div>
      </div>
    `

    mountNotifBell(qs('#ta-notif', root), { onOpenTaskId(id){ const t = tasks.find(x=>x.id===id); if(t) openTask(t) } })
    wire(shown)
  }

  function wire(shown){
    const backBtn = qs('#ta-back', root)
    if(backBtn) backBtn.addEventListener('click', onBack)
    qs('#ta-new', root).addEventListener('click', ()=> openTask(null))

    const pmToggle = qs('#ta-pagemode-toggle', root)
    if(pmToggle) on(pmToggle, 'click', 'button[data-pagemode]', (e,btn)=>{ pageMode = btn.dataset.pagemode; render() })

    if(pageMode==='analitika' && projectId){
      // Analitika rejimida qidiruv/filtr/kanban elementlari DOM'da yo'q —
      // faqat vazifa qatorlarini bosib modalni ochish kifoya. Delegatsiya
      // har render'da qayta chiziladigan #ta-analitika konteyneriga
      // biriktiriladi (root'ning o'ziga emas) — shuning uchun qayta-qayta
      // render bo'lganda listener to'planib qolmaydi.
      const anaWrap = qs('#ta-analitika', root)
      if(anaWrap) on(anaWrap, 'click', '[data-task]', (e,node)=>{
        const t = tasks.find(x=>x.id===node.dataset.task); if(t) openTask(t)
      })
      return
    }

    const qInput = qs('#ta-q', root)
    qInput.addEventListener('input', e=>{ q = e.target.value; render(); const el = qs('#ta-q', root); if(el){ el.focus(); el.selectionStart = el.selectionEnd = el.value.length } })

    on(qs('.seg', root), 'click', 'button[data-range]', (e,btn)=>{ range = btn.dataset.range; customFrom=''; customTo=''; render() })

    qs('#ta-range-cal', root).addEventListener('click', ()=>{ rangePickerOpen = !rangePickerOpen; render() })
    const calBack = qs('[data-cal-back]', root)
    if(calBack) calBack.addEventListener('click', ()=>{ rangePickerOpen = false; render() })
    const rangeApply = qs('#ta-range-apply', root)
    if(rangeApply) rangeApply.addEventListener('click', ()=>{
      customFrom = qs('#ta-range-from', root).value
      customTo = qs('#ta-range-to', root).value
      range = 'custom'
      rangePickerOpen = false
      render()
    })
    const rangeClear = qs('#ta-range-clear', root)
    if(rangeClear) rangeClear.addEventListener('click', ()=>{ customFrom=''; customTo=''; range='all'; rangePickerOpen=false; render() })

    qs('#ta-export', root).addEventListener('click', ()=> doExport(shown))

    on(qs('#ta-view-toggle', root), 'click', 'button[data-viewmode]', (e,btn)=>{ viewMode = btn.dataset.viewmode; render() })

    qs('#ta-filter-toggle', root).addEventListener('click', ()=>{ filterOpen = !filterOpen; render() })
    const resetBtn = qs('#ta-filter-reset', root)
    if(resetBtn) resetBtn.addEventListener('click', ()=>{ fEmployee=''; fStatus=''; render() })
    const applyBtn = qs('#ta-filter-apply', root)
    if(applyBtn) applyBtn.addEventListener('click', ()=>{
      fEmployee = qs('#ta-femployee', root).value
      fStatus = qs('#ta-fstatus', root).value
      filterOpen = false
      render()
    })

    const wrap = qs('#ta-kanban-wrap', root)
    if(wrap){
      qsa('.kanban-col', wrap).forEach(col=>{
        col.addEventListener('dragover', e=> e.preventDefault())
        col.addEventListener('drop', e=>{
          e.preventDefault()
          if(!draggedId) return
          moveTask(draggedId, col.dataset.col)
        })
      })
      qsa('.kanban-card', wrap).forEach(card=>{
        card.addEventListener('dragstart', ()=>{ draggedId = card.dataset.task; card.classList.add('dragging') })
        card.addEventListener('dragend', ()=>{ draggedId = null; card.classList.remove('dragging') })
        card.addEventListener('click', e=>{
          if(e.target.closest('[data-star]')) return
          const t = tasks.find(x=>x.id===card.dataset.task); if(t) openTask(t)
        })
      })
      on(wrap, 'click', '[data-star]', async (e,btn)=>{
        e.stopPropagation()
        try{ await api.taskStar(btn.dataset.star); await reloadTasks(); render() }catch(ex){ toast(ex.error||'Xatolik') }
      })
      on(wrap, 'click', '[data-col-add]', (e,btn)=>{ openTask(null) })
      on(wrap, 'click', '[data-edit-col]', (e,btn)=>{
        e.stopPropagation()
        const key = btn.dataset.editCol
        const col = STATUS_LIST.find(s=>s.key===key)
        const current = getColumnLabel(key, col ? col.label : key, projectId)
        const name = prompt("Ustun nomi:", current)
        if(name===null) return
        setColumnLabel(key, name, projectId)
        render()
      })
      const newColBtn = qs('#ta-newcol-btn', root)
      if(newColBtn) newColBtn.addEventListener('click', ()=>{
        toast("Yangi ustun qo'shish uchun serverga o'zgarish kerak — buni qo'shishimni xohlaysizmi? Menga xabar bering.")
      })
    }

    const listBody = qs('#ta-list-body', root)
    if(listBody){
      on(listBody, 'click', 'tr[data-task]', (e,row)=>{
        if(e.target.closest('[data-star]')) return
        const t = tasks.find(x=>x.id===row.dataset.task); if(t) openTask(t)
      })
      on(listBody, 'click', '[data-star]', async (e,btn)=>{
        e.stopPropagation()
        try{ await api.taskStar(btn.dataset.star); await reloadTasks(); render() }catch(ex){ toast(ex.error||'Xatolik') }
      })
    }
  }

  function doExport(list){
    const X = window.XLSX; if(!X) return toast('Excel kutubxonasi yuklanmadi')
    const head = ['Sarlavha','Loyiha','Holat','Muhimlik','Ijrochi','Muddat','Vaqt','Kechikkanmi']
    const aoa = [head]
    list.forEach(t=>{
      const proj = projects.find(p=>p.id===t.projectId)
      const st = STATUS_LIST.find(s=>s.key===t.status)
      const pr = PRIORITY_LIST.find(p=>p.key===t.priority)
      const assigneeName = (team.find(x=>x.id===t.assignee)||{}).name || ''
      aoa.push([t.title, proj?proj.name:'', st?st.label:t.status, pr?pr.label:t.priority, assigneeName, fmtDate(t.dueDate)||'', t.dueTime||'', isOverdue(t.dueDate,t.status)?'Ha':"Yo'q"])
    })
    const ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = head.map(()=>({wch:22}))
    const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'Vazifalar'); X.writeFile(wb, 'vazifalar.xlsx')
  }

  async function moveTask(taskId, status){
    const t = tasks.find(x=>x.id===taskId)
    if(!t) return
    // ord — backendda har bir (loyiha+holat) juftligi ichida hisoblanadi;
    // shu loyihaning o'sha holatdagi vazifalari sonini olib, oxiriga qo'shamiz.
    const ord = tasks.filter(x=>x.projectId===t.projectId && x.status===status && x.id!==taskId).length
    try{ await api.taskMove(taskId, status, ord); await reloadTasks(); render() }
    catch(ex){ toast(ex.error||'Xatolik') }
  }

  function openTask(t){
    const slot = qs('#ta-modal-slot', root)
    modalCleanup = openTaskModal(slot, {
      task: t, projectId, projects, team, labels, clients, toast,
      onClose(){ slot.innerHTML = ''; if(modalCleanup){ modalCleanup(); modalCleanup = null } },
      async onSaved(saved, action){
        slot.innerHTML = ''; if(modalCleanup){ modalCleanup(); modalCleanup=null }
        await reloadTasks(); toast(action==='create' ? 'Vazifa yaratildi' : 'Vazifa saqlandi'); render()
      },
      async onDeleted(){
        slot.innerHTML = ''; if(modalCleanup){ modalCleanup(); modalCleanup=null }
        await reloadTasks(); toast("Vazifa o'chirildi"); render()
      },
      reloadLabels,
    })
  }

  load()
  return function cleanup(){ if(modalCleanup) modalCleanup() }
}
