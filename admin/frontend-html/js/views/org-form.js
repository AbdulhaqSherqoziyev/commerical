import { api, DOMAIN } from '../api.js'
import { palette, validHex, validSub } from '../palette.js'
import { UZ_REGIONS, REGION_NAMES, REGION_COORDS } from '../uzregions.js'
import { STATUSES } from '../statuses.js'
import { PRODUCTS, fmtSum } from '../products.js'
import { qs, qsa, on, escapeHtml } from '../core.js'
import { smartLogoEl, resizeImage, mountCoordPicker } from '../widgets.js'

const MODULES = [
  { key: 'agent_web',   label: 'Agent veb panel' },
  { key: 'agent_mobil', label: 'Agent mobil' },
  { key: 'agent_app',   label: 'Agent mobil ilova' },
  { key: 'client',      label: 'Mijoz ilovasi' },
  { key: 'investor',    label: 'Investor' },
  { key: 'webstore',    label: "Veb do'kon" },
  { key: 'market',      label: 'Mobil market' },
]
const ALL_MODS = MODULES.map(m => m.key)

// OrgForm.jsx'ning vanilla JS ko'chirmasi — Tashkilot yaratish/tahrirlash
// oynasi (jonli ko'rinish paneli bilan). `container` — modal joylashadigan
// bo'sh element (masalan orgs.js'dagi #modal-slot).
export function openOrgForm(container, { org, onClose, onSaved }){
  const editing = !!org
  const state = {
    name: org?.name || '', sub: org?.subdomain || '',
    color: org?.color || '#2E3192', color2: org?.color2 || '#4A4FC4',
    logo: org?.logo || '', logoWhite: org?.logoWhite || '',
    modules: Array.isArray(org?.modules) ? org.modules : ALL_MODS,
    region: org?.region || '', district: org?.district || '',
    mapUrl: org?.mapUrl || '', phone: org?.phone || '+998 ', contact: org?.contact || '',
    status: org?.status || 'new',
    lat: typeof org?.lat === 'number' ? org.lat : null, lng: typeof org?.lng === 'number' ? org.lng : null,
    dealItems: Array.isArray(org?.dealItems) ? org.dealItems : [],
    dealAmount: org?.dealAmount ? String(org.dealAmount) : '',
    err: '', busy: false,
  }
  let coordCleanup = null

  function P(){ return validHex(state.color) ? palette(state.color) : palette('#2E3192') }

  function render(){
    if(coordCleanup){ coordCleanup(); coordCleanup = null }
    container.innerHTML = `
      <div class="modal-bg" id="of-bg">
        <div class="modal">
          <div class="modal-grid">
            <div class="form-col">
              <h3>${editing ? "Tashkilotni tahrirlash" : "Yangi tashkilot"}</h3>
              <div class="form-sec">Asosiy ma'lumotlar</div>
              <label>Tashkilot nomi <span class="req">*</span></label>
              <input name="name" value="${escapeHtml(state.name)}" placeholder="Acme Group" />
              <label>Subdomen <span class="req">*</span></label>
              <div class="sub-row">
                <input name="sub" value="${escapeHtml(state.sub)}" placeholder="acme" />
                <span class="suf">.${DOMAIN}</span>
              </div>
              ${editing ? `<div class="hint">Subdomenni o'zgartirsangiz, DNS'da ham aynan shu nom bo'lishi kerak</div>` : ''}
              <div class="two">
                <div><label>Asosiy rang</label><div class="cp"><input type="color" name="color" value="${state.color}" /><input name="colorText" value="${state.color}" /></div></div>
                <div><label>Ikkinchi rang</label><div class="cp"><input type="color" name="color2" value="${state.color2}" /><input name="color2Text" value="${state.color2}" /></div></div>
              </div>
              <div class="two">
                <div><label>Logo (och fon)</label>
                  <label class="drop" id="logo-drop">${state.logo ? '' : 'Yuklash'}<input type="file" accept="image/*" hidden name="logoFile" /></label>
                </div>
                <div><label>Oq logo (to'q fon)</label>
                  <label class="drop" id="logoWhite-drop" style="${state.logoWhite?'background:#20235E':''}">${state.logoWhite ? '' : 'Yuklash'}<input type="file" accept="image/*" hidden name="logoWhiteFile" /></label>
                </div>
              </div>
              <div class="form-sec">Bo'limlar (rollar)</div>
              <div class="hint" style="margin-top:0;margin-bottom:8px">Yoqilgan bo'limlargina dasturda ko'rinadi.</div>
              <div id="mods-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px 14px"></div>
              <div class="form-sec">Manzil / lokatsiya</div>
              <div class="two">
                <div><select name="region" style="width:100%;padding:11px 12px;border-radius:10px;border:1px solid #e2e4ee;font:600 14px system-ui,sans-serif;background:#fff">
                  <option value="">Viloyat tanlang</option>
                  ${REGION_NAMES.map(r=>`<option value="${escapeHtml(r)}" ${state.region===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}
                </select></div>
                <div><select name="district" ${state.region?'':'disabled'} style="width:100%;padding:11px 12px;border-radius:10px;border:1px solid #e2e4ee;font:600 14px system-ui,sans-serif;background:${state.region?'#fff':'#f3f4f7'}">
                  <option value="">${state.region ? "Tuman tanlang" : '—'}</option>
                  ${(UZ_REGIONS[state.region]||[]).map(d=>`<option value="${escapeHtml(d)}" ${state.district===d?'selected':''}>${escapeHtml(d)}</option>`).join('')}
                </select></div>
              </div>
              <input name="mapUrl" value="${escapeHtml(state.mapUrl)}" placeholder="Yandex xarita linki (masalan https://yandex.uz/maps/...)" style="margin-top:8px" />
              <label style="margin-top:12px">Xaritadan aniq nuqta (ixtiyoriy — bosib belgilang)</label>
              <div id="coord-picker"></div>
              ${(state.lat!=null && state.lng!=null) ? `<div class="hint" style="margin-top:4px;display:flex;justify-content:space-between">
                <span>Tanlandi: ${state.lat.toFixed(5)}, ${state.lng.toFixed(5)}</span>
                <span id="coord-clear" style="color:var(--red,#E23B4E);cursor:pointer;font-weight:700">tozalash</span>
              </div>` : ''}
              <div class="form-sec">Kontakt</div>
              <label>Telefon raqami</label>
              <input name="phone" value="${escapeHtml(state.phone)}" placeholder="+998 90 123 45 67" />
              <label style="margin-top:14px">Kontakt shaxs</label>
              <input name="contact" value="${escapeHtml(state.contact)}" placeholder="F.I.Sh. (masalan: Alisher Karimov)" />
              <div class="form-sec">Holat va kelishuv</div>
              <label>Holat</label>
              <div id="status-grid" style="display:flex;gap:8px;flex-wrap:wrap"></div>
              <label style="margin-top:14px">Mijoz nimalarni oladi (mahsulot/xizmat)</label>
              <div id="products-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px 12px"></div>
              <label style="margin-top:14px">Kelishilgan summa (so'm)</label>
              <input name="dealAmount" value="${state.dealAmount ? fmtSum(state.dealAmount) : ''}" placeholder="masalan: 5 000 000" inputmode="numeric" />
              ${state.err ? `<div class="auth-err">${escapeHtml(state.err)}</div>` : ''}
              <div class="modal-actions">
                <button class="btn ghost" id="of-cancel">Bekor</button>
                <button class="btn" id="of-save" ${state.busy?'disabled':''}>${state.busy ? 'Saqlanmoqda…' : (editing ? 'Yangilash' : 'Saqlash va jonli qilish')}</button>
              </div>
            </div>
            <div class="preview-col" id="preview-col"></div>
          </div>
        </div>
      </div>
    `
    renderMods(); renderStatusGrid(); renderProducts(); renderPreview(); renderLogos()
    coordCleanup = mountCoordPicker(qs('#coord-picker', container), {
      lat: state.lat, lng: state.lng, center: state.region ? REGION_COORDS[state.region] : null,
      onPick(la,ln){ state.lat = la; state.lng = ln; render() }
    })
    wire()
  }

  function renderMods(){
    const el = qs('#mods-grid', container)
    el.innerHTML = MODULES.map(m=>{
      const onM = state.modules.includes(m.key)
      return `<div class="mod-opt" data-mod="${m.key}" style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:9px 12px;border-radius:10px;border:1px solid ${onM?state.color:'#e2e4ee'};background:${onM?(P()['50']||'#f3f4fb'):'#fff'};user-select:none">
        <span style="width:34px;height:20px;border-radius:999px;background:${onM?state.color:'#cdd0dd'};position:relative;flex:0 0 auto">
          <span style="position:absolute;top:2px;left:${onM?16:2}px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25)"></span>
        </span>
        <span style="font:700 13.5px system-ui,sans-serif;color:${onM?'#1a1c2e':'#6b6f82'}">${escapeHtml(m.label)}</span>
      </div>`
    }).join('')
  }
  function renderStatusGrid(){
    const el = qs('#status-grid', container)
    el.innerHTML = STATUSES.map(s=>`<div class="st-opt" data-status="${s.key}" style="cursor:pointer;padding:8px 14px;border-radius:999px;font:800 13px system-ui,sans-serif;border:1.5px solid ${state.status===s.key?s.color:'#e2e4ee'};background:${state.status===s.key?s.color+'18':'#fff'};color:${state.status===s.key?s.color:'#6b6f82'}">${escapeHtml(s.label)}</div>`).join('')
  }
  function renderProducts(){
    const el = qs('#products-grid', container)
    el.innerHTML = PRODUCTS.map(p=>{
      const onP = state.dealItems.includes(p)
      return `<div class="prod-opt" data-prod="${escapeHtml(p)}" style="display:flex;align-items:center;gap:9px;cursor:pointer;padding:9px 12px;border-radius:10px;user-select:none;border:1px solid ${onP?state.color:'#e2e4ee'};background:${onP?(P()['50']||'#f3f4fb'):'#fff'}">
        <span style="width:17px;height:17px;border-radius:5px;flex:0 0 auto;display:grid;place-items:center;background:${onP?state.color:'#fff'};border:1.5px solid ${onP?state.color:'#cdd0dd'};color:#fff;font:900 12px system-ui">${onP?'✓':''}</span>
        <span style="font:700 13px system-ui,sans-serif;color:${onP?'#1a1c2e':'#6b6f82'}">${escapeHtml(p)}</span>
      </div>`
    }).join('')
  }
  function renderLogos(){
    const logoDrop = qs('#logo-drop', container)
    if(state.logo){ const img = smartLogoEl(state.logo, {height:56,maxWidth:200}); logoDrop.insertBefore(img, logoDrop.firstChild) }
    const logoWhiteDrop = qs('#logoWhite-drop', container)
    if(state.logoWhite){ const img = smartLogoEl(state.logoWhite, {height:56,maxWidth:200}); logoWhiteDrop.insertBefore(img, logoWhiteDrop.firstChild) }
  }
  function renderPreview(){
    const el = qs('#preview-col', container)
    const pal = P()
    el.innerHTML = `
      <div class="pv-label">Jonli ko'rinish</div>
      <div class="pv">
        <div class="pv-hero" style="background:linear-gradient(135deg,${state.color2},${pal['800']})">
          <span class="pv-pill">● YANGI KOLLEKSIYA</span>
          <h4>${escapeHtml(state.name || 'Sizning brendingiz')}</h4>
          <p>Original mahsulotlar — rasmiy kafolat bilan</p>
          <span class="pv-btn" style="color:${state.color}">Xaridni boshlash →</span>
        </div>
        <div class="pv-bl" id="pv-logo">${state.logo ? '' : `<b>${escapeHtml(state.name || 'BREND')}</b>`}</div>
        <div class="pv-cards">
          ${[0,1,2].map(i=>`<div class="pv-c"><div class="im" style="background:${pal['50']}"></div><div class="bd"><b>${59+i*10} 000</b><div class="add" style="background:${state.color}">Savatga</div></div></div>`).join('')}
        </div>
        <div class="pv-tabs"><span style="color:${state.color};border-color:${state.color}" class="on">Bosh</span><span>Katalog</span><span>Savat</span><span>Profil</span></div>
      </div>
      <div class="hint">${state.sub ? `https://${state.sub}.${DOMAIN}` : "subdomen kiriting"}</div>
    `
    if(state.logo){ const img = smartLogoEl(state.logo, {height:30,maxWidth:150}); qs('#pv-logo', el).appendChild(img) }
  }

  function pickLogo(file, setter){
    if(!file) return
    if(file.size > 8*1024*1024){ state.err = 'Rasm 8MB dan katta'; render(); return }
    resizeImage(file, data=>{
      if(!data){ state.err = 'Rasmni o\'qib bo\'lmadi'; render(); return }
      state.err = ''; setter(data); render()
    })
  }

  function wire(){
    const modal = qs('.modal', container)
    const bg = qs('#of-bg', container)
    bg.addEventListener('mousedown', e=>{ if(e.target===bg) onClose() })
    modal.addEventListener('mousedown', e=>e.stopPropagation())
    qs('#of-cancel', container).addEventListener('click', onClose)
    modal.querySelector('[name="name"]').addEventListener('input', e=>{ state.name = e.target.value; qs('#preview-col h4', container).textContent = state.name || 'Sizning brendingiz' })
    modal.querySelector('[name="sub"]').addEventListener('input', e=>{ state.sub = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''); e.target.value = state.sub; qs('.hint', qs('#preview-col',container)).textContent = state.sub ? `https://${state.sub}.${DOMAIN}` : 'subdomen kiriting' })
    modal.querySelector('[name="color"]').addEventListener('input', e=>{ state.color = e.target.value; modal.querySelector('[name="colorText"]').value = state.color; render() })
    modal.querySelector('[name="colorText"]').addEventListener('change', e=>{ state.color = e.target.value; render() })
    modal.querySelector('[name="color2"]').addEventListener('input', e=>{ state.color2 = e.target.value; modal.querySelector('[name="color2Text"]').value = state.color2; renderPreview() })
    modal.querySelector('[name="color2Text"]').addEventListener('change', e=>{ state.color2 = e.target.value; renderPreview() })
    modal.querySelector('[name="logoFile"]').addEventListener('change', e=> pickLogo(e.target.files[0], v=>state.logo=v))
    modal.querySelector('[name="logoWhiteFile"]').addEventListener('change', e=> pickLogo(e.target.files[0], v=>state.logoWhite=v))
    on(qs('#mods-grid', container), 'click', '.mod-opt', (e,node)=>{ const k = node.dataset.mod; state.modules = state.modules.includes(k) ? state.modules.filter(x=>x!==k) : [...state.modules, k]; render() })
    on(qs('#status-grid', container), 'click', '.st-opt', (e,node)=>{ state.status = node.dataset.status; render() })
    on(qs('#products-grid', container), 'click', '.prod-opt', (e,node)=>{ const p = node.dataset.prod; state.dealItems = state.dealItems.includes(p) ? state.dealItems.filter(x=>x!==p) : [...state.dealItems, p]; render() })
    modal.querySelector('[name="region"]').addEventListener('change', e=>{ state.region = e.target.value; state.district = ''; render() })
    modal.querySelector('[name="district"]').addEventListener('change', e=>{ state.district = e.target.value })
    modal.querySelector('[name="mapUrl"]').addEventListener('input', e=>{ state.mapUrl = e.target.value })
    modal.querySelector('[name="phone"]').addEventListener('input', e=>{ state.phone = e.target.value })
    modal.querySelector('[name="contact"]').addEventListener('input', e=>{ state.contact = e.target.value })
    modal.querySelector('[name="dealAmount"]').addEventListener('input', e=>{ state.dealAmount = e.target.value.replace(/\D/g,''); e.target.value = state.dealAmount ? fmtSum(state.dealAmount) : '' })
    const cc = qs('#coord-clear', container); if(cc) cc.addEventListener('click', ()=>{ state.lat = null; state.lng = null; render() })
    qs('#of-save', container).addEventListener('click', save)
  }

  async function save(){
    state.err = ''
    if(!state.name.trim()){ state.err = 'Tashkilot nomi kerak'; render(); return }
    if(!validSub(state.sub)){ state.err = "Subdomen: faqat a-z, 0-9, - (2–32 belgi)"; render(); return }
    if(!validHex(state.color)){ state.err = "Asosiy rang noto'g'ri"; render(); return }
    state.busy = true; render()
    const _pd = state.phone.replace(/\D/g,'')
    const phoneClean = (_pd==='' || _pd==='998') ? '' : state.phone.trim()
    const payload = {
      name: state.name.trim(), subdomain: state.sub.toLowerCase(), color: state.color, color2: state.color2,
      logo: state.logo, logoWhite: state.logoWhite, modules: state.modules,
      region: state.region, district: state.district, mapUrl: state.mapUrl.trim(),
      phone: phoneClean, contact: state.contact.trim(), status: state.status,
      lat: state.lat, lng: state.lng, dealItems: state.dealItems,
      dealAmount: Number(String(state.dealAmount).replace(/\D/g,'')) || 0,
    }
    try{
      if(editing) await api.update(org.id, payload); else await api.create(payload)
      onSaved()
    }catch(ex){ state.err = ex.error || 'Xatolik'; state.busy = false; render() }
  }

  render()
  return function cleanup(){ if(coordCleanup) coordCleanup() }
}
