import { getUser, getRole } from '../api.js'
import { qs, qsa, on } from '../core.js'
import { mountOrgs } from './orgs.js'
import { mountMap } from './map.js'
import { MOLIYA_GROUPS, mountMoliyaContent } from './moliya.js'
import { CRM_PAGES, mountCrmContent } from './crm-hub.js'
import { HR_PAGES, mountHrContent } from './hr-hub.js'
import { BOSHQARUV_GROUPS, mountBoshqaruvContent } from './boshqaruv-hub.js'
import { XIZMATLAR_GROUPS, mountXizmatlarContent } from './xizmatlar-hub.js'
import { mountProfile } from './profile.js'
import { mountTasksAll } from './tasks-all.js'
import { mountNotifBell } from '../tasksWidgets.js'
import { setCompanyCardTarget, getLastCompanyCardId } from './nav-intent.js'

const IC_MOD_MONEY = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>`
const IC_MOD_SERV = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.5h7"/></svg>`
const IC_MOD_WASYT = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.3"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M17 8.5a3 3 0 1 1 3.2 3M17.5 14.3c2.6.4 4 2 4 5.7"/></svg>`
const IC_MOD_MONITOR = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h4l2.5 7L13 4l2.5 8H22"/></svg>`
const IC_MOD_CTRL = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`
const IC_MOD_CRM = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="5" height="16" rx="1.3"/><rect x="9.5" y="4" width="5" height="10" rx="1.3"/><rect x="16" y="4" width="5" height="13" rx="1.3"/></svg>`
const IC_MOD_HR = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/><path d="M19 8v6M22 11h-6"/></svg>`
const IC_WALLET = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2"/><path d="M18 12h.01"/><path d="M21 9v6a1 1 0 0 1-1 1h-5a3 3 0 0 1 0-6h5a1 1 0 0 1 1 1z"/></svg>`
const IC_SEARCH = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`
// Yon menyu pastidagi kichik boshqaruv paneli (asl ICAN dagi kabi:
// tungi rejim, qidiruv, til) va "Yordam" kartasi uchun ikonkalar.
const IC_MOON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
const IC_HELP = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.9"/><path d="M12 17.5h.01"/></svg>'
const IC_CHEV_R = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'
const IC_COLLAPSE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/></svg>`

const TOP_MODULES = [
  { key:'moliya', label:'Moliya', icon:IC_MOD_MONEY },
  { key:'crm', label:'CRM', icon:IC_MOD_CRM },
  { key:'hr', label:'HR', icon:IC_MOD_HR },
  { key:'xizmatlar', label:'Xizmatlar', icon:IC_MOD_SERV },
  { key:'boshqaruv', label:'Boshqaruv', icon:IC_MOD_CTRL },
  // Asl tizimdagi kabi Wasyt ICHKI MODUL EMAS — alohida mahsulot
  // (do'kon boshqaruvi), yuqoridagi qator esa "ilovalar almashtirgichi".
  // Shuning uchun bu band yangi oynada admin.wasyt.uz ni ochadi.
  { key:'wasyt', label:'Wasyt', icon:IC_MOD_WASYT, ext:'https://admin.wasyt.uz' },
  { key:'monitoring', label:'Monitoring', icon:IC_MOD_MONITOR },
]

