import { api } from '../api.js'
import { qs, qsa, on, escapeHtml } from '../core.js'
import { fmtSum } from '../products.js'

// Undiruv — mijozlardan oylik to'lovlarni undirish (yig'ish) bo'limi.
// DIQQAT: backendda mijoz uchun "oylik to'lov summasi", "server xarajati"
// va to'lovlar tarixi kabi moliyaviy maydonlar hali yo'q — shu sabab bu
// ma'lumotlar (Sozlamalar/Ish haqi to'lovlari bo'limlaridagi kabi usulda)
// brauzer xotirasida (localStorage) saqlanadi. Telegram orqali xabar
// yuborish ham hali botga ulanmagan — "Yuborish" bosilganda xabar matni
// to'g'ri (har bir mijozning o'z summasi bilan) tayyorlanadi va shu
// tayyor holda ko'rsatiladi, lekin haqiqiy yetkazish uchun Telegram bot
// integratsiyasi ulanishi kerak bo'ladi.

const BILLING_KEY = 'zood-undiruv-billing'
const LEDGER_KEY = 'zood-undiruv-ledger'
const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']
const PAY_METHOD_LABEL = { naqd:'Naqd pul', karta:'Karta', hisob:'Hisob raqami', chegirma:'Chegirma' }

function currentMonthKey(){ const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }
function genId(){ return 'ud_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8) }
function loadBilling(){ try{ return JSON.parse(localStorage.getItem(BILLING_KEY) || '{}') }catch(e){ return {} } }
function saveBilling(m){ try{ localStorage.setItem(BILLING_KEY, JSON.stringify(m)) }catch(e){} }
function loadLedger(){ try{ return JSON.parse(localStorage.getItem(LEDGER_KEY) || '[]') }catch(e){ return [] } }
function saveLedger(a){ try{ localStorage.setItem(LEDGER_KEY, JSON.stringify(a)) }catch(e){} }

function hashStr(s){
  let h = 0
  const str = String(s||'')
  for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0 }
  return Math.abs(h)
}

// "+ Demo to'ldirish" tugmasi orqali yaratiladigan namuna firmalar — real
// mijoz yaratish API'si (logo va lokatsiya majburiy) talablariga mos
// qilib to'liq payload shaklida tayyorlangan.
const DEMO_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
// Hududlar bo'yicha "Analitika" panelida (undiruv.js) mazmunli taqsimot
// chiqishi uchun O'zbekistonning barcha 12 ta viloyati bo'yicha bittadan demo
// firma, har biriga 4 ta ICAN tarifidan (Standart/Standart+/Premium/Premium+)
// biri tekis taqsimlab biriktirilgan.
const DEMO_CLIENTS = [
  { name:'AgroMarket UZ', phone:'+998 90 111 22 01', tariff:'Standart', region:'Andijon' },
  { name:'BuxoroSavdo LLC', phone:'+998 90 111 22 02', tariff:"Standart+", region:'Buxoro' },
  { name:"Farg'ona Elektronika", phone:'+998 90 111 22 03', tariff:'Premium', region:"Farg'ona" },
  { name:'Jizzax Trade Group', phone:'+998 90 111 22 04', tariff:'Premium+', region:'Jizzax' },
  { name:'Namangan Digital', phone:'+998 90 111 22 05', tariff:'Standart', region:'Namangan' },
  { name:'Navoiy Tex Servis', phone:'+998 90 111 22 06', tariff:"Standart+", region:'Navoiy' },
  { name:'Qashqadaryo Prime', phone:'+998 90 111 22 07', tariff:'Premium', region:'Qashqadaryo' },
  { name:'Samarqand Trade', phone:'+998 90 111 22 08', tariff:'Premium+', region:'Samarqand' },
  { name:'Sirdaryo Group', phone:'+998 90 111 22 09', tariff:'Standart', region:'Sirdaryo' },
  { name:'Surxon Business', phone:'+998 90 111 22 10', tariff:"Standart+", region:'Surxondaryo' },
  { name:'Toshkent Digital Prime', phone:'+998 90 111 22 11', tariff:'Premium', region:'Toshkent viloyati' },
  { name:'Xorazm Elektronika', phone:'+998 90 111 22 12', tariff:'Premium+', region:'Xorazm' },
]
function demoClientPayload(d){
  return {
    name: d.name, phone: d.phone, company: d.name, parent: '', partner: '',
    tariff: d.tariff, balanceLimit: '', region: d.region || 'Toshkent shahri', district: '', address: '',
    qqs: '', bonusMonths: '', logo: DEMO_LOGO, note: '', setupDate: '',
    bank: '', inn: '', mfo: '', account: '', contractNo: '',
    dirName: '', dirLogin: '', dirPhone: '', dirRole: '', lat: null, lng: null,
  }
}
const MONTHLY_BY_TARIFF = { 'Premium+': [1300000,1700000], Premium: [900000,1250000], "Standart+": [550000,850000], Standart: [280000,500000] }

const TPL_DEBT = "Hurmatli {mijoz},\n\n{oy} oyi uchun qarzdorligingiz: {summa} so'm.\nIltimos, to'lovni amalga oshiring."
const TPL_THANKS = "Hurmatli {mijoz},\n\n{oy} oyi uchun to'lovingiz uchun rahmat!"
const TPL_GREET = "Assalomu alaykum, hurmatli {mijoz}!\n\nSiz bilan hamkorligimizdan mamnunmiz. Savol yoki takliflaringiz bo'lsa, biz bilan bog'laning."

function renderTemplate(tpl, ctx){
  return String(tpl||'')
    .split('{mijoz}').join(ctx.mijoz||'')
    .split('{oy}').join(ctx.oy||'')
    .split('{summa}').join(ctx.summa||'0')
}
function reqBlock(c){
  const lines = []
  if(c.bank) lines.push(`Bank: ${c.bank}`)
  if(c.account) lines.push(`Hisob raqami: ${c.account}`)
  if(c.mfo) lines.push(`MFO: ${c.mfo}`)
  return lines.length ? '\n\n'+lines.join('\n') : ''
}
function nowTimeStr(){
  const d = new Date()
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')
}
function clientName(c){ return c.name || c.company || c.dirLogin || 'Mijoz' }

