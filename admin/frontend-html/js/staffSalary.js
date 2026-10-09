// Xodim yaratish/tahrirlashda "Oylik maosh" (salary) maydoni API'ga
// yuborilsa ham, hozirgi backend uni saqlab/qaytarib bermayapti — shu
// sabab Xodimlar ro'yxati, Xodim ichi va Ish haqi to'lovlari bo'limlarida
// oylik hech qayerda ko'rinmay qolyapti. Backend tuzatilgunga qadar, oylik
// summasi ISHONCHLI zaxira sifatida brauzer xotirasida (localStorage)
// xodim id'si (yoki topilmasa — login'i) bo'yicha saqlanadi va shu
// yordamida barcha bo'limlarda bir xil ko'rsatiladi. Backend tuzatilgach,
// bu yordamchi modulni olib tashlab, to'g'ridan-to'g'ri s.salary'ga
// qaytish kifoya.
const KEY = 'zood-staff-salary'

function loadMap(){
  try{ return JSON.parse(localStorage.getItem(KEY) || '{}') }catch(e){ return {} }
}
function saveMap(m){
  try{ localStorage.setItem(KEY, JSON.stringify(m)) }catch(e){}
}

export function getEffectiveSalary(s){
  if(!s) return 0
  const map = loadMap()
  if(s.id!=null && map[s.id]!=null) return Number(map[s.id])||0
  if(s.login!=null && map[s.login]!=null) return Number(map[s.login])||0
  return Number(s.salary)||0
}

export function setLocalSalary(key, amount){
  if(key==null) return
  const map = loadMap()
  const n = Number(amount)||0
  if(n>0) map[key] = n; else delete map[key]
  saveMap(map)
}
