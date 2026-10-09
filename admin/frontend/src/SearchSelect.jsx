import React, { useState, useRef, useEffect } from 'react'

function labelOf(opt){
  if(opt == null) return ''
  return typeof opt === 'string' ? opt : (opt.label || opt.value || '')
}

// Qidiruvli tanlagich. options: string[] YOKI {value,label?,region?}[] boʻlishi mumkin.
// onChange tanlangan elementni (string yoki obyekt) yoki tozalanganda null qaytaradi.
export default function SearchSelect({ value, onChange, options, placeholder, clearLabel }){
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function onDoc(e){ if(ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const list = options || []
  const ql = q.trim().toLowerCase()
  const filtered = ql ? list.filter(o => labelOf(o).toLowerCase().includes(ql)) : list

  function pick(opt){ onChange(opt); setOpen(false); setQ('') }

  return (
    <div className={"ssel"+(open?' open':'')} ref={ref}>
      <button type="button" className="ssel-trigger" onClick={() => setOpen(v => !v)}>
        <span className={value ? 'ssel-val' : 'ssel-ph'}>{value ? labelOf(value) : (placeholder || 'Tanlang')}</span>
        {value
          ? <span className="ssel-clear" onClick={e => { e.stopPropagation(); onChange(null) }}>×</span>
          : <span className="ssel-arrow">▾</span>}
      </button>
      {open && (
        <div className="ssel-pop">
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Qidirish…" className="ssel-search" />
          <div className="ssel-list">
            {clearLabel && <div className="ssel-opt ssel-opt-clear" onClick={() => pick(null)}>{clearLabel}</div>}
            {filtered.length === 0 && <div className="ssel-empty">Topilmadi</div>}
            {filtered.map((o, i) => (
              <div key={i} className="ssel-opt" onClick={() => pick(o)}>{labelOf(o)}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
