import { api } from '../api.js'
import { qs, escapeHtml } from '../core.js'

// Tabel — oylik davomat jadvali. DIQQAT: kunlik holat (kelgan/kech
// qolgan/kelmagan) uchun hali backend (davomat tizimi) yo'q — shuning
// uchun o'tgan kunlar uchun xodimga bog'liq, doimiy (har safar bir xil)
// NAMUNA (demo) holat ko'rsatiladi — haqiqiy davomat emas. Kelajakdagi
// kunlar bo'sh turadi (hali sodir bo'lmagan). "Dam olish" (yakshanba)
// kunlari esa haqiqiy taqvimga asosan avtomatik belgilanadi. Backend
// tayyor bo'lganda kataklarni haqiqiy holat bilan to'ldirish kifoya.

export const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']
const WEEKDAYS_UZ = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba']

function hashStr(s){
  let h = 0
  const str = String(s||'')
  for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0 }
  return Math.abs(h)
}

export function ymNow(){
  const d = new Date()
  return { y: d.getFullYear(), m: d.getMonth() }
}
function pad2(n){ return String(n).padStart(2,'0') }
function ymToInputValue(y,m){ return `${y}-${pad2(m+1)}` }

// Bitta xodim + bitta kun uchun holatni hisoblaydi: 'off' | 'none' | 'present' | 'late' | 'absent'
// O'tgan (va bugungi) kunlar uchun xodimga bog'liq, doimiy namuna (demo)
// qiymat ko'rsatiladi; hali sodir bo'lmagan (kelasi) kunlar bo'sh ('none')
// qoladi; yakshanba har doim "dam olish" bo'lib qoladi.
export function dayStatus(empKey, y, m, day){
  const dow = new Date(y,m,day).getDay()
  if(dow===0) return 'off'
  const cellDate = new Date(y,m,day)
  const today = new Date(); today.setHours(0,0,0,0)
  if(cellDate > today) return 'none'
  const r = hashStr(empKey+'-'+day) % 100
  if(r < 8) return 'absent'
  if(r < 22) return 'late'
  return 'present'
}

export function rowSummary(empKey, y, m, daysInMonth){
  let kun = 0, kech = 0, kelmagan = 0
  for(let d=1; d<=daysInMonth; d++){
    const st = dayStatus(empKey, y, m, d)
    if(st==='present' || st==='late') kun++
    if(st==='late') kech++
    if(st==='absent') kelmagan++
  }
  const soat = kun>0 ? kun*8 + (hashStr(empKey+'-soat')%20) : 0
  const kelgan = kun - kech // faqat o'z vaqtida kelgan kunlar (kech qolganlarsiz)
  return { kun, kech, kelmagan, kelgan, soat }
}

