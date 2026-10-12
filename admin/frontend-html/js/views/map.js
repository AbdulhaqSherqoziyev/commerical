import { api, DOMAIN, tenantHost, tenantUrl } from '../api.js'
import { statusOf } from '../statuses.js'
import { UZ_REGIONS, REGION_NAMES, ALL_DISTRICTS, REGION_COORDS } from '../uzregions.js'
import { qs, escapeHtml } from '../core.js'

/* Tashkilotlar xaritasi (Leaflet + OSM) — Dashboard.jsx'ning MapView.jsx
   qismining vanilla JS ko'chirmasi:
   - viloyat/tuman filtri;
   - aniq lat/lng bo'lsa o'sha nuqta, bo'lmasa viloyat markazi (taxminiy);
   - "Mening joylashuvim": qizil nuqta + eng yaqindan boshlab qizil chiziqli
     yo'nalish (1,2,3... raqamlangan to'xtashlar).
   Boshqa view'lardan farqli o'laroq, bu yerda butun konteyner har filtr
   o'zgarishida QAYTA CHIZILMAYDI — Leaflet xaritasi BIR MARTA yaratiladi
   (mount vaqtida) va keyin faqat markerlar/marshrut qayta chiziladi, aks
   holda har qidiruv harfida butun xarita (zoom/pan holati bilan) qayta
   yaratilib, tajriba yomonlashardi. */

