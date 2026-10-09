// HR (yuqoridagi modul tab'i) uchun navigatsiya ro'yxati va sahifa-
// mount'lagichi — Moliya/CRM bo'limlaridagi bilan bir xil naqsh. "Tabel",
// "Ish haqi to'lovlari", "Undiruv" va "Sozlamalar" avvalgi Monitoring
// bo'limidan, "Xodimlar" esa CRM bo'limidan shu yerga ko'chirildi — har
// birining o'z logikasi (tabel.js, payroll.js, staff.js, undiruv.js,
// settings.js) o'zgarishsiz qoladi. Hammasi avvaldan admin uchungina
// ko'rinadigan bo'lgani uchun shu yerda ham adminOnly saqlanadi.
import { escapeHtml } from '../core.js'
import { mountWithCrumb } from './demo-kit.js'
import { mountTabel } from './tabel.js'
import { mountStaff } from './staff.js'
import { mountSettings } from './settings.js'

const IC_TABEL = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 4v4M16 4v4"/><path d="m7.5 14.5 1.5 1.5 2.5-2.5"/></svg>`
const IC_STAFF = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="11" r="2.4"/><path d="M5 17c0-1.8 1.5-3 3-3s3 1.2 3 3"/><path d="M14 9h5M14 13h5"/></svg>`
const IC_SETTINGS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`

export const HR_PAGES = [
  { key:'tabel', label:'Tabel', icon:IC_TABEL, adminOnly:true },
  { key:'staff', label:'Xodimlar', icon:IC_STAFF, adminOnly:true },
  { key:'settings', label:'Sozlamalar', icon:IC_SETTINGS, adminOnly:true },
]

const MOUNTS = { tabel: mountTabel, staff: mountStaff, settings: mountSettings }

export function mountHrContent(root, key, { toast }){
  const entry = HR_PAGES.find(p=>p.key===key) || HR_PAGES[0]
  const mountFn = MOUNTS[key]
  // Yo'l ko'rsatkichi endi shu yerda — har bir sahifa uni o'zi
  // chizmaydi, shuning uchun butun dasturda bir xil turadi.
  if(mountFn) return mountWithCrumb(root, 'HR', entry.label, mountFn, { toast })
  root.innerHTML = `
    <div class="mol-empty">
      <div class="mol-empty-ic">${entry.icon}</div>
      <div style="font-size:15px;font-weight:800">${escapeHtml(entry.label)}</div>
      <div style="color:var(--mut);font-size:13px">Bu bo'lim tez orada qo'shiladi</div>
    </div>
  `
  return function cleanup(){}
}
