// Moliya → Umumiy statistika. DIQQAT: bu sahifadagi barcha raqamlar hozircha
// namunaviy (demo) ma'lumot — moliyaviy backend endpointlari hali ulanmagan.
// Ma'lumotlar ulanganda quyidagi konstantalar (KPIS/DETAILS/REGIONS/…) API
// javoblari bilan almashtiriladi, chizish mantig'i o'zgarmaydi.
import { qs, on, escapeHtml } from '../core.js'
import { demoNote } from './demo-kit.js'

const IC = (d, sz, sw) => `<svg width="${sz||18}" height="${sz||18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw||1.8}" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"></path></svg>`

const KPIS = [
  { icon:'M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M15 9h.01M15 13h.01', tile:'soft', label:'Faol kompaniyalar', value:'1 838', delta:'▲ 3.2% oyga nisbatan', deltaColor:'green' },
  { icon:'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12.5 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M18 8l5 5M23 8l-5 5', tile:'red', label:"Faol bo'lmagan", value:'705', delta:'▼ 1.1%', deltaColor:'green' },
  { icon:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M8 13h8M8 17h5', tile:'soft', label:'Faol shartnomalar', value:'10 533', delta:'▲ 512 yangi', deltaColor:'green' },
  { icon:'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2', tile:'neutral', label:'Portfel qarzdorligi', value:'56.36 mlrd', delta:'UZS', deltaColor:'mut' },
  { icon:'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3', tile:'green', label:"To'langan summa", value:'56.36 mlrd', delta:"97.2% yig'ilish", deltaColor:'green' },
  { icon:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2', tile:'red', label:'Qarz kechikishi', value:'269.3 mln', delta:'339 ta · 2.76%', deltaColor:'red' },
]

const DETAILS = [
  { title:'Faol kompaniyalar', sub:'hududlar kesimida · kompaniyalar va faol shartnomalar', badge:'Jami 1 838', head:['Viloyat','Kompaniyalar','Faol shartn.','Qarzdorlik'],
    rows:[['Фергана','573','1 671','7.46 mlrd'],['г. Ташкент','354','695','6.26 mlrd'],['Наманган','248','866','4.95 mlrd'],['Самарканд','231','1 146','8.18 mlrd'],['Бухара','164','660','4.29 mlrd'],['Андижан','160','1 019','4.76 mlrd'],['Ташкентская обл.','157','336','1.83 mlrd'],['Каракалпакстан','129','907','4.07 mlrd']] },
  { title:"Faol bo'lmagan kompaniyalar", sub:'holat kesimida', badge:'Jami 705', head:['Holat','Soni','Ulush',''],
    rows:[['Faol kompaniyalar','1 838','72.3%',''],["Faol bo'lmagan",'705','27.7%',''],['Jami','2 543','100%','']] },
  { title:'Faol shartnomalar', sub:'hududlar kesimida · soni, summasi va qarzdorlik', badge:'Jami 10 533 · 57.99 mlrd', head:['Viloyat','Soni','Summa','Qarzdorlik'],
    rows:[['Фергана','1 671','7.24 mlrd','7.46 mlrd'],['Самарканд','1 146','7.85 mlrd','8.18 mlrd'],['Хорезм','1 063','5.64 mlrd','5.18 mlrd'],['Андижан','1 019','4.66 mlrd','4.76 mlrd'],['Каракалпакстан','907','4.20 mlrd','4.07 mlrd'],['Наманган','866','4.78 mlrd','4.95 mlrd'],['г. Ташкент','695','7.28 mlrd','6.26 mlrd'],['Бухара','660','4.57 mlrd','4.29 mlrd']] },
  { title:'Shartnoma portfeli (qarzdorlik)', sub:'hududlar kesimida · eng kattadan', badge:'56.36 mlrd UZS', head:['Viloyat','Qarzdorlik',"Muddati o'tgan",'Ulush'],
    rows:[['Самарканд','8.18 mlrd','18.7 mln','14.5%'],['Фергана','7.46 mlrd','28.8 mln','13.2%'],['г. Ташкент','6.26 mlrd','18.6 mln','11.1%'],['Хорезм','5.18 mlrd','22.8 mln','9.2%'],['Наманган','4.95 mlrd','27.1 mln','8.8%'],['Андижан','4.76 mlrd','11.9 mln','8.4%'],['Бухара','4.29 mlrd','26.1 mln','7.6%'],['Каракалпакстан','4.07 mlrd','5.5 mln','7.2%']] },
  { title:"To'langan summa", sub:"to'lov turlari kesimida", badge:'105.79 mlrd · 143 468 ta', head:["To'lov turi",'Soni','Summa','Ulush'],
    rows:[['Naqd','57 060','60.70 mlrd','57.4%'],["Avtoto'lov",'49 742','15.87 mlrd','15.0%'],['Click','15 321','13.53 mlrd','12.8%'],['Terminal','7 395','5.00 mlrd','4.7%'],['Chegirma','2 927','2.67 mlrd','2.5%'],["Avtoto'lov Uniaccess",'4 507','1.80 mlrd','1.7%'],['Payme','1 342','1.48 mlrd','1.4%'],['MIB','1 825','1.48 mlrd','1.4%']] },
  { title:'Qarz kechikishi', sub:"hududlar kesimida · muddati o'tgan qarzlar", badge:'269.3 mln · 339 ta · 2.76%', head:['Viloyat','Soni',"Muddati o'tgan",''],
    rows:[['Наманган','66','27.1 mln',''],['Фергана','52','28.8 mln',''],['Андижан','35','12.0 mln',''],['г. Ташкент','26','18.6 mln',''],['Навои','26','33.0 mln',''],['Самарканд','21','18.7 mln',''],['Ташкентская обл.','20','22.4 mln',''],['Хорезм','20','22.8 mln','']] },
]

// [nom, kompaniyalar, faol shartnomalar, summa, qarzdorlik, kechikish, kechikkanlar soni, qora ro'yxat, ulush (bar uchun)]
const REGIONS = [
  ['Фергана','573','1671','7.24 mlrd','7.46 mlrd','28.8 mln','52','771','100%'],
  ['Самарканд','231','1146','7.85 mlrd','8.18 mlrd','18.7 mln','21','199','69%'],
  ['Хорезм','100','1063','5.64 mlrd','5.18 mlrd','22.8 mln','20','2','64%'],
  ['Андижан','160','1019','4.66 mlrd','4.76 mlrd','11.9 mln','35','416','61%'],
  ['Каракалпакстан','129','907','4.20 mlrd','4.07 mlrd','5.5 mln','7','262','54%'],
  ['Наманган','248','866','4.78 mlrd','4.95 mlrd','27.1 mln','66','173','52%'],
  ['г. Ташкент','354','695','7.28 mlrd','6.26 mlrd','18.6 mln','26','1563','42%'],
  ['Бухара','164','660','4.57 mlrd','4.29 mlrd','26.1 mln','19','71','39%'],
  ['Кашкадарья','56','658','2.72 mlrd','2.53 mlrd','34.0 mln','16','40','39%'],
  ['Сырдарья','31','518','2.23 mlrd','2.22 mlrd','3.8 mln','6','14','31%'],
  ['Джизак','82','453','2.16 mlrd','1.93 mlrd','8.9 mln','17','22','27%'],
  ['Навои','101','383','1.93 mlrd','1.82 mlrd','33.0 mln','26','5','23%'],
  ['Ташкентская обл.','157','336','1.92 mlrd','1.83 mlrd','22.4 mln','20','37','20%'],
  ['Сурхандарья','59','158','0.83 mlrd','0.87 mlrd','7.6 mln','8','6','9%'],
]

const MODAL_COMPANIES = [
  { name:'Techno Plaza',   tariff:'Premium +',      summa:'12 400 000', debt:'4 130 000',  status:'Faol' },
  { name:'Idea Market',    tariff:'premium',        summa:'8 900 000',  debt:'2 950 000',  status:'Faol' },
  { name:'Mobile House',   tariff:'Premium 3 mln',  summa:'15 200 000', debt:'7 600 000',  status:'Kechikkan' },
  { name:'Smart Savdo',    tariff:'Филиал',         summa:'6 750 000',  debt:'0',          status:'Yakunlangan' },
  { name:'Premium Store',  tariff:'standart+',      summa:'21 300 000', debt:'10 650 000', status:'Faol' },
  { name:'Alfa Telecom',   tariff:'Premium 2 mln',  summa:'9 480 000',  debt:'3 160 000',  status:'Kechikkan' },
]
const MODAL_NUMS = ['#10245','#10382','#10519','#10656','#10793','#10930']
const STATUS_CLS = { 'Faol':'green', 'Kechikkan':'red', 'Yakunlangan':'mut' }

const INTEGRATIONS = [['Atmos','1 163',true],['ICAN','185',true],['CRIF','0',false],['E-gov','0',false],['KATM','0',false],['MyUzcard','0',false]]
const DIRECTIONS = [["Sotuv yo'nalishi",'1 839','98%','teal'],['Moliya','29','8%','blue'],["Ta'lim",'3','3%','amber'],["Xizmat ko'rsatish",'2','2%','pink']]

const TARIFFS = [['Premium +','2 883','100%'],['premium','2 877','99%'],['Premium 3 mln','2 399','83%'],['Филиал','2 181','76%'],['Premium 2 mln','482','17%'],['Premium 2,5 mln','381','13%'],['standart+','302','10%'],['standart','109','4%'],['Standart + 1,2 mln','32','2%'],['IMEI / boshqalar','2','1%']]
const TX = [['Naqd','60.70 mlrd','57%','teal'],["Avtoto'lov",'15.87 mlrd','15%','ink'],['Click','13.53 mlrd','13%','blue'],['Terminal','5.00 mlrd','5%','pink'],['Chegirma','2.67 mlrd','2.5%','amber'],['Boshqalar (Payme, Uzum, MIB…)','8.02 mlrd','7.5%','mut']]

const YEARS = ['2021','2022','2023','2024','2025','2026']
const CV    = [1240,2980,5120,7460,9840,10533]
const BV    = [95,310,780,1650,2870,3581]
const AVG_C = [3.2,3.8,4.3,4.8,5.1,5.35]
const AVG_B = [1.8,2.1,2.4,2.7,2.9,3.07]

const SMS = [["To'lov kuni qarzdorlik xabari",'84 325','100%'],["Shartnoma to'lovini qabul qilish",'64 872','77%'],["Avtoto'lov",'52 802','63%'],['Qarzdorlik haqida xabarnoma','31 727','38%'],['Yuborish','4 540','5.5%'],['Shartnomani rasmiylashtirish','520','1.5%']]
const POCHTA = [['Yaratildi','1 335','100%'],['Jarayonda','202','15%'],['Muvaffaqiyatli yuborildi','92','7%'],["To'liq manzil ko'rsatilmagan",'7','2%'],['Manzilda yashamaydi','7','2%'],['Boshqa sabablar','3','1.5%']]
const AGES = [['18–25','88%','34%'],['26–33','96%','58%'],['34–40','78%','64%'],['41–50','52%','38%'],['50+','28%','18%']]

const HEAT = [
  [.25,.2,.22,.28,.24,.35,.18], [.3,.28,.33,.4,.3,.28,.2], [.7,.65,.75,.95,.8,.6,.35],
  [.8,.75,.85,1,.85,.65,.4], [.65,.6,.7,.8,.75,.55,.3], [.35,.3,.35,.45,.4,.5,.25],
]
const HEAT_ROWS = ['00–04','04–08','08–12','12–16','16–20','20–24']
const WEEK = ['Du','Se','Cho','Pa','Ju','Sha','Ya']

const fmtN = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const growth = (arr, i) => i === 0 ? '—' : '+' + Math.round((arr[i]/arr[i-1]-1)*100) + '%'

function nowLabel(){
  const d = new Date()
  const p = x => String(x).padStart(2,'0')
  return `${p(d.getDate())}.${p(d.getMonth()+1)}, ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function mountStatistika(root, { toast }){
  let kpiSel = 2
  let regionSel = null   // modal uchun tanlangan hudud indeksi
  let yearOpen = null    // yillik diagrammada ochilgan yil indeksi

  // ---- bo'laklar ----
  function headHtml(){
    return `
      <div class="mol-page-head">
        <div>
          <div class="mol-h1">Umumiy statistika</div>
          <div class="mol-sub">Namunaviy kesim · ${nowLabel()}</div>
        </div>
        <div class="mol-head-actions">
          <div class="mol-pillgroup">
            ${['Kun','Hafta','Oy','Yil'].map(p=>`<button type="button" class="mol-pill${p==='Oy'?' on':''}" data-period="${p}">${p}</button>`).join('')}
          </div>
          <div class="mol-pillgroup">
            ${['UZS','USD'].map(c=>`<button type="button" class="mol-pill${c==='UZS'?' on':''}" data-period="${c}">${c}</button>`).join('')}
          </div>
          <button type="button" class="mol-pill mol-pill-solo" data-period="Kompaniya">Kompaniya ⌄</button>
        </div>
      </div>
    `
  }

  function kpiHtml(){
    return `
      <div class="mol-kpi-row">
        ${KPIS.map((k,i)=>`
          <button type="button" class="mol-kpi${i===kpiSel?' sel':''}" data-kpi="${i}">
            <span class="mol-tile ${k.tile}">${IC(k.icon, 18, 1.9)}</span>
            <span class="mol-kpi-lbl">${escapeHtml(k.label)}</span>
            <span class="mol-kpi-val">${escapeHtml(k.value)}</span>
            <span class="mol-kpi-delta ${k.deltaColor}">${escapeHtml(k.delta)}</span>
            ${i===kpiSel?`<span class="mol-kpi-caret">▾</span>`:''}
          </button>`).join('')}
      </div>
    `
  }

  function detailHtml(){
    const d = DETAILS[kpiSel] || DETAILS[0]
    return `
      <div class="mol-card">
        <div class="mol-card-head">
          <div>
            <div class="mol-card-t">${escapeHtml(d.title)}</div>
            <div class="mol-card-s">${escapeHtml(d.sub)}</div>
          </div>
          <span class="mol-badge">${escapeHtml(d.badge)}</span>
        </div>
        <table class="mol-table">
          <thead><tr>${d.head.map((h,i)=>`<th class="${i?'num':''}">${escapeHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>
            ${d.rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${i?'num':'name'}">${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  function regionsHtml(){
    return `
      <div class="mol-card" style="margin-bottom:0">
        <div class="mol-card-head">
          <div>
            <div class="mol-card-t">Hududlar bo'yicha ko'rsatkichlar</div>
            <div class="mol-card-s">14 hudud · faol shartnomalar bo'yicha saralangan</div>
          </div>
          <div class="mol-pillgroup">
            <button type="button" class="mol-pill on" data-regview="list">Ro'yxat</button>
            <button type="button" class="mol-pill" data-regview="map">Xarita</button>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table class="mol-table">
            <thead><tr>
              <th>Viloyat</th><th class="num">Komp.</th><th class="num">Faol sh.</th><th class="num">Summa</th>
              <th class="num">Qarzdorlik</th><th class="num">Kechikish</th><th class="num">K. soni</th><th class="num">Qora r.</th>
            </tr></thead>
            <tbody>
              ${REGIONS.map((r,i)=>`
                <tr class="clk" data-region="${i}">
                  <td class="name">${escapeHtml(r[0])}<span class="mol-mini-bar"><i style="width:${escapeHtml(r[8])}"></i></span></td>
                  <td class="num">${escapeHtml(r[1])}</td>
                  <td class="num">${escapeHtml(r[2])}</td>
                  <td class="num">${escapeHtml(r[3])}</td>
                  <td class="num">${escapeHtml(r[4])}</td>
                  <td class="num" style="color:var(--red);font-weight:800">${escapeHtml(r[5])}</td>
                  <td class="num">${escapeHtml(r[6])}</td>
                  <td class="num">${escapeHtml(r[7])}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  }

  function sideCardsHtml(){
    return `
      <div>
        <div class="mol-card">
          <div class="mol-card-head" style="margin-bottom:8px">
            <div><div class="mol-card-t">Integratsiyalar</div><div class="mol-card-s">bugungi so'rovlar</div></div>
          </div>
          ${INTEGRATIONS.map(([n,v,ok])=>`
            <div class="mol-lrow"><span class="mol-dot" style="background:var(--${ok?'green':'red'})"></span>${escapeHtml(n)}<b>${escapeHtml(v)}</b></div>`).join('')}
          <button type="button" class="mol-link-btn" data-toast="Integratsiyalar sahifasi tez orada">Ochish →</button>
        </div>

        <div class="mol-black">
          <div class="mol-black-t">Qora ro'yxat</div>
          <div class="mol-black-v">3 581 ta</div>
          <div class="mol-black-s">10.99 mlrd qarz · 19.83 mlrd to'langan</div>
          <div class="mol-black-f">Eng ko'p: Тошкент 1563 · Фергана 771</div>
          <button type="button" class="mol-black-btn" data-toast="Qora ro'yxat sahifasi tez orada">Ochish →</button>
        </div>

        <div class="mol-card">
          <div class="mol-card-head" style="margin-bottom:8px">
            <div><div class="mol-card-t">Yo'nalishlar</div><div class="mol-card-s">faol kompaniyalar kesimida</div></div>
          </div>
          ${DIRECTIONS.map(([n,v,p,c])=>`
            <div style="padding:8px 0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <span style="font:700 12px system-ui,sans-serif;color:var(--ink-2)">${escapeHtml(n)}</span>
                <b style="margin-left:auto;font:800 12.5px system-ui,sans-serif;color:var(--ink)">${escapeHtml(v)}</b>
              </div>
              <span class="mol-bar-track"><i class="mol-f-${c}" style="width:${escapeHtml(p)}"></i></span>
            </div>`).join('')}
        </div>
      </div>
    `
  }

  function tariffsHtml(){
    return `
      <div class="mol-card" style="margin-bottom:0">
        <div class="mol-card-head">
          <div><div class="mol-card-t">Tariflar bo'yicha shartnomalar</div><div class="mol-card-s">eng ko'p ishlatilgan tariflar</div></div>
          <span class="mol-badge">Jami 11 668</span>
        </div>
        ${TARIFFS.map(([n,v,p])=>`
          <div class="mol-bar-row">
            <span class="mol-bar-name" title="${escapeHtml(n)}">${escapeHtml(n)}</span>
            <span class="mol-bar-track"><i class="mol-f-teal" style="width:${escapeHtml(p)}"></i></span>
            <span class="mol-bar-val">${escapeHtml(v)}</span>
          </div>`).join('')}
      </div>
    `
  }

  function txHtml(){
    return `
      <div class="mol-card" style="margin-bottom:0">
        <div class="mol-card-head">
          <div><div class="mol-card-t">Tranzaktsiyalar</div><div class="mol-card-s">to'lov turlari kesimida · 105.79 mlrd</div></div>
          <span class="mol-badge">143 468 ta</span>
        </div>
        <div class="mol-seg-bar">
          ${TX.map(([n,v,p,c])=>`<i class="mol-f-${c}" style="width:${escapeHtml(p)}" title="${escapeHtml(n)}"></i>`).join('')}
        </div>
        ${TX.map(([n,v,p,c])=>`
          <div style="padding:7px 0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span class="mol-dot mol-f-${c}"></span>
              <span style="font:700 12px system-ui,sans-serif;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(n)}</span>
              <b style="margin-left:auto;font:800 12.5px system-ui,sans-serif;color:var(--ink);white-space:nowrap">${escapeHtml(v)}</b>
              <span style="font:700 11px system-ui,sans-serif;color:var(--mut);min-width:36px;text-align:right">${escapeHtml(p)}</span>
            </div>
            <span class="mol-bar-track"><i class="mol-f-${c}" style="width:${escapeHtml(p)}"></i></span>
          </div>`).join('')}
        <div class="mol-mini-grid" style="grid-template-columns:repeat(3,1fr);margin:16px 0 0">
          <div class="mol-mini"><span>ICAN kirish</span><b>566.6 mln</b></div>
          <div class="mol-mini"><span>Avtoto'lov jami</span><b>15.87 mlrd</b></div>
          <div class="mol-mini red"><span>Qaytarishlar</span><b>55.1 mln</b></div>
        </div>
      </div>
    `
  }

  function yearsHtml(){
    const maxC = 10533, maxB = 3581
    let panel = ''
    if(yearOpen != null){
      const i = yearOpen
      panel = `
        <div class="mol-year-panel">
          <div class="mol-card-t" style="margin-bottom:12px">${YEARS[i]} — yil kesimi</div>
          <div class="mol-mini-grid" style="grid-template-columns:repeat(3,1fr);margin:0">
            <div class="mol-mini"><span>Tuzilgan shartnoma</span><b>${fmtN(CV[i])} ta</b></div>
            <div class="mol-mini"><span>Portfel summasi</span><b>${(CV[i]*AVG_C[i]/1000).toFixed(2)} mlrd</b></div>
            <div class="mol-mini"><span>O'rtacha shartnoma</span><b>${AVG_C[i].toFixed(2)} mln</b></div>
            <div class="mol-mini red"><span>Qora ro'yxatga kirdi</span><b>${fmtN(BV[i])} ta</b></div>
            <div class="mol-mini red"><span>Qarz summasi</span><b>${(BV[i]*AVG_B[i]/1000).toFixed(2)} mlrd</b></div>
            <div class="mol-mini red"><span>Shartnomalarga ulushi</span><b>${(BV[i]/CV[i]*100).toFixed(1)}%</b></div>
          </div>
        </div>
      `
    }
    return `
      <div class="mol-card">
        <div class="mol-card-head">
          <div><div class="mol-card-t">Yillik dinamika · 2021–2026</div><div class="mol-card-s">shartnomalar va qora ro'yxat o'sishi · yilni bosing</div></div>
          <span class="mol-badge"><span class="mol-dot mol-f-teal"></span>Shartnomalar <span class="mol-dot mol-f-red" style="margin-left:8px"></span>Qora ro'yxat</span>
        </div>
        <div class="mol-year-chart">
          ${YEARS.map((y,i)=>`
            <button type="button" class="mol-year${yearOpen===i?' on':''}" data-year="${i}">
              <span class="mol-year-bars">
                <i class="teal" style="height:${Math.round(CV[i]/maxC*165)}px" title="${fmtN(CV[i])}"></i>
                <i class="red" style="height:${Math.max(Math.round(BV[i]/maxB*110),6)}px" title="${fmtN(BV[i])}"></i>
              </span>
              <span class="mol-year-lbl">${y}</span>
              <span class="mol-year-pills"><em class="teal">${growth(CV,i)}</em><em class="red">${growth(BV,i)}</em></span>
            </button>`).join('')}
        </div>
        ${panel}
        <div class="mol-strip"><span>Shartnomalar · 5 yilda</span>1 240 → 10 533<b>×8.5</b></div>
        <div class="mol-strip"><span>Qora ro'yxat · 5 yilda</span>95 → 3 581<b>×37.7</b></div>
      </div>
    `
  }

  function barListCard(title, sub, list, foot, fill){
    return `
      <div class="mol-card" style="margin-bottom:0;display:flex;flex-direction:column">
        <div class="mol-card-head">
          <div><div class="mol-card-t">${escapeHtml(title)}</div><div class="mol-card-s">${escapeHtml(sub)}</div></div>
        </div>
        <div style="flex:1">
          ${list.map(([n,v,p])=>`
            <div style="padding:7px 0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <span style="font:700 12px system-ui,sans-serif;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(n)}</span>
                <b style="margin-left:auto;font:800 12.5px system-ui,sans-serif;color:var(--ink);white-space:nowrap">${escapeHtml(v)}</b>
              </div>
              <span class="mol-bar-track"><i class="mol-f-${fill}" style="width:${escapeHtml(p)}"></i></span>
            </div>`).join('')}
        </div>
        <div class="mol-card-foot">${escapeHtml(foot)}</div>
      </div>
    `
  }

  function agesHtml(){
    return `
      <div class="mol-card" style="margin-bottom:0;display:flex;flex-direction:column">
        <div class="mol-card-head">
          <div><div class="mol-card-t">Yosh va jins bo'yicha</div><div class="mol-card-s">shartnoma egalari taqsimoti</div></div>
        </div>
        <div style="flex:1">
          ${AGES.map(([a,m,f])=>`
            <div style="padding:8px 0">
              <div style="font:800 12px system-ui,sans-serif;color:var(--ink-2);margin-bottom:7px">${escapeHtml(a)}</div>
              <span class="mol-bar-track" style="margin-bottom:5px"><i class="mol-f-blue" style="width:${escapeHtml(m)}"></i></span>
              <span class="mol-bar-track"><i class="mol-f-pink" style="width:${escapeHtml(f)}"></i></span>
            </div>`).join('')}
        </div>
        <div class="mol-card-foot" style="display:flex;gap:16px;align-items:center">
          <span style="display:inline-flex;align-items:center;gap:7px"><span class="mol-dot mol-f-blue"></span>Erkak</span>
          <span style="display:inline-flex;align-items:center;gap:7px"><span class="mol-dot mol-f-pink"></span>Ayol</span>
        </div>
      </div>
    `
  }

  function heatHtml(){
    return `
      <div class="mol-card">
        <div class="mol-card-head">
          <div><div class="mol-card-t">To'lov faolligi · hafta × soat</div><div class="mol-card-s">to'lovlar zichligi (issiqlik xaritasi)</div></div>
          <span class="mol-badge">Eng faol: Payshanba 12:00–16:00</span>
        </div>
        <div class="mol-heat">
          <div class="mol-heat-grid">
            <div class="mol-heat-row">
              <span></span>${WEEK.map(w=>`<span class="mol-heat-head">${w}</span>`).join('')}
            </div>
            ${HEAT.map((row,ri)=>`
              <div class="mol-heat-row">
                <span class="mol-heat-lbl">${HEAT_ROWS[ri]}</span>
                ${row.map(v=>`<span class="mol-heat-cell" style="background:rgba(47,169,191,${v})"></span>`).join('')}
              </div>`).join('')}
          </div>
          <div class="mol-heat-side">
            <div class="mol-mini"><span>Atmos avtoto'lov (UzCard+Humo)</span><b>1.09 mlrd</b></div>
            <div class="mol-mini"><span>MyUzcard avtoto'lov</span><b>14.78 mlrd</b></div>
            <div class="mol-mini red"><span>Qaytarishlar jami</span><b>55.13 mln</b></div>
          </div>
        </div>
      </div>
    `
  }

  function modalHtml(){
    if(regionSel == null) return ''
    const r = REGIONS[regionSel]
    if(!r) return ''
    const cells = [
      ['Kompaniyalar', r[1]], ['Faol shartn.', r[2]], ['Summa', r[3]],
      ['Qarzdorlik', r[4]], ['Kechikish', r[5]], ["Qora ro'yxat", r[7]],
    ]
    return `
      <div class="mol-modal-bg" id="mol-region-bg">
        <div class="mol-modal" id="mol-region-modal">
          <div class="mol-modal-head">
            <div>
              <div class="mol-card-t" style="font-size:19px">${escapeHtml(r[0])}</div>
              <div class="mol-card-s">hudud kesimidagi ko'rsatkichlar</div>
            </div>
            <button type="button" class="mol-x" id="mol-region-close" title="Yopish">✕</button>
          </div>
          <div class="mol-mini-grid">
            ${cells.map(([l,v],i)=>`<div class="mol-mini${i>=4?' red':''}"><span>${escapeHtml(l)}</span><b>${escapeHtml(v)}</b></div>`).join('')}
          </div>
          <div class="mol-card-t" style="margin-bottom:10px">Namunaviy kompaniyalar</div>
          <div style="overflow-x:auto">
            <table class="mol-table">
              <thead><tr>
                <th>Shartnoma №</th><th>Kompaniya</th><th>Tarif</th><th class="num">Summa</th><th class="num">Qarz</th><th class="num">Status</th>
              </tr></thead>
              <tbody>
                ${MODAL_COMPANIES.map((c,i)=>`
                  <tr>
                    <td><span class="mol-idbadge">${escapeHtml(MODAL_NUMS[i])}</span></td>
                    <td class="name">${escapeHtml(c.name)}</td>
                    <td>${escapeHtml(c.tariff)}</td>
                    <td class="num">${escapeHtml(c.summa)}</td>
                    <td class="num">${escapeHtml(c.debt)}</td>
                    <td class="num"><span class="mol-st ${STATUS_CLS[c.status]||'mut'}">${escapeHtml(c.status)}</span></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
  }

  // ---- asosiy chizish ----
  function render(){
    root.innerHTML = `
      <div class="mol-page" id="mol-stats">
        ${headHtml()}
        ${demoNote("Namuna (demo) ma'lumot — moliyaviy backend hali ulanmagan. Raqamlar, diagrammalar va hudud kesimi o'ylab topilgan; filtr va davr almashtirish ishlaydi.")}
        ${kpiHtml()}
        ${detailHtml()}
        <div class="mol-row-2">
          ${regionsHtml()}
          ${sideCardsHtml()}
        </div>
        <div class="mol-row-11">
          ${tariffsHtml()}
          ${txHtml()}
        </div>
        ${yearsHtml()}
        <div class="mol-row-3">
          ${barListCard('SMS yuborilgan', 'xabar turlari kesimida', SMS, 'Jami 238 786', 'teal')}
          ${barListCard('Pochta orqali yuborish', 'xatlar holati', POCHTA, "17 ta yuborilmadi (manzil xato / rad etildi)", 'amber')}
          ${agesHtml()}
        </div>
        ${heatHtml()}
        ${modalHtml()}
      </div>
    `
    wire()
  }

  function wire(){
    const page = qs('#mol-stats', root)
    if(!page) return

    on(page, 'click', '[data-kpi]', (e, el)=>{
      kpiSel = Number(el.dataset.kpi)
      render()
    })
    on(page, 'click', '[data-period]', ()=> toast("Davr filtri tez orada qo'shiladi"))
    on(page, 'click', '[data-regview]', (e, el)=>{
      if(el.dataset.regview === 'map') toast("Xarita ko'rinishi tez orada qo'shiladi")
    })
    on(page, 'click', '[data-toast]', (e, el)=> toast(el.dataset.toast))
    on(page, 'click', 'tr[data-region]', (e, el)=>{
      regionSel = Number(el.dataset.region)
      render()
    })
    on(page, 'click', '[data-year]', (e, el)=>{
      const i = Number(el.dataset.year)
      yearOpen = (yearOpen === i) ? null : i
      render()
    })

    const closeModal = ()=>{ regionSel = null; render() }
    const bg = qs('#mol-region-bg', page)
    if(bg){
      bg.addEventListener('click', ev=>{ if(ev.target === bg) closeModal() })
      const x = qs('#mol-region-close', page)
      if(x) x.addEventListener('click', closeModal)
    }
  }

  function onKey(ev){
    if(ev.key === 'Escape' && regionSel != null){ regionSel = null; render() }
  }
  document.addEventListener('keydown', onKey)

  render()

  return function cleanup(){
    document.removeEventListener('keydown', onKey)
  }
}