function norm(s){ return String(s||'').toLowerCase().replace(/[ʻ'’‘`´]/g,"'").replace(/\s+(viloyati|respublikasi)\s*$/,'').trim() }
const NORM_COORDS = {}; Object.keys(REGION_COORDS).forEach(k=>{ NORM_COORDS[norm(k)] = REGION_COORDS[k] })
function routeUrl(my, lat, lng){
  return my ? `https://yandex.uz/maps/?rtext=${my[0]},${my[1]}~${lat},${lng}&rtt=auto`
            : `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`
}

// Ilgari tugmada 📍 emoji turardi — u tizim shriftida rangsiz, boshqa
// sahifalardagi chiziqli ikonkalarga o'xshamaydigan belgi bo'lib chiqardi.
const IC_PIN = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`

const UZ_BOUNDS = [[36.7, 55.6], [45.7, 73.3]]
const ROUTE_MAX_STOPS = 40

export function mountMap(root, { toast }){
  let orgsData = []
  let fRegion = '', fDistrict = '', q = ''
  let my = null
  let msg = ''
  let locating = false
  let routeState = { status:'idle', truncated:false }
  let dragged = false

  let map = null, layer = null, routeLayer = null
  let routeReqId = 0

  root.innerHTML = `
    <div class="ic-page">
      <div class="ic-head">
        <div><div class="ic-title">Xarita</div>
        <div class="ic-sub">Tashkilotlar joylashuvi · eng yaqindan boshlab yo'nalish</div></div>
        <div class="ic-head-act"><span id="map-count" class="ic-meta"></span></div>
      </div>
      <div class="map-toolbar" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <div class="ic-search" style="flex:1 1 230px;max-width:320px"><input id="map-q" placeholder="Umumiy qidiruv…" /></div>
          <select id="map-region" class="ic-select">
            <option value="">Barcha viloyatlar</option>
            ${REGION_NAMES.map(r=>`<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('')}
          </select>
          <select id="map-district" class="ic-select">
            <option value="">Barcha tumanlar</option>
          </select>
          <button class="ic-btn ghost" id="map-clear-route" style="display:none">Yo'nalishni tozalash</button>
          <button class="ic-btn" id="map-locate" style="margin-left:auto">${IC_PIN} Mening joylashuvim</button>
      </div>
      <div id="map-msg" class="hint" style="margin-bottom:8px;display:none"></div>
      <div id="map-route-msg" class="hint" style="margin-bottom:8px;display:none"></div>
      ${!window.L ? `<div class="err-box">Xarita kutubxonasi yuklanmadi (internet). Sahifani yangilang.</div>` : ''}
      <div id="map-box" class="map-box" style="height:calc(100vh - 265px);min-height:440px;width:100%"></div>
      <div id="map-empty" class="hint" style="margin-top:10px;display:none">Bu filtr bo'yicha tashkilot topilmadi.</div>
    </div>
  `

  wireControls()
  initMap()
  load()

  async function load(){ try{ orgsData = await api.list() }catch(e){} recompute() }

  function wireControls(){
    qs('#map-q', root).addEventListener('input', e=>{ q = e.target.value; recompute() })
    qs('#map-region', root).addEventListener('change', e=>{ fRegion = e.target.value; fDistrict = ''; updateDistrictOptions(); recompute() })
    qs('#map-district', root).addEventListener('change', e=>{ fDistrict = e.target.value; recompute() })
    qs('#map-locate', root).addEventListener('click', locate)
    qs('#map-clear-route', root).addEventListener('click', ()=>{ my = null; msg = ''; dragged = false; recompute() })
  }

  function updateDistrictOptions(){
    const sel = qs('#map-district', root)
    const opts = fRegion ? (UZ_REGIONS[fRegion]||[]).map(d=>({value:d,label:d})) : ALL_DISTRICTS
    sel.innerHTML = `<option value="">${fRegion?'Barcha tumanlar':'Tuman qidiring…'}</option>` +
      opts.map(o=>`<option value="${escapeHtml(o.value)}">${escapeHtml(o.label||o.value)}</option>`).join('')
    sel.value = fDistrict
  }

  function initMap(){
    const L = window.L
    if(!L) return
    const box = qs('#map-box', root)
    if(!box) return
    map = L.map(box, { zoomControl:true, minZoom:6, maxBounds:UZ_BOUNDS, maxBoundsViscosity:1.0 }).setView([41.31,69.28], 6)
    map.setMaxBounds(UZ_BOUNDS)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19, attribution:'© OpenStreetMap' }).addTo(map)
    layer = L.layerGroup().addTo(map)
    routeLayer = L.layerGroup().addTo(map)
    // Leaflet konteyner o'lchamini FAQAT yaratilganda o'lchaydi. Sarlavha/
    // asboblar qatori chizilib bo'lgach quti kengaygani uchun xaritaning bir
    // qismi bo'sh kulrang bo'lib qolardi. Endi o'lcham har o'zgarganda
    // qayta hisoblanadi.
    const qayta = () => { try{ map.invalidateSize() }catch(e){} }
    setTimeout(qayta, 60); setTimeout(qayta, 300)
    if(window.ResizeObserver){
      const ro = new ResizeObserver(qayta)
      ro.observe(box)
      root.addEventListener('ic:unmount', ()=>{ try{ ro.disconnect() }catch(e){} })
    }
  }

  function computePlaced(){
    const ql = q.trim().toLowerCase()
    return (orgsData||[])
      .filter(o => !fRegion || norm(o.region)===norm(fRegion))
      .filter(o => !fDistrict || norm(o.district)===norm(fDistrict))
      .filter(o => !ql || (o.name||'').toLowerCase().includes(ql) || (o.subdomain||'').toLowerCase().includes(ql) || (o.contact||'').toLowerCase().includes(ql) || (o.phone||'').toLowerCase().includes(ql))
      .map((o,i)=>{
        if(typeof o.lat==='number' && typeof o.lng==='number') return { o, lat:o.lat, lng:o.lng, exact:true }
        const rc = o.region && (REGION_COORDS[o.region] || NORM_COORDS[norm(o.region)])
        if(rc){ const j=0.06; return { o, lat: rc[0]+(((i*37)%11)-5)*j/5, lng: rc[1]+(((i*53)%11)-5)*j/5, exact:false } }
        return null
      }).filter(Boolean)
  }

  function routeOrder(start, items){
    const rem = items.slice(), order = []; let cur = start
    while(rem.length){ let bi=0,bd=Infinity
      rem.forEach((p,i)=>{ const d=(p.lat-cur[0])**2+(p.lng-cur[1])**2; if(d<bd){bd=d;bi=i} })
      const nx=rem.splice(bi,1)[0]; order.push(nx); cur=[nx.lat,nx.lng] }
    return order
  }

  function spreadOverlaps(items){
    const totalByKey = new Map()
    items.forEach(p=>{ const key = p.lat.toFixed(4)+','+p.lng.toFixed(4); totalByKey.set(key, (totalByKey.get(key)||0)+1) })
    const seen = new Map()
    return items.map(p=>{
      const key = p.lat.toFixed(4)+','+p.lng.toFixed(4)
      const total = totalByKey.get(key)
      if(total<=1) return p
      const i = seen.get(key)||0; seen.set(key, i+1)
      const r = 0.00035 + total*0.00003
      const ang = (2*Math.PI*i)/total
      const latRad = p.lat*Math.PI/180
      return Object.assign({}, p, {
        lat: p.lat + r*Math.cos(ang),
        lng: p.lng + r*Math.sin(ang)/Math.max(0.2, Math.cos(latRad)),
      })
    })
  }

  async function drawRoute(L, myPos, order){
    if(!routeLayer) return
    const reqId = ++routeReqId
    routeLayer.clearLayers()
    if(!myPos || !order.length){ routeState = { status:'idle', truncated:false }; updateRouteMsg(); return }

    const stops = order.slice(0, ROUTE_MAX_STOPS)
    const truncated = order.length > stops.length
    const coordsLatLng = [myPos, ...stops.map(p=>[p.lat, p.lng])]

    const provisional = L.polyline(coordsLatLng, { color:'#E23B4E', weight:2, opacity:0.35, dashArray:'6,8' })
    provisional.addTo(routeLayer)
    routeState = { status:'loading', truncated }; updateRouteMsg()

    try{
      const coordsStr = coordsLatLng.map(([lat,lng])=>lng+','+lat).join(';')
      const data = await api.route(coordsStr)
      if(reqId !== routeReqId) return
      const coords = data && data.coordinates
      if(!coords || coords.length < 2) throw new Error('bosh-marshrut')
      const latlngs = coords.map(([lng,lat])=>[lat,lng])
      routeLayer.clearLayers()
      L.polyline(latlngs, { color:'#E23B4E', weight:4, opacity:0.85 }).addTo(routeLayer)
      routeState = { status:'ok', truncated }; updateRouteMsg()
    }catch(e){
      if(reqId !== routeReqId) return
      routeState = { status:'fallback', truncated }; updateRouteMsg()
    }
  }

  function recompute(){
    const placed = computePlaced()
    drawMap(placed)
    updateToolbar(placed)
  }

  function drawMap(placed){
    const L = window.L
    if(!L || !map || !layer) return
    layer.clearLayers()
    const pts = []
    const order = spreadOverlaps(my ? routeOrder(my, placed) : placed)

    drawRoute(L, my, order)

    order.forEach((p,idx)=>{
      const sm = statusOf(p.o)
      const url = 'https://'+p.tenantHost(o.subdomain)
      const popup = '<b>'+escapeHtml(p.o.name)+'</b>'+(my?' · #'+(idx+1):'')+'<br>'+escapeHtml(sm.label)+(p.exact?'':' · taxminiy')+
        (p.o.phone?'<br>📞 '+escapeHtml(p.o.phone):'')+
        ((p.o.region||p.o.district)?'<br>📍 '+escapeHtml([p.o.region,p.o.district].filter(Boolean).join(', ')):'')+
        '<br><a href="'+escapeHtml(routeUrl(my,p.lat,p.lng))+'" target="_blank" rel="noopener">🧭 Yo\'nalish</a> · <a href="'+url+'" target="_blank" rel="noopener">Sayt ↗</a>'
      let m
      if(my){
        const html = '<div style="background:'+sm.color+';color:#fff;width:26px;height:26px;border-radius:50%;border:2px solid #fff;'+
          'box-shadow:0 1px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font:800 12.5px system-ui">'+(idx+1)+'</div>'
        m = L.marker([p.lat,p.lng], { icon: L.divIcon({ className:'', html, iconSize:[26,26], iconAnchor:[13,13] }) })
      } else {
        m = L.circleMarker([p.lat,p.lng], { radius:9, color:'#fff', weight:2, fillColor:sm.color, fillOpacity: p.exact?1:0.55 })
      }
      m.bindPopup(popup).addTo(layer); pts.push([p.lat,p.lng])
    })

    if(my){
      const meIcon = L.divIcon({ className:'', iconSize:[24,24], iconAnchor:[12,12],
        html:'<div style="width:16px;height:16px;border-radius:50%;background:#E23B4E;border:3px solid #fff;'+
             'box-shadow:0 0 0 7px rgba(226,59,78,.22),0 1px 5px rgba(0,0,0,.4);margin:1px"></div>' })
      const meM = L.marker(my, { icon: meIcon, draggable:true, zIndexOffset:1000 }).addTo(layer)
        .bindPopup('📍 Siz shu yerdasiz — noto\'g\'ri bo\'lsa, ushbu nuqtani sudrab to\'g\'rilang')
      meM.on('dragend', e=>{ const ll = e.target.getLatLng(); dragged = true; my = [+ll.lat.toFixed(6), +ll.lng.toFixed(6)]; recompute() })
      meM.openPopup()
      pts.push(my)
    }
    if(pts.length && !dragged){ try{ map.fitBounds(pts, { padding:[45,45], maxZoom:13 }) }catch(e){} }
    dragged = false
  }

  function updateToolbar(placed){
    qs('#map-count', root).textContent = `Xaritada: ${placed.length} ta${my?' · yo\'nalish faol':''}`
    const msgEl = qs('#map-msg', root)
    if(msg){ msgEl.textContent = msg; msgEl.style.display = '' } else { msgEl.style.display = 'none' }
    const clearBtn = qs('#map-clear-route', root)
    clearBtn.style.display = my ? '' : 'none'
    const locateBtn = qs('#map-locate', root)
    locateBtn.disabled = locating
    locateBtn.innerHTML = locating ? '<span class="mini-spin"></span>Aniqlanmoqda…' : '📍 Mening joylashuvim'
    const emptyEl = qs('#map-empty', root)
    emptyEl.style.display = (window.L && placed.length===0) ? '' : 'none'
    updateRouteMsg()
  }

  function updateRouteMsg(){
    const el = qs('#map-route-msg', root)
    if(!el) return
    if(my && routeState.status==='loading'){ el.textContent = "🧭 Yo'l ma'lumoti yuklanmoqda…"; el.style.color=''; el.style.display='' }
    else if(my && routeState.status==='ok'){ el.textContent = `✅ Yo'nalish haqiqiy yo'l bo'yicha chizildi${routeState.truncated?` (eng yaqin ${ROUTE_MAX_STOPS} ta nuqta bo'yicha)`:''}.`; el.style.color='#1a8f5e'; el.style.display='' }
    else if(my && routeState.status==='fallback'){ el.textContent = "⚠️ Yo'l xizmatidan javob kelmadi — taxminiy (to'g'ri chiziqli) yo'nalish ko'rsatilmoqda."; el.style.color='#b8860b'; el.style.display='' }
    else { el.style.display = 'none' }
  }

  function locate(){
    if(!navigator.geolocation){ msg = "Qurilma joylashuvni qo'llab-quvvatlamaydi"; recompute(); return }
    locating = true; msg = '📍 Joylashuv aniqlanmoqda…'; recompute()
    navigator.geolocation.getCurrentPosition(
      p=>{ locating = false; dragged = false; my = [+p.coords.latitude.toFixed(6), +p.coords.longitude.toFixed(6)]; msg = "✅ Yo'nalish tuzildi. Joylashuv taxminiy bo'lsa — qizil nuqtani sudrab to'g'rilang."; recompute() },
      (err)=>{ locating = false; msg = "Joylashuvni olib bo'lmadi — ruxsat bering ("+(err&&err.message||'')+')'; recompute() },
      { enableHighAccuracy:true, timeout:10000 }
    )
  }

  return function cleanup(){ try{ if(map){ map.remove(); map = null } }catch(e){} }
}
