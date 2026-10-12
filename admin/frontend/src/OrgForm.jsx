import React, { useState } from 'react'
import { api, DOMAIN, tenantHost, tenantUrl } from './api.js'
import { palette, validHex, validSub } from './palette.js'
import { UZ_REGIONS, REGION_NAMES, REGION_COORDS } from './uzregions.js'
import { STATUSES } from './statuses.js'
import { PRODUCTS, fmtSum } from './products.js'
import CoordPicker from './CoordPicker.jsx'
import SmartLogo, { trimTransparent } from './SmartLogo.jsx'

function resizeImage(file, cb){
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = ()=>{
    URL.revokeObjectURL(url)
    const max = 360
    let w = img.width, h = img.height
    if(w > max || h > max){ const s = max/Math.max(w,h); w = Math.round(w*s); h = Math.round(h*s) }
    const c = document.createElement('canvas'); c.width = w; c.height = h
    c.getContext('2d',{ willReadFrequently:true }).drawImage(img, 0, 0, w, h)
    // Shaffof chekkalarni kesib, bir xil breathing qo'shamiz (root fix). Alfa bo'lmasa o'zgarmaydi.
    const c2 = trimTransparent(c)
    let out = c2.toDataURL('image/png')
    if(out.length > 180*1024) out = c2.toDataURL('image/jpeg', 0.85)
    cb(out)
  }
  img.onerror = ()=>{ URL.revokeObjectURL(url); cb(null) }
  img.src = url
}

const MODULES = [
  { key: 'ican_mobil',  label: 'iCAN Mobil' },
  { key: 'agent_web',   label: 'Agent veb panel' },
  { key: 'agent_mobil', label: 'Agent mobil' },
  { key: 'agent_app',   label: 'Agent mobil ilova' },
  { key: 'client',      label: 'Mijoz ilovasi' },
  { key: 'investor',    label: 'Investor' },
  { key: 'webstore',    label: "Veb do'kon" },
  { key: 'market',      label: 'Mobil market' },
]
const ALL_MODS = MODULES.map(m => m.key)

