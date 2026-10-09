// Moliya bo'limining qolgan 7 ta sahifasi — Filiallar, Qora ro'yxat, KATM,
// Kredit foydalanuvchisi, Tarix, Hisobotlar, Qo'llanma.
//
// DIQQAT: hammasi NAMUNA (demo) ma'lumot — moliyaviy backend endpointlari
// hali yo'q. Qiymatlar deterministik hash'dan hosil qilinadi (demo-kit.js),
// shuning uchun sahifa qayta ochilganda bir xil bo'ladi.
import { escapeHtml } from '../core.js'
import {
  mountDemoTable, mountDemoBlocks, card, st, idBadge, money, rint, pick,
  chance, personName, phoneNum, dateAgo, SHOPS, REGIONS, IC_DL, IC_PLUS,
} from './demo-kit.js'

const ic = d => `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"></path></svg>`
const IC_SHOP = ic('M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6')
const IC_BAN = ic('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8')
const IC_SYNC = ic('M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15')
const IC_USER = ic('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0')
const IC_CLOCK = ic('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2')
const IC_DOC = ic('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6')
const IC_MONEY = ic('M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6')

// ---------------------------------------------------------------- Filiallar
const BRANCH_STATUS = ['Aktiv', 'Vaqtincha yopiq', 'Bloklangan']

function branchRows(){
  return Array.from({ length: 46 }, (_, i) => {
    const seed = 'fil' + i
    const shop = pick(seed + 's', SHOPS) + ' ' + (i % 7 + 1)
    return {
      id: 'F-' + (10420 + i),
      name: shop,
      region: pick(seed + 'r', REGIONS),
      director: personName(seed + 'd'),
      phone: phoneNum(seed),
      contracts: rint(seed + 'c', 40, 2400),
      turnover: rint(seed + 't', 80, 1900) * 1000000,
      status: chance(seed + 'st', 78) ? 'Aktiv' : (chance(seed + 'st2', 60) ? 'Vaqtincha yopiq' : 'Bloklangan'),
      opened: dateAgo(seed + 'o', 900),
    }
  })
}

export function mountMoliyaFiliallar(root, { toast }){
  const rows = branchRows()
  return mountDemoTable(root, {
    title: 'Filiallar',
    sub: rows.length + ' ta filial · moliyaviy ko\'rsatkichlar kesimida',
    actions: [
      { label: 'Excel', icon: IC_DL, ghost: true, toast: 'Excel eksporti — demo rejimida yuklanmaydi' },
      { label: 'Yangi filial', icon: IC_PLUS, toast: 'Filial qo\'shish oynasi — demo rejimida ochilmaydi' },
    ],
    kpis: all => [
      { ic: IC_SHOP, label: 'Jami filial', val: all.length },
      { ic: IC_SHOP, label: 'Aktiv', val: all.filter(r => r.status === 'Aktiv').length, delta: 'oxirgi oyda +3', tone: 'green' },
      { ic: IC_BAN, label: 'Bloklangan', val: all.filter(r => r.status === 'Bloklangan').length },
      { ic: IC_MONEY, label: 'Jami aylanma', val: money(all.reduce((a, r) => a + r.turnover, 0) / 1e6) + ' mln', delta: 'so\'m', tone: 'mut' },
      { ic: IC_DOC, label: 'Shartnomalar', val: money(all.reduce((a, r) => a + r.contracts, 0)) },
    ],
    filters: { field: 'status', values: ['Hammasi', ...BRANCH_STATUS] },
    search: ['name', 'region', 'director', 'id'],
    cols: [
      { key: 'id', label: 'ID', render: r => idBadge(r.id) },
      { key: 'name', label: 'Filial', cls: 'name' },
      { key: 'region', label: 'Hudud' },
      { key: 'director', label: 'Rahbar' },
      { key: 'phone', label: 'Telefon' },
      { key: 'contracts', label: 'Shartnoma', cls: 'num', render: r => money(r.contracts) },
      { key: 'turnover', label: 'Aylanma', cls: 'num', render: r => money(r.turnover / 1e6) + ' mln' },
      { key: 'status', label: 'Holat', render: r => st(r.status, r.status === 'Aktiv' ? 'green' : r.status === 'Bloklangan' ? 'red' : 'amber') },
      { key: 'opened', label: 'Ochilgan' },
    ],
    rows,
    onRowToast: r => r.name + ' — filial kartasi demo rejimida ochilmaydi',
  }, { toast })
}

