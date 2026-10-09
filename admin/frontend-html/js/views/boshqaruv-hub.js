// "Boshqaruv" (yuqoridagi modul tab'i) uchun navigatsiya ro'yxati — sidebar
// tuzilishi (guruh sarlavhalari + ichki bandlar). "Filiallar" guruhidagi
// "Filiallar" bandi — avvalgi Monitoring bo'limidagi "Mijozlar" (clients.js)
// shu yerga ko'chirildi (o'zi o'zgarishsiz). Qolgan 16 ta band esa
// boshqaruv-demo.js da NAMUNA (demo) ma'lumot bilan ishlaydi — backend
// tayyor bo'lganda faqat ma'lumot manbasini almashtirish kifoya.
import { escapeHtml } from '../core.js'
import { mountWithCrumb, groupCrumb } from './demo-kit.js'
import { mountClients } from './clients.js'
import { BOSHQARUV_DEMO_MOUNTS } from './boshqaruv-demo.js'
import { mountCompanyCard } from './boshqaruv-company.js'

const IC_FILIALLAR = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/><path d="M9 12h.01M15 12h.01M9 9h.01M15 9h.01"/></svg>`
const IC_KIRISH = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M7 14h4M7 17h7"/></svg>`
const IC_LIMIT = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z"/><path d="M12 7v5l3.5 2"/></svg>`
const IC_HAMKOR = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m8 12 2.5 2.5L16 9"/><path d="M3 7.5 8 4l3 2M21 7.5 16 4l-3 2"/><path d="M3 7.5v6c0 3.5 3 5.5 5.5 6.5M21 7.5v6c0 3.5-3 5.5-5.5 6.5"/></svg>`
const IC_HUDUD = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6.5-9 12-9 12s-9-5.5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="2.8"/></svg>`
const IC_FOYD = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
const IC_TIZIM = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`

// items:null bo'lgan guruh — o'zi bevosita bosiladigan band (chevron/ichki
// ro'yxatsiz), masalan "Hamkor". items bo'lgan guruh — sichqoncha bilan
// ochib-yopiladigan (expand/collapse) bo'lim sarlavhasi.
export const BOSHQARUV_GROUPS = [
  // Eslatma: 'filial-kartasi' (Tashkilot kartasi) yon menyuda ATAYIN yo'q —
  // u Filiallar jadvalidagi qatordan ochiladi (asl ICAN da ham shunday).
  // Sahifaning o'zi MOUNTS da qoladi, ic:nav orqali ochilaveradi.
  { key:'filiallar', label:'Filiallar', icon:IC_FILIALLAR, items:[
    { key:'filiallar', label:'Filiallar' },
    { key:'filial-tranzaksiyalari', label:'Filial tranzaksiyalari' },
    { key:'banklar', label:'Banklar' },
  ]},
  { key:'kirish-shablon', label:'Kirishlar va shablonlar', icon:IC_KIRISH, items:[
    { key:'ican-kirish', label:'ICAN kirish' },
    { key:'sms-shablon', label:'SMS shablon' },
  ]},
  { key:'ican-limiti', label:'iCAN Limiti', icon:IC_LIMIT, items:[
    { key:'balans-limiti', label:'Balans limiti' },
    { key:'xarajatlar', label:'Xarajatlar' },
    { key:'tarif', label:'Tarif' },
  ]},
  { key:'hamkor', label:'Hamkor', icon:IC_HAMKOR, items:null },
  { key:'hudud', label:'Hudud', icon:IC_HUDUD, items:[
    { key:'hudud', label:'Hudud' },
    { key:'tuman', label:'Tuman' },
    { key:'mfy', label:'MFY' },
  ]},
  { key:'foydalanuvchilar', label:'Foydalanuvchilar', icon:IC_FOYD, items:[
    { key:'foydalanuvchilar', label:'Foydalanuvchilar' },
    { key:'hujjat', label:'Hujjat' },
    { key:'roli', label:'Roli' },
    { key:'profil', label:'Profil' },
    { key:'bildirishnomalar', label:'Bildirishnomalar' },
  ]},
  { key:'tizim', label:'Tizim', icon:IC_TIZIM, items:[
    { key:'tizim-sozlamalari', label:'Tizim sozlamalari' },
    { key:'tizim-versiyasi', label:'Tizim versiyasi' },
  ]},
]

function findLabel(key){
  for(const g of BOSHQARUV_GROUPS){
    if(g.key===key && !g.items) return { label:g.label, icon:g.icon }
    if(g.items){ const it = g.items.find(i=>i.key===key); if(it) return { label:it.label, icon:g.icon } }
  }
  return { label:key, icon:'' }
}

// Barcha bandlar ulangan: "Filiallar" — clients.js (haqiqiy), qolgan 16 tasi
// boshqaruv-demo.js dagi NAMUNA (demo) sahifalar. Placeholder faqat noma'lum
// kalit kelib qolsa ko'rsatiladi.
const MOUNTS = { filiallar: mountClients, 'filial-kartasi': mountCompanyCard, ...BOSHQARUV_DEMO_MOUNTS }

export function mountBoshqaruvContent(root, key, { toast }){
  const mountFn = MOUNTS[key]
  // "Tashkilot kartasi" o'z nishonini chizadi (unda jadvalga qaytish
  // havolasi bor), shuning uchun unga qo'shimcha nishon qo'yilmaydi.
  if(key === 'filial-kartasi') return mountFn(root, { toast })
  if(mountFn){
    const [mod, page] = groupCrumb(BOSHQARUV_GROUPS, key, 'Boshqaruv')
    return mountWithCrumb(root, mod, page, mountFn, { toast })
  }
  const { label, icon } = findLabel(key)
  root.innerHTML = `
    <div class="mol-empty">
      <div class="mol-empty-ic">${icon}</div>
      <div style="font-size:15px;font-weight:800">${escapeHtml(label)}</div>
      <div style="color:var(--mut);font-size:13px">Bu bo'lim tez orada qo'shiladi</div>
    </div>
  `
  return function cleanup(){}
}
