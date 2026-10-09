import React, { useState } from 'react'
import { api } from './api.js'

export default function VisitModal({ org, onClose, onSaved, onErr }){
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const visits = (org.visits || []).slice().sort((a, b) => b.date - a.date)

  async function submit(){
    setBusy(true)
    try { await api.addVisit(org.id, note.trim()); setNote(''); onSaved() }
    catch(ex){ onErr(ex.error || 'Xatolik') }
    finally { setBusy(false) }
  }

  return (
    <div className="modal-bg" onMouseDown={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onMouseDown={e => e.stopPropagation()}>
        <div className="form-col">
          <h3>Tashriflar — {org.name}</h3>
          <label style={{ marginTop: 14 }}>Yangi tashrif izohi (ixtiyoriy)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Masalan: ofisga borildi, shartnoma muhokama qilindi…"
            style={{ width: '100%', minHeight: 80, border: '1.5px solid var(--line)', borderRadius: 11, padding: '11px 12px', font: 'inherit', fontSize: 14, resize: 'vertical' }} />
          <div className="modal-actions" style={{ position: 'static', margin: '16px 0 0', padding: 0, border: 'none' }}>
            <button className="btn ghost" onClick={onClose}>Yopish</button>
            <button className="btn" onClick={submit} disabled={busy}>{busy ? "Qo'shilmoqda…" : "Tashrif qo'shish"}</button>
          </div>

          <div className="form-sec" style={{ marginTop: 24 }}>Tarix ({visits.length})</div>
          {visits.length === 0 && <div className="hint" style={{ marginTop: 8 }}>Hali tashrif qayd etilmagan.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10, maxHeight: 260, overflow: 'auto' }}>
            {visits.map((v, i) => (
              <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 11, padding: '10px 12px' }}>
                <div style={{ font: '800 12px system-ui,sans-serif', color: 'var(--mut)' }}>{new Date(v.date).toLocaleString('uz-UZ')}</div>
                {v.note && <div style={{ marginTop: 4, fontSize: 13.5 }}>{v.note}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