// ------------------------------------------------------------- Qora ro'yxat
const BL_REASONS = ['90+ kun kechikish', 'Firibgarlik shubhasi', 'Soxta hujjat', 'Sudga berilgan', 'Bir necha marta qaytarilgan']

export function mountMoliyaQora(root, { toast }){
  const rows = Array.from({ length: 38 }, (_, i) => {
    const seed = 'bl' + i
    return {
      id: 'QR-' + (7100 + i),
      fish: personName(seed),
      phone: phoneNum(seed),
      pinfl: '3' + rint(seed + 'p', 100000000000, 999999999999),
      region: pick(seed + 'r', REGIONS),
      debt: rint(seed + 'd', 300, 42000) * 1000,
      days: rint(seed + 'dd', 91, 720),
      reason: pick(seed + 'rs', BL_REASONS),
      added: dateAgo(seed + 'a', 400),
    }
  })
  return mountDemoTable(root, {
    title: "Qora ro'yxat",
    sub: "To'lovni uzoq muddat amalga oshirmagan yoki qoidabuzarlik qayd etilgan mijozlar",
    actions: [{ label: 'Excel', icon: IC_DL, ghost: true }, { label: "Ro'yxatga qo'shish", icon: IC_PLUS }],
    kpis: all => [
      { ic: IC_BAN, label: "Qora ro'yxatda", val: all.length },
      { ic: IC_MONEY, label: 'Jami qarz', val: money(all.reduce((a, r) => a + r.debt, 0) / 1e6) + ' mln' },
      { ic: IC_CLOCK, label: "O'rtacha kechikish", val: Math.round(all.reduce((a, r) => a + r.days, 0) / all.length) + ' kun' },
      { ic: IC_DOC, label: 'Sudga berilgan', val: all.filter(r => r.reason === 'Sudga berilgan').length },
    ],
    filters: { field: 'reason', values: ['Hammasi', ...BL_REASONS] },
    search: ['fish', 'phone', 'pinfl', 'region'],
    cols: [
      { key: 'id', label: 'ID', render: r => idBadge(r.id) },
      { key: 'fish', label: 'FISH', cls: 'name' },
      { key: 'phone', label: 'Telefon' },
      { key: 'pinfl', label: 'JSHSHIR' },
      { key: 'region', label: 'Hudud' },
      { key: 'debt', label: 'Qarz', cls: 'num', render: r => money(r.debt) },
      { key: 'days', label: 'Kechikish', cls: 'num', render: r => r.days + ' kun' },
      { key: 'reason', label: 'Sabab', render: r => st(r.reason, r.reason === 'Sudga berilgan' ? 'red' : 'amber') },
      { key: 'added', label: "Qo'shilgan" },
    ],
    rows,
    onRowToast: r => r.fish + " — qora ro'yxat kartasi demo rejimida ochilmaydi",
  }, { toast })
}

// ------------------------------------------------------------------- KATM
const KATM_RESULT = ['Ijobiy', 'Shartli', 'Rad etildi', "Ma'lumot yo'q"]