const IC_PREZ = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>`
const IC_MAP = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`
const IC_TALL = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="6" height="6" rx="1.2"/><rect x="9.5" y="5" width="6" height="6" rx="1.2"/><rect x="16" y="5" width="5" height="6" rx="1.2"/><rect x="3" y="13" width="6" height="6" rx="1.2"/><rect x="9.5" y="13" width="6" height="6" rx="1.2"/></svg>`
const NAV = [
  { key:'clients', label:'Prezintatsiya', icon:IC_PREZ, mount:mountOrgs },
  { key:'map', label:'Xarita', icon:IC_MAP, mount:mountMap },
  { key:'tall', label:'Umumiy vazifalar', icon:IC_TALL, mount:mountTasksAll, hidden:true },
]

// Dashboard.jsx'ning vanilla JS ko'chirmasi: sidebar + profil menyusi + har
// bir bo'lim uchun asosiy kontent maydoni. Har bir view moduli o'z sarlavha
// qatorini (dash-head) va harakat tugmalarini o'zi chizadi — umumiy "topbar"
// endi shunchaki profil menyusidan iborat (soddalashtirish, ilgarigi
// balans/qidiruv widjetlari har bir Vazifalar sahifasida allaqachon shu
// naqshda ishlatilgan edi).
export function mountShell(root, { toast, onLogout }){
  const user = getUser() || 'admin'
  const role = getRole()
  let view = 'clients'
  let moliyaPage = 'stats'
  let moliyaOpenGroups = new Set()
  let crmPage = 'crm'
  let hrPage = 'staff'
  let boshqaruvPage = 'filiallar'
  let xizmatlarPage = 'imei-new'
  let xizmatlarOpenGroups = new Set()
  // Boshida barcha guruhlar YOPIQ — "Boshqaruv"ga kirilganda yon menyu
  // qisqa va toza ro'yxat bo'lib turadi, kerakli guruhni foydalanuvchi
  // o'zi ochadi (ochilgan holat sessiya davomida saqlanadi).
  let boshqaruvOpenGroups = new Set()
  let profileOpen = false
  let cleanupView = null
  let sidebarCollapsed = false
  let topMod = 'monitoring'
  let notifCleanup = null

  root.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="sb-brand">
          <span class="blogo"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2.2l8.5 4.9v9.8L12 21.8 3.5 16.9V7.1z" fill="currentColor" opacity=".16"/><path d="M12 6.6l4.7 2.7v5.4L12 17.4 7.3 14.7V9.3z" fill="currentColor"/></svg></span>
          <div class="bname"><b>ICAN BUSINESS</b><small>Super Admin</small></div>
          <button class="sb-collapse-btn" id="sb-collapse" title="Yig'ish">${IC_COLLAPSE}</button>
        </div>
        <nav class="sb-nav" id="sb-nav"></nav>
        <div class="sb-foot">
          <div class="sb-tools">
            <button type="button" id="sb-theme" title="Tungi rejim">${IC_MOON}</button>
            <button type="button" id="sb-search" title="Qidirish">${IC_SEARCH}</button>
            <button type="button" id="sb-lang" title="Til">UZ</button>
          </div>
          <button type="button" class="sb-help" id="sb-help">
            <span class="sb-help-ic">${IC_HELP}</span>
            <span class="sb-help-tx"><b>Yordam</b><small>Sizga qanday yordam bera olamiz?</small></span>
            <span class="sb-help-chev">${IC_CHEV_R}</span>
          </button>
        </div>
      </aside>
      <div class="content">
        <header class="dash-top dash-top-mini">
          <div class="topmod-seg" id="topmod-seg">
            ${TOP_MODULES.map(m=> m.ext
              ? `<a class="ext" href="${m.ext}" target="_blank" rel="noopener noreferrer" title="${m.label} — alohida ilova, yangi oynada ochiladi">${m.icon}<span>${m.label}</span></a>`
              : `<button class="${topMod===m.key?'on':''}" data-mod="${m.key}">${m.icon}<span>${m.label}</span></button>`).join('')}
          </div>
          <div class="spacer"></div>
          <div class="topmod-balance">${IC_WALLET} 12 006.39</div>
          <button class="tw-icon" id="top-search-btn" title="Qidirish">${IC_SEARCH}</button>
          <div id="top-notif"></div>
          <button class="prof-btn" id="prof-btn" title="${user}">
            <span class="prof-av">${(user[0]||'A').toUpperCase()}</span>
            <span class="prof-meta"><b>${user}</b><small>${role==='admin'?'Admin':'Xodim'}</small></span>
          </button>
        </header>
        <main class="dash-main" id="dash-main"></main>
        <footer class="dash-foot">Ishlab chiqilgan <a href="https://icanbusiness.uz/" target="_blank" rel="noopener noreferrer">ICAN BUSINESS</a></footer>
      </div>
    </div>
  `

  const main = qs('#dash-main', root)
  const sbNav = qs('#sb-nav', root)
  const profBtn = qs('#prof-btn', root)
  const sidebarEl = qs('.sidebar', root)
  const collapseBtn = qs('#sb-collapse', root)
  const topModSeg = qs('#topmod-seg', root)

  // Yon menyu tepadagi modul segmentiga ("Moliya"/"Monitoring"/...) qarab
  // butunlay boshqa ro'yxat ko'rsatadi — reference dizaynidagi kabi har bir
  // top-tab o'z navigatsiya daraxtiga ega. "Monitoring" — bizning avvaldan
  // qilingan bo'limlarimiz (Prezintatsiya...Sozlamalar), "Moliya" — yangi
  // moliyaviy bo'lim (Statistika/Shartnomalar va h.k.).
  // Guruhlangan yon menyu (asl ICAN adminidagi kabi: guruh sarlavhasi +
  // ochib-yopiladigan ichki bandlar). Moliya, Xizmatlar va Boshqaruv shu
  // ko'rinishda; items:null bo'lgan guruh — bevosita bosiladigan yakka band.
  // attr — banddagi data-atribut nomi, grpAttr — guruh sarlavhasiniki.
  function groupedNav(groups, current, openSet, attr, grpAttr){
    return groups.map(g=>{
      if(!g.items){
        return `<button class="sb-item${current===g.key?' on':''}" ${attr}="${g.key}" title="${g.label}">${g.icon}<span class="sb-label">${g.label}</span></button>`
      }
      const isOpen = openSet.has(g.key)
      return `
        <div class="sb-group${isOpen?' open':''}">
          <button class="sb-group-head" ${grpAttr}="${g.key}" title="${g.label}">
            ${g.icon}<span class="sb-label">${g.label}</span>
            <svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          ${isOpen ? `<div class="sb-group-items">
            ${g.items.map(it=>`<button class="sb-subitem${current===it.key?' on':''}" ${attr}="${it.key}">${it.label}</button>`).join('')}
          </div>` : ''}
        </div>`
    }).join('')
  }

  function renderSidebar(){
    if(topMod === 'moliya'){
      sbNav.innerHTML = groupedNav(MOLIYA_GROUPS, moliyaPage, moliyaOpenGroups, 'data-molpage', 'data-molgroup')
    }else if(topMod === 'crm'){
      sbNav.innerHTML = CRM_PAGES.map(p=>
        (!p.adminOnly || role==='admin') ? `<button class="sb-item${p.key===crmPage?' on':''}" data-crmpage="${p.key}" title="${p.label}">${p.icon}<span class="sb-label">${p.label}</span></button>` : ''
      ).join('')
    }else if(topMod === 'hr'){
      sbNav.innerHTML = HR_PAGES.map(p=>
        (!p.adminOnly || role==='admin') ? `<button class="sb-item${p.key===hrPage?' on':''}" data-hrpage="${p.key}" title="${p.label}">${p.icon}<span class="sb-label">${p.label}</span></button>` : ''
      ).join('')
    }else if(topMod === 'monitoring'){
      sbNav.innerHTML = NAV.map(n=> n.hidden ? '' : n.sep ? `<div style="height:1px;background:var(--line);margin:8px 10px"></div>` :
        (!n.adminOnly || role==='admin') ? `<button class="sb-item${n.key===view && !profileOpen?' on':''}" data-view="${n.key}" title="${n.label}">${n.icon}<span class="sb-label">${n.label}</span></button>` : '').join('')
    }else if(topMod === 'xizmatlar'){
      sbNav.innerHTML = groupedNav(XIZMATLAR_GROUPS, xizmatlarPage, xizmatlarOpenGroups, 'data-xizpage', 'data-xizgroup')
    }else if(topMod === 'boshqaruv'){
      // "Boshqaruv" — guruhlangan (ochib-yopiladigan) sidebar: har bir
      // guruh sarlavhasi bosilganda ichidagi bandlar ko'rinadi/yashiriladi.
      // "Hamkor" kabi items:null guruhlar bevosita bosiladigan tugma.
      sbNav.innerHTML = BOSHQARUV_GROUPS.map(g=>{
        if(!g.items){
          return `<button class="sb-item${boshqaruvPage===g.key?' on':''}" data-bpage="${g.key}" title="${g.label}">${g.icon}<span class="sb-label">${g.label}</span></button>`
        }
        const isOpen = boshqaruvOpenGroups.has(g.key)
        return `
          <div class="sb-group${isOpen?' open':''}">
            <button class="sb-group-head" data-bgroup="${g.key}" title="${g.label}">
              ${g.icon}<span class="sb-label">${g.label}</span>
              <svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            ${isOpen ? `<div class="sb-group-items">
              ${g.items.map(it=>`<button class="sb-subitem${boshqaruvPage===it.key?' on':''}" data-bpage="${it.key}">${it.label}</button>`).join('')}
            </div>` : ''}
          </div>
        `
      }).join('')
    }else{
      sbNav.innerHTML = `<div style="padding:14px 10px;color:var(--mut);font-size:12.5px;font-weight:700">Tez orada qo'shiladi</div>`
    }
  }

  collapseBtn.addEventListener('click', ()=>{
    sidebarCollapsed = !sidebarCollapsed
    sidebarEl.classList.toggle('collapsed', sidebarCollapsed)
  })

  on(topModSeg, 'click', 'button[data-mod]', (e,btn)=>{
    topMod = btn.dataset.mod
    qsa('button[data-mod]', topModSeg).forEach(b=> b.classList.toggle('on', b.dataset.mod===topMod))
    profileOpen = false
    renderMain()
  })

  // Sahifalar bir-birini ocha olishi uchun umumiy "o'tish" hodisasi.
  // Masalan Filiallar jadvalidagi "Tashkilot kartasi" tugmasi:
  //   document.dispatchEvent(new CustomEvent('ic:nav',
  //     { detail:{ mod:'boshqaruv', page:'filial-kartasi' } }))
  // Shu tariqa view modullari shell'ning ichki holatiga tegmaydi.
  const PAGE_SETTER = {
    moliya: k => { moliyaPage = k },
    crm: k => { crmPage = k },
    hr: k => { hrPage = k },
    boshqaruv: k => {
      boshqaruvPage = k
      // Band qaysi guruhda bo'lsa — o'sha guruh ochilib, yon menyuda
      // belgilanib turadi (aks holda tanlangan band ko'rinmay qolardi).
      const g = BOSHQARUV_GROUPS.find(x => x.items && x.items.some(i => i.key === k))
      if(g) boshqaruvOpenGroups.add(g.key)
    },
    xizmatlar: k => { xizmatlarPage = k },
    monitoring: k => { view = k },
  }
  function handleNav(e){
    const d = (e && e.detail) || {}
    if(!d.mod) return
    topMod = d.mod
    const set = PAGE_SETTER[d.mod]
    if(d.page && set) set(d.page)
    qsa('button[data-mod]', topModSeg).forEach(b => b.classList.toggle('on', b.dataset.mod === topMod))
    profileOpen = false
    renderMain()
    main.scrollTop = 0
    window.scrollTo(0, 0)
  }
  document.addEventListener('ic:nav', handleNav)

  qs('#top-search-btn', root).addEventListener('click', ()=>{ toast && toast("Qidiruv tez orada qo'shiladi") })
  // Pastki panel tugmalari — hali funksiyasi yo'q, shuning uchun ochiq aytamiz
  qs('#sb-theme', root).addEventListener('click', ()=>{ toast && toast("Tungi rejim tez orada qo'shiladi") })
  qs('#sb-search', root).addEventListener('click', ()=>{ toast && toast("Qidiruv tez orada qo'shiladi") })
  qs('#sb-lang', root).addEventListener('click', ()=>{ toast && toast("Til almashtirish tez orada qo'shiladi") })
  qs('#sb-help', root).addEventListener('click', ()=>{ toast && toast("Yordam bo'limi tez orada qo'shiladi") })

  notifCleanup = mountNotifBell(qs('#top-notif', root), {
    onOpenTaskId(id){ topMod = 'monitoring'; view = 'tall'; profileOpen = false; renderMain() }
  })

  // ---- Manzil (URL) bilan bog'lash --------------------------------------
  // Ilgari sahifa yangilansa dastur doim boshiga (Prezintatsiya) qaytardi,
  // chunki joriy bo'lim hech qayerda saqlanmasdi. Endi u manzilda turadi:
  //   #boshqaruv/filiallar , #moliya/stats , #boshqaruv/filial-kartasi/<id>
  // Shu tufayli yangilash ham, brauzerning "orqaga" tugmasi ham ishlaydi.
  let hashYozilmoqda = false

  function joriySahifa(){
    if(topMod === 'moliya') return moliyaPage
    if(topMod === 'crm') return crmPage
    if(topMod === 'hr') return hrPage
    if(topMod === 'boshqaruv') return boshqaruvPage
    if(topMod === 'xizmatlar') return xizmatlarPage
    return view
  }

  function hashYoz(){
    let h = '#' + topMod + '/' + joriySahifa()
    // Tashkilot kartasi aynan qaysi filialniki ekani ham saqlanadi
    if(topMod === 'boshqaruv' && boshqaruvPage === 'filial-kartasi' && getLastCompanyCardId()) h += '/' + getLastCompanyCardId()
    if(location.hash === h) return
    hashYozilmoqda = true
    try{ history.replaceState(null, '', h) }catch(e){ location.hash = h }
    hashYozilmoqda = false
  }

  // Manzildan holatni tiklaydi. Nomaʼlum bo'lim bo'lsa hech narsa qilmaydi
  // — noto'g'ri havola bilan bo'sh ekran chiqmasligi uchun.
  function hashOqi(){
    const q = String(location.hash || '').replace(/^#/, '').split('/').filter(Boolean)
    if(!q.length) return false
    const mod = q[0], sahifa = q[1]
    if(!['moliya','crm','hr','xizmatlar','boshqaruv','monitoring'].includes(mod)) return false
    topMod = mod
    if(sahifa && PAGE_SETTER[mod]) PAGE_SETTER[mod](sahifa)
    if(mod === 'boshqaruv' && sahifa === 'filial-kartasi' && q[2]) setCompanyCardTarget(q[2])
    return true
  }

  function renderMain(){
    if(cleanupView){ try{ cleanupView() }catch(e){} cleanupView = null }
    main.innerHTML = ''
    renderSidebar()
    profBtn.classList.toggle('on', profileOpen)
    if(profileOpen){
      cleanupView = mountProfile(main, { user, role, toast, onClose(){ profileOpen = false; renderMain() }, onLogout })
      return
    }
    if(topMod === 'moliya'){
      // Sahifalar endi o'z sarlavhasini (ic-head) chizadi — modul nomi takrorlanmaydi
      main.innerHTML = `<div id="mol-content"></div>`
      cleanupView = mountMoliyaContent(qs('#mol-content', main), moliyaPage, { toast })
    }else if(topMod === 'crm'){
      main.innerHTML = `<div id="crmhub-content"></div>`
      cleanupView = mountCrmContent(qs('#crmhub-content', main), crmPage, { toast })
    }else if(topMod === 'hr'){
      main.innerHTML = `<div id="hrhub-content"></div>`
      cleanupView = mountHrContent(qs('#hrhub-content', main), hrPage, { toast })
    }else if(topMod === 'monitoring'){
      const entry = NAV.find(n=>n.key===view)
      if(entry) cleanupView = entry.mount(main, { toast, role, user })
    }else if(topMod === 'boshqaruv'){
      main.innerHTML = `<div id="boshqaruv-content"></div>`
      cleanupView = mountBoshqaruvContent(qs('#boshqaruv-content', main), boshqaruvPage, { toast })
    }else if(topMod === 'xizmatlar'){
      main.innerHTML = `<div id="xizmatlar-content"></div>`
      cleanupView = mountXizmatlarContent(qs('#xizmatlar-content', main), xizmatlarPage, { toast })
    }else{
      main.innerHTML = `<div class="mol-empty" style="margin-top:20px"><div style="font-size:15px;font-weight:800">Tez orada</div><div style="color:var(--mut);font-size:13px;margin-top:4px">Bu bo'lim hali qo'shilmagan</div></div>`
    }
    hashYoz()
  }

  on(sbNav, 'click', '.sb-item, .sb-subitem', (e, btn)=>{
    profileOpen = false
    if(btn.dataset.view){ view = btn.dataset.view; renderMain() }
    else if(btn.dataset.molpage){ moliyaPage = btn.dataset.molpage; renderMain() }
    else if(btn.dataset.crmpage){ crmPage = btn.dataset.crmpage; renderMain() }
    else if(btn.dataset.hrpage){ hrPage = btn.dataset.hrpage; renderMain() }
    else if(btn.dataset.bpage){ boshqaruvPage = btn.dataset.bpage; renderMain() }
    else if(btn.dataset.xizpage){ xizmatlarPage = btn.dataset.xizpage; renderMain() }
  })
  on(sbNav, 'click', '.sb-group-head', (e, btn)=>{
    if(btn.dataset.molgroup){ const k=btn.dataset.molgroup; moliyaOpenGroups.has(k)?moliyaOpenGroups.delete(k):moliyaOpenGroups.add(k); renderSidebar(); return }
    if(btn.dataset.xizgroup){ const k=btn.dataset.xizgroup; xizmatlarOpenGroups.has(k)?xizmatlarOpenGroups.delete(k):xizmatlarOpenGroups.add(k); renderSidebar(); return }
    const k = btn.dataset.bgroup
    if(boshqaruvOpenGroups.has(k)) boshqaruvOpenGroups.delete(k); else boshqaruvOpenGroups.add(k)
    renderSidebar()
  })
  profBtn.addEventListener('click', ()=>{ profileOpen = true; renderMain() })

  hashOqi()
  // Brauzerning orqaga/oldinga tugmalari (yoki qo'lda manzil o'zgarishi)
  function handleHash(){
    if(hashYozilmoqda) return
    if(hashOqi()){
      qsa('button[data-mod]', topModSeg).forEach(b => b.classList.toggle('on', b.dataset.mod === topMod))
      profileOpen = false
      renderMain()
    }
  }
  window.addEventListener('hashchange', handleHash)

  renderMain()

  return function cleanup(){
    document.removeEventListener('ic:nav', handleNav)
    window.removeEventListener('hashchange', handleHash)
    if(cleanupView){ try{ cleanupView() }catch(e){} }
    if(notifCleanup){ try{ notifCleanup() }catch(e){} }
  }
}