export default function OrgForm({ org, onClose, onSaved }){
  const [name, setName] = useState(org?.name || '')
  const [sub, setSub] = useState(org?.subdomain || '')
  const [color, setColor] = useState(org?.color || '#2E3192')
  const [color2, setColor2] = useState(org?.color2 || '#4A4FC4')
  const [logo, setLogo] = useState(org?.logo || '')
  const [logoWhite, setLogoWhite] = useState(org?.logoWhite || '')
  const [modules, setModules] = useState(Array.isArray(org?.modules) ? org.modules : ALL_MODS)
  const [region, setRegion] = useState(org?.region || '')
  const [district, setDistrict] = useState(org?.district || '')
  const [mapUrl, setMapUrl] = useState(org?.mapUrl || '')
  const [phone, setPhone] = useState(org?.phone || '+998 ')
  const [contact, setContact] = useState(org?.contact || '')
  const [status, setStatus] = useState(org?.status || 'new')
  const [lat, setLat] = useState(typeof org?.lat === 'number' ? org.lat : null)
  const [lng, setLng] = useState(typeof org?.lng === 'number' ? org.lng : null)
  const [dealItems, setDealItems] = useState(Array.isArray(org?.dealItems) ? org.dealItems : [])
  const [dealAmount, setDealAmount] = useState(org?.dealAmount ? String(org.dealAmount) : '')
  const [err, setErr] = useState('')
  const toggleItem = (p) => setDealItems(a => a.includes(p) ? a.filter(x=>x!==p) : [...a, p])
  const [busy, setBusy] = useState(false)
  const editing = !!org
  const toggleMod = (k) => setModules(m => m.includes(k) ? m.filter(x => x !== k) : [...m, k])

  const P = validHex(color) ? palette(color) : palette('#2E3192')

  function pickLogo(e, setter){ const f = e.target.files[0]; if(!f) return; if(f.size > 8*1024*1024){ setErr('Rasm 8MB dan katta'); return } resizeImage(f, (data)=>{ if(!data){ setErr('Rasmni o‘qib bo‘lmadi'); return } setErr(''); setter(data) }) }

  async function save(){
    setErr('')
    if(!name.trim()) return setErr('Tashkilot nomi kerak')
    if(!validSub(sub)) return setErr('Subdomen: faqat a-z, 0-9, - (2–32 belgi)')
    if(!validHex(color)) return setErr('Asosiy rang noto‘g‘ri')
    setBusy(true)
    const _pd = phone.replace(/\D/g,'') // raqamlar
    const phoneClean = (_pd === '' || _pd === '998') ? '' : phone.trim() // faqat +998 (qo'shimcha raqamsiz) -> bo'sh
    const payload = { name:name.trim(), subdomain:sub.toLowerCase(), color, color2, logo, logoWhite, modules, region, district, mapUrl:mapUrl.trim(), phone:phoneClean, contact:contact.trim(), status, lat, lng, dealItems, dealAmount: Number(String(dealAmount).replace(/\D/g,''))||0 }
    try {
      if(editing) await api.update(org.id, payload); else await api.create(payload)
      onSaved()
    } catch(ex){ setErr(ex.error || 'Xatolik'); setBusy(false) }
  }

  return (
    <div className="modal-bg" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="modal-grid">
          <div className="form-col">
            <h3>{editing ? 'Tashkilotni tahrirlash' : 'Yangi tashkilot'}</h3>
            <div className="form-sec">Asosiy ma‘lumotlar</div>
            <label>Tashkilot nomi <span className="req">*</span></label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Acme Group" />
            <label>Manzil (havola) <span className="req">*</span></label>
            <div className="sub-row">
              <span className="suf">{DOMAIN}/</span>
              <input value={sub} onChange={e=>setSub(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} placeholder="acme" />
            </div>
            {editing && <div className="hint">Manzilni o‘zgartirsangiz, eski havola ishlamay qoladi</div>}
            <div className="two">
              <div><label>Asosiy rang</label><div className="cp"><input type="color" value={color} onChange={e=>setColor(e.target.value)} /><input value={color} onChange={e=>setColor(e.target.value)} /></div></div>
              <div><label>Ikkinchi rang</label><div className="cp"><input type="color" value={color2} onChange={e=>setColor2(e.target.value)} /><input value={color2} onChange={e=>setColor2(e.target.value)} /></div></div>
            </div>
            <div className="two">
              <div>
                <label>Logo (och fon)</label>
                <label className="drop">{logo ? <img src={logo} alt="" /> : 'Yuklash'}<input type="file" accept="image/*" hidden onChange={e=>pickLogo(e,setLogo)} /></label>
              </div>
              <div>
                <label>Oq logo (to‘q fon)</label>
                <label className="drop">{logoWhite ? <img src={logoWhite} alt="" style={{background:'#20235E',padding:4,borderRadius:6}} /> : 'Yuklash'}<input type="file" accept="image/*" hidden onChange={e=>pickLogo(e,setLogoWhite)} /></label>
              </div>
            </div>
            <div className="form-sec">Bo‘limlar (rollar)</div>
            <div className="hint" style={{marginTop:0,marginBottom:8}}>Yoqilgan bo‘limlargina dasturda ko‘rinadi. O‘chirilgani mijoz sahifasida chiqmaydi.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 14px'}}>
              {MODULES.map(m => {
                const on = modules.includes(m.key)
                return (
                  <div key={m.key} onClick={()=>toggleMod(m.key)}
                    style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'9px 12px',borderRadius:10,
                      border:'1px solid '+(on?color:'#e2e4ee'),background:on?(P['50']||'#f3f4fb'):'#fff',userSelect:'none',transition:'all .12s'}}>
                    <span style={{width:34,height:20,borderRadius:999,background:on?color:'#cdd0dd',position:'relative',flex:'0 0 auto',transition:'background .12s'}}>
                      <span style={{position:'absolute',top:2,left:on?16:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left .12s',boxShadow:'0 1px 2px rgba(0,0,0,.25)'}} />
                    </span>
                    <span style={{font:'700 13.5px system-ui,sans-serif',color:on?'#1a1c2e':'#6b6f82'}}>{m.label}</span>
                  </div>
                )
              })}
            </div>
            <div className="form-sec">Manzil / lokatsiya</div>
            <div className="two">
              <div>
                <select value={region} onChange={e=>{ setRegion(e.target.value); setDistrict('') }}
                  style={{width:'100%',padding:'11px 12px',borderRadius:10,border:'1px solid #e2e4ee',font:'600 14px system-ui,sans-serif',background:'#fff'}}>
                  <option value="">Viloyat tanlang</option>
                  {REGION_NAMES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <select value={district} onChange={e=>setDistrict(e.target.value)} disabled={!region}
                  style={{width:'100%',padding:'11px 12px',borderRadius:10,border:'1px solid #e2e4ee',font:'600 14px system-ui,sans-serif',background:region?'#fff':'#f3f4f7'}}>
                  <option value="">{region ? 'Tuman tanlang' : '—'}</option>
                  {(UZ_REGIONS[region] || []).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <input value={mapUrl} onChange={e=>setMapUrl(e.target.value)} placeholder="Yandex xarita linki (masalan https://yandex.uz/maps/...)" style={{marginTop:8}} />
            <label style={{marginTop:12}}>Xaritadan aniq nuqta (ixtiyoriy — bosib belgilang)</label>
            <CoordPicker lat={lat} lng={lng} center={region ? REGION_COORDS[region] : null} onPick={(la,ln)=>{ setLat(la); setLng(ln) }} />
            {(lat!=null && lng!=null) && <div className="hint" style={{marginTop:4,display:'flex',justifyContent:'space-between'}}>
              <span>Tanlandi: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
              <span style={{color:'var(--red,#E23B4E)',cursor:'pointer',fontWeight:700}} onClick={()=>{ setLat(null); setLng(null) }}>tozalash</span>
            </div>}
            <div className="form-sec">Kontakt</div>
            <label>Telefon raqami</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+998 90 123 45 67" />
            <label style={{marginTop:14}}>Kontakt shaxs</label>
            <input value={contact} onChange={e=>setContact(e.target.value)} placeholder="F.I.Sh. (masalan: Alisher Karimov)" />
            <div className="form-sec">Holat va kelishuv</div>
            <label>Holat</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {STATUSES.map(s => (
                <div key={s.key} onClick={()=>setStatus(s.key)}
                  style={{cursor:'pointer',padding:'8px 14px',borderRadius:999,font:'800 13px system-ui,sans-serif',
                    border:'1.5px solid '+(status===s.key?s.color:'#e2e4ee'), background:status===s.key?s.color+'18':'#fff',
                    color:status===s.key?s.color:'#6b6f82'}}>{s.label}</div>
              ))}
            </div>

            <label style={{marginTop:14}}>Mijoz nimalarni oladi (mahsulot/xizmat)</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 12px'}}>
              {PRODUCTS.map(p => {
                const on = dealItems.includes(p)
                return (
                  <div key={p} onClick={()=>toggleItem(p)}
                    style={{display:'flex',alignItems:'center',gap:9,cursor:'pointer',padding:'9px 12px',borderRadius:10,userSelect:'none',
                      border:'1px solid '+(on?color:'#e2e4ee'), background:on?(P['50']||'#f3f4fb'):'#fff'}}>
                    <span style={{width:17,height:17,borderRadius:5,flex:'0 0 auto',display:'grid',placeItems:'center',
                      background:on?color:'#fff',border:'1.5px solid '+(on?color:'#cdd0dd'),color:'#fff',font:'900 12px system-ui'}}>{on?'✓':''}</span>
                    <span style={{font:'700 13px system-ui,sans-serif',color:on?'#1a1c2e':'#6b6f82'}}>{p}</span>
                  </div>
                )
              })}
            </div>
            <label style={{marginTop:14}}>Kelishilgan summa (so‘m)</label>
            <input value={dealAmount ? fmtSum(dealAmount) : ''} onChange={e=>setDealAmount(e.target.value.replace(/\D/g,''))} placeholder="masalan: 5 000 000" inputMode="numeric" />
            {err && <div className="auth-err">{err}</div>}
            <div className="modal-actions">
              <button className="btn ghost" onClick={onClose}>Bekor</button>
              <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saqlanmoqda…' : (editing ? 'Yangilash' : 'Saqlash va jonli qilish')}</button>
            </div>
          </div>

          <div className="preview-col">
            <div className="pv-label">Jonli ko‘rinish</div>
            <div className="pv">
              <div className="pv-hero" style={{background:`linear-gradient(135deg,${color2},${P['800']})`}}>
                <span className="pv-pill">● YANGI KOLLEKSIYA</span>
                <h4>{name || 'Sizning brendingiz'}</h4>
                <p>Original mahsulotlar — rasmiy kafolat bilan</p>
                <span className="pv-btn" style={{color}}>Xaridni boshlash →</span>
              </div>
              <div className="pv-bl">{logo ? <SmartLogo src={logo} height={30} maxWidth={150} /> : <b>{name || 'BREND'}</b>}</div>
              <div className="pv-cards">
                {[0,1,2].map(i => (
                  <div className="pv-c" key={i}>
                    <div className="im" style={{background:P['50']}} />
                    <div className="bd"><b>{59+i*10} 000</b><div className="add" style={{background:color}}>Savatga</div></div>
                  </div>
                ))}
              </div>
              <div className="pv-tabs"><span style={{color,borderColor:color}} className="on">Bosh</span><span>Katalog</span><span>Savat</span><span>Profil</span></div>
            </div>
            <div className="hint">{sub ? tenantUrl(sub) : 'manzil nomini kiriting'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