export function mountMoliyaKatm(root, { toast }){
  const rows = Array.from({ length: 52 }, (_, i) => {
    const seed = 'katm' + i
    const score = rint(seed + 'sc', 210, 850)
    return {
      id: 'K-' + (880100 + i),
      fish: personName(seed),
      pinfl: '3' + rint(seed + 'p', 100000000000, 999999999999),
      score,
      grade: score >= 700 ? 'A' : score >= 560 ? 'B' : score >= 420 ? 'C' : 'D',
      openLoans: rint(seed + 'ol', 0, 5),
      totalLoan: rint(seed + 'tl', 0, 95000) * 1000,
      result: score >= 700 ? 'Ijobiy' : score >= 560 ? 'Shartli' : score >= 420 ? 'Rad etildi' : "Ma'lumot yo'q",
      checked: dateAgo(seed + 'c', 30),
    }
  })
  return mountDemoTable(root, {
    title: 'KATM',
    sub: "Kredit axborot tahlil markazi so'rovlari — skoring natijalari",
    note: "Namuna (demo) ma'lumot — KATM integratsiyasi hali ulanmagan. Skoring ballari haqiqiy emas.",
    actions: [{ label: 'Yangilash', icon: IC_SYNC, ghost: true, toast: "KATM bilan sinxronlash — demo rejimida ishlamaydi" }, { label: "Yangi so'rov", icon: IC_PLUS }],
    kpis: all => [
      { ic: IC_SYNC, label: "Bugungi so'rov", val: rint('katmq', 120, 480) },
      { ic: IC_USER, label: 'Ijobiy', val: all.filter(r => r.result === 'Ijobiy').length, delta: 'skoring 700+', tone: 'green' },
      { ic: IC_USER, label: 'Shartli', val: all.filter(r => r.result === 'Shartli').length },
      { ic: IC_BAN, label: 'Rad etildi', val: all.filter(r => r.result === 'Rad etildi').length },
      { ic: IC_MONEY, label: "O'rtacha ball", val: Math.round(all.reduce((a, r) => a + r.score, 0) / all.length) },
    ],
    filters: { field: 'result', values: ['Hammasi', ...KATM_RESULT] },
    search: ['fish', 'pinfl', 'id'],
    cols: [
      { key: 'id', label: "So'rov", render: r => idBadge(r.id) },
      { key: 'fish', label: 'FISH', cls: 'name' },
      { key: 'pinfl', label: 'JSHSHIR' },
      { key: 'score', label: 'Skoring', cls: 'num' },
      { key: 'grade', label: 'Daraja', render: r => st(r.grade, r.grade === 'A' ? 'green' : r.grade === 'B' ? 'teal' : r.grade === 'C' ? 'amber' : 'red') },
      { key: 'openLoans', label: 'Ochiq kredit', cls: 'num' },
      { key: 'totalLoan', label: 'Kredit qoldig\'i', cls: 'num', render: r => money(r.totalLoan) },
      { key: 'result', label: 'Natija', render: r => st(r.result, r.result === 'Ijobiy' ? 'green' : r.result === 'Shartli' ? 'amber' : r.result === 'Rad etildi' ? 'red' : 'mut') },
      { key: 'checked', label: 'Tekshirilgan' },
    ],
    rows,
    onRowToast: r => r.fish + " — KATM hisoboti demo rejimida ochilmaydi",
  }, { toast })
}

// ------------------------------------------------- Kredit foydalanuvchisi
const CRED_STATUS = ['Faol', "To'liq yopildi", 'Kechikishda', 'Muzlatilgan']

export function mountMoliyaKredit(root, { toast }){
  const rows = Array.from({ length: 60 }, (_, i) => {
    const seed = 'cr' + i
    const total = rint(seed + 'tot', 800, 42000) * 1000
    const paidPct = rint(seed + 'pp', 5, 100)
    const status = paidPct === 100 ? "To'liq yopildi" : chance(seed + 's', 68) ? 'Faol' : chance(seed + 's2', 60) ? 'Kechikishda' : 'Muzlatilgan'
    return {
      id: '#3' + rint(seed + 'id', 100000, 999999),
      fish: personName(seed),
      phone: phoneNum(seed),
      shop: pick(seed + 'sh', SHOPS),
      total,
      paid: Math.round(total * paidPct / 100),
      paidPct,
      months: pick(seed + 'm', [3, 6, 9, 12, 18, 24]),
      status,
      started: dateAgo(seed + 'st', 500),
    }
  })
  return mountDemoTable(root, {
    title: 'Kredit foydalanuvchisi',
    sub: "Muddatli to'lov shartnomasi bo'yicha mijozlar va to'lov bajarilishi",
    actions: [{ label: 'Excel', icon: IC_DL, ghost: true }],
    kpis: all => [
      { ic: IC_USER, label: 'Jami mijoz', val: all.length },
      { ic: IC_USER, label: 'Faol', val: all.filter(r => r.status === 'Faol').length },
      { ic: IC_CLOCK, label: 'Kechikishda', val: all.filter(r => r.status === 'Kechikishda').length },
      { ic: IC_MONEY, label: 'Berilgan summa', val: money(all.reduce((a, r) => a + r.total, 0) / 1e6) + ' mln' },
      { ic: IC_MONEY, label: "Qaytarilgan", val: money(all.reduce((a, r) => a + r.paid, 0) / 1e6) + ' mln' },
    ],
    filters: { field: 'status', values: ['Hammasi', ...CRED_STATUS] },
    search: ['fish', 'phone', 'shop', 'id'],
    cols: [
      { key: 'id', label: 'Shartnoma', render: r => idBadge(r.id) },
      { key: 'fish', label: 'FISH', cls: 'name' },
      { key: 'phone', label: 'Telefon' },
      { key: 'shop', label: "Do'kon" },
      { key: 'total', label: 'Summa', cls: 'num', render: r => money(r.total) },
      { key: 'months', label: 'Muddat', cls: 'num', render: r => r.months + ' oy' },
      { key: 'paidPct', label: "To'langan", render: r => `<span style="display:block">${r.paidPct}%</span><span class="ic-bar"><i style="width:${r.paidPct}%"></i></span>` },
      { key: 'status', label: 'Holat', render: r => st(r.status, r.status === 'Faol' ? 'green' : r.status === "To'liq yopildi" ? 'teal' : r.status === 'Kechikishda' ? 'red' : 'mut') },
      { key: 'started', label: 'Boshlangan' },
    ],
    rows,
    onRowToast: r => r.fish + ' — shartnoma kartasi demo rejimida ochilmaydi',
  }, { toast })
}

