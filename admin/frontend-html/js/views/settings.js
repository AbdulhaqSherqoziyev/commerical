import { qs, on, escapeHtml } from '../core.js'
import { demoNote } from './demo-kit.js'
import { fmtSum } from '../products.js'

// Sozlamalar — Ish haqi to'lovlari bo'limida ishlatiladigan stavka va
// qoidalar. DIQQAT: bu qiymatlar uchun hali server (backend) tomoni yo'q —
// shuning uchun hozircha shu brauzerning localStorage'ida saqlanadi (faqat
// shu kompyuter/shu brauzerda amal qiladi). Backend tayyor bo'lganda shu
// joyni haqiqiy API'ga ulash kifoya.

const LS_KEY = 'zood-payroll-settings'
const DEFAULTS = {
  bonusUndiruv: 5,          // Undiruv bonusi, %
  bonusUstanovka: 5,        // Ustanovka bonusi, %
  undiruvShtraf: 10,        // Undiruv shtrafi, %
  kechqolishType: 'percent',// Kech qolish jarimasi turi: 'sum' | 'percent'
  kechqolishValue: 2,       // turiga qarab: % yoki so'm (kuniga)
  kechqolishGrace: 15,      // necha daqiqagacha kechikish kechiriladi (jarimasiz)
  workDaysPerMonth: 26,     // oydagi standart ish kunlari soni
  avansMaxPercent: 30,      // avans — oylikning necha foizigacha
  paydayOfMonth: 5,         // standart to'lov kuni (oyning kuni)
  defaultPayMethod: 'card', // standart to'lov usuli: cash | card | bank
  cardNumber: '',           // rekvizit: plastik karta raqami
  accountNumber: '',        // rekvizit: hisob raqami (bank hisob raqami)
}

export function getPayrollSettings(){
  try{
    const raw = localStorage.getItem(LS_KEY)
    if(raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  }catch(e){}
  return { ...DEFAULTS }
}

function saveSettingsToStorage(s){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(s)) }catch(e){}
}

const PAY_METHODS = [['cash','Naqd pul'],['card','Plastik karta'],['bank',"Bank o'tkazmasi"]]
// Karta/hisob raqamlarni 4 talik guruhlarga ajratib ko'rsatish (faqat raqamlar saqlanadi)
function groupDigits(v, max){ return String(v||'').replace(/\D/g,'').slice(0,max).replace(/(.{4})/g,'$1 ').trim() }

