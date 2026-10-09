import { api, getSub } from '../api.js'
import { qs, escapeHtml } from '../core.js'
import { fmtDate, isOverdue, isDueToday, addDaysISO, todayISO } from '../tasksShared.js'
import { mountNotifBell, openTaskModal } from '../tasksWidgets.js'

// MyTasksView.jsx'ning vanilla JS ko'chirmasi — Vazifalar → Vazifalarim.
// Menga biriktirilgan vazifalar, muddatiga qarab guruhlangan: Yulduzchali →
// Kechikkan → Bugun → Shu hafta → Keyinroq (har biri faqat bitta guruhda).
export function mountTasksMine(root, { toast }){
  let projects = [], tasks = [], labels = [], team = [], clients = []
  let loaded = false
  let modalCleanup = null
  const me = getSub()

  async function load(){
    const [p,t,l,tm,cl] = await Promise.all([
      api.projectsList().catch(()=>[]), api.tasksList().catch(()=>[]), api.labelsList().catch(()=>[]), api.team().catch(()=>[]), api.clientsList().catch(()=>[])
    ])
    projects = p; tasks = t; labels = l; team = tm; clients = cl; loaded = true
    render()
  }
  async function reloadTasks(){ try{ tasks = await api.tasksList() }catch(e){} }
  async function reloadLabels(){ try{ labels = await api.labelsList() }catch(e){} }

  function openTaskById(id){ const t = tasks.find(x=>x.id===id); if(t) openTask(t) }

  function render(){
    if(modalCleanup){ modalCleanup(); modalCleanup = null }
    if(!loaded){ root.innerHTML = `<div style="padding:40px;text-align:center;color:var(--mut)">Yuklanmoqda…</div>`; return }

    const mine = tasks.filter(t=>t.assignee===me)
    const visible = mine.filter(t=>t.status!=='done' || t.star)
    const claimed = new Set()
    const today = todayISO()
    const weekEnd = addDaysISO(today, 7)

    const star = visible.filter(t=>t.star)
    star.forEach(t=>claimed.add(t.id))
    const late = visible.filter(t=>!claimed.has(t.id) && isOverdue(t.dueDate, t.status))
    late.forEach(t=>claimed.add(t.id))
    const todayList = visible.filter(t=>!claimed.has(t.id) && isDueToday(t.dueDate))
    todayList.forEach(t=>claimed.add(t.id))
    const week = visible.filter(t=>!claimed.has(t.id) && t.dueDate && t.dueDate>today && t.dueDate<=weekEnd)
    week.forEach(t=>claimed.add(t.id))
    const later = visible.filter(t=>!claimed.has(t.id))

    const groups = [
      { key:'star', label:'★ Yulduzchali', list:star },
      { key:'late', label:'Kechikkan', list:late },
      { key:'today', label:'Bugun', list:todayList },
      { key:'week', label:'Shu hafta', list:week },
      { key:'later', label:'Keyinroq', list:later },
    ].filter(g=>g.list.length>0)

    root.innerHTML = `
      <div>
        <div class="dash-head">
          <h2>Vazifalarim</h2><span class="count">${mine.length} ta</span>
          <div style="margin-left:auto" id="tm-notif"></div>
        </div>
        ${groups.length===0 ? `<div class="empty">Sizga biriktirilgan faol vazifa yo'q.</div>` : ''}
        ${groups.map(g=>`
          <div class="tsk-group" data-group="${g.key}">
            <div class="tsk-group-head">${escapeHtml(g.label)} <span class="count">${g.list.length}</span></div>
            ${g.list.map(t=>{
              const proj = projects.find(p=>p.id===t.projectId)
              return `
              <div class="tsk-row${t.status==='done'?' done':''}" data-task="${t.id}">
                <span class="pri-pill ${t.priority}" style="flex:0 0 auto">${t.priority==='high'?'Yuqori':t.priority==='low'?'Past':"O'rta"}</span>
                <span class="tr-title">${escapeHtml(t.title)}</span>
                ${proj ? `<span class="tr-proj">${escapeHtml(proj.icon)} ${escapeHtml(proj.name)}</span>` : ''}
                ${t.dueDate ? `<span class="kc-due${isOverdue(t.dueDate,t.status)?' overdue':''}">${fmtDate(t.dueDate)}</span>` : ''}
                <button class="kc-star${t.star?' on':''}" data-star="${t.id}">★</button>
              </div>`
            }).join('')}
          </div>
        `).join('')}
        <div id="tm-modal-slot"></div>
      </div>
    `

    mountNotifBell(qs('#tm-notif', root), { onOpenTaskId: openTaskById })
    qsaOn(root, '[data-task]', 'click', (row)=>{ const t = tasks.find(x=>x.id===row.dataset.task); if(t) openTask(t) })
    qsaOn(root, '[data-star]', 'click', async (btn, e)=>{
      e.stopPropagation()
      try{ await api.taskStar(btn.dataset.star); await reloadTasks(); render() }catch(ex){ toast(ex.error||'Xatolik') }
    })
  }

  function qsaOn(scope, selector, event, handler){
    Array.from(scope.querySelectorAll(selector)).forEach(el=>{
      el.addEventListener(event, e=> handler(el, e))
    })
  }

  function openTask(t){
    const slot = qs('#tm-modal-slot', root)
    modalCleanup = openTaskModal(slot, {
      task: t, projects, team, labels, clients, me, toast,
      onClose(){ slot.innerHTML = ''; if(modalCleanup){ modalCleanup(); modalCleanup = null } },
      async onSaved(){ slot.innerHTML = ''; if(modalCleanup){ modalCleanup(); modalCleanup=null } await reloadTasks(); toast('Saqlandi'); render() },
      async onDeleted(){ slot.innerHTML = ''; if(modalCleanup){ modalCleanup(); modalCleanup=null } await reloadTasks(); toast("Vazifa o'chirildi"); render() },
      reloadLabels,
    })
  }

  load()
  return function cleanup(){ if(modalCleanup) modalCleanup() }
}
