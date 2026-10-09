// Moliya bo'limining asl tuzilishga o'tgandan keyin qo'shilgan sahifalari:
// Tariflar, Debet/Kredit, Qora ro'yxat tranzaksiyalari, Ommaviy to'lov,
// Kartalar va 8 ta integratsiya tarixi (KATM, ATMOS, MYUZCARD, EGOV,
// UNIACCESS, CRIF, CLICK, PAYME).
//
// Nomlar asl super admindagi menyudan aynan olingan. Ma'lumot — NAMUNA
// (demo), deterministik hash'dan quriladi (demo-kit.js).
import {
  mountDemoTable, st, idBadge, money, rint, pick, chance,
  personName, phoneNum, dateAgo, SHOPS, REGIONS, IC_DL, IC_PLUS,
} from './demo-kit.js'

// ------------------------------------------------------------------ Tariflar
const TARIFF_NAMES = ['Tariff 1', 'Tariff 2', 'Tariff 3', 'Start', 'Biznes', 'Korporativ']

export function mountTariflar(root, { toast }){
  const rows = Array.from({ length: 34 }, (_, i) => {
    const seed = 'tf' + i
    return {
      id: 'T-' + (900 + i),
      name: pick(seed + 'n', TARIFF_NAMES),
      branch: pick(seed + 'b', SHOPS) + ' ' + (i % 5 + 1),
      monthly: rint(seed + 'm', 0, 40) * 100000,
      percent: rint(seed + 'p', 0, 36) / 10,
      minSum: rint(seed + 'mn', 3, 20) * 100000,
      maxSum: rint(seed + 'mx', 30, 500) * 100000,
      months: pick(seed + 'mo', ['3, 6', '3, 6, 9', '6, 12', '3, 6, 12, 18', '12, 24']),
      status: chance(seed + 's', 84) ? 'Faol' : 'Nofaol',
    }
  })
  return mountDemoTable(root, {
    title: 'Tariflar',
    sub: 'Filiallarga biriktirilgan ICAN tarif rejalari',
    actions: [{ label: 'Excel', icon: IC_DL, ghost: true }, { label: 'Tarif qo\'shish', icon: IC_PLUS }],
    kpis: all => [
      { label: 'Tariflar', val: all.length },
      { label: 'Faol', val: all.filter(r => r.status === 'Faol').length },
      { label: "O'rtacha foiz", val: (all.reduce((a, r) => a + r.percent, 0) / all.length).toFixed(1) + '%' },
      { label: 'Oylik to\'lovli', val: all.filter(r => r.monthly > 0).length },
    ],
    filters: { field: 'name', values: ['Hammasi', ...TARIFF_NAMES] },
    search: ['name', 'branch', 'id'],
    cols: [
      { key: 'id', label: 'ID', render: r => idBadge(r.id) },
      { key: 'name', label: 'Tarif', cls: 'name' },
      { key: 'branch', label: 'Filial' },
      { key: 'monthly', label: 'Oylik', cls: 'num', render: r => r.monthly ? money(r.monthly) : '—' },
      { key: 'percent', label: 'Foiz', cls: 'num', render: r => r.percent + '%' },
      { key: 'minSum', label: 'Min summa', cls: 'num', render: r => money(r.minSum) },
      { key: 'maxSum', label: 'Max summa', cls: 'num', render: r => money(r.maxSum) },
      { key: 'months', label: 'Muddat (oy)' },
      { key: 'status', label: 'Holat', render: r => st(r.status, r.status === 'Faol' ? 'green' : 'mut') },
    ],
    rows,
    onRowToast: r => r.name + ' — tarif kartasi demo rejimida ochilmaydi',
  }, { toast })
}

