import React, { useRef, useEffect } from 'react'

/*
  SmartLogo — universal logo normalizatsiya.
  Muammo: yuklangan logolarda har xil SHAFFOF (transparent) chekka bo'sh joy bo'ladi.
  Shu sababli CSS height bir xil bo'lsa ham, logo VIZUAL jihatdan kichik/katta ko'rinadi.
  Yechim: logoning ko'rinadigan (alfa) chegarasini o'lchab, uni slot ichida
  bir xil vizual o'lchamga moslab, markazga joylashtiramiz. Shaffof padding kompensatsiya qilinadi.
  Alfa o'lchab bo'lmasa (JPG/opaque) — oddiy object-fit:contain ga qaytadi (buzilmaydi).
*/
function measureAlphaBBox(img){
  try{
    const nW = img.naturalWidth, nH = img.naturalHeight
    if(!nW || !nH) return null
    const S = Math.min(1, 128/Math.max(nW,nH))
    const w = Math.max(1,Math.round(nW*S)), h = Math.max(1,Math.round(nH*S))
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const ctx = c.getContext('2d',{ willReadFrequently:true }); ctx.drawImage(img,0,0,w,h)
    let d; try{ d = ctx.getImageData(0,0,w,h).data }catch(e){ return null } // tainted -> null
    let minx=w,miny=h,maxx=-1,maxy=-1,opaque=0
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){ if(d[(y*w+x)*4+3] > 12){ opaque++; if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y } }
    if(maxx < 0) return null
    if(opaque/(w*h) > 0.985) return null // deyarli shaffof emas -> contain
    return { x:minx/S, y:miny/S, w:(maxx-minx+1)/S, h:(maxy-miny+1)/S, nW, nH }
  }catch(e){ return null }
}

function fitLogo(slot, img, { height, maxWidth, fill }){
  const H = height||40, MW = maxWidth||140, FILL = (fill==null?0.86:fill)
  const bb = measureAlphaBBox(img)
  if(!bb){
    slot.style.cssText = `display:inline-flex;align-items:center;justify-content:center;height:${H}px;overflow:visible;vertical-align:middle`
    img.style.cssText = `position:static;height:${Math.round(H*FILL)}px;width:auto;max-width:${MW}px;object-fit:contain`
    slot.setAttribute('data-fit','contain'); return
  }
  let k = (H*FILL)/bb.h
  if(bb.w*k > MW*FILL) k = (MW*FILL)/bb.w
  const contentW = bb.w*k, contentH = bb.h*k
  let slotW = Math.min(Math.ceil(contentW + (H-contentH)), MW)
  if(slotW < contentW) slotW = Math.ceil(contentW)
  slot.style.cssText = `position:relative;display:inline-block;flex:0 0 auto;height:${H}px;width:${slotW}px;overflow:hidden;vertical-align:middle`
  img.style.cssText = `position:absolute;width:${bb.nW*k}px;height:${bb.nH*k}px;max-width:none;`+
    `left:${(-(bb.x*k)+(slotW-contentW)/2)}px;top:${(-(bb.y*k)+(H-contentH)/2)}px`
  slot.setAttribute('data-fit','bbox')
}

export default function SmartLogo({ src, height=40, maxWidth=140, fill=0.86, alt='', className='', title }){
  const slotRef = useRef(null), imgRef = useRef(null)
  useEffect(()=>{
    const img = imgRef.current, slot = slotRef.current
    if(!img || !slot) return
    let done = false
    const run = ()=>{ if(done) return; done = true; try{ fitLogo(slot, img, { height, maxWidth, fill }) }catch(e){} }
    if(img.complete && img.naturalWidth) run()
    else { img.addEventListener('load', run, { once:true }); img.addEventListener('error', run, { once:true }) }
    return ()=>{ if(img){ img.removeEventListener('load', run); img.removeEventListener('error', run) } }
  }, [src, height, maxWidth, fill])
  return (
    <span ref={slotRef} className={'logo-slot '+className} title={title} style={{ display:'inline-block', height }}>
      <img ref={imgRef} src={src} alt={alt} draggable={false} />
    </span>
  )
}

// Yuklashda: shaffof chekkalarni kesib, bir xil breathing padding qo'shadi (root fix — yangi yuklamalar toza saqlanadi).
export function trimTransparent(canvas){
  try{
    const w = canvas.width, h = canvas.height
    const ctx = canvas.getContext('2d',{ willReadFrequently:true })
    let d; try{ d = ctx.getImageData(0,0,w,h).data }catch(e){ return canvas }
    let minx=w,miny=h,maxx=-1,maxy=-1,opaque=0
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){ if(d[(y*w+x)*4+3] > 12){ opaque++; if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y } }
    if(maxx < 0) return canvas                       // butunlay shaffof -> tegmaymiz
    if(opaque/(w*h) > 0.985) return canvas           // shaffof padding yo'q -> tegmaymiz
    const bw = maxx-minx+1, bh = maxy-miny+1
    const pad = Math.round(Math.max(bw,bh)*0.06)     // bir xil 6% breathing
    const out = document.createElement('canvas'); out.width = bw+2*pad; out.height = bh+2*pad
    out.getContext('2d').drawImage(canvas, minx,miny,bw,bh, pad,pad,bw,bh)
    return out
  }catch(e){ return canvas }
}