// ------------------------------------------------------------------- Tarix
const EVENTS = [
  ['Shartnoma yaratildi', 'green'], ['Shartnoma bekor qilindi', 'red'], ["To'lov qabul qilindi", 'green'],
  ['Limit oshirildi', 'teal'], ['Limit kamaytirildi', 'amber'], ['Filial bloklandi', 'red'],
  ['Foydalanuvchi qo\'shildi', 'teal'], ['Tarif o\'zgartirildi', 'amber'], ['KATM so\'rovi yuborildi', 'mut'],
  ['Hujjat tasdiqlandi', 'green'],
]

export function mountMoliyaTarix(root, { toast }){
  const rows = Array.from({ length: 80 }, (_, i) => {
    const seed = 'ev' + i
    const ev = pick(seed + 'e', EVENTS)
    return {
      id: 'L-' + (990000 + i),
      when: dateAgo(seed + 'w', 60),
      actor: personName(seed + 'a'),
      event: ev[0],
      tone: ev[1],
      object: pick(seed + 'o', SHOPS),
      ip: rint(seed + 'i1', 10, 213) + '.' + rint(seed + 'i2', 0, 255) + '.' + rint(seed + 'i3', 0, 255) + '.' + rint(seed + 'i4', 1, 254),
    }
  })
  return mountDemoTable(root, {
    title: 'Tarix',
    sub: "Moliyaviy amallar jurnali — kim, qachon va nima qilgani",
    actions: [{ label: 'Excel', icon: IC_DL, ghost: true }],
    kpis: all => [
      { ic: IC_CLOCK, label: 'Jami yozuv', val: money(all.length) },
      { ic: IC_DOC, label: 'Yaratilgan', val: all.filter(r => r.event.includes('yaratildi')).length },
      { ic: IC_BAN, label: 'Bekor/blok', val: all.filter(r => r.tone === 'red').length },
      { ic: IC_USER, label: 'Faol operator', val: new Set(all.map(r => r.actor)).size },
    ],
    filters: { field: 'event', values: ['Hammasi', ...EVENTS.map(e => e[0])] },
    search: ['actor', 'event', 'object', 'ip'],
    perPage: 14,
    cols: [
      { key: 'id', label: 'ID', render: r => idBadge(r.id) },
      { key: 'when', label: 'Vaqt' },
      { key: 'actor', label: 'Foydalanuvchi', cls: 'name' },
      { key: 'event', label: 'Amal', render: r => st(r.event, r.tone) },
      { key: 'object', label: 'Obyekt' },
      { key: 'ip', label: 'IP' },
    ],
    rows,
    onRowToast: r => r.event + ' — tafsilot demo rejimida ochilmaydi',
  }, { toast })
}

