// Qo'ng'iroq (dial-pad) paneli — MicroSIP kabi SIP-telefon dasturlariga
// o'xshab qilingan interfeys. DIQQAT: bu hozircha FAQAT ko'rinish (UI) —
// haqiqiy IP-telefoniya (SIP/WebRTC) hali ulanmagan, shuning uchun "Qo'ng'iroq"
// tugmasi bosilganda hozircha faqat bildirishnoma chiqadi. Backend/SIP server
// ulanganda shu joyga haqiqiy qo'ng'iroq mantig'i qo'shiladi.
import { qs, on, escapeHtml } from '../core.js'
import { demoNote } from './demo-kit.js'

const IC_CALL = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 2.9a2 2 0 0 1-.4 2.1L8 10.1a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.4c.9.4 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg>`
const IC_VIDEO = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`
const IC_MSG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.6 8.6 0 0 1-3.9-.9L3 21l1.9-5.2a8.6 8.6 0 0 1-.9-3.9A8.4 8.4 0 0 1 12.5 3a8.4 8.4 0 0 1 8.5 8.5z"/></svg>`
const IC_CHEVRON_DOWN = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`
const IC_SPEAKER = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>`
const IC_MIC = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><path d="M12 18v4"/><path d="M8 22h8"/></svg>`

const KEYS = [
  { d:'1', s:'' },   { d:'2', s:'ABC' }, { d:'3', s:'DEF' },
  { d:'4', s:'GHI' }, { d:'5', s:'JKL' }, { d:'6', s:'MNO' },
  { d:'7', s:'PQRS'}, { d:'8', s:'TUV' }, { d:'9', s:'WXYZ'},
  { d:'*', s:'' },   { d:'0', s:'' },    { d:'#', s:'' },
]

const TOGGLES = [
  { key:'dnd', label:'DND' },
  { key:'aa', label:'AA' },
  { key:'conf', label:'CONF' },
  { key:'rec', label:'REC' },
]

export function mountCalls(root, { toast }){
  let digits = ''
  let toggled = { dnd:false, aa:false, conf:false, rec:false }

  function render(){
    root.innerHTML = `
      <div class="dash-head">
        <div>
          <h2>Qo'ng'iroq</h2>
          <div style="color:var(--mut);font-size:12.5px;font-weight:700;margin-top:2px">Raqam terish paneli</div>
        </div>
      </div>

      ${demoNote("Faqat ko'rinish: IP-telefoniya (SIP) hali ulanmagan, shuning uchun raqam terilsa ham haqiqiy qo'ng'iroq qilinmaydi.")}

      <div class="dialpad-wrap">
        <div class="dialpad-card">
          <div class="dialpad-head">
            <span class="dialpad-head-ic">${IC_CALL}</span>
            <div class="dialpad-head-txt"><b>iCAN Telefoniya</b><small>Ichki SIP liniya</small></div>
            <span class="dialpad-online-pill"><span class="dialpad-status-dot"></span>Onlayn</span>
          </div>

          <div class="dialpad-display">
            <input id="dp-input" value="${escapeHtml(digits)}" readonly placeholder="Raqam kiriting" />
            <button type="button" class="dialpad-chev" id="dp-hist" title="Tarix">${IC_CHEVRON_DOWN}</button>
          </div>

          <div class="dialpad-grid">
            ${KEYS.map(k=>`<button type="button" class="dialpad-key" data-key="${k.d}"><span>${k.d}</span>${k.s?`<small>${k.s}</small>`:''}</button>`).join('')}
          </div>

          <div class="dialpad-grid dialpad-grid-3">
            <button type="button" class="dialpad-key dialpad-key-mut" id="dp-recall" title="Recall"><span>R</span></button>
            <button type="button" class="dialpad-key" data-key="+"><span>+</span></button>
            <button type="button" class="dialpad-key dialpad-key-mut" id="dp-clear" title="O'chirish"><span>C</span></button>
          </div>

          <div class="dialpad-actions">
            <button type="button" class="dialpad-side-btn" id="dp-video" title="Video qo'ng'iroq">${IC_VIDEO}</button>
            <button type="button" class="dialpad-call-btn" id="dp-call">${IC_CALL} Qo'ng'iroq</button>
            <button type="button" class="dialpad-side-btn" id="dp-msg" title="Xabar">${IC_MSG}</button>
          </div>

          <div class="dialpad-vol-row">
            <span class="dialpad-vol-ic" title="Karnay">${IC_SPEAKER}</span>
            <input type="range" min="0" max="100" value="70" id="dp-vol-speaker" />
          </div>
          <div class="dialpad-vol-row">
            <span class="dialpad-vol-ic" title="Mikrofon">${IC_MIC}</span>
            <input type="range" min="0" max="100" value="80" id="dp-vol-mic" />
          </div>

          <div class="dialpad-toggles">
            ${TOGGLES.map(t=>`<button type="button" class="pay-pill${toggled[t.key]?' on':''}" data-toggle="${t.key}">${t.label}</button>`).join('')}
          </div>
        </div>
      </div>
    `

    const card = qs('.dialpad-card', root)
    const inp = qs('#dp-input', root)

    on(card, 'click', '[data-key]', (e,btn)=>{
      digits += btn.dataset.key
      inp.value = digits
    })
    qs('#dp-clear', root).addEventListener('click', ()=>{
      digits = digits.slice(0,-1)
      inp.value = digits
    })
    qs('#dp-recall', root).addEventListener('click', ()=> toast("Recall tez orada qo'shiladi"))
    qs('#dp-hist', root).addEventListener('click', ()=> toast("Qo'ng'iroqlar tarixi tez orada qo'shiladi"))
    qs('#dp-video', root).addEventListener('click', ()=> toast("Video qo'ng'iroq tez orada ulanadi"))
    qs('#dp-msg', root).addEventListener('click', ()=> toast('Xabar yuborish tez orada ulanadi'))
    qs('#dp-call', root).addEventListener('click', ()=>{
      if(!digits.trim()){ toast('Raqamni kiriting'); return }
      toast("Haqiqiy qo'ng'iroq funksiyasi tez orada ulanadi")
    })
    on(card, 'click', '[data-toggle]', (e,btn)=>{
      const key = btn.dataset.toggle
      toggled[key] = !toggled[key]
      const wasOn = toggled[key]
      render()
      toast(`${btn.textContent}${wasOn ? ' yoqildi' : " o'chirildi"}`)
    })

    const setFill = el => { if(el) el.style.setProperty('--fill', (el.value/el.max*100)+'%') }
    const volSpeaker = qs('#dp-vol-speaker', root), volMic = qs('#dp-vol-mic', root)
    setFill(volSpeaker); setFill(volMic)
    if(volSpeaker) volSpeaker.addEventListener('input', ()=> setFill(volSpeaker))
    if(volMic) volMic.addEventListener('input', ()=> setFill(volMic))
  }

  render()
  return function cleanup(){}
}
