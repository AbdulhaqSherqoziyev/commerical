// ===== Demo-kit — namuna (demo) sahifalar uchun umumiy qurilish bloklari =====
//
// DIZAYN: asl ICAN admini (admin.icanbusiness.uz) shabloniga moslangan.
// O'lchamlar o'sha yerdan brauzerda o'lchab olingan: Inter Tight shrifti,
// teal #16B5CA, ixcham jadval (qator 35px), bitta oq kartadagi KPI chizig'i,
// kichik filtr chiplari, punktir chegarali ID, nuqtali status pill'lari.
// CSS: styles.css oxiridagi `.ic-*` bloki.
//
// DIQQAT: bu fayl orqali quriladigan BARCHA sahifalar namuna (demo)
// ma'lumot ko'rsatadi — backend endpointlari hali yo'q. Ma'lumot
// deterministik hash'dan hosil qilinadi, ya'ni qayta chizilganda bir xil
// bo'ladi (Math.random ishlatilmaydi). Filtr, qidiruv va sahifalash
// haqiqiy ishlaydi, lekin faqat shu massiv ustida; hech narsa saqlanmaydi.
//
// Yangi demo sahifa qo'shish: spec obyektini yozib, mountDemoTable yoki
// mountDemoBlocks ga uzatish kifoya.
import { qs, on, escapeHtml } from '../core.js'

// ---------- deterministik "tasodifiy" ----------
export function h32(s){
  let h = 0
  const str = String(s == null ? '' : s)
  for(let i = 0; i < str.length; i++){ h = (h * 31 + str.charCodeAt(i)) | 0 }
  return Math.abs(h)
}
export function rint(seed, min, max){ return min + (h32(seed) % (max - min + 1)) }
export function pick(seed, arr){ return arr[h32(seed) % arr.length] }
export function chance(seed, percent){ return (h32(seed) % 100) < percent }

