// CRM → Statistika. DIQQAT: bu sahifa ikkita haqiqiy manbadan hisoblanadi —
// (1) CRM Kanban doskasidagi (crm.js) murojaat (deal) ma'lumotlari
// (localStorage'dagi zood-crm-deals), (2) Boshqaruv paneli bilan bir xil
// loyiha/vazifa statistikasi (api.projectsList/tasksList). "Loyihalar
// bo'yicha intizom" bloki Boshqaruv panelidagi bilan bir xil — hozircha
// haqiqiy davomat tizimi yo'qligi uchun barqaror (bir xil loyiha uchun har
// doim bir xil) NAMUNA foizdan foydalanadi.
import { escapeHtml } from '../core.js'
import { api } from '../api.js'
import { todayISO, isOverdue } from '../tasksShared.js'
import { loadDeals, STAGES } from './crm.js'

// Menejer (managerName — oddiy matn qator) real jamoa a'zosiga ismi bo'yicha
// moslashtiriladi (agar mos kelsa), so'ng o'sha a'zoga biriktirilgan
// vazifalar orqali qaysi loyiha(lar)da ishlayotgani aniqlanadi. Mos kelmasa
// (masalan namuna menejer ismi bo'lsa) — loyiha ustuni bo'sh ko'rsatiladi.
function managerProjectNames(managerName, team, tasks, projects){
  const norm = s => String(s||'').trim().toLowerCase()
  const member = (team||[]).find(t=>norm(t.name)===norm(managerName))
  if(!member) return []
  const pids = [...new Set((tasks||[]).filter(t=>t.assignee===member.id).map(t=>t.projectId).filter(Boolean))]
  return pids.map(pid=>{ const p=(projects||[]).find(x=>x.id===pid); return p ? p.name : null }).filter(Boolean)
}

