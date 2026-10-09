// Boshqaruv → Filiallar → "Tashkilot kartasi".
//
// Asl super admin (dev-admin.icanbusiness.uz) dagi filial oynasining
// ko'chirmasi. U yerda filial ma'lumoti ikki joyga bo'lingan:
//   /control/company/{id}        — profil + tranzaksiyalar
//   /control/company/update/{id} — 5 bosqichli usta:
//        1 Filial · 2 Direktor · 3 Imkoniyatlar · 4 Narxlar · 5 Xizmatlar
// Shu ikkalasi bu yerda bitta kartada, yorliqlar (tab) ko'rinishida
// birlashtirilgan — "qaysi xizmat ulangan, qaysiga dostup bor" degan
// savolga bitta oynadan javob berish uchun.
//
// Imkoniyatlar daraxti va narxlar ro'yxati asl tizimdan aynan ko'chirildi
// (nomlari o'zgartirilmagan). Holatlar (yoqilgan/o'chirilgan) esa NAMUNA
// (demo) — backend ulangach shu joyga haqiqiy qiymat qo'yiladi.
import { qs, on, escapeHtml } from '../core.js'
import { api, getRole } from '../api.js'
import { st, money, rint, pick, chance, dateAgo, IC_DL } from './demo-kit.js'
import { takeCompanyCardTarget, takeCompanyCardTab, setClientEditTarget, goto } from './nav-intent.js'

const ic = d => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"></path></svg>`
const IC_SYNC = ic('M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15')
const IC_CHEV = `<svg class="ic-perm-chev" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`

// ---------------------------------------------------------------------------
// IMKONIYATLAR (dostup) — asl tizimdagi guruhlar va ularning ichki huquqlari
// ---------------------------------------------------------------------------
export const CAPABILITIES = [
  { key: 'EGOV', items: [
    'Qarzdorlik', 'Jismoniy shaxs haqida ma\'lumot', 'Mulk', 'Ijaraga berilgan mol-mulk', 'Daromadlar',
  ]},
  { key: 'KATM', items: [
    'КИАЦ', 'Sudlanganlik to\'g\'risidagi ma\'lumotlar', 'Elektr ta\'minoti bo\'yicha qarz',
    'Gaz ta\'minoti bo\'yicha qarz', 'Humo bo\'yicha tranzaksiyalar', 'Shartnomalar haqida ma\'lumot (start)',
    'Shartnomalar haqida ma\'lumot', 'Skoring bali', 'Pasport ma\'lumotlari', 'Pensiya va nafaqa',
    'Jismoniy shaxsning BPI bo\'yicha qarzi', 'Jismoniy shaxsning ko\'chmas mulki', 'INPS bo\'yicha ish haqi',
    'Identifikatsiya', 'Universal', 'UzCard bo\'yicha tranzaksiyalar', 'KATMda shartnomani ro\'yxatdan o\'tkazish',
  ]},
  { key: 'ANIQ', items: [] },
  { key: 'ASAXIY', items: [] },
  { key: 'APPLE', items: [] },
  { key: 'GET', items: [] },
  { key: 'SCORING', items: [
    'Скоринг (Akslab - KATM 023) (свой аккаунт)', 'Скоринг (Akslab - KATM 077) (свой аккаунт)',
    'Скоринг (Akslab - KATM 023) (I can аккаунт)', 'Скоринг (Akslab - KATM 077) (I can аккаунт)',
    'Baholash (Atmos)', 'Baholash (MyUzcard)', 'Baholash (Uniaccess - Humo)', 'Baholash (Uniaccess - Uzcard)',
    'Baholash (I can | без подтверждения)',
  ]},
  { key: 'ONLINE', items: ['Онлайн контракт'] },
  { key: 'MY', items: ['MY ID идентификация клиента'] },
  { key: 'AUTO', items: ['Avtoto\'lov'] },
  { key: 'MY UZCARD', items: [] },
  { key: 'PRIZMA', items: ['Avtoto\'lov Prizma PINFL'] },
  { key: 'UNIACCESS', items: ['Avtoto\'lov Uniaccess PINFL'] },
]

// NARXLAR — schyot-fakturadagi jadval bilan AYNAN bir xil ro'yxat va tartib
// (reportFact.docx). Hisobot ham, narx maydonlari ham shu ro'yxatga tayanadi,
// shuning uchun ikkalasi doim mos tushadi.
const PRICES = [
  "Shartnomani karta bilan rasmiylashtirish",
  "Shartnomani kartasiz rasmiylashtirish",
  "Asaxiy MDM (ro'yxatdan o'tkazish)",
  "Apple MDM (регистрация)",
  "Обновление карт Prizma в контракте (Humo)",
  "Обновление карт Prizma в контракте (Uzcard)",
  "Shartnomada Uniaccess kartalarini yangilash",
  "Egov (soliq)",
  "GetMobi (ro'yxatdan o'tkazish)",
  "Ican (mijoz haqida ma'lumot)",
  "Ican (IMEI haqida ma'lumot)",
  "IMEI (ro'yxatdan o'tkazish)",
  "IMEI (qulflash)",
  "Oylik to'lov",
  "Pochta",
  "Добавление контракта в Prizma",
  "Скоринг (Akslab - KATM 023) (свой аккаунт)",
  "Скоринг (Akslab - KATM 077) (свой аккаунт)",
  "Скоринг (Akslab - KATM 023) (I can аккаунт)",
  "Скоринг (Akslab - KATM 077) (I can аккаунт)",
  "Baholash (Atmos)",
  "Baholash (MyUzcard)",
  "Baholash (Uniaccess - Humo)",
  "Baholash (Uniaccess - Uzcard)",
  "Uniaccess-ga qora ro'yxat qo'shish",
  "Uniaccess-ga shartnoma qo'shish",
]

