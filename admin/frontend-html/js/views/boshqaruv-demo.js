// "Boshqaruv" bo'limining sahifalari (Filiallar bandidan tashqari — u
// clients.js orqali ishlaydi). Jami 16 ta sahifa: filial tranzaksiyalari,
// kirish jurnali, SMS shablonlar, balans limiti, xarajatlar, tarif, hamkor,
// hudud/tuman/MFY, foydalanuvchilar, hujjat, roli, profil, bildirishnomalar,
// tizim sozlamalari va tizim versiyasi.
//
// DIQQAT: hammasi NAMUNA (demo) — backend endpointlari yo'q. Ma'lumot
// deterministik hash'dan quriladi (demo-kit.js), shuning uchun qayta
// ochilganda o'zgarmaydi. Tugmalar toast ko'rsatadi, hech narsa saqlanmaydi.
import { escapeHtml } from '../core.js'
import {
  mountDemoTable, mountDemoBlocks, card, barList, st, idBadge, money, rint, pick,
  chance, personName, phoneNum, dateAgo, SHOPS, REGIONS, IC_DL, IC_PLUS,
} from './demo-kit.js'
// Hudud/Tuman sahifalari uchun HAQIQIY ma'lumot — 14 viloyat, 201 tuman.
// Bu ro'yxat ilovada allaqachon bor (mijoz/filial formalarida ishlatiladi),
// shuning uchun bu ikki sahifa endi o'ylab topilgan nomlar emas, haqiqiy
// ma'muriy bo'linishni ko'rsatadi.
import { UZ_REGIONS, REGION_NAMES } from '../uzregions.js'
// Foydalanuvchilar sahifasi HAQIQIY xodimlar ro'yxatini oladi (HR > Xodimlar
// bilan bir manba) — o'ylab topilgan ro'yxat emas.
import { api } from '../api.js'

const ic = d => `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"></path></svg>`
const IC_TX = ic('M7 7h14l-4-4M17 17H3l4 4')
const IC_LOGIN = ic('M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3')
const IC_SMS = ic('M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.6 8.6 0 0 1-3.9-.9L3 21l1.9-5.2a8.6 8.6 0 0 1-.9-3.9A8.4 8.4 0 0 1 12.5 3a8.4 8.4 0 0 1 8.5 8.5z')
const IC_WALLET = ic('M19 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2M21 9v6a1 1 0 0 1-1 1h-5a3 3 0 0 1 0-6h5a1 1 0 0 1 1 1z')
const IC_MONEY = ic('M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6')
const IC_STAR = ic('m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z')
const IC_PIN = ic('M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z')
const IC_USER = ic('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0')
const IC_DOC = ic('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6')
const IC_SHIELD = ic('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')
const IC_BELL = ic('M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0')
const IC_GEAR = ic('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15l1.1 1.9-2.6 2.6-1.9-1.1-2 .8-.6 2.1h-3.7l-.6-2.1-2-.8-1.9 1.1-2.6-2.6L3.7 15l-.8-2-2.1-.6V8.7l2.1-.6.8-2-1.1-1.9 2.6-2.6L7.1 2.7l2-.8.6-2.1')
const IC_TAG = ic('M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01')
const IC_CHECK = ic('M20 6 9 17l-5-5')
const IC_BAN = ic('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8')

// ================================================ Filial tranzaksiyalari
const TX_TYPES = ["To'ldirish", 'Yechish', 'Shartnoma to\'lovi', 'Komissiya', 'Qaytarish']

// "Filial tranzaksiyalari" — HAQIQIY: /api/transactions dan olinadi
// (Tashkilot kartasidagi "Tranzaksiyalar" yorlig'i bilan bitta manba).
// Ro'yxat, filtr, qidiruv va sahifalash mountDemoTable'da, ya'ni butun
// dasturdagi boshqa jadvallar bilan bir xil ko'rinishda.
export function mountFilialTx(root, { toast }){
  let cleanup = null
  root.innerHTML = '<div class="ic-page"><div style="padding:40px;text-align:center;color:var(--ic-mut)">Yuklanmoqda…</div></div>'

  function whenLbl(ms){
    const d = new Date(ms)
    if(isNaN(d)) return '—'
    const p = n => String(n).padStart(2, '0')
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + ' · ' + p(d.getHours()) + ':' + p(d.getMinutes())
  }

  ;(async () => {
    let data
    try{ data = await api.txAll('?limit=200') }
    catch(ex){
      root.innerHTML = '<div class="ic-page"><div class="err-box">' + escapeHtml(ex.error || 'Xatolik') + '</div></div>'
      return
    }
    const rows = (data.rows || []).map(t => ({
      id: t.id.slice(0, 8).toUpperCase(),
      when: whenLbl(t.createdAt),
      branch: t.clientName || '—',
      type: t.type,
      amount: t.sum,
      dir: t.type === 'CHIQIM' ? 'Chiqim' : 'Kirim',
      pay: t.pay,
      bal: t.bal,
      reason: t.reason || '—',
      operator: t.createdBy || '—',
      status: t.status,
    }))
    cleanup = mountDemoTable(root, {
      title: 'Filial tranzaksiyalari',
      sub: "Filial hisobvarag'i bo'yicha kirim-chiqim harakati — haqiqiy yozuvlar",
      note: data.total > rows.length
        ? 'Oxirgi ' + rows.length + " ta yozuv ko'rsatilmoqda (jami " + data.total + ' ta).'
        : "Yozuvlar Tashkilot kartasining \"Tranzaksiyalar\" yorlig'ida qo'shiladi.",
      kpis: all => [
        { ic: IC_TX, label: 'Tranzaksiya', val: money(data.total) },
        { ic: IC_MONEY, label: 'Kirim', val: money(all.filter(r => r.dir === 'Kirim').reduce((s, r) => s + r.amount, 0)) },
        { ic: IC_MONEY, label: 'Chiqim', val: money(all.filter(r => r.dir === 'Chiqim').reduce((s, r) => s + r.amount, 0)) },
        { ic: IC_CHECK, label: 'Bajarilgan', val: all.filter(r => r.status === 'Muvaffaqiyatli tugadi').length },
        { ic: IC_BAN, label: 'Kutilmoqda', val: all.filter(r => r.status === 'Kutilmoqda').length },
      ],
      filters: { field: 'type', values: ['Hammasi', 'DAROMAD', 'CHIQIM'] },
      search: ['branch', 'operator', 'reason'],
      perPage: 14,
      cols: [
        { key: 'id', label: 'ID', render: r => idBadge(r.id) },
        { key: 'when', label: 'Vaqt' },
        { key: 'branch', label: 'Filial', cls: 'name' },
        { key: 'type', label: 'Turi', render: r => st(r.type, r.type === 'CHIQIM' ? 'red' : 'green') },
        { key: 'amount', label: 'Summa', cls: 'num', render: r => '<b style="color:' + (r.dir === 'Kirim' ? 'var(--ic-green)' : 'var(--ic-red)') + '">' + (r.dir === 'Kirim' ? '+' : '−') + money(r.amount) + '</b>' },
        { key: 'pay', label: "To'lov turi" },
        { key: 'bal', label: 'Balans turi', render: r => st(r.bal, r.bal === 'XIZMATLAR' ? 'teal' : 'mut') },
        { key: 'reason', label: 'Sabab' },
        { key: 'operator', label: 'Kim' },
        { key: 'status', label: 'Holat', render: r => st(r.status, r.status === 'Bekor qilingan' ? 'red' : r.status === 'Kutilmoqda' ? 'amber' : 'green') },
      ],
      rows,
      onRowToast: r => r.branch + ' · ' + r.reason,
    }, { toast })
  })()

  return function(){ if(cleanup){ try{ cleanup() }catch(e){} } }
}

// ============================================================ ICAN kirish
const DEVICES = ['Windows · Chrome', 'macOS · Safari', 'Android · Chrome', 'iOS · Safari', 'Windows · Edge']

