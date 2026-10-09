import React, { useState } from 'react'
import { api } from './api.js'

export default function PasswordModal({ onClose, onDone }){
  const [oldp, setOldp] = useState('')
  const [newp, setNewp] = useState('')
  const [newp2, setNewp2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(){
    setErr('')
    if(newp.length < 8) return setErr("Yangi parol kamida 8 belgi bo'lishi kerak")
    if(newp !== newp2) return setErr('Yangi parollar mos emas')
    setBusy(true)
    try { await api.changePass(oldp, newp); onDone() }
    catch(ex){ setErr(ex.error || 'Xatolik') }
    finally { setBusy(false) }
  }

  return (
    <div className="modal-bg" onMouseDown={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onMouseDown={e => e.stopPropagation()}>
        <div className="form-col">
          <h3>Parolni o'zgartirish</h3>
          <label>Eski parol</label>
          <input type="password" value={oldp} onChange={e => setOldp(e.target.value)} autoComplete="current-password" />
          <label style={{ marginTop: 14 }}>Yangi parol</label>
          <input type="password" value={newp} onChange={e => setNewp(e.target.value)} autoComplete="new-password" placeholder="kamida 8 belgi" />
          <label style={{ marginTop: 14 }}>Yangi parol (takror)</label>
          <input type="password" value={newp2} onChange={e => setNewp2(e.target.value)} autoComplete="new-password" />
          {err && <div className="auth-err">{err}</div>}
          <div className="modal-actions" style={{ position: 'static', margin: '20px 0 0', padding: 0, border: 'none' }}>
            <button className="btn ghost" onClick={onClose}>Bekor</button>
            <button className="btn" onClick={submit} disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
