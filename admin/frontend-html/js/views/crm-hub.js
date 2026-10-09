// CRM (yuqoridagi modul tab'i) uchun navigatsiya ro'yxati va sahifa-
// mount'lagichi — Moliya bo'limidagi moliya.js bilan bir xil naqsh. "Loyihalar",
// "Chatlar", "Qo'ng'iroq", "Kalendar" avvalgi Monitoring bo'limidan shu yerga
// ko'chirildi — har birining o'z logikasi (tasks-projects.js, chats.js,
// calls.js, tasks-calendar.js) o'zgarishsiz qoladi. "Xodimlar" endi HR
// bo'limiga ko'chirildi (hr-hub.js).
import { escapeHtml } from '../core.js'
import { mountWithCrumb } from './demo-kit.js'
import { mountCrmStatistika } from './crm-stats.js'
import { mountTasksProjects } from './tasks-projects.js'
import { mountCrmSotuv } from './crm-sotuv.js'
import { mountChats } from './chats.js'
import { mountCalls } from './calls.js'
import { mountTasksCalendar } from './tasks-calendar.js'

const ic = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"></path></svg>`
const IC_CHATS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.6 8.6 0 0 1-3.9-.9L3 21l1.9-5.2a8.6 8.6 0 0 1-.9-3.9A8.4 8.4 0 0 1 12.5 3a8.4 8.4 0 0 1 8.5 8.5z"/></svg>`
const IC_CALLS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 2.9a2 2 0 0 1-.4 2.1L8 10.1a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.4c.9.4 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg>`
const IC_TCAL = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`

export const CRM_PAGES = [
  { key:'stats', label:'Statistika', icon:ic('M18 20V10M12 20V4M6 20v-6') },
  { key:'crm', label:'CRM', crumbLabel:'Murojaatlar', icon:ic('M3 4h5v16H3zM9.5 4h5v10h-5zM16 4h5v13h-5z') },
  { key:'calls', label:"Qo'ng'iroq", icon:IC_CALLS },
  { key:'chats', label:'Chatlar', icon:IC_CHATS },
  { key:'projects', label:'Loyihalar', icon:ic('M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z') },
  { key:'tcal', label:'Kalendar', icon:IC_TCAL },
]

const MOUNTS = {
  crm: mountCrmSotuv, stats: mountCrmStatistika, projects: mountTasksProjects,
  chats: mountChats, calls: mountCalls, tcal: mountTasksCalendar,
}

export function mountCrmContent(root, key, { toast }){
  const entry = CRM_PAGES.find(p=>p.key===key) || CRM_PAGES[0]
  const mountFn = MOUNTS[key]
  // crumbLabel — yon menyudagi nom nishon uchun yaramasa (masalan "CRM")
  if(mountFn) return mountWithCrumb(root, 'CRM', entry.crumbLabel || entry.label, mountFn, { toast })
  root.innerHTML = `
    <div class="mol-empty">
      <div class="mol-empty-ic">${entry.icon}</div>
      <div style="font-size:15px;font-weight:800">${escapeHtml(entry.label)}</div>
      <div style="color:var(--mut);font-size:13px">Bu bo'lim tez orada qo'shiladi</div>
    </div>
  `
  return function cleanup(){}
}