export function mountIcanKirish(root, { toast }){
  const rows = Array.from({ length: 70 }, (_, i) => {
    const seed = 'lg' + i
    const ok = chance(seed + 'r', 84)
    return {
      id: 'S-' + (44100 + i),
      user: personName(seed),
      login: 'user' + rint(seed + 'u', 100, 999),
      when: dateAgo(seed + 'w', 21),
      device: pick(seed + 'd', DEVICES),
      ip: rint(seed + 'i1', 10, 213) + '.' + rint(seed + 'i2', 0, 255) + '.' + rint(seed + 'i3', 0, 255) + '.' + rint(seed + 'i4', 1, 254),
      region: pick(seed + 'rg', REGIONS),
      result: ok ? 'Muvaffaqiyatli' : chance(seed + 'r2', 60) ? "Noto'g'ri parol" : 'Bloklangan',
    }
  })
  return mountDemoTable(root, {
    title: 'ICAN kirish',
    sub: 'Tizimga kirish urinishlari jurnali',
    note: "Namuna (demo) jurnal — haqiqiy sessiya loglari backendga ulangach shu joyda ko'rinadi.",
    actions: [{ label: 'Excel', icon: IC_DL, ghost: true }],
    kpis: all => [
      { ic: IC_LOGIN, label: 'Urinishlar', val: all.length },
      { ic: IC_CHECK, label: 'Muvaffaqiyatli', val: all.filter(r => r.result === 'Muvaffaqiyatli').length },
      { ic: IC_BAN, label: 'Rad etilgan', val: all.filter(r => r.result !== 'Muvaffaqiyatli').length },
      { ic: IC_USER, label: 'Turli foydalanuvchi', val: new Set(all.map(r => r.login)).size },
    ],
    filters: { field: 'result', values: ['Hammasi', 'Muvaffaqiyatli', "Noto'g'ri parol", 'Bloklangan'] },
    search: ['user', 'login', 'ip', 'device'],
    perPage: 14,
    cols: [
      { key: 'id', label: 'Sessiya', render: r => idBadge(r.id) },
      { key: 'user', label: 'Foydalanuvchi', cls: 'name' },
      { key: 'login', label: 'Login' },
      { key: 'when', label: 'Vaqt' },
      { key: 'device', label: 'Qurilma' },
      { key: 'ip', label: 'IP' },
      { key: 'region', label: 'Hudud' },
      { key: 'result', label: 'Natija', render: r => st(r.result, r.result === 'Muvaffaqiyatli' ? 'green' : r.result === 'Bloklangan' ? 'red' : 'amber') },
    ],
    rows,
    onRowToast: r => r.user + ' — sessiya tafsiloti demo rejimida ochilmaydi',
  }, { toast })
}

// =========================================================== SMS shablon
const SMS_TEMPLATES = [
  { key: 'welcome', name: 'Xush kelibsiz', ev: "Mijoz ro'yxatdan o'tganda", text: 'Hurmatli {FISH}, iCAN tizimiga xush kelibsiz! Limitingiz: {LIMIT} so\'m.' },
  { key: 'contract', name: 'Shartnoma ochildi', ev: 'Yangi shartnoma rasmiylashtirilganda', text: '{FISH}, {SHOP} do\'konida {SUMMA} so\'mlik shartnoma ochildi. Muddat: {OY} oy.' },
  { key: 'remind3', name: 'Eslatma (3 kun)', ev: "To'lovga 3 kun qolganda", text: '{FISH}, {SANA} kuni {SUMMA} so\'m to\'lov muddati keladi. Iltimos, o\'z vaqtida to\'lang.' },
  { key: 'overdue', name: 'Kechikish', ev: "To'lov muddati o'tganda", text: '{FISH}, {KUN} kunlik kechikish qayd etildi. Qarz: {SUMMA} so\'m.' },
  { key: 'paid', name: "To'lov qabul qilindi", ev: "To'lov tushganda", text: '{FISH}, {SUMMA} so\'m to\'lovingiz qabul qilindi. Qoldiq: {QOLDIQ} so\'m.' },
  { key: 'closed', name: 'Shartnoma yopildi', ev: "Shartnoma to'liq to'langanda", text: 'Tabriklaymiz {FISH}! {ID} shartnomangiz to\'liq yopildi.' },
  { key: 'otp', name: 'Tasdiqlash kodi', ev: 'Kirish yoki imzolashda', text: 'iCAN tasdiqlash kodi: {KOD}. Hech kimga aytmang.' },
]

export function mountSmsShablon(root, { toast }){
  return mountDemoBlocks(root, {
    title: 'SMS shablon',
    sub: SMS_TEMPLATES.length + " ta shablon · avtomatik yuboriladigan xabarlar",
    note: "Namuna (demo) shablonlar — SMS provayderi ulanmagan, tahrirlash saqlanmaydi.",
    actions: [{ label: 'Yangi shablon', icon: IC_PLUS }],
    kpis: [
      { ic: IC_SMS, label: 'Shablonlar', val: SMS_TEMPLATES.length },
      { ic: IC_SMS, label: 'Bugun yuborilgan', val: money(rint('smsd', 900, 4200)) },
      { ic: IC_CHECK, label: 'Yetkazilgan', val: '97.4%' },
      { ic: IC_MONEY, label: 'Oylik xarajat', val: money(rint('smsc', 3, 9) * 1000000) + " so'm" },
    ],
    blocks: () => `
      <div class="ic-grid">
        ${SMS_TEMPLATES.map(t => `
          <div class="ic-card">
            <div class="ic-tilehead">
              <span class="ic-tile teal">${IC_SMS}</span>
              <span><b>${escapeHtml(t.name)}</b><small>${escapeHtml(t.ev)}</small></span>
            </div>
            <p style="background:var(--bg);border-radius:12px;padding:11px 13px">${escapeHtml(t.text)}</p>
            <div class="ic-card-foot">
              ${st('Faol', 'green')}
              <span style="margin-left:auto"><button type="button" class="ic-btn ghost" data-toast="${escapeHtml(t.name)} — tahrirlash demo rejimida ishlamaydi">Tahrirlash</button></span>
            </div>
          </div>
        `).join('')}
      </div>
      ${card({
        title: "Oxirgi 7 kunlik yuborish",
        sub: 'Kunlik SMS soni',
        body: barList(['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'].map((d, i) => {
          const v = rint('smsw' + i, 700, 4300)
          return { name: d, val: money(v), percent: v / 4300 * 100 }
        })),
      })}
    `,
  }, { toast })
}