// -------------------------------------------------------------- Hisobotlar
const REPORTS = [
  { name: 'Kunlik aylanma', desc: "Filiallar kesimida kunlik savdo va to'lovlar yig'indisi", period: 'Har kuni 23:59', fmt: 'XLSX' },
  { name: 'Kechikkan to\'lovlar', desc: "Muddati o'tgan to'lovlar va kechikish kunlari bo'yicha ro'yxat", period: 'Har dushanba', fmt: 'XLSX' },
  { name: 'Portfel sifati', desc: "NPL, qayta tuzilgan shartnomalar va zaxira hisoboti", period: 'Oyning 1-sanasi', fmt: 'PDF' },
  { name: 'Filial reytingi', desc: "Aylanma, o'sish va qaytarish darajasi bo'yicha filiallar reytingi", period: 'Har oy', fmt: 'PDF' },
  { name: 'KATM so\'rovlari', desc: "Yuborilgan so'rovlar, natijalar va o'rtacha skoring", period: 'Har hafta', fmt: 'XLSX' },
  { name: 'Soliq hisoboti', desc: "Soliq organlariga topshiriladigan yig'ma shakl", period: 'Chorakda 1 marta', fmt: 'PDF' },
]

export function mountMoliyaHisobot(root, { toast }){
  return mountDemoBlocks(root, {
    title: 'Hisobotlar',
    sub: 'Avtomatik shakllantiriladigan moliyaviy hisobotlar',
    note: "Namuna (demo) ro'yxat — hisobot generatori hali ulanmagan, fayllar yuklab olinmaydi.",
    actions: [{ label: 'Yangi shablon', icon: IC_PLUS }],
    kpis: [
      { ic: IC_DOC, label: 'Shablonlar', val: REPORTS.length },
      { ic: IC_SYNC, label: 'Avtomatik', val: REPORTS.length },
      { ic: IC_CLOCK, label: "Oxirgi yig'ilgan", val: dateAgo('rep', 1) },
      { ic: IC_DL, label: 'Oyiga yuklab olingan', val: rint('repdl', 120, 640) },
    ],
    blocks: () => `
      <div class="ic-grid">
        ${REPORTS.map((r, i) => `
          <div class="ic-card">
            <div class="ic-tilehead">
              <span class="ic-tile teal">${IC_DOC}</span>
              <span><b>${escapeHtml(r.name)}</b><small>${escapeHtml(r.period)}</small></span>
            </div>
            <p>${escapeHtml(r.desc)}</p>
            <div class="ic-card-foot">
              ${st(r.fmt, 'teal')}
              <span style="margin-left:auto">
                <button type="button" class="ic-btn ghost" data-toast="${escapeHtml(r.name)} — demo rejimida yuklab olinmaydi">${IC_DL} Yuklab olish</button>
              </span>
            </div>
          </div>
        `).join('')}
      </div>
      ${card({
        title: "Oxirgi shakllantirilgan hisobotlar",
        sub: 'Tizim avtomatik yig\'gan oxirgi 5 ta fayl',
        body: `<table class="ic-tbl">
          <thead><tr><th>Hisobot</th><th>Davr</th><th>Format</th><th class="num">Hajm</th><th>Holat</th></tr></thead>
          <tbody>${REPORTS.slice(0, 5).map((r, i) => `
            <tr><td class="name">${escapeHtml(r.name)}</td><td>${dateAgo('rr' + i, 20)}</td><td>${escapeHtml(r.fmt)}</td>
            <td class="num">${rint('rs' + i, 40, 4200)} KB</td><td>${st('Tayyor', 'green')}</td></tr>
          `).join('')}</tbody>
        </table>`,
      })}
    `,
  }, { toast })
}

