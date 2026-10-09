import { api, getToken, setToken, tokenValid, getUser, getRole, DOMAIN } from './api.js'
import { qs, on, toast } from './core.js'
import { mountLogin } from './views/login.js'
import { mountShell } from './views/shell.js'

const root = qs('#root')

let authed = getToken() ? tokenValid() : false
if(getToken() && !tokenValid()) setToken(null)

let cleanupShell = null

function renderApp(){
  if(cleanupShell){ try{ cleanupShell() }catch(e){} cleanupShell = null }
  root.innerHTML = ''
  if(authed){
    cleanupShell = mountShell(root, { toast, onLogout: logout })
  } else {
    mountLogin(root, { onLogin(){ authed = true; renderApp() } })
  }
}

function logout(){
  setToken(null)
  authed = false
  renderApp()
}

// Sessiya tugasa yoki bekor qilinsa (401) — avtomatik Login sahifasiga qaytish
window.addEventListener('zood-auth-expired', ()=>{ if(authed){ authed = false; renderApp() } })
// boshqa tab'da chiqilsa (token o'chsa) — bu tab ham chiqadi
window.addEventListener('storage', e=>{ if(e.key==='zood-admin-token' && !e.newValue && authed){ authed = false; renderApp() } })

// Harakatsizlik (idle) timeout — 30 daqiqa hech narsa qilinmasa avtomatik
// chiqish. Bu ATAYIN qo'yilgan xavfsizlik chorasi: super admin paneli
// qarovsiz ochiq qolmasin.
//
// Ilgari chiqish OGOHLANTIRISHSIZ bo'lardi — foydalanuvchi uchun bu
// "dastur o'z-o'zidan chiqib ketdi" bo'lib ko'rinardi. Endi tugashiga
// bir daqiqa qolganda xabar chiqadi (har idle davri uchun bir marta).
const IDLE = 30*60*1000
const IDLE_WARN = 60*1000        // tugashiga shuncha qolganda ogohlantiramiz
let lastActive = Date.now()
let idleWarned = false
;['mousedown','keydown','touchstart','scroll','pointerdown'].forEach(ev=>{
  window.addEventListener(ev, ()=>{ lastActive = Date.now(); idleWarned = false }, { passive:true })
})
setInterval(()=>{
  if(!authed) return
  const idle = Date.now() - lastActive
  if(idle > IDLE) return logout()
  if(idle > IDLE - IDLE_WARN && !idleWarned){
    idleWarned = true
    toast("Harakatsizlik: 1 daqiqadan so'ng tizimdan chiqiladi — davom etish uchun sahifani bosing")
  }
}, 10*1000)

// Boshqa tab'da qaytadan kirilsa, bu tab ham tiklansin. Ilgari bu tab
// login oynasida qolib ketardi (localStorage'da yaroqli token turgan
// bo'lsa ham) va foydalanuvchi ikkinchi marta parol kiritishiga to'g'ri
// kelardi.
window.addEventListener('storage', e=>{
  if(e.key !== 'zood-admin-token' || !e.newValue || authed) return
  // api.js ichidagi token nusxasi bu tab'da eski — avval yangilaymiz,
  // aks holda tokenValid() eski (null) qiymatni tekshirardi.
  setToken(e.newValue)
  if(tokenValid()){
    authed = true
    lastActive = Date.now()
    idleWarned = false
    renderApp()
  }
})

renderApp()