// -------------------------------------------------------------- Debet/Kredit
export function mountDebetKredit(root, { toast }){
  const rows = Array.from({ length: 48 }, (_, i) => {
    const seed = 'dk' + i
    const debet = rint(seed + 'd', 0, 90000) * 1000
    const kredit = rint(seed + 'k', 0, 90000) * 1000
    return {
      id: 'DK-' + (5200 + i),
      branch: pick(seed + 'b', SHOPS) + ' ' + (i % 7 + 1),
      region: pick(seed + 'r', REGIONS),
      debet, kredit,
      saldo: debet - kredit,
      period: pick(seed + 'p', ['Iyun 2026', 'Iyul 2026', 'Avgust 2026']),
      status: debet - kredit >= 0 ? 'Debet qoldiq' : 'Kredit qoldiq',
    }
  })
  return mountDemoTable(root, {
    title: 'Debet / Kredit',
    sub: "Filiallar bo'yicha o'zaro hisob-kitob qoldig'i",
    actions: [{ label: 'Excel', icon: IC_DL, ghost: true }],
    kpis: all => [
      { label: 'Jami debet', val: money(all.reduce((a, r) => a + r.debet, 0) / 1e6) + ' mln' },
      { label: 'Jami kredit', val: money(all.reduce((a, r) => a + r.kredit, 0) / 1e6) + ' mln' },
      { label: 'Sof saldo', val: money(all.reduce((a, r) => a + r.saldo, 0) / 1e6) + ' mln' },
      { label: 'Kredit qoldiqli', val: all.filter(r => r.saldo < 0).length },
    ],
    filters: { field: 'period', values: ['Hammasi', 'Iyun 2026', 'Iyul 2026', 'Avgust 2026'] },
    search: ['branch', 'region', 'id'],
    perPage: 14,
    cols: [
      { key: 'id', label: 'ID', render: r => idBadge(r.id) },
      { key: 'branch', label: 'Filial', cls: 'name' },
      { key: 'region', label: 'Hudud' },
      { key: 'period', label: 'Davr' },
      { key: 'debet', label: 'Debet', cls: 'num', render: r => money(r.debet) },
      { key: 'kredit', label: 'Kredit', cls: 'num', render: r => money(r.kredit) },
      { key: 'saldo', label: 'Saldo', cls: 'num', render: r => `<b style="color:${r.saldo >= 0 ? 'var(--ic-green)' : 'var(--ic-red)'}">${money(r.saldo)}</b>` },
      { key: 'status', label: 'Holat', render: r => st(r.status, r.saldo >= 0 ? 'green' : 'red') },
    ],
    rows,
    onRowToast: r => r.branch + ' — hisob-kitob kartasi demo rejimida ochilmaydi',
  }, { toast })
}

// ------------------------------------------- Qora ro'yxat → Tranzaksiyalar
export function mountQoraTranz(root, { toast }){
  const SRC = ['Uniaccess', 'KATM', 'Ichki qaror', 'Sud qarori', 'Import']
  const rows = Array.from({ length: 66 }, (_, i) => {
    const seed = 'qt' + i
    const add = chance(seed + 'a', 68)
    return {
      id: 'QT-' + (66100 + i),
      when: dateAgo(seed + 'w', 90),
      fish: personName(seed),
      pinfl: '3' + rint(seed + 'p', 100000000000, 999999999999),
      action: add ? "Ro'yxatga qo'shildi" : "Ro'yxatdan chiqarildi",
      source: pick(seed + 's', SRC),
      operator: personName(seed + 'o'),
      debt: add ? rint(seed + 'd', 300, 40000) * 1000 : 0,
    }
  })
  return mountDemoTable(root, {
    title: 'Tranzaksiyalar',
    sub: "Qora ro'yxatga qo'shish va chiqarish harakatlari",
    actions: [{ label: 'Excel', icon: IC_DL, ghost: true }],
    kpis: all => [
      { label: 'Harakatlar', val: all.length },
      { label: "Qo'shilgan", val: all.filter(r => r.action.includes("qo'shildi")).length },
      { label: 'Chiqarilgan', val: all.filter(r => r.action.includes('chiqarildi')).length },
      { label: 'Jami qarz', val: money(all.reduce((a, r) => a + r.debt, 0) / 1e6) + ' mln' },
    ],
    filters: { field: 'source', values: ['Hammasi', ...SRC] },
    search: ['fish', 'pinfl', 'operator'],
    perPage: 14,
    cols: [
      { key: 'id', label: 'ID', render: r => idBadge(r.id) },
      { key: 'when', label: 'Vaqt' },
      { key: 'fish', label: 'FISH', cls: 'name' },
      { key: 'pinfl', label: 'JSHSHIR' },
      { key: 'action', label: 'Amal', render: r => st(r.action, r.action.includes("qo'shildi") ? 'red' : 'green') },
      { key: 'source', label: 'Manba' },
      { key: 'debt', label: 'Qarz', cls: 'num', render: r => r.debt ? money(r.debt) : '—' },
      { key: 'operator', label: 'Operator' },
    ],
    rows,
    onRowToast: r => r.fish + ' — tafsilot demo rejimida ochilmaydi',
  }, { toast })
}

