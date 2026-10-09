import { api, getSub } from './api.js'
import { qs, qsa, on, escapeHtml } from './core.js'
import { STATUS_LIST, PRIORITY_LIST, initials, fmtDate } from './tasksShared.js'

const IC_BELL = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`
const IC_TRASH = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>`

// TasksNotifBell.jsx'ning vanilla JS ko'chirmasi. `container` ichiga bildirish-
// noma qo'ng'irog'ini chizadi (mustaqil — o'zi bildirishnomalarni yuklaydi).
// Bosilganda vazifaga tegishli bo'lsa `onOpenTaskId(taskId)` chaqiriladi.
export function mountNotifBell(container, { onOpenTaskId }){
  let notifs = []
  let open = false

  async function reload(){ try{ notifs = await api.notifsList() }catch(e){} render() }

  function render(){
    const unread = notifs.filter(n=>!n.read).length
    container.innerHTML = `
      <div class="tv-notif-wrap">
        <button class="tw-icon" id="tnb-toggle">${IC_BELL}${unread>0 ? `<span class="tw-badge">${unread>99?'99+':unread}</span>` : ''}</button>
        ${open ? `
          <div class="menu-back" id="tnb-back"></div>
          <div class="tv-notif-panel">
            ${notifs.length===0 ? `<div class="tv-notif-empty">Bildirishnoma yo'q</div>` : ''}
            ${notifs.length>0 ? `<div style="display:flex;justify-content:flex-end;padding:4px 6px"><button class="lnk" id="tnb-read-all">Barchasini o'qilgan deb belgilash</button></div>` : ''}
            ${notifs.map(n=>`
              <div class="tv-notif-item${n.read?'':' unread'}" data-id="${n.id}">
                <b>${escapeHtml(n.text)}</b>
                <small>${escapeHtml(new Date(n.createdAt).toLocaleString('uz-UZ'))}</small>
              </div>
            `).join('')}
          </div>` : ''}
      </div>
    `
    qs('#tnb-toggle', container).addEventListener('click', ()=>{ open = !open; render() })
    const back = qs('#tnb-back', container); if(back) back.addEventListener('click', ()=>{ open = false; render() })
    const readAllBtn = qs('#tnb-read-all', container)
    if(readAllBtn) readAllBtn.addEventListener('click', async ()=>{ try{ await api.notifsReadAll(); await reload() }catch(e){} })
    on(container, 'click', '.tv-notif-item', async (e,node)=>{
      const n = notifs.find(x=>x.id===node.dataset.id)
      if(!n) return
      if(!n.read){ try{ await api.notifRead(n.id); await reload() }catch(e){} }
      open = false; render()
      if(n.meta && n.meta.taskId && onOpenTaskId) onOpenTaskId(n.meta.taskId)
    })
  }

  reload()
  return function cleanup(){}
}