// ========================================================= Balans limiti
export function mountBalansLimiti(root, { toast }){
  const rows = Array.from({ length: 44 }, (_, i) => {
    const seed = 'lim' + i
    const limit = rint(seed + 'l', 20, 900) * 1000000
    const used = Math.round(limit * rint(seed + 'u', 5, 99) / 100)
    return {
      id: 'L-' + (3300 + i),
      branch: pick(seed + 'b', SHOPS) + ' ' + (i % 5 + 1),
      region: pick(seed + 'r', REGIONS),
      limit,
      used,
      free: limit - used,
      usedPct: Math.round(used / limit * 100),
      status: used / limit > 0.92 ? 'Limit tugagan' : used / limit > 0.75 ? 'Diqqat' : 'Normal',
      updated: dateAgo(seed + 'up', 30),
    }
  })
  return mountDemoTable(root, {
    title: 'Balans limiti',
    sub: 'Har bir filial uchun belgilangan aylanma limiti va uning band qismi',
    actions: [{ label: 'Excel', icon: IC_DL, ghost: true }, { label: "Limit belgilash", icon: IC_PLUS }],
    kpis: all => [
      { ic: IC_WALLET, label: 'Jami limit', val: money(all.reduce((a, r) => a + r.limit, 0) / 1e6) + ' mln' },
      { ic: IC_WALLET, label: 'Band', val: money(all.reduce((a, r) => a + r.used, 0) / 1e6) + ' mln' },
      { ic: IC_WALLET, label: 'Bo\'sh', val: money(all.reduce((a, r) => a + r.free, 0) / 1e6) + ' mln' },
      { ic: IC_BAN, label: 'Limit tugagan', val: all.filter(r => r.status === 'Limit tugagan').length },
    ],
    filters: { field: 'status', values: ['Hammasi', 'Normal', 'Diqqat', 'Limit tugagan'] },
    search: ['branch', 'region', 'id'],
    cols: [
      { key: 'id', label: 'ID', render: r => idBadge(r.id) },
      { key: 'branch', label: 'Filial', cls: 'name' },
      { key: 'region', label: 'Hudud' },
      { key: 'limit', label: 'Limit', cls: 'num', render: r => money(r.limit / 1e6) + ' mln' },
      { key: 'used', label: 'Band', cls: 'num', render: r => money(r.used / 1e6) + ' mln' },
      { key: 'usedPct', label: 'Bandlik', render: r => `<span style="display:block">${r.usedPct}%</span><span class="ic-bar"><i style="width:${r.usedPct}%;background:${r.usedPct > 92 ? 'var(--ic-red)' : r.usedPct > 75 ? 'var(--ic-amber)' : 'var(--b)'}"></i></span>` },
      { key: 'status', label: 'Holat', render: r => st(r.status, r.status === 'Normal' ? 'green' : r.status === 'Diqqat' ? 'amber' : 'red') },
      { key: 'updated', label: 'Yangilangan' },
    ],
    rows,
    onRowToast: r => r.branch + ' — limitni o\'zgartirish demo rejimida ishlamaydi',
  }, { toast })
}

// ============================================================ Xarajatlar
const EXP_CATS = ['Ijara', 'Ish haqi', 'Reklama', 'Kommunal', 'Transport', 'Texnika', 'Soliq', 'Boshqa']

export function mountXarajatlar(root, { toast }){
  const rows = Array.from({ length: 64 }, (_, i) => {
    const seed = 'exp' + i
    return {
      id: 'X-' + (2200 + i),
      when: dateAgo(seed + 'w', 90),
      cat: pick(seed + 'c', EXP_CATS),
      branch: pick(seed + 'b', SHOPS),
      amount: rint(seed + 'a', 200, 38000) * 1000,
      payer: personName(seed + 'p'),
      note: pick(seed + 'n', ['Oylik to\'lov', 'Bir martalik', 'Shartnoma bo\'yicha', 'Favqulodda', 'Rejadagi']),
      status: chance(seed + 's', 80) ? "To'langan" : chance(seed + 's2', 60) ? 'Tasdiqlanmoqda' : 'Rad etildi',
    }
  })
  return mountDemoTable(root, {
    title: 'Xarajatlar',
    sub: 'Filiallar va markaziy ofis xarajatlari',
    actions: [{ label: 'Excel', icon: IC_DL, ghost: true }, { label: 'Xarajat qo\'shish', icon: IC_PLUS }],
    kpis: all => [
      { ic: IC_MONEY, label: 'Jami xarajat', val: money(all.reduce((a, r) => a + r.amount, 0) / 1e6) + ' mln' },
      { ic: IC_CHECK, label: "To'langan", val: all.filter(r => r.status === "To'langan").length },
      { ic: IC_DOC, label: 'Tasdiqlanmoqda', val: all.filter(r => r.status === 'Tasdiqlanmoqda').length },
      { ic: IC_TAG, label: 'Eng katta modda', val: EXP_CATS.map(c => [c, all.filter(r => r.cat === c).reduce((a, r) => a + r.amount, 0)]).sort((a, b) => b[1] - a[1])[0][0] },
    ],
    filters: { field: 'cat', values: ['Hammasi', ...EXP_CATS] },
    search: ['branch', 'payer', 'cat', 'id'],
    cols: [
      { key: 'id', label: 'ID', render: r => idBadge(r.id) },
      { key: 'when', label: 'Sana' },
      { key: 'cat', label: 'Modda', render: r => st(r.cat, 'teal') },
      { key: 'branch', label: 'Filial', cls: 'name' },
      { key: 'amount', label: 'Summa', cls: 'num', render: r => money(r.amount) },
      { key: 'payer', label: 'Mas\'ul' },
      { key: 'note', label: 'Izoh' },
      { key: 'status', label: 'Holat', render: r => st(r.status, r.status === "To'langan" ? 'green' : r.status === 'Tasdiqlanmoqda' ? 'amber' : 'red') },
    ],
    rows,
    after: all => card({
      title: 'Moddalar kesimida',
      sub: 'Jami summaning taqsimoti',
      body: barList(EXP_CATS.map(c => {
        const sum = all.filter(r => r.cat === c).reduce((a, r) => a + r.amount, 0)
        const max = Math.max(...EXP_CATS.map(x => all.filter(r => r.cat === x).reduce((a, r) => a + r.amount, 0)))
        return { name: c, val: money(sum / 1e6) + ' mln', percent: sum / max * 100 }
      })),
    }),
    onRowToast: r => r.cat + ' — xarajat kartasi demo rejimida ochilmaydi',
  }, { toast })
}

// ================================================================= Tarif
const TARIFFS = [
  { name: 'Start', price: 0, per: 'oyiga', best: false, limit: '50 mln so\'m', branches: '1 ta filial', users: '3 ta foydalanuvchi', feats: ['Shartnomalar', 'SMS eslatma', 'Asosiy hisobotlar'] },
  { name: 'Biznes', price: 1200000, per: 'oyiga', best: true, limit: '500 mln so\'m', branches: '10 tagacha filial', users: '25 ta foydalanuvchi', feats: ['Start tarifidagi hammasi', 'KATM integratsiyasi', 'CRM va vazifalar', 'Undiruv moduli'] },
  { name: 'Korporativ', price: 3800000, per: 'oyiga', best: false, limit: 'Cheklanmagan', branches: 'Cheklanmagan', users: 'Cheklanmagan', feats: ['Biznes tarifidagi hammasi', 'Alohida server', 'API kirish', '24/7 qo\'llab-quvvatlash'] },
]

export function mountTarif(root, { toast }){
  return mountDemoBlocks(root, {
    title: 'Tarif',
    sub: 'Amaldagi tarif rejasi va mavjud paketlar',
    note: "Namuna (demo) tariflar — to'lov tizimi ulanmagan, tarif almashtirilmaydi.",
    kpis: [
      { ic: IC_STAR, label: 'Joriy tarif', val: 'Biznes' },
      { ic: IC_MONEY, label: 'Oylik to\'lov', val: money(1200000) + " so'm" },
      { ic: IC_TAG, label: 'Keyingi to\'lov', val: dateAgo('trf', 0) },
      { ic: IC_USER, label: 'Band foydalanuvchi', val: '18 / 25' },
    ],
    blocks: () => `
      <div class="ic-grid">
        ${TARIFFS.map(t => `
          <div class="ic-card" style="${t.best ? 'box-shadow:0 0 0 2px var(--b),var(--shadow)' : ''}">
            <div class="ic-tilehead">
              <span class="ic-tile ${t.best ? 'teal' : 'mut'}">${IC_STAR}</span>
              <span><b>${escapeHtml(t.name)}</b><small>${t.price ? money(t.price) + " so'm / " + t.per : 'Bepul'}</small></span>
              ${t.best ? `<span style="margin-left:auto">${st('Joriy', 'teal')}</span>` : ''}
            </div>
            <div class="ic-strip"><span>Limit</span><b>${escapeHtml(t.limit)}</b></div>
            <div class="ic-strip"><span>Filial</span><b>${escapeHtml(t.branches)}</b></div>
            <div class="ic-strip"><span>Foydalanuvchi</span><b>${escapeHtml(t.users)}</b></div>
            <p>${t.feats.map(f => '✓ ' + escapeHtml(f)).join('<br>')}</p>
            <div class="ic-card-foot">
              <button type="button" class="ic-btn${t.best ? ' ghost' : ''}" style="width:100%;justify-content:center" data-toast="${escapeHtml(t.name)} tarifiga o'tish — demo rejimida ishlamaydi">${t.best ? 'Joriy tarif' : 'Tanlash'}</button>
            </div>
          </div>
        `).join('')}
      </div>
      ${card({
        title: "To'lovlar tarixi",
        body: `<table class="ic-tbl">
          <thead><tr><th>Sana</th><th>Tarif</th><th class="num">Summa</th><th>Usul</th><th>Holat</th></tr></thead>
          <tbody>${Array.from({ length: 6 }, (_, i) => `
            <tr><td>${dateAgo('tp' + i, 30 * (i + 1))}</td><td class="name">Biznes</td><td class="num">${money(1200000)}</td>
            <td>${pick('tm' + i, ['Payme', 'Click', 'Bank o\'tkazmasi'])}</td><td>${st("To'langan", 'green')}</td></tr>
          `).join('')}</tbody>
        </table>`,
      })}
    `,
  }, { toast })
}