// ----------------------------------------------------------- Ommaviy to'lov
export function mountOmmaviyTolov(root, { toast }){
  const rows = Array.from({ length: 40 }, (_, i) => {
    const seed = 'mp' + i
    const total = rint(seed + 't', 20, 900)
    const done = Math.round(total * rint(seed + 'd', 40, 100) / 100)
    return {
      id: 'MP-' + (7700 + i),
      when: dateAgo(seed + 'w', 60),
      name: 'Ommaviy to\'lov #' + (7700 + i),
      total, done, failed: total - done,
      sum: rint(seed + 's', 500, 90000) * 1000,
      operator: personName(seed + 'o'),
      status: done === total ? 'Yakunlandi' : done > 0 ? 'Jarayonda' : 'Kutilmoqda',
    }
  })
  return mountDemoTable(root, {
    title: "Ommaviy to'lov",
    sub: "KATM bo'yicha guruh holidagi to'lov topshiriqlari",
    actions: [{ label: 'Excel', icon: IC_DL, ghost: true }, { label: 'Yangi topshiriq', icon: IC_PLUS }],
    kpis: all => [
      { label: 'Topshiriqlar', val: all.length },
      { label: 'Yakunlangan', val: all.filter(r => r.status === 'Yakunlandi').length },
      { label: 'Jarayonda', val: all.filter(r => r.status === 'Jarayonda').length },
      { label: 'Jami summa', val: money(all.reduce((a, r) => a + r.sum, 0) / 1e6) + ' mln' },
    ],
    filters: { field: 'status', values: ['Hammasi', 'Yakunlandi', 'Jarayonda', 'Kutilmoqda'] },
    search: ['name', 'operator', 'id'],
    cols: [
      { key: 'id', label: 'ID', render: r => idBadge(r.id) },
      { key: 'when', label: 'Sana' },
      { key: 'name', label: 'Topshiriq', cls: 'name' },
      { key: 'total', label: 'Jami', cls: 'num' },
      { key: 'done', label: 'Bajarildi', cls: 'num', render: r => `<span style="color:var(--ic-green);font-weight:700">${r.done}</span>` },
      { key: 'failed', label: 'Xatolik', cls: 'num', render: r => r.failed ? `<span style="color:var(--ic-red);font-weight:700">${r.failed}</span>` : '—' },
      { key: 'sum', label: 'Summa', cls: 'num', render: r => money(r.sum) },
      { key: 'operator', label: 'Operator' },
      { key: 'status', label: 'Holat', render: r => st(r.status, r.status === 'Yakunlandi' ? 'green' : r.status === 'Jarayonda' ? 'amber' : 'mut') },
    ],
    rows,
    onRowToast: r => r.name + ' — topshiriq tafsiloti demo rejimida ochilmaydi',
  }, { toast })
}

// ------------------------------------------------------------------ Kartalar
export function mountKartalar(root, { toast }){
  const TYPES = ['UzCard', 'Humo', 'Visa', 'MasterCard']
  const rows = Array.from({ length: 72 }, (_, i) => {
    const seed = 'cd' + i
    const type = pick(seed + 't', TYPES)
    return {
      id: 'C-' + (81000 + i),
      fish: personName(seed),
      phone: phoneNum(seed),
      type,
      mask: (type === 'UzCard' ? '8600' : type === 'Humo' ? '9860' : type === 'Visa' ? '4278' : '5614') +
            ' **** **** ' + rint(seed + 'm', 1000, 9999),
      expire: String(rint(seed + 'em', 1, 12)).padStart(2, '0') + '/' + rint(seed + 'ey', 26, 31),
      bound: dateAgo(seed + 'b', 400),
      main: chance(seed + 'mn', 40),
      status: chance(seed + 's', 82) ? 'Faol' : chance(seed + 's2', 55) ? 'Muddati tugagan' : 'Bloklangan',
    }
  })
  return mountDemoTable(root, {
    title: 'Kartalar',
    sub: "Mijozlarning avtomatik to'lov uchun biriktirilgan kartalari",
    actions: [{ label: 'Excel', icon: IC_DL, ghost: true }],
    kpis: all => [
      { label: 'Kartalar', val: all.length },
      { label: 'Faol', val: all.filter(r => r.status === 'Faol').length },
      { label: 'Asosiy karta', val: all.filter(r => r.main).length },
      { label: 'Bloklangan', val: all.filter(r => r.status === 'Bloklangan').length },
      { label: 'Muddati tugagan', val: all.filter(r => r.status === 'Muddati tugagan').length },
    ],
    filters: { field: 'type', values: ['Hammasi', ...TYPES] },
    search: ['fish', 'phone', 'mask'],
    perPage: 14,
    cols: [
      { key: 'id', label: 'ID', render: r => idBadge(r.id) },
      { key: 'fish', label: 'FISH', cls: 'name' },
      { key: 'phone', label: 'Telefon' },
      { key: 'type', label: 'Turi', render: r => st(r.type, 'teal') },
      { key: 'mask', label: 'Karta' },
      { key: 'expire', label: 'Amal qiladi' },
      { key: 'main', label: 'Asosiy', render: r => r.main ? st('Ha', 'green') : '—' },
      { key: 'bound', label: 'Biriktirilgan' },
      { key: 'status', label: 'Holat', render: r => st(r.status, r.status === 'Faol' ? 'green' : r.status === 'Bloklangan' ? 'red' : 'amber') },
    ],
    rows,
    onRowToast: r => r.fish + ' — karta kartasi demo rejimida ochilmaydi',
  }, { toast })
}

