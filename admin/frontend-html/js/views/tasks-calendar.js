import { api } from '../api.js'
import { qs, on, escapeHtml } from '../core.js'
import { todayISO } from '../tasksShared.js'
import { mountNotifBell, openTaskModal } from '../tasksWidgets.js'

const MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']
const DOWS = ['Du','Se','Ch','Pa','Ju','Sh','Ya']
const IC_L = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`
const IC_R = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`

function pad(n){ return String(n).padStart(2,'0') }
function iso(y,m,d){ return y+'-'+pad(m+1)+'-'+pad(d) }

// TasksCalendar.jsx'ning vanilla JS ko'chirmasi — Vazifalar → Kalendar.
// Oy bo'yicha to'r, har bir kunda shu kunga muddati bor vazifalar chip
// sifatida ko'rsatiladi; kunga bosilganda o'sha kundagi vazifalar ochiladi.
export function mountTasksCalendar(root, { toast }){
  let projects = [], tasks = [], labels = [], team = [], clients = []
  let loaded = false
  const t0 = todayISO().split('-')
  let cursor = { y:Number(t0[0]), m:Number(t0[1])-1 }
  let dayModal = null // iso date string
  let modalCleanup = null

  async function load(){
    const [p,t,l,tm,cl] = await Promise.all([
      api.projectsList().catch(()=>[]), api.tasksList().catch(()=>[]), api.labelsList().catch(()=>[]), api.team().catch(()=>[]), api.clientsList().catch(()=>[])
    ])
    projects = p; tasks = t; labels = l; team = tm; clients = cl; loaded = true
    render()
  }
  async function reloadTasks(){ try{ tasks = await api.tasksList() }catch(e){} }
  async function reloadLabels(){ try{ labels = await api.labelsList() }catch(e){} }

  function tasksOn(dateIso){ return tasks.filter(t=>t.dueDate===dateIso) }

  function render(){
    if(modalCleanup){ modalCleanup(); modalCleanup = null }
    if(!loaded){ root.innerHTML = `<div style="padding:40px;text-align:center;color:var(--mut)">Yuklanmoqda…</div>`; return }

    const today = todayISO()
    const first = new Date(cursor.y, cursor.m, 1)
    const startDow = (first.getDay()+6)%7
    const daysInMonth = new Date(cursor.y, cursor.m+1, 0).getDate()
    const daysInPrevMonth = new Date(cursor.y, cursor.m, 0).getDate()

    const cells = []
    for(let i=0;i<startDow;i++){ const d = daysInPrevMonth-startDow+1+i; const m = cursor.m===0?11:cursor.m-1; const y = cursor.m===0?cursor.y-1:cursor.y; cells.push({ d, iso:iso(y,m,d), other:true }) }
    for(let d=1; d<=daysInMonth; d++){ cells.push({ d, iso:iso(cursor.y,cursor.m,d), other:false }) }
    while(cells.length%7!==0 || cells.length<42){ const idx = cells.length-startDow-daysInMonth; const d = idx+1; const m = cursor.m===11?0:cursor.m+1; const y = cursor.m===11?cursor.y+1:cursor.y; cells.push({ d, iso:iso(y,m,d), other:true }); if(cells.length>=42) break }

    root.innerHTML = `
      <div>
        <div class="dash-head">
          <h2>Kalendar</h2>
          <div style="margin-left:auto" id="tc-notif"></div>
        </div>
        <div class="cal-nav">
          <button id="tc-prev">${IC_L}</button>
          <b>${MONTHS[cursor.m]} ${cursor.y}</b>
          <button id="tc-next">${IC_R}</button>
        </div>
        <div class="cal-grid">
          ${DOWS.map(d=>`<div class="cal-dow">${d}</div>`).join('')}
          ${cells.map((c,i)=>{
            const dayTasks = tasksOn(c.iso)
            return `
            <div class="cal-cell${c.other?' other':''}${c.iso===today?' today':''}" data-iso="${c.iso}" data-has="${dayTasks.length>0?'1':'0'}">
              <div class="cal-daynum">${c.d}${dayTasks.length>0 ? `<span class="cal-count">${dayTasks.length}</span>` : ''}</div>
              ${dayTasks.slice(0,3).map(t=>`<div class="cal-chip" title="${escapeHtml(t.title)}">${escapeHtml(t.title)}${t.dueTime?` <span class="cal-chip-time">${escapeHtml(t.dueTime)}</span>`:''}</div>`).join('')}
              ${dayTasks.length>3 ? `<div class="cal-more">+${dayTasks.length-3} ko'proq</div>` : ''}
            </div>`
          }).join('')}
        </div>
        <div id="tc-day-modal-slot"></div>
        <div id="tc-task-modal-slot"></div>
      </div>
    `

    mountNotifBell(qs('#tc-notif', root), { onOpenTaskId(id){ const t = tasks.find(x=>x.id===id); if(t) openTask(t) } })
    qs('#tc-prev', root).addEventListener('click', ()=>{ cursor = cursor.m===0 ? {y:cursor.y-1,m:11} : {y:cursor.y,m:cursor.m-1}; render() })
    qs('#tc-next', root).addEventListener('click', ()=>{ cursor = cursor.m===11 ? {y:cursor.y+1,m:0} : {y:cursor.y,m:cursor.m+1}; render() })
    on(qs('.cal-grid', root), 'click', '.cal-cell', (e,cell)=>{
      if(cell.dataset.has!=='1') return
      dayModal = cell.dataset.iso
      renderDayModal()
    })

    if(dayModal) renderDayModal()
  }

  function renderDayModal(){
    const slot = qs('#tc-day-modal-slot', root)
    if(!slot) return
    if(!dayModal){ slot.innerHTML = ''; return }
    const list = tasksOn(dayModal)
    slot.innerHTML = `
      <div class="modal-bg" id="tc-day-bg">
        <div class="modal" style="max-width:440px">
          <div class="form-col">
            <h3>${escapeHtml(dayModal.split('-').reverse().join('.'))}</h3>
            <div id="tc-day-list">
              ${list.map(t=>{
                const proj = projects.find(p=>p.id===t.projectId)
                const assigneeName = (team.find(x=>x.id===t.assignee)||{}).name
                return `
                <div class="tsk-row" data-task="${t.id}">
                  <span class="pri-pill ${t.priority}" style="flex:0 0 auto">${t.priority==='high'?'Yuqori':t.priority==='low'?'Past':"O'rta"}</span>
                  <span class="tr-title">${escapeHtml(t.title)}</span>
                  ${t.dueTime ? `<span class="tr-time">${escapeHtml(t.dueTime)}</span>` : ''}
                  ${assigneeName ? `<span class="tr-assignee">${escapeHtml(assigneeName)}</span>` : ''}
                  ${proj ? `<span class="tr-proj">${escapeHtml(proj.icon)} ${escapeHtml(proj.name)}</span>` : ''}
                </div>`
              }).join('')}
            </div>
            <div class="modal-actions"><button type="button" class="btn ghost" id="tc-day-close">Yopish</button></div>
          </div>
        </div>
      </div>
    `
    const bg = qs('#tc-day-bg', slot); const modal = qs('.modal', slot)
    bg.addEventListener('mousedown', e=>{ if(e.target===bg) closeDayModal() })
    modal.addEventListener('mousedown', e=>e.stopPropagation())
    qs('#tc-day-close', slot).addEventListener('click', closeDayModal)
    on(qs('#tc-day-list', slot), 'click', '[data-task]', (e,row)=>{
      const t = tasks.find(x=>x.id===row.dataset.task)
      closeDayModal()
      if(t) openTask(t)
    })
  }
  function closeDayModal(){ dayModal = null; const slot = qs('#tc-day-modal-slot', root); if(slot) slot.innerHTML = '' }

  function openTask(t){
    const slot = qs('#tc-task-modal-slot', root)
    if(!slot) return
    modalCleanup = openTaskModal(slot, {
      task: t, projects, team, labels, clients, toast,
      onClose(){ slot.innerHTML = ''; if(modalCleanup){ modalCleanup(); modalCleanup = null } },
      async onSaved(){ slot.innerHTML = ''; if(modalCleanup){ modalCleanup(); modalCleanup=null } await reloadTasks(); toast('Saqlandi'); render() },
      async onDeleted(){ slot.innerHTML = ''; if(modalCleanup){ modalCleanup(); modalCleanup=null } await reloadTasks(); toast("Vazifa o'chirildi"); render() },
      reloadLabels,
    })
  }

  load()
  return function cleanup(){ if(modalCleanup) modalCleanup() }
}