// ================================================================ Hamkor
const PARTNER_TYPES = ['Bank', "Sug'urta", 'Do\'kon tarmog\'i', 'Logistika', 'Texnologiya']

export function mountHamkor(root, { toast }){
  const rows = Array.from({ length: 32 }, (_, i) => {
    const seed = 'pt' + i
    return {
      id: 'H-' + (620 + i),
      name: pick(seed + 'n', ['Asaka', 'Ipoteka', 'Kapital', 'Hamkor', 'Trust', 'Universal', 'Aloqa', 'Davr', 'Turon', 'Orient']) + ' ' + pick(seed + 'x', ['Bank', 'Invest', 'Group', 'Partners', 'Servis']),
      type: pick(seed + 't', PARTNER_TYPES),
      contact: personName(seed + 'c'),
      phone: phoneNum(seed),
      contracts: rint(seed + 'ct', 5, 780),
      volume: rint(seed + 'v', 30, 2400) * 1000000,
      since: dateAgo(seed + 's', 1200),
      status: chance(seed + 'st', 82) ? 'Faol' : "To'xtatilgan",
    }
  })
  return mountDemoTable(root, {
    title: 'Hamkor',
    sub: 'Hamkor tashkilotlar va ular bilan hamkorlik hajmi',
    actions: [{ label: 'Excel', icon: IC_DL, ghost: true }, { label: 'Hamkor qo\'shish', icon: IC_PLUS }],
    kpis: all => [
      { ic: IC_STAR, label: 'Hamkorlar', val: all.length },
      { ic: IC_CHECK, label: 'Faol', val: all.filter(r => r.status === 'Faol').length },
      { ic: IC_DOC, label: 'Shartnomalar', val: money(all.reduce((a, r) => a + r.contracts, 0)) },
      { ic: IC_MONEY, label: 'Hamkorlik hajmi', val: money(all.reduce((a, r) => a + r.volume, 0) / 1e6) + ' mln' },
    ],
    filters: { field: 'type', values: ['Hammasi', ...PARTNER_TYPES] },
    search: ['name', 'contact', 'type'],
    cols: [
      { key: 'id', label: 'ID', render: r => idBadge(r.id) },
      { key: 'name', label: 'Tashkilot', cls: 'name' },
      { key: 'type', label: 'Turi', render: r => st(r.type, 'teal') },
      { key: 'contact', label: 'Aloqa shaxsi' },
      { key: 'phone', label: 'Telefon' },
      { key: 'contracts', label: 'Shartnoma', cls: 'num' },
      { key: 'volume', label: 'Hajm', cls: 'num', render: r => money(r.volume / 1e6) + ' mln' },
      { key: 'since', label: 'Hamkorlik' },
      { key: 'status', label: 'Holat', render: r => st(r.status, r.status === 'Faol' ? 'green' : 'mut') },
    ],
    rows,
    onRowToast: r => r.name + ' — hamkor kartasi demo rejimida ochilmaydi',
  }, { toast })
}

// ================================================= Hudud / Tuman / MFY
const DISTRICTS = ['Yunusobod', 'Chilonzor', 'Mirzo Ulug\'bek', 'Shayxontohur', 'Yashnobod', 'Sergeli', 'Olmazor', 'Uchtepa', 'Bektemir', 'Mirobod', 'Yakkasaroy']

export function mountHudud(root, { toast }){
  // Nomlar va tumanlar soni — HAQIQIY (uzregions.js). Filial/mijoz sonlari
  // hali backendda hudud kesimida hisoblanmagani uchun namuna (demo).
  const rows = REGION_NAMES.map((name, i) => {
    const seed = 'rg' + i
    const districts = UZ_REGIONS[name].length
    return {
      id: String(1700 + i * 3),
      name,
      code: 'UZ-' + String(10 + i * 2),
      districts,
      mfy: districts * rint(seed + 'm', 8, 26),
      branches: rint(seed + 'b', 2, 38),
      clients: rint(seed + 'c', 400, 24000),
      status: 'Faol',
    }
  })
  return mountDemoTable(root, {
    title: 'Hudud',
    sub: rows.length + " ta viloyat · jami " + rows.reduce((a, r) => a + r.districts, 0) + " tuman",
    note: "Viloyat nomlari va tumanlar soni — haqiqiy. Filial va mijoz sonlari hali hudud kesimida hisoblanmagani uchun namuna (demo).",
    actions: [{ label: 'Excel', icon: IC_DL, ghost: true }],
    kpis: all => [
      { label: 'Viloyatlar', val: all.length },
      { label: 'Tumanlar', val: all.reduce((a, r) => a + r.districts, 0) },
      { label: 'MFY (demo)', val: money(all.reduce((a, r) => a + r.mfy, 0)) },
      { label: 'Mijozlar (demo)', val: money(all.reduce((a, r) => a + r.clients, 0)) },
    ],
    search: ['name', 'code'],
    perPage: 14,
    cols: [
      { key: 'id', label: 'Kod', render: r => idBadge(r.id) },
      { key: 'name', label: 'Hudud', cls: 'name' },
      { key: 'code', label: 'ISO' },
      { key: 'districts', label: 'Tuman', cls: 'num' },
      { key: 'mfy', label: 'MFY', cls: 'num' },
      { key: 'branches', label: 'Filial', cls: 'num' },
      { key: 'clients', label: 'Mijoz', cls: 'num', render: r => money(r.clients) },
      { key: 'status', label: 'Holat', render: r => st(r.status, 'green') },
    ],
    rows,
    onRowToast: r => r.name + ' — ' + r.districts + ' ta tuman',
  }, { toast })
}

export function mountTuman(root, { toast }){
  // Tuman nomlari va ular qaysi viloyatga tegishliligi — HAQIQIY.
  const rows = REGION_NAMES.flatMap((region, ri) =>
    UZ_REGIONS[region].map((name, di) => {
      const seed = 'tm' + ri + '_' + di
      return {
        id: String(2610 + (ri * 40 + di) * 2),
        name,
        region,
        mfy: rint(seed + 'm', 8, 64),
        branches: rint(seed + 'b', 0, 9),
        clients: rint(seed + 'c', 40, 4200),
        status: 'Faol',
      }
    })
  )
  return mountDemoTable(root, {
    title: 'Tuman',
    sub: rows.length + " ta tuman va shahar · " + REGION_NAMES.length + " viloyat bo'yicha",
    note: "Tuman nomlari va viloyatga tegishliligi — haqiqiy. Filial va mijoz sonlari namuna (demo).",
    actions: [{ label: 'Excel', icon: IC_DL, ghost: true }],
    kpis: all => [
      { label: 'Tumanlar', val: all.length },
      { label: 'Viloyatlar', val: REGION_NAMES.length },
      { label: 'MFY (demo)', val: money(all.reduce((a, r) => a + r.mfy, 0)) },
      { label: 'Filialsiz tuman', val: all.filter(r => r.branches === 0).length },
    ],
    filters: { field: 'region', values: ['Hammasi', ...REGION_NAMES] },
    search: ['name', 'region'],
    perPage: 14,
    cols: [
      { key: 'id', label: 'Kod', render: r => idBadge(r.id) },
      { key: 'name', label: 'Tuman', cls: 'name' },
      { key: 'region', label: 'Hudud' },
      { key: 'mfy', label: 'MFY', cls: 'num' },
      { key: 'branches', label: 'Filial', cls: 'num' },
      { key: 'clients', label: 'Mijoz', cls: 'num', render: r => money(r.clients) },
      { key: 'status', label: 'Holat', render: r => st(r.status, 'green') },
    ],
    rows,
    onRowToast: r => r.name + ' · ' + r.region,
  }, { toast })
}

