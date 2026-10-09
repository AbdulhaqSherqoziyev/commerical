import { api } from '../api.js'
import { qs, qsa, on, escapeHtml } from '../core.js'

// Chatlar — Instagram / Facebook / Telegram / Sayt orqali kelgan mijoz
// murojaatlarini bitta joyda ko'rish uchun yagona (unified) inbox. DIQQAT:
// real ijtimoiy tarmoq integratsiyasi (Instagram/Facebook/Telegram API) hali
// ulanmagan — shu sabab suhbatlar haqiqiy mijozlar ro'yxati asosida, namuna
// (demo) xabarlar bilan tayyorlanadi va brauzer xotirasida (localStorage)
// saqlanadi. Backend/bot integratsiyasi ulanganda shu joyni real xabar
// oqimiga almashtirish kifoya — interfeys allaqachon tayyor bo'ladi.

const META_KEY = 'zood-chats-meta'   // { [clientId]: { channel, managerName, status, unread } }
const MSG_KEY = 'zood-chats-messages' // { [clientId]: [{ from:'mijoz'|'biz', text, time }] }

function loadMeta(){ try{ return JSON.parse(localStorage.getItem(META_KEY) || '{}') }catch(e){ return {} } }
function saveMeta(m){ try{ localStorage.setItem(META_KEY, JSON.stringify(m)) }catch(e){} }
function loadMsgs(){ try{ return JSON.parse(localStorage.getItem(MSG_KEY) || '{}') }catch(e){ return {} } }
function saveMsgs(m){ try{ localStorage.setItem(MSG_KEY, JSON.stringify(m)) }catch(e){} }