// TaskModal.jsx'ning vanilla JS ko'chirmasi — vazifa yaratish/tahrirlash/
// ko'rish oynasi. `container` — modal joylashadigan bo'sh element.
// `task`=null bo'lsa yangi vazifa (checklist/izoh/tarix hali yashirin).
export function openTaskModal(container, { task, projectId, projects, team, clients, labels: labelsIn, me, onClose, onSaved, onDeleted, toast, reloadLabels }){
  let labels = labelsIn
  const editing = !!(task && task.id)
  const st = {
    title: task ? task.title : '',
    desc: task ? (task.desc||'') : '',
    pid: task ? task.projectId : (projectId || (projects[0] && projects[0].id) || ''),
    clientId: task ? (task.clientId||'') : '',
    status: task ? task.status : 'todo',
    priority: task ? task.priority : 'medium',
    assignee: task ? (task.assignee||'') : (me || (getSub()!=='owner' ? getSub() : '')),
    dueDate: task ? (task.dueDate||'') : '',
    dueTime: task ? (task.dueTime||'') : '',
    selLabels: task ? (task.labels||[]).slice() : [],
    saving: false, err: '',
    checklist: (task && task.checklist) ? task.checklist.slice() : [],
    comments: (task && task.comments) ? task.comments.slice() : [],
    newChk: '', newCmt: '',
  }

  function render(){
    const done = st.checklist.filter(c=>c.done).length
    container.innerHTML = `
      <div class="modal-bg" id="tm-bg">
        <div class="modal" style="max-width:640px">
          <div class="form-col">
            <h3>${editing ? 'Vazifani tahrirlash' : 'Yangi vazifa'}</h3>
            ${st.err ? `<div class="err-box">${escapeHtml(st.err)}</div>` : ''}

            <label>Kompaniya</label>
            <select name="clientId" style="width:100%;border:1.5px solid var(--line);border-radius:11px;padding:11px 12px;font:inherit">
              <option value="">— Tanlanmagan —</option>
              ${(clients||[]).map(c=>`<option value="${c.id}" ${st.clientId===c.id?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>

            <label>Sarlavha <span class="req">*</span></label>
            <input name="title" value="${escapeHtml(st.title)}" placeholder="Vazifa nomi" />

            <label>Tavsif</label>
            <textarea name="desc" placeholder="Qo'shimcha tafsilotlar…" style="width:100%;min-height:70px;border:1.5px solid var(--line);border-radius:11px;padding:11px 12px;font:inherit;resize:vertical">${escapeHtml(st.desc)}</textarea>

            <div class="two">
              <div>
                <label>Loyiha <span class="req">*</span></label>
                <select name="pid" ${(projectId && !editing) ? 'disabled' : ''} style="width:100%;border:1.5px solid var(--line);border-radius:11px;padding:11px 12px;font:inherit">
                  ${projects.map(p=>`<option value="${p.id}" ${st.pid===p.id?'selected':''}>${escapeHtml(p.icon)} ${escapeHtml(p.name)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label>Holat</label>
                <select name="status" style="width:100%;border:1.5px solid var(--line);border-radius:11px;padding:11px 12px;font:inherit">
                  ${STATUS_LIST.map(s=>`<option value="${s.key}" ${st.status===s.key?'selected':''}>${escapeHtml(s.label)}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="two">
              <div>
                <label>Muhimlik</label>
                <select name="priority" style="width:100%;border:1.5px solid var(--line);border-radius:11px;padding:11px 12px;font:inherit">
                  ${PRIORITY_LIST.map(p=>`<option value="${p.key}" ${st.priority===p.key?'selected':''}>${escapeHtml(p.label)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label>Muddat</label>
                <div style="display:flex;gap:8px">
                  <input type="date" name="dueDate" value="${escapeHtml(st.dueDate)}" style="flex:1 1 auto;min-width:0;border:1.5px solid var(--line);border-radius:11px;padding:11px 12px;font:inherit;box-sizing:border-box" />
                  <input type="time" name="dueTime" value="${escapeHtml(st.dueTime)}" title="Soat" style="flex:0 0 100px;border:1.5px solid var(--line);border-radius:11px;padding:11px 8px;font:inherit;box-sizing:border-box" />
                </div>
              </div>
            </div>

            <label>Ijrochi</label>
            <select name="assignee" style="width:100%;border:1.5px solid var(--line);border-radius:11px;padding:11px 12px;font:inherit">
              <option value="">— Tanlanmagan —</option>
              ${team.map(t=>`<option value="${t.id}" ${st.assignee===t.id?'selected':''}>${escapeHtml(t.name)}${t.position?' · '+escapeHtml(t.position):''}</option>`).join('')}
            </select>

            <label>Yorliqlar</label>
            <div class="label-picker" id="tm-labels">
              ${labels.map(l=>`<span class="label-opt${st.selLabels.includes(l.id)?' on':''}" data-label="${l.id}" style="color:${l.color};background:${l.color}1e">● ${escapeHtml(l.name)}</span>`).join('')}
              <span class="label-opt on" id="tm-quick-label" style="color:var(--b7);background:var(--soft)">+ Yangi</span>
            </div>

            ${editing ? `
              <div class="form-sec">Bajarish ro'yxati ${st.checklist.length>0 ? `(${done}/${st.checklist.length})` : ''}</div>
              <div id="tm-checklist">
                ${st.checklist.map(c=>`
                  <div class="chk-item${c.done?' done':''}" data-id="${c.id}">
                    <input type="checkbox" ${c.done?'checked':''} data-chk-toggle />
                    <span>${escapeHtml(c.text)}</span>
                    <button type="button" class="lnk danger" data-chk-remove style="font-size:11px">O'chirish</button>
                  </div>
                `).join('')}
              </div>
              <div class="chk-add">
                <input id="tm-new-chk" value="${escapeHtml(st.newChk)}" placeholder="Yangi band…" />
                <button type="button" class="btn small ghost" id="tm-add-chk">+ Qo'shish</button>
              </div>

              <div class="form-sec">Izohlar (${st.comments.length})</div>
              <div id="tm-comments">
                ${st.comments.map(c=>{
                  const author = (team.find(t=>t.id===c.author)||{}).name
                  return `
                  <div class="cmt-item">
                    <div class="cmt-av">${escapeHtml(initials(author || '?'))}</div>
                    <div class="cmt-body">
                      <b>${escapeHtml(author || "Noma'lum")}</b>
                      <small>${escapeHtml(new Date(c.at).toLocaleString('uz-UZ'))}</small>
                      <p>${escapeHtml(c.text)}</p>
                    </div>
                  </div>`
                }).join('')}
              </div>
              <div class="chk-add">
                <input id="tm-new-cmt" value="${escapeHtml(st.newCmt)}" placeholder="Izoh yozing…" />
                <button type="button" class="btn small ghost" id="tm-add-cmt">Yuborish</button>
              </div>

              ${(task.history && task.history.length>0) ? `
                <div class="form-sec">Tarix</div>
                ${task.history.slice().reverse().map(h=>`
                  <div class="hist-item">
                    <span>${escapeHtml(new Date(h.at).toLocaleString('uz-UZ'))}</span>
                    <b>${escapeHtml(h.detail)}</b>
                  </div>
                `).join('')}
              ` : ''}
            ` : ''}

            <div class="modal-actions">
              ${editing ? `<button type="button" class="btn red" id="tm-remove" style="flex:0 0 auto" title="O'chirish">${IC_TRASH}</button>` : ''}
              <button type="button" class="btn ghost" id="tm-cancel">Bekor qilish</button>
              <button type="button" class="btn" id="tm-save" ${st.saving?'disabled':''}>${st.saving?'Saqlanmoqda…':'Saqlash'}</button>
            </div>
          </div>
        </div>
      </div>
    `
    wire()
  }

  function wire(){
    const bg = qs('#tm-bg', container)
    const modal = qs('.modal', container)
    bg.addEventListener('mousedown', e=>{ if(e.target===bg) onClose() })
    modal.addEventListener('mousedown', e=>e.stopPropagation())
    qs('#tm-cancel', container).addEventListener('click', onClose)
    const clientSel = modal.querySelector('[name="clientId"]')
    if(clientSel) clientSel.addEventListener('change', e=>{ st.clientId = e.target.value })
    modal.querySelector('[name="title"]').addEventListener('input', e=>{ st.title = e.target.value })
    modal.querySelector('[name="desc"]').addEventListener('input', e=>{ st.desc = e.target.value })
    modal.querySelector('[name="pid"]').addEventListener('change', e=>{ st.pid = e.target.value })
    modal.querySelector('[name="status"]').addEventListener('change', e=>{ st.status = e.target.value })
    modal.querySelector('[name="priority"]').addEventListener('change', e=>{ st.priority = e.target.value })
    modal.querySelector('[name="dueDate"]').addEventListener('change', e=>{ st.dueDate = e.target.value })
    modal.querySelector('[name="dueTime"]').addEventListener('change', e=>{ st.dueTime = e.target.value })
    modal.querySelector('[name="assignee"]').addEventListener('change', e=>{ st.assignee = e.target.value })
    on(qs('#tm-labels', container), 'click', '[data-label]', (e,node)=>{
      const id = node.dataset.label
      st.selLabels = st.selLabels.includes(id) ? st.selLabels.filter(x=>x!==id) : [...st.selLabels, id]
      render()
    })
    qs('#tm-quick-label', container).addEventListener('click', async ()=>{
      const name = prompt("Yangi yorliq nomi:")
      if(!name || !name.trim()) return
      try{
        const r = await api.labelCreate(name.trim(), '#2FA9BF')
        await reloadLabels()
        try{ labels = await api.labelsList() }catch(e){ labels = [...labels, r.label] }
        st.selLabels = [...st.selLabels, r.label.id]
        render()
      }catch(ex){ toast(ex.error||'Xatolik') }
    })

    if(editing){
      const chkList = qs('#tm-checklist', container)
      on(chkList, 'change', '[data-chk-toggle]', async (e,node)=>{
        const row = node.closest('[data-id]'); const cid = row.dataset.id
        try{ await api.checklistToggle(task.id, cid); st.checklist = st.checklist.map(c=>c.id===cid?{...c,done:!c.done}:c); render() }
        catch(ex){ toast(ex.error||'Xatolik') }
      })
      on(chkList, 'click', '[data-chk-remove]', async (e,node)=>{
        const row = node.closest('[data-id]'); const cid = row.dataset.id
        try{ await api.checklistRemove(task.id, cid); st.checklist = st.checklist.filter(c=>c.id!==cid); render() }
        catch(ex){ toast(ex.error||'Xatolik') }
      })
      const newChkInput = qs('#tm-new-chk', container)
      newChkInput.addEventListener('input', e=>{ st.newChk = e.target.value })
      newChkInput.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); addChecklist() } })
      qs('#tm-add-chk', container).addEventListener('click', addChecklist)

      const newCmtInput = qs('#tm-new-cmt', container)
      newCmtInput.addEventListener('input', e=>{ st.newCmt = e.target.value })
      newCmtInput.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); addComment() } })
      qs('#tm-add-cmt', container).addEventListener('click', addComment)

      qs('#tm-remove', container).addEventListener('click', removeTask)
    }
    qs('#tm-save', container).addEventListener('click', save)
  }

  async function addChecklist(){
    if(!st.newChk.trim()) return
    try{ const r = await api.checklistAdd(task.id, st.newChk.trim()); st.checklist.push(r.item); st.newChk = ''; render() }
    catch(ex){ toast(ex.error||'Xatolik') }
  }
  async function addComment(){
    if(!st.newCmt.trim()) return
    try{ const r = await api.commentAdd(task.id, st.newCmt.trim()); st.comments.push(r.comment); st.newCmt = ''; render() }
    catch(ex){ toast(ex.error||'Xatolik') }
  }
  async function removeTask(){
    if(!confirm(`"${task.title}" vazifasi o'chirilsinmi?`)) return
    try{ await api.taskRemove(task.id); onDeleted(task.id) }
    catch(ex){ toast(ex.error||'Xatolik') }
  }
  async function save(){
    st.err = ''
    if(!st.title.trim()){ st.err = 'Sarlavha kerak'; render(); return }
    if(!st.pid){ st.err = 'Loyihani tanlang'; render(); return }
    st.saving = true; render()
    const body = { title: st.title, desc: st.desc, projectId: st.pid, clientId: st.clientId, status: st.status, priority: st.priority, assignee: st.assignee, dueDate: st.dueDate, dueTime: st.dueTime, labels: st.selLabels }
    try{
      if(editing){ const r = await api.taskUpdate(task.id, body); onSaved(r.task, 'update') }
      else { const r = await api.taskCreate(body); onSaved(r.task, 'create') }
    }catch(ex){ st.err = ex.error || 'Xatolik saqlashda'; st.saving = false; render() }
  }

  render()
  return function cleanup(){}
}
