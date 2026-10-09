// Sahifalar bir-birini "aynan shu yozuv bilan" ochishi uchun kichik pochta
// qutisi.
//
// Muammo: Filiallar jadvali (clients.js) Tashkilot kartasini ocha olishi
// kerak, karta esa (boshqaruv-company.js) tahrirlash uchun jadvalga qaytara
// olishi kerak. Ikkalasi bir-birini to'g'ridan-to'g'ri import qilsa, halqa
// (circular import) hosil bo'ladi. Shuning uchun ikkalasi ham faqat shu
// neytral moduldan foydalanadi — u hech kimni import qilmaydi.
//
// Qiymat BIR MARTA o'qiladi (take...) — sahifa qayta ochilganda eski
// "niyat" qayta ishlamasligi uchun.

let companyCardId = null
let companyCardTab = null
// tab — karta ochilganda qaysi yorliq faol bo'lsin ('umumiy', 'narx' ...).
// Berilmasa karta o'zining odatiy yorlig'ini ochadi.
export function setCompanyCardTarget(id, tab){
  companyCardId = id == null ? null : String(id)
  if(id != null) oxirgiKarta = String(id)
  companyCardTab = tab || null
}
export function takeCompanyCardTarget(){ const v = companyCardId; companyCardId = null; return v }
// Oxirgi ochilgan karta — manzilda (#.../filial-kartasi/<id>) saqlash uchun.
// take... dan farqli: bu tozalanmaydi.
let oxirgiKarta = null
export function getLastCompanyCardId(){ return oxirgiKarta }
export function takeCompanyCardTab(){ const v = companyCardTab; companyCardTab = null; return v }

let clientEditId = null
export function setClientEditTarget(id){ clientEditId = id == null ? null : String(id) }
export function takeClientEditTarget(){ const v = clientEditId; clientEditId = null; return v }

// Boshqa modul/sahifaga o'tish. shell.js `ic:nav` hodisasini tinglaydi,
// kerakli modulni tanlaydi va yon menyuda o'sha guruhni ochadi.
export function goto(mod, page){
  document.dispatchEvent(new CustomEvent('ic:nav', { detail:{ mod, page } }))
}