function hashStr(s){
  let h = 0
  const str = String(s||'')
  for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0 }
  return Math.abs(h)
}
function clientName(c){ return c.name || c.company || c.dirLogin || 'Mijoz' }
function timeStr(d){ return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0') }

const IC_SEARCH = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`
const IC_SEND = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 3.5 2.7 10.8c-.8.3-.8 1.5.1 1.7l4.6 1.4 1.8 5.5c.2.7 1.1.9 1.6.3l2.5-2.9 4.7 3.5c.7.5 1.7.1 1.9-.7l3-15.4c.2-1-.8-1.7-1.4-1.2z"/></svg>`
const IC_PHONE = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 2.9a2 2 0 0 1-.4 2.1L8 10.1a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.4c.9.4 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg>`
const IC_IMAGE = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="M21 15.5 16 10.5 5 21.5"/></svg>`
const IC_MIC = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><path d="M12 18v4"/><path d="M8 22h8"/></svg>`
const IC_STOP = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>`
const IC_CLOSE_SM = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M5 5l14 14M19 5 5 19"/></svg>`
const IC_IG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="2" width="20" height="20" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none"/></svg>`
const IC_FB = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M15 8.5h2.5V5H15c-2.5 0-4.5 2-4.5 4.5V12H8v3.5h2.5V22H14v-6.5h2.7l.8-3.5H14v-2c0-.8.7-1.5 1-1.5z"/></svg>`
const IC_TG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 3.5 2.7 10.8c-.8.3-.8 1.5.1 1.7l4.6 1.4 1.8 5.5c.2.7 1.1.9 1.6.3l2.5-2.9 4.7 3.5c.7.5 1.7.1 1.9-.7l3-15.4c.2-1-.8-1.7-1.4-1.2z"/></svg>`
const IC_GLOBE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.5 4 5.9 4 9.5s-1.4 7-4 9.5c-2.6-2.5-4-5.9-4-9.5s1.4-7 4-9.5z"/></svg>`

const CHANNELS = [
  { key:'instagram', label:'Instagram', short:'IG', bg:'#FCE4EF', fg:'#C2185B', icon:IC_IG },
  { key:'facebook', label:'Facebook', short:'FB', bg:'#DBEAFE', fg:'#1D4ED8', icon:IC_FB },
  { key:'telegram', label:'Telegram', short:'TG', bg:'#DFF3FC', fg:'#0E86AB', icon:IC_TG },
  { key:'sayt', label:'Sayt', short:'Sayt', bg:'#EDE9FE', fg:'#6D28D9', icon:IC_GLOBE },
]
function chOf(key){ return CHANNELS.find(c=>c.key===key) || CHANNELS[0] }
function chBadge(key, big){
  const ch = chOf(key)
  return `<span class="badge" style="background:${ch.bg};color:${ch.fg};margin-left:0;display:inline-flex;align-items:center;gap:5px${big?';font-size:11px;padding:4px 11px':''}">${ch.icon}${ch.label}</span>`
}

const STATUSES = [
  { key:'Yangi lid', bg:'#FEF3E2', fg:'var(--amber)' },
  { key:'Faol mijoz', bg:'#E7F5EC', fg:'var(--green)' },
  { key:'Doimiy mijoz', bg:'var(--soft)', fg:'var(--b7)' },
]
function statusBadge(key){
  const s = STATUSES.find(x=>x.key===key) || STATUSES[0]
  return `<span class="badge" style="background:${s.bg};color:${s.fg};margin-left:0">${s.key}</span>`
}

const DEMO_MANAGERS = ['Sarvar Alijonov','Nilufar Qosimova','Bobur Rashidov','Dilnoza Qodirova','Javlon Mirzayev']

// Namuna suhbat "ssenariylari" — har bir mijozga hash orqali bittasi
// biriktiriladi, shu bilan har xil mijozlarda turlicha (lekin doimiy) demo
// yozishmalar ko'rinadi.
const DEMO_LINES = [
  [ { from:'mijoz', text:'Salom, mahsulot narxi qancha bo\'ladi?' }, { from:'biz', text:'Salom! Qaysi mahsulot haqida?' }, { from:'mijoz', text:'CRM tizimi haqida' }, { from:'biz', text:"Oyiga 500 000 so'm. Demo ko'rsatamiz!" }, { from:'mijoz', text:'Salom, narxi qancha?' } ],
  [ { from:'mijoz', text:"Demo ko'rsatib berasizmi?" }, { from:'biz', text:"Albatta, qachon qulay bo'ladi?" }, { from:'mijoz', text:'Ertaga tushdan keyin bo\'ladimi?' } ],
  [ { from:'mijoz', text:'Shartnoma yuborilsinmi?' }, { from:'biz', text:'Ha, hozir tayyorlab yuboraman.' } ],
  [ { from:'mijoz', text:"Iltimos qo'ng'iroq qiling!" } ],
  [ { from:'mijoz', text:'Chegirma bormi ushbu oy?' }, { from:'biz', text:"Ha, yillik to'lovda 10% chegirma bor." } ],
  [ { from:'mijoz', text:'Assalomu alaykum' }, { from:'biz', text:'Va alaykum assalom! Sizga qanday yordam bera olamiz?' } ],
  [ { from:'mijoz', text:"Hisobimga kirolmayabman, yordam bering" }, { from:'biz', text:"Parolni tiklash havolasini yubordim, tekshiring." } ],
  [ { from:'mijoz', text:"To'lov qanday amalga oshiriladi?" }, { from:'biz', text:"Naqd, karta yoki hisob raqamiga o'tkazma orqali." } ],
]

// Ilgari bu joylarda emoji (💳 ✈ 🔄 …) ishlatilgan edi. Windows ularni
// rangsiz belgi shrifti bilan chizadi — natijada tugmalarda qandaydir
// tirechaga o'xshash, sifatsiz belgi ko'rinardi. Endi sahifaning qolgan
// ikonkalari bilan bir xil chiziqli SVG.
const IC_NOTE2 = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>`

export function mountChats(root, { toast }){
  let clients = null, staffList = [], err = ''
  let q = '', fChannel = ''
  let activeId = null
  const drafts = {}
  const attachments = {} // { [clientId]: { type:'image', dataUrl, name } | { type:'voice', dataUrl, duration } }
  let recorder = null // faol audio yozib olish holati (bittadan ortiq bo'lmaydi)

  async function load(){
    try{
      clients = await api.clientsList()
      try{ staffList = (await api.staffList()).filter(s=>s.active) }catch(e){ staffList = [] }
      err = ''
    }catch(ex){ err = ex.error || 'Xatolik' }
    ensureSeeded()
    if(clients && clients.length && !clients.some(c=>c.id===activeId)) activeId = clients[0].id
    render()
  }

  function managerNames(){
    return staffList.length>=3 ? staffList.map(s=>[s.firstName,s.lastName].filter(Boolean).join(' ')).filter(Boolean) : DEMO_MANAGERS
  }

  function ensureSeeded(){
    const meta = loadMeta()
    const msgs = loadMsgs()
    const names = managerNames()
    let changed = false
    ;(clients||[]).forEach(c=>{
      const h = hashStr(String(c.id))
      if(!meta[c.id]){
        meta[c.id] = {
          channel: CHANNELS[h % CHANNELS.length].key,
          managerName: names[h % names.length],
          status: STATUSES[h % STATUSES.length].key,
          unread: (h % 5 === 0) ? 0 : (h % 3) + 1,
        }
        changed = true
      }
      if(!msgs[c.id]){
        const lines = DEMO_LINES[h % DEMO_LINES.length]
        const now = new Date()
        msgs[c.id] = lines.map((l,i)=>({ from:l.from, text:l.text, time: timeStr(new Date(now.getTime() - (lines.length-i)*8*60000)) }))
        changed = true
      }
    })
    if(changed){ saveMeta(meta); saveMsgs(msgs) }
  }

  function rows(){
    const meta = loadMeta()
    const msgs = loadMsgs()
    return (clients||[]).map(c=>{
      const m = meta[c.id] || {}
      const thread = msgs[c.id] || []
      const last = thread[thread.length-1]
      const h = hashStr(String(c.id)+'-rec')
      const minutesAgo = h % 2200
      return { c, channel: m.channel, managerName: m.managerName, status: m.status, unread: m.unread||0, last, minutesAgo }
    }).sort((a,b)=>a.minutesAgo-b.minutesAgo)
  }

  function recencyLabel(minutesAgo){
    if(minutesAgo >= 1440) return 'Kecha'
    const d = new Date(Date.now() - minutesAgo*60000)
    return timeStr(d)
  }

  function render(){
    if(clients===null){ root.innerHTML = `<div style="padding:40px;text-align:center;color:var(--mut)">Yuklanmoqda…</div>`; return }
    const all = rows()
    const totalUnread = all.reduce((a,r)=>a+r.unread,0)
    const countByChannel = {}
    CHANNELS.forEach(ch=> countByChannel[ch.key] = all.filter(r=>r.channel===ch.key).length)

    const ql = q.trim().toLowerCase()
    const shown = all.filter(r=>{
      if(fChannel && r.channel!==fChannel) return false
      if(ql && !clientName(r.c).toLowerCase().includes(ql) && !(r.last && r.last.text.toLowerCase().includes(ql))) return false
      return true
    })

    if(!activeId && shown.length) activeId = shown[0].c.id
    const activeRow = all.find(r=>r.c.id===activeId) || null

    root.innerHTML = `
      <div class="dash-head" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <h2>Chatlar</h2>
          <div style="color:var(--mut);font-size:12.5px;font-weight:700;margin-top:2px">Instagram, Facebook, Telegram va sayt orqali kelgan murojaatlar</div>
        </div>
        <span class="badge" style="background:var(--soft);color:var(--b7);font-size:12px;padding:6px 14px">${totalUnread} yangi</span>
      </div>

      ${err ? `<div class="err-box">${escapeHtml(err)}</div>` : ''}

      <div class="chat-shell">
        <div class="chat-list-col">
          <div class="chat-ch-filters">
            <button type="button" class="chat-ch-chip${fChannel===''?' on':''}" data-ch="">Barchasi <b>${all.length}</b></button>
            ${CHANNELS.map(ch=>`<button type="button" class="chat-ch-chip${fChannel===ch.key?' on':''}" data-ch="${ch.key}" style="--chc-fg:${ch.fg}">${ch.icon}<b>${countByChannel[ch.key]||0}</b></button>`).join('')}
          </div>
          <div class="fil-search" style="margin:10px 0">
            ${IC_SEARCH}<input id="ch-q" value="${escapeHtml(q)}" placeholder="Qidirish…" />
          </div>
          <div class="chat-list" id="chat-list">
            ${shown.length===0 ? `<div class="empty" style="padding:24px">Suhbat topilmadi.</div>` : shown.map(r=>chatListItemHtml(r)).join('')}
          </div>
        </div>

        <div class="chat-thread-col" id="chat-thread-col"></div>
        <div class="chat-info-col" id="chat-info-col"></div>
      </div>
    `

    renderThread(activeRow)
    renderInfo(activeRow)

    const qEl = qs('#ch-q', root); if(qEl) qEl.addEventListener('input', e=>{ q = e.target.value; render() })
    const listWrap = qs('.chat-list-col', root)
    on(listWrap, 'click', '[data-ch]', (e,btn)=>{ fChannel = btn.dataset.ch; render() })
    const listEl = qs('#chat-list', root)
    if(listEl) on(listEl, 'click', '[data-open]', (e,item)=>{
      if(recorder && recorder.clientId!==item.dataset.open) discardRecording()
      activeId = item.dataset.open
      const meta = loadMeta()
      if(meta[activeId]){ meta[activeId].unread = 0; saveMeta(meta) }
      render()
    })
  }

  function chatListItemHtml(r){
    const c = r.c
    const ch = chOf(r.channel)
    const preview = r.last ? (r.last.from==='biz' ? 'Siz: ' : '') + r.last.text : ''
    return `
      <div class="chat-list-item${activeId===c.id?' on':''}" data-open="${c.id}">
        <div class="prof-av" style="position:relative;flex:0 0 auto">
          ${escapeHtml((clientName(c)[0]||'?').toUpperCase())}
          <span class="chat-ch-dot" style="background:${ch.fg};color:#fff">${ch.icon}</span>
        </div>
        <div style="min-width:0;flex:1">
          <div style="display:flex;align-items:center;gap:6px">
            <b style="font-size:13px;color:var(--ink)">${escapeHtml(clientName(c))}</b>
            <span style="font-size:10.5px;font-weight:700;color:${ch.fg}">${escapeHtml(ch.short)}</span>
          </div>
          <div class="chat-list-preview">${escapeHtml(preview)}</div>
          <div style="font-size:10.5px;color:var(--mut);margin-top:1px">→ ${escapeHtml(r.managerName||'—')}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:0 0 auto">
          <span style="font-size:10.5px;color:var(--mut)">${recencyLabel(r.minutesAgo)}</span>
          ${r.unread>0 ? `<span class="chat-unread-dot">${r.unread}</span>` : ''}
        </div>
      </div>
    `
  }

  function renderThread(row){
    const el = qs('#chat-thread-col', root)
    if(!el) return
    if(!row){ el.innerHTML = `<div class="empty" style="padding:60px 24px;flex:1">Suhbat tanlanmagan.</div>`; return }
    const c = row.c
    const msgs = (loadMsgs())[c.id] || []
    const ch = chOf(row.channel)
    const online = hashStr(String(c.id)+'-on') % 3 === 0
    el.innerHTML = `
      <div class="chat-thread-head">
        <div class="prof-av">${escapeHtml((clientName(c)[0]||'?').toUpperCase())}</div>
        <div style="min-width:0">
          <b style="font-size:14px">${escapeHtml(clientName(c))}</b>
          <div style="font-size:11.5px;color:${online?'var(--green)':'var(--mut)'};font-weight:700;display:flex;align-items:center;gap:6px">${chBadge(row.channel)} · ${online?'Online':'Oxirgi faollik: bugun'}</div>
        </div>
        <button type="button" class="btn ghost small" id="ch-call" style="margin-left:auto">${IC_PHONE} Qo'ng'iroq</button>
      </div>
      <div class="chat-msgs" id="chat-msgs">
        ${msgs.map(m=>`
          <div class="chat-bubble-row ${m.from==='biz'?'mine':'theirs'}">
            <div class="chat-bubble ${m.from==='biz'?'mine':'theirs'}">
              ${m.type==='image' ? `<img src="${m.imageData}" class="chat-bubble-img" />${m.text ? `<div class="chat-bubble-text">${escapeHtml(m.text)}</div>` : ''}`
                : m.type==='voice' ? `<audio controls src="${m.audioData}" class="chat-bubble-audio"></audio>`
                : `<div class="chat-bubble-text">${escapeHtml(m.text)}</div>`}
              <div class="chat-bubble-time">${escapeHtml(m.time)}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="chat-attach-preview" id="chat-attach-preview">${attachPreviewHtml(attachments[c.id])}</div>
      <div class="chat-composer">
        <input type="file" id="chat-file-input" accept="image/*" style="display:none" />
        <input id="chat-input" placeholder="Xabar yozing… (Enter — yuborish)" value="${escapeHtml(drafts[c.id]||'')}" ${recorder && recorder.clientId===c.id?'disabled':''} />
        <button type="button" class="ic-btn" id="chat-attach-btn" title="Rasm biriktirish">${IC_IMAGE}</button>
        <button type="button" class="ic-btn${recorder && recorder.clientId===c.id?' recording':''}" id="chat-mic-btn" title="${recorder && recorder.clientId===c.id?"To'xtatish":'Ovozli xabar yozish'}">${recorder && recorder.clientId===c.id?IC_STOP:IC_MIC}</button>
        <button type="button" class="ic-btn accent" id="chat-send" title="Yuborish">${IC_SEND}</button>
      </div>
    `
    const msgsEl = qs('#chat-msgs', el)
    if(msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight
    const input = qs('#chat-input', el)
    input.addEventListener('input', e=>{ drafts[c.id] = e.target.value })
    input.addEventListener('keydown', e=>{ if(e.key==='Enter') sendMsg(c.id) })
    qs('#chat-send', el).addEventListener('click', ()=> sendMsg(c.id))
    qs('#ch-call', el).addEventListener('click', ()=> toast("Qo'ng'iroq funksiyasi tez orada ulanadi"))

    const fileInput = qs('#chat-file-input', el)
    qs('#chat-attach-btn', el).addEventListener('click', ()=> fileInput.click())
    fileInput.addEventListener('change', e=>{
      const file = e.target.files && e.target.files[0]
      if(!file) return
      if(!file.type.startsWith('image/')){ toast('Faqat rasm fayllarini tanlang'); return }
      const reader = new FileReader()
      reader.onload = ()=>{ attachments[c.id] = { type:'image', dataUrl: reader.result, name: file.name }; render() }
      reader.readAsDataURL(file)
    })
    const removeBtn = qs('#chat-attach-remove', el)
    if(removeBtn) removeBtn.addEventListener('click', ()=>{ attachments[c.id] = null; render() })
    qs('#chat-mic-btn', el).addEventListener('click', ()=>{
      if(recorder && recorder.clientId===c.id) stopRecording()
      else startRecording(c.id, el)
    })
  }

  function attachPreviewHtml(att){
    if(!att) return ''
    if(att.type==='image') return `
      <div class="chat-attach-chip">
        <img src="${att.dataUrl}" />
        <span>${escapeHtml(att.name||'Rasm')}</span>
        <button type="button" class="chat-attach-remove" id="chat-attach-remove" title="Bekor qilish">${IC_CLOSE_SM}</button>
      </div>`
    if(att.type==='voice') return `
      <div class="chat-attach-chip">
        <span>🎙 Ovozli xabar (${att.duration}s)</span>
        <audio controls src="${att.dataUrl}" style="height:30px;max-width:180px"></audio>
        <button type="button" class="chat-attach-remove" id="chat-attach-remove" title="Bekor qilish">${IC_CLOSE_SM}</button>
      </div>`
    return ''
  }

  // ---------------- Ovozli xabar yozib olish (MediaRecorder) ----------------
  function startRecording(clientId, el){
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder==='undefined'){
      toast("Brauzeringiz ovoz yozishni qo'llamaydi"); return
    }
    navigator.mediaDevices.getUserMedia({ audio:true }).then(stream=>{
      let mr
      try{ mr = new MediaRecorder(stream) }catch(ex){ toast('Ovoz yozishni boshlab bo\'lmadi'); stream.getTracks().forEach(t=>t.stop()); return }
      const chunks = []
      const rec = { stream, mediaRecorder:mr, clientId, startTs: Date.now(), discard:false }
      mr.ondataavailable = e=>{ if(e.data && e.data.size>0) chunks.push(e.data) }
      mr.onstop = ()=>{
        stream.getTracks().forEach(t=>t.stop())
        if(rec.discard){ if(recorder===rec) recorder = null; return }
        const durationSec = Math.max(1, Math.round((Date.now()-rec.startTs)/1000))
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' })
        const reader = new FileReader()
        reader.onload = ()=>{
          attachments[clientId] = { type:'voice', dataUrl: reader.result, duration: durationSec }
          if(recorder===rec) recorder = null
          render()
        }
        reader.readAsDataURL(blob)
      }
      recorder = rec
      mr.start()
      const btn = qs('#chat-mic-btn', el)
      if(btn){ btn.classList.add('recording'); btn.innerHTML = IC_STOP; btn.title = "To'xtatish" }
      const inputEl = qs('#chat-input', el); if(inputEl) inputEl.disabled = true
    }).catch(()=>{ toast('Mikrofonga ruxsat berilmadi') })
  }
  function stopRecording(){
    if(recorder && recorder.mediaRecorder && recorder.mediaRecorder.state!=='inactive') recorder.mediaRecorder.stop()
  }
  function discardRecording(){
    if(!recorder) return
    recorder.discard = true
    try{
      if(recorder.mediaRecorder && recorder.mediaRecorder.state!=='inactive') recorder.mediaRecorder.stop()
      else if(recorder.stream) recorder.stream.getTracks().forEach(t=>t.stop())
    }catch(ex){}
    recorder = null
  }

  function sendMsg(clientId){
    const text = (drafts[clientId]||'').trim()
    const att = attachments[clientId]
    if(!text && !att) return
    const msgs = loadMsgs()
    if(!msgs[clientId]) msgs[clientId] = []
    if(att && att.type==='image'){
      msgs[clientId].push({ from:'biz', type:'image', imageData: att.dataUrl, text, time: timeStr(new Date()) })
    } else if(att && att.type==='voice'){
      msgs[clientId].push({ from:'biz', type:'voice', audioData: att.dataUrl, duration: att.duration, time: timeStr(new Date()) })
      if(text) msgs[clientId].push({ from:'biz', type:'text', text, time: timeStr(new Date()) })
    } else {
      msgs[clientId].push({ from:'biz', type:'text', text, time: timeStr(new Date()) })
    }
    saveMsgs(msgs)
    drafts[clientId] = ''
    attachments[clientId] = null
    render()
  }

  function renderInfo(row){
    const el = qs('#chat-info-col', root)
    if(!el) return
    if(!row){ el.innerHTML = ''; return }
    const c = row.c
    const F = (label, html) => `<div class="chat-info-f"><label>${escapeHtml(label)}</label><div>${html}</div></div>`
    el.innerHTML = `
      <div class="chat-info-sec">
        <div class="chat-info-title">Mijoz ma'lumoti</div>
        ${F('Ism', `<b>${escapeHtml(clientName(c))}</b>`)}
        ${F('Kanal', chBadge(row.channel, true))}
        ${F('Menejer', escapeHtml(row.managerName||'—'))}
        ${F('Status', statusBadge(row.status))}
        ${c.phone ? F('Telefon', `<a href="tel:${c.phone.replace(/\s/g,'')}" style="color:var(--b7);text-decoration:none;font-weight:700">${escapeHtml(c.phone)}</a>`) : ''}
        ${c.tariff ? F('Tarif', `<span class="ud-tariff-chip">${escapeHtml(c.tariff)}</span>`) : ''}
      </div>
      <div class="chat-info-sec">
        <div class="chat-info-title">Tezkor amallar</div>
        <button type="button" class="btn" id="ch-lead" style="width:100%;margin-bottom:9px">+ Lid yaratish</button>
        <button type="button" class="btn ghost" id="ch-task" style="width:100%">${IC_NOTE2} Vazifa qo'shish</button>
      </div>
    `
    qs('#ch-lead', el).addEventListener('click', ()=> toast(`"${clientName(c)}" uchun lid yaratildi`))
    qs('#ch-task', el).addEventListener('click', ()=> toast("Vazifa qo'shish — Vazifalar bo'limidan amalga oshiriladi"))
  }

  load()
  return function cleanup(){ discardRecording() }
}