// XIZMATLAR — bloklash moslamalari va to'lov tashkilotlari (asl tizimdagi ro'yxat)
// Kartaning "Xizmatlar" yorlig'idagi qo'shimcha moslamalar uchun tanlov
// ro'yxatlari (asl tizimdagi variantlar). Tanlangan qiymat sozlamalar
// faylida extras ichida saqlanadi.
export const EXTRAS = [
  { key:'katmAccess', label:'KATM ga kirish',    opts:["O'z akkaunti", 'ICAN akkaunti'] },
  { key:'salesDir',   label:"Sotuv yo'nalishi",  opts:['Telefon va texnika', 'Maishiy texnika', 'Mebel', 'Aralash'] },
  { key:'smsTpl',     label:'SMS uchun shablon', opts:['Shablon 1', 'Shablon 2', 'Shablon 3', 'Shablon 4'] },
  { key:'activity',   label:'Faoliyat turlari',  opts:['Chakana savdo', 'Ulgurji savdo', "Xizmat ko'rsatish"] },
]

export const BLOCKERS = ['ICAN IMEI', 'Idendity IMEI', 'SAMSUNG / ANDROID', 'Mobilock', 'Apple MDM']
export const PAY_ORGS = ['Payme', 'Click', 'Atmos', 'MyUzcard', 'Uniaccess', 'Prizma']

// ---------------------------------------------------------------------------
// Tashkilotlar — HAQIQIY ro'yxat (api.clientsList(), Filiallar sahifasi bilan
// bir xil manba). Yozuvda bo'lmagan maydonlar (balans, Atmos ID, MyUzcard,
// qora ro'yxat) "—" bo'lib qoladi; imkoniyat/narx/xizmat holatlari esa hali
// backendda kuzatilmagani uchun namuna (demo) — kartada shunday belgilangan.
// ---------------------------------------------------------------------------
function shortId(c){ return String(c.id || '').replace(/\D/g, '').slice(-4) || String(c.id || '').slice(0, 4) }

function adapt(c, i){
  return {
    id: c.id,
    num: shortId(c) || String(i + 1),
    name: c.name || c.company || 'Tashkilot',
    company: c.company || c.name || '',
    login: c.dirLogin || '',
    inn: c.inn || '',
    balance: null,          // backendda yo'q
    blacklist: c.blacklist,
    atmos: c.atmosId,
    myuzcard: c.myuzcard,
    phone: c.phone || '',
    tariff: c.tariff || '',
    created: c.createdAt ? new Date(c.createdAt).toLocaleDateString('uz-UZ') : '',
    enabled: c.status !== 'yopilgan' && c.status !== 'bloklangan',
    region: [c.region, c.district].filter(Boolean).join(' · '),
    director: c.director || '',
    address: c.address || '',
    bank: c.bank || '',
    mfo: c.mfo || '',
    account: c.account || '',
    vat: c.vat || '',
  }
}

// Imkoniyat/xizmat holatlari endi SAQLANADI (backend: client-settings.json).
// Belgilanmagan kalit — o'chirilgan deb hisoblanadi; ya'ni yangi tashkilotda
// hammasi yopiq bo'ladi va administrator kerakligini o'zi yoqadi.
function capKey(g, item){ return item ? g + '|' + item : g }

function fld(label, value){
  return `<div class="ic-fld"><span>${escapeHtml(label)}</span><b>${escapeHtml(String(value == null || value === '' ? '—' : value))}</b></div>`
}

// Faqat TO'LDIRILGAN maydonlar ko'rsatiladi. Bo'shlari (ular ko'pincha
// ko'pchilikni tashkil qiladi) pastda bitta kulrang qatorda sanaladi —
// aks holda karta bir varaq "—" belgisiga aylanib qolardi.
function fields(list){
  const bor = list.filter(([, v]) => v != null && String(v).trim() !== '')
  const yoq = list.filter(([, v]) => v == null || String(v).trim() === '').map(([k]) => k)
  return (bor.length ? '<div class="ic-fields">' + bor.map(([k, v]) => fld(k, v)).join('') + '</div>' : '')
    + (yoq.length ? '<div class="ic-fields-empty">To' + "'" + 'ldirilmagan: ' + escapeHtml(yoq.join(', ')) + '</div>' : '')
}

