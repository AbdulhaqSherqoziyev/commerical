import { api } from '../api.js'
import { qs, escapeHtml } from '../core.js'
import { STATUS_LIST, PRIORITY_LIST, todayISO, addDaysISO, isOverdue, fmtDate, daysLate } from '../tasksShared.js'
import { mountNotifBell, openTaskModal } from '../tasksWidgets.js'
import { initials } from '../tasksShared.js'

// TasksDashboard.jsx'ning vanilla JS ko'chirmasi — Vazifalar → Boshqaruv paneli.
// Sidebarda alohida bo'lim, o'zi barcha kerakli ma'lumotni (loyihalar/
// vazifalar/yorliqlar/jamoa) mustaqil yuklaydi.

// "Xodimlar davomati" bo'limi uchun — davomat tizimi (backend) hali yo'q,
// shuning uchun "Tabel" bo'limidagi bilan bir xil formula orqali doimiy
// (har safar bir xil) NAMUNA (demo) holat hisoblanadi. Xodim id'si bir xil
// bo'lgani uchun bu yerdagi va Tabel'dagi raqamlar mos keladi.
function hashStr(s){
  let h = 0
  const str = String(s||'')
  for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0 }
  return Math.abs(h)
}
function attStatus(empKey, y, m, day){
  const dow = new Date(y,m,day).getDay()
  if(dow===0) return 'off'
  const r = hashStr(empKey+'-'+day) % 100
  if(r < 8) return 'absent'
  if(r < 22) return 'late'
  return 'present'
}
// Real jamoa hali kichik bo'lsa (masalan 1 ta xodim), "Xodimlar davomati"
// bo'limi ko'rinishi qanday bo'lishini ko'rsatish uchun vaqtincha NAMUNA
// (demo) xodim nomlaridan foydalaniladi. Real xodimlar ko'payishi bilan
// (team.length oshsa) bu avtomatik ravishda haqiqiy ro'yxatga almashadi.
const DEMO_ATT_FALLBACK = [
  { id:'demo-att-1', name:'Aziz Sharipov', position:'Menejer', role:'xodim' },
  { id:'demo-att-2', name:'Shahnoza Yusupova', position:'Menejer', role:'xodim' },
  { id:'demo-att-3', name:'Diyorbek Ismoilov', position:'Kassir', role:'xodim' },
  { id:'demo-att-4', name:"Islom Toshpo'latov", position:'Kassir', role:'xodim' },
  { id:'demo-att-5', name:'Gulnora Rasulova', position:'Sotuvchi', role:'xodim' },
  { id:'demo-att-6', name:'Feruza Nabiyeva', position:'Bugalter', role:'xodim' },
]