// ---------- formatlash ----------
export function money(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') }
export function pct(n){ return (Math.round(n * 10) / 10).toFixed(1) + '%' }

const MM = ['01','02','03','04','05','06','07','08','09','10','11','12']
// seed'ga qarab "bugundan N kun oldin" sanasi — demo uchun barqaror
export function dateAgo(seed, maxDaysBack){
  const d = new Date()
  d.setDate(d.getDate() - (h32(seed) % (maxDaysBack + 1)))
  const hh = String(rint(seed + 'h', 8, 19)).padStart(2, '0')
  const mi = String(rint(seed + 'm', 0, 59)).padStart(2, '0')
  return String(d.getDate()).padStart(2, '0') + '.' + MM[d.getMonth()] + ' · ' + hh + ':' + mi
}

// ---------- namunaviy lug'atlar (butun dastur bo'ylab bir xil) ----------
export const FIRST_NAMES = ['Aziz','Dilnoza','Jasur','Malika','Sardor','Nigora','Bobur','Kamola','Otabek','Zilola','Farrux','Gulnora','Shohruh','Umida','Javlon','Sevara','Nodira','Rustam','Sabina','Temur']
export const LAST_NAMES = ['Karimov','Rahimova','Toxtayev','Yusupova','Aliyev','Islomova','Ergashev','Saidova','Nazarov','Xasanova','Qodirov','Mirzayeva','Berdiyev','Tosheva','Raximov','Abdullayeva','Sultonov','Ismoilova','Nabiyev','Yuldosheva']
export const SHOPS = ['Techno Plaza','Idea Market','Mobile House','Smart Savdo','Premium Store','SEVEN MOBILE','iCASE SHOX','Javohir market','EL MART 1','IMRON2','SUSAMBIL','Apple Nukus']
export const REGIONS = ['Toshkent sh.','Toshkent v.','Samarqand','Buxoro','Fargona','Andijon','Namangan','Qashqadaryo','Surxondaryo','Xorazm','Navoiy','Jizzax','Sirdaryo','Qoraqalpogiston']

export function personName(seed){
  return pick(seed + 'f', FIRST_NAMES) + ' ' + pick(seed + 'l', LAST_NAMES)
}
export function phoneNum(seed){
  return '+998 ' + rint(seed + 'p1', 90, 99) + ' ' + rint(seed + 'p2', 100, 999) + '-' + rint(seed + 'p3', 10, 99) + '-' + rint(seed + 'p4', 10, 99)
}

// ---------- kichik HTML bo'laklari ----------
export function demoNote(text){
  const t = text || "Namuna (demo) ma'lumot — backend hali ulanmagan. Filtr, qidiruv va sahifalash ishlaydi, lekin o'zgarishlar saqlanmaydi."
  return '<div class="ic-note">' + escapeHtml(t) + '</div>'
}

// ICAN shablonidagi teal "breadcrumb" chipi: modul nomi + sahifa nomi
export function crumb(mod, page){
  return `<div class="ic-crumb"><b>${escapeHtml(mod)}</b><span>${escapeHtml(page)}</span></div>`
}

// Sahifani yo'l ko'rsatkichi (breadcrumb) bilan birga o'rnatadi.
// Sahifaning o'z mount funksiyasiga tegilmaydi — u alohida idishga
// chiziladi, ustiga esa "MODUL / Sahifa" nishoni qo'yiladi. Shu tufayli
// nishon har bir sahifada emas, faqat modul hub'ida bir marta yoziladi
// va hamma bo'limda bir xil turadi.
export function mountWithCrumb(root, mod, page, mountFn, opts){
  root.innerHTML = crumb(mod, page) + '<div></div>'
  const cleanup = mountFn(root.lastElementChild, opts)
  return typeof cleanup === 'function' ? cleanup : function(){}
}

// Guruhlangan yon menyu (Moliya/Boshqaruv/Xizmatlar) uchun: sahifa kaliti
// bo'yicha "Modul · Guruh" va sahifa nomini topadi.
export function groupCrumb(groups, key, modLabel){
  for(const g of groups){
    if(g.key === key && !g.items) return [modLabel, g.label]
    if(g.items){
      const it = g.items.find(i => i.key === key)
      if(it) return [modLabel + ' · ' + g.label, it.label]
    }
  }
  return [modLabel, key]
}

export function pageHead({ title, sub, actions }){
  const acts = (actions && actions.length)
    ? '<div class="ic-head-act">' + actions.map(a =>
        '<button type="button" class="ic-btn' + (a.ghost ? ' ghost' : '') + '" data-toast="' +
        escapeHtml(a.toast || (a.label + " — demo rejimida ishlamaydi")) + '">' + (a.icon || '') + escapeHtml(a.label) + '</button>'
      ).join('') + '</div>'
    : ''
  return `
    <div class="ic-head">
      <div>
        <div class="ic-title">${escapeHtml(title)}</div>
        ${sub ? `<div class="ic-sub">${escapeHtml(sub)}</div>` : ''}
      </div>
      ${acts}
    </div>
  `
}

// KPI — asl admindagi kabi BITTA oq kartada, ustunlar chiziq bilan ajratilgan,
// birinchi ustun teal fonda ajralib turadi.
// [{ label, val, delta, ic }]
export function kpiRow(items){
  if(!items || !items.length) return ''
  return '<div class="ic-kpis">' + items.map(k => `
    <div class="ic-kpi">
      <div class="ic-kpi-lbl">${escapeHtml(k.label)}</div>
      <div class="ic-kpi-val">${escapeHtml(String(k.val))}</div>
      ${k.delta ? `<div class="ic-kpi-sub">${k.ic || ''}${escapeHtml(k.delta)}</div>` : ''}
    </div>
  `).join('') + '</div>'
}

export function st(text, tone){ return `<span class="ic-st ${tone || 'mut'}">${escapeHtml(text)}</span>` }
export function idBadge(text){ return `<span class="ic-id">${escapeHtml(text)}</span>` }
export function bar(percent){
  const w = Math.max(0, Math.min(100, percent))
  return `<span class="ic-bar"><i style="width:${w}%"></i></span>`
}

// [{ name, val, percent }]
export function barList(items){
  return items.map(b => `
    <div class="ic-barrow">
      <span>${escapeHtml(b.name)}</span>
      ${bar(b.percent)}
      <b>${escapeHtml(String(b.val))}</b>
    </div>
  `).join('')
}

export function card({ title, sub, body, foot, badge }){
  return `
    <div class="ic-card">
      ${title ? `<div class="ic-card-head">
        <div>
          <div class="ic-card-t">${escapeHtml(title)}</div>
          ${sub ? `<div class="ic-card-s">${escapeHtml(sub)}</div>` : ''}
        </div>
        ${badge ? st(badge, 'teal') : ''}
      </div>` : ''}
      ${body || ''}
      ${foot ? `<div class="ic-card-foot">${escapeHtml(foot)}</div>` : ''}
    </div>
  `
}

const IC_SEARCH = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`
export const IC_DL = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>`
export const IC_PLUS = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`

// ---------- asosiy: jadvalli demo sahifa ----------
// spec = {
//   title, sub, note, actions:[{label,icon,ghost,toast}],
//   kpis(rows) -> [...], filters:{ field, values:[...] }, search:[maydonlar],
//   cols:[{ key, label, cls:'num|name', render(row) }],
//   rows:[...], perPage, onRowToast(row), after(rows), metaSum(list)
// }
// Hodisalar root'ga BIR MARTA (delegatsiya bilan) bog'lanadi — ichki HTML
// necha marta qayta chizilsa ham ishlab turadi (core.js'dagi naqsh).
export function mountDemoTable(root, spec, { toast }){
  const all = spec.rows || []
  const perPage = spec.perPage || 12
  let filter = spec.filters ? (spec.filters.values[0] || '') : ''
  let q = ''
  let page = 1

  function visible(){
    let list = all
    if(spec.filters && filter && filter !== spec.filters.values[0]){
      list = list.filter(r => String(r[spec.filters.field]) === filter)
    }
    const needle = q.trim().toLowerCase()
    if(needle){
      const fields = spec.search || spec.cols.map(c => c.key)
      list = list.filter(r => fields.some(f => String(r[f] == null ? '' : r[f]).toLowerCase().includes(needle)))
    }
    return list
  }

  function render(){
    const list = visible()
    const pages = Math.max(1, Math.ceil(list.length / perPage))
    if(page > pages) page = pages
    const slice = list.slice((page - 1) * perPage, page * perPage)

    root.innerHTML = `
      <div class="ic-page">
        ${pageHead({ title: spec.title, sub: spec.sub, actions: spec.actions })}
        ${demoNote(spec.note)}
        ${spec.kpis ? kpiRow(spec.kpis(all)) : ''}
        <div class="ic-toolbar">
          ${spec.filters ? `<div class="ic-chips">${spec.filters.values.map(v =>
            `<button type="button" class="ic-chip${filter === v ? ' on' : ''}" data-flt="${escapeHtml(v)}">${escapeHtml(v)}</button>`
          ).join('')}</div>` : ''}
          <div class="ic-search">${IC_SEARCH}<input id="dk-q" placeholder="Qidirish..." value="${escapeHtml(q)}" /></div>
          <div class="ic-meta"><span>${list.length} topildi</span>${spec.metaSum ? `<span>·</span><b>${escapeHtml(spec.metaSum(list))}</b>` : ''}</div>
        </div>
        <div class="ic-tblwrap">
          <div class="ic-tblscroll">
            <table class="ic-tbl">
              <thead><tr><th class="ic-idx"></th>${spec.cols.map(c => `<th class="${c.cls === 'num' ? 'num' : ''}">${escapeHtml(c.label)}</th>`).join('')}</tr></thead>
              <tbody>
                ${slice.length ? slice.map((r, i) => `
                  <tr class="clk" data-row="${(page - 1) * perPage + i}">
                    <td class="ic-idx">${(page - 1) * perPage + i + 1}</td>
                    ${spec.cols.map(c => `<td class="${c.cls || ''}">${c.render ? c.render(r) : escapeHtml(String(r[c.key] == null ? '' : r[c.key]))}</td>`).join('')}
                  </tr>
                `).join('') : `<tr><td colspan="${spec.cols.length + 1}" style="text-align:center;color:var(--ic-mut);padding:30px 0">Hech narsa topilmadi</td></tr>`}
              </tbody>
            </table>
          </div>
          <div class="ic-pager">
            <button type="button" class="ic-pg" data-pg="prev"${page === 1 ? ' disabled' : ''}>‹</button>
            ${Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(n =>
              `<button type="button" class="ic-pg${n === page ? ' on' : ''}" data-pg="${n}">${n}</button>`
            ).join('')}
            <button type="button" class="ic-pg" data-pg="next"${page === pages ? ' disabled' : ''}>›</button>
          </div>
        </div>
        ${spec.after ? spec.after(all) : ''}
      </div>
    `
  }

  on(root, 'click', '[data-toast]', (e, b) => toast(b.dataset.toast))
  on(root, 'click', '[data-flt]', (e, b) => { filter = b.dataset.flt; page = 1; render() })
  on(root, 'click', '[data-pg]', (e, b) => {
    const v = b.dataset.pg
    const pages = Math.max(1, Math.ceil(visible().length / perPage))
    if(v === 'prev') page = Math.max(1, page - 1)
    else if(v === 'next') page = Math.min(pages, page + 1)
    else page = Number(v)
    render()
  })
  on(root, 'click', 'tr[data-row]', (e, tr) => {
    const row = visible()[Number(tr.dataset.row)]
    if(row) toast(spec.onRowToast ? spec.onRowToast(row) : "Batafsil karta — demo rejimida ochilmaydi")
  })
  // Qidiruvda har harfda qayta chiziladi, shuning uchun kursor joyini
  // qo'lda tiklaymiz (aks holda kursor matn oxiriga sakraydi).
  on(root, 'input', '#dk-q', (e, inp) => {
    q = inp.value
    page = 1
    const pos = inp.selectionStart
    render()
    const again = qs('#dk-q', root)
    if(again){ again.focus(); try{ again.setSelectionRange(pos, pos) }catch(_){} }
  })

  render()
  return function cleanup(){}
}

// ---------- kartali (jadvalsiz) demo sahifa ----------
// spec = { title, sub, note, actions, kpis:[...], blocks: () => html }
export function mountDemoBlocks(root, spec, { toast }){
  root.innerHTML = `
    <div class="ic-page">
      ${pageHead({ title: spec.title, sub: spec.sub, actions: spec.actions })}
      ${demoNote(spec.note)}
      ${spec.kpis ? kpiRow(spec.kpis) : ''}
      ${spec.blocks ? spec.blocks() : ''}
    </div>
  `
  on(root, 'click', '[data-toast]', (e, b) => toast(b.dataset.toast))
  return function cleanup(){}
}