export function mountCompanyCard(root, { toast }){
  let list = []
  let co = null
  let tab = 'umumiy'
  let open = {}          // ochilgan imkoniyat guruhlari
  let err = ''
  const emptyCfg = () => ({ capabilities:{}, prices:{}, blockers:{}, payOrgs:{}, blacklist:false, myuzcard:false, myuzcardAuto:false, atmosId:'', extras:{} })
  let cfg = emptyCfg()
  let saving = false
  let use = null          // sarflash hisoboti (oylar kesimida)
  let useTab = 'oy'       // 'oy' | 'yil'
  let tx = null          // null — hali so'ralmadi
  let txBusy = false
  let atmosOpen = false   // kalit yoqilgan, lekin raqam hali kiritilmagan holat
  let txPage = 1
  const TX_PER = 20
  const isAdmin = getRole() === 'admin'

  const capOn = k => !!cfg.capabilities[k]

  // Har o'zgarishda darhol saqlanadi (optimistik: avval ekranda, keyin serverga)
  async function save(){
    if(!co) return
    saving = true; render()
    try{ await api.clientSettingsSave(co.id, cfg); toast('Saqlandi') }
    catch(ex){ toast(ex.error || 'Saqlashda xatolik') }
    saving = false
    // Saqlangandan keyin tarix eskirdi
    render()
  }

  function umumiyHtml(){
    // Atmos qatori ham boshqalar kabi kalit bilan boshqariladi: kalit
    // yoqilsa raqam maydoni ochiladi, o'chirilsa raqam tozalanadi.
    const atmosOn = atmosOpen || !!String(cfg.atmosId || "").trim()
    return `
      <div class="ic-card">
        <div class="ic-card-head">
          <div><div class="ic-card-t">Filial ma'lumotlari</div><div class="ic-card-s">Asl tizimdagi "1-bosqich · Filial" va "2-bosqich · Direktor"</div></div>
          <button type="button" class="ic-btn" data-toast="Ombor bilan sinxronlash — demo rejimida ishlamaydi">${IC_SYNC} Ombor bilan sinxronlash</button>
        </div>
        ${fields([
          ['Nomlanishi', co.name], ['Kompaniya', co.company], ['Telefon', co.phone],
          ['Manzil', co.address], ['Direktorning FISH', co.director], ['Login', co.login],
          ['Bank', co.bank], ['INN', co.inn], ['MFO', co.mfo], ["To'lov hisob raqami", co.account],
          ['ICAN tarif', co.tariff], ['Hudud', co.region], ['QQS (%)', co.vat],
          ['Ota-ona', ''], ['Yaratilgan', co.created],
        ])}
      </div>
      <div class="ic-row-2">
        <div>
          <div class="ic-card">
            <div class="ic-card-t" style="margin-bottom:10px">Balanslar</div>
            <div class="ic-strip"><span>Asosiy balans</span><b>${balLbl(tx && tx.asosiy)}</b></div>
            <div class="ic-strip"><span>Xizmatlar balansi</span><b>${balLbl(tx && tx.xizmatlar)}</b></div>
            <div class="ic-strip"><span>Balans limiti</span><b>—</b></div>
          </div>
        </div>
        <div>
          <div class="ic-card">
            <div class="ic-card-t" style="margin-bottom:10px">Terminal</div>
            <div class="ic-setrow" style="padding:8px 0">
              <span><b>Atmos terminal ID</b><small>Atmos protsessingidagi terminal raqami</small></span>
              <span class="ic-sw${atmosOn ? ' on' : ''}" data-atmos-toggle title="Yoqish/o'chirish"></span>
            </div>
            ${atmosOn ? `<div class="ic-setrow ic-setrow-sub" style="padding:8px 0">
              <span><small>Terminal raqami</small></span>
              <span><input class="ic-price" style="width:150px;text-align:left" data-fld-text="atmosId"
                value="${escapeHtml(cfg.atmosId || '')}" placeholder="Raqamni kiriting" /></span>
            </div>` : ''}
            <div class="ic-setrow" style="padding:8px 0">
              <span><b>MyUzcard ga kirish</b><small>PINFL bo'yicha avtomatik yechish</small></span>
              <span class="ic-sw${cfg.myuzcard ? ' on' : ''}" data-fld-toggle="myuzcard" title="Yoqish/o'chirish"></span>
            </div>
            <div class="ic-setrow" style="padding:8px 0">
              <span><b>Qora ro'yxat</b><small>Tashkilot bilan ishlash to'xtatiladi</small></span>
              <span class="ic-sw${cfg.blacklist ? ' on' : ''}" data-fld-toggle="blacklist" title="Yoqish/o'chirish"></span>
            </div>
          </div>
        </div>
      </div>
      ${xizmatHtml()}
    `
  }

  // -------------------------------------------------------------------------
  // XIZMATLAR — ilgari uchta alohida yorliq edi (Imkoniyatlar, Narxlar,
  // Xizmatlar). Aslida uchalasi ham bitta savolga javob beradi: bu filialga
  // NIMA ULANGAN va NIMA ULANMAGAN. Shuning uchun bitta ko'rinishga
  // birlashtirildi: chapda ulangan xizmatlar, o'ngda ulanmaganlari.
  // -------------------------------------------------------------------------

  // Uch xil manbani (imkoniyat guruhlari, bloklash moslamalari, to'lov
  // tashkilotlari) bitta umumiy ro'yxatga keltiradi — shunda ikkala ustun
  // ham bir xil kartalar bilan chiziladi.
  function allServices(){
    const out = []
    for(const g of CAPABILITIES){
      out.push({
        key: g.key, label: g.key, kind: 'Imkoniyat', tone: 'teal',
        on: capOn(g.key), attr: 'data-cap-toggle', val: g.key,
        items: g.items, subOn: g.items.filter(it => capOn(capKey(g.key, it))).length,
      })
    }
    for(const b of BLOCKERS){
      out.push({ key: 'blk:' + b, label: b, kind: 'Bloklash', tone: 'amber',
        on: !!cfg.blockers[b], attr: 'data-blk-toggle', val: b, items: [] })
    }
    for(const p of PAY_ORGS){
      out.push({ key: 'pay:' + p, label: p, kind: "To'lov", tone: 'green',
        on: !!cfg.payOrgs[p], attr: 'data-pay-toggle', val: p, items: [] })
    }
    // Alohida moslamalar — ular ham "ulangan / ulanmagan" mantiqiga tushadi,
    // shuning uchun pastda yolg'iz qator bo'lib turmasdan shu yerga qo'shildi.
    out.push({ key: 'myuzcardAuto', label: 'MyUzcard PINFL avtoyechish', kind: 'Moslama', tone: '',
      on: !!cfg.myuzcardAuto, attr: 'data-fld-toggle', val: 'myuzcardAuto', items: [],
      note: "Avtomatik to'lovni PINFL orqali amalga oshirish" })
    return out
  }

  function svcCard(s){
    const subInfo = s.items.length
      ? '<div class="ic-svc-sub">' + s.subOn + ' / ' + s.items.length + ' huquq</div>'
      : (s.note ? '<div class="ic-svc-sub">' + escapeHtml(s.note) + '</div>' : '')
    const ochiq = !!open[s.val]
    const body = (s.items.length && ochiq)
      ? '<div class="ic-svc-perms">' + s.items.map(it =>
          '<div class="ic-perm-row"><span>' + escapeHtml(it) + '</span>' +
          '<span class="ic-chk' + (capOn(capKey(s.val, it)) ? ' on' : '') +
          '" data-cap-toggle="' + escapeHtml(capKey(s.val, it)) + '" title="Yoqish/o‘chirish"></span></div>'
        ).join('') + '</div>'
      : ''
    const more = s.items.length
      ? '<button type="button" class="ic-svc-more' + (ochiq ? ' on' : '') + '" data-cap="' +
        escapeHtml(s.val) + '">' + (ochiq ? 'Yopish' : 'Huquqlar') + '</button>'
      : ''
    return '<div class="ic-svc' + (s.on ? ' on' : '') + '">' +
      '<div class="ic-svc-top">' +
        '<span class="ic-svc-badge ' + s.tone + '">' + escapeHtml(s.kind) + '</span>' +
        '<span class="ic-sw' + (s.on ? ' on' : '') + '" ' + s.attr + '="' + escapeHtml(s.val) +
        '" title="Yoqish/o‘chirish"></span>' +
      '</div>' +
      '<div class="ic-svc-name">' + escapeHtml(s.label) + '</div>' +
      subInfo + more + body +
    '</div>'
  }

  function xizmatHtml(){
    const hammasi = allServices()
    const ulangan = hammasi.filter(s => s.on)
    const ulanmagan = hammasi.filter(s => !s.on)
    const ustun = (nom, izoh, ro, tone) =>
      '<div class="ic-card">' +
        '<div class="ic-card-head"><div>' +
          '<div class="ic-card-t">' + nom + '</div>' +
          '<div class="ic-card-s">' + izoh + '</div></div>' +
          st(ro.length + ' ta', tone) +
        '</div>' +
        (ro.length
          ? '<div class="ic-svc-grid">' + ro.map(svcCard).join('') + '</div>'
          : '<div class="ic-hist-empty">Ro‘yxat bo‘sh.</div>') +
      '</div>'
    const belgilangan = PRICES.filter(x => Number(cfg.prices[x] || 0) > 0).length
    return `
      <div class="ic-row-2">
        ${ustun('Ulangan xizmatlar', 'Shu filialga ochilgan imkoniyat va xizmatlar', ulangan, 'green')}
        ${ustun('Ulanmagan xizmatlar', 'Ochilmagan — yoqish uchun kalitni bosing', ulanmagan, 'mut')}
      </div>
      <div class="ic-card">
        <div class="ic-card-head">
          <div><div class="ic-card-t">Narxlar</div>
          <div class="ic-card-s">Har bir pullik amal uchun tarif · fokusdan chiqqach saqlanadi</div></div>
          <div class="ic-head-act">
            ${st(belgilangan + ' / ' + PRICES.length + ' belgilangan', belgilangan ? 'teal' : 'mut')}
            <button type="button" class="ic-btn ghost" id="px-clear">Barchasini tozalash</button>
          </div>
        </div>
        <div class="ic-price-grid">
          ${PRICES.map(p => {
            const narx = Number(cfg.prices[p] || 0)
            return `<label class="ic-price-cell${narx ? ' on' : ''}">
              <span>${escapeHtml(p)}</span>
              <input class="ic-price" type="number" min="0" step="100"
                data-price="${escapeHtml(p)}" value="${narx || ''}" placeholder="—" />
            </label>`
          }).join('')}
        </div>
      </div>
      <div class="ic-card">
        <div class="ic-card-t" style="margin-bottom:10px">Qo'shimcha sozlamalar</div>
        <div class="ic-fields">
          ${EXTRAS.map(e => `
            <div class="ic-fld">
              <span>${escapeHtml(e.label)}</span>
              <select class="ic-select" data-extra="${e.key}">
                <option value=""${cfg.extras[e.key] ? "" : " selected"}>—</option>
                ${e.opts.map(o => `<option value="${escapeHtml(o)}"${cfg.extras[e.key] === o ? " selected" : ""}>${escapeHtml(o)}</option>`).join("")}
              </select>
            </div>`).join("")}
        </div>
      </div>
    `
  }

  // -------------------------------------------------------------------------
  // TRANZAKSIYALAR — HAQIQIY: serverda saqlanadi (transactions.json)
  // -------------------------------------------------------------------------

  // Balans tranzaksiyalardan hisoblanadi. tx hali yuklanmagan bo'lsa
  // son o'ylab topilmaydi — "—" turadi.
  function balLbl(v){ return v == null ? '—' : money(v) + " so'm" }

  function txWhen(ms){
    const d = new Date(ms)
    if(isNaN(d)) return '—'
    const p = n => String(n).padStart(2, '0')
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + ' · ' + p(d.getHours()) + ':' + p(d.getMinutes())
  }

  function transHtml(){
    const rows = tx ? tx.rows : []
    return `
      <div class="ic-card">
        <div class="ic-card-head">
          <div><div class="ic-card-t">Tranzaksiyalar</div>
          <div class="ic-card-s">Filial hisobvarag'i bo'yicha kirim va chiqim — serverda saqlanadi</div></div>
          <div class="ic-head-act">
            <span class="ic-card-s">${tx ? tx.total + ' ta yozuv' : ''}</span>
          </div>
        </div>
        ${tx ? `<div class="ic-kpis" style="margin-bottom:10px">
          <div class="ic-kpi"><div class="ic-kpi-lbl">Kirim</div><div class="ic-kpi-val">${money(tx.daromad)}</div><div class="ic-kpi-sub">so'm</div></div>
          <div class="ic-kpi"><div class="ic-kpi-lbl">Chiqim</div><div class="ic-kpi-val">${money(tx.chiqim)}</div><div class="ic-kpi-sub">so'm</div></div>
          <div class="ic-kpi"><div class="ic-kpi-lbl">Qoldiq</div><div class="ic-kpi-val">${money(tx.balans)}</div><div class="ic-kpi-sub">kirim − chiqim</div></div>
        </div>` : ''}
        ${txBusy && !tx ? '<div class="ic-hist-empty">Yuklanmoqda…</div>'
          : !rows.length ? '<div class="ic-hist-empty">Bu filial bo\'yicha hali tranzaksiya yo\'q.</div>'
          : `<div class="ic-tblscroll">
          <table class="ic-tbl">
            <thead><tr><th class="ic-idx"></th><th>Turi</th><th class="num">Summa</th><th>To'lov turi</th><th>Balans turi</th><th>Sabab</th><th>Status</th><th>Kim</th><th>Yaratilgan</th><th></th></tr></thead>
            <tbody>
              ${rows.map((r, i) => `<tr>
                <td class="ic-idx">${i + 1}</td>
                <td>${st(r.type, r.type === 'CHIQIM' ? 'red' : 'green')}</td>
                <td class="num"><b class="ic-money">${money(r.sum)}</b></td>
                <td>${escapeHtml(r.pay)}</td>
                <td>${st(r.bal, r.bal === 'XIZMATLAR' ? 'teal' : 'mut')}</td>
                <td>${escapeHtml(r.reason || '—')}</td>
                <td>${st(r.status, r.status === 'Bekor qilingan' ? 'red' : r.status === 'Kutilmoqda' ? 'amber' : 'green')}</td>
                <td>${escapeHtml(r.createdBy || '—')}</td>
                <td>${txWhen(r.createdAt)}</td>
                <td>${isAdmin ? `<button type="button" class="ic-x" data-tx-del="${r.id}" title="O'chirish">×</button>` : ''}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`}
        ${txPagerHtml()}
      </div>`
  }

  // Sahifalagich: serverdan sahifa-sahifa olinadi (hammasi birdan emas).
  // Bitta sahifa bo'lsa umuman ko'rsatilmaydi.
  function txPagerHtml(){
    if(!tx || tx.total <= TX_PER) return ''
    const oxirgi = Math.ceil(tx.total / TX_PER)
    const dan = (txPage - 1) * TX_PER + 1
    const gacha = Math.min(txPage * TX_PER, tx.total)
    return `
      <div class="ic-txpager">
        <span>${dan}–${gacha} / ${tx.total} ta</span>
        <button type="button" class="ic-btn" data-txpage="${txPage - 1}"${txPage <= 1 ? ' disabled' : ''}>‹</button>
        <span class="ic-txpager-cur">${txPage} / ${oxirgi}</span>
        <button type="button" class="ic-btn" data-txpage="${txPage + 1}"${txPage >= oxirgi ? ' disabled' : ''}>›</button>
      </div>`
  }

  async function loadTx(){
    if(!co) return
    txBusy = true; render()
    try{ tx = await api.txList(co.id, '?limit=' + TX_PER + '&offset=' + ((txPage - 1) * TX_PER)) }
    catch(ex){ tx = { rows:[], total:0, daromad:0, chiqim:0, balans:0 }; toast(ex.error || 'Tranzaksiyalarni olishda xatolik') }
    // Oxirgi sahifadagi yagona yozuv o'chirilsa, bo'sh sahifada qolib
    // ketmaslik uchun bir sahifa orqaga qaytamiz.
    if(tx && !tx.rows.length && tx.total > 0 && txPage > 1){
      txPage = Math.min(txPage - 1, Math.ceil(tx.total / TX_PER))
      return loadTx()
    }
    txBusy = false; render()
  }


  // -------------------------------------------------------------------------
  // TARIX — kim, qachon, nimani o'zgartirdi (server audit jurnalidan)
  // -------------------------------------------------------------------------

  // Kalitni odam o'qiydigan ko'rinishga keltiradi: "KATM|Skoring bali"
  // -> "KATM · Skoring bali", "blacklist" -> "Qora ro'yxat".
  // Qiymatni ko'rsatish: mantiqiy — yoqildi/o'chirildi, son — narx.
  // -------------------------------------------------------------------------
  // TARIX — sarflash hisoboti. Savol oddiy: shu filial qaysi pullik amaldan
  // necha marta foydalangan va qancha to'lagan. Hisob-fakturadagi kabi
  // amallar kesimida, ustiga o'tgan oy bilan solishtirib ko'rsatiladi.
  // Ostida esa sozlama o'zgarishlari jurnali (kim, qachon, nimani).
  // -------------------------------------------------------------------------
  const OY_NOM = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']
  function ymLabel(ym){
    const [y, m] = String(ym || '').split('-')
    const i = Number(m) - 1
    return (OY_NOM[i] || ym) + ' ' + y
  }

  // Ikki son farqi: matn va yo'nalish (o'sish / kamayish / o'zgarishsiz)
  function farq(hozir, oldin){
    const d = hozir - oldin
    if(!oldin && !hozir) return { tone: 'mut', text: '—' }
    if(!oldin) return { tone: 'green', text: 'yangi' }
    if(d === 0) return { tone: 'mut', text: "o'zgarmadi" }
    const foiz = Math.round(Math.abs(d) / oldin * 100)
    return { tone: d > 0 ? 'red' : 'green', text: (d > 0 ? '+' : '−') + foiz + '%' }
  }

  // Bitta amal — bitta chiziqli qator (CRM "Bosqichlar bo'yicha taqsimot"
  // ko'rinishi). Ilgari 26 ta karta panjarasi edi: joyni ko'p egallardi va
  // qaysi amal ko'proq ishlatilgani darrov ko'zga tashlanmasdi. Chiziqda esa
  // uzunliklar bir xil o'lchovda — solishtirish bir qarashda ko'rinadi.
  // Yuqoridagi to'q chiziq — bu oy, pastdagi och chiziq — o'tgan oy.
  function usageBar(nom, hozir, oldin, eng){
    const f = farq(hozir.summa, oldin.summa)
    const w = s => Math.max(s > 0 ? 2 : 0, Math.round(s / eng * 100))
    const bosh = !hozir.soni && !oldin.soni
    return `
      <div class="ic-ubar${bosh ? ' bosh' : ''}" title="${escapeHtml(nom)} — bu oy: ${hozir.soni} ta / ${money(hozir.summa)} so'm; o'tgan oy: ${oldin.soni} ta / ${money(oldin.summa)} so'm">
        <span class="ic-ubar-n">${escapeHtml(nom)}</span>
        <div class="ic-ubar-tr">
          <div class="ic-ubar-t"><i style="width:${w(hozir.summa)}%"></i></div>
          <div class="ic-ubar-t old"><i style="width:${w(oldin.summa)}%"></i></div>
        </div>
        <b class="ic-ubar-c">${hozir.soni} ta</b>
        <b class="ic-ubar-s">${money(hozir.summa)}</b>
        <span class="ic-ubar-f">${st(f.text, f.tone)}</span>
      </div>`
  }

  function tarixHtml(){
    if(!use) return '<div class="ic-card"><div class="ic-hist-empty">Yuklanmoqda…</div></div>'
    const oylar = use.oylar || []
    const hozir = oylar[oylar.length - 1] || { ym: '', soni: 0, summa: 0, amallar: {} }
    const oldin = oylar[oylar.length - 2] || { ym: '', soni: 0, summa: 0, amallar: {} }
    // Ikki oyda uchragan barcha amallar — summasi bo'yicha saralanadi
    // Fakturadagi BARCHA amal ko'rsatiladi (ishlatilmagani ham) — hujjatning
    // o'zi ham shunday: 26 qator, ishlatilmaganida 0 turadi. Ro'yxatdan
    // tashqari sabab uchrasa (masalan 'Boshqa'), u ham qo'shiladi.
    const qoshimcha = [...new Set([...Object.keys(hozir.amallar), ...Object.keys(oldin.amallar)])]
      .filter(n => !PRICES.includes(n))
    const nomlar = [...PRICES, ...qoshimcha]
      .sort((x, y) => {
        const sx = (hozir.amallar[x] || {}).summa || 0, sy = (hozir.amallar[y] || {}).summa || 0
        if(sx !== sy) return sy - sx
        const ox = (oldin.amallar[x] || {}).summa || 0, oy = (oldin.amallar[y] || {}).summa || 0
        return oy - ox
      })
    const bosh = { soni: 0, summa: 0 }
    const fJami = farq(hozir.summa, oldin.summa)
    // Chiziq uzunligi shu ikki oydagi eng katta summaga nisbatan o'lchanadi.
    const engSumma = Math.max(1, ...nomlar.map(n => Math.max(
      (hozir.amallar[n] || bosh).summa || 0, (oldin.amallar[n] || bosh).summa || 0)))

    // 12 oy ham xuddi shu chiziqli ko'rinishda. Ilgari vertikal ustunlar edi:
    // summa 0 bo'lganda ustunlar bo'sh kulrang quti bo'lib qolardi va oy nomidan
    // boshqa hech nima o'qilmasdi.
    const yillik = () => {
      const eng = Math.max(1, ...oylar.map(o => o.summa))
      const w = s => Math.max(s > 0 ? 2 : 0, Math.round(s / eng * 100))
      return `<div class="ic-ubars">${oylar.map(o => `
        <div class="ic-ubar${o.summa ? '' : ' bosh'}">
          <span class="ic-ubar-n">${escapeHtml(ymLabel(o.ym))}</span>
          <div class="ic-ubar-tr"><div class="ic-ubar-t"><i style="width:${w(o.summa)}%"></i></div></div>
          <b class="ic-ubar-c">${o.soni} ta</b>
          <b class="ic-ubar-s">${money(o.summa)}</b>
        </div>`).join('')}</div>`
    }

    return `
      <div class="ic-card">
        <div class="ic-card-head">
          <div><div class="ic-card-t">Ishlatish</div>
          <div class="ic-card-s">Schyot-fakturadagi har bir amal — to'q chiziq bu oy, och chiziq o'tgan oy</div></div>
          <div class="ic-chips" style="margin:0">
            <button type="button" class="ic-chip${useTab === 'oy' ? ' on' : ''}" data-usetab="oy">Oylik solishtirish</button>
            <button type="button" class="ic-chip${useTab === 'yil' ? ' on' : ''}" data-usetab="yil">12 oy</button>
          </div>
        </div>
        ${useTab === 'yil' ? yillik() : `
          <div class="ic-use-top">
            <div class="ic-use-sum">
              <span>${escapeHtml(ymLabel(hozir.ym))}</span>
              <b>${money(hozir.summa)}</b>
              <small>${hozir.soni} ta amal</small>
            </div>
            <div class="ic-use-sum mut">
              <span>${escapeHtml(ymLabel(oldin.ym))}</span>
              <b>${money(oldin.summa)}</b>
              <small>${oldin.soni} ta amal</small>
            </div>
            <div class="ic-use-sum">
              <span>Farq</span>
              <b>${(hozir.summa - oldin.summa) > 0 ? '+' : ''}${money(hozir.summa - oldin.summa)}</b>
              <small>${st(fJami.text, fJami.tone)}</small>
            </div>
          </div>
          ${nomlar.length
            ? `<div class="ic-ubars">${nomlar.map(n =>
                usageBar(n, hozir.amallar[n] || bosh, oldin.amallar[n] || bosh, engSumma)).join('')}</div>`
            : '<div class="ic-hist-empty">Bu ikki oyda pullik amal qayd etilmagan.</div>'}
        `}
      </div>
      `
  }

  async function loadUsage(){
    if(!co) return
    try{ use = await api.txUsage(co.id, 13) }
    catch(ex){ use = { oylar: [] }; toast(ex.error || 'Hisobotni olishda xatolik') }
    render()
  }

  const TABS = [
    ['umumiy', 'Umumiy'],
    // Tarixda IP va loginlar ko'rinadi — /api/audit kabi faqat asosiy admin
    // Tarix Tranzaksiyalardan OLDIN turadi — avval nima sarflangani,
    // keyin har bir yozuvning o'zi ko'riladi.
    ...(getRole() === 'admin' ? [['tarix', 'Ishlatish']] : []),
    ['tranz', 'Tranzaksiyalar'],
  ]

  function render(){
    if(!co){
      root.innerHTML = err
        ? `<div class="ic-page"><div class="err-box">${escapeHtml(err)}</div></div>`
        : `<div class="ic-page"><div style="padding:40px;text-align:center;color:var(--ic-mut)">Yuklanmoqda…</div></div>`
      return
    }
    root.innerHTML = `
      <div class="ic-page">
        <div class="ic-crumb"><b>Boshqaruv · <a href="#" id="cc-back" title="Filiallar jadvaliga qaytish">Filiallar</a></b><span>Tashkilot kartasi</span></div>
        <div class="ic-head">
          <div style="display:flex;align-items:center;gap:12px;min-width:0">
            <span class="ic-avatar">${escapeHtml(co.name[0])}</span>
            <div style="min-width:0">
              <div class="ic-title">${escapeHtml(co.name)}</div>
              <div class="ic-sub">${[co.company, 'ID ' + co.num, co.tariff, co.region].filter(Boolean).map(escapeHtml).join(' · ')}</div>
            </div>
            ${st(co.enabled ? 'Yoqilgan' : "O'chirilgan", co.enabled ? 'green' : 'mut')}
            ${co.blacklist ? st("Qora ro'yxatda", 'red') : ''}
          </div>
          <div class="ic-head-act">
            <select id="cc-pick" class="ic-select">${list.map(c => `<option value="${c.id}"${c.id === co.id ? ' selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select>
            <button type="button" class="ic-btn" id="cc-edit" title="Filiallar sahifasidagi tahrirlash oynasini ochadi">Tahrirlash</button>
          </div>
        </div>
        <div class="ic-chips">
          ${TABS.map(([k, l]) => `<button type="button" class="ic-chip${tab === k ? ' on' : ''}" data-tab="${k}">${escapeHtml(l)}</button>`).join('')}
        </div>
        ${tab === 'umumiy' ? umumiyHtml()
          : tab === 'tarix' ? tarixHtml()
          : transHtml()}
      </div>
    `
  }

  on(root, 'click', '#cc-back', (e) => { e.preventDefault(); goto('boshqaruv', 'filiallar') })
  // "Tahrirlash" — alohida usta yozmaymiz: Filiallar sahifasidagi HAQIQIY
  // 5 bosqichli tahrirlash oynasi shu tashkilot bilan ochiladi.
  on(root, 'click', '#cc-edit', () => {
    setClientEditTarget(co.id)
    goto('boshqaruv', 'filiallar')
  })
  on(root, 'click', '[data-toast]', (e, b) => toast(b.dataset.toast))
  on(root, 'click', '[data-tab]', (e, b) => {
    tab = b.dataset.tab
    render()
    if(tab === 'tarix' && use === null) loadUsage()
    if(tab === 'tranz' && tx === null) loadTx()
  })
  on(root, 'click', '[data-usetab]', (e, b) => { useTab = b.dataset.usetab; render() })

  // ---- Tranzaksiya qo'shish / o'chirish ----
  on(root, 'click', '[data-txpage]', (e, b) => {
    const n = Number(b.dataset.txpage)
    if(!n || n === txPage || txBusy) return
    txPage = n
    loadTx()
  })
  on(root, 'click', '[data-tx-del]', async (e, b) => {
    if(txBusy) return
    if(!confirm("Bu tranzaksiya butunlay o'chirilsinmi?")) return
    txBusy = true; render()
    try{ await api.txDelete(b.dataset.txDel); toast("O'chirildi") }
    catch(ex){ toast(ex.error || 'Xatolik') }
    txBusy = false
    tx = null
    loadTx()
  })
  on(root, 'click', '[data-cap]', (e, b) => { const k = b.dataset.cap; open[k] = !open[k]; render() })
  // Imkoniyat checkbox'i: guruh o'chirilsa ichidagilar ham o'chadi
  on(root, 'click', '[data-cap-toggle]', (e, b) => {
    e.stopPropagation()
    const k = b.dataset.capToggle
    const next = !cfg.capabilities[k]
    cfg.capabilities[k] = next
    if(!k.includes('|') && !next){
      const g = CAPABILITIES.find(x => x.key === k)
      if(g) g.items.forEach(it => { cfg.capabilities[capKey(k, it)] = false })
    }
    if(k.includes('|') && next) cfg.capabilities[k.split('|')[0]] = true
    save()
  })
  // Filiallar jadvalida ham ko'rinadigan uchta maydon
  on(root, 'click', '[data-fld-toggle]', (e, b) => {
    const k = b.dataset.fldToggle
    cfg[k] = !cfg[k]
    save()
  })
  // Qo'shimcha sozlamalar: tanlov o'zgarishi bilan saqlanadi
  on(root, 'change', '[data-extra]', (e, sel) => {
    const k = sel.dataset.extra
    if(sel.value) cfg.extras[k] = sel.value; else delete cfg.extras[k]
    save()
  })
  on(root, 'click', '[data-atmos-toggle]', () => {
    if(String(cfg.atmosId || "").trim()){   // yoqilgan edi — raqamni tozalaymiz
      cfg.atmosId = ''
      atmosOpen = false
      return save()
    }
    atmosOpen = !atmosOpen
    render()
  })
  on(root, 'change', '[data-fld-text]', (e, inp) => {
    cfg[inp.dataset.fldText] = String(inp.value || '').trim()
    save()
  })
  on(root, 'click', '[data-blk-toggle]', (e, b) => {
    const k = b.dataset.blkToggle
    cfg.blockers[k] = !cfg.blockers[k]
    save()
  })
  // Narx maydoni: har harfda emas, fokusdan chiqqanda (change) saqlanadi —
  // aks holda har bosishda qayta chizilib, kursor yo'qolardi.
  on(root, 'change', '[data-price]', (e, inp) => {
    const key = inp.dataset.price
    const v = Math.max(0, Math.round(Number(inp.value) || 0))
    if(v) cfg.prices[key] = v; else delete cfg.prices[key]
    save()
  })
  on(root, 'click', '#px-clear', () => {
    if(!Object.keys(cfg.prices).length) return toast('Belgilangan narx yo\'q')
    cfg.prices = {}
    save()
  })
  on(root, 'click', '[data-pay-toggle]', (e, b) => {
    const k = b.dataset.payToggle
    cfg.payOrgs[k] = !cfg.payOrgs[k]
    save()
  })
  on(root, 'change', '#cc-pick', (e, sel) => {
    co = list.find(c => String(c.id) === sel.value) || list[0]
    open = {}
    use = null
    tx = null; txPage = 1
    loadTx()
    loadSettings()
  })

  // Tanlangan tashkilotning saqlangan sozlamalari
  async function loadSettings(){
    cfg = emptyCfg()
    render()
    if(!co) return
    try{
      const got = await api.clientSettings(co.id)
      cfg = Object.assign(cfg, got || {})
    }catch(ex){ /* sozlama hali yo'q — bo'sh holatda qolamiz */ }
    render()
  }

  async function load(){
    try{
      const raw = await api.clientsList()
      list = (raw || []).map(adapt)
      const want = takeCompanyCardTarget()
      const wantTab = takeCompanyCardTab()
      if(wantTab) tab = wantTab
      co = (want && list.find(c => String(c.id) === want)) || list[0] || null
      if(!co) err = 'Tashkilot topilmadi'
    }catch(ex){ err = ex.error || 'Xatolik' }
    render()
    // Balans tranzaksiyalardan hisoblanadi, shuning uchun ular Umumiy
    // yorlig'i uchun ham darhol kerak — yorliq ochilishini kutmaymiz.
    if(co){ loadSettings(); loadTx() }
  }

  render()   // "Yuklanmoqda…"
  load()
  return function cleanup(){}
}
