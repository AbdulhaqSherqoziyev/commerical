// SmartLogo.jsx va CoordPicker.jsx'ning vanilla JS ko'chirmasi — bular allaqachon
// asosan Canvas/Leaflet bilan ishlagani uchun React'ga bog'liqligi kam edi.

function measureAlphaBBox(img){
  try{
    const nW = img.naturalWidth, nH = img.naturalHeight
    if(!nW || !nH) return null
    const S = Math.min(1, 128/Math.max(nW,nH))
    const w = Math.max(1,Math.round(nW*S)), h = Math.max(1,Math.round(nH*S))
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const ctx = c.getContext('2d',{ willReadFrequently:true }); ctx.drawImage(img,0,0,w,h)
    let d; try{ d = ctx.getImageData(0,0,w,h).data }catch(e){ return null }
    let minx=w,miny=h,maxx=-1,maxy=-1,opaque=0
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){ if(d[(y*w+x)*4+3] > 12){ opaque++; if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y } }
    if(maxx < 0) return null
    if(opaque/(w*h) > 0.985) return null
    return { x:minx/S, y:miny/S, w:(maxx-minx+1)/S, h:(maxy-miny+1)/S, nW, nH }
  }catch(e){ return null }
}
function fitLogo(slot, img, { height, maxWidth, fill }){
  const H = height||40, MW = maxWidth||140, FILL = (fill==null?0.86:fill)
  const bb = measureAlphaBBox(img)
  if(!bb){
    slot.style.cssText = `display:inline-flex;align-items:center;justify-content:center;height:${H}px;overflow:visible;vertical-align:middle`
    img.style.cssText = `position:static;height:${Math.round(H*FILL)}px;width:auto;max-width:${MW}px;object-fit:contain`
    return
  }
  let k = (H*FILL)/bb.h
  if(bb.w*k > MW*FILL) k = (MW*FILL)/bb.w
  const contentW = bb.w*k, contentH = bb.h*k
  let slotW = Math.min(Math.ceil(contentW + (H-contentH)), MW)
  if(slotW < contentW) slotW = Math.ceil(contentW)
  slot.style.cssText = `position:relative;display:inline-block;flex:0 0 auto;height:${H}px;width:${slotW}px;overflow:hidden;vertical-align:middle`
  img.style.cssText = `position:absolute;width:${bb.nW*k}px;height:${bb.nH*k}px;max-width:none;`+
    `left:${(-(bb.x*k)+(slotW-contentW)/2)}px;top:${(-(bb.y*k)+(H-contentH)/2)}px`
}
// `src` — data: yoki https: URL. Qaytaradi: tayyor <span> elementi (o'zi
// image yuklanishini kuzatib, bbox-fit qiladi).
export function smartLogoEl(src, { height=40, maxWidth=140, fill=0.86, alt='', className='', title }={}){
  const slot = document.createElement('span')
  slot.className = 'logo-slot ' + className
  if(title) slot.title = title
  slot.style.display = 'inline-block'; slot.style.height = height+'px'
  const img = document.createElement('img')
  img.src = src; img.alt = alt; img.draggable = false
  slot.appendChild(img)
  const run = ()=>{ try{ fitLogo(slot, img, { height, maxWidth, fill }) }catch(e){} }
  if(img.complete && img.naturalWidth) run()
  else { img.addEventListener('load', run, { once:true }); img.addEventListener('error', run, { once:true }) }
  return slot
}

export function trimTransparent(canvas){
  try{
    const w = canvas.width, h = canvas.height
    const ctx = canvas.getContext('2d',{ willReadFrequently:true })
    let d; try{ d = ctx.getImageData(0,0,w,h).data }catch(e){ return canvas }
    let minx=w,miny=h,maxx=-1,maxy=-1,opaque=0
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){ if(d[(y*w+x)*4+3] > 12){ opaque++; if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y } }
    if(maxx < 0) return canvas
    if(opaque/(w*h) > 0.985) return canvas
    const bw = maxx-minx+1, bh = maxy-miny+1
    const pad = Math.round(Math.max(bw,bh)*0.06)
    const out = document.createElement('canvas'); out.width = bw+2*pad; out.height = bh+2*pad
    out.getContext('2d').drawImage(canvas, minx,miny,bw,bh, pad,pad,bw,bh)
    return out
  }catch(e){ return canvas }
}

// Rasm faylini logo sifatida o'qish: CSP-xavfsiz FileReader.readAsDataURL
// (blob: URL EMAS — CSP img-src blob:'ni bloklaydi, xato ko'rinmasdan).
export function resizeImage(file, cb){
  const reader = new FileReader()
  reader.onload = ()=>{
    const img = new Image()
    img.onload = ()=>{
      const max = 360
      let w = img.width, h = img.height
      if(w > max || h > max){ const s = max/Math.max(w,h); w = Math.round(w*s); h = Math.round(h*s) }
      const c = document.createElement('canvas'); c.width = w; c.height = h
      c.getContext('2d',{ willReadFrequently:true }).drawImage(img, 0, 0, w, h)
      const c2 = trimTransparent(c)
      let out = c2.toDataURL('image/png')
      if(out.length > 180*1024) out = c2.toDataURL('image/jpeg', 0.85)
      cb(out)
    }
    img.onerror = ()=> cb(null)
    img.src = reader.result
  }
  reader.onerror = ()=> cb(null)
  reader.readAsDataURL(file)
}

// Xaritadan aniq nuqta tanlash (Leaflet). container ichiga xarita chizadi,
// bosilganda onPick(lat,lng) chaqiradi. Qaytaradi: cleanup() funksiyasi.
export function mountCoordPicker(container, { lat, lng, center, onPick }){
  const L = window.L
  const box = document.createElement('div')
  box.style.cssText = 'height:220px;width:100%;border-radius:10px;overflow:hidden;border:1px solid #e2e4ee'
  container.appendChild(box)
  if(!L){ container.innerHTML = '<div class="err-box">Xarita kutubxonasi yuklanmadi.</div>'; return ()=>{} }
  const start = (typeof lat==='number' && typeof lng==='number') ? [lat,lng] : (center || [41.31,69.28])
  const zoom = (typeof lat==='number') ? 14 : (center ? 10 : 6)
  const map = L.map(box, { zoomControl:true }).setView(start, zoom)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19, attribution:'© OSM' }).addTo(map)
  let marker = (typeof lat==='number' && typeof lng==='number') ? L.marker([lat,lng]).addTo(map) : null
  map.on('click', e=>{
    const { lat:la, lng:ln } = e.latlng
    if(marker) marker.setLatLng([la,ln]); else marker = L.marker([la,ln]).addTo(map)
    onPick && onPick(+la.toFixed(6), +ln.toFixed(6))
  })
  setTimeout(()=>{ try{ map.invalidateSize() }catch(e){} }, 150)
  return function cleanup(){ try{ map.remove() }catch(e){} }
}