export function mountMfy(root, { toast }){
  const rows = Array.from({ length: 96 }, (_, i) => {
    const seed = 'mfy' + i
    return {
      id: String(38100 + i * 4),
      name: pick(seed + 'n', ['Guliston', 'Bunyodkor', 'Do\'stlik', 'Navbahor', 'Yangiobod', 'Chinor', 'Bahor', 'Istiqlol', 'Mustaqillik', 'Obod', 'Zarafshon', 'Yoshlik']) + ' MFY',
      district: pick(seed + 'd', DISTRICTS) + ' tumani',
      region: pick(seed + 'r', REGIONS),
      chairman: personName(seed + 'c'),
      phone: phoneNum(seed),
      households: rint(seed + 'h', 180, 2600),
      clients: rint(seed + 'cl', 0, 320),
    }
  })
  return mountDemoTable(root, {
    title: 'MFY',
    sub: "Mahalla fuqarolar yig'inlari ma'lumotnomasi",
    actions: [{ label: 'Excel', icon: IC_DL, ghost: true }, { label: 'MFY qo\'shish', icon: IC_PLUS }],
    kpis: all => [
      { ic: IC_PIN, label: 'MFY', val: all.length },
      { ic: IC_USER, label: "Xonadonlar", val: money(all.reduce((a, r) => a + r.households, 0)) },
      { ic: IC_USER, label: 'Mijozlar', val: money(all.reduce((a, r) => a + r.clients, 0)) },
      { ic: IC_BAN, label: 'Mijozsiz MFY', val: all.filter(r => r.clients === 0).length },
    ],
    filters: { field: 'region', values: ['Hammasi', ...REGIONS] },
    search: ['name', 'district', 'chairman'],
    perPage: 14,
    cols: [
      { key: 'id', label: 'Kod', render: r => idBadge(r.id) },
      { key: 'name', label: 'MFY', cls: 'name' },
      { key: 'district', label: 'Tuman' },
      { key: 'region', label: 'Hudud' },
      { key: 'chairman', label: 'Raisi' },
      { key: 'phone', label: 'Telefon' },
      { key: 'households', label: 'Xonadon', cls: 'num', render: r => money(r.households) },
      { key: 'clients', label: 'Mijoz', cls: 'num' },
    ],
    rows,
    onRowToast: r => r.name + ' — MFY kartasi demo rejimida ochilmaydi',
  }, { toast })
}

// ====================================================== Foydalanuvchilar
const ROLES = ['Administrator', 'Moliyachi', 'Sotuv menejeri', 'Undiruvchi', 'Operator', 'Kuzatuvchi']

export function mountFoydalanuvchilar(root, { toast }){
  // Ma'lumot asinxron kelgani uchun avval "Yuklanmoqda…", keyin jadval.
  root.innerHTML = '<div class="ic-page"><div style="padding:40px;text-align:center;color:var(--ic-mut)">Yuklanmoqda…</div></div>'

  const fio = s => [s.lastName, s.firstName].filter(Boolean).join(' ') || s.login || '—'
  const roleLabel = s => s.role === 'admin' ? 'Administrator' : 'Xodim'

  api.staffList().then(raw => {
    const rows = (raw || []).map((s, i) => ({
      id: String(s.id || i + 1).slice(0, 8),   // yozuvning haqiqiy identifikatori
      fish: fio(s),
      login: s.login || '—',
      role: roleLabel(s),
      position: s.position || '',
      dept: s.department || '',
      phone: s.phone || '',
      status: s.active ? 'Faol' : 'Bloklangan',
    }))
    const depts = [...new Set(rows.map(r => r.dept).filter(Boolean))]

    mountDemoTable(root, {
      title: 'Foydalanuvchilar',
      sub: rows.length + " ta foydalanuvchi · HR bo'limidagi xodimlar bilan bir manba",
      note: "Bu sahifa HAQIQIY xodimlar ro'yxatini ko'rsatadi. Qo'shish/tahrirlash HR > Xodimlar bo'limida bajariladi.",
      actions: [{ label: 'Excel', icon: IC_DL, ghost: true }],
      kpis: all => [
        { label: 'Jami', val: all.length },
        { label: 'Faol', val: all.filter(r => r.status === 'Faol').length },
        { label: 'Bloklangan', val: all.filter(r => r.status !== 'Faol').length },
        { label: 'Administrator', val: all.filter(r => r.role === 'Administrator').length },
        depts.length ? { label: "Bo'limlar", val: depts.length }
                     : { label: 'Lavozimlar', val: new Set(all.map(r => r.position).filter(Boolean)).size },
      ],
      // Bo'lim maydoni to'ldirilgan bo'lsa o'sha bo'yicha, aks holda rol bo'yicha filtr
      filters: depts.length
        ? { field: 'dept', values: ['Hammasi', ...depts] }
        : { field: 'role', values: ['Hammasi', 'Administrator', 'Xodim'] },
      search: ['fish', 'login', 'position', 'dept', 'phone'],
      cols: [
        { key: 'id', label: 'ID', render: r => idBadge(r.id) },
        { key: 'fish', label: 'FISH', cls: 'name' },
        { key: 'login', label: 'Login' },
        { key: 'role', label: 'Roli', render: r => st(r.role, r.role === 'Administrator' ? 'teal' : 'mut') },
        { key: 'position', label: 'Lavozim', render: r => r.position || '—' },
        { key: 'dept', label: "Bo'lim", render: r => r.dept || '—' },
        { key: 'phone', label: 'Telefon', render: r => r.phone || '—' },
        { key: 'status', label: 'Holat', render: r => st(r.status, r.status === 'Faol' ? 'green' : 'red') },
      ],
      rows,
      onRowToast: r => r.fish + ' — tahrirlash HR > Xodimlar bo\'limida',
    }, { toast })
  }).catch(ex => {
    root.innerHTML = '<div class="ic-page"><div class="err-box">' +
      escapeHtml(ex && ex.error ? ex.error : 'Xodimlar ro\'yxatini yuklab bo\'lmadi') + '</div></div>'
  })

  return function cleanup(){}
}

// =============================================================== Hujjat
const DOC_TYPES = ['Pasport', 'ID karta', 'Shartnoma', 'Ariza', 'Kafolat xati', 'Dalolatnoma']