// --------------------------------------------- Integratsiya tarixi (8 ta)
// Har bir provayder uchun bir xil naqshdagi so'rovlar jurnali — asl
// admindagi /finance/history/{provider} sahifalari.
const PROVIDERS = {
  'tarix-katm':      { name: 'KATM',      ops: ['Skoring bali', 'Shartnomalar', 'Identifikatsiya', 'Pasport', 'INPS ish haqi'] },
  'tarix-atmos':     { name: 'ATMOS',     ops: ['Karta biriktirish', 'To\'lov', 'Baholash', 'Qaytarish'] },
  'tarix-myuzcard':  { name: 'MYUZCARD',  ops: ['Karta biriktirish', 'PINFL bo\'yicha yechish', 'Baholash', 'To\'lov'] },
  'tarix-egov':      { name: 'EGOV',      ops: ['Qarzdorlik', 'Mulk', 'Daromadlar', 'Jismoniy shaxs'] },
  'tarix-uniaccess': { name: 'UNIACCESS', ops: ['Qora ro\'yxat', 'Shartnomalar', 'Karta yangilash', 'Baholash'] },
  'tarix-crif':      { name: 'CRIF',      ops: ['Skoring', 'Hisobot', 'Tekshiruv'] },
  'tarix-click':     { name: 'CLICK',     ops: ['To\'lov', 'Qaytarish', 'Holat tekshirish'] },
  'tarix-payme':     { name: 'PAYME',     ops: ['To\'lov', 'Qaytarish', 'Holat tekshirish', 'Chek'] },
}

function makeHistory(key){
  const p = PROVIDERS[key]
  return function mount(root, { toast }){
    const rows = Array.from({ length: 84 }, (_, i) => {
      const seed = key + i
      const ok = chance(seed + 'o', 90)
      return {
        id: 'H-' + (220000 + i),
        when: dateAgo(seed + 'w', 20),
        op: pick(seed + 'op', p.ops),
        branch: pick(seed + 'b', SHOPS),
        client: personName(seed + 'c'),
        ms: rint(seed + 'ms', 60, 2600),
        cost: chance(seed + 'c2', 70) ? rint(seed + 'cv', 1, 8) * 500 : 0,
        result: ok ? 'Muvaffaqiyatli' : chance(seed + 'o2', 55) ? 'Xatolik' : 'Vaqt tugadi',
      }
    })
    return mountDemoTable(root, {
      title: p.name + ' tarixi',
      sub: p.name + ' integratsiyasiga yuborilgan so\'rovlar jurnali',
      note: "Namuna (demo) jurnal — " + p.name + " integratsiyasi hali ulanmagan.",
      actions: [{ label: 'Excel', icon: IC_DL, ghost: true }],
      kpis: all => [
        { label: "So'rovlar", val: money(all.length) },
        { label: 'Muvaffaqiyatli', val: all.filter(r => r.result === 'Muvaffaqiyatli').length },
        { label: 'Xatolik', val: all.filter(r => r.result !== 'Muvaffaqiyatli').length },
        { label: "O'rtacha javob", val: Math.round(all.reduce((a, r) => a + r.ms, 0) / all.length) + ' ms' },
        { label: 'Jami sarf', val: money(all.reduce((a, r) => a + r.cost, 0)) + " so'm" },
      ],
      filters: { field: 'op', values: ['Hammasi', ...p.ops] },
      search: ['client', 'branch', 'op', 'id'],
      perPage: 14,
      cols: [
        { key: 'id', label: 'ID', render: r => idBadge(r.id) },
        { key: 'when', label: 'Vaqt' },
        { key: 'op', label: 'Amal', cls: 'name' },
        { key: 'branch', label: 'Filial' },
        { key: 'client', label: 'Mijoz' },
        { key: 'ms', label: 'Javob', cls: 'num', render: r => r.ms + ' ms' },
        { key: 'cost', label: 'Narx', cls: 'num', render: r => r.cost ? money(r.cost) : '—' },
        { key: 'result', label: 'Natija', render: r => st(r.result, r.result === 'Muvaffaqiyatli' ? 'green' : r.result === 'Xatolik' ? 'red' : 'amber') },
      ],
      rows,
      onRowToast: r => p.name + ' · ' + r.op + " — so'rov tafsiloti demo rejimida ochilmaydi",
    }, { toast })
  }
}

export const MOLIYA_DEMO2_MOUNTS = Object.assign({
  'tariflar': mountTariflar,
  'debet-kredit': mountDebetKredit,
  'qora-tranz': mountQoraTranz,
  'ommaviy-tolov': mountOmmaviyTolov,
  'kartalar': mountKartalar,
}, Object.fromEntries(Object.keys(PROVIDERS).map(k => [k, makeHistory(k)])))