export function mountTasksDashboard(root, { toast }){
  let projects = [], tasks = [], labels = [], team = [], clients = [], depts = []
  let loaded = false
  let modalCleanup = null

  async function load(){
    const [p,t,l,tm,cl,dp] = await Promise.all([
      api.projectsList().catch(()=>[]), api.tasksList().catch(()=>[]), api.labelsList().catch(()=>[]), api.team().catch(()=>[]), api.clientsList().catch(()=>[]), api.deptList().catch(()=>[])
    ])
    projects = p; tasks = t; labels = l; team = tm; clients = cl; depts = dp; loaded = true
    render()
  }
  async function reloadTasks(){ try{ tasks = await api.tasksList() }catch(e){} }
  async function reloadLabels(){ try{ labels = await api.labelsList() }catch(e){} }

  function openTaskById(id){ const t = tasks.find(x=>x.id===id); if(t) openTask(t) }

  function render(){
    if(modalCleanup){ modalCleanup(); modalCleanup = null }
    if(!loaded){ root.innerHTML = `<div style="padding:40px;text-align:center;color:var(--mut)">Yuklanmoqda…</div>`; return }

    const activeProjects = projects.filter(p=>!p.archived)
    const open = tasks.filter(t=>t.status!=='done')
    const today = todayISO()
    const in7 = addDaysISO(today,7)
    const dueToday = tasks.filter(t=>t.dueDate===today && t.status!=='done').length
    const doneCount = tasks.filter(t=>t.status==='done').length
    const donePct = tasks.length ? Math.round(doneCount/tasks.length*100) : 0
    const overdueTasks = tasks.filter(t=>isOverdue(t.dueDate,t.status)).sort((a,b)=>(a.dueDate||'').localeCompare(b.dueDate||''))
    const overdueCount = overdueTasks.length

    const statusCounts = STATUS_LIST.map(s=>({ ...s, n: tasks.filter(t=>t.status===s.key).length }))
    const total = tasks.length || 1
    let acc = 0
    const gradParts = statusCounts.map(s=>{
      const from = acc/total*360; acc += s.n; const to = acc/total*360
      return s.color+' '+from+'deg '+to+'deg'
    })
    const donutBg = tasks.length ? `conic-gradient(${gradParts.join(',')})` : '#EEF2F4'

    const priorityCounts = PRIORITY_LIST.map(p=>({ ...p, n: open.filter(t=>t.priority===p.key).length }))
    const maxPri = Math.max(1, ...priorityCounts.map(p=>p.n))
    const priColor = { low:'#46B26C', medium:'#E8A13F', high:'#E05B4E' }

    const upcoming = tasks.filter(t=>t.status!=='done' && t.dueDate && t.dueDate<=in7)
      .sort((a,b)=> (a.dueDate||'').localeCompare(b.dueDate||''))
      .slice(0,8)

    // Katta diagrammalar (banner/donut/bar) uchun — hammasi haqiqiy ma'lumot.
    const archivedCount = projects.length - activeProjects.length
    const projTotal = projects.length || 1
    const projFaolDeg = activeProjects.length/projTotal*360
    const projDonutBg = projects.length ? `conic-gradient(var(--b) 0deg ${projFaolDeg}deg, #DCE6E9 ${projFaolDeg}deg 360deg)` : '#EEF2F4'
    const allProjBars = activeProjects.map(p=>({ p, count: tasks.filter(t=>t.projectId===p.id).length })).sort((a,b)=>b.count-a.count)
    const maxProjBar = Math.max(1, ...allProjBars.map(x=>x.count))

    // Xodimlar bo'yicha hisobot — har bir xodim qaysi loyiha(lar)da ishlayotgani bilan.
    const memberStats = team.map(m=>{
      const mine = tasks.filter(t=>t.assignee===m.id)
      const active = mine.filter(t=>t.status!=='done').length
      const done = mine.filter(t=>t.status==='done').length
      const late = mine.filter(t=>isOverdue(t.dueDate,t.status)).length
      const pct = mine.length ? Math.round(done/mine.length*100) : 0
      const projNames = [...new Set(mine.map(t=>t.projectId).filter(Boolean))]
        .map(pid=>{ const p = projects.find(x=>x.id===pid); return p ? p.name : null }).filter(Boolean)
      return { m, total:mine.length, active, done, late, pct, projNames }
    }).sort((a,b)=> b.total-a.total)

    // Xodimlar davomati — namuna (demo) statistika, joriy oy, bugungacha.
    const now2 = new Date()
    const y2 = now2.getFullYear(), mo2 = now2.getMonth(), todayD = now2.getDate()
    const workDays = []
    for(let d=1; d<=todayD; d++){ if(new Date(y2,mo2,d).getDay()!==0) workDays.push(d) }
    const usingDemoAtt = team.length < 4
    const attMembers = usingDemoAtt ? DEMO_ATT_FALLBACK : team
    const perMember = attMembers.map(m=>{
      let present=0, late=0, absent=0
      workDays.forEach(d=>{
        const st = attStatus(m.id, y2, mo2, d)
        if(st==='present') present++; else if(st==='late') late++; else if(st==='absent') absent++
      })
      return { m, present, late, absent }
    })
    const attTotalSlots = perMember.length * workDays.length
    const attPresent = perMember.reduce((a,x)=>a+x.present,0)
    const attLate = perMember.reduce((a,x)=>a+x.late,0)
    const attAbsent = perMember.reduce((a,x)=>a+x.absent,0)
    const onTimePct = attTotalSlots ? Math.round(attPresent/attTotalSlots*100) : 0
    const lateBoard = [...perMember].filter(x=>x.late>0).sort((a,b)=>b.late-a.late).slice(0,3)
    const absentBoard = [...perMember].filter(x=>x.absent>0).sort((a,b)=>b.absent-a.absent).slice(0,3)
    const onTimeBoard = [...perMember].sort((a,b)=>b.present-a.present).slice(0,3)
    // Har kun bo'yicha jami (grafik uchun) — oxirgi 14 ish/dam kuni
    const last14 = []
    for(let i=13;i>=0;i--){
      const dd = new Date(y2,mo2,todayD-i)
      if(dd.getMonth()!==mo2 || dd.getDate()<1) continue
      const dow = dd.getDay()
      let p=0,l=0,a=0
      if(dow!==0 && perMember.length){
        perMember.forEach(x=>{
          const st = attStatus(x.m.id, dd.getFullYear(), dd.getMonth(), dd.getDate())
          if(st==='present') p++; else if(st==='late') l++; else if(st==='absent') a++
        })
      }
      last14.push({ label: `${dd.getDate()}`, p, l, a })
    }
    const maxAtt = Math.max(1, perMember.length, ...last14.map(x=>Math.max(x.p,x.l,x.a)))
    function sparkPath(vals, max, w, h){
      if(vals.length<2) return ''
      const step = w/(vals.length-1)
      return vals.map((v,i)=> `${i===0?'M':'L'}${(i*step).toFixed(1)},${(h-(v/max*h)).toFixed(1)}`).join(' ')
    }
    const chartW = 640, chartH = 140
    const pPath = sparkPath(last14.map(x=>x.p), maxAtt, chartW, chartH)
    const lPath = sparkPath(last14.map(x=>x.l), maxAtt, chartW, chartH)
    const aPath = sparkPath(last14.map(x=>x.a), maxAtt, chartW, chartH)
    // Loyihalar bo'yicha intizom — har bir haqiqiy loyiha uchun namuna foiz.
    const projDiscipline = activeProjects.map(p=>{
      const pct = 60 + (hashStr(p.id)%36)
      return { p, pct }
    })

    root.innerHTML = `
      <div>
        <div class="dash-head">
          <h2>Boshqaruv paneli</h2>
          <div style="margin-left:auto" id="td-notif"></div>
        </div>

        <div class="big-banner">
          <div class="bb-head">📊 Faoliyat boshlanganidan beri umumiy statistika</div>
          <div class="bb-grid">
            <div class="bb-tile"><b>${projects.length}</b><span>Jami loyihalar</span></div>
            <div class="bb-tile"><b>${activeProjects.length}</b><span>Faol loyihalar</span></div>
            <div class="bb-tile"><b>${archivedCount}</b><span>Arxivlangan loyihalar</span></div>
            <div class="bb-tile"><b>${tasks.length}</b><span>Jami vazifalar</span></div>
            <div class="bb-tile"><b>${doneCount}</b><span>Bajarilgan vazifalar</span></div>
          </div>
        </div>

        <div class="sec-lbl">Umumiy taqsimot</div>
        <div class="big-donuts">
          <div class="big-donut-card">
            <h4><span class="bd-icon" style="background:var(--soft);color:var(--b7)">📁</span>Loyihalar holati</h4>
            <div class="bd-row">
              <div class="bd-ring" style="background:${projDonutBg}"><div class="bd-hole"><b>${projects.length}</b><span>jami</span></div></div>
              <div class="bd-list">
                <div class="bd-item" style="background:var(--soft)"><span class="bd-lbl"><span class="bd-dot" style="background:var(--b)"></span>Faol</span><b>${activeProjects.length}</b></div>
                <div class="bd-item" style="background:#F2F5F6"><span class="bd-lbl"><span class="bd-dot" style="background:#DCE6E9"></span>Arxivlangan</span><b>${archivedCount}</b></div>
              </div>
            </div>
          </div>
          <div class="big-donut-card">
            <h4><span class="bd-icon" style="background:var(--soft);color:var(--b7)">✅</span>Vazifalar holati</h4>
            <div class="bd-row">
              <div class="bd-ring" style="background:${donutBg}"><div class="bd-hole"><b>${tasks.length}</b><span>jami</span></div></div>
              <div class="bd-list">
                ${statusCounts.map(s=>`
                  <div class="bd-item" style="background:${s.color}14">
                    <span class="bd-lbl"><span class="bd-dot" style="background:${s.color}"></span>${escapeHtml(s.label)}</span><b>${s.n}</b>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="big-bar-card">
          <h4>Loyihalar bo'yicha vazifalar</h4>
          <div style="color:var(--mut);font:700 12px system-ui,sans-serif;margin-bottom:6px">Har bir faol loyihada nechta vazifa borligi</div>
          ${allProjBars.length===0 ? `<div class="empty" style="padding:24px;margin-top:10px">Hali loyiha yo'q.</div>` : `
          <div class="big-bar-chart">
            ${allProjBars.map(({p,count})=>`
              <div class="bc-col">
                <b>${count}</b>
                <div class="bc-bar" style="height:${Math.max(4, Math.round(count/maxProjBar*150))}px;background:${p.color}"></div>
                <div class="bc-label">${escapeHtml(p.icon)} ${escapeHtml(p.name)}</div>
              </div>
            `).join('')}
          </div>`}
        </div>

        <div class="kpi-grid lg" style="margin-top:16px">
          <div class="stat-tile"><b>${activeProjects.length}</b><span>Faol loyihalar</span></div>
          <div class="stat-tile"><b style="color:var(--b)">${open.length}</b><span>Ochiq vazifalar</span></div>
          <div class="stat-tile"><b style="color:var(--amber)">${dueToday}</b><span>Bugun muddati</span></div>
          <div class="stat-tile"><b style="color:var(--red)">${overdueCount}</b><span>Muddati o'tgan</span></div>
          <div class="stat-tile"><b style="color:var(--green)">${donePct}%</b><span>Bajarilgan</span></div>
        </div>

        ${overdueCount>0 ? `
        <div class="widget" style="margin-top:22px;border-color:#F3D4CE">
          <h4 style="color:var(--red)">Muddati o'tgan vazifalar <span class="count" style="color:var(--red)">${overdueCount} ta</span></h4>
          <div id="td-overdue">
            ${overdueTasks.slice(0,10).map(t=>{
              const proj = projects.find(pr=>pr.id===t.projectId)
              const assigneeName = (team.find(x=>x.id===t.assignee)||{}).name
              return `
              <div class="dl-item" style="cursor:pointer" data-task="${t.id}">
                <span class="pri-pill ${t.priority}" style="flex:0 0 auto">${t.priority==='high'?'Yuqori':t.priority==='low'?'Past':"O'rta"}</span>
                <span>${escapeHtml(t.title)}${proj?' · '+escapeHtml(proj.name):''}${assigneeName?' · '+escapeHtml(assigneeName):''}</span>
                <b style="color:var(--red);font-size:12px;white-space:nowrap">${daysLate(t.dueDate)} kun kechikdi</b>
              </div>`
            }).join('')}
            ${overdueTasks.length>10 ? `<div style="margin-top:8px;color:var(--mut);font:700 12px system-ui,sans-serif">va yana ${overdueTasks.length-10} ta…</div>` : ''}
          </div>
        </div>` : ''}

        <div class="sec-lbl">Vazifalar</div>
        <div class="dash-widgets-even">
          <div class="widget">
            <h4>Muhimlik bo'yicha (ochiq vazifalar)</h4>
            ${priorityCounts.map(p=>`
              <div class="bar-row">
                <span>${escapeHtml(p.label)}</span>
                <div class="bar-track"><span class="bar-fill" style="width:${(p.n/maxPri*100)}%;background:${priColor[p.key]}"></span></div>
                <b>${p.n}</b>
              </div>
            `).join('')}
          </div>

          <div class="widget">
            <h4>Yaqinlashayotgan muddatlar (7 kun)</h4>
            ${upcoming.length===0 ? `<div style="color:var(--mut);font:700 12.5px system-ui,sans-serif">Yaqin muddatli vazifa yo'q.</div>` : ''}
            <div id="td-upcoming">
              ${upcoming.map(t=>{
                const proj = projects.find(pr=>pr.id===t.projectId)
                return `
                <div class="dl-item" style="cursor:pointer" data-task="${t.id}">
                  <span class="pri-pill ${t.priority}" style="flex:0 0 auto">${t.priority==='high'?'Yuqori':t.priority==='low'?'Past':"O'rta"}</span>
                  <span>${escapeHtml(t.title)}${proj?' · '+escapeHtml(proj.name):''}</span>
                  <b style="color:${isOverdue(t.dueDate,t.status)?'var(--red)':'var(--ink)'};font-size:12px">${fmtDate(t.dueDate)}${t.dueTime?' · '+escapeHtml(t.dueTime):''}</b>
                </div>`
              }).join('')}
            </div>
          </div>
        </div>

        <div class="sec-lbl">Xodimlar davomati</div>
        <div class="kpi-grid">
          <div class="stat-tile"><b>${workDays.length}</b><span>Ish kuni</span></div>
          <div class="stat-tile"><b style="color:var(--green)">${attTotalSlots?onTimePct+'%':'—'}</b><span>O'z vaqtida kelish</span></div>
          <div class="stat-tile"><b style="color:var(--amber)">${attLate}</b><span>Kechikish holati</span></div>
          <div class="stat-tile"><b style="color:var(--red)">${attAbsent}</b><span>Kelmagan kun</span></div>
        </div>

        <div class="big-line-card">
          <h4 style="margin-bottom:2px">Davomat dinamikasi</h4>
          <div style="color:var(--mut);font:700 12px system-ui,sans-serif;margin-bottom:14px">Oxirgi kunlar — kelgan · kech qolgan · kelmagan xodimlar soni</div>
          ${last14.length>=2 && perMember.length>0 ? `
          <svg viewBox="0 0 ${chartW} ${chartH}" style="width:100%;height:230px;overflow:visible">
            <defs>
              <linearGradient id="td-att-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style="stop-color:var(--green);stop-opacity:.32"/>
                <stop offset="100%" style="stop-color:var(--green);stop-opacity:0"/>
              </linearGradient>
            </defs>
            <path d="${pPath} L${chartW},${chartH} L0,${chartH} Z" fill="url(#td-att-fill)" stroke="none"/>
            <path d="${pPath}" fill="none" stroke="var(--green)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
            <path d="${lPath}" fill="none" stroke="var(--amber)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
            <path d="${aPath}" fill="none" stroke="var(--red)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          </svg>
          <div style="display:flex;justify-content:space-between;font:700 10.5px system-ui,sans-serif;color:var(--mut);margin-top:6px">
            ${last14.map(x=>`<span>${escapeHtml(x.label)}</span>`).join('')}
          </div>
          <div style="display:flex;gap:16px;margin-top:12px;font:700 11.5px system-ui,sans-serif;color:var(--mut)">
            <span><i class="tb-dot" style="background:var(--green);display:inline-block;margin-right:5px"></i>Kelgan</span>
            <span><i class="tb-dot" style="background:var(--amber);display:inline-block;margin-right:5px"></i>Kech qolgan</span>
            <span><i class="tb-dot" style="background:var(--red);display:inline-block;margin-right:5px"></i>Ishga kelmaslik</span>
          </div>
          ` : `<div class="dv-chart-empty">Ma'lumot yo'q — davomat tizimi ulanganda shu yerda grafik chiqadi.</div>`}
        </div>

        <div class="dash-widgets-even" style="margin-top:16px">
          <div class="widget">
            <h4>Loyihalar bo'yicha intizom</h4>
            <div style="color:var(--mut);font:700 12px system-ui,sans-serif;margin-bottom:12px">O'z vaqtida kelish ulushi</div>
            ${projDiscipline.length===0 ? `<div style="color:var(--mut);font:700 12.5px system-ui,sans-serif">Hali loyiha yo'q.</div>` : projDiscipline.map(({p,pct})=>`
              <div class="bar-row">
                <span style="width:140px">${escapeHtml(p.icon)} ${escapeHtml(p.name)}</span>
                <div class="bar-track"><span class="bar-fill" style="width:${pct}%;background:${pct>=80?'var(--green)':pct>=65?'var(--amber)':'var(--red)'}"></span></div>
                <b>${pct}%</b>
              </div>
            `).join('')}
          </div>
          <div class="widget">
            <h4>Filiallar bo'yicha intizom</h4>
            <div class="empty" style="padding:24px">Filiallar tizimi hali qo'shilmagan.</div>
          </div>
        </div>

        <div class="dash-widgets-3" style="margin-top:16px">
          <div class="widget">
            <h4>Kech qolish reytingi</h4>
            ${lateBoard.length===0 ? `<div class="empty" style="padding:22px">Ma'lumot yo'q.</div>` : lateBoard.map(x=>`
              <div class="dl-item">
                <span class="prof-av" style="flex:0 0 auto">${escapeHtml(initials(x.m.name))}</span>
                <span>${escapeHtml(x.m.name)}<br><small style="color:var(--mut);font-weight:700">${x.m.position?escapeHtml(x.m.position):(x.m.role==='admin'?'Admin':'Xodim')}</small></span>
                <b style="color:var(--amber);font-size:12px;white-space:nowrap">${x.late} marta</b>
              </div>
            `).join('')}
          </div>
          <div class="widget">
            <h4>Ishga kelmaslik</h4>
            ${absentBoard.length===0 ? `<div class="empty" style="padding:22px">Ma'lumot yo'q.</div>` : absentBoard.map(x=>`
              <div class="dl-item">
                <span class="prof-av" style="flex:0 0 auto">${escapeHtml(initials(x.m.name))}</span>
                <span>${escapeHtml(x.m.name)}<br><small style="color:var(--mut);font-weight:700">${x.m.position?escapeHtml(x.m.position):(x.m.role==='admin'?'Admin':'Xodim')}</small></span>
                <b style="color:var(--red);font-size:12px;white-space:nowrap">${x.absent} marta</b>
              </div>
            `).join('')}
          </div>
          <div class="widget">
            <h4>O'z vaqtida kelish</h4>
            ${onTimeBoard.length===0 ? `<div class="empty" style="padding:22px">Ma'lumot yo'q.</div>` : onTimeBoard.map(x=>`
              <div class="dl-item">
                <span class="prof-av" style="flex:0 0 auto">${escapeHtml(initials(x.m.name))}</span>
                <span>${escapeHtml(x.m.name)}<br><small style="color:var(--mut);font-weight:700">${x.m.position?escapeHtml(x.m.position):(x.m.role==='admin'?'Admin':'Xodim')}</small></span>
                <b style="color:var(--green);font-size:12px;white-space:nowrap">${x.present} marta</b>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="hint" style="margin-top:10px">Yuqoridagi "Xodimlar davomati" bo'limi — davomat tizimi ulanmaguncha ko'rsatiladigan namuna (demo) qiymatlar (Tabel bo'limi bilan bir xil).${usingDemoAtt ? ' Xodim ismlari ham hozircha NAMUNA — hali yetarli real xodim yo\'q; Xodimlar bo\'limiga real xodim qo\'shilishi bilan bu yerda ular avtomatik ko\'rinadi.' : ''} Tafsilotlar uchun: <b>Tabel</b> bo'limi.</div>

        <div class="sec-lbl">Xodimlar bo'yicha hisobot</div>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr><th>Xodim</th><th>Rol</th><th>Loyiha</th><th>Jami vazifa</th><th>Faol</th><th>Bajarilgan</th><th>Kechikkan</th><th>Bajarish %</th></tr></thead>
            <tbody>
              ${memberStats.map(({m,total,active,done,late,pct,projNames})=>`
                <tr>
                  <td class="t-firm">${escapeHtml(m.name)}</td>
                  <td>${m.role==='admin'?'Admin':'Xodim'}</td>
                  <td>${projNames.length===0 ? `<span style="color:var(--mut)">—</span>` : projNames.length===1 ? escapeHtml(projNames[0]) : `${escapeHtml(projNames[0])} <span style="color:var(--mut)">+${projNames.length-1}</span>`}</td>
                  <td>${total}</td>
                  <td>${active}</td>
                  <td>${done}</td>
                  <td style="${late>0?'color:var(--red);font-weight:800':''}">${late}</td>
                  <td>${pct}%</td>
                </tr>`
              ).join('')}
              ${memberStats.length===0 ? `<tr><td colspan="8" style="text-align:center;color:var(--mut)">Jamoa a'zosi yo'q</td></tr>` : ''}
            </tbody>
          </table>
        </div>

        <div id="td-modal-slot"></div>
      </div>
    `

    mountNotifBell(qs('#td-notif', root), { onOpenTaskId: openTaskById })
    const upcomingEl = qs('#td-upcoming', root)
    if(upcomingEl){
      upcomingEl.addEventListener('click', e=>{
        const row = e.target.closest('[data-task]'); if(!row) return
        const t = tasks.find(x=>x.id===row.dataset.task); if(t) openTask(t)
      })
    }
    const overdueEl = qs('#td-overdue', root)
    if(overdueEl){
      overdueEl.addEventListener('click', e=>{
        const row = e.target.closest('[data-task]'); if(!row) return
        const t = tasks.find(x=>x.id===row.dataset.task); if(t) openTask(t)
      })
    }
  }

  function openTask(t){
    const slot = qs('#td-modal-slot', root)
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