export function mountHujjat(root, { toast }){
  const rows = Array.from({ length: 62 }, (_, i) => {
    const seed = 'dc' + i
    return {
      id: 'D-' + (77100 + i),
      name: pick(seed + 't', DOC_TYPES) + ' — ' + personName(seed),
      type: pick(seed + 't', DOC_TYPES),
      owner: personName(seed),
      size: rint(seed + 'sz', 40, 8600),
      fmt: pick(seed + 'f', ['PDF', 'JPG', 'PNG', 'DOCX']),
      uploaded: dateAgo(seed + 'u', 120),
      status: chance(seed + 's', 74) ? 'Tasdiqlangan' : chance(seed + 's2', 60) ? 'Tekshirilmoqda' : 'Rad etilgan',
    }
  })
  return mountDemoTable(root, {
    title: 'Hujjat',
    sub: 'Yuklangan hujjatlar arxivi va tasdiqlash holati',
    actions: [{ label: 'Hujjat yuklash', icon: IC_PLUS }],
    kpis: all => [
      { ic: IC_DOC, label: 'Hujjatlar', val: all.length },
      { ic: IC_CHECK, label: 'Tasdiqlangan', val: all.filter(r => r.status === 'Tasdiqlangan').length },
      { ic: IC_DOC, label: 'Tekshirilmoqda', val: all.filter(r => r.status === 'Tekshirilmoqda').length },
      { ic: IC_BAN, label: 'Rad etilgan', val: all.filter(r => r.status === 'Rad etilgan').length },
      { ic: IC_DL, label: 'Jami hajm', val: (all.reduce((a, r) => a + r.size, 0) / 1024).toFixed(1) + ' MB' },
    ],
    filters: { field: 'type', values: ['Hammasi', ...DOC_TYPES] },
    search: ['name', 'owner', 'fmt'],
    cols: [
      { key: 'id', label: 'ID', render: r => idBadge(r.id) },
      { key: 'name', label: 'Hujjat', cls: 'name' },
      { key: 'owner', label: 'Egasi' },
      { key: 'fmt', label: 'Format' },
      { key: 'size', label: 'Hajm', cls: 'num', render: r => money(r.size) + ' KB' },
      { key: 'uploaded', label: 'Yuklangan' },
      { key: 'status', label: 'Holat', render: r => st(r.status, r.status === 'Tasdiqlangan' ? 'green' : r.status === 'Tekshirilmoqda' ? 'amber' : 'red') },
    ],
    rows,
    onRowToast: r => r.name + ' — hujjatni ochish demo rejimida ishlamaydi',
  }, { toast })
}

// ================================================================= Roli
const PERMS = ['Shartnoma ko\'rish', 'Shartnoma yaratish', 'Shartnoma o\'chirish', 'To\'lov qabul qilish', 'Limit o\'zgartirish', 'Foydalanuvchi boshqarish', 'Hisobot yuklash', 'Tizim sozlamalari']
const ROLE_MATRIX = {
  'Administrator': [1, 1, 1, 1, 1, 1, 1, 1],
  'Moliyachi': [1, 1, 0, 1, 1, 0, 1, 0],
  'Sotuv menejeri': [1, 1, 0, 1, 0, 0, 0, 0],
  'Undiruvchi': [1, 0, 0, 1, 0, 0, 1, 0],
  'Operator': [1, 1, 0, 0, 0, 0, 0, 0],
  'Kuzatuvchi': [1, 0, 0, 0, 0, 0, 1, 0],
}

export function mountRoli(root, { toast }){
  return mountDemoBlocks(root, {
    title: 'Roli',
    sub: ROLES.length + ' ta rol · huquqlar matritsasi',
    note: "Namuna (demo) matritsa — huquqlarni o'zgartirish backendga ulangach ishlaydi.",
    actions: [{ label: 'Yangi rol', icon: IC_PLUS }],
    kpis: [
      { ic: IC_SHIELD, label: 'Rollar', val: ROLES.length },
      { ic: IC_CHECK, label: 'Huquq turlari', val: PERMS.length },
      { ic: IC_USER, label: 'Biriktirilgan', val: 58 },
      { ic: IC_SHIELD, label: 'To\'liq huquqli', val: 1 },
    ],
    blocks: () => card({
      title: 'Huquqlar matritsasi',
      sub: "Qaysi rol nima qila oladi",
      body: `<div style="overflow-x:auto"><table class="ic-tbl">
        <thead><tr><th>Huquq</th>${ROLES.map(r => `<th style="text-align:center">${escapeHtml(r)}</th>`).join('')}</tr></thead>
        <tbody>${PERMS.map((p, pi) => `
          <tr><td class="name">${escapeHtml(p)}</td>
          ${ROLES.map(r => `<td style="text-align:center">${ROLE_MATRIX[r][pi]
            ? '<span style="color:var(--ic-green);font-weight:900">✓</span>'
            : '<span style="color:var(--line);font-weight:900">—</span>'}</td>`).join('')}
          </tr>`).join('')}
        </tbody>
      </table></div>`,
      foot: "Huquqni o'zgartirish uchun administrator roli talab qilinadi",
    }),
  }, { toast })
}

// ================================================================ Profil
export function mountBoshqaruvProfil(root, { toast }){
  const seed = 'me'
  return mountDemoBlocks(root, {
    title: 'Profil',
    sub: 'Tashkilot va joriy foydalanuvchi ma\'lumotlari',
    note: "Namuna (demo) profil — tahrirlash backendga ulangach saqlanadi.",
    actions: [{ label: 'Tahrirlash', icon: IC_PLUS, ghost: true }],
    kpis: [
      { ic: IC_USER, label: 'Roli', val: 'Administrator' },
      { ic: IC_LOGIN, label: 'Oxirgi kirish', val: dateAgo('lastlog', 0) },
      { ic: IC_SHIELD, label: 'Ikki bosqichli', val: 'Yoqilgan' },
      { ic: IC_DOC, label: 'Sessiyalar', val: 3 },
    ],
    blocks: () => `
      <div class="ic-row-2">
        <div>
          ${card({
            title: 'Tashkilot',
            body: `
              <div class="ic-strip"><span>Nomi</span><b>ICAN BUSINESS MCHJ</b></div>
              <div class="ic-strip"><span>STIR</span><b>3${rint(seed + 'stir', 10000000, 99999999)}</b></div>
              <div class="ic-strip"><span>Manzil</span><b>Toshkent sh., Yunusobod t.</b></div>
              <div class="ic-strip"><span>Telefon</span><b>+998 71 200-00-00</b></div>
              <div class="ic-strip"><span>Direktor</span><b>${escapeHtml(personName('dir'))}</b></div>
              <div class="ic-strip"><span>Ro'yxatdan o'tgan</span><b>${dateAgo('reg', 1400)}</b></div>
            `,
          })}
          ${card({
            title: 'Faol sessiyalar',
            body: Array.from({ length: 3 }, (_, i) => `
              <div class="ic-setrow">
                <span class="ic-tile teal">${IC_LOGIN}</span>
                <span><b>${escapeHtml(pick('sd' + i, ['Windows · Chrome', 'Android · Chrome', 'macOS · Safari']))}</b>
                <small>${rint('si' + i, 10, 213)}.${rint('si2' + i, 0, 255)}.${rint('si3' + i, 0, 255)}.${rint('si4' + i, 1, 254)} · ${dateAgo('ss' + i, 3)}</small></span>
                <span>${i === 0 ? st('Joriy', 'green') : `<button type="button" class="ic-btn ghost" data-toast="Sessiyani yopish — demo rejimida ishlamaydi">Yopish</button>`}</span>
              </div>
            `).join(''),
          })}
        </div>
        <div>
          ${card({
            title: 'Foydalanuvchi',
            body: `
              <div class="ic-strip"><span>FISH</span><b>${escapeHtml(personName(seed))}</b></div>
              <div class="ic-strip"><span>Login</span><b>admin</b></div>
              <div class="ic-strip"><span>Roli</span><b>Administrator</b></div>
              <div class="ic-strip"><span>Telefon</span><b>${phoneNum(seed)}</b></div>
              <div class="ic-strip"><span>Email</span><b>admin@icanbusiness.uz</b></div>
            `,
          })}
          ${card({
            title: 'Xavfsizlik',
            body: `
              <div class="ic-setrow"><span><b>Ikki bosqichli tasdiqlash</b><small>SMS orqali kod</small></span><span class="ic-sw on" data-toast="Demo rejimida o'zgartirilmaydi"></span></div>
              <div class="ic-setrow"><span><b>Kirish haqida xabar</b><small>Yangi qurilmadan kirilganda</small></span><span class="ic-sw on" data-toast="Demo rejimida o'zgartirilmaydi"></span></div>
              <div class="ic-setrow"><span><b>Avtomatik chiqish</b><small>30 daqiqa harakatsizlikdan keyin</small></span><span class="ic-sw on" data-toast="Demo rejimida o'zgartirilmaydi"></span></div>
              <div class="ic-setrow"><span><b>Parolni almashtirish</b><small>Oxirgi marta ${dateAgo('pw', 60)}</small></span><span><button type="button" class="ic-btn ghost" data-toast="Parol almashtirish — demo rejimida ishlamaydi">O'zgartirish</button></span></div>
            `,
          })}
        </div>
      </div>
    `,
  }, { toast })
}

