import { api, getSub } from '../api.js'
import { qs, qsa, on, escapeHtml } from '../core.js'
import { STATUS_LIST, PROJECT_ICONS, PROJECT_COLORS, initials, getProjectMembers, setProjectMembers } from '../tasksShared.js'
import { mountNotifBell } from '../tasksWidgets.js'
import { mountTasksAll } from './tasks-all.js'

const IC_DOTS = `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`
const IC_PERSON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>`

// ProjectsBoard.jsx'ning vanilla JS ko'chirmasi — Vazifalar → Loyihalar.
// Karta ko'rinishi + tanlangan loyiha uchun Kanban taxtasi (HTML5 native
// Drag and Drop API orqali sudrab-tashlash).
export function mountTasksProjects(root, { toast }){
  let projects = [], tasks = [], labels = [], team = [], clients = []
  let loaded = false
  const me = getSub()
  let openId = null
  let pendingOpenTaskId = null // notif bell orqali to'g'ridan-to'g'ri vazifa ochish uchun
  let showForm = null // null | 'new' | project
  let menuFor = null
  let membersFor = null // project id whose "a'zolar" dropdown is open
  let showArchived = false
  let subCleanup = null // ochilgan loyiha ichidagi mountTasksAll tozalash funksiyasi

  async function load(){
    const [p,t,l,tm,cl] = await Promise.all([
      api.projectsList().catch(()=>[]), api.tasksList().catch(()=>[]), api.labelsList().catch(()=>[]), api.team().catch(()=>[]), api.clientsList().catch(()=>[])
    ])
    projects = p; tasks = t; labels = l; team = tm; clients = cl; loaded = true
    render()
  }
  async function reloadProjects(){ try{ projects = await api.projectsList() }catch(e){} }
  async function reloadTasks(){ try{ tasks = await api.tasksList() }catch(e){} }
  async function reloadLabels(){ try{ labels = await api.labelsList() }catch(e){} }

  function tasksOf(pid){ return tasks.filter(t=>t.projectId===pid) }
  function progressOf(pid){
    const ts = tasksOf(pid)
    if(!ts.length) return 0
    return Math.round(ts.filter(t=>t.status==='done').length / ts.length * 100)
  }
  // Loyihaga qo'lda biriktirilgan hodimlar (localStorage) — hali hech kim
  // biriktirilmagan bo'lsa, o'sha loyihada vazifasi bor ijrochilarni ko'rsatamiz.
  function memberIdsOf(pid){
    const picked = getProjectMembers(pid)
    if(picked.length) return picked
    return [...new Set(tasksOf(pid).map(t=>t.assignee).filter(Boolean))]
  }

  function render(){
    if(subCleanup){ subCleanup(); subCleanup = null }
    if(!loaded){ root.innerHTML = `<div style="padding:40px;text-align:center;color:var(--mut)">Yuklanmoqda…</div>`; return }
    const openProject = projects.find(p=>p.id===openId)
    if(openProject){
      const tid = pendingOpenTaskId; pendingOpenTaskId = null
      subCleanup = mountTasksAll(root, {
        toast, projectId: openId, initialTaskId: tid,
        onBack(){ openId = null; render() },
      })
    } else {
      renderGrid()
    }
  }

  // ---------------- Loyihalar kartochkalari (grid) ----------------
  function renderGrid(){
    const visibleProjects = projects.filter(p => !!p.archived === showArchived)
    root.innerHTML = `
      <div>
        <div class="dash-head">
          <h2>Loyihalar</h2>
          <span class="count">${visibleProjects.length} ta</span>
          <div style="margin-left:auto;display:flex;gap:10px;align-items:center">
            <button class="fil-btn${showArchived?' on':''}" id="tp-toggle-archived">${showArchived?'Faol loyihalar':'Arxivlanganlar'}</button>
            <button class="btn small" id="tp-new">+ Yangi loyiha</button>
            <div id="tp-notif"></div>
          </div>
        </div>
        ${visibleProjects.length===0 ? `<div class="empty">${showArchived ? "Arxivlangan loyiha yo'q." : "Hali loyiha yo'q. \"+ Yangi loyiha\" bilan yarating."}</div>` : ''}
        <div class="proj-grid" id="tp-grid">
          ${visibleProjects.map(p=>{
            const pTasks = tasksOf(p.id)
            const memberIds = memberIdsOf(p.id)
            const members = memberIds.map(id=>team.find(t=>t.id===id)).filter(Boolean)
            const pickedIds = getProjectMembers(p.id)
            const MAX_AV = 4
            return `
            <div class="proj-card${p.archived?' archived':''}" data-id="${p.id}">
              <div class="pc-top">
                <span class="pc-icon" style="background:${p.color}1e;color:${p.color}">${escapeHtml(p.icon)}</span>
                <span class="pc-name">${escapeHtml(p.name)}</span>
                <div style="position:relative" data-members-wrap>
                  <button class="pc-icon-btn${membersFor===p.id?' on':''}" data-members-btn title="Loyiha a'zolari">${IC_PERSON}</button>
                  ${membersFor===p.id ? `
                    <div class="menu-back" data-members-back></div>
                    <div class="row-menu">
                      <div style="padding:4px 8px 8px;font:800 11px system-ui,sans-serif;color:var(--mut);text-transform:uppercase;letter-spacing:.03em">Loyiha a'zolari</div>
                      ${team.map(m=>`
                        <label class="pc-member-row">
                          <input type="checkbox" data-member-toggle="${m.id}" ${pickedIds.includes(m.id)?'checked':''} />
                          <span class="pc-member-av">${escapeHtml(initials(m.name))}</span>
                          <span>${escapeHtml(m.name)}</span>
                        </label>
                      `).join('')}
                      ${team.length===0 ? `<div style="padding:10px 12px;color:var(--mut);font:700 12.5px system-ui,sans-serif">Hodim yo'q</div>` : ''}
                    </div>` : ''}
                </div>
                <div style="position:relative" data-menu-wrap>
                  <button class="pc-menu-btn" data-menu>${IC_DOTS}</button>
                  ${menuFor===p.id ? `
                    <div class="menu-back" data-menu-back></div>
                    <div class="row-menu">
                      <button data-menu-edit>Tahrirlash</button>
                      <button data-menu-dup>Nusxalash</button>
                      <button data-menu-archive>${p.archived?'Arxivdan chiqarish':'Arxivlash'}</button>
                      <div class="row-menu-sep"></div>
                      <button class="danger" data-menu-remove>O'chirish</button>
                    </div>` : ''}
                </div>
              </div>
              ${p.desc ? `<div class="pc-desc">${escapeHtml(p.desc)}</div>` : ''}
              <div class="pc-status-row">
                ${STATUS_LIST.map(s=>{
                  const n = pTasks.filter(t=>t.status===s.key).length
                  return n>0 ? `<span class="pc-status-chip"><i style="background:${s.color}"></i>${n} ${escapeHtml(s.label)}</span>` : ''
                }).join('')}
                ${pTasks.length===0 ? `<span class="pc-status-chip" style="opacity:.7">Vazifa yo'q</span>` : ''}
              </div>
              <div class="pc-bar"><i style="width:${progressOf(p.id)}%;background:${p.color}"></i></div>
              <div class="pc-meta">
                <span>${pTasks.length} ta vazifa</span>
                ${members.length>0 ? `
                  <span class="pc-members">
                    ${members.slice(0,MAX_AV).map(m=>`<span class="pc-member-av" title="${escapeHtml(m.name)}">${escapeHtml(initials(m.name))}</span>`).join('')}
                    ${members.length>MAX_AV ? `<span class="pc-member-more">+${members.length-MAX_AV}</span>` : ''}
                  </span>` : `<span class="pc-members-empty">Hodim yo'q</span>`}
                <span>${progressOf(p.id)}%</span>
              </div>
            </div>
          `}).join('')}
        </div>
        <div id="tp-modal-slot"></div>
      </div>
    `
    mountNotifBell(qs('#tp-notif', root), { onOpenTaskId(id){ const t = tasks.find(x=>x.id===id); if(t){ openId = t.projectId; pendingOpenTaskId = id; render() } } })
    wireGrid(visibleProjects)
  }

  function wireGrid(visibleProjects){
    qs('#tp-toggle-archived', root).addEventListener('click', ()=>{ showArchived = !showArchived; render() })
    qs('#tp-new', root).addEventListener('click', ()=>{ showForm = 'new'; renderProjectForm() })

    const grid = qs('#tp-grid', root)
    on(grid, 'click', '.proj-card', (e,card)=>{
      if(e.target.closest('[data-menu-wrap]')) return
      if(e.target.closest('[data-members-wrap]')) return
      openId = card.dataset.id; render()
    })
    on(grid, 'click', '[data-members-btn]', (e,btn)=>{
      e.stopPropagation(); const card = btn.closest('.proj-card')
      membersFor = membersFor===card.dataset.id ? null : card.dataset.id
      menuFor = null; render()
    })
    on(grid, 'click', '[data-members-back]', (e)=>{ e.stopPropagation(); membersFor = null; render() })
    on(grid, 'click', '.pc-member-row', (e)=>{ e.stopPropagation() })
    on(grid, 'change', '[data-member-toggle]', (e,input)=>{
      e.stopPropagation()
      const card = input.closest('.proj-card'); const pid = card.dataset.id
      const mid = input.dataset.memberToggle
      let ids = getProjectMembers(pid)
      ids = ids.includes(mid) ? ids.filter(x=>x!==mid) : [...ids, mid]
      setProjectMembers(pid, ids)
      render()
    })
    on(grid, 'click', '[data-menu]', (e,btn)=>{ e.stopPropagation(); const card = btn.closest('.proj-card'); menuFor = menuFor===card.dataset.id ? null : card.dataset.id; render() })
    on(grid, 'click', '[data-menu-back]', (e)=>{ e.stopPropagation(); menuFor = null; render() })
    on(grid, 'click', '[data-menu-edit]', (e,btn)=>{ e.stopPropagation(); const card = btn.closest('.proj-card'); const p = visibleProjects.find(x=>x.id===card.dataset.id); menuFor = null; showForm = p; renderProjectForm() })
    on(grid, 'click', '[data-menu-dup]', async (e,btn)=>{
      e.stopPropagation(); const card = btn.closest('.proj-card'); const p = visibleProjects.find(x=>x.id===card.dataset.id)
      try{ await api.projectDuplicate(p.id); await reloadProjects(); await reloadTasks(); toast('Loyiha nusxalandi'); menuFor = null; render() }catch(ex){ toast(ex.error||'Xatolik') }
    })
    on(grid, 'click', '[data-menu-archive]', async (e,btn)=>{
      e.stopPropagation(); const card = btn.closest('.proj-card'); const p = visibleProjects.find(x=>x.id===card.dataset.id)
      try{ await api.projectArchive(p.id); await reloadProjects(); menuFor = null; render() }catch(ex){ toast(ex.error||'Xatolik') }
    })
    on(grid, 'click', '[data-menu-remove]', async (e,btn)=>{
      e.stopPropagation(); const card = btn.closest('.proj-card'); const p = visibleProjects.find(x=>x.id===card.dataset.id)
      if(!confirm(`"${p.name}" loyihasi va unga tegishli BARCHA vazifalar o'chirilsinmi?`)) return
      try{
        await api.projectRemove(p.id); await reloadProjects(); await reloadTasks(); toast("Loyiha o'chirildi")
        menuFor = null; if(openId===p.id) openId = null
        render()
      }catch(ex){ toast(ex.error||'Xatolik') }
    })
  }

  // ---------------- Loyiha yaratish/tahrirlash modali ----------------
  function renderProjectForm(){
    const project = showForm==='new' ? null : showForm
    const st = { name: project?project.name:'', desc: project?(project.desc||''):'', icon: project?project.icon:PROJECT_ICONS[0], color: project?project.color:PROJECT_COLORS[0], err:'', saving:false }
    const slot = qs('#tp-modal-slot', root)
    if(!slot) return

    function draw(){
      slot.innerHTML = `
        <div class="modal-bg" id="pf-bg">
          <div class="modal" style="max-width:480px">
            <div class="form-col">
              <h3>${project ? 'Loyihani tahrirlash' : 'Yangi loyiha'}</h3>
              ${st.err ? `<div class="err-box">${escapeHtml(st.err)}</div>` : ''}
              <label>Nomi <span class="req">*</span></label>
              <input name="name" value="${escapeHtml(st.name)}" placeholder="Loyiha nomi" />
              <label>Tavsif</label>
              <textarea name="desc" placeholder="Qisqacha tavsif…" style="width:100%;min-height:64px;border:1.5px solid var(--line);border-radius:11px;padding:11px 12px;font:inherit;resize:vertical">${escapeHtml(st.desc)}</textarea>
              <label>Ikonka</label>
              <div class="label-picker" id="pf-icons">
                ${PROJECT_ICONS.map(ic=>`<span class="label-opt${st.icon===ic?' on':''}" data-icon="${escapeHtml(ic)}" style="font-size:16px;color:var(--ink)">${escapeHtml(ic)}</span>`).join('')}
              </div>
              <label>Rang</label>
              <div class="label-picker" id="pf-colors">
                ${PROJECT_COLORS.map(c=>`<span class="label-opt${st.color===c?' on':''}" data-color="${c}" style="background:${c};width:26px;height:26px;border-radius:50%;padding:0"></span>`).join('')}
              </div>
              <div class="modal-actions">
                <button type="button" class="btn ghost" id="pf-cancel">Bekor qilish</button>
                <button type="button" class="btn" id="pf-save" ${st.saving?'disabled':''}>${st.saving?'Saqlanmoqda…':'Saqlash'}</button>
              </div>
            </div>
          </div>
        </div>
      `
      const bg = qs('#pf-bg', slot); const modal = qs('.modal', slot)
      bg.addEventListener('mousedown', e=>{ if(e.target===bg) closeForm() })
      modal.addEventListener('mousedown', e=>e.stopPropagation())
      qs('#pf-cancel', slot).addEventListener('click', closeForm)
      modal.querySelector('[name="name"]').addEventListener('input', e=>{ st.name = e.target.value })
      modal.querySelector('[name="desc"]').addEventListener('input', e=>{ st.desc = e.target.value })
      on(qs('#pf-icons', slot), 'click', '[data-icon]', (e,node)=>{ st.icon = node.dataset.icon; draw() })
      on(qs('#pf-colors', slot), 'click', '[data-color]', (e,node)=>{ st.color = node.dataset.color; draw() })
      qs('#pf-save', slot).addEventListener('click', saveForm)
    }
    function closeForm(){ showForm = null; slot.innerHTML = '' }
    async function saveForm(){
      st.err = ''
      if(!st.name.trim()){ st.err = 'Loyiha nomi kerak'; draw(); return }
      st.saving = true; draw()
      try{
        if(project) await api.projectUpdate(project.id, { name:st.name, desc:st.desc, icon:st.icon, color:st.color })
        else await api.projectCreate({ name:st.name, desc:st.desc, icon:st.icon, color:st.color })
        showForm = null; slot.innerHTML = ''
        await reloadProjects(); render()
      }catch(ex){ st.err = ex.error || 'Xatolik'; st.saving = false; draw() }
    }
    draw()
  }

  load()
  return function cleanup(){ if(subCleanup) subCleanup() }
}