export function mountTabel(root, { toast }){
  let staff = null, err = ''
  let { y, m } = ymNow()

  async function load(){
    try{ staff = (await api.staffList()).filter(s=>s.active); err = '' }
    catch(ex){ err = ex.error || 'Xatolik' }
    render()
  }

  function exportExcel(){
    const X = window.XLSX // kutubxona global `XLSX` nomi bilan yuklanadi
    if(!X){ toast("Excel kutubxonasi yuklanmadi"); return }
    const daysInMonth = new Date(y, m+1, 0).getDate()
    const head = ['Xodim', ...Array.from({length:daysInMonth},(_,i)=>String(i+1)), 'Kun','Kech','Kelmagan','Soat']
    const rows = (staff||[]).map(s=>{
      const empKey = s.id||s.login
      const name = [s.lastName, s.firstName].filter(Boolean).join(' ').toUpperCase() || s.login
      const cells = Array.from({length:daysInMonth},(_,i)=>{
        const st = dayStatus(empKey, y, m, i+1)
        return st==='off' ? 'D' : st==='present' ? '✓' : st==='late' ? 'K' : st==='absent' ? 'X' : ''
      })
      const { kun, kech, kelmagan, soat } = rowSummary(empKey, y, m, daysInMonth)
      return [name, ...cells, kun||'', kech||'', kelmagan||'', soat||'']
    })
    const aoa = [head, ...rows]
    const ws = X.utils.aoa_to_sheet(aoa)
    ws['!cols'] = [{wch:22}, ...Array.from({length:daysInMonth},()=>({wch:4})), {wch:6},{wch:6},{wch:10},{wch:6}]
    const wb = X.utils.book_new()
    X.utils.book_append_sheet(wb, ws, 'Tabel')
    X.writeFile(wb, `tabel_${MONTHS_UZ[m]}_${y}.xlsx`)
  }

  function render(){
    const daysInMonth = new Date(y, m+1, 0).getDate()
    const days = Array.from({length:daysInMonth},(_,i)=>i+1)
    const monthLabel = `${MONTHS_UZ[m]} ${y}`
    const now = new Date()
    const isCurrentMonth = now.getFullYear()===y && now.getMonth()===m
    const todayDow = WEEKDAYS_UZ[now.getDay()]
    const todayIsOff = now.getDay()===0

    root.innerHTML = `
      <div class="dash-head" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <h2>Tabel</h2>
          <div style="color:var(--mut);font-size:12.5px;font-weight:700;margin-top:2px">${monthLabel}${isCurrentMonth?` · bugun ${todayDow}${todayIsOff?' — dam olish':''}`:''}</div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <input type="month" id="tb-month" value="${ymToInputValue(y,m)}" style="border:1.5px solid var(--line);border-radius:11px;padding:9px 12px;font:700 13px system-ui,sans-serif;color:var(--ink);background:#fff" />
          <button class="btn ghost small" id="tb-print">🖨 Chop etish</button>
          <button class="btn small" id="tb-excel">↓ Excel</button>
        </div>
      </div>

      ${err ? `<div class="err-box">${escapeHtml(err)}</div>` : ''}
      <div class="ic-note">Kelgan/kechikkan/kelmagan holatlar — davomat tizimi ulanmaguncha o'tgan kunlar uchun ko'rsatiladigan namuna (demo) qiymatlar. Kelasi kunlar hali bo'sh (·), dam olish (yakshanba) kunlari haqiqiy taqvimga asosan belgilanadi.</div>

      ${staff && staff.length>0 ? `
      <div class="tabel-card">
      <div class="tabel-wrap">
        <table class="tbl tabel-tbl">
          <thead><tr>
            <th class="t-firm-h">Xodim</th>
            ${days.map(d=>{ const off = new Date(y,m,d).getDay()===0; const future = new Date(y,m,d) > new Date(now.getFullYear(),now.getMonth(),now.getDate()); return `<th class="${off?'tb-off-h':future?'tb-fu-h':''}">${d}</th>` }).join('')}
            <th>Kun</th><th>Kech</th><th>Soat</th>
          </tr></thead>
          <tbody>
            ${staff.map(s=>{
              const empKey = s.id||s.login
              const name = [s.lastName, s.firstName].filter(Boolean).join(' ').toUpperCase() || s.login
              const { kun, kech, soat } = rowSummary(empKey, y, m, daysInMonth)
              return `
              <tr>
                <td class="t-firm">${escapeHtml(name)}</td>
                ${days.map(d=>{
                  const st = dayStatus(empKey, y, m, d)
                  if(st==='off') return `<td class="tb-off">D</td>`
                  if(st==='none') return `<td class="tb-empty">·</td>`
                  if(st==='present') return `<td class="tb-present">✓</td>`
                  if(st==='late') return `<td class="tb-late">K</td>`
                  return `<td class="tb-absent">X</td>`
                }).join('')}
                <td class="tb-kun">${kun||'—'}</td><td class="tb-kech${kech>0?'':' zero'}">${kech||'—'}</td><td class="tb-soat${soat>0?'':' zero'}">${soat||'—'}</td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="tabel-legend">
        <span><i class="tb-dot" style="background:var(--green)"></i> ✓ kelgan</span>
        <span><i class="tb-dot" style="background:var(--amber)"></i> K kechikkan</span>
        <span><i class="tb-dot" style="background:var(--red)"></i> X kelmagan</span>
        <span><i class="tb-dot" style="background:#C3CFD3"></i> D dam olish</span>
      </div>
      </div>

      <div class="sec-lbl">Xodimlar bo'yicha davomat yakuni</div>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Xodim</th><th>Kelgan</th><th>Kelmagan</th><th>Kech qolgan</th></tr></thead>
          <tbody>
            ${staff.map(s=>{
              const empKey = s.id||s.login
              const name = [s.lastName, s.firstName].filter(Boolean).join(' ').toUpperCase() || s.login
              const { kelgan, kelmagan, kech } = rowSummary(empKey, y, m, daysInMonth)
              return `
              <tr>
                <td class="t-firm">${escapeHtml(name)}</td>
                <td style="color:var(--green);font-weight:800">${kelgan}</td>
                <td style="${kelmagan>0?'color:var(--red);font-weight:800':'color:var(--mut)'}">${kelmagan}</td>
                <td style="${kech>0?'color:var(--amber);font-weight:800':'color:var(--mut)'}">${kech}</td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>
      ` : staff ? `<div class="empty">Faol xodim topilmadi.</div>` : ''}
    `

    const monthEl = qs('#tb-month', root)
    if(monthEl) monthEl.addEventListener('change', e=>{
      const v = e.target.value // "YYYY-MM"
      if(!v) return
      const [yy,mm] = v.split('-').map(Number)
      y = yy; m = mm-1
      render()
    })
    const printEl = qs('#tb-print', root)
    if(printEl) printEl.addEventListener('click', ()=> window.print())
    const excelEl = qs('#tb-excel', root)
    if(excelEl) excelEl.addEventListener('click', exportExcel)
  }

  load()
  return ()=>{}
}