export function mountSettings(root, { toast }){
  let st = getPayrollSettings()
  let dirty = false

  function render(){
    root.innerHTML = `
      <div id="stg-wrap">
      <div class="dash-head" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div><h2>Sozlamalar</h2><div>Bonus, jarima va ish haqi hisob-kitobi qoidalari</div></div>
      </div>
      ${demoNote("Bu sozlamalar hozircha FAQAT SHU BRAUZERDA saqlanadi — server tomoni hali yo'q. Boshqa kompyuterda yoki boshqa brauzerda ochilsa, kiritilgan qiymatlar ko'rinmaydi.")}

      <div class="wiz-card">
        <h4>Bonus stavkalari</h4>
        <div class="wiz-grid">
          <div class="wf"><label>Undiruv bonusi (%)</label><input type="number" min="0" max="100" step="0.1" name="bonusUndiruv" value="${escapeHtml(st.bonusUndiruv)}" /></div>
          <div class="wf"><label>Ustanovka bonusi (%)</label><input type="number" min="0" max="100" step="0.1" name="bonusUstanovka" value="${escapeHtml(st.bonusUstanovka)}" /></div>
        </div>
      </div>

      <div class="wiz-card">
        <h4>Jarima va shtraflar</h4>
        <div class="wiz-grid">
          <div class="wf"><label>Undiruv shtrafi (%)</label><input type="number" min="0" max="100" step="0.1" name="undiruvShtraf" value="${escapeHtml(st.undiruvShtraf)}" /></div>
          <div class="wf"><label>Kechikish uchun imtiyoz (daqiqa)</label><input type="number" min="0" step="1" name="kechqolishGrace" value="${escapeHtml(st.kechqolishGrace)}" /></div>
        </div>
        <div class="wf" style="margin-top:14px">
          <label>Kech qolish jarimasi</label>
          <div style="display:flex;gap:8px;margin-bottom:10px">
            <button type="button" class="btn ${st.kechqolishType==='percent'?'':'ghost'} small" data-kq-type="percent">Foizda (%)</button>
            <button type="button" class="btn ${st.kechqolishType==='sum'?'':'ghost'} small" data-kq-type="sum">Summada (so'm)</button>
          </div>
          <input type="text" inputmode="numeric" style="max-width:210px" name="kechqolishValue" value="${st.kechqolishType==='sum'?fmtSum(st.kechqolishValue):escapeHtml(st.kechqolishValue)}" placeholder="${st.kechqolishType==='sum'?"masalan: 20 000":'masalan: 2'}" />
        </div>
        <div class="hint" style="margin-top:10px">Bu qoidalar "Ish haqi to'lovlari" bo'limida hisob-kitob qilishda ishlatiladi.</div>
      </div>

      <div class="wiz-card">
        <h4>Ish haqi qoidalari</h4>
        <div class="wiz-grid">
          <div class="wf"><label>Oydagi standart ish kunlari</label><input type="number" min="1" max="31" step="1" name="workDaysPerMonth" value="${escapeHtml(st.workDaysPerMonth)}" /></div>
          <div class="wf"><label>Avans — oylikning necha foizigacha (%)</label><input type="number" min="0" max="100" step="1" name="avansMaxPercent" value="${escapeHtml(st.avansMaxPercent)}" /></div>
          <div class="wf"><label>Standart to'lov kuni (oyning kuni)</label><input type="number" min="1" max="31" step="1" name="paydayOfMonth" value="${escapeHtml(st.paydayOfMonth)}" /></div>
          <div class="wf">
            <label>Standart to'lov usuli</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${PAY_METHODS.map(([k,l])=>`<button type="button" class="btn ${st.defaultPayMethod===k?'':'ghost'} small" data-pm="${k}">${l}</button>`).join('')}
            </div>
          </div>
        </div>
        <div class="hint" style="margin-top:10px">"Oydagi ish kunlari" — kunlik stavka va "Ishlangan kun" hisobida; "Avans chegarasi" — xodimga qancha avans berish mumkinligini nazorat qilish uchun ishlatiladi.</div>
      </div>

      <div class="wiz-card">
        <h4>Rekvizitlar</h4>
        <div class="wiz-grid">
          <div class="wf"><label>Karta raqami</label><input type="text" inputmode="numeric" name="cardNumber" value="${groupDigits(st.cardNumber,16)}" placeholder="0000 0000 0000 0000" /></div>
          <div class="wf"><label>Hisob raqami</label><input type="text" inputmode="numeric" name="accountNumber" value="${groupDigits(st.accountNumber,20)}" placeholder="0000 0000 0000 0000 00" /></div>
        </div>
        <div class="hint" style="margin-top:10px">To'lov va hisob-fakturalarda ko'rsatiladigan rekvizitlar.</div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button class="btn" id="stg-save" ${dirty?'':'disabled'}>Saqlash</button>
      </div>
      </div>
    `
    wire()
  }

  function markDirty(){
    dirty = true
    const saveBtn = qs('#stg-save', root); if(saveBtn) saveBtn.disabled = false
  }

  function wire(){
    const fields = ['bonusUndiruv','bonusUstanovka','undiruvShtraf','kechqolishGrace','workDaysPerMonth','avansMaxPercent','paydayOfMonth']
    fields.forEach(name=>{
      const el = qs(`[name="${name}"]`, root)
      if(el) el.addEventListener('input', e=>{ st[name] = e.target.value === '' ? 0 : Number(e.target.value); markDirty() })
    })
    const kqVal = qs('[name="kechqolishValue"]', root)
    if(kqVal) kqVal.addEventListener('input', e=>{
      const digits = e.target.value.replace(/\D/g,'')
      st.kechqolishValue = digits === '' ? 0 : Number(digits)
      if(st.kechqolishType==='sum') e.target.value = digits ? fmtSum(digits) : ''
      markDirty()
    })
    const cardEl = qs('[name="cardNumber"]', root)
    if(cardEl) cardEl.addEventListener('input', e=>{
      st.cardNumber = e.target.value.replace(/\D/g,'').slice(0,16)
      e.target.value = groupDigits(st.cardNumber,16)
      markDirty()
    })
    const accEl = qs('[name="accountNumber"]', root)
    if(accEl) accEl.addEventListener('input', e=>{
      st.accountNumber = e.target.value.replace(/\D/g,'').slice(0,20)
      e.target.value = groupDigits(st.accountNumber,20)
      markDirty()
    })
    const wrap = qs('#stg-wrap', root)
    on(wrap, 'click', '[data-kq-type]', (e,btn)=>{
      st.kechqolishType = btn.dataset.kqType
      markDirty(); render()
    })
    on(wrap, 'click', '[data-pm]', (e,btn)=>{
      st.defaultPayMethod = btn.dataset.pm
      markDirty(); render()
    })
    const saveBtn = qs('#stg-save', root)
    if(saveBtn) saveBtn.addEventListener('click', ()=>{
      saveSettingsToStorage(st)
      dirty = false
      toast('Sozlamalar saqlandi')
      render()
    })
  }

  render()
  return ()=>{}
}
