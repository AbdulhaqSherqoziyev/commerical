import { api, setToken } from '../api.js'
import { qs, on } from '../core.js'

export function mountLogin(root, { onLogin }){
  root.innerHTML = `
    <div class="auth-wrap">
      <form class="auth-card" id="login-form">
        <div class="auth-logo"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="color:var(--b)"><path d="M12 2.2l8.5 4.9v9.8L12 21.8 3.5 16.9V7.1z" fill="currentColor" opacity=".16"/><path d="M12 6.6l4.7 2.7v5.4L12 17.4 7.3 14.7V9.3z" fill="currentColor"/></svg> ICAN BUSINESS</div>
        <h1>Super Admin</h1>
        <p class="auth-sub">Brendlash paneliga kirish</p>
        <label>Login</label>
        <input name="u" autofocus autocomplete="username" placeholder="admin" />
        <label>Parol</label>
        <input name="p" type="password" autocomplete="current-password" placeholder="••••••••" />
        <div id="login-err"></div>
        <button class="btn" type="submit">Kirish</button>
      </form>
    </div>
  `
  const form = qs('#login-form', root)
  const errBox = qs('#login-err', root)
  form.addEventListener('submit', async e=>{
    e.preventDefault()
    errBox.innerHTML = ''
    const u = form.u.value.trim(), p = form.p.value
    const btn = qs('button', form)
    btn.disabled = true; btn.textContent = 'Kirilmoqda…'
    try{
      const r = await api.login(u, p)
      setToken(r.token)
      onLogin()
    }catch(ex){
      errBox.innerHTML = `<div class="auth-err">${ex.error || 'Xatolik'}</div>`
      btn.disabled = false; btn.textContent = 'Kirish'
    }
  })
}