// ===================================================== Bildirishnomalar
const NOTIF_TYPES = ['Tizim', "To'lov", 'Shartnoma', 'Ogohlantirish', 'Vazifa']

export function mountBildirishnomalar(root, { toast }){
  const rows = Array.from({ length: 48 }, (_, i) => {
    const seed = 'nt' + i
    const type = pick(seed + 't', NOTIF_TYPES)
    const texts = {
      'Tizim': ['Tizim yangilanishi rejalashtirilgan', 'Zaxira nusxa muvaffaqiyatli yaratildi', 'Yangi versiya o\'rnatildi'],
      "To'lov": ["To'lov qabul qilindi", "To'lov muddati o'tdi", 'Qaytarish amalga oshirildi'],
      'Shartnoma': ['Yangi shartnoma ochildi', 'Shartnoma bekor qilindi', 'Shartnoma yopildi'],
      'Ogohlantirish': ['Filial limiti 90% ga yetdi', "Ko'p marta noto'g'ri parol kiritildi", 'Kechikish soni oshdi'],
      'Vazifa': ['Sizga yangi vazifa biriktirildi', 'Vazifa muddati yaqinlashdi', 'Vazifa bajarildi'],
    }
    return {
      id: 'N-' + (91000 + i),
      type,
      text: pick(seed + 'x', texts[type]),
      target: pick(seed + 'b', SHOPS),
      when: dateAgo(seed + 'w', 20),
      read: chance(seed + 'r', 62),
      readLabel: chance(seed + 'r', 62) ? "O'qilgan" : "O'qilmagan",
    }
  })
  return mountDemoTable(root, {
    title: 'Bildirishnomalar',
    sub: 'Tizim yuborgan barcha xabarlar',
    actions: [{ label: 'Hammasini o\'qilgan qilish', ghost: true, toast: "Demo rejimida holat saqlanmaydi" }],
    kpis: all => [
      { ic: IC_BELL, label: 'Jami', val: all.length },
      { ic: IC_BELL, label: "O'qilmagan", val: all.filter(r => !r.read).length },
      { ic: IC_BAN, label: 'Ogohlantirish', val: all.filter(r => r.type === 'Ogohlantirish').length },
      { ic: IC_CHECK, label: 'Bugungi', val: all.filter(r => r.when.startsWith(String(new Date().getDate()).padStart(2, '0'))).length },
    ],
    filters: { field: 'type', values: ['Hammasi', ...NOTIF_TYPES] },
    search: ['text', 'target'],
    perPage: 14,
    cols: [
      { key: 'id', label: 'ID', render: r => idBadge(r.id) },
      { key: 'type', label: 'Turi', render: r => st(r.type, r.type === 'Ogohlantirish' ? 'red' : r.type === "To'lov" ? 'green' : 'teal') },
      { key: 'text', label: 'Xabar', cls: 'name' },
      { key: 'target', label: 'Obyekt' },
      { key: 'when', label: 'Vaqt' },
      { key: 'readLabel', label: 'Holat', render: r => st(r.readLabel, r.read ? 'mut' : 'amber') },
    ],
    rows,
    onRowToast: r => r.text + ' — tafsilot demo rejimida ochilmaydi',
  }, { toast })
}

// ==================================================== Tizim sozlamalari
const SETTINGS_GROUPS = [
  { title: 'Umumiy', items: [
    ['Tizim nomi', 'Brauzer sarlavhasida va hisobotlarda ko\'rinadi', 'val', 'ICAN BUSINESS'],
    ['Standart til', "Yangi foydalanuvchilar uchun boshlang'ich til", 'val', "O'zbekcha"],
    ['Vaqt mintaqasi', 'Barcha sana va vaqtlar shu mintaqada ko\'rsatiladi', 'val', 'UTC+5 · Toshkent'],
    ['Valyuta', 'Summalar shu valyutada ko\'rsatiladi', 'val', "So'm (UZS)"],
  ]},
  { title: 'Xavfsizlik', items: [
    ['Ikki bosqichli tasdiqlash', 'Barcha administratorlar uchun majburiy', 'sw', true],
    ['Harakatsizlik timeout', '30 daqiqadan keyin avtomatik chiqish', 'sw', true],
    ['IP cheklash', 'Faqat ruxsat etilgan IP manzillardan kirish', 'sw', false],
    ['Parol murakkabligi', 'Kamida 8 belgi, harf va raqam', 'sw', true],
  ]},
  { title: 'Bildirishnomalar', items: [
    ['SMS xabarnoma', "To'lov va shartnoma hodisalarida SMS yuborish", 'sw', true],
    ['Email xabarnoma', 'Kunlik yig\'ma hisobot pochtaga yuboriladi', 'sw', false],
    ['Telegram bot', 'Ogohlantirishlar Telegram kanaliga tushadi', 'sw', true],
  ]},
  { title: 'Ma\'lumot', items: [
    ['Avtomatik zaxira', 'Har kuni 03:00 da baza zaxiralanadi', 'sw', true],
    ['Jurnal saqlash muddati', 'Kirish va amal jurnallari saqlanadi', 'val', '5 yil'],
    ['Eksport formati', 'Standart yuklab olish formati', 'val', 'XLSX'],
  ]},
]

export function mountTizimSozlamalari(root, { toast }){
  return mountDemoBlocks(root, {
    title: 'Tizim sozlamalari',
    sub: 'Butun tizim bo\'yicha amal qiladigan parametrlar',
    note: "Namuna (demo) sozlamalar — o'zgartirishlar saqlanmaydi, backend ulangach ishlaydi.",
    actions: [{ label: 'Saqlash', toast: 'Saqlash — demo rejimida ishlamaydi' }],
    blocks: () => `
      <div class="ic-row-2">
        ${SETTINGS_GROUPS.map(g => card({
          title: g.title,
          body: g.items.map(it => `
            <div class="ic-setrow">
              <span><b>${escapeHtml(it[0])}</b><small>${escapeHtml(it[1])}</small></span>
              <span>${it[2] === 'sw'
                ? `<span class="ic-sw${it[3] ? ' on' : ''}" data-toast="${escapeHtml(it[0])} — demo rejimida o'zgartirilmaydi"></span>`
                : `<b style="font:800 13px system-ui,sans-serif;color:var(--b7)">${escapeHtml(String(it[3]))}</b>`}</span>
            </div>
          `).join(''),
        })).join('')}
      </div>
    `,
  }, { toast })
}

