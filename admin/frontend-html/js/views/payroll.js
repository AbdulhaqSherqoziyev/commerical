import { api } from '../api.js'
import { qs, qsa, on, escapeHtml } from '../core.js'
import { fmtSum } from '../products.js'
import { initials } from '../tasksShared.js'
import { getPayrollSettings } from './settings.js'
import { getEffectiveSalary } from '../staffSalary.js'

// Ish haqi to'lovlari — Xodimlar bo'limining "Oylik maosh" ma'lumotidan
// foydalanadi. DIQQAT: Ishlangan kun, Kechikish jarimasi (avtomatik qism)
// va Undiruv/Ustanovka bonus uchun backend (davomat tizimi) hali yo'q —
// shu ustunlar xodimga bog'liq, doimiy (har safar bir xil) NAMUNA (demo)
// qiymat bilan ko'rsatiladi. AMMO: Oylik to'lash, Avans berish, Bonus
// berish va Jarima qo'llash endi HAQIQIY amallar — brauzerning
// localStorage'ida ("to'lovlar tarixi" ko'rinishida) saqlanadi, real
// backend tayyor bo'lganda shu joyni API'ga ulash kifoya.

export const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']
const LEDGER_KEY = 'zood-payroll-ledger'
export const PAY_METHOD_LABEL = { cash:'Naqd pul', card:'Plastik karta', bank:"Bank o'tkazmasi" }
export const KIND_LABEL = { oylik:"Oylik to'landi", avans:'Avans berildi', bonus:'Bonus berildi', jarima:'Jarima qo\'llandi' }

