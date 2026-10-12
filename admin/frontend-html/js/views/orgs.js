import { api, DOMAIN, tenantHost, tenantUrl } from '../api.js'
import { UZ_REGIONS, REGION_NAMES, ALL_DISTRICTS, REGION_COORDS, yandexSearchUrl } from '../uzregions.js'
import { STATUSES, statusOf } from '../statuses.js'
import { fmtSum } from '../products.js'
import { qs, qsa, on, escapeHtml, toast as coreToast } from '../core.js'
import { smartLogoEl } from '../widgets.js'
import { openOrgForm } from './org-form.js'

const IC_SEARCH = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`
const PIN = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`
const PHONE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`

function fmtVisitDate(ts){
  try{ const d = new Date(ts); const p=n=>String(n).padStart(2,'0'); return p(d.getDate())+'.'+p(d.getMonth()+1)+'.'+d.getFullYear()+' '+p(d.getHours())+':'+p(d.getMinutes()) }
  catch(e){ return '' }
}

// Dashboard.jsx'ning "Prezintatsiya/Tashkilotlar" bo'limining vanilla JS
// ko'chirmasi: filtrlar, statistika, karta ro'yxati, O'chirilganlar arxivi.
export function mountOrgs(root, { toast }){
  let orgs = null, err = ''
  let fRegion = '', fDistrict = '', fVisited = 'all', fStatus = '', q = ''
  let showTrash = false, page = 1, pageSize = 10
  let modalCleanup = null

  async function load(){ try{ orgs = await api.list(); err = '' }catch(ex){ if(ex.status===401){} else err = ex.error } render() }

  function computeShown(){
    const active = (orgs||[]).filter(o=>!o.deleted)
    const ql = q.trim().toLowerCase()
    const shown = active.filter(o=>
      (!fRegion || o.region===fRegion) &&
      (!fDistrict || o.district===fDistrict) &&
      (fVisited==='all' || (fVisited==='yes' ? !!o.visited : !o.visited)) &&
      (!fStatus || (o.status||'new')===fStatus) &&
      (!ql || (o.name||'').toLowerCase().includes(ql) || (o.subdomain||'').toLowerCase().includes(ql) || (o.contact||'').toLowerCase().includes(ql))
    )
    return { active, shown }
  }

  function exportCSV(active){
    const rows = [['Nomi','Subdomen','Holat','Viloyat','Tuman','Telefon','Kontakt','Mahsulotlar','Summa','Borilgan','Faol','Manzil']]
    active.forEach(o => rows.push([o.name, tenantHost(o.subdomain), statusOf(o).label, o.region||'', o.district||'', o.phone||'', o.contact||'', (o.dealItems||[]).join('; '), o.dealAmount||0, o.visited?'Ha':'Yoq', o.enabled?'Ha':'Yoq', o.mapUrl||'']))
    const csv = '﻿' + rows.map(r => r.map(c => '"'+String(c==null?'':c).replace(/"/g,'""')+'"').join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'tashkilotlar.csv'; a.click(); URL.revokeObjectURL(url)
  }

  function render(){
    if(modalCleanup){ modalCleanup(); modalCleanup = null }
    const { active, shown } = computeShown()
    const stats = {
      total: active.length,
      faol: active.filter(o=>o.enabled).length,
      borilgan: active.filter(o=>o.visited).length,
      summa: active.reduce((s,o)=>s+(Number(o.dealAmount)||0),0),
      byStatus: STATUSES.map(s => ({ ...s, n: active.filter(o => (o.status||'new')===s.key).length }))
    }
    const deletedOrgs = (orgs||[]).filter(o=>o.deleted)
    const pageCount = Math.max(1, Math.ceil(shown.length / pageSize))
    if(page>pageCount) page = pageCount
    const pageItems = shown.slice((page-1)*pageSize, page*pageSize)

    root.innerHTML = `
      <div class="dash-head">
        <div><h2>Tashkilotlar</h2><div style="font:600 13px system-ui,sans-serif;color:var(--mut);margin-top:2px">Mijoz-tashkilotlar, dostuplar va ular bilan ish holati</div></div>
        <span class="count">${orgs ? shown.length : '…'}${(shown.length!==active.length && orgs) ? ` / ${active.length}` : ''} ta</span>
        <div style="margin-left:auto;display:flex;gap:10px">
          <button class="btn small ghost" id="org-export">⬇ Excel</button>
          <button class="btn small" id="org-new">+ Yangi tashkilot</button>
        </div>
      </div>
      ${orgs ? `<div class="kpi-grid">
        <div class="stat-tile"><b>${stats.total}</b><span>Jami tashkilot</span></div>
        <div class="stat-tile"><b style="color:var(--green)">${stats.faol}</b><span>Yoqilgan</span></div>
        <div class="stat-tile"><b style="color:#2E7DF6">${stats.borilgan}</b><span>Borilgan</span></div>
        <div class="stat-tile"><b style="font-size:18px;color:var(--green)">${fmtSum(stats.summa)}</b><span>Jami summa (so'm)</span></div>
      </div>` : ''}
      <div class="seg" style="margin:0 0 14px;flex-wrap:wrap" id="status-tabs">
        <button data-status="" class="${fStatus===''?'on':''}">Barchasi <span class="cnt">${active.length}</span></button>
        ${stats.byStatus.map(s=>`<button data-status="${s.key}" class="${fStatus===s.key?'on':''}">${s.label} <span class="cnt">${s.n}</span></button>`).join('')}
      </div>
      <div class="toolbar">
        <div class="search">${IC_SEARCH}<input id="org-q" value="${escapeHtml(q)}" placeholder="Tashkilot nomi, subdomen yoki kontakt bo'yicha qidirish…" /></div>
        <select id="org-region" style="border:1.5px solid var(--line);border-radius:11px;padding:11px 12px;font:600 13.5px system-ui,sans-serif">
          <option value="">Barcha viloyatlar</option>
          ${REGION_NAMES.map(r=>`<option value="${escapeHtml(r)}" ${fRegion===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}
        </select>
        <select id="org-district" style="border:1.5px solid var(--line);border-radius:11px;padding:11px 12px;font:600 13.5px system-ui,sans-serif">
          <option value="">Barcha tumanlar</option>
          ${(fRegion ? (UZ_REGIONS[fRegion]||[]) : ALL_DISTRICTS.map(d=>d.value)).map(d=>`<option value="${escapeHtml(d)}" ${fDistrict===d?'selected':''}>${escapeHtml(d)}</option>`).join('')}
        </select>
        <div class="seg" id="visited-seg">
          ${[['all','Hammasi'],['yes','Borilgan'],['no','Borilmagan']].map(([k,lbl])=>`<button data-visited="${k}" class="${fVisited===k?'on':''}">${lbl}</button>`).join('')}
        </div>
        ${(fRegion||fDistrict||fVisited!=='all'||fStatus||q) ? `<button class="lnk" id="org-clear-filters">Tozalash</button>` : ''}
      </div>
      ${err ? `<div class="err-box">${escapeHtml(err)}</div>` : ''}
      ${orgs && active.length===0 ? `<div class="empty">Hali tashkilot yo'q. "+ Yangi tashkilot" bilan yarating.</div>` : ''}
      ${orgs && active.length>0 && shown.length===0 ? `<div class="empty">Bu filtr bo'yicha tashkilot topilmadi.</div>` : ''}
      <div class="org-grid" id="org-grid"></div>
      ${orgs && shown.length>0 ? `<div id="org-pager" style="margin-top:8px;background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow)"></div>` : ''}
      ${deletedOrgs.length>0 ? `
        <div style="margin-top:40px">
          <div class="dash-head" style="cursor:pointer" id="trash-toggle">
            <h2 style="opacity:.75">🗑 O'chirilganlar</h2>
            <span class="count">${deletedOrgs.length} ta · ${showTrash ? 'yashirish ▲' : "ko'rsatish ▼"}</span>
          </div>
          ${showTrash ? `<div class="org-grid" id="trash-grid"></div>` : ''}
        </div>` : ''}
      <div id="modal-slot"></div>
    `

    renderOrgCards(pageItems)
    if(orgs && shown.length>0) renderPager(pageCount)
    if(showTrash && deletedOrgs.length>0) renderTrashCards(deletedOrgs)
    wire(active)
  }

  function renderOrgCards(items){
    const grid = qs('#org-grid', root)
    grid.innerHTML = items.map(o=>`
      <div class="org-card${o.enabled?'':' off'}" data-id="${o.id}">
        <div class="oc-top">
          <span class="oc-dot" style="background:${o.color}"></span>
          <span class="logo-slot-host" data-logo-host></span>
          ${!o.logo ? `<b class="oc-name">${escapeHtml(o.name)}</b>` : ''}
          <select data-status-select style="margin-left:auto;border:none;cursor:pointer;border-radius:999px;padding:5px 10px;font:800 11.5px system-ui,sans-serif;background:${statusOf(o).color}1e;color:${statusOf(o).color};appearance:none">
            ${STATUSES.map(s=>`<option value="${s.key}" ${(o.status||'new')===s.key?'selected':''}>${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="oc-name2">${escapeHtml(o.name)}</div>
        <a class="oc-url" href="${tenantUrl(o.subdomain)}" target="_blank" rel="noopener">${tenantHost(o.subdomain)} ↗</a>
        ${(o.region || o.district || o.mapUrl) ? `<a class="oc-loc" href="${o.mapUrl || yandexSearchUrl(o.region, o.district)}" target="_blank" rel="noopener" title="Xaritada ochish (Yandex)" style="display:flex;align-items:center;gap:6px;margin-top:6px;color:var(--b,#2E3192);font:700 12px system-ui,sans-serif;text-decoration:none">${PIN}${[o.region,o.district].filter(Boolean).join(' · ') || "Xaritada ochish"}</a>` : ''}
        <div style="display:flex;align-items:center;gap:6px;margin-top:6px;font:700 12px system-ui,sans-serif">
          ${PHONE}
          ${o.phone ? `<a href="tel:${o.phone.replace(/\s/g,'')}" style="color:var(--mut,#7C8398);text-decoration:none">${escapeHtml(o.phone)}</a>` : `<button data-add-phone style="border:none;background:transparent;padding:0;cursor:pointer;color:var(--b,#2E3192);font:700 12px system-ui,sans-serif">+ Raqam qo'shish</button>`}
        </div>
        ${o.dealAmount>0 ? `<div style="margin-top:7px;font:800 13px system-ui,sans-serif;color:var(--green,#12A150)">${fmtSum(o.dealAmount)} so'm</div>` : ''}
        ${(o.dealItems&&o.dealItems.length>0) ? `<div style="margin-top:3px;font:600 11.5px system-ui,sans-serif;color:var(--mut,#7C8398);line-height:1.4">${o.dealItems.join(', ')}</div>` : ''}
        <div style="display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font:800 12.5px system-ui,sans-serif;color:${o.visited?'var(--green,#12A150)':'var(--mut,#7C8398)'}">
            <input type="checkbox" data-mark-visited ${o.visited?'checked':''} style="width:16px;height:16px;accent-color:var(--green,#12A150);cursor:pointer" />
            ${o.visited ? 'Borildi ✓' : 'Borildi'}
          </label>
          <button data-visits style="border:none;background:transparent;padding:0;cursor:pointer;font:800 12px system-ui,sans-serif;color:var(--b,#2E3192)">Tashriflar${(o.visits&&o.visits.length)?' ('+o.visits.length+')':''}</button>
        </div>
        <div style="flex:1"></div>
        <div class="oc-actions">
          <label class="switch" title="Yoqish/o'chirish"><input type="checkbox" data-toggle-enabled ${o.enabled?'checked':''} /><i></i></label>
          <button class="lnk" data-edit>Tahrirlash</button>
          <button class="lnk danger" data-remove>O'chirish</button>
        </div>
      </div>
    `).join('')
    qsa('.org-card', grid).forEach(card=>{
      const o = items.find(x=>x.id===card.dataset.id)
      if(o && o.logo){ const host = qs('[data-logo-host]', card); host.appendChild(smartLogoEl(o.logo, {height:40,maxWidth:132,className:'oc-logo'})) }
    })
  }
  function renderTrashCards(deletedOrgs){
    const grid = qs('#trash-grid', root)
    if(!grid) return
    grid.innerHTML = deletedOrgs.map(o=>`
      <div class="org-card off" data-id="${o.id}" style="opacity:.72">
        <div class="oc-top"><span class="oc-dot" style="background:${o.color}"></span>
          <span class="logo-slot-host" data-logo-host></span>
          ${!o.logo ? `<b class="oc-name">${escapeHtml(o.name)}</b>` : ''}
          <span class="badge no">O'chirilgan</span>
        </div>
        <div class="oc-name2">${escapeHtml(o.name)}</div>
        <div class="oc-url" style="text-decoration:line-through;opacity:.7">${tenantHost(o.subdomain)}</div>
        <div class="oc-actions"><button class="lnk" data-restore>↩ Tiklash</button></div>
      </div>
    `).join('')
    qsa('.org-card', grid).forEach(card=>{
      const o = deletedOrgs.find(x=>x.id===card.dataset.id)
      if(o && o.logo){ const host = qs('[data-logo-host]', card); host.appendChild(smartLogoEl(o.logo, {height:36,maxWidth:120,className:'oc-logo'})) }
    })
  }
  function renderPager(pageCount){
    const el = qs('#org-pager', root)
    if(!el) return
    const nums = []
    for(let i=1;i<=pageCount;i++) nums.push(i)
    el.innerHTML = `
      <div class="pager">
        <span class="pager-info">Sahifa ${page}/${pageCount}</span>
        <div class="pager-nav">
          <button class="pg" data-page="${Math.max(1,page-1)}" ${page<=1?'disabled':''}>‹</button>
          ${nums.map(n=>`<button class="pg${n===page?' on':''}" data-page="${n}">${n}</button>`).join('')}
          <button class="pg" data-page="${Math.min(pageCount,page+1)}" ${page>=pageCount?'disabled':''}>›</button>
        </div>
        <select class="pager-size" id="page-size-select">
          ${[10,20,50].map(s=>`<option value="${s}" ${pageSize===s?'selected':''}>${s} / sahifa</option>`).join('')}
        </select>
      </div>
    `
    on(el, 'click', '.pg', (e,btn)=>{ if(btn.disabled) return; page = Number(btn.dataset.page); render() })
    qs('#page-size-select', el).addEventListener('change', e=>{ pageSize = Number(e.target.value); page = 1; render() })
  }

  function wire(active){
    qs('#org-new', root).addEventListener('click', ()=> openForm(null))
    qs('#org-export', root).addEventListener('click', ()=> exportCSV(active))
    on(qs('#status-tabs', root), 'click', 'button', (e,btn)=>{ fStatus = btn.dataset.status; page = 1; render() })
    on(qs('#visited-seg', root), 'click', 'button', (e,btn)=>{ fVisited = btn.dataset.visited; page = 1; render() })
    const qInput = qs('#org-q', root)
    qInput.addEventListener('input', e=>{ q = e.target.value; page = 1 })
    qInput.addEventListener('keydown', e=>{ if(e.key==='Enter') render() })
    qInput.addEventListener('blur', ()=> render())
    qs('#org-region', root).addEventListener('change', e=>{ fRegion = e.target.value; fDistrict = ''; page = 1; render() })
    qs('#org-district', root).addEventListener('change', e=>{ fDistrict = e.target.value; page = 1; render() })
    const clearBtn = qs('#org-clear-filters', root)
    if(clearBtn) clearBtn.addEventListener('click', ()=>{ fRegion=''; fDistrict=''; fVisited='all'; fStatus=''; q=''; page=1; render() })
    const trashToggle = qs('#trash-toggle', root)
    if(trashToggle) trashToggle.addEventListener('click', ()=>{ showTrash = !showTrash; render() })

    on(qs('#org-grid', root), 'change', '[data-status-select]', async (e,sel)=>{
      const card = sel.closest('.org-card'); const o = active.find(x=>x.id===card.dataset.id)
      if(!o || sel.value===(o.status||'new')) return
      try{ await api.setStatus(o.id, sel.value); toast('Holat: '+statusOf({status:sel.value}).label); load() }catch(ex){ toast(ex.error) }
    })
    on(qs('#org-grid', root), 'click', '[data-add-phone]', (e,btn)=>{ const card = btn.closest('.org-card'); const o = active.find(x=>x.id===card.dataset.id); openForm(o) })
    on(qs('#org-grid', root), 'change', '[data-mark-visited]', async (e,chk)=>{
      const card = chk.closest('.org-card'); const o = active.find(x=>x.id===card.dataset.id)
      try{ await api.visited(o.id); toast(o.visited ? 'Borilmagan deb belgilandi' : 'Borildi deb belgilandi'); load() }catch(ex){ toast(ex.error) }
    })
    on(qs('#org-grid', root), 'click', '[data-visits]', (e,btn)=>{ const card = btn.closest('.org-card'); const o = active.find(x=>x.id===card.dataset.id); openVisitModal(o) })
    on(qs('#org-grid', root), 'change', '[data-toggle-enabled]', async (e,chk)=>{
      const card = chk.closest('.org-card'); const o = active.find(x=>x.id===card.dataset.id)
      try{ await api.toggle(o.id); toast(o.enabled ? 'O\'chirildi: '+o.subdomain : 'Yoqildi: '+o.subdomain); load() }catch(ex){ toast(ex.error) }
    })
    on(qs('#org-grid', root), 'click', '[data-edit]', (e,btn)=>{ const card = btn.closest('.org-card'); const o = active.find(x=>x.id===card.dataset.id); openForm(o) })
    on(qs('#org-grid', root), 'click', '[data-remove]', async (e,btn)=>{
      const card = btn.closest('.org-card'); const o = active.find(x=>x.id===card.dataset.id)
      if(!confirm(`"${o.name}" (${tenantHost(o.subdomain)}) o'chirilsinmi?\nU "O'chirilganlar" bo'limiga tushadi — keyin qayta tiklashingiz mumkin.`)) return
      try{ await api.remove(o.id); toast("O'chirilganlarga o'tkazildi"); load() }catch(ex){ toast(ex.error) }
    })
    const trashGrid = qs('#trash-grid', root)
    if(trashGrid) on(trashGrid, 'click', '[data-restore]', async (e,btn)=>{
      const card = btn.closest('.org-card'); const o = (orgs||[]).find(x=>x.id===card.dataset.id)
      try{ await api.restore(o.id); toast('Tiklandi: '+o.subdomain); load() }catch(ex){ toast(ex.error) }
    })
  }

  function openForm(org){
    const slot = qs('#modal-slot', root)
    modalCleanup = openOrgForm(slot, {
      org, onClose(){ slot.innerHTML = ''; if(modalCleanup){ modalCleanup(); modalCleanup = null } },
      onSaved(){ slot.innerHTML = ''; if(modalCleanup){ modalCleanup(); modalCleanup = null } toast('Saqlandi'); load() }
    })
  }
  function openVisitModal(o){
    const slot = qs('#modal-slot', root)
    const visits = Array.isArray(o.visits) ? o.visits : []
    slot.innerHTML = `
      <div class="modal-bg" id="visit-bg">
        <div class="modal" style="max-width:460px">
          <div class="form-col">
            <h3>Tashriflar — ${escapeHtml(o.name)}</h3>
            <label>Yangi tashrif izohi</label>
            <textarea id="visit-note" rows="3" placeholder="Masalan: uchrashuv bo'ldi, shartnoma muhokama qilindi…" style="width:100%;padding:11px 12px;border-radius:10px;border:1px solid #e2e4ee;font:600 14px system-ui,sans-serif;resize:vertical"></textarea>
            <div class="modal-actions">
              <button class="btn ghost" id="visit-close">Yopish</button>
              <button class="btn" id="visit-add">+ Tashrif qo'shish</button>
            </div>
            <div class="form-sec" style="margin-top:18px">Tarix (${visits.length})</div>
            ${visits.length===0 ? `<div class="hint">Hali tashrif yo'q.</div>` : ''}
            <div style="display:flex;flex-direction:column;gap:8px;max-height:260px;overflow:auto">
              ${visits.map(v=>`<div style="background:#f5f6fb;border:1px solid #e7eaf2;border-radius:10px;padding:9px 12px">
                <div style="font:800 12px system-ui,sans-serif;color:#2E3192">📅 ${fmtVisitDate(v.at)}</div>
                ${v.note ? `<div style="font:600 13px system-ui,sans-serif;color:#3A4055;margin-top:3px;white-space:pre-line">${escapeHtml(v.note)}</div>` : ''}
              </div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `
    const bg = qs('#visit-bg', slot)
    const close = ()=>{ slot.innerHTML = '' }
    bg.addEventListener('mousedown', e=>{ if(e.target===bg) close() })
    qs('.modal', slot).addEventListener('mousedown', e=>e.stopPropagation())
    qs('#visit-close', slot).addEventListener('click', close)
    qs('#visit-add', slot).addEventListener('click', async ()=>{
      const note = qs('#visit-note', slot).value.trim()
      const btn = qs('#visit-add', slot); btn.disabled = true; btn.textContent = 'Saqlanmoqda…'
      try{ await api.visit(o.id, note); close(); toast('Tashrif qo\'shildi'); load() }
      catch(ex){ toast(ex.error||'Xatolik'); btn.disabled = false; btn.textContent = "+ Tashrif qo'shish" }
    })
  }

  load()
  return function cleanup(){ if(modalCleanup) modalCleanup() }
}
