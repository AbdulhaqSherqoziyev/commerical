// Kichik "framework-lite" yordamchilari — React o'rniga oddiy DOM bilan
// ishlash uchun. Har bir view o'z konteyneriga BIR MARTA delegatsiya
// (event delegation) o'rnatadi — shundan keyin konteyner ichidagi HTML
// necha marta qayta chizilsa ham (innerHTML orqali), listenerlar ishlab
// turaveradi (chunki ular konteynerning o'ziga, bolalariga emas, biriktirilgan).
export function qs(sel, root){ return (root||document).querySelector(sel) }
export function qsa(sel, root){ return Array.from((root||document).querySelectorAll(sel)) }

export function on(root, event, selector, handler){
  root.addEventListener(event, e=>{
    let node = e.target
    while(node && node !== root){
      if(node.matches && node.matches(selector)){ handler(e, node); return }
      node = node.parentElement
    }
  })
}

export function escapeHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
}

// Kichik reaktivlik: bir nechta "store" obyektlarini kuzatib, o'zgarganda
// berilgan render funksiyasini chaqiradi. Katta framework emas — shunchaki
// state o'zgarsa qayta chizish uchun qulay yorliq.
export function createStore(initial){
  let state = { ...initial }
  const subs = new Set()
  return {
    get(){ return state },
    set(patch){ state = { ...state, ...(typeof patch==='function' ? patch(state) : patch) }; subs.forEach(fn=>fn(state)) },
    subscribe(fn){ subs.add(fn); return ()=>subs.delete(fn) },
  }
}

export function toastHost(){
  let el = qs('#toast-host')
  if(!el){ el = document.createElement('div'); el.id = 'toast-host'; el.className = 'toast'; document.body.appendChild(el) }
  return el
}
let toastTimer = null
export function toast(msg){
  const el = toastHost()
  el.textContent = msg
  el.classList.add('on')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(()=> el.classList.remove('on'), 2400)
}

export function debounce(fn, ms){
  let t = null
  return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), ms) }
}
