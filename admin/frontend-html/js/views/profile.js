import { api } from '../api.js'
import { qs, escapeHtml } from '../core.js'

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function fmtDate(ts){ if(!ts) return '—'; const d=new Date(ts); const p=x=>String(x).padStart(2,'0'); return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} - ${p(d.getHours())}:${p(d.getMinutes())}` }

// Vanilla JS ko'chirmasi: ProfilePage.jsx + uning EditProfile modali.
export function mountProfile(root, { user, toast, onClose, onLogout }){
  let me = null, err = ''

  function render(){
    const p = (me && me.profile) || {}
    const login = (me && me.user) || user
    const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || login
    const initials = ((p.firstName && p.firstName[0]) || '') + ((p.lastName && p.lastName[0]) || '') || (login[0]||'A')
    root.innerHTML = `
      <div>
        <div class="dash-head" style="align-items:center;gap:12px">
          <button class="wiz-back" id="p-back" title="Orqaga">‹</button>
          <h2>Profil</h2>
        </div>
        ${err ? `<div class="err-box">${escapeHtml(err)}</div>` : ''}
        <div class="prof-page">
          <div class="wiz-card prof-left">
            <div class="prof-hero">
              <div class="prof-bigav">${escapeHtml(initials.toUpperCase())}</div>
              <div class="prof-name">${escapeHtml(fullName)}</div>
              ${p.phone ? `<div class="prof-phone">${escapeHtml(p.phone)}</div>` : ''}
            </div>
            <div class="prof-row"><span>LAVOZIM</span><b>${p.position ? escapeHtml(p.position) : '—'}</b></div>
            <div class="prof-2col">
              <div class="prof-cell"><span>OXIRGI YANGILANISH</span><b>${fmtDate(me && me.updatedAt)}</b></div>
              <div class="prof-cell"><span>YARATILGAN</span><b>${fmtDate(me && me.createdAt)}</b></div>
            </div>
            <div class="prof-actions">
              <button class="btn ghost" id="p-edit">✎ Tahrirlash</button>
              <button class="btn red" id="p-logout">➜ Chiqish</button>
            </div>
          </div>
          <div class="prof-right">
            <div class="dv-box"><span class="dv-ic">✉</span><div><small>Login</small><b>${escapeHtml(login)}</b></div></div>
            <div class="dv-box"><span class="dv-ic">🛡</span><div><small>Rol</small><b>${(me && me.role==='xodim') ? 'Xodim' : 'Admin'}</b></div></div>
            <div class="dv-box"><span class="dv-ic">📈</span><div><small>Status</small><b style="color:var(--green)">Faol</b></div></div>
          </div>
        </div>
        <div id="p-modal-slot"></div>
      </div>
    `
    qs('#p-back', root).addEventListener('click', onClose)
    qs('#p-logout', root).addEventListener('click', onLogout)
    qs('#p-edit', root).addEventListener('click', ()=> renderEditModal())
  }

  function renderEditModal(){
    const slot = qs('#p-modal-slot', root)
    const isAdmin = (me && me.role) !== 'xodim'
    const p = (me && me.profile) || {}
    const login = (me && me.user) || user
    slot.innerHTML = `
      <div class="modal-bg" id="edit-bg">
        <div class="modal" style="max-width:560px">
          <div class="form-col">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <h3>Profil</h3>
              <button class="lnk" id="edit-x" style="font-size:20px;line-height:1">×</button>
            </div>
            <div class="wiz-grid" style="margin-top:10px">
              <div class="wf"><label>Ism</label><input name="firstName" value="${escapeHtml(p.firstName||'')}" placeholder="Ism" /></div>
              <div class="wf"><label>Familiya</label><input name="lastName" value="${escapeHtml(p.lastName||'')}" placeholder="Familiya" /></div>
              <div class="wf"><label>Lavozim</label><input name="position" value="${escapeHtml(p.position||'')}" placeholder="Lavozim" /></div>
              <div class="wf"><label>Telefon</label><input name="phone" value="${escapeHtml(p.phone||'+998 ')}" placeholder="+998 90 000 00 00" /></div>
              ${isAdmin ? `<div class="wf full"><label>Login</label><input name="newLogin" value="${escapeHtml(login||'')}" placeholder="login@ican.uz" /></div>` : ''}
              <div class="wf full"><label>Joriy parol <span style="color:var(--mut);font-weight:600;text-transform:none">(${isAdmin ? 'login yoki parolni' : 'parolni'} o'zgartirsangiz)</span></label><input name="oldp" type="password" placeholder="••••••••" autocomplete="current-password" /></div>
              <div class="wf"><label>Yangi parol</label><input name="np" type="password" placeholder="kamida 8 belgi, harf+raqam" autocomplete="new-password" /></div>
              <div class="wf"><label>Yangi parolni tasdiqlash</label><input name="np2" type="password" placeholder="••••••••" autocomplete="new-password" /></div>
            </div>
            <div id="edit-err"></div>
            <div class="modal-actions">
              <button class="btn ghost" id="edit-cancel">Bekor qilish</button>
              <button class="btn" id="edit-save">Saqlash</button>
            </div>
          </div>
        </div>
      </div>
    `
    const bg = qs('#edit-bg', slot)
    const closeModal = ()=>{ slot.innerHTML = '' }
    bg.addEventListener('mousedown', e=>{ if(e.target===bg) closeModal() })
    qs('#edit-x', slot).addEventListener('click', closeModal)
    qs('#edit-cancel', slot).addEventListener('click', closeModal)
    qs('#edit-save', slot).addEventListener('click', async ()=>{
      const f = qs('.modal', slot)
      const val = name => { const el = f.querySelector(`[name="${name}"]`); return el ? el.value : '' }
      const errBox = qs('#edit-err', slot)
      errBox.innerHTML = ''
      const firstName = val('firstName'), lastName = val('lastName'), position = val('position'), phone = val('phone')
      const newLogin = isAdmin ? val('newLogin') : login
      const oldp = val('oldp'), np = val('np'), np2 = val('np2')
      const loginChanged = isAdmin && newLogin.trim() && newLogin.trim()!==login
      const passChanged = !!np
      if(passChanged){
        if(np.length<8) return errBox.innerHTML = `<div class="auth-err">Yangi parol kamida 8 belgi</div>`
        if(!/[A-Za-z]/.test(np) || !/\d/.test(np)) return errBox.innerHTML = `<div class="auth-err">Parolda kamida bitta harf va bitta raqam bo'lsin</div>`
        if(np!==np2) return errBox.innerHTML = `<div class="auth-err">Parollar mos emas</div>`
      }
      if((loginChanged||passChanged) && !oldp) return errBox.innerHTML = `<div class="auth-err">Login yoki parolni o'zgartirish uchun joriy parolni kiriting</div>`
      const btn = qs('#edit-save', slot); btn.disabled = true; btn.textContent = 'Saqlanmoqda…'
      const _pd = phone.replace(/\D/g,''); const phoneClean = (_pd===''||_pd==='998') ? '' : phone.trim()
      try{
        await api.saveProfile({ firstName:firstName.trim(), lastName:lastName.trim(), position:position.trim(), phone:phoneClean })
        if(loginChanged || passChanged){
          await api.changePass(oldp, passChanged?np:undefined, loginChanged?newLogin.trim():undefined)
          alert('Login/parol o\'zgartirildi. Xavfsizlik uchun qaytadan kiring.')
          onLogout(); return
        }
        closeModal(); load(); toast('Saqlandi')
      }catch(ex){
        errBox.innerHTML = `<div class="auth-err">${escapeHtml(ex.error||'Xatolik')}</div>`
        btn.disabled = false; btn.textContent = 'Saqlash'
      }
    })
  }

  async function load(){ try{ me = await api.me(); err = '' }catch(ex){ err = ex.error||'Xatolik' } render() }
  load()

  return function cleanup(){}
}