// ====================================================== Tizim versiyasi
const CHANGELOG = [
  { v: 'v2.8.0', date: '24.08.2026', tag: 'Joriy', items: ['Butun dastur asl ICAN admini (admin.icanbusiness.uz) shabloniga o\'tkazildi: Inter Tight shrifti, teal #16B5CA, ixcham jadval', 'Boshqaruv > Filiallar > Tashkilot kartasi qo\'shildi — xizmatlar, imkoniyatlar (dostup), narxlar va tranzaksiyalar bitta oynada', 'Moliya va Xizmatlar menyusi asl tuzilishga keltirildi (guruhlangan, Tarix 8 ta integratsiya kesimida)', 'CRM kanbani jadvalga o\'tkazildi va sahifalash qo\'shildi', 'nginx Cache-Control: no-cache — deploy endi darhol ko\'rinadi'] },
  { v: 'v2.7.0', date: '17.08.2026', tag: '', items: ['Tabel bo\'limi ilovaning och dizayniga moslandi, ko\'rinmay qolgan kun raqamlari tuzatildi', 'Boshqaruv yon menyusi endi yopiq holatda ochiladi', 'Moliya va Boshqaruv bo\'limlarining barcha sahifalari demo ma\'lumot bilan to\'ldirildi', 'Xizmatlar va Wasyt modullari qo\'shildi'] },
  { v: 'v2.6.0', date: '12.08.2026', tag: '', items: ['Super Admin: xarita, tashriflar va GPS komponentlari tiklandi', 'Undiruv bo\'limida hududlar bo\'yicha Excel eksporti', 'Ish haqi to\'lovlari sahifasi qayta ishlandi'] },
  { v: 'v2.5.0', date: '11.08.2026', tag: '', items: ['CRM: sdelka tafsilot oynasi kattalashtirildi', 'Mas\'ul menejer tanlagichi custom dropdown bilan almashtirildi', 'Moliya → Statistika sahifasi qo\'shildi'] },
  { v: 'v2.4.0', date: '07.08.2026', tag: '', items: ['Qo\'ng\'iroqlar bo\'limi qo\'shildi', 'Chatlar: Instagram/Facebook/Telegram yagona oynada', 'Sozlamalar sahifasi yangilandi'] },
  { v: 'v2.3.0', date: '01.08.2026', tag: '', items: ['Vazifalar moduli: kanban, kalendar va loyihalar', 'Bildirishnoma qo\'ng\'irog\'i qo\'shildi'] },
]

export function mountTizimVersiyasi(root, { toast }){
  return mountDemoBlocks(root, {
    title: 'Tizim versiyasi',
    sub: 'Joriy versiya va o\'zgarishlar tarixi',
    note: "Namuna (demo) ma'lumot — server holati va texnik ko'rsatkichlar haqiqiy emas.",
    kpis: [
      { ic: IC_TAG, label: 'Joriy versiya', val: CHANGELOG[0].v },
      { ic: IC_CHECK, label: 'Server holati', val: 'Ishlamoqda' },
      { ic: IC_GEAR, label: 'Ishga tushgan', val: rint('upt', 4, 90) + ' kun' },
      { ic: IC_DOC, label: 'Baza hajmi', val: rint('dbs', 2, 18) + '.' + rint('dbs2', 0, 9) + ' GB' },
    ],
    blocks: () => `
      <div class="ic-row-2">
        <div>
          ${card({
            title: "O'zgarishlar tarixi",
            sub: CHANGELOG.length + ' ta oxirgi versiya',
            body: `<div class="ic-tl">${CHANGELOG.map(c => `
              <div class="ic-tl-item">
                <small>${escapeHtml(c.date)}</small>
                <b>${escapeHtml(c.v)}</b> ${c.tag ? st(c.tag, 'green') : ''}
                <p>${c.items.map(i => '• ' + escapeHtml(i)).join('<br>')}</p>
              </div>
            `).join('')}</div>`,
          })}
        </div>
        <div>
          ${card({
            title: 'Texnik holat',
            body: `
              <div class="ic-strip"><span>Frontend</span><b>${CHANGELOG[0].v}</b></div>
              <div class="ic-strip"><span>Backend API</span><b>v2.7.0</b></div>
              <div class="ic-strip"><span>Node.js</span><b>v24.17.0</b></div>
              <div class="ic-strip"><span>Baza</span><b>PostgreSQL 16</b></div>
              <div class="ic-strip"><span>Oxirgi zaxira</span><b>${dateAgo('bk', 1)}</b></div>
              <div class="ic-strip"><span>Domen</span><b>commercial-icanbusiness.uz</b></div>
            `,
          })}
          ${card({
            title: 'Resurslardan foydalanish',
            body: barList([
              { name: 'CPU', val: rint('cpu', 8, 46) + '%', percent: rint('cpu', 8, 46) },
              { name: 'Operativ xotira', val: rint('ram', 30, 78) + '%', percent: rint('ram', 30, 78) },
              { name: 'Disk', val: rint('dsk', 20, 64) + '%', percent: rint('dsk', 20, 64) },
              { name: 'Tarmoq', val: rint('net', 5, 35) + '%', percent: rint('net', 5, 35) },
            ]),
            foot: "Ko'rsatkichlar namuna — monitoring agenti hali ulanmagan",
          })}
        </div>
      </div>
    `,
  }, { toast })
}


// ============================================================== Banklar
const BANKS = ['Asaka bank','Ipoteka bank','Kapital bank','Hamkor bank','Trastbank','Aloqabank','Davr bank','Turonbank','Orient Finans','Universal bank','Agrobank','Xalq banki','SQB','Ziraat bank','Tenge bank']
export function mountBanklar(root, { toast }){
  const rows = BANKS.map((name, i) => {
    const seed = 'bk' + i
    return {
      id: 'B-' + (400 + i),
      name,
      mfo: String(rint(seed + 'm', 10000, 99999)),
      inn: String(rint(seed + 'i', 200000000, 999999999)),
      region: pick(seed + 'r', REGIONS),
      branches: rint(seed + 'b', 3, 180),
      companies: rint(seed + 'c', 0, 46),
      status: chance(seed + 's', 88) ? 'Faol' : 'Nofaol',
    }
  })
  return mountDemoTable(root, {
    title: 'Banklar',
    sub: "Filiallar rekvizitlarida ishlatiladigan banklar ma'lumotnomasi",
    actions: [{ label: 'Excel', icon: IC_DL, ghost: true }, { label: "Bank qo'shish", icon: IC_PLUS }],
    kpis: all => [
      { label: 'Banklar', val: all.length },
      { label: 'Faol', val: all.filter(r => r.status === 'Faol').length },
      { label: 'Bank filiallari', val: money(all.reduce((a, r) => a + r.branches, 0)) },
      { label: 'Biriktirilgan tashkilot', val: all.reduce((a, r) => a + r.companies, 0) },
    ],
    search: ['name', 'mfo', 'inn', 'region'],
    perPage: 15,
    cols: [
      { key: 'id', label: 'Kod', render: r => idBadge(r.id) },
      { key: 'name', label: 'Bank', cls: 'name' },
      { key: 'mfo', label: 'MFO' },
      { key: 'inn', label: 'INN' },
      { key: 'region', label: 'Bosh ofis' },
      { key: 'branches', label: 'Filial', cls: 'num' },
      { key: 'companies', label: 'Tashkilot', cls: 'num' },
      { key: 'status', label: 'Holat', render: r => st(r.status, r.status === 'Faol' ? 'green' : 'mut') },
    ],
    rows,
    onRowToast: r => r.name + ' — bank kartasi demo rejimida ochilmaydi',
  }, { toast })
}

// ---------------------------------------------------------------------
export const BOSHQARUV_DEMO_MOUNTS = {
  'filial-tranzaksiyalari': mountFilialTx,
  'banklar': mountBanklar,
  'ican-kirish': mountIcanKirish,
  'sms-shablon': mountSmsShablon,
  'balans-limiti': mountBalansLimiti,
  'xarajatlar': mountXarajatlar,
  'tarif': mountTarif,
  'hamkor': mountHamkor,
  'hudud': mountHudud,
  'tuman': mountTuman,
  'mfy': mountMfy,
  'foydalanuvchilar': mountFoydalanuvchilar,
  'hujjat': mountHujjat,
  'roli': mountRoli,
  'profil': mountBoshqaruvProfil,
  'bildirishnomalar': mountBildirishnomalar,
  'tizim-sozlamalari': mountTizimSozlamalari,
  'tizim-versiyasi': mountTizimVersiyasi,
}