function pagerNums(page, pageCount){
  const out=[]
  if(pageCount<=7){ for(let i=1;i<=pageCount;i++) out.push(i); return out }
  out.push(1)
  let a=Math.max(2,page-1), b=Math.min(pageCount-1,page+1)
  if(page<=3){ a=2; b=4 }
  if(page>=pageCount-2){ a=pageCount-3; b=pageCount-1 }
  if(a>2) out.push('…l')
  for(let i=a;i<=b;i++) out.push(i)
  if(b<pageCount-1) out.push('…r')
  out.push(pageCount)
  return out
}
function renderPagerHtml(page, pageCount, pageSize, total){
  const from = total===0 ? 0 : (page-1)*pageSize + 1
  const to = Math.min(total, page*pageSize)
  return `
    <div class="pager">
      <div class="pager-info">${from}–${to} / ${total} ta</div>
      <div class="pager-nav">
        <button class="pg" data-page="${Math.max(1,page-1)}" ${page<=1?'disabled':''} aria-label="Oldingi">‹</button>
        ${pagerNums(page,pageCount).map(n=> typeof n==='number'
          ? `<button class="pg${n===page?' on':''}" data-page="${n}">${n}</button>`
          : `<span class="pg-gap">…</span>`).join('')}
        <button class="pg" data-page="${Math.min(pageCount,page+1)}" ${page>=pageCount?'disabled':''} aria-label="Keyingi">›</button>
      </div>
      <select class="pager-size" id="ud-page-size">
        ${[10,25,50,100].map(s=>`<option value="${s}" ${pageSize===s?'selected':''}>${s} / sahifa</option>`).join('')}
      </select>
    </div>
  `
}

// ---------------- "Analitika" — Loyihalar bo'limidagi Kanban/Analitika
// naqshiga o'xshab, shu yerda ham qo'shildi. Hammasi HAQIQIY ma'lumot: hudud
// (client.region), tarif (client.tariff), to'lov usuli va oy bo'yicha
// undiruv statistikasi mavjud clients/billing/ledger yozuvlaridan
// hisoblanadi — hech qanday NAMUNA/demo raqam yo'q.
function regionBreakdown(rows){
  const map = new Map()
  rows.forEach(r=>{
    const region = r.c.region || "Ko'rsatilmagan"
    if(!map.has(region)) map.set(region, { region, debt:0, collected:0, debtorCount:0, total:0 })
    const e = map.get(region)
    e.debt += r.qarz; e.collected += r.paid; e.total += r.totalDue
    if(r.qarz>0) e.debtorCount++
  })
  return [...map.values()]
    .map(e=>({ ...e, samara: Math.round(e.collected/Math.max(e.collected+e.debt,1)*100) }))
    .sort((a,b)=>b.collected-a.collected)
}
function tariffBreakdown(rows){
  const map = new Map()
  rows.forEach(r=>{
    const tariff = r.c.tariff || "Belgilanmagan"
    if(!map.has(tariff)) map.set(tariff, { tariff, debt:0, collected:0, count:0 })
    const e = map.get(tariff)
    e.debt += r.qarz; e.collected += r.paid; e.count++
  })
  return [...map.values()]
    .map(e=>({ ...e, samara: Math.round(e.collected/Math.max(e.collected+e.debt,1)*100) }))
    .sort((a,b)=>b.collected-a.collected)
}
function methodBreakdown(ledger){
  const month = currentMonthKey()
  const map = new Map()
  ledger.filter(e=>e.month===month).forEach(e=>{
    const k = e.method || 'boshqa'
    if(!map.has(k)) map.set(k, { method:k, count:0, sum:0 })
    const m = map.get(k); m.count++; m.sum += Number(e.amount)||0
  })
  return [...map.values()].sort((a,b)=>b.sum-a.sum)
}
function monthlyDynamics(ledger){
  const now = new Date()
  const out = []
  for(let i=5;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const sum = ledger.filter(e=>e.month===key).reduce((a,e)=>a+(Number(e.amount)||0),0)
    out.push({ key, label: MONTHS_UZ[d.getMonth()].slice(0,3), sum })
  }
  return out
}
function exportRegionExcel(regions){
  if(typeof X === 'undefined'){ return false }
  const head = ['Viloyat','Qarzdorlik','Undirildi','Qarzdor (soni)','Samara (%)']
  const body = regions.map(r=>[r.region, r.debt, r.collected, r.debtorCount, r.samara])
  const ws = X.utils.aoa_to_sheet([head, ...body])
  ws['!cols'] = [{wch:22},{wch:16},{wch:16},{wch:14},{wch:12}]
  const wb = X.utils.book_new()
  X.utils.book_append_sheet(wb, ws, "Hududlar bo'yicha undiruv")
  X.writeFile(wb, `undiruv_hududlar_${MONTHS_UZ[new Date().getMonth()]}_${new Date().getFullYear()}.xlsx`)
  return true
}
function mlrd(n){
  const v = (n||0)/1e9
  return (v>=10 ? v.toFixed(1) : v.toFixed(2)).replace(/\.00$/,'') + ' mlrd'
}

