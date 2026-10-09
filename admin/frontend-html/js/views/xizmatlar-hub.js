// "Xizmatlar" moduli.
//
// TUZILISH asl super admindan (dev-admin.icanbusiness.uz) olindi:
//   Bloklash moslamalari → ICAN IMEI, Idendity IMEI, SAMSUNG / ANDROID,
//                          Mobilock, Apple MDM
//   Tarix                → Allgood, IMEI, IMEI ICAN, Get Mobi,
//                          Mobilock tarixi, Apple MDM tarixi
//   To'lov tashkilotlari
//
// Ilgari bu modulda men taxmin qilgan boshqa tuzilish (katalog, integratsiya,
// so'rovlar, sarf) bor edi — u asl tizimga mos kelmagani uchun almashtirildi.
//
// DIQQAT: barcha sahifalar NAMUNA (demo) ma'lumot ko'rsatadi.
import { escapeHtml } from '../core.js'
import { mountWithCrumb, groupCrumb } from './demo-kit.js'
import {
  mountDemoTable, mountDemoBlocks, card, barList, st, idBadge, money, rint, pick,
  chance, personName, phoneNum, dateAgo, SHOPS, IC_DL, IC_PLUS,
} from './demo-kit.js'

const ic = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"></path></svg>`
const IC_LOCK = ic('M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM8 11V7a4 4 0 0 1 8 0v4')
const IC_HIST = ic('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2')
const IC_PAY = ic('M2 7.5A2.5 2.5 0 0 1 4.5 5h15A2.5 2.5 0 0 1 22 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 16.5zM2 10h20')

// Bloklash moslamalari — asl tizimdagi 5 ta band
const DEVICES = {
  'imei-new':  { name: 'ICAN IMEI',        os: 'Barcha', desc: "ICAN o'zining IMEI ro'yxatga olish va qulflash xizmati" },
  'imei':      { name: 'Idendity IMEI',    os: 'Barcha', desc: 'Identity provayderi orqali IMEI qulflash' },
  'get-mobi':  { name: 'SAMSUNG / ANDROID', os: 'Android', desc: 'GetMobi orqali Android qurilmalarni boshqarish' },
  'asaxiy-mdm':{ name: 'Mobilock',         os: 'Android', desc: 'Mobilock (Asaxiy MDM) orqali qurilmani bloklash' },
  'apple-mdm': { name: 'Apple MDM',        os: 'iOS',     desc: 'Apple Device Enrollment orqali iPhone/iPad boshqaruvi' },
}

// Tarix — asl tizimdagi 6 ta band
const HISTORIES = {
  'h-allgood':    { name: 'Allgood',        ops: ['Tekshiruv', "Ro'yxatga olish", 'Holat'] },
  'h-imei':       { name: 'IMEI',           ops: ["Ro'yxatga olish", 'Qulflash', 'Qulfni ochish'] },
  'h-imei-new':   { name: 'IMEI ICAN',      ops: ["Ro'yxatga olish", 'Qulflash', 'Qulfni ochish', 'Holat'] },
  'h-get-mobi':   { name: 'Get Mobi',       ops: ["Ro'yxatga olish", 'Bloklash', 'Blokni yechish'] },
  'h-asaxiy-mdm': { name: 'Mobilock',       ops: ["Ro'yxatga olish", 'Bloklash', 'Blokni yechish'] },
  'h-apple-mdm':  { name: 'Apple MDM',      ops: ['Enrollment', 'Bloklash', 'Blokni yechish', 'Profil'] },
}

export const XIZMATLAR_GROUPS = [
  { key: 'bloklash', label: 'Bloklash moslamalari', icon: IC_LOCK, items:
    Object.entries(DEVICES).map(([k, d]) => ({ key: k, label: d.name })) },
  { key: 'tarix', label: 'Tarix', icon: IC_HIST, items:
    Object.entries(HISTORIES).map(([k, h]) => ({ key: k, label: h.name + (k === 'h-allgood' ? '' : ' tarixi') })) },
  { key: 'tolov-tashkilotlari', label: "To'lov tashkilotlari", icon: IC_PAY, items: null },
]