// --------------------------------------------------------------- Qo'llanma
const FAQ = [
  ['Yangi shartnoma qanday ochiladi?', "Moliya → Shartnomalar bo'limiga kiring, o'ng yuqoridagi \"Import qilish\" yoki filial panelidagi \"Yangi shartnoma\" tugmasidan foydalaning. Mijoz JSHSHIR raqami bo'yicha KATM tekshiruvi avtomatik yuboriladi."],
  ['Limit qanday hisoblanadi?', "Mijoz limiti KATM skoringi, oldingi to'lov tarixi va filial darajasidagi koeffitsientdan kelib chiqib hisoblanadi. Boshqaruv → iCAN Limiti → Balans limiti bo'limida qo'lda tuzatish mumkin."],
  ['Qora ro\'yxatga kim tushadi?', "90 kundan ortiq kechikish, soxta hujjat yoki firibgarlik shubhasi qayd etilganda mijoz avtomatik ravishda qora ro'yxatga o'tkaziladi. Ro'yxatdan chiqarish faqat administrator huquqi bilan bajariladi."],
  ['Filialni qanday bloklash mumkin?', "Moliya → Filiallar bo'limida kerakli filial qatorini oching va \"Holat\" maydonini \"Bloklangan\" ga o'zgartiring. Bloklangan filialda yangi shartnoma ochib bo'lmaydi, mavjudlari amal qilaveradi."],
  ['Hisobotlar qachon yig\'iladi?', "Har bir shablonning o'z jadvali bor (kunlik, haftalik, oylik). Hisobotlar → shablon kartasida keyingi yig'ilish vaqti ko'rsatilgan. Qo'lda ham shakllantirish mumkin."],
  ['Ma\'lumotlar qancha saqlanadi?', "Moliyaviy amallar jurnali (Tarix) 5 yil, shartnoma hujjatlari esa shartnoma yopilganidan keyin 10 yil davomida saqlanadi."],
]

export function mountMoliyaQollanma(root, { toast }){
  return mountDemoBlocks(root, {
    title: "Qo'llanma",
    sub: "Moliya moduli bo'yicha qisqa yo'riqnoma va tez-tez so'raladigan savollar",
    note: "Namuna (demo) matn — rasmiy qo'llanma hujjati keyinroq shu joyga qo'yiladi.",
    blocks: () => `
      <div class="ic-row-2">
        <div>
          ${card({
            title: 'Tez boshlash',
            sub: "Tizimga birinchi marta kirganda bajariladigan 4 qadam",
            body: `<div class="ic-tl">
              ${[
                ['1-qadam · Filial qo\'shish', "Moliya → Filiallar bo'limida savdo nuqtangizni ro'yxatga oling: nomi, hududi, rahbari va telefoni."],
                ['2-qadam · Foydalanuvchi yaratish', "Boshqaruv → Foydalanuvchilar bo'limida xodimlarga login bering va Roli bo'limidan huquq biriktiring."],
                ['3-qadam · Limit va tarif', "Boshqaruv → iCAN Limiti bo'limida filial uchun balans limiti va tarif rejasini belgilang."],
                ['4-qadam · Birinchi shartnoma', "Moliya → Shartnomalar bo'limidan mijoz uchun muddatli to'lov shartnomasini rasmiylashtiring."],
              ].map(t => `<div class="ic-tl-item"><small>${escapeHtml(t[0].split(' · ')[0])}</small><b>${escapeHtml(t[0].split(' · ')[1])}</b><p>${escapeHtml(t[1])}</p></div>`).join('')}
            </div>`,
          })}
        </div>
        <div>
          ${card({
            title: "Ko'p so'raladigan savollar",
            sub: FAQ.length + ' ta savol',
            body: FAQ.map(f => `<details class="ic-acc"><summary>${escapeHtml(f[0])}</summary><p>${escapeHtml(f[1])}</p></details>`).join(''),
          })}
          ${card({
            title: "Yordam kerakmi?",
            body: `<div class="ic-strip"><span>Qo'llab-quvvatlash</span> <b>+998 71 200-00-00</b></div>
                   <div class="ic-strip"><span>Telegram</span> <b>@ican_support</b></div>
                   <div class="ic-strip"><span>Ish vaqti</span> <b>Du–Sh · 09:00–18:00</b></div>`,
          })}
        </div>
      </div>
    `,
  }, { toast })
}

export const MOLIYA_DEMO_MOUNTS = {
  filiallar: mountMoliyaFiliallar,
  qora: mountMoliyaQora,
  katm: mountMoliyaKatm,
  kredit: mountMoliyaKredit,
  tarix: mountMoliyaTarix,
  hisobot: mountMoliyaHisobot,
  qollanma: mountMoliyaQollanma,
}