const IC_USERS = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
const IC_DEALS = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="5" height="16" rx="1.3"/><rect x="9.5" y="4" width="5" height="10" rx="1.3"/><rect x="16" y="4" width="5" height="13" rx="1.3"/></svg>`
const IC_ACTIVE = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2"/></svg>`
const IC_SUM = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/></svg>`

function kpiCard(cls, ic, num, title){
  return `
    <div class="mij-card top-${cls} mij-card-sm">
      <div class="mij-card-top"><span class="mij-card-ic">${ic}</span></div>
      <div class="mij-card-num">${num}</div>
      <div class="mij-card-title">${escapeHtml(title)}</div>
    </div>
  `
}

// Boshqaruv panelidagi bilan bir xil formula — "Loyihalar bo'yicha intizom"
// uchun barqaror (loyiha id'siga bog'liq, sahifa yangilanganda o'zgarmaydigan) NAMUNA foiz.
function hashStr(s){
  let h = 0
  const str = String(s||'')
  for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0 }
  return Math.abs(h)
}

export function mountCrmStatistika(root, { toast }){
  let clients = null   // null = hali yuklanmagan
  let projects = null
  let tasks = null
  let team = null

  async function load(){
    const [cl, pr, ts, tm] = await Promise.all([
      api.clientsList().catch(()=>[]),
      api.projectsList().catch(()=>[]),
      api.tasksList().catch(()=>[]),
      api.team().catch(()=>[]),
    ])
    clients = cl; projects = pr; tasks = ts; team = tm
    render()
  }

  function render(){
    const deals = loadDeals()
    const totalDeals = deals.length
    const resolvedCount = deals.filter(d=>d.stage==='resolved').length
    const activeCount = totalDeals - resolvedCount

    const byStage = STAGES.map(s=>{
      const items = deals.filter(d=>d.stage===s.key)
      return { ...s, count: items.length, amount: items.reduce((a,d)=>a+(d.amount||0),0) }
    })
    const maxStage = Math.max(1, ...byStage.map(s=>s.count))

    // Loyihalar/vazifalar bo'yicha — Boshqaruv panelidagi bilan bir xil hisob-kitob.
    const pr = projects || [], ts = tasks || [], tm = team || []

    const byManagerMap = {}
    deals.forEach(d=>{
      const name = d.managerName || "Noma'lum"
      if(!byManagerMap[name]) byManagerMap[name] = { name, total:0, resolved:0, active:0 }
      byManagerMap[name].total++
      if(d.stage==='resolved') byManagerMap[name].resolved++
      else byManagerMap[name].active++
    })
    const managers = Object.values(byManagerMap).map(m=>({
      ...m,
      projNames: managerProjectNames(m.name, tm, ts, pr),
    })).sort((a,b)=>b.total-a.total)

    const activeProjects = pr.filter(p=>!p.archived)
    const open = ts.filter(t=>t.status!=='done')
    const today = todayISO()
    const dueToday = ts.filter(t=>t.dueDate===today && t.status!=='done').length
    const doneCount = ts.filter(t=>t.status==='done').length
    const donePct = ts.length ? Math.round(doneCount/ts.length*100) : 0
    const overdueCount = ts.filter(t=>isOverdue(t.dueDate,t.status)).length
    const allProjBars = activeProjects.map(p=>({ p, count: ts.filter(t=>t.projectId===p.id).length })).sort((a,b)=>b.count-a.count)
    const maxProjBar = Math.max(1, ...allProjBars.map(x=>x.count))
    const projDiscipline = activeProjects.map(p=>({ p, pct: 60 + (hashStr(p.id)%36) }))

    root.innerHTML = `
      <div class="dash-head">
        <h2>Statistika</h2>
        <div style="color:var(--mut);font-size:12.5px;font-weight:700;margin-top:2px">CRM murojaatlari, menejerlar va loyihalar faoliyati — haqiqiy ma'lumotlar asosida</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px">
        ${kpiCard('blue', IC_USERS, clients===null ? '…' : clients.length, 'Jami mijozlar')}
        ${kpiCard('green', IC_DEALS, totalDeals, 'Jami murojaatlar')}
        ${kpiCard('amber', IC_ACTIVE, activeCount, 'Faol jarayonda')}
        ${kpiCard('green', IC_SUM, resolvedCount, 'Bajarildi')}
      </div>

      <div class="wiz-card">
        <h4>Bosqichlar bo'yicha taqsimot</h4>
        <div style="margin-top:10px">
          ${byStage.map(s=>`
            <div class="bar-row">
              <span style="width:180px">${escapeHtml(s.label)}</span>
              <div class="bar-track"><span class="bar-fill" style="width:${maxStage? (s.count/maxStage*100) : 0}%;background:${s.color}"></span></div>
              <b>${s.count}</b>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="wiz-card" style="margin-top:16px">
        <h4>Menejerlar bo'yicha</h4>
        <div class="tbl-wrap" style="margin-top:10px">
          <table class="tbl">
            <thead><tr><th>Menejer</th><th>Loyiha</th><th>Jami murojaat</th><th>Jarayonda</th><th>Bajarildi</th></tr></thead>
            <tbody>
              ${managers.map(m=>`
                <tr>
                  <td class="t-firm">${escapeHtml(m.name)}</td>
                  <td>${m.projNames.length ? escapeHtml(m.projNames.join(', ')) : '<span style="color:var(--mut)">—</span>'}</td>
                  <td>${m.total}</td>
                  <td>${m.active}</td>
                  <td>${m.resolved}</td>
                </tr>
              `).join('')}
              ${managers.length===0 ? `<tr><td colspan="5" style="text-align:center;color:var(--mut)">Ma'lumot yo'q</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>

      <div class="sec-lbl" style="margin-top:22px">Loyihalar va vazifalar</div>

      <div class="kpi-grid lg">
        <div class="stat-tile"><b>${activeProjects.length}</b><span>Faol loyihalar</span></div>
        <div class="stat-tile"><b style="color:var(--b)">${open.length}</b><span>Ochiq vazifalar</span></div>
        <div class="stat-tile"><b style="color:var(--amber)">${dueToday}</b><span>Bugun muddati</span></div>
        <div class="stat-tile"><b style="color:var(--red)">${overdueCount}</b><span>Muddati o'tgan</span></div>
        <div class="stat-tile"><b style="color:var(--green)">${donePct}%</b><span>Bajarilgan</span></div>
      </div>

      <div class="big-bar-card" style="margin-top:16px">
        <h4>Loyihalar bo'yicha vazifalar</h4>
        <div style="color:var(--mut);font:700 12px system-ui,sans-serif;margin-bottom:6px">Har bir faol loyihada nechta vazifa borligi</div>
        ${allProjBars.length===0 ? `<div class="empty" style="padding:24px;margin-top:10px">Hali loyiha yo'q.</div>` : `
        <div class="big-bar-chart">
          ${allProjBars.map(({p,count})=>`
            <div class="bc-col" style="min-width:74px;flex-basis:74px">
              <b>${count}</b>
              <div class="bc-bar" style="height:${Math.max(4, Math.round(count/maxProjBar*150))}px;background:${p.color}"></div>
              <div class="bc-label" title="${escapeHtml(p.name)}" style="white-space:normal;max-width:74px;overflow:visible;text-overflow:clip">${escapeHtml(p.icon)} ${escapeHtml(p.name)}</div>
            </div>
          `).join('')}
        </div>`}
      </div>

      <div class="widget" style="margin-top:16px">
        <h4>Loyihalar bo'yicha intizom</h4>
        <div style="color:var(--mut);font:700 12px system-ui,sans-serif;margin-bottom:12px">O'z vaqtida kelish ulushi</div>
        ${projDiscipline.length===0 ? `<div style="color:var(--mut);font:700 12.5px system-ui,sans-serif">Hali loyiha yo'q.</div>` : projDiscipline.map(({p,pct})=>`
          <div class="bar-row">
            <span style="width:140px">${escapeHtml(p.icon)} ${escapeHtml(p.name)}</span>
            <div class="bar-track"><span class="bar-fill" style="width:${pct}%;background:${pct>=80?'var(--green)':pct>=65?'var(--amber)':'var(--red)'}"></span></div>
            <b>${pct}%</b>
          </div>
        `).join('')}
        ${projDiscipline.length ? `<div class="ic-note" style="margin-top:10px">Yuqoridagi foizlar — haqiqiy davomat/intizom tizimi hali ulanmagani uchun ko'rsatiladigan barqaror NAMUNA (demo) qiymat: har bir loyiha uchun loyiha ID'siga asoslangan formula bilan hisoblanadi va real ishlash ko'rsatkichini aks ettirmaydi.</div>` : ''}
      </div>
    `
  }

  render()
  load()

  return function cleanup(){}
}