// ------------------------------------------------ bloklash moslamasi sahifasi
function makeDevice(key){
  const d = DEVICES[key]
  return function mount(root, { toast }){
    const rows = Array.from({ length: 68 }, (_, i) => {
      const seed = key + i
      const locked = chance(seed + 'l', 28)
      return {
        id: 'D-' + (150000 + i),
        imei: String(rint(seed + 'im', 100000000000000, 999999999999999)),
        model: pick(seed + 'm', d.os === 'iOS'
          ? ['iPhone 13', 'iPhone 14', 'iPhone 15', 'iPad Air', 'iPhone 12']
          : d.os === 'Android'
          ? ['Galaxy A54', 'Galaxy S23', 'Redmi Note 12', 'Realme C55', 'Galaxy A34']
          : ['iPhone 14', 'Galaxy A54', 'Redmi Note 12', 'iPhone 13', 'Galaxy S23']),
        client: personName(seed + 'c'),
        phone: phoneNum(seed),
        branch: pick(seed + 'b', SHOPS),
        registered: dateAgo(seed + 'r', 300),
        status: locked ? 'Qulflangan' : chance(seed + 's', 85) ? 'Faol' : "Ro'yxatdan chiqarilgan",
      }
    })
    return mountDemoTable(root, {
      title: d.name,
      sub: d.desc,
      note: "Namuna (demo) ma'lumot — " + d.name + " integratsiyasi hali ulanmagan.",
      actions: [{ label: 'Excel', icon: IC_DL, ghost: true }, { label: "Qurilma qo'shish", icon: IC_PLUS }],
      kpis: all => [
        { label: 'Qurilmalar', val: all.length },
        { label: 'Faol', val: all.filter(r => r.status === 'Faol').length },
        { label: 'Qulflangan', val: all.filter(r => r.status === 'Qulflangan').length },
        { label: "Ro'yxatdan chiqarilgan", val: all.filter(r => r.status.startsWith("Ro'yxatdan")).length },
        { label: 'Platforma', val: d.os },
      ],
      filters: { field: 'status', values: ['Hammasi', 'Faol', 'Qulflangan', "Ro'yxatdan chiqarilgan"] },
      search: ['imei', 'model', 'client', 'phone', 'branch'],
      perPage: 14,
      cols: [
        { key: 'id', label: 'ID', render: r => idBadge(r.id) },
        { key: 'imei', label: 'IMEI' },
        { key: 'model', label: 'Model', cls: 'name' },
        { key: 'client', label: 'Mijoz' },
        { key: 'phone', label: 'Telefon' },
        { key: 'branch', label: 'Filial' },
        { key: 'registered', label: "Ro'yxatga olingan" },
        { key: 'status', label: 'Holat', render: r => st(r.status, r.status === 'Faol' ? 'green' : r.status === 'Qulflangan' ? 'red' : 'mut') },
      ],
      rows,
      onRowToast: r => r.model + ' (' + r.imei + ') — qurilma kartasi demo rejimida ochilmaydi',
    }, { toast })
  }
}

// -------------------------------------------------------------- tarix sahifasi
function makeHistory(key){
  const h = HISTORIES[key]
  return function mount(root, { toast }){
    const rows = Array.from({ length: 78 }, (_, i) => {
      const seed = key + i
      const ok = chance(seed + 'o', 88)
      return {
        id: 'X-' + (310000 + i),
        when: dateAgo(seed + 'w', 25),
        op: pick(seed + 'op', h.ops),
        imei: String(rint(seed + 'im', 100000000000000, 999999999999999)),
        client: personName(seed + 'c'),
        branch: pick(seed + 'b', SHOPS),
        ms: rint(seed + 'ms', 80, 3200),
        result: ok ? 'Muvaffaqiyatli' : chance(seed + 'o2', 55) ? 'Xatolik' : 'Vaqt tugadi',
      }
    })
    return mountDemoTable(root, {
      title: h.name + ' tarixi',
      sub: h.name + " xizmatiga yuborilgan so'rovlar jurnali",
      actions: [{ label: 'Excel', icon: IC_DL, ghost: true }],
      kpis: all => [
        { label: "So'rovlar", val: money(all.length) },
        { label: 'Muvaffaqiyatli', val: all.filter(r => r.result === 'Muvaffaqiyatli').length },
        { label: 'Xatolik', val: all.filter(r => r.result !== 'Muvaffaqiyatli').length },
        { label: "O'rtacha javob", val: Math.round(all.reduce((a, r) => a + r.ms, 0) / all.length) + ' ms' },
      ],
      filters: { field: 'op', values: ['Hammasi', ...h.ops] },
      search: ['imei', 'client', 'branch', 'op'],
      perPage: 14,
      cols: [
        { key: 'id', label: 'ID', render: r => idBadge(r.id) },
        { key: 'when', label: 'Vaqt' },
        { key: 'op', label: 'Amal', cls: 'name' },
        { key: 'imei', label: 'IMEI' },
        { key: 'client', label: 'Mijoz' },
        { key: 'branch', label: 'Filial' },
        { key: 'ms', label: 'Javob', cls: 'num', render: r => r.ms + ' ms' },
        { key: 'result', label: 'Natija', render: r => st(r.result, r.result === 'Muvaffaqiyatli' ? 'green' : r.result === 'Xatolik' ? 'red' : 'amber') },
      ],
      rows,
      onRowToast: r => h.name + ' · ' + r.op + " — so'rov tafsiloti demo rejimida ochilmaydi",
    }, { toast })
  }
}