function hashStr(s){
  let h = 0
  const str = String(s||'')
  for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0 }
  return Math.abs(h)
}
// Ilgari bu joylarda emoji (💳 ✈ 🔄 …) ishlatilgan edi. Windows ularni
// rangsiz belgi shrifti bilan chizadi — natijada tugmalarda qandaydir
// tirechaga o'xshash, sifatsiz belgi ko'rinardi. Endi sahifaning qolgan
// ikonkalari bilan bir xil chiziqli SVG.
const IC_CARD = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>`
const IC_PLUS = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`
const IC_MINUS = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>`

export function currentMonthKey(){ const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }
function genId(){ return 'lg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8) }
export function loadLedger(){ try{ return JSON.parse(localStorage.getItem(LEDGER_KEY) || '[]') }catch(e){ return [] } }
export function saveLedger(arr){ try{ localStorage.setItem(LEDGER_KEY, JSON.stringify(arr)) }catch(e){} }
export function addLedgerEntry(entry){
  const arr = loadLedger()
  arr.push({ id: genId(), month: currentMonthKey(), createdAt: new Date().toISOString(), ...entry })
  saveLedger(arr)
  return arr
}
export function ledgerForStaff(staffId){ return loadLedger().filter(e=>e.staffId===staffId) }
export function fmtHistDate(v){
  if(!v) return '—'
  const d = String(v).slice(0,10).split('-')
  return d.length===3 ? `${d[2]}.${d[1]}.${d[0]}` : String(v).slice(0,10)
}

// Joriy oy uchun kun-ma-kun holatni Tabel bo'limidagi bilan AYNAN bir xil
// formula orqali hisoblaydi (bir xil xodim id => bir xil natija) — shu
// sabab "Ishlangan" ustuni Tabel'dagi "Kun" bilan mos keladi. Modul darajasida
// (mountPayroll tashqarisida) e'lon qilingan — chunki Xodim profilidagi
// "Davomat"/"Amallar tarixi" bo'limlari ham AYNAN shu hisob-kitobdan
// foydalanadi (staff.js shu funksiyalarni shu yerdan import qiladi).
export function monthlyWorkedDays(empKey, totalDays){
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()
  let worked = 0
  for(let d=1; d<=totalDays; d++){
    const dow = new Date(y,m,d).getDay()
    if(dow===0) continue
    const r = hashStr(empKey+'-'+d) % 100
    if(r>=8) worked++ // present yoki late — ikkalasi ham "ishlangan" hisoblanadi
  }
  return worked
}

export function computeRow(s, settings, ledger){
  const staffId = s.id||s.login
  const salary = getEffectiveSalary(s)
  const h = hashStr(staffId)
  const totalDays = settings.workDaysPerMonth || 26
  const ishlangan = monthlyWorkedDays(staffId, totalDays)
  const month = currentMonthKey()
  const entries = (ledger||[]).filter(e=>e.staffId===staffId && e.month===month)

  const demoJarima = ((h>>3)%3===0) ? 0 : -((((h>>4)%12)+1)*10000)
  const demoBonus = ((h>>5)%4===0) ? 0 : (((h>>6)%9)+1)*15000
  const undiruvBonus = ((h>>7)%3===0) ? 0 : (((h>>8)%6)+1)*20000
  const ustanovkaBonus = ((h>>9)%3===0) ? 0 : (((h>>10)%6)+1)*20000

  const manualBonus = entries.filter(e=>e.kind==='bonus').reduce((a,e)=>a+(Number(e.amount)||0),0)
  const manualJarima = entries.filter(e=>e.kind==='jarima').reduce((a,e)=>a+(Number(e.amount)||0),0)
  const manualAvans = entries.filter(e=>e.kind==='avans').reduce((a,e)=>a+(Number(e.amount)||0),0)
  const paidAmount = entries.filter(e=>e.kind==='oylik').reduce((a,e)=>a+(Number(e.amount)||0),0)

  const bonus = demoBonus + manualBonus
  const jarima = demoJarima - manualJarima
  const avans = -manualAvans
  const qolga = Math.max(0, salary + jarima + bonus + undiruvBonus + ustanovkaBonus + avans)
  const remaining = Math.max(0, qolga - paidAmount)
  const paid = paidAmount > 0
  return { s, staffId, salary, ishlangan, totalDays, jarima, bonus, undiruvBonus, ustanovkaBonus, avans, qolga, paid, paidAmount, remaining }
}

export function mountPayroll(root, { toast }){
  let staff = null, err = ''
  let tab = 'all' // all | pending | paid
  let selectedId = null
  let payType = 'oylik' // oylik | avans
  let payMethod = 'card' // cash | card | bank
  let payDate = new Date().toISOString().slice(0,10)
  let paySum = ''
  let giveKind = null // null | 'bonus' | 'jarima'
  let giveAmount = ''

  async function load(){
    try{ staff = (await api.staffList()).filter(s=>s.active); err = '' }
    catch(ex){ err = ex.error || 'Xatolik' }
    render()
  }

  function payAll(){
    const settings = getPayrollSettings()
    const ledger = loadLedger()
    const rows = (staff||[]).map(s=>computeRow(s, settings, ledger))
    const targets = rows.filter(r=>!r.paid && r.qolga>0)
    if(targets.length===0){ toast("Hozircha to'lanadigan xodim yo'q"); return }
    const today = new Date().toISOString().slice(0,10)
    const arr = loadLedger()
    targets.forEach(r=>{
      arr.push({ id: genId(), staffId: r.staffId, month: currentMonthKey(), kind:'oylik', amount: r.qolga, method: settings.defaultPayMethod||'card', date: today, createdAt: new Date().toISOString() })
    })
    saveLedger(arr)
    toast(`${targets.length} ta xodimga oylik to'landi`)
    render()
  }

  function render(){
    const settings = getPayrollSettings()
    const ledger = loadLedger()
    const rows = (staff||[]).map(s=>computeRow(s, settings, ledger))
    const shown = tab==='all' ? rows : tab==='paid' ? rows.filter(r=>r.paid) : rows.filter(r=>!r.paid)
    const fond = rows.reduce((a,r)=>a+r.qolga,0)
    const paidSum = rows.reduce((a,r)=>a+r.paidAmount,0)
    const qoldi = Math.max(0, fond - paidSum)
    const paidCount = rows.filter(r=>r.paid).length
    const pendingCount = rows.length - paidCount
    const now = new Date()
    const monthLabel = `${MONTHS_UZ[now.getMonth()]} ${now.getFullYear()}`
    if(selectedId && !rows.find(r=>r.staffId===selectedId)) selectedId = null

    root.innerHTML = `
      <div class="dash-head" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <h2>Ish haqi to'lovlari</h2>
          <div style="color:var(--mut);font-size:12.5px;font-weight:700;margin-top:2px">${monthLabel}</div>
        </div>
        ${pendingCount>0 ? `<button class="btn" id="pr-payall">${IC_CARD} Hammasiga oylik to'lash <span class="cnt">${pendingCount}</span></button>` : ''}
      </div>

      <div class="kpi-grid">
        <div class="stat-tile"><b>${fmtSum(fond)}</b><span>Jami to'lov fondi (so'm)</span></div>
        <div class="stat-tile"><b style="color:var(--green)">${fmtSum(paidSum)}</b><span>To'langan (so'm)</span></div>
        <div class="stat-tile"><b style="color:var(--amber)">${fmtSum(qoldi)}</b><span>Qoldi (so'm)</span></div>
        <div class="stat-tile"><b>${paidCount} / ${rows.length}</b><span>Xodimlar</span></div>
      </div>

      <div class="seg" id="pr-tabs" style="margin-bottom:14px">
        <button type="button" class="${tab==='all'?'on':''}" data-tab="all">Hammasi <span class="cnt">${rows.length}</span></button>
        <button type="button" class="${tab==='pending'?'on':''}" data-tab="pending">Kutilmoqda <span class="cnt">${pendingCount}</span></button>
        <button type="button" class="${tab==='paid'?'on':''}" data-tab="paid">To'langan <span class="cnt">${paidCount}</span></button>
      </div>

      ${err ? `<div class="err-box">${escapeHtml(err)}</div>` : ''}
      ${staff && shown.length===0 ? `<div class="empty">${tab==='paid' ? "Hozircha to'langan to'lovlar yo'q." : tab==='pending' ? "Kutilayotgan to'lov yo'q." : "Faol xodim topilmadi."}</div>` : ''}

      ${staff && shown.length>0 ? `
      <div class="tbl-wrap" style="margin-bottom:20px">
        <table class="tbl">
          <thead><tr>
            <th>Xodim</th><th>Ishlangan</th><th>Ish haqi</th><th>Jarima</th><th>Bonus</th><th>Undiruv bonus</th><th>Ustanovka bonus</th><th>Avans</th><th>Qo'lga</th><th>Holat</th>
          </tr></thead>
          <tbody>
            ${shown.map(r=>{
              const nm = [r.s.lastName, r.s.firstName].filter(Boolean).join(' ').toUpperCase() || r.s.login
              return `
              <tr>
                <td style="white-space:nowrap">
                  <div style="display:flex;align-items:center;gap:9px">
                    <span class="prof-av">${escapeHtml(initials(nm))}</span>
                    <div>
                      <div style="font-weight:800;color:var(--ink)">${escapeHtml(nm)}</div>
                      <div style="font-size:11.5px;color:var(--mut)">${r.s.position?escapeHtml(r.s.position):'—'}</div>
                    </div>
                  </div>
                </td>
                <td style="white-space:nowrap">${r.ishlangan} / ${r.totalDays}</td>
                <td class="mono-num" style="font-weight:800;white-space:nowrap">${r.salary?fmtSum(r.salary):'—'}</td>
                <td class="mono-num" style="white-space:nowrap;${r.jarima<0?'color:var(--red);font-weight:800':'color:var(--mut)'}">${r.jarima?fmtSum(r.jarima):'—'}</td>
                <td class="mono-num" style="white-space:nowrap;${r.bonus>0?'color:var(--green);font-weight:800':'color:var(--mut)'}">${r.bonus?'+'+fmtSum(r.bonus):'—'}</td>
                <td class="mono-num" style="white-space:nowrap;${r.undiruvBonus>0?'color:var(--green);font-weight:800':'color:var(--mut)'}">${r.undiruvBonus?'+'+fmtSum(r.undiruvBonus):'—'}</td>
                <td class="mono-num" style="white-space:nowrap;${r.ustanovkaBonus>0?'color:var(--green);font-weight:800':'color:var(--mut)'}">${r.ustanovkaBonus?'+'+fmtSum(r.ustanovkaBonus):'—'}</td>
                <td class="mono-num" style="white-space:nowrap;${r.avans<0?'color:var(--red);font-weight:800':'color:var(--mut)'}">${r.avans?fmtSum(r.avans):'—'}</td>
                <td class="mono-num" style="font-weight:800;white-space:nowrap">${r.qolga?fmtSum(r.qolga):'—'}</td>
                <td>${r.paid ? `<span class="badge" style="background:#E7F5EC;color:var(--green);margin-left:0">To'langan</span>` : `<span class="badge" style="background:var(--soft);color:var(--b7);margin-left:0">Kutilmoqda</span>`}</td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="ic-note">Ishlangan/Undiruv bonus/Ustanovka bonus/kechikish jarimasi (avtomatik qismi) — davomat tizimi ulanmaguncha ko'rsatiladigan namuna (demo) qiymatlar. Oylik, Avans, Bonus va Jarima berish — endi haqiqiy amallar, xodim tanlab, o'ngdagi panel orqali bajariladi.</div>
      ` : ''}

      ${staff && rows.length>0 ? `
      <div class="pr-cols">
        <div class="wiz-card" style="padding:0;overflow:hidden">
          <div style="padding:16px 18px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;font:800 11.5px system-ui,sans-serif;color:var(--mut);text-transform:uppercase;letter-spacing:.03em">
            <span>Hisob-kitob varaqasi</span><span>Qo'lga</span>
          </div>
          <div id="pr-queue">
            ${rows.map(r=>{
              const nm = [r.s.lastName, r.s.firstName].filter(Boolean).join(' ').toUpperCase() || r.s.login
              const on_ = selectedId===r.staffId
              return `
              <div class="pr-qrow${on_?' on':''}" data-id="${r.staffId}">
                <span class="prof-av">${escapeHtml(initials(nm))}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:800;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(nm)}</div>
                  <div style="font-size:11.5px;color:var(--mut)">${r.s.position?escapeHtml(r.s.position):'—'}${r.paid?' · to\'langan':''}</div>
                </div>
                <div class="mono-num" style="font-weight:800;color:var(--ink);white-space:nowrap">${r.qolga?fmtSum(r.qolga):'—'}</div>
              </div>`
            }).join('')}
          </div>
        </div>

        <div class="wiz-card" id="pr-detail"></div>
      </div>` : ''}
    `

    const tabsEl = qs('#pr-tabs', root)
    if(tabsEl) on(tabsEl, 'click', 'button[data-tab]', (e,btn)=>{ tab = btn.dataset.tab; render() })
    const queue = qs('#pr-queue', root)
    if(queue) on(queue, 'click', '.pr-qrow', (e,rowEl)=>{ selectedId = rowEl.dataset.id; paySum=''; payType='oylik'; giveKind=null; giveAmount=''; render() })
    const payAllEl = qs('#pr-payall', root)
    if(payAllEl) payAllEl.addEventListener('click', payAll)
    renderDetail(rows)
  }

  function renderDetail(rows){
    const slot = qs('#pr-detail', root)
    if(!slot) return
    const r = rows.find(x=>x.staffId===selectedId)
    if(!r){ slot.innerHTML = `<div class="empty" style="padding:50px 20px">Chapdagi ro'yxatdan xodimni tanlang.</div>`; return }
    const s = r.s
    const nm = [s.lastName, s.firstName].filter(Boolean).join(' ').toUpperCase() || s.login
    const now = new Date()
    const monthLabel = `${MONTHS_UZ[now.getMonth()]} ${now.getFullYear()}`
    if(payType==='oylik' && !paySum) paySum = r.remaining ? String(r.remaining) : ''
    const Row = (label, val, color) => `<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line);font-size:13.5px"><span style="color:var(--mut)">${escapeHtml(label)}</span><span class="mono-num" style="font-weight:800;color:${color||'var(--ink)'}">${val}</span></div>`
    const history = ledgerForStaff(r.staffId).sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||''))

    slot.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <span class="prof-av lg">${escapeHtml(initials(nm))}</span>
        <div>
          <div style="font:900 15px system-ui,sans-serif;color:var(--ink)">${escapeHtml(nm)}</div>
          <div style="font-size:12px;color:var(--mut)">${s.position?escapeHtml(s.position):'Xodim'} · ${monthLabel}</div>
        </div>
      </div>
      ${Row("Oylik maosh", r.salary?fmtSum(r.salary)+" so'm":'—')}
      ${Row("Ishlangan kun", `${r.ishlangan} / ${r.totalDays}`)}
      ${Row("Kechikish jarimasi", r.jarima?fmtSum(r.jarima)+" so'm":'—', r.jarima<0?'var(--red)':undefined)}
      ${Row("Bonus", r.bonus?'+'+fmtSum(r.bonus)+" so'm":'—', r.bonus>0?'var(--green)':undefined)}
      ${Row("Undiruv bonusi", r.undiruvBonus?'+'+fmtSum(r.undiruvBonus)+" so'm":'—', r.undiruvBonus>0?'var(--green)':undefined)}
      ${Row("Ustanovka bonusi", r.ustanovkaBonus?'+'+fmtSum(r.ustanovkaBonus)+" so'm":'—', r.ustanovkaBonus>0?'var(--green)':undefined)}
      ${Row("Avans", r.avans?fmtSum(r.avans)+" so'm":'—', r.avans<0?'var(--red)':undefined)}
      <div style="display:flex;justify-content:space-between;padding:14px 0 4px;font:900 16px system-ui,sans-serif;color:var(--ink)">
        <span>Qo'lga beriladi</span><span class="mono-num">${r.qolga?fmtSum(r.qolga)+" so'm":'—'}</span>
      </div>
      ${r.paidAmount>0 ? `<div class="hint" style="margin-top:6px">Shu oy uchun allaqachon <b>${fmtSum(r.paidAmount)} so'm</b> oylik to'langan. Qolgan summa: <b>${fmtSum(r.remaining)} so'm</b>.</div>` : ''}

      <div style="margin-top:20px;padding-top:18px;border-top:1px dashed var(--line)">
        <label style="display:block;font:800 12.5px system-ui,sans-serif;color:var(--mut);margin-bottom:10px">Bonus yoki jarima qo'shish</label>
        <div class="pay-pill-row" style="margin-bottom:${giveKind?'12px':'0'}">
          <button type="button" class="pay-pill${giveKind==='bonus'?' on-green':''}" data-give="bonus">${IC_PLUS} Bonus</button>
          <button type="button" class="pay-pill${giveKind==='jarima'?' on-red':''}" data-give="jarima">${IC_MINUS} Jarima</button>
        </div>
        ${giveKind ? `
        <div style="display:flex;gap:10px">
          <input id="pr-give-amt" placeholder="Summa (so'm)" value="${giveAmount?fmtSum(giveAmount):''}" inputmode="numeric" style="flex:1;border:1.5px solid var(--line);border-radius:13px;padding:13px 16px;font:800 14.5px system-ui,sans-serif" />
          <button class="btn" id="pr-give-confirm">Qo'shish</button>
        </div>` : ''}
      </div>

      <div style="margin-top:20px;padding-top:18px;border-top:1px dashed var(--line)">
        <label style="display:block;font:800 12.5px system-ui,sans-serif;color:var(--mut);margin-bottom:10px">To'lov turi</label>
        <div class="seg lg" style="margin-bottom:18px">
          <button type="button" class="${payType==='oylik'?'on':''}" data-ptype="oylik">Oylik</button>
          <button type="button" class="${payType==='avans'?'on':''}" data-ptype="avans">Avans</button>
        </div>

        <label style="display:block;font:800 12.5px system-ui,sans-serif;color:var(--mut);margin-bottom:10px">To'lov usuli</label>
        <div class="pay-pill-row">
          ${[['cash','Naqd pul'],['card','Plastik karta'],['bank',"Bank o'tkazmasi"]].map(([k,l])=>`
            <button type="button" class="pay-pill${payMethod===k?' on':''}" data-pm="${k}">${l}</button>
          `).join('')}
        </div>

        <div class="wiz-grid" style="margin-top:16px">
          <div class="wf"><label>To'lov sanasi</label><input type="date" id="pr-date" value="${payDate}" /></div>
          <div class="wf"><label>Summa (so'm)</label><input id="pr-sum" value="${paySum?fmtSum(paySum):''}" placeholder="${payType==='avans'?'masalan: 1 000 000':''}" inputmode="numeric" /></div>
        </div>

        <button class="btn" id="pr-confirm" style="width:100%;margin-top:16px">✓ ${payType==='avans'?'Avans berish':"To'lovni tasdiqlash"}</button>
      </div>

      <div class="sec-lbl" style="margin-top:22px">To'lovlar tarixi</div>
      ${history.length===0 ? `<div class="empty" style="padding:20px">Hali to'lov tarixi yo'q.</div>` : `
      <div style="display:flex;flex-direction:column;gap:2px">
        ${history.map(h=>`
          <div class="dl-item">
            <span class="prof-av" style="flex:0 0 auto;background:${h.kind==='oylik'?'var(--soft)':h.kind==='avans'?'#FEF3E2':h.kind==='bonus'?'#E7F5EC':'#FBEDEB'};color:${h.kind==='oylik'?'var(--b7)':h.kind==='avans'?'var(--amber)':h.kind==='bonus'?'var(--green)':'var(--red)'}">${h.kind==='oylik'?'💳':h.kind==='avans'?'💸':h.kind==='bonus'?'➕':'➖'}</span>
            <span>${KIND_LABEL[h.kind]||h.kind}${h.method?' · '+(PAY_METHOD_LABEL[h.method]||h.method):''}<br><small style="color:var(--mut)">${fmtHistDate(h.date||h.createdAt)}</small></span>
            <b style="white-space:nowrap;color:${h.kind==='jarima'?'var(--red)':'var(--ink)'}">${fmtSum(h.amount)} so'm</b>
          </div>
        `).join('')}
      </div>`}
    `
    on(slot, 'click', '[data-pm]', (e,btn)=>{ payMethod = btn.dataset.pm; render() })
    on(slot, 'click', '[data-ptype]', (e,btn)=>{ payType = btn.dataset.ptype; paySum=''; render() })
    on(slot, 'click', '[data-give]', (e,btn)=>{ const k = btn.dataset.give; giveKind = giveKind===k ? null : k; giveAmount=''; render() })
    const dateEl = qs('#pr-date', slot); if(dateEl) dateEl.addEventListener('change', e=>{ payDate = e.target.value })
    const sumEl = qs('#pr-sum', slot); if(sumEl) sumEl.addEventListener('input', e=>{ paySum = e.target.value.replace(/\D/g,''); e.target.value = paySum ? fmtSum(paySum) : '' })
    const giveAmtEl = qs('#pr-give-amt', slot); if(giveAmtEl) giveAmtEl.addEventListener('input', e=>{ giveAmount = e.target.value.replace(/\D/g,''); e.target.value = giveAmount ? fmtSum(giveAmount) : '' })
    const giveConfirmEl = qs('#pr-give-confirm', slot)
    if(giveConfirmEl) giveConfirmEl.addEventListener('click', ()=>{
      const amt = Number(giveAmount)
      if(!amt || amt<=0){ toast("Summani kiriting"); return }
      addLedgerEntry({ staffId: r.staffId, kind: giveKind, amount: amt })
      toast(giveKind==='bonus' ? "Bonus qo'shildi" : "Jarima qo'llandi")
      giveKind = null; giveAmount = ''
      render()
    })
    const confirmEl = qs('#pr-confirm', slot)
    if(confirmEl) confirmEl.addEventListener('click', ()=>{
      const amt = Number(paySum)
      if(!amt || amt<=0){ toast("Summani kiriting"); return }
      addLedgerEntry({ staffId: r.staffId, kind: payType, amount: amt, method: payMethod, date: payDate })
      toast(payType==='avans' ? "Avans berildi" : "Oylik to'landi")
      paySum = ''
      render()
    })
  }

  load()
  return ()=>{}
}