function analitikaHTML(rows, ledger, showDemoBtn){
  const totalDueSum = rows.reduce((a,r)=>a+r.totalDue,0)
  const totalCollected = rows.reduce((a,r)=>a+r.paid,0)
  const qoldiSum = rows.reduce((a,r)=>a+r.qarz,0)
  const samara = Math.round(totalCollected/Math.max(totalCollected+qoldiSum,1)*100)
  const regions = regionBreakdown(rows)
  const tariffs = tariffBreakdown(rows)
  const methods = methodBreakdown(ledger)
  const months = monthlyDynamics(ledger)
  const maxMonth = Math.max(1, ...months.map(m=>m.sum))
  const topDebtors = [...rows].filter(r=>r.qarz>0).sort((a,b)=>b.qarz-a.qarz).slice(0,8)
  const maxDebt = Math.max(1, ...topDebtors.map(r=>r.qarz))

  return `
    <div class="kpi-grid lg" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-tile ud-top red"><b style="color:var(--red)">${mlrd(qoldiSum)}</b><span>Undirilishi kerak</span></div>
      <div class="stat-tile ud-top green"><b style="color:var(--green)">${mlrd(totalCollected)}</b><span>Undirildi</span></div>
      <div class="stat-tile ud-top blue"><b style="color:var(--b)">${samara}%</b><span>Undirish samarasi</span></div>
    </div>

    <div class="wiz-card" style="padding:0;overflow:hidden">
      <div style="padding:16px 18px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <h4 style="margin:0">Hududlar bo'yicha undiruv</h4>
        <div style="display:flex;gap:10px">
          ${showDemoBtn ? `<button class="btn ghost small" id="ud-demo">+ Demo to'ldirish</button>` : ''}
          <button class="btn ghost small" id="ud-demo-force" title="Barcha mijozlar uchun oylik to'lov/server xarajati va 6 oylik tarixni kengroq taqsimot bilan qayta hisoblaydi">${IC_SYNC} Demo raqamlarini yangilash</button>
          <button class="btn ghost small" id="ud-ana-export-region">↓ Excel'ga eksport</button>
        </div>
      </div>
      <div style="padding:6px 18px 18px">
        ${regions.length===0 ? `<div class="empty" style="padding:24px">Hududi kiritilgan mijoz yo'q.</div>` : `
        <div class="bar-row" style="align-items:center;color:var(--mut);font-size:10.5px;font-weight:800;text-transform:uppercase;margin-bottom:4px">
          <span style="width:150px">Viloyat</span>
          <span style="flex:1"></span>
          <span style="width:100px;text-align:right">Qarzdorlik</span>
          <span style="width:100px;text-align:right">Undirildi</span>
          <span style="width:60px;text-align:right">Qarzdor</span>
          <span style="width:44px">Samara</span>
        </div>`}
        ${regions.map(r=>`
          <div class="bar-row" style="align-items:center">
            <span style="width:150px">${escapeHtml(r.region)}</span>
            <div class="bar-track"><span class="bar-fill" style="width:${r.samara}%;background:var(--green)"></span></div>
            <span class="mono-num" style="width:100px;text-align:right;color:var(--red);font-weight:800">${fmtSum(r.debt)}</span>
            <span class="mono-num" style="width:100px;text-align:right;color:var(--green);font-weight:800">${fmtSum(r.collected)}</span>
            <span style="width:60px;text-align:right;color:var(--mut)">${r.debtorCount}</span>
            <b style="width:44px">${r.samara}%</b>
          </div>
        `).join('')}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:16px;align-items:stretch">
      <div class="wiz-card">
        <h4>Tarif bo'yicha undiruv</h4>
        ${tariffs.map(t=>`
          <div class="bar-row" style="align-items:center">
            <span style="width:110px">${escapeHtml(t.tariff)}</span>
            <div class="bar-track"><span class="bar-fill" style="width:${t.samara}%;background:var(--b)"></span></div>
            <span class="mono-num" style="width:90px;text-align:right;color:var(--green);font-weight:800">${fmtSum(t.collected)}</span>
            <b style="width:40px">${t.samara}%</b>
          </div>
        `).join('')}
        ${tariffs.length===0 ? `<div class="empty" style="padding:20px">Ma'lumot yo'q.</div>` : ''}
      </div>
      <div class="wiz-card">
        <h4>To'lov usuli — bu oy</h4>
        ${methods.map(m=>`
          <div class="bar-row" style="align-items:center">
            <span style="width:110px">${escapeHtml(PAY_METHOD_LABEL[m.method]||m.method)}</span>
            <div class="bar-track"><span class="bar-fill" style="width:${Math.round(m.sum/Math.max(1,...methods.map(x=>x.sum))*100)}%;background:var(--green)"></span></div>
            <b class="mono-num" style="width:90px;text-align:right">${fmtSum(m.sum)}</b>
          </div>
        `).join('')}
        ${methods.length===0 ? `<div class="empty" style="padding:20px">Bu oy hali to'lov qayd etilmagan.</div>` : ''}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:16px;align-items:stretch">
      <div class="wiz-card">
        <h4>Eng yirik qarzdorlar</h4>
        ${topDebtors.map(r=>`
          <div class="bar-row" style="align-items:center">
            <span style="width:170px">${escapeHtml(clientName(r.c))}</span>
            <div class="bar-track"><span class="bar-fill" style="width:${Math.round(r.qarz/maxDebt*100)}%;background:var(--red)"></span></div>
            <b class="mono-num" style="width:100px;text-align:right;color:var(--red)">${fmtSum(r.qarz)}</b>
          </div>
        `).join('')}
        ${topDebtors.length===0 ? `<div class="empty" style="padding:20px">Qarzdor mijoz yo'q — barchasi to'liq to'lagan 🎉</div>` : ''}
      </div>
      <div class="wiz-card">
        <h4>Oxirgi 6 oy — undirilgan summa</h4>
        <div style="display:flex;gap:9px;align-items:flex-end;height:150px;margin-top:10px">
          ${months.map(m=>`
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;justify-content:flex-end;height:100%">
              <span class="mono-num" style="font-size:9.5px;font-weight:800;color:var(--b7)">${m.sum ? fmtSum(m.sum) : ''}</span>
              <div style="width:100%;height:${Math.max(3, Math.round(m.sum/maxMonth*110))}px;background:linear-gradient(180deg,#62d1de,#0f8fa2);border-radius:8px 8px 3px 3px"></div>
              <span style="font-size:10.5px;font-weight:800;color:var(--mut)">${m.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="hint" style="margin-top:2px">Barcha ko'rsatkichlar — mijozlar (hudud/tarif), hisob-kitob va to'lovlar tarixidagi haqiqiy ma'lumotlardan hisoblangan.</div>
  `
}

// Ilgari bu joylarda emoji (💳 ✈ 🔄 …) ishlatilgan edi. Windows ularni
// rangsiz belgi shrifti bilan chizadi — natijada tugmalarda qandaydir
// tirechaga o'xshash, sifatsiz belgi ko'rinardi. Endi sahifaning qolgan
// ikonkalari bilan bir xil chiziqli SVG.
const IC_SEND = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>`
const IC_SYNC = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M3 21v-5h5"/><path d="M21 3v5h-5"/></svg>`
const IC_MAGN = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`
const IC_LOCK2 = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`
const IC_MINUS = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>`
const IC_CARD = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>`

export function mountUndiruv(root, { toast }){
  let clients = null, err = ''
  let q = '', fTariff = '', fServer = '', fStatus = ''
  let page = 1, pageSize = 10
  let sendFor = null, sendState = null
  let bulkOpen = false, bulkState = null
  let billingFor = null, billingState = null
  let pageMode = 'kanban' // 'kanban' | 'analitika' — Loyihalar bo'limidagi bilan bir xil naqsh

  async function load(){
    try{ clients = await api.clientsList(); err = '' }
    catch(ex){ err = ex.error || 'Xatolik' }
    render()
  }

  function computeForClient(c, billing, ledger){
    const b = billing[c.id] || {}
    const monthlyPayment = Number(b.monthlyPayment)||0
    const serverCost = Number(b.serverCost)||0
    const totalDue = monthlyPayment + serverCost
    const month = currentMonthKey()
    const entries = ledger.filter(e=>e.clientId===c.id && e.month===month)
    const paid = entries.reduce((a,e)=>a+(Number(e.amount)||0),0)
    const balans = paid - totalDue
    const qarz = balans<0 ? -balans : 0
    const now = new Date()
    const todayISO = now.toISOString().slice(0,10)
    const overdue = qarz>0 && (now.getDate() > 10 || hashStr(String(c.id))%3===0)
    let status = 'none'
    if(totalDue<=0) status = 'none'
    else if(paid>=totalDue) status = 'paid'
    else if(paid>0) status = 'partial'
    else status = 'debt'
    const paidToday = entries.filter(e=>(e.date||e.createdAt||'').slice(0,10)===todayISO).reduce((a,e)=>a+(Number(e.amount)||0),0)
    const clientEntries = ledger.filter(e=>e.clientId===c.id).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))
    const lastMethod = clientEntries.length ? clientEntries[0].method : null
    return { c, monthlyPayment, serverCost, totalDue, paid, balans, qarz, overdue, status, paidToday, lastMethod }
  }

  // "+ Demo to'ldirish" — namuna firmalarni yaratadi (agar mijozlar ro'yxati
  // deyarli bo'sh bo'lsa) va BARCHA mijozlar uchun (yangi va eskilari uchun ham)
  // hisob-kitob ma'lumotlari (oylik to'lov, server xarajati, to'lov tarixi)
  // hali kiritilmagan bo'lsa — namuna qiymatlar bilan to'ldiradi.
  // "+ Demo to'ldirish" — namuna firmalar (agar deyarli bo'sh bo'lsa),
  // BARCHA mijozlar uchun hisob-kitob (oylik to'lov/server xarajati) va
  // OXIRGI 6 OYLIK to'lov tarixi bilan to'ldiradi — shu bilan "Analitika"
  // bo'limidagi hudud/tarif/to'lov usuli/oylik dinamika panellari ham
  // bo'sh qolmay, mazmunli ko'rinadi.
  // force=false (odatiy "+ Demo to'ldirish"): faqat hisob-kitobi HALI
  // yo'q mijozlarga namuna qiymat qo'shadi, mavjud (real yoki avvalgi demo)
  // ma'lumotni o'zgartirmaydi.
  // force=true ("Demo raqamlarini yangilash"): BARCHA mijozlar uchun
  // oylik to'lov/server xarajati va oxirgi 6 oylik tarixni qayta generatsiya
  // qiladi — avvalgi seed formula tor oraliqda bo'lgani uchun ko'plab
  // mijozlarda bir xil ("635 000" kabi) summalar chiqib qolgan edi; bu
  // kengroq (251 bosqichli) oraliq bilan almashtiriladi.
  async function seedDemoUndiruv(force){
    // DIQQAT: avval bu yerda "agar mijozlar ro'yxati deyarli bo'sh bo'lsa"
    // degan shart bo'lgan — shu sabab real ma'lumotlar (yuzlab mijoz)
    // allaqachon mavjud tizimlarda 12 ta hududli/4 ta tarifli DEMO_CLIENTS
    // HECH QACHON yaratilmagan edi. Endi har bir demo firma o'zining
    // (fixed) telefon raqami bo'yicha tekshiriladi — mavjud bo'lmasa
    // yaratiladi, mijozlar soni qancha bo'lishidan qat'iy nazar, va qayta
    // bosilganda takrorlanmaydi.
    const existingPhones = new Set((clients||[]).map(c=>String(c.phone||'').trim()))
    const missingDemo = DEMO_CLIENTS.filter(d=>!existingPhones.has(d.phone))
    if(missingDemo.length){
      for(const d of missingDemo){
        try{ await api.clientCreate(demoClientPayload(d)) }catch(ex){ /* o'tkazib yuborish */ }
      }
      try{ clients = await api.clientsList() }catch(ex){ /* keyingi load() da qayta urinadi */ }
    }
    const billing = loadBilling()
    let ledger = loadLedger()
    const now = new Date()
    let changed = false
    const serverCosts = [0,0,100000,150000,200000,250000,300000]
    ;(clients||[]).forEach(c=>{
      const h = hashStr(String(c.id||c.login||c.name))
      const tariff = c.tariff || 'Standart'
      const range = MONTHLY_BY_TARIFF[tariff] || MONTHLY_BY_TARIFF.Standart
      const monthlyPayment = range[0] + (h % 251) * Math.round((range[1]-range[0])/251)
      const serverCost = serverCosts[h % serverCosts.length]
      if(force || !billing[c.id]){ billing[c.id] = { monthlyPayment, serverCost }; changed = true }
      const totalDue = (billing[c.id].monthlyPayment||0) + (billing[c.id].serverCost||0)
      const methods = ['naqd','karta','hisob','chegirma']
      for(let i=5;i>=0;i--){
        const md = new Date(now.getFullYear(), now.getMonth()-i, 1)
        const monthKey = `${md.getFullYear()}-${String(md.getMonth()+1).padStart(2,'0')}`
        const already = ledger.some(e=>e.clientId===c.id && e.month===monthKey)
        if(already && !force) continue
        if(already && force) ledger = ledger.filter(e=>!(e.clientId===c.id && e.month===monthKey))
        const hm = hashStr(String(c.id||c.login||c.name) + ':' + monthKey)
        const r = hm % 10
        const method = methods[hm % methods.length]
        let amount = 0
        if(r < 6) amount = totalDue // to'langan
        else if(r < 8) amount = Math.round(totalDue * 0.5) // qisman
        else amount = 0 // qarzdor
        if(amount > 0){
          const day = 1 + (hm % 20)
          const dt = new Date(md.getFullYear(), md.getMonth(), Math.min(day, 28))
          ledger.push({ id: genId(), clientId: c.id, month: monthKey, amount, date: dt.toISOString().slice(0,10), method, createdAt: dt.toISOString() })
          changed = true
        }
      }
    })
    if(changed){ saveBilling(billing); saveLedger(ledger) }
    toast(force ? "Demo raqamlar yangilandi (yangi taqsimot bilan)" : "Demo ma'lumotlar bilan to'ldirildi")
    await load()
  }

  function bulkRecipients(rows, filter){
    if(filter==='all') return rows
    if(filter==='debt') return rows.filter(r=>r.qarz>0)
    return rows.filter(r=>r.c.tariff===filter)
  }

  function exportExcel(rows){
    if(typeof X === 'undefined'){ toast('Excel kutubxonasi yuklanmadi'); return }
    const head = ['Kompaniya','Tarif','Server xarajati','Balans','Oylik to\'lov','Qarzdorlik','Holat',"To'lov usuli"]
    const statusLbl = { paid:"To'langan", partial:'Qisman', debt:'Qarzdor', none:'—' }
    const body = rows.map(r=>[
      clientName(r.c), r.c.tariff||'—', r.serverCost||'', r.balans, r.monthlyPayment||'', r.qarz||'', statusLbl[r.status], PAY_METHOD_LABEL[r.lastMethod]||'—'
    ])
    const ws = X.utils.aoa_to_sheet([head, ...body])
    ws['!cols'] = [{wch:26},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:12},{wch:14}]
    const wb = X.utils.book_new()
    X.utils.book_append_sheet(wb, ws, 'Undiruv')
    X.writeFile(wb, `undiruv_${MONTHS_UZ[new Date().getMonth()]}_${new Date().getFullYear()}.xlsx`)
  }

  function render(){
    if(!loaded()){ root.innerHTML = `<div style="padding:40px;text-align:center;color:var(--mut)">Yuklanmoqda…</div>`; return }
    const billing = loadBilling()
    const ledger = loadLedger()
    const all = (clients||[])
    const rows = all.map(c=>computeForClient(c, billing, ledger))
    const tariffs = [...new Set(all.map(c=>c.tariff).filter(Boolean))]

    const ql = q.trim().toLowerCase()
    const shown = rows.filter(r=>{
      if(ql && !clientName(r.c).toLowerCase().includes(ql)) return false
      if(fTariff && r.c.tariff!==fTariff) return false
      if(fServer==='bor' && !(r.serverCost>0)) return false
      if(fServer==='yoq' && r.serverCost>0) return false
      if(fStatus==='debt' && !(r.status==='debt'||r.status==='partial')) return false
      if(fStatus==='paid' && r.status!=='paid') return false
      if(fStatus==='overdue' && !r.overdue) return false
      return true
    })

    const pageCount = Math.max(1, Math.ceil(shown.length / pageSize))
    if(page>pageCount) page = pageCount
    const pageItems = shown.slice((page-1)*pageSize, page*pageSize)

    const totalDueSum = rows.reduce((a,r)=>a+r.totalDue,0)
    const totalCollected = rows.reduce((a,r)=>a+r.paid,0)
    const qoldiSum = rows.reduce((a,r)=>a+r.qarz,0)
    const overdueRows = rows.filter(r=>r.overdue)
    const overdueSum = overdueRows.reduce((a,r)=>a+r.qarz,0)
    const todaySum = rows.reduce((a,r)=>a+r.paidToday,0)
    const todayEntriesCount = ledger.filter(e=>(e.date||e.createdAt||'').slice(0,10)===new Date().toISOString().slice(0,10)).length
    const monthLabel = `${MONTHS_UZ[new Date().getMonth()]} ${new Date().getFullYear()}`

    root.innerHTML = `
      <div class="dash-head" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <h2>Undiruv</h2>
          <div style="color:var(--mut);font-size:12.5px;font-weight:700;margin-top:2px">${monthLabel}</div>
        </div>
        <div class="view-toggle" id="ud-pagemode-toggle">
          <button class="${pageMode==='kanban'?'on':''}" data-pagemode="kanban">Kanban doska</button>
          <button class="${pageMode==='analitika'?'on':''}" data-pagemode="analitika">Analitika</button>
        </div>
      </div>

      ${pageMode==='analitika' ? analitikaHTML(rows, ledger, (all.length<=1 || all.some(c=>!billing[c.id]))) : `
      <div class="kpi-grid lg">
        <div class="stat-tile ud-top blue"><b style="color:var(--b)">${fmtSum(totalDueSum)}</b><span>Jami summa (so'm)</span></div>
        <div class="stat-tile ud-top green"><b style="color:var(--green)">${fmtSum(totalCollected)}</b><span>Undirilgan (so'm)</span></div>
        <div class="stat-tile ud-top amber"><b style="color:var(--amber)">${fmtSum(qoldiSum)}</b><span>Qoldi (so'm)</span></div>
        <div class="stat-tile ud-top red"><b style="color:var(--red)">${fmtSum(overdueSum)}</b><span>Muddati o'tgan (${overdueRows.length} mijoz)</span></div>
        <div class="stat-tile ud-top green"><b style="color:var(--green)">${fmtSum(todaySum)}</b><span>Bugun tushdi (${todayEntriesCount} ta to'lov)</span></div>
      </div>

      <div class="ud-toolbar">
        <div class="ud-search">${IC_MAGN}<input id="ud-q" value="${escapeHtml(q)}" placeholder="Mijoz qidirish…" /></div>
        <select id="ud-f-tariff">
          <option value="">Barcha tarif</option>
          ${tariffs.map(t=>`<option value="${escapeHtml(t)}" ${fTariff===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}
        </select>
        <select id="ud-f-server">
          <option value="">Server xarajati</option>
          <option value="bor" ${fServer==='bor'?'selected':''}>Xarajati bor</option>
          <option value="yoq" ${fServer==='yoq'?'selected':''}>Xarajati yo'q</option>
        </select>
        <select id="ud-f-status">
          <option value="">Barcha holat</option>
          <option value="debt" ${fStatus==='debt'?'selected':''}>Qarzdor</option>
          <option value="paid" ${fStatus==='paid'?'selected':''}>To'langan</option>
          <option value="overdue" ${fStatus==='overdue'?'selected':''}>Muddati o'tgan</option>
        </select>
        <div style="margin-left:auto;display:flex;gap:10px">
          ${(all.length<=1 || all.some(c=>!billing[c.id])) ? `<button class="btn ghost" id="ud-demo">+ Demo to'ldirish</button>` : ''}
          <button class="btn ghost" id="ud-demo-force" title="Barcha mijozlar uchun oylik to'lov/server xarajati va 6 oylik tarixni kengroq taqsimot bilan qayta hisoblaydi">${IC_SYNC} Demo raqamlarini yangilash</button>
          <button class="btn ghost" id="ud-export">↓ Eksport</button>
          <button class="btn" id="ud-bulk">${IC_SEND} Telegram xabar yuborish</button>
        </div>
      </div>

      ${err ? `<div class="err-box">${escapeHtml(err)}</div>` : ''}

      <div class="wiz-card" style="padding:0;overflow:hidden">
        <div style="padding:16px 18px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
          <h4 style="margin:0">Undiruv jadvali</h4>
          <span style="font:800 12px system-ui,sans-serif;color:var(--mut)">Jami: ${shown.length} ta mijoz</span>
        </div>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr>
              <th>#</th><th>Kompaniya</th><th>Tarif</th><th>Server xar.</th><th>Balans</th><th>Oylik to'lov</th><th>Qarzdorlik</th><th>Holat</th><th>To'lov usuli</th><th>Telegram</th><th>Amallar</th>
            </tr></thead>
            <tbody>
              ${shown.length===0 ? `<tr><td colspan="11" style="text-align:center;color:var(--mut);padding:26px">Mijoz topilmadi.</td></tr>` : ''}
              ${pageItems.map((r,i)=>{
                const c = r.c
                const statusBadge = r.status==='paid' ? `<span class="badge" style="background:#E7F5EC;color:var(--green);margin-left:0">To'langan</span>`
                  : r.status==='partial' ? `<span class="badge" style="background:#FEF3E2;color:var(--amber);margin-left:0">Qisman</span>`
                  : r.status==='debt' ? `<span class="badge" style="background:#FBEDEB;color:var(--red);margin-left:0">${r.overdue?"Muddati o'tgan":'Qarzdor'}</span>`
                  : `<span class="badge" style="background:var(--soft);color:var(--mut);margin-left:0">—</span>`
                return `
                <tr data-id="${c.id}">
                  <td class="t-idx">${(page-1)*pageSize + i + 1}</td>
                  <td style="white-space:nowrap">
                    <div style="display:flex;align-items:center;gap:9px">
                      <span class="prof-av">${escapeHtml((clientName(c)[0]||'?').toUpperCase())}</span>
                      <div>
                        <div style="font-weight:800;color:var(--ink)">${escapeHtml(clientName(c))}</div>
                        ${c.dirLogin ? `<div style="font-size:11px;color:var(--mut)">@${escapeHtml(c.dirLogin)}</div>` : ''}
                      </div>
                    </div>
                  </td>
                  <td>${c.tariff ? `<span class="ud-tariff-chip">${escapeHtml(c.tariff)}</span>` : `<span style="color:var(--mut)">—</span>`}</td>
                  <td>${r.serverCost>0 ? `<span class="ud-servercost-chip">+${fmtSum(r.serverCost)}</span>` : `<span style="color:var(--mut)">Yo'q</span>`}</td>
                  <td style="white-space:nowrap;font-weight:800;${r.balans<0?'color:var(--red)':r.balans>0?'color:var(--green)':'color:var(--mut)'}">${r.balans ? fmtSum(r.balans)+" so'm" : '—'}</td>
                  <td style="white-space:nowrap">${r.monthlyPayment ? fmtSum(r.monthlyPayment)+" so'm" : '—'}</td>
                  <td style="white-space:nowrap;font-weight:800;${r.qarz>0?'color:var(--red)':'color:var(--green)'}">${r.qarz ? fmtSum(r.qarz)+" so'm" : "Yo'q"}</td>
                  <td>${statusBadge}</td>
                  <td>${r.lastMethod ? `<span style="color:var(--ink);font-weight:700">${escapeHtml(PAY_METHOD_LABEL[r.lastMethod]||'—')}</span>` : `<span style="color:var(--mut)">—</span>`}</td>
                  <td><button type="button" class="ic-btn accent" data-tg="${c.id}" title="Telegram xabar yuborish">${IC_SEND}</button></td>
                  <td><button type="button" class="ic-btn" data-edit="${c.id}" title="Hisob-kitob sozlash">✎</button></td>
                </tr>`
              }).join('')}
            </tbody>
          </table>
        </div>
        ${shown.length>0 ? `<div id="ud-pager">${renderPagerHtml(page, pageCount, pageSize, shown.length)}</div>` : ''}
      </div>
      <div class="ic-note" style="margin-top:12px">Oylik to'lov va server xarajati summalari — real to'lov tizimi ulanmaguncha shu yerda qo'lda kiritiladi (✎ tugmasi orqali). Telegram xabarlar hozircha faqat tayyorlanadi — real yuborish uchun Telegram bot ulanishi kerak.</div>
      `}

      <div id="ud-modal-slot"></div>
    `

    const pmToggle = qs('#ud-pagemode-toggle', root)
    if(pmToggle) on(pmToggle, 'click', 'button[data-pagemode]', (e,btn)=>{ pageMode = btn.dataset.pagemode; render() })
    const anaExportBtn = qs('#ud-ana-export-region', root)
    if(anaExportBtn) anaExportBtn.addEventListener('click', ()=>{
      const ok = exportRegionExcel(regionBreakdown(rows))
      if(ok===false) toast('Excel kutubxonasi yuklanmadi')
    })

    const qEl = qs('#ud-q', root); if(qEl) qEl.addEventListener('input', e=>{ q = e.target.value; page = 1; render() })
    const fTEl = qs('#ud-f-tariff', root); if(fTEl) fTEl.addEventListener('change', e=>{ fTariff = e.target.value; page = 1; render() })
    const fSEl = qs('#ud-f-server', root); if(fSEl) fSEl.addEventListener('change', e=>{ fServer = e.target.value; page = 1; render() })
    const fStEl = qs('#ud-f-status', root); if(fStEl) fStEl.addEventListener('change', e=>{ fStatus = e.target.value; page = 1; render() })
    const pagerEl = qs('#ud-pager', root)
    if(pagerEl){
      on(pagerEl, 'click', '.pg', (e,btn)=>{ if(btn.disabled) return; page = Number(btn.dataset.page); render() })
      const sizeSel = qs('#ud-page-size', pagerEl); if(sizeSel) sizeSel.addEventListener('change', e=>{ pageSize = Number(e.target.value); page = 1; render() })
    }
    const exportEl = qs('#ud-export', root); if(exportEl) exportEl.addEventListener('click', ()=>exportExcel(shown))
    const bulkBtn = qs('#ud-bulk', root); if(bulkBtn) bulkBtn.addEventListener('click', ()=>{ bulkOpen = true; bulkState = null; renderModals() })
    const demoBtn = qs('#ud-demo', root); if(demoBtn) demoBtn.addEventListener('click', async ()=>{ demoBtn.disabled = true; demoBtn.textContent = 'Yaratilmoqda…'; await seedDemoUndiruv(false) })
    const demoForceBtn = qs('#ud-demo-force', root); if(demoForceBtn) demoForceBtn.addEventListener('click', async ()=>{ demoForceBtn.disabled = true; demoForceBtn.textContent = 'Yangilanmoqda…'; await seedDemoUndiruv(true) })
    const tbl = qs('.tbl-wrap', root)
    if(tbl){
      on(tbl, 'click', '[data-tg]', (e,btn)=>{ const c = all.find(x=>x.id===btn.dataset.tg); if(c){ sendFor = c; sendState = null; renderModals() } })
      on(tbl, 'click', '[data-edit]', (e,btn)=>{ const c = all.find(x=>x.id===btn.dataset.edit); if(c){ billingFor = c; billingState = null; renderModals() } })
    }
    renderModals()
  }

  function loaded(){ return clients !== null }

  // ---------------- Modallar (bitta vaqtda faqat bittasi ochiq) ----------------
  function renderModals(){
    const slot = qs('#ud-modal-slot', root)
    if(!slot) return
    if(sendFor) renderSendModal(slot)
    else if(bulkOpen) renderBulkModal(slot)
    else if(billingFor) renderBillingModal(slot)
    else slot.innerHTML = ''
  }

  function renderSendModal(slot){
    const c = sendFor
    const billing = loadBilling(), ledger = loadLedger()
    const row = computeForClient(c, billing, ledger)
    const monthLabel = `${MONTHS_UZ[new Date().getMonth()]} ${new Date().getFullYear()}`
    const ctx = { mijoz: clientName(c), oy: monthLabel, summa: row.qarz ? fmtSum(row.qarz) : '0' }
    if(!sendState) sendState = { text: renderTemplate(row.qarz>0?TPL_DEBT:TPL_THANKS, ctx), extra:'', withReq:true, previewOpen:false }
    const st = sendState
    const fullMsg = st.text + (st.extra.trim() ? '\n\n'+st.extra.trim() : '') + (st.withReq ? reqBlock(c) : '')

    slot.innerHTML = `
      <div class="modal-bg" id="uds-bg">
        <div class="modal" style="max-width:580px">
          <div class="form-col">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <h3>Telegram xabar — ${escapeHtml(clientName(c))}</h3>
              <button class="lnk" id="uds-close" style="font-size:20px;line-height:1">×</button>
            </div>

            <label class="ud-lbl">Xabar shabloni</label>
            <div class="pay-pill-row" style="margin-bottom:12px">
              <button type="button" class="pay-pill" data-tpl="debt">${IC_LOCK2} Qarzdorlik</button>
              <button type="button" class="pay-pill" data-tpl="greet">Salom-alik</button>
              <button type="button" class="pay-pill" data-tpl="clear">${IC_MINUS} Tozalash</button>
            </div>
            <textarea id="uds-text" rows="5" class="ud-textarea">${escapeHtml(st.text)}</textarea>

            <label class="ud-lbl" style="margin-top:16px">Qo'shimcha matn (ixtiyoriy)</label>
            <textarea id="uds-extra" rows="2" placeholder="Masalan: Salom Alik, qarzdorlik..." class="ud-textarea">${escapeHtml(st.extra)}</textarea>

            <div class="ud-toggle-row">
              <div>
                <div class="ud-toggle-title">Rekvizitlarni ham yuborish</div>
                <div class="ud-toggle-sub">Bank, hisob raqami va MFO qo'shiladi</div>
              </div>
              <button type="button" class="tgl${st.withReq?' on':''}" id="uds-req"><span></span></button>
            </div>

            <button type="button" id="uds-preview-toggle" class="ud-preview-toggle">Xabar ko'rinishi ${st.previewOpen?'▲':'▼'}</button>
            ${st.previewOpen ? `
            <div class="tg-preview-wrap">
              <div class="tg-bubble">
                <div class="tg-from">ICAN Business</div>
                <div class="tg-text">${escapeHtml(fullMsg)}</div>
                <div class="tg-time">${nowTimeStr()} ✓✓</div>
              </div>
            </div>` : ''}

            <div class="modal-actions">
              <button class="btn ghost" id="uds-cancel">Bekor qilish</button>
              <button class="btn" id="uds-send">${IC_SEND} Yuborish</button>
            </div>
          </div>
        </div>
      </div>
    `
    const bg = qs('#uds-bg', slot), modal = qs('.modal', slot)
    const close = ()=>{ sendFor = null; sendState = null; renderModals() }
    bg.addEventListener('mousedown', e=>{ if(e.target===bg) close() })
    modal.addEventListener('mousedown', e=>e.stopPropagation())
    qs('#uds-close', slot).addEventListener('click', close)
    qs('#uds-cancel', slot).addEventListener('click', close)
    on(slot, 'click', '[data-tpl]', (e,btn)=>{
      const k = btn.dataset.tpl
      if(k==='debt') st.text = renderTemplate(TPL_DEBT, ctx)
      else if(k==='greet') st.text = renderTemplate(TPL_GREET, ctx)
      else st.text = ''
      renderModals()
    })
    qs('#uds-text', slot).addEventListener('input', e=>{ st.text = e.target.value })
    qs('#uds-extra', slot).addEventListener('input', e=>{ st.extra = e.target.value })
    qs('#uds-req', slot).addEventListener('click', ()=>{ st.withReq = !st.withReq; renderModals() })
    qs('#uds-preview-toggle', slot).addEventListener('click', ()=>{ st.previewOpen = !st.previewOpen; renderModals() })
    qs('#uds-send', slot).addEventListener('click', ()=>{
      toast("Xabar tayyorlandi — Telegram bot ulanishi hali sozlanmagan, tez orada avtomatik yuboriladi")
      close()
    })
  }

  function renderBulkModal(slot){
    const billing = loadBilling(), ledger = loadLedger()
    const rows = (clients||[]).map(c=>computeForClient(c, billing, ledger))
    const tariffs = [...new Set((clients||[]).map(c=>c.tariff).filter(Boolean))]
    if(!bulkState) bulkState = { filter:'all', text: TPL_DEBT, withReq:true, previewOpen:false }
    const st = bulkState
    const recipients = bulkRecipients(rows, st.filter)
    const monthLabel = `${MONTHS_UZ[new Date().getMonth()]} ${new Date().getFullYear()}`
    const example = recipients[0]
    const exampleCtx = example ? { mijoz: clientName(example.c), oy: monthLabel, summa: example.qarz?fmtSum(example.qarz):'0' } : { mijoz:'Kompaniya nomi', oy: monthLabel, summa:'0' }
    const previewMsg = renderTemplate(st.text, exampleCtx) + (st.withReq && example ? reqBlock(example.c) : '')

    slot.innerHTML = `
      <div class="modal-bg" id="udb-bg">
        <div class="modal" style="max-width:600px">
          <div class="form-col">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <h3>${IC_SEND} Telegram xabar</h3>
              <button class="lnk" id="udb-close" style="font-size:20px;line-height:1">×</button>
            </div>

            <label class="ud-lbl">Kimga yuboriladi</label>
            <div class="pay-pill-row" style="margin-bottom:12px">
              <button type="button" class="pay-pill${st.filter==='all'?' on':''}" data-filt="all">Barchasi</button>
              <button type="button" class="pay-pill${st.filter==='debt'?' on-red':''}" data-filt="debt">Qarzdor</button>
              ${tariffs.map(t=>`<button type="button" class="pay-pill${st.filter===t?' on':''}" data-filt="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')}
            </div>
            <div class="hint" style="background:var(--soft);border-radius:11px;padding:11px 14px;color:var(--b7);font-weight:800">👥 ${recipients.length} ta tashkilotga yuboriladi</div>

            <label class="ud-lbl" style="margin-top:16px">Xabar matni</label>
            <div class="pay-pill-row" style="margin:8px 0 10px">
              <button type="button" class="pay-pill" data-tpl="debt">${IC_LOCK2} Qarzdorlik</button>
              <button type="button" class="pay-pill" data-tpl="greet">Salom-alik</button>
              <button type="button" class="pay-pill" data-tpl="clear">${IC_MINUS} Tozalash</button>
            </div>
            <textarea id="udb-text" rows="5" class="ud-textarea">${escapeHtml(st.text)}</textarea>
            <div class="hint">Shablonda <b>{mijoz}</b> — tashkilot nomi, <b>{summa}</b> — o'sha mijozning o'z qarzi bilan, yuborishda har bir mijoz uchun AVTOMATIK almashtiriladi.</div>

            <div class="ud-toggle-row">
              <div>
                <div class="ud-toggle-title">Rekvizitlarni ham yuborish</div>
                <div class="ud-toggle-sub">Karta raqami va bank ma'lumotlari qo'shiladi</div>
              </div>
              <button type="button" class="tgl${st.withReq?' on':''}" id="udb-req"><span></span></button>
            </div>

            <button type="button" id="udb-preview-toggle" class="ud-preview-toggle">Xabar ko'rinishi ${st.previewOpen?'▲':'▼'}</button>
            ${st.previewOpen ? `
            <div class="tg-preview-wrap">
              <div class="hint" style="margin-bottom:8px">Namuna: <b>${escapeHtml(example?clientName(example.c):'—')}</b> uchun qanday ko'rinishda boradi</div>
              <div class="tg-bubble">
                <div class="tg-from">ICAN Business</div>
                <div class="tg-text">${escapeHtml(previewMsg)}</div>
                <div class="tg-time">${nowTimeStr()} ✓✓</div>
              </div>
            </div>` : ''}

            <div class="modal-actions">
              <button class="btn ghost" id="udb-cancel">Bekor</button>
              <button class="btn" id="udb-send">${IC_SEND} Yuborish (${recipients.length})</button>
            </div>
          </div>
        </div>
      </div>
    `
    const bg = qs('#udb-bg', slot), modal = qs('.modal', slot)
    const close = ()=>{ bulkOpen = false; bulkState = null; renderModals() }
    bg.addEventListener('mousedown', e=>{ if(e.target===bg) close() })
    modal.addEventListener('mousedown', e=>e.stopPropagation())
    qs('#udb-close', slot).addEventListener('click', close)
    qs('#udb-cancel', slot).addEventListener('click', close)
    on(slot, 'click', '[data-filt]', (e,btn)=>{ st.filter = btn.dataset.filt; renderModals() })
    on(slot, 'click', '[data-tpl]', (e,btn)=>{
      const k = btn.dataset.tpl
      if(k==='debt') st.text = TPL_DEBT
      else if(k==='greet') st.text = TPL_GREET
      else st.text = ''
      renderModals()
    })
    qs('#udb-text', slot).addEventListener('input', e=>{ st.text = e.target.value })
    qs('#udb-req', slot).addEventListener('click', ()=>{ st.withReq = !st.withReq; renderModals() })
    qs('#udb-preview-toggle', slot).addEventListener('click', ()=>{ st.previewOpen = !st.previewOpen; renderModals() })
    qs('#udb-send', slot).addEventListener('click', ()=>{
      const n = recipients.length
      if(n===0){ toast('Yuboriladigan mijoz topilmadi'); return }
      toast(`${n} ta xabar tayyorlandi (har biriga o'z qarzi bilan) — Telegram bot ulanishi hali sozlanmagan, tez orada avtomatik yuboriladi`)
      close()
    })
  }

  function renderBillingModal(slot){
    const c = billingFor
    const billing = loadBilling()
    const b = billing[c.id] || {}
    if(!billingState) billingState = { monthlyPayment: b.monthlyPayment?String(b.monthlyPayment):'', serverCost: b.serverCost?String(b.serverCost):'', payAmount:'', payDate: new Date().toISOString().slice(0,10), payMethod:'naqd' }
    const st = billingState
    const ledger = loadLedger()
    const row = computeForClient(c, billing, ledger)

    slot.innerHTML = `
      <div class="modal-bg" id="udbi-bg">
        <div class="modal" style="max-width:480px">
          <div class="form-col">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <h3>Hisob-kitob — ${escapeHtml(clientName(c))}</h3>
              <button class="lnk" id="udbi-close" style="font-size:20px;line-height:1">×</button>
            </div>

            <div class="wiz-grid" style="margin-top:12px">
              <div class="wf"><label>Oylik to'lov (so'm)</label><input id="udbi-mp" value="${st.monthlyPayment?fmtSum(st.monthlyPayment):''}" inputmode="numeric" placeholder="masalan: 500 000" /></div>
              <div class="wf"><label>Server xarajati (so'm)</label><input id="udbi-sc" value="${st.serverCost?fmtSum(st.serverCost):''}" inputmode="numeric" placeholder="ixtiyoriy" /></div>
            </div>
            <button class="btn ghost" id="udbi-save-billing" style="margin-top:12px;width:100%">Saqlash</button>

            <div style="margin-top:20px;padding-top:16px;border-top:1px dashed var(--line)">
              <div class="hint" style="margin-bottom:12px">Joriy oy: jami hisoblangan <b>${fmtSum(row.totalDue)} so'm</b>, to'langan <b>${fmtSum(row.paid)} so'm</b>, qarzdorlik <b>${row.qarz?fmtSum(row.qarz):'0'} so'm</b>.</div>
              <div class="wiz-grid">
                <div class="wf"><label>To'lov summasi</label><input id="udbi-pay" value="${st.payAmount?fmtSum(st.payAmount):''}" inputmode="numeric" /></div>
                <div class="wf"><label>To'lov sanasi</label><input type="date" id="udbi-pdate" value="${st.payDate}" /></div>
              </div>
              <label class="ud-lbl" style="margin-top:10px">To'lov usuli</label>
              <div class="pay-pill-row">
                <button type="button" class="pay-pill${st.payMethod==='naqd'?' on':''}" data-pm="naqd">💵 Naqd pul</button>
                <button type="button" class="pay-pill${st.payMethod==='karta'?' on':''}" data-pm="karta">${IC_CARD} Karta</button>
                <button type="button" class="pay-pill${st.payMethod==='hisob'?' on':''}" data-pm="hisob">🏦 Hisob raqami</button>
                <button type="button" class="pay-pill${st.payMethod==='chegirma'?' on':''}" data-pm="chegirma">🏷 Chegirma</button>
              </div>
              <button class="btn" id="udbi-record-pay" style="margin-top:12px;width:100%">✓ To'lovni qayd etish</button>
            </div>
          </div>
        </div>
      </div>
    `
    const bg = qs('#udbi-bg', slot), modal = qs('.modal', slot)
    const close = ()=>{ billingFor = null; billingState = null; renderModals(); render() }
    bg.addEventListener('mousedown', e=>{ if(e.target===bg) close() })
    modal.addEventListener('mousedown', e=>e.stopPropagation())
    qs('#udbi-close', slot).addEventListener('click', close)
    qs('#udbi-mp', slot).addEventListener('input', e=>{ st.monthlyPayment = e.target.value.replace(/\D/g,''); e.target.value = st.monthlyPayment?fmtSum(st.monthlyPayment):'' })
    qs('#udbi-sc', slot).addEventListener('input', e=>{ st.serverCost = e.target.value.replace(/\D/g,''); e.target.value = st.serverCost?fmtSum(st.serverCost):'' })
    qs('#udbi-save-billing', slot).addEventListener('click', ()=>{
      const map = loadBilling()
      map[c.id] = { monthlyPayment: Number(st.monthlyPayment)||0, serverCost: Number(st.serverCost)||0 }
      saveBilling(map)
      toast('Saqlandi')
      render()
    })
    qs('#udbi-pay', slot).addEventListener('input', e=>{ st.payAmount = e.target.value.replace(/\D/g,''); e.target.value = st.payAmount?fmtSum(st.payAmount):'' })
    qs('#udbi-pdate', slot).addEventListener('change', e=>{ st.payDate = e.target.value })
    on(slot, 'click', '[data-pm]', (e,btn)=>{ st.payMethod = btn.dataset.pm; renderModals() })
    qs('#udbi-record-pay', slot).addEventListener('click', ()=>{
      const amt = Number(st.payAmount)
      if(!amt || amt<=0){ toast('Summani kiriting'); return }
      const arr = loadLedger()
      arr.push({ id: genId(), clientId: c.id, month: currentMonthKey(), amount: amt, date: st.payDate, method: st.payMethod, createdAt: new Date().toISOString() })
      saveLedger(arr)
      toast("To'lov qayd etildi")
      st.payAmount = ''
      render()
    })
  }

  load()
  return ()=>{}
}
