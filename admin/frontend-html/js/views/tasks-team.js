import { api } from '../api.js'
import { qs, on, escapeHtml } from '../core.js'
import { initials, isOverdue } from '../tasksShared.js'
import { mountNotifBell, openTaskModal } from '../tasksWidgets.js'

// TasksTeam.jsx'ning vanilla JS ko'chirmasi — Vazifalar → Jamoa.
// Owner + faol xodimlar ro'yxati (faol/bajarilgan vazifa soni bilan) +
// butun ish maydoni bo'yicha umumiy faoliyat jurnali.
export function mountTasksTeam(root, { toast }){
  let projects = [], tasks = [], labels = [], team = [], clients = []
  let activity = null
  let loaded = false
  let modalCleanup = null

  async function load(){
    const [p,t,l,tm,cl] = await Promise.all([
      api.projectsList().catch(()=>[]), api.tasksList().catch(()=>[]), api.labelsList().catch(()=>[]), api.team().catch(()=>[]), api.clientsList().catch(()=>[])
    ])
    projects = p; tasks = t; labels = l; team = tm; clients = cl; loaded = true
    render()
    api.activityList().then(a=>{ activity = a; render() }).catch(()=>{ activity = []; render() })
  }
  async function reloadTasks(){ try{ tasks = await api.tasksList() }catch(e){} }
  async function reloadLabels(){ try{ labels = await api.labelsList() }catch(e){} }

  function render(){
    if(modalCleanup){ modalCleanup(); modalCleanup = null }
    if(!loaded){ root.innerHTML = `<div style="padding:40px;text-align:center;color:var(--mut)">Yuklanmoqda…</div>`; return }

    // Har bir a'zo bo'yicha ish yuki statistikasi: jami/faol/bajarilgan/kechikkan/bajarish %.
    const memberStats = team.map(m=>{
      const mine = tasks.filter(t=>t.assignee===m.id)
      const active = mine.filter(t=>t.status!=='done').length
      const done = mine.filter(t=>t.status==='done').length
      const late = mine.filter(t=>isOverdue(t.dueDate,t.status)).length
      const pct = mine.length ? Math.round(done/mine.length*100) : 0
      return { m, total:mine.length, active, done, late, pct }
    }).sort((a,b)=> b.total-a.total)

    root.innerHTML = `
      <div>
        <div class="dash-head">
          <h2>Jamoa</h2><span class="count">${team.length} ta a'zo</span>
          <div style="margin-left:auto" id="tt-notif"></div>
        </div>
        <div class="team-grid">
          ${memberStats.map(({m,total,active,done,late,pct})=>`
            <div class="team-card">
              <div class="team-av">${escapeHtml(initials(m.name))}</div>
              <b>${escapeHtml(m.name)}</b>
              <small>${m.role==='admin'?'Admin':'Xodim'}${m.position?' · '+escapeHtml(m.position):''}</small>
              <div class="team-stats">
                <div><b>${total}</b><span>JAMI</span></div>
                <div><b>${active}</b><span>FAOL</span></div>
                <div><b>${done}</b><span>BAJARILGAN</span></div>
                <div><b style="color:${late>0?'var(--red)':'inherit'}">${late}</b><span>KECHIKKAN</span></div>
              </div>
              <div class="pc-bar" style="width:100%;margin-top:10px"><i style="width:${pct}%;background:${late>0?'var(--red)':'var(--green)'}"></i></div>
              <small style="margin-top:2px">${pct}% bajarilgan</small>
            </div>`
          ).join('')}
        </div>

        <div class="dash-head" style="margin-top:28px"><h2>Xodimlar kesimida statistika</h2></div>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr><th>Xodim</th><th>Rol</th><th>Jami vazifa</th><th>Faol</th><th>Bajarilgan</th><th>Kechikkan</th><th>Bajarish %</th></tr></thead>
            <tbody>
              ${memberStats.map(({m,total,active,done,late,pct})=>`
                <tr>
                  <td class="t-firm">${escapeHtml(m.name)}</td>
                  <td>${m.role==='admin'?'Admin':'Xodim'}</td>
                  <td>${total}</td>
                  <td>${active}</td>
                  <td>${done}</td>
                  <td style="${late>0?'color:var(--red);font-weight:800':''}">${late}</td>
                  <td>${pct}%</td>
                </tr>`
              ).join('')}
              ${memberStats.length===0 ? `<tr><td colspan="7" style="text-align:center;color:var(--mut)">Jamoa a'zosi yo'q</td></tr>` : ''}
            </tbody>
          </table>
        </div>

        <div class="dash-head" style="margin-top:28px"><h2>Faoliyat jurnali</h2></div>
        <div class="tbl-wrap">
          ${activity===null ? `<div style="padding:20px;text-align:center;color:var(--mut)">Yuklanmoqda…</div>` : ''}
          ${activity && activity.length===0 ? `<div class="empty" style="border:none;box-shadow:none">Hali faoliyat yo'q.</div>` : ''}
          ${activity && activity.length>0 ? `
            <table class="tbl">
              <thead><tr><th>Vaqt</th><th>Kim</th><th>Amal</th></tr></thead>
              <tbody>
                ${activity.slice(0,60).map(a=>`
                  <tr>
                    <td style="white-space:nowrap;color:var(--mut)">${escapeHtml(new Date(a.at).toLocaleString('uz-UZ'))}</td>
                    <td class="t-firm">${escapeHtml(a.actorName)}</td>
                    <td>${escapeHtml(a.text)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>` : ''}
        </div>
        <div id="tt-modal-slot"></div>
      </div>
    `
    mountNotifBell(qs('#tt-notif', root), { onOpenTaskId(id){ const t = tasks.find(x=>x.id===id); if(t) openTask(t) } })
  }

  function openTask(t){
    const slot = qs('#tt-modal-slot', root)
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
