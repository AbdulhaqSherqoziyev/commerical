import React, { useState } from 'react'
import { api, setToken } from './api.js'

export default function Login({ onLogin }){
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e){
    e.preventDefault(); setErr(''); setBusy(true)
    try { const r = await api.login(u.trim(), p); setToken(r.token); onLogin() }
    catch(ex){ setErr(ex.error || 'Xatolik') }
    finally { setBusy(false) }
  }
  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo">◆ Commercial Admin</div>
        <h1>Super Admin</h1>
        <p className="auth-sub">Brendlash panelига kirish</p>
        <label>Login</label>
        <input value={u} onChange={e=>setU(e.target.value)} autoFocus autoComplete="username" placeholder="admin" />
        <label>Parol</label>
        <input type="password" value={p} onChange={e=>setP(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
        {err && <div className="auth-err">{err}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Kirilmoqda…' : 'Kirish'}</button>
      </form>
    </div>
  )
}
