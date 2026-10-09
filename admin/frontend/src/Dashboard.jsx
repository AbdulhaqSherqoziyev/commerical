import React, { useState, useEffect } from 'react'
import { api, DOMAIN } from './api.js'
import OrgForm from './OrgForm.jsx'
import { UZ_REGIONS, REGION_NAMES, ALL_DISTRICTS, yandexSearchUrl } from './uzregions.js'
import SearchSelect from './SearchSelect.jsx'
import MapView from './MapView.jsx'
import { STATUSES, statusOf } from './statuses.js'
import { fmtSum } from './products.js'
import VisitModal from './VisitModal.jsx'
import PasswordModal from './PasswordModal.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import SmartLogo from './SmartLogo.jsx'

const IC_USERS = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const IC_MAP = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>

const PIN = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flex:'0 0 auto'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
const PHONE = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flex:'0 0 auto'}}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>

export default function Dashboard({ onLogout }){
  const [orgs, setOrgs] = useState(null)
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | org
  const [msg, setMsg] = useState('')
  const [fRegion, setFRegion] = useState('')
  const [fDistrict, setFDistrict] = useState('')
  const [showTrash, setShowTrash] = useState(false)
  const [view, setView] = useState('clients') // 'clients' | 'map'
  const [fVisited, setFVisited] = useState('all') // 'all' | 'yes' | 'no'
  const [q, setQ] = useState('')
  const [fStatus, setFStatus] = useState('') // '' | status key
  const [visitOrg, setVisitOrg] = useState(null)
  const [showPass, setShowPass] = useState(false)

  async function load(){
    try { setOrgs(await api.list()) } catch(ex){ if(ex.status===401) onLogout(); else setErr(ex.error) }
  }
  useEffect(()=>{ load() }, [])
  function toast(m){ setMsg(m); setTimeout(()=>setMsg(''), 2400) }

  async function toggle(o){
    try { await api.toggle(o.id); load(); toast(o.enabled ? 'O‘chirildi: '+o.subdomain : 'Yoqildi: '+o.subdomain) }
    catch(ex){ toast(ex.error) }
  }
  async function markVisited(o){
    try { await api.visited(o.id); load(); toast(o.visited ? 'Borilmagan deb belgilandi' : 'Borildi deb belgilandi') }
    catch(ex){ toast(ex.error) }
  }
  async function changeStatus(o, status){
    if(status === (o.status||'new')) return
    try { await api.setStatus(o.id, status); load(); toast('Holat: '+statusOf({status}).label) }
    catch(ex){ toast(ex.error) }
  }
  async function remove(o){
    if(!confirm(`"${o.name}" (${o.subdomain}.${DOMAIN}) o‘chirilsinmi?\nU "O‘chirilganlar" bo‘limiga tushadi — keyin qayta tiklashingiz mumkin.`)) return
    try { await api.remove(o.id); load(); toast('O‘chirilganlarga o‘tkazildi') } catch(ex){ toast(ex.error) }
  }
  async function restore(o){
    try { await api.restore(o.id); load(); toast('Tiklandi: '+o.subdomain) } catch(ex){ toast(ex.error) }
  }
  async function purge(o){
    if(!confirm(`"${o.name}" BUTUNLAY o‘chirilsinmi? Bu QAYTARILMAYDI.`)) return
    try { await api.purge(o.id); load(); toast('Butunlay o‘chirildi') } catch(ex){ toast(ex.error) }
  }
  function onSaved(){ setEditing(null); load(); toast('Saqlandi') }

  const active = (orgs || []).filter(o => !o.deleted)
  const deletedOrgs = (orgs || []).filter(o => o.deleted)
  const ql = q.trim().toLowerCase()
  const shown = active.filter(o =>
    (!fRegion || o.region === fRegion) &&
    (!fDistrict || o.district === fDistrict) &&
    (fVisited === 'all' || (fVisited === 'yes' ? !!o.visited : !o.visited)) &&
    (!fStatus || (o.status || 'new') === fStatus) &&
    (!ql || (o.name||'').toLowerCase().includes(ql) || (o.subdomain||'').toLowerCase().includes(ql) || (o.contact||'').toLowerCase().includes(ql))
  )
  const stats = {
    total: active.length,
    faol: active.filter(o=>o.enabled).length,
    borilgan: active.filter(o=>o.visited).length,
    summa: active.reduce((s,o)=>s+(Number(o.dealAmount)||0),0),
    byStatus: STATUSES.map(s => ({ ...s, n: active.filter(o => (o.status||'new')===s.key).length }))
  }
  function exportCSV(){
    const rows = [['Nomi','Subdomen','Holat','Viloyat','Tuman','Telefon','Kontakt','Mahsulotlar','Summa','Borilgan','Faol','Manzil']]
    active.forEach(o => rows.push([o.name, o.subdomain+'.'+DOMAIN, statusOf(o).label, o.region||'', o.district||'', o.phone||'', o.contact||'', (o.dealItems||[]).join('; '), o.dealAmount||0, o.visited?'Ha':'Yoq', o.enabled?'Ha':'Yoq', o.mapUrl||'']))
    const csv = '﻿' + rows.map(r => r.map(c => '"'+String(c==null?'':c).replace(/"/g,'""')+'"').join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'tashkilotlar.csv'; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sb-brand">◆ Commercial</div>
        <nav className="sb-nav">
          <button className={"sb-item"+(view==='clients'?' on':'')} onClick={()=>setView('clients')}>{IC_USERS} Mijozlar</button>
          <button className={"sb-item"+(view==='map'?' on':'')} onClick={()=>setView('map')}>{IC_MAP} Xarita</button>
        </nav>
        <div className="sb-foot">
          <button className="btn small ghost" style={{width:'100%'}} onClick={onLogout}>Chiqish</button>
        </div>
      </aside>

      <div className="content">
        <header className="dash-top">
          <div className="brand">◆ Commercial Admin <span>Super Admin</span></div>
          <div className="spacer" />
          <button className="btn small ghost" onClick={()=>setShowPass(true)}>Parol</button>
          {view==='clients' && <button className="btn small ghost" onClick={exportCSV}>⬇ Excel</button>}
          {view==='clients' && <button className="btn small" onClick={()=>setEditing('new')}>+ Yangi tashkilot</button>}
        </header>

        <main className="dash-main">
        {view==='map' && <MapView orgs={active} DOMAIN={DOMAIN} />}
        {view==='clients' && <>
        <div className="dash-head">
          <div>
            <h2>Tashkilotlar</h2>
            <div style={{font:'600 13px system-ui,sans-serif',color:'var(--mut)',marginTop:2}}>Mijoz-tashkilotlar, dostuplar va ular bilan ish holati</div>
          </div>
          <span className="count">{orgs ? shown.length : '…'}{(shown.length!==active.length) && orgs ? ` / ${active.length}` : ''} ta</span>
        </div>

        {orgs && <div className="kpi-grid">
          <div className="stat-tile"><b>{stats.total}</b><span>Jami tashkilot</span></div>
          <div className="stat-tile"><b style={{color:'var(--green)'}}>{stats.faol}</b><span>Faol</span></div>
          <div className="stat-tile"><b style={{color:'#2E7DF6'}}>{stats.borilgan}</b><span>Borilgan</span></div>
          {stats.byStatus.map(s => <div className="stat-tile" key={s.key}><b style={{color:s.color}}>{s.n}</b><span>{s.label}</span></div>)}
          <div className="stat-tile"><b style={{fontSize:18,color:'var(--green)'}}>{fmtSum(stats.summa)}</b><span>Jami summa (so‘m)</span></div>
        </div>}

        {/* status tabs */}
        <div className="seg" style={{margin:'0 0 14px',flexWrap:'wrap'}}>
          <button className={fStatus===''?'on':''} onClick={()=>setFStatus('')}>Barchasi <span className="cnt">{active.length}</span></button>
          {stats.byStatus.map(s => <button key={s.key} className={fStatus===s.key?'on':''} onClick={()=>setFStatus(s.key)}>{s.label} <span className="cnt">{s.n}</span></button>)}
        </div>

        {/* toolbar: qidiruv + filtrlar */}
        <div className="toolbar">
          <div className="search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tashkilot nomi, subdomen yoki kontakt bo‘yicha qidirish…" />
          </div>
          <SearchSelect value={fRegion} onChange={v=>{ setFRegion(v || ''); setFDistrict('') }}
            options={REGION_NAMES} placeholder="Barcha viloyatlar" clearLabel="Barcha viloyatlar" />
          <SearchSelect value={fDistrict}
            onChange={opt=>{ if(!opt){ setFDistrict('') } else if(typeof opt === 'string'){ setFDistrict(opt) } else { setFDistrict(opt.value); setFRegion(opt.region) } }}
            options={fRegion ? (UZ_REGIONS[fRegion] || []) : ALL_DISTRICTS}
            placeholder={fRegion ? 'Barcha tumanlar' : 'Tuman qidiring…'} clearLabel="Barcha tumanlar" />
          <div className="seg">
            {[['all','Hammasi'],['yes','Borilgan'],['no','Borilmagan']].map(([k,lbl])=>(
              <button key={k} className={fVisited===k?'on':''} onClick={()=>setFVisited(k)}>{lbl}</button>
            ))}
          </div>
          {(fRegion||fDistrict||fVisited!=='all'||fStatus||q) && <button className="lnk" onClick={()=>{ setFRegion(''); setFDistrict(''); setFVisited('all'); setFStatus(''); setQ('') }}>Tozalash</button>}
        </div>

        {err && <div className="err-box">{err}</div>}
        {orgs && active.length===0 && <div className="empty">Hali tashkilot yo‘q. “+ Yangi tashkilot” bilan yarating.</div>}
        {orgs && active.length>0 && shown.length===0 && <div className="empty">Bu filtr bo‘yicha tashkilot topilmadi.</div>}
        <div className="org-grid">
          {shown.map(o => (
            <div className={"org-card"+(o.enabled?'':' off')} key={o.id}>
              <div className="oc-top">
                <span className="oc-dot" style={{background:o.color}} />
                {o.logo ? <SmartLogo src={o.logo} height={40} maxWidth={132} className="oc-logo" /> : <b className="oc-name">{o.name}</b>}
                <select value={o.status||'new'} onChange={e=>changeStatus(o, e.target.value)} title="Holatni o‘zgartirish"
                  style={{marginLeft:'auto',border:'none',cursor:'pointer',borderRadius:999,padding:'5px 10px',
                    font:'800 11.5px system-ui,sans-serif',background:statusOf(o).color+'1e',color:statusOf(o).color,appearance:'none',WebkitAppearance:'none'}}>
                  {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div className="oc-name2">{o.name}</div>
              <a className="oc-url" href={`https://${o.subdomain}.${DOMAIN}`} target="_blank" rel="noopener">{o.subdomain}.{DOMAIN} ↗</a>
              {(o.region || o.district || o.mapUrl) && (
                <a className="oc-loc" href={o.mapUrl || yandexSearchUrl(o.region, o.district)} target="_blank" rel="noopener"
                  title="Xaritada ochish (Yandex)"
                  style={{display:'flex',alignItems:'center',gap:6,marginTop:6,color:'var(--b,#2E3192)',font:'700 12px system-ui,sans-serif',textDecoration:'none'}}>
                  {PIN}{[o.region, o.district].filter(Boolean).join(' · ') || 'Xaritada ochish'}
                </a>
              )}
              <div style={{display:'flex',alignItems:'center',gap:6,marginTop:6,font:'700 12px system-ui,sans-serif'}}>
                {PHONE}
                {o.phone
                  ? <a href={'tel:'+o.phone.replace(/\s/g,'')} style={{color:'var(--mut,#7C8398)',textDecoration:'none'}}>{o.phone}</a>
                  : <button onClick={()=>setEditing(o)} style={{border:'none',background:'transparent',padding:0,cursor:'pointer',color:'var(--b,#2E3192)',font:'700 12px system-ui,sans-serif'}}>+ Raqam qo‘shish</button>}
              </div>
              {o.dealAmount > 0 && <div style={{marginTop:7,font:'800 13px system-ui,sans-serif',color:'var(--green,#12A150)'}}>{fmtSum(o.dealAmount)} so‘m</div>}
              {o.dealItems && o.dealItems.length > 0 && <div style={{marginTop:3,font:'600 11.5px system-ui,sans-serif',color:'var(--mut,#7C8398)',lineHeight:1.4}}>{o.dealItems.join(', ')}</div>}
              <div style={{display:'flex',alignItems:'center',gap:12,marginTop:10,flexWrap:'wrap'}}>
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',
                  font:'800 12.5px system-ui,sans-serif',color:o.visited?'var(--green,#12A150)':'var(--mut,#7C8398)'}}>
                  <input type="checkbox" checked={!!o.visited} onChange={()=>markVisited(o)}
                    style={{width:16,height:16,accentColor:'var(--green,#12A150)',cursor:'pointer'}} />
                  {o.visited ? 'Borildi ✓' : 'Borildi'}
                </label>
                <button onClick={()=>setVisitOrg(o)} style={{border:'none',background:'transparent',padding:0,cursor:'pointer',
                  font:'800 12px system-ui,sans-serif',color:'var(--b,#2E3192)'}}>
                  Tashriflar{(o.visits && o.visits.length) ? ' ('+o.visits.length+')' : ''}
                </button>
              </div>
              <div style={{flex:1}} />
              <div className="oc-actions">
                <label className="switch" title="Yoqish/o‘chirish">
                  <input type="checkbox" checked={o.enabled} onChange={()=>toggle(o)} /><i />
                </label>
                <button className="lnk" onClick={()=>setEditing(o)}>Tahrirlash</button>
                <button className="lnk danger" onClick={()=>remove(o)}>O‘chirish</button>
              </div>
            </div>
          ))}
        </div>

        {deletedOrgs.length > 0 && (
          <div style={{marginTop:40}}>
            <div className="dash-head" style={{cursor:'pointer'}} onClick={()=>setShowTrash(v=>!v)}>
              <h2 style={{opacity:.75}}>🗑 O‘chirilganlar</h2>
              <span className="count">{deletedOrgs.length} ta · {showTrash ? 'yashirish ▲' : 'ko‘rsatish ▼'}</span>
            </div>
            {showTrash && (
              <div className="org-grid">
                {deletedOrgs.map(o => (
                  <div className="org-card off" key={o.id} style={{opacity:.72}}>
                    <div className="oc-top">
                      <span className="oc-dot" style={{background:o.color}} />
                      {o.logo ? <SmartLogo src={o.logo} height={36} maxWidth={120} className="oc-logo" /> : <b className="oc-name">{o.name}</b>}
                      <span className="badge no">O‘chirilgan</span>
                    </div>
                    <div className="oc-name2">{o.name}</div>
                    <div className="oc-url" style={{textDecoration:'line-through',opacity:.7}}>{o.subdomain}.{DOMAIN}</div>
                    <div className="oc-actions">
                      <button className="lnk" onClick={()=>restore(o)}>↩ Tiklash</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </>}
        </main>
      </div>

      {editing && <ErrorBoundary><OrgForm org={editing==='new'?null:editing} onClose={()=>setEditing(null)} onSaved={onSaved} /></ErrorBoundary>}
      {visitOrg && <VisitModal org={visitOrg} onClose={()=>setVisitOrg(null)} onSaved={()=>{ setVisitOrg(null); load(); toast('Tashrif qo‘shildi') }} onErr={m=>toast(m)} />}
      {showPass && <PasswordModal onClose={()=>setShowPass(false)} onDone={()=>{ setShowPass(false); toast('Parol o‘zgartirildi') }} />}
      {msg && <div className="toast on">{msg}</div>}
    </div>
  )
}