// ------------------------------------------------------- to'lov tashkilotlari
const PAY_ORGS = [
  { name: 'Payme',     type: 'To\'lov tizimi', on: true },
  { name: 'Click',     type: 'To\'lov tizimi', on: true },
  { name: 'Uzum Bank', type: 'Bank',           on: false },
  { name: 'Atmos',     type: 'Protsessing',    on: true },
  { name: 'MyUzcard',  type: 'Protsessing',    on: true },
  { name: 'Uniaccess', type: 'Protsessing',    on: true },
  { name: 'Prizma',    type: 'Protsessing',    on: false },
  { name: 'Humo',      type: 'Karta tizimi',   on: true },
]

function mountPayOrgs(root, { toast }){
  return mountDemoBlocks(root, {
    title: "To'lov tashkilotlari",
    sub: PAY_ORGS.filter(p => p.on).length + ' / ' + PAY_ORGS.length + ' ta ulangan',
    note: "Namuna (demo) holat — ulanishlar aslida tekshirilmayapti.",
    actions: [{ label: 'Tashkilot qo\'shish', icon: IC_PLUS }],
    kpis: [
      { label: 'Tashkilotlar', val: PAY_ORGS.length },
      { label: 'Ulangan', val: PAY_ORGS.filter(p => p.on).length },
      { label: 'Ulanmagan', val: PAY_ORGS.filter(p => !p.on).length },
      { label: 'Oylik aylanma', val: money(rint('poz', 400, 1800) * 1000000) + " so'm" },
    ],
    blocks: () => `
      <div class="ic-grid">
        ${PAY_ORGS.map((p, i) => `
          <div class="ic-card">
            <div class="ic-tilehead">
              <span class="ic-tile ${p.on ? 'teal' : 'mut'}">${IC_PAY}</span>
              <span><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.type)}</small></span>
              <span style="margin-left:auto" class="ic-sw${p.on ? ' on' : ''}" data-toast="${escapeHtml(p.name)} — demo rejimida o'zgartirilmaydi"></span>
            </div>
            <div class="ic-strip"><span>Tranzaksiya (oy)</span><b>${money(p.on ? rint('pt' + i, 300, 24000) : 0)}</b></div>
            <div class="ic-strip"><span>Aylanma</span><b>${p.on ? money(rint('pv' + i, 20, 900) * 1000000) : '—'}</b></div>
            <div class="ic-card-foot">${st(p.on ? 'Ulangan' : 'Ulanmagan', p.on ? 'green' : 'mut')}</div>
          </div>
        `).join('')}
      </div>
      ${card({
        title: "Oxirgi 7 kunlik tranzaksiyalar",
        sub: 'Tashkilotlar kesimida',
        body: barList(PAY_ORGS.filter(p => p.on).map((p, i) => {
          const v = rint('pw' + i, 200, 5200)
          return { name: p.name, val: money(v), percent: v / 5200 * 100 }
        })),
      })}
    `,
  }, { toast })
}

const MOUNTS = Object.assign(
  Object.fromEntries(Object.keys(DEVICES).map(k => [k, makeDevice(k)])),
  Object.fromEntries(Object.keys(HISTORIES).map(k => [k, makeHistory(k)])),
  { 'tolov-tashkilotlari': mountPayOrgs },
)

export function mountXizmatlarContent(root, key, { toast }){
  const fn = MOUNTS[key] || MOUNTS['imei-new']
  const [mod, page] = groupCrumb(XIZMATLAR_GROUPS, key, 'Xizmatlar')
  return mountWithCrumb(root, mod, page, fn, { toast })
}
