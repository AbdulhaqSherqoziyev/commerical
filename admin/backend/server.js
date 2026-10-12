/* ZOOD Prezentatsiya — Super Admin backend.
   Nol tashqi kutubxona (faqat Node built-in). Xavfsizlik: scrypt parol-hash,
   HMAC imzolangan token (JWT-ga o'xshash), login rate-limit, input validatsiya,
   xavfsizlik header'lari, band subdomenlar, atomik yozuv. */
'use strict';
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.ZOOD_DATA || '/var/www/zood-admin/data';
const ORGS_FILE = path.join(DATA_DIR, 'orgs.json');
const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json');
const CONF_FILE = path.join(DATA_DIR, 'config.json');
const STAFF_FILE = path.join(DATA_DIR, 'staff.json'); // Super Admin xodimlari (kichik hisoblar)
const DEPT_FILE = path.join(DATA_DIR, 'departments.json'); // Bo'limlar (xodim qaysi bo'limga tegishli — faqat ma'lumot/filtr uchun)
// Tashkilot sozlamalari (imkoniyatlar/dostup, narxlar, bloklash moslamalari,
// to'lov tashkilotlari). ATAYLAB alohida faylda — clients.json dagi 1593 ta
// yozuvga tegmaydi, shuning uchun buzilish xavfi yo'q. Kalit — mijoz id'si.
const CLIENT_SETTINGS_FILE = path.join(DATA_DIR, 'client-settings.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
// ---- VAZIFALAR (Tasks/loyihalar boshqaruvi) ----
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const LABELS_FILE = path.join(DATA_DIR, 'labels.json');
const NOTIFS_FILE = path.join(DATA_DIR, 'notifications.json');
const ACTS_FILE = path.join(DATA_DIR, 'activity.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.log');
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const TOKEN_TTL = 8 * 3600 * 1000; // 8 soat
const MAX_BODY = 700 * 1024; // 700KB (logo base64 uchun)
const RESERVED = ['www','api','admin','superadmin','market','uploads','mail','ftp','ns1','ns2','root','test','paperco','app','panel','static','cdn','assets'];

fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- storage (atomik) ----------
function readJSON(f, def){ try { return JSON.parse(fs.readFileSync(f,'utf8')); } catch(e){ return def; } }
function writeJSON(f, obj){ const tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(obj,null,2)); fs.renameSync(tmp, f); }

// ---------- config / admin parol ----------
function loadConfig(){
  let c = readJSON(CONF_FILE, null);
  if(!c){
    // birinchi ishga tushirishda: ENV'dan boshlang'ich admin, aks holda tasodifiy
    const user = process.env.ADMIN_USER || 'admin';
    const pass = process.env.ADMIN_PASS || crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g,'').slice(0,10);
    const secret = crypto.randomBytes(32).toString('hex');
    c = { user, pass: hashPass(pass), secret, tokenVersion: 1, createdAt: Date.now() };
    writeJSON(CONF_FILE, c);
    console.log('=== BOSHLANG\'ICH ADMIN YARATILDI ===');
    console.log('  login: '+user);
    console.log('  parol: '+pass+'   (buni saqlang! config.json da faqat hash bor)');
  }
  // migratsiya: eski config'da tokenVersion bo'lmasa qo'shamiz (barcha eski tokenlar bekor bo'ladi)
  if(c.tokenVersion == null){ c.tokenVersion = 1; try { writeJSON(CONF_FILE, c); } catch(e){} }
  return c;
}
function hashPass(pw){ const salt = crypto.randomBytes(16); const dk = crypto.scryptSync(pw, salt, 32); return 's1$'+salt.toString('hex')+'$'+dk.toString('hex'); }
function verifyPass(pw, stored){ try { const [,saltHex,hashHex] = stored.split('$'); const salt = Buffer.from(saltHex,'hex'); const dk = crypto.scryptSync(pw, salt, 32); return crypto.timingSafeEqual(dk, Buffer.from(hashHex,'hex')); } catch(e){ return false; } }
let CONFIG = loadConfig();

// ---------- token (HMAC imzolangan) ----------
function b64u(b){ return Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function signToken(payload){ const body = b64u(JSON.stringify(payload)); const sig = b64u(crypto.createHmac('sha256', CONFIG.secret).update(body).digest()); return body+'.'+sig; }
// Token egasi — asosiy admin ("owner", CONFIG'dan) yoki xodim (staff.json'dan,
// p.sub = xodim id). Xodim uchun rol/faollik HAR DOIM staff.json'dan LIVE
// o'qiladi — shu bilan xodim o'chirilsa/faolsizlantirilsa, eski tokeni ham
// darhol ishlamay qoladi (qayta login qilishi shart emas, keyingi so'rovda
// avtomatik rad etiladi).
function verifyToken(tok){
  try {
    const [body,sig] = String(tok).split('.');
    const exp = b64u(crypto.createHmac('sha256', CONFIG.secret).update(body).digest());
    if(sig.length!==exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return null;
    const p = JSON.parse(Buffer.from(body.replace(/-/g,'+').replace(/_/g,'/'),'base64'));
    if(!p || p.exp < Date.now()) return null;
    const sub = p.sub || 'owner'; // eski (shu o'zgarishdan oldingi) tokenlarda sub yo'q — hammasi owner edi
    if(sub === 'owner'){
      if(p.tv !== CONFIG.tokenVersion) return null; // parol/login o'zgarsa — barcha eski tokenlar bekor
      p.sub = 'owner'; p.role = 'admin';
      return p;
    }
    const s = readJSON(STAFF_FILE, []).find(x=>x.id===sub);
    if(!s || !s.active) return null;
    if(p.tv !== (s.tokenVersion||1)) return null;
    p.sub = sub; p.role = (s.role==='admin' ? 'admin' : 'xodim'); p.u = s.login;
    return p;
  } catch(e){ return null; }
}

// ---------- rate limit (login) ----------
const loginHits = new Map();
function rateLimited(ip){ const now = Date.now(); const rec = loginHits.get(ip) || {c:0,t:now}; if(now - rec.t > 15*60*1000){ rec.c=0; rec.t=now; } rec.c++; loginHits.set(ip, rec); return rec.c > 10; }

// ---------- validatsiya ----------
function validColor(c){ return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c); }
function validSub(s){ return typeof s === 'string' && /^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])?$/.test(s) && RESERVED.indexOf(s) < 0; }
// SVG qabul qilinmaydi — SVG ichida skript bo'lishi mumkin (XSS xavfi). Faqat rasterli rasm.
function validLogo(d){ if(!d) return true; return typeof d === 'string' && /^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(d) && d.length < 600*1024; }
const ALLOWED_MODS = ['agent_web','agent_mobil','agent_app','client','investor','webstore','market','ican_mobil'];

// ---------- Xarita havolasi (Google Maps) -> lat/lng ----------
// Ko'p tashkilotlar aniq lat/lng kiritmaydi, lekin Google Maps'dan nusxalangan
// havola (masalan https://maps.app.goo.gl/xxxx yoki https://www.google.com/maps/...)
// qo'yadi. Bunday havolalarning aksariyati (to'liq yoki qisqartirilgan) ichida
// yoki qayta yo'naltirilgandan keyingi to'liq URL'da koordinata bo'ladi —
// shuni ajratib olib, "taxminiy lokatsiya" sifatida xaritada ko'rsatamiz.
function extractLatLngFromUrl(u){
  if(!u || typeof u !== 'string') return null;
  const tryPair = (lat,lng)=>{
    lat = Number(lat); lng = Number(lng);
    if(Number.isFinite(lat) && Number.isFinite(lng) && lat>=-90 && lat<=90 && lng>=-180 && lng<=180) return {lat,lng};
    return null;
  };
  let m = u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/); // aniq joy pini (place data blob)
  if(m){ const r = tryPair(m[1],m[2]); if(r) return r; }
  m = u.match(/[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/); // "pin tashlash" havolasi
  if(m){ const r = tryPair(m[1],m[2]); if(r) return r; }
  m = u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/); // xarita markazi (@lat,lng,zoom)
  if(m){ const r = tryPair(m[1],m[2]); if(r) return r; }
  return null;
}
// Havolani (qisqartirilgan bo'lsa) qayta yo'naltirishlar bo'yicha kuzatib,
// har bosqichda koordinata borligini tekshiradi. Tarmoq xatosi/vaqt tugashi —
// jim xato (cb(null)) qaytaradi, chaqiruvchi funksiyalarni buzmaydi.
function resolveMapUrl(mapUrl, cb){
  const direct = extractLatLngFromUrl(mapUrl);
  if(direct) return cb(direct);
  if(!/^https:\/\//i.test(mapUrl)) return cb(null);
  let hops = 0;
  const follow = (u)=>{
    if(hops++ >= 6) return cb(null);
    let parsed; try { parsed = new URL(u); } catch(e){ return cb(null); }
    const req = https.request({
      hostname: parsed.hostname, path: parsed.pathname+parsed.search, method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZoodMapBot/1.0)' }, timeout: 8000,
    }, (r)=>{
      r.resume(); // body kerak emas — faqat header/redirect
      const loc = r.headers && r.headers.location;
      if(r.statusCode>=300 && r.statusCode<400 && loc){
        const next = /^https?:\/\//i.test(loc) ? loc : (parsed.origin + loc);
        const found = extractLatLngFromUrl(next);
        if(found) return cb(found);
        return follow(next);
      }
      const found = extractLatLngFromUrl(u);
      cb(found || null);
    });
    req.on('error', ()=> cb(null));
    req.on('timeout', ()=>{ req.destroy(); cb(null); });
    req.end();
  };
  follow(mapUrl);
}
// Berilgan tashkilot uchun (fon rejimida, javobni kutmasdan) xarita havolasini
// yechib, mapLat/mapLng maydonlariga yozadi. Faqat mapUrl mavjud va hali
// shu havola uchun yechilmagan bo'lsa ishlaydi (qayta-qayta so'rov yubormaslik).
function scheduleMapUrlResolve(id, mapUrl){
  if(!mapUrl) return;
  resolveMapUrl(mapUrl, (coords)=>{
    try{
      const orgs = readJSON(ORGS_FILE, []);
      const idx = orgs.findIndex(x=>x.id===id);
      if(idx<0) return;
      orgs[idx].mapUrlResolvedFor = mapUrl;
      orgs[idx].mapLat = coords ? coords.lat : null;
      orgs[idx].mapLng = coords ? coords.lng : null;
      writeJSON(ORGS_FILE, orgs);
    }catch(e){ /* fon vazifasi — xatoni yutamiz */ }
  });
}
const ALLOWED_STATUS = ['new','talks','contract','active'];
function cleanOrg(inp){
  const name = String(inp.name||'').trim().slice(0,60);
  const sub = String(inp.subdomain||'').trim().toLowerCase();
  if(!name) throw 'Tashkilot nomi kerak';
  if(!validSub(sub)) throw 'Subdomen noto\'g\'ri yoki band (faqat a-z, 0-9, -)';
  if(!validColor(inp.color)) throw 'Asosiy rang noto\'g\'ri';
  if(inp.color2 && !validColor(inp.color2)) throw 'Ikkinchi rang noto\'g\'ri';
  if(!validLogo(inp.logo)) throw 'Logo noto\'g\'ri (rasm, <600KB)';
  if(!validLogo(inp.logoWhite)) throw 'Oq logo noto\'g\'ri';
  const out = { name, subdomain: sub, color: inp.color, color2: inp.color2 || '', logo: inp.logo||'', logoWhite: inp.logoWhite||'' };
  // bo'limlar (modullar): faqat ruxsat etilgan kalitlar; berilmasa -> hammasi ko'rinadi
  if(Array.isArray(inp.modules)) out.modules = inp.modules.filter(function(m){ return ALLOWED_MODS.indexOf(m) >= 0; });
  // ---- Manzil / lokatsiya / kontakt / holat (OrgForm.jsx shu maydonlarni yuboradi,
  // ilgari bu yerda whitelist qilinmagani sabab HAR DOIM sukut bilan tashlab
  // yuborilar edi — Xarita bo'limi va CRM funksiyalari shu sabab ishlamayotgan edi) ----
  const S = (v,n)=>String(v==null?'':v).trim().slice(0,n);
  out.region   = S(inp.region,40);
  out.district = S(inp.district,40);
  out.contact  = S(inp.contact,60);
  out.mapUrl   = S(inp.mapUrl,300);
  if(out.mapUrl && !/^https?:\/\//i.test(out.mapUrl)) throw 'Xarita havolasi noto\'g\'ri (https:// bilan boshlansin)';
  out.phone = S(inp.phone,30);
  if(out.phone && !/^[0-9+\-\s()]{5,30}$/.test(out.phone)) throw 'Telefon raqami noto\'g\'ri';
  const hasLat = inp.lat!==null && inp.lat!==undefined && inp.lat!=='';
  const hasLng = inp.lng!==null && inp.lng!==undefined && inp.lng!=='';
  const lat = Number(inp.lat), lng = Number(inp.lng);
  if(hasLat && hasLng && Number.isFinite(lat) && Number.isFinite(lng) && lat>=-90 && lat<=90 && lng>=-180 && lng<=180){ out.lat=lat; out.lng=lng; }
  else { out.lat=null; out.lng=null; }
  const st = String(inp.status||'new');
  out.status = ALLOWED_STATUS.indexOf(st)>=0 ? st : 'new';
  if(Array.isArray(inp.dealItems)) out.dealItems = inp.dealItems.map(function(x){ return String(x).slice(0,60); }).slice(0,30);
  const da = Number(inp.dealAmount); out.dealAmount = Number.isFinite(da) && da>=0 ? Math.floor(da) : 0;
  return out;
}

// ---------- MIJOZLAR (clients) — sodda CRM (prezentatsiyadan alohida) ----------
const CLIENT_STATUSES = ['faol','yopilgan','limit','bloklangan'];
function cleanClient(inp){
  const name = String(inp.name || inp.company || '').trim().slice(0,80);
  if(!name) throw 'Firma nomi kerak';
  const out = { name };
  out.phone   = String(inp.phone||'').trim().slice(0,30);
  if(out.phone && !/^[0-9+\-\s()]{5,30}$/.test(out.phone)) throw 'Telefon raqami noto\'g\'ri';
  out.address = String(inp.address||'').trim().slice(0,200);
  out.region  = String(inp.region||'').trim().slice(0,40);
  out.district= String(inp.district||'').trim().slice(0,40);
  out.contact = String(inp.contact||'').trim().slice(0,60);
  if(!validLogo(inp.logo)) throw 'Logo noto\'g\'ri (rasm, <600KB)';
  out.logo = inp.logo || '';
  const hasLat = inp.lat!==null && inp.lat!==undefined && inp.lat!=='';
  const hasLng = inp.lng!==null && inp.lng!==undefined && inp.lng!=='';
  const lat = Number(inp.lat), lng = Number(inp.lng);
  if(hasLat && hasLng && Number.isFinite(lat) && Number.isFinite(lng) && lat>=-90 && lat<=90 && lng>=-180 && lng<=180){ out.lat=lat; out.lng=lng; }
  else { out.lat=null; out.lng=null; }
  out.note = String(inp.note||'').trim().slice(0,500);
  // Qo'shimcha (ICAN uslubidagi) maydonlar — ixtiyoriy, matn sifatida saqlanadi.
  // Eslatma: direktor paroli, integratsiya/narx maydonlari SAQLANMAYDI (xavfsizlik/ko'rinish uchun).
  const S = (v,n)=>String(v==null?'':v).trim().slice(0,n);
  out.company     = S(inp.company,80);
  out.parent      = S(inp.parent,80);
  out.partner     = S(inp.partner,80);
  out.tariff      = S(inp.tariff,40);
  out.balanceLimit= S(inp.balanceLimit,40);
  out.qqs         = S(inp.qqs,10);
  out.bonusMonths = S(inp.bonusMonths,10);
  out.setupDate   = S(inp.setupDate,20);
  out.bank        = S(inp.bank,80);
  out.inn         = S(inp.inn,20);
  out.mfo         = S(inp.mfo,20);
  out.account     = S(inp.account,40);
  out.contractNo  = S(inp.contractNo,40);
  out.dirName     = S(inp.dirName,80);
  out.dirLogin    = S(inp.dirLogin,80);
  out.dirPhone    = S(inp.dirPhone,30);
  out.dirRole     = S(inp.dirRole,40);
  out.status      = CLIENT_STATUSES.indexOf(String(inp.status||'').trim()) >= 0 ? String(inp.status).trim() : 'faol';
  return out;
}

// ---------- XODIMLAR (Super Admin panelga kiritiladigan kichik hisoblar) ----------
const STAFF_ROLES = ['admin','xodim'];
function cleanStaff(inp, existingLogins){
  const S = (v,n)=>String(v==null?'':v).trim().slice(0,n);
  const firstName = S(inp.firstName,40);
  if(!firstName) throw 'Ism kerak';
  const lastName = S(inp.lastName,40);
  const login = S(inp.login,40);
  if(!/^[a-zA-Z0-9._@-]{3,40}$/.test(login)) throw 'Login 3-40 belgi bo\'lsin (a-z, 0-9, . _ - @)';
  if(existingLogins.has(login.toLowerCase())) throw 'Bu login band';
  const position = S(inp.position,60);
  const phone = S(inp.phone,30);
  if(phone && !/^[0-9+\-\s()]{5,30}$/.test(phone)) throw 'Telefon raqami noto\'g\'ri';
  // Bo'lim — faqat ma'lumot/filtr uchun (ruxsatni CHEKLAMAYDI — xodim baribir
  // barcha tashkilotlar/mijozlar bilan ishlay oladi, bu shunchaki qaysi
  // bo'limga tegishli ekanini belgilab qo'yish uchun).
  const department = S(inp.department,60);
  const sip = S(inp.sip,20);
  if(sip && !/^[0-9+\-\s]{2,20}$/.test(sip)) throw 'SIP raqam noto\'g\'ri';
  const role = STAFF_ROLES.indexOf(inp.role)>=0 ? inp.role : 'xodim';
  return { firstName, lastName, login, position, phone, department, sip, role };
}
function validNewPassword(pw){
  if(pw.length < 8) return 'Parol kamida 8 belgi';
  if(!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Parolda kamida bitta harf va bitta raqam bo\'lsin';
  return null;
}

// ---------- VAZIFALAR: ijrochi (actor) manbai ----------
// Alohida "a'zo"/workspace tushunchasi yo'q — mavjud owner (asosiy admin) +
// staff.json ro'yxati ijrochi/jamoa a'zosi sifatida ishlatiladi. Har doim
// staff.json'dan LIVE o'qiladi (xodim faolsizlansa/o'chirilsa darhol yo'qoladi).
function actorName(id){
  if(!id) return '';
  if(id === 'owner'){
    const p = CONFIG.profile || {};
    const full = [p.firstName,p.lastName].filter(Boolean).join(' ').trim();
    return full || CONFIG.user;
  }
  const s = readJSON(STAFF_FILE, []).find(x=>x.id===id);
  if(!s) return 'Noma\'lum';
  const full = [s.firstName,s.lastName].filter(Boolean).join(' ').trim();
  return full || s.login;
}
function allActors(){
  const p = CONFIG.profile || {};
  const ownerName = [p.firstName,p.lastName].filter(Boolean).join(' ').trim() || CONFIG.user;
  const staff = readJSON(STAFF_FILE, []).filter(s=>s.active);
  return [{ id:'owner', name: ownerName, role:'admin', position: p.position||'' }]
    .concat(staff.map(s=>({ id:s.id, name:[s.firstName,s.lastName].filter(Boolean).join(' ').trim()||s.login, role:s.role||'xodim', position:s.position||'' })));
}
function actorExists(id){
  if(!id) return true; // bo'sh — hali ijrochi biriktirilmagan
  if(id==='owner') return true;
  return readJSON(STAFF_FILE, []).some(x=>x.id===id && x.active);
}
function addNotification(userId, type, text, meta){
  if(!userId) return;
  const list = readJSON(NOTIFS_FILE, []);
  list.unshift({ id:genId(), userId, type:String(type||''), text:String(text||'').slice(0,300), meta: meta||{}, read:false, createdAt: Date.now() });
  if(list.length>500) list.length = 500;
  writeJSON(NOTIFS_FILE, list);
}
function addActivity(actorId, action, text, meta){
  const list = readJSON(ACTS_FILE, []);
  list.unshift({ id:genId(), actor:actorId, actorName:actorName(actorId), action:String(action||''), text:String(text||'').slice(0,300), meta: meta||{}, at: Date.now() });
  if(list.length>500) list.length = 500;
  writeJSON(ACTS_FILE, list);
}

// ---------- VAZIFALAR: loyiha / vazifa validatsiyasi ----------
const TASK_STATUS = ['todo','progress','review','done'];
const TASK_PRIORITY = ['low','medium','high'];
function cleanProject(inp){
  const S=(v,n)=>String(v==null?'':v).trim().slice(0,n);
  const name = S(inp.name,80);
  if(!name) throw 'Loyiha nomi kerak';
  const desc = S(inp.desc,500);
  const icon = S(inp.icon,10) || '📁';
  const color = validColor(inp.color) ? inp.color : '#0C6440';
  return { name, desc, icon, color };
}
function cleanTask(inp, projects){
  const S=(v,n)=>String(v==null?'':v).trim().slice(0,n);
  const title = S(inp.title,150);
  if(!title) throw 'Sarlavha kerak';
  const projectId = S(inp.projectId,20);
  if(!projects.some(p=>p.id===projectId)) throw 'Loyiha topilmadi';
  const desc = S(inp.desc,2000);
  const status = TASK_STATUS.indexOf(inp.status)>=0 ? inp.status : 'todo';
  const priority = TASK_PRIORITY.indexOf(inp.priority)>=0 ? inp.priority : 'medium';
  const assignee = S(inp.assignee,20);
  if(assignee && !actorExists(assignee)) throw 'Ijrochi topilmadi';
  const dueDate = S(inp.dueDate,20);
  if(dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw 'Sana noto\'g\'ri (YYYY-MM-DD)';
  const labels = Array.isArray(inp.labels) ? inp.labels.map(x=>S(x,20)).filter(Boolean).slice(0,10) : [];
  return { title, projectId, desc, status, priority, assignee, dueDate, labels };
}

// ---------- helpers ----------
function send(res, code, obj, extra){ const body = JSON.stringify(obj); res.writeHead(code, Object.assign({
  'Content-Type':'application/json; charset=utf-8',
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Referrer-Policy':'no-referrer',
  'Cache-Control':'no-store'
}, extra||{})); res.end(body); }
function readBody(req){ return new Promise((resolve,reject)=>{ let d=''; let size=0; req.on('data',c=>{ size+=c.length; if(size>MAX_BODY){ reject('Katta so\'rov'); req.destroy(); } d+=c; }); req.on('end',()=>{ try{ resolve(d?JSON.parse(d):{}); }catch(e){ reject('JSON xato'); } }); req.on('error',reject); }); }
function auth(req){ const h = req.headers['authorization']||''; const m = h.match(/^Bearer (.+)$/); if(!m) return null; return verifyToken(m[1]); }
// Haqiqiy client IP: nginx X-Forwarded-For'ning ENG OXIRGI qiymatini qo'shadi (uni soxtalashtirib bo'lmaydi).
// Birinchi qiymatga ishonish rate-limit'ni aylanib o'tishga imkon berardi — shuning uchun oxirgisini olamiz.
function ip(req){ const xff=String(req.headers['x-forwarded-for']||'').split(',').map(s=>s.trim()).filter(Boolean); return xff.length ? xff[xff.length-1] : (req.socket.remoteAddress || '?'); }
// Audit jurnali — kim/qachon/qayerdan kirdi, muvaffaqiyatsiz urinishlar, parol o'zgarishi
function audit(action, req, ok, extra){ try { fs.appendFileSync(AUDIT_FILE, JSON.stringify(Object.assign({ t:new Date().toISOString(), ip:ip(req), action, ok:!!ok }, extra||{}))+'\n'); } catch(e){} }
function genId(){ return crypto.randomBytes(8).toString('hex'); }

// ---------- tranzaksiyalar ----------
// Filial hisobvarag'i bo'yicha kirim/chiqim yozuvlari. Bitta JSON massiv:
// yozuvlar soni ko'paysa ham o'qish tez bo'lishi uchun yangi yozuv
// OXIRIGA qo'shiladi, o'qishda esa teskari tartibda beriladi.
const TX_TYPES = ['DAROMAD', 'CHIQIM'];
const TX_PAY = ['ONLAYN', 'TIZIM', 'NAQD', 'BANK'];
const TX_BAL = ['ASOSIY', 'XIZMATLAR'];
const TX_STATUS = ['Muvaffaqiyatli tugadi', 'Kutilmoqda', 'Bekor qilingan'];
const TX_MAX = 100000;   // fayl cheksiz o'smasin

function readTx(){ const a = readJSON(TRANSACTIONS_FILE, []); return Array.isArray(a) ? a : []; }

// Sana -> "YYYY-MM". Hisobot oylar kesimida tuziladi.
function ymOf(ms){
  const d = new Date(ms);
  if(isNaN(d)) return '';
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
// Oxirgi n oyning kalitlari, eskisidan yangisiga
function lastMonths(n){
  const out = [];
  const d = new Date();
  d.setDate(1);
  for(let i = n - 1; i >= 0; i--){
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'));
  }
  return out;
}

// Balans HAR DOIM tranzaksiyalardan hisoblanadi — alohida saqlanmaydi,
// shuning uchun yozuv qo'shilsa yoki o'chirilsa u o'z-o'zidan to'g'ri
// bo'lib qoladi (ikki joyda saqlansa ular bir-biriga mos kelmay qolardi).
function emptyBal(){ return { asosiy: 0, xizmatlar: 0, daromad: 0, chiqim: 0, balans: 0 }; }
function addTx(b, t){
  const sign = t.type === 'CHIQIM' ? -1 : 1;
  if(sign < 0) b.chiqim += t.sum; else b.daromad += t.sum;
  b.balans += sign * t.sum;
  if(t.bal === 'XIZMATLAR') b.xizmatlar += sign * t.sum; else b.asosiy += sign * t.sum;
  return b;
}

// Kiruvchi ma'lumotni tozalaydi. Xato bo'lsa matn qaytaradi (null — yaxshi).
function cleanTx(b, clientId){
  if(!b || typeof b !== 'object') return { err: 'Bo\'sh so\'rov' };
  const type = String(b.type || '').toUpperCase();
  if(!TX_TYPES.includes(type)) return { err: 'Turi notog\'ri (DAROMAD yoki CHIQIM)' };
  const sum = Math.round(Number(b.sum) || 0);
  if(!(sum > 0)) return { err: 'Summa musbat bo\'lishi kerak' };
  if(sum > 1e12) return { err: 'Summa juda katta' };
  const pay = TX_PAY.includes(String(b.pay || '').toUpperCase()) ? String(b.pay).toUpperCase() : 'TIZIM';
  const bal = TX_BAL.includes(String(b.bal || '').toUpperCase()) ? String(b.bal).toUpperCase() : 'ASOSIY';
  const status = TX_STATUS.includes(b.status) ? b.status : TX_STATUS[0];
  return { tx: {
    id: genId(),
    clientId,
    type, sum, pay, bal, status,
    reason: String(b.reason || '').trim().slice(0, 120),
    note: String(b.note || '').trim().slice(0, 300),
    createdAt: Date.now(),
  }};
}

// Audit faylining faqat OXIRGI qismini o'qiydi — fayl vaqt o'tib kattalashadi,
// har so'rovda butunlay o'qish shart emas. Birinchi (chala) qator tashlanadi.
function auditTail(maxBytes){
  try {
    const st = fs.statSync(AUDIT_FILE);
    const len = Math.min(st.size, maxBytes);
    const buf = Buffer.alloc(len);
    const fd = fs.openSync(AUDIT_FILE, 'r');
    try { fs.readSync(fd, buf, 0, len, st.size - len); } finally { fs.closeSync(fd); }
    const lines = buf.toString('utf8').split('\n').filter(Boolean);
    if(len < st.size) lines.shift();
    return lines.map(l => { try { return JSON.parse(l); } catch(e){ return null; } }).filter(Boolean);
  } catch(e){ return []; }
}

// Sozlama o'zgarishini "nima -> nima" ko'rinishidagi ro'yxatga aylantiradi.
// Tarix oynasida shu ro'yxat ko'rsatiladi. Juda uzun bo'lib ketmasligi uchun
// eng ko'pi 60 ta band saqlanadi (qolgani "yana N ta" deb hisoblanadi).
function diffSettings(cur, next){
  const out = [];
  let extra = 0;
  const push = (kind, key, from, to) => { if(out.length < 60) out.push({ kind, key, from, to }); else extra++; };
  const maps = [['cap','capabilities'],['blk','blockers'],['pay','payOrgs'],['price','prices']];
  for(const [kind, f] of maps){
    const a = cur[f] || {}, b = next[f] || {};
    for(const k of new Set([...Object.keys(a), ...Object.keys(b)])){
      const va = a[k] == null ? (kind === 'price' ? 0 : false) : a[k];
      const vb = b[k] == null ? (kind === 'price' ? 0 : false) : b[k];
      if(va !== vb) push(kind, k, va, vb);
    }
  }
  for(const f of ['blacklist','myuzcard','myuzcardAuto','atmosId']){
    const va = cur[f] == null ? (f === 'atmosId' ? '' : false) : cur[f];
    const vb = next[f] == null ? (f === 'atmosId' ? '' : false) : next[f];
    if(va !== vb) push('flag', f, va, vb);
  }
  {
    const a = cur.extras || {}, b = next.extras || {};
    for(const k of new Set([...Object.keys(a), ...Object.keys(b)])){
      if((a[k] || '') !== (b[k] || '')) push('extra', k, a[k] || '', b[k] || '');
    }
  }
  return { changes: out, extra };
}

// ---------- router ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const method = req.method;
  try {
    // ---- PUBLIC: brand by subdomain (prezentatsiya shu orqali brendini oladi) ----
    if(method==='GET' && p==='/api/brand'){
      const sub = (url.searchParams.get('sub')||'').toLowerCase();
      const orgs = readJSON(ORGS_FILE, []);
      const o = orgs.find(x=>x.subdomain===sub && x.enabled);
      if(!o) return send(res,404,{error:'not found'}, {'Access-Control-Allow-Origin':'*','Cache-Control':'public,max-age=30'});
      return send(res,200,{name:o.name,color:o.color,color2:o.color2,logo:o.logo,logoWhite:o.logoWhite,modules:o.modules}, {'Access-Control-Allow-Origin':'*','Cache-Control':'public,max-age=30'});
    }
    // ---- AUTH: login ----
    if(method==='POST' && p==='/api/auth/login'){
      if(rateLimited(ip(req))){ audit('login_ratelimited', req, false); return send(res,429,{error:'Juda ko\'p urinish. 15 daqiqa kuting.'}); }
      const b = await readBody(req);
      const uname = String(b.username||'');
      // 1) asosiy admin (owner)
      if(uname === CONFIG.user && verifyPass(String(b.password||''), CONFIG.pass)){
        const token = signToken({ sub:'owner', u: CONFIG.user, tv: CONFIG.tokenVersion, role:'admin', exp: Date.now()+TOKEN_TTL });
        audit('login', req, true, { user: CONFIG.user });
        return send(res,200,{ ok:true, token, user: CONFIG.user });
      }
      // 2) xodim (staff.json)
      const s = readJSON(STAFF_FILE, []).find(x => x.active && x.login.toLowerCase() === uname.toLowerCase());
      if(s && verifyPass(String(b.password||''), s.pass)){
        const token = signToken({ sub:s.id, u:s.login, tv:(s.tokenVersion||1), role:(s.role==='admin'?'admin':'xodim'), exp: Date.now()+TOKEN_TTL });
        audit('login', req, true, { user: s.login });
        return send(res,200,{ ok:true, token, user: s.login });
      }
      audit('login', req, false, { user: uname.slice(0,40) });
      return send(res,401,{error:'Login yoki parol xato'});
    }
    // ---- AUTH: parol (va owner uchun ixtiyoriy login) ni o'zgartirish — shu hisobning barcha sessiyalari chiqadi ----
    if(method==='POST' && p==='/api/auth/password'){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      const b = await readBody(req);
      if(u.sub === 'owner'){
        if(!verifyPass(String(b.old||''), CONFIG.pass)){ audit('credential_change', req, false); return send(res,400,{error:'Joriy parol xato'}); }
        const npw = String(b.new||'');
        const nu = (b.newUser!=null) ? String(b.newUser).trim() : '';
        const changingPass = npw.length > 0;
        const changingUser = nu !== '' && nu !== CONFIG.user;
        if(!changingPass && !changingUser) return send(res,400,{error:'O\'zgartirish uchun yangi login yoki yangi parol kiriting'});
        if(changingPass){ const err = validNewPassword(npw); if(err) return send(res,400,{error:err}); }
        if(changingUser){
          if(!/^[a-zA-Z0-9._@-]{3,40}$/.test(nu)) return send(res,400,{error:'Login 3-40 belgi bo\'lsin (a-z, 0-9, . _ - @)'});
          const staffLogins = readJSON(STAFF_FILE, []).map(s=>s.login.toLowerCase());
          if(staffLogins.indexOf(nu.toLowerCase())>=0) return send(res,409,{error:'Bu login band'});
          CONFIG.user = nu;
        }
        if(changingPass) CONFIG.pass = hashPass(npw);
        CONFIG.tokenVersion = (CONFIG.tokenVersion||1) + 1; // ← barcha mavjud tokenlarni bekor qiladi
        writeJSON(CONF_FILE, CONFIG);
        audit('credential_change', req, true);
        return send(res,200,{ok:true, loggedOutAll:true});
      }
      // xodim — faqat o'z parolini o'zgartira oladi (login o'zgartirish yo'q)
      const staffList = readJSON(STAFF_FILE, []);
      const idx = staffList.findIndex(s=>s.id===u.sub);
      if(idx<0) return send(res,404,{error:'Topilmadi'});
      if(!verifyPass(String(b.old||''), staffList[idx].pass)){ audit('credential_change', req, false, {user:staffList[idx].login}); return send(res,400,{error:'Joriy parol xato'}); }
      const npw = String(b.new||'');
      if(!npw) return send(res,400,{error:'Yangi parolni kiriting'});
      const err = validNewPassword(npw); if(err) return send(res,400,{error:err});
      staffList[idx].pass = hashPass(npw);
      staffList[idx].tokenVersion = (staffList[idx].tokenVersion||1) + 1;
      staffList[idx].updatedAt = Date.now();
      writeJSON(STAFF_FILE, staffList);
      audit('credential_change', req, true, {user:staffList[idx].login});
      return send(res,200,{ok:true, loggedOutAll:true});
    }
    // ---- AUTH: barcha qurilmalardan chiqish (logout-all) — faqat SHU hisob uchun ----
    if(method==='POST' && p==='/api/auth/logout-all'){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      if(u.sub === 'owner'){
        CONFIG.tokenVersion = (CONFIG.tokenVersion||1) + 1;
        writeJSON(CONF_FILE, CONFIG);
      } else {
        const staffList = readJSON(STAFF_FILE, []);
        const idx = staffList.findIndex(s=>s.id===u.sub);
        if(idx>=0){ staffList[idx].tokenVersion = (staffList[idx].tokenVersion||1) + 1; writeJSON(STAFF_FILE, staffList); }
      }
      audit('logout_all', req, true);
      return send(res,200,{ok:true});
    }
    // ---- AUTH: profil ma'lumotlarini olish ----
    if(method==='GET' && p==='/api/auth/me'){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      if(u.sub === 'owner'){
        return send(res,200,{ user:CONFIG.user, role:'admin', profile:CONFIG.profile||{}, createdAt:CONFIG.createdAt||null, updatedAt:CONFIG.profileUpdatedAt||CONFIG.createdAt||null });
      }
      const s = readJSON(STAFF_FILE, []).find(x=>x.id===u.sub);
      if(!s) return send(res,401,{error:'Avtorizatsiya kerak'});
      return send(res,200,{ user:s.login, role:(s.role==='admin'?'admin':'xodim'), profile:{firstName:s.firstName,lastName:s.lastName,position:s.position,phone:s.phone}, createdAt:s.createdAt||null, updatedAt:s.updatedAt||null });
    }
    // ---- AUTH: profil (ism/familiya/lavozim/telefon) ni saqlash ----
    if(method==='POST' && p==='/api/auth/profile'){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      const b = await readBody(req);
      const S=(v,n)=>String(v==null?'':v).trim().slice(0,n);
      if(u.sub === 'owner'){
        CONFIG.profile = { firstName:S(b.firstName,40), lastName:S(b.lastName,40), position:S(b.position,60), phone:S(b.phone,30) };
        CONFIG.profileUpdatedAt = Date.now();
        writeJSON(CONF_FILE, CONFIG);
        audit('profile_update', req, true);
        return send(res,200,{ ok:true, profile:CONFIG.profile });
      }
      const staffList = readJSON(STAFF_FILE, []);
      const idx = staffList.findIndex(s=>s.id===u.sub);
      if(idx<0) return send(res,404,{error:'Topilmadi'});
      const firstName = S(b.firstName,40);
      if(!firstName) return send(res,400,{error:'Ism kerak'});
      staffList[idx].firstName = firstName;
      staffList[idx].lastName = S(b.lastName,40);
      staffList[idx].position = S(b.position,60);
      staffList[idx].phone = S(b.phone,30);
      staffList[idx].updatedAt = Date.now();
      writeJSON(STAFF_FILE, staffList);
      audit('profile_update', req, true, {user:staffList[idx].login});
      return send(res,200,{ ok:true, profile:{firstName:staffList[idx].firstName,lastName:staffList[idx].lastName,position:staffList[idx].position,phone:staffList[idx].phone} });
    }
    // ---- XODIMLAR: Super Admin paneliga kiradigan kichik hisoblar (faqat asosiy admin boshqaradi) ----
    if(p.startsWith('/api/staff')){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      if(u.role !== 'admin') return send(res,403,{error:'Bu bo\'lim faqat asosiy admin uchun'});
      let staff = readJSON(STAFF_FILE, []);
      const pub = s => ({ id:s.id, firstName:s.firstName, lastName:s.lastName, login:s.login, position:s.position, phone:s.phone, department:s.department||s.company||'', sip:s.sip||'', role:s.role||'xodim', active:s.active, createdAt:s.createdAt, updatedAt:s.updatedAt });

      if(method==='GET' && p==='/api/staff'){ return send(res,200, staff.map(pub)); }

      if(method==='POST' && p==='/api/staff'){
        const b = await readBody(req);
        const existingLogins = new Set([CONFIG.user.toLowerCase(), ...staff.map(s=>s.login.toLowerCase())]);
        let rec; try { rec = cleanStaff(b, existingLogins); } catch(err){ return send(res,400,{error:String(err)}); }
        const pw = String(b.password||'');
        const perr = validNewPassword(pw); if(perr) return send(res,400,{error:perr});
        rec.id = genId(); rec.pass = hashPass(pw); rec.active = true; rec.tokenVersion = 1;
        rec.createdAt = Date.now(); rec.updatedAt = Date.now();
        staff.push(rec); writeJSON(STAFF_FILE, staff);
        audit('staff_create', req, true, {login:rec.login});
        return send(res,200,{ok:true, staff:pub(rec)});
      }

      const m = p.match(/^\/api\/staff\/([a-f0-9]{16})(\/toggle)?$/);
      if(m){
        const id = m[1]; const idx = staff.findIndex(x=>x.id===id);
        if(idx<0) return send(res,404,{error:'Topilmadi'});
        if(method==='PATCH' && m[2]==='/toggle'){
          staff[idx].active = !staff[idx].active;
          staff[idx].tokenVersion = (staff[idx].tokenVersion||1) + 1; // faolsizlantirilsa — joriy sessiyasi ham darhol yopiladi
          staff[idx].updatedAt = Date.now();
          writeJSON(STAFF_FILE, staff);
          audit('staff_toggle', req, true, {login:staff[idx].login, active:staff[idx].active});
          return send(res,200,{ok:true, active:staff[idx].active});
        }
        if(method==='PUT' && !m[2]){
          const b = await readBody(req);
          const existingLogins = new Set([CONFIG.user.toLowerCase(), ...staff.filter(s=>s.id!==id).map(s=>s.login.toLowerCase())]);
          let rec; try { rec = cleanStaff(b, existingLogins); } catch(err){ return send(res,400,{error:String(err)}); }
          staff[idx] = Object.assign(staff[idx], rec, {updatedAt: Date.now()});
          const pw = String(b.password||'');
          if(pw){
            const perr = validNewPassword(pw); if(perr) return send(res,400,{error:perr});
            staff[idx].pass = hashPass(pw);
            staff[idx].tokenVersion = (staff[idx].tokenVersion||1) + 1; // parol reset -> eski sessiyalar chiqadi
          }
          writeJSON(STAFF_FILE, staff);
          audit('staff_update', req, true, {login:staff[idx].login});
          return send(res,200,{ok:true, staff:pub(staff[idx])});
        }
        if(method==='DELETE' && !m[2]){
          const removed = staff.splice(idx,1)[0]; writeJSON(STAFF_FILE, staff);
          audit('staff_delete', req, true, {login:removed.login});
          return send(res,200,{ok:true});
        }
      }
      return send(res,405,{error:'Method not allowed'});
    }
    // ---- AUDIT: oxirgi 200 ta yozuv (faqat asosiy admin) ----
    if(method==='GET' && p==='/api/audit'){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      if(u.role !== 'admin') return send(res,403,{error:'Bu bo\'lim faqat asosiy admin uchun'});
      let lines=[]; try { lines = fs.readFileSync(AUDIT_FILE,'utf8').trim().split('\n').filter(Boolean); } catch(e){}
      const out = lines.slice(-200).reverse().map(l=>{ try{ return JSON.parse(l); }catch(e){ return null; } }).filter(Boolean);
      return send(res,200, out);
    }
    // ---- XARITA: haqiqiy yo'l marshruti (OSRM proxy) ----
    // Brauzerdan to'g'ridan-to'g'ri tashqi xizmatga so'rov CSP/CORS tomonidan
    // bloklanishi mumkin — shuning uchun serverimiz orqali so'raymiz (CSP
    // nuqtai nazaridan bu 'self' so'rov hisoblanadi, hech narsa o'zgartirish
    // shart emas).
    if(method==='GET' && p==='/api/route'){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      const coords = String(url.searchParams.get('coords')||'');
      // faqat "lng,lat;lng,lat;..." formatiga ruxsat (eng ko'pi 61 nuqta)
      if(!coords || coords.length>4000 ||
         !/^-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?(;-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?){1,60}$/.test(coords)){
        return send(res,400,{error:'Noto\'g\'ri koordinatalar'});
      }
      const osrmUrl = 'https://router.project-osrm.org/route/v1/driving/'+coords+'?overview=full&geometries=geojson';
      let answered = false;
      const done = (code,obj)=>{ if(answered) return; answered=true; send(res,code,obj); };
      const upstream = https.get(osrmUrl, { timeout: 8000 }, (r)=>{
        let data=''; let size=0;
        r.on('data', c=>{ size+=c.length; if(size>5000000){ r.destroy(); return; } data+=c; });
        r.on('end', ()=>{
          try{
            const parsed = JSON.parse(data);
            const geom = parsed && parsed.routes && parsed.routes[0] && parsed.routes[0].geometry;
            if(!geom || !Array.isArray(geom.coordinates)) return done(502,{error:'Marshrut topilmadi'});
            done(200, { coordinates: geom.coordinates });
          }catch(e){ done(502,{error:'Marshrutlash xizmati javobi noto\'g\'ri'}); }
        });
      });
      upstream.on('error', ()=> done(502,{error:'Marshrutlash xizmatiga ulanib bo\'lmadi'}));
      upstream.on('timeout', ()=>{ upstream.destroy(); done(504,{error:'Marshrutlash xizmati javob bermadi'}); });
      return;
    }

    // ---- ICHKI: Telegram bot backend (vap) uchun tashkilotlar ro'yxati ----
    // Login/parol tizimidan MUSTAQIL — faqat statik ichki kalit (INTERNAL_API_KEY)
    // bilan himoyalangan, bot backendi bilan bir xil VPS ichida ishlatiladi.
    // Faqat Xarita uchun zarur, xavfsiz maydonlarni qaytaradi (logo/rang/token yo'q).
    if(method==='GET' && p==='/api/internal/map-orgs'){
      const expected = String(process.env.INTERNAL_API_KEY||'');
      const got = String(req.headers['x-internal-key']||'');
      if(!expected || got.length!==expected.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected))){
        audit('internal_map_orgs', req, false);
        return send(res,401,{error:'Ruxsat yo\'q'});
      }
      const orgs = readJSON(ORGS_FILE, []);
      const out = orgs
        .filter(o => !o.deleted)
        .map(o => ({
          id: o.id, name: o.name, subdomain: o.subdomain,
          region: o.region||'', district: o.district||'',
          phone: o.phone||'', contact: o.contact||'',
          lat: (typeof o.lat==='number') ? o.lat : ((typeof o.mapLat==='number') ? o.mapLat : null),
          lng: (typeof o.lng==='number') ? o.lng : ((typeof o.mapLng==='number') ? o.mapLng : null),
          // locApprox=true — koordinata aniq lat/lng emas, "Xarita havolasi" (mapUrl)dan
          // avtomatik ajratib olingan (aksariyat holda to'g'ri, lekin ba'zan xarita
          // markazi bo'lishi mumkin — shuning uchun taxminiy deb belgilanadi).
          locApprox: !(typeof o.lat==='number') && (typeof o.mapLat==='number'),
          mapUrl: o.mapUrl||'',
          status: o.status||'new', enabled: !!o.enabled,
        }));
      return send(res,200, out);
    }

    // ---- himoyalangan yo'llar (token kerak) ----
    if(p.startsWith('/api/orgs')){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      let orgs = readJSON(ORGS_FILE, []);

      // GET /api/orgs — ro'yxat
      if(method==='GET' && p==='/api/orgs'){ return send(res,200, orgs); }

      // POST /api/orgs — yaratish
      if(method==='POST' && p==='/api/orgs'){
        const b = await readBody(req);
        let org; try { org = cleanOrg(b); } catch(err){ return send(res,400,{error:String(err)}); }
        if(orgs.some(x=>x.subdomain===org.subdomain)) return send(res,409,{error:'Bu subdomen allaqachon band'});
        org.id = genId(); org.enabled = true; org.createdAt = Date.now(); org.updatedAt = Date.now();
        orgs.push(org); writeJSON(ORGS_FILE, orgs);
        if(org.mapUrl) scheduleMapUrlResolve(org.id, org.mapUrl);
        return send(res,200,{ok:true, org});
      }

      // /api/orgs/:id ...
      const m = p.match(/^\/api\/orgs\/([a-f0-9]{16})(\/toggle|\/status|\/visited|\/visit|\/restore|\/purge)?$/);
      if(m){
        const id = m[1]; const idx = orgs.findIndex(x=>x.id===id);
        if(idx<0) return send(res,404,{error:'Topilmadi'});
        if(method==='PATCH' && m[2]==='/toggle'){
          orgs[idx].enabled = !orgs[idx].enabled; orgs[idx].updatedAt = Date.now(); writeJSON(ORGS_FILE, orgs);
          return send(res,200,{ok:true, enabled: orgs[idx].enabled});
        }
        if(method==='PATCH' && m[2]==='/status'){
          const b = await readBody(req); const st = String(b.status||'');
          if(ALLOWED_STATUS.indexOf(st)<0) return send(res,400,{error:'Noto\'g\'ri holat'});
          orgs[idx].status = st; orgs[idx].updatedAt = Date.now(); writeJSON(ORGS_FILE, orgs);
          return send(res,200,{ok:true, status: st});
        }
        if(method==='PATCH' && m[2]==='/visited'){
          orgs[idx].visited = !orgs[idx].visited; orgs[idx].updatedAt = Date.now(); writeJSON(ORGS_FILE, orgs);
          return send(res,200,{ok:true, visited: orgs[idx].visited});
        }
        if(method==='POST' && m[2]==='/visit'){
          const b = await readBody(req); const note = String(b.note||'').trim().slice(0,500);
          if(!Array.isArray(orgs[idx].visits)) orgs[idx].visits = [];
          orgs[idx].visits.push({ at: Date.now(), note });
          orgs[idx].visited = true; orgs[idx].updatedAt = Date.now(); writeJSON(ORGS_FILE, orgs);
          return send(res,200,{ok:true, visits: orgs[idx].visits});
        }
        if(method==='PATCH' && m[2]==='/restore'){
          orgs[idx].deleted = false; orgs[idx].updatedAt = Date.now(); writeJSON(ORGS_FILE, orgs);
          return send(res,200,{ok:true});
        }
        if(method==='DELETE' && m[2]==='/purge'){
          if(!orgs[idx].deleted) return send(res,400,{error:'Avval o\'chirilganlarga o\'tkazing'});
          const removed = orgs.splice(idx,1)[0]; writeJSON(ORGS_FILE, orgs);
          return send(res,200,{ok:true, removed: removed.id});
        }
        if(method==='PUT'){
          const b = await readBody(req); let org; try { org = cleanOrg(b); } catch(err){ return send(res,400,{error:String(err)}); }
          if(orgs.some(x=>x.subdomain===org.subdomain && x.id!==id)) return send(res,409,{error:'Bu subdomen band'});
          const prevMapUrl = orgs[idx].mapUrlResolvedFor;
          orgs[idx] = Object.assign(orgs[idx], org, {updatedAt: Date.now()}); writeJSON(ORGS_FILE, orgs);
          if(org.mapUrl && org.mapUrl!==prevMapUrl) scheduleMapUrlResolve(id, org.mapUrl);
          return send(res,200,{ok:true, org: orgs[idx]});
        }
        // DELETE (soft) — "O'chirilganlar" bo'limiga o'tadi, keyin restore/purge mumkin
        if(method==='DELETE' && !m[2]){
          orgs[idx].deleted = true; orgs[idx].deletedAt = Date.now(); orgs[idx].updatedAt = Date.now();
          writeJSON(ORGS_FILE, orgs);
          return send(res,200,{ok:true, removed: orgs[idx].id});
        }
      }
      return send(res,405,{error:'Method not allowed'});
    }

    // ---- TRANZAKSIYALAR (butun tizim bo'ylab) — himoyalangan ----
    // Eslatma: bitta tashkilotning tranzaksiyalari /api/clients/:id/
    // transactions manzilida, quyidagi mijozlar blokining ichida.
    if(p.startsWith('/api/transactions')){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      const clients = readJSON(CLIENTS_FILE, []);
      // Bitta tranzaksiyani o'chirish (faqat asosiy admin)
      const mtxd = p.match(/^\/api\/transactions\/([a-f0-9]{16})$/);
      if(mtxd && method==='DELETE'){
        if(u.role !== 'admin') return send(res,403,{error:"O'chirish faqat asosiy admin uchun"});
        const all = readTx();
        const i = all.findIndex(t => t.id === mtxd[1]);
        if(i < 0) return send(res,404,{error:'Topilmadi'});
        const removed = all.splice(i,1)[0];
        writeJSON(TRANSACTIONS_FILE, all);
        audit('tx_delete', req, true, { client: removed.clientId, by: u.u || u.sub || '', tx: removed.id, sum: removed.sum });
        return send(res,200,{ok:true, removed: removed.id});
      }

      // Barcha filiallar bo'yicha tranzaksiyalar ("Filial tranzaksiyalari")
      if(method==='GET' && p==='/api/transactions'){
        const nameOf = Object.create(null);
        for(const c of clients) nameOf[c.id] = c.name;
        const type = String(url.searchParams.get('type') || '').toUpperCase();
        const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
        let all = readTx();
        if(TX_TYPES.includes(type)) all = all.filter(t => t.type === type);
        if(q) all = all.filter(t =>
          String(nameOf[t.clientId] || '').toLowerCase().includes(q) ||
          String(t.reason || '').toLowerCase().includes(q));
        const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 20));
        const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
        const rows = all.slice().reverse().slice(offset, offset + limit)
          .map(t => Object.assign({}, t, { clientName: nameOf[t.clientId] || '—' }));
        return send(res,200,{ rows, total: all.length });
      }
      return send(res,404,{error:'Topilmadi'});
    }

    // ---- MIJOZLAR (clients) — himoyalangan ----
    if(p.startsWith('/api/clients')){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      let clients = readJSON(CLIENTS_FILE, []);

      if(method==='GET' && p==='/api/clients'){ return send(res,200, clients); }

      if(method==='POST' && p==='/api/clients'){
        const b = await readBody(req);
        let c; try { c = cleanClient(b); } catch(err){ return send(res,400,{error:String(err)}); }
        c.id = genId(); c.createdAt = Date.now(); c.updatedAt = Date.now();
        clients.push(c); writeJSON(CLIENTS_FILE, clients);
        return send(res,200,{ok:true, client:c});
      }

      // Excel/CSV import — bir nechta mijozni birdaniga (logo/lokatsiya shart emas)
      if(method==='POST' && p==='/api/clients/import'){
        const b = await readBody(req);
        const arr = Array.isArray(b.clients) ? b.clients : [];
        const seen = new Set(clients.map(c => (c.name+'|'+(c.phone||'')).toLowerCase()));
        let added = 0, skipped = 0;
        for(const row of arr){
          let c; try { c = cleanClient(row); } catch(e){ skipped++; continue; }
          const key = (c.name+'|'+(c.phone||'')).toLowerCase();
          if(seen.has(key)){ skipped++; continue; }
          seen.add(key); c.id = genId(); c.createdAt = Date.now(); c.updatedAt = Date.now();
          clients.push(c); added++;
        }
        writeJSON(CLIENTS_FILE, clients);
        return send(res,200,{ok:true, added, skipped});
      }

      // ---- Ommaviy o'zgartirish: bir nechta tashkilotga bir xil sozlama ----
      // Body: { ids:[...], patch:{ capabilities?, blockers?, payOrgs?, blacklist?, myuzcard? } }
      // patch ichidagi obyektlar MAVJUD qiymat ustiga qo'shiladi (merge), ya'ni
      // faqat berilgan kalitlar o'zgaradi — qolganlariga tegilmaydi.
      if(method==='PUT' && p==='/api/clients/settings/bulk'){
        const b = await readBody(req);
        const ids = Array.isArray(b.ids) ? b.ids.filter(x => typeof x === 'string') : [];
        const patch = (b.patch && typeof b.patch === 'object') ? b.patch : {};
        if(!ids.length) return send(res,400,{error:'Tashkilot tanlanmagan'});
        if(ids.length > 2000) return send(res,400,{error:'Juda ko\'p tashkilot (2000 dan oshmasin)'});
        const known = new Set(clients.map(c => c.id));
        const all = readJSON(CLIENT_SETTINGS_FILE, {});
        let changed = 0, skipped = 0;
        const touched = [];
        // Tarixda "nima ko'chirilgani" ko'rinib tursin uchun qisqa xulosa
        const bulkSummary = {};
        for(const f of ['capabilities','prices','blockers','payOrgs'])
          if(patch[f] && typeof patch[f] === 'object') bulkSummary[f] = Object.keys(patch[f]).length;
        for(const f of ['blacklist','myuzcard','myuzcardAuto'])
          if(typeof patch[f] === 'boolean') bulkSummary[f] = patch[f];
        if(patch.extras && typeof patch.extras === 'object') bulkSummary.extras = Object.keys(patch.extras).length;
        for(const id of ids){
          if(!known.has(id)){ skipped++; continue; }
          const cur = all[id] || { capabilities:{}, prices:{}, blockers:{}, payOrgs:{} };
          if(patch.capabilities && typeof patch.capabilities === 'object')
            cur.capabilities = Object.assign({}, cur.capabilities, patch.capabilities);
          // Narxlar: faqat musbat butun son qabul qilinadi, 0 esa
          // "belgilanmagan" degani — kalitni o'chiradi.
          if(patch.prices && typeof patch.prices === 'object'){
            const px = Object.assign({}, cur.prices);
            for(const k of Object.keys(patch.prices)){
              const v = Math.max(0, Math.round(Number(patch.prices[k]) || 0));
              if(v) px[k] = v; else delete px[k];
            }
            cur.prices = px;
          }
          if(patch.blockers && typeof patch.blockers === 'object')
            cur.blockers = Object.assign({}, cur.blockers, patch.blockers);
          if(patch.payOrgs && typeof patch.payOrgs === 'object')
            cur.payOrgs = Object.assign({}, cur.payOrgs, patch.payOrgs);
          if(typeof patch.blacklist === 'boolean') cur.blacklist = patch.blacklist;
          if(typeof patch.myuzcard === 'boolean') cur.myuzcard = patch.myuzcard;
          if(typeof patch.myuzcardAuto === 'boolean') cur.myuzcardAuto = patch.myuzcardAuto;
          if(patch.extras && typeof patch.extras === 'object')
            cur.extras = Object.assign({}, cur.extras, patch.extras);
          cur.updatedAt = Date.now(); cur.updatedBy = u.u || u.sub || '';
          all[id] = cur; changed++; touched.push(id);
        }
        writeJSON(CLIENT_SETTINGS_FILE, all);
        // Ommaviy amalda tashkilotlar ro'yxati uzun bo'lishi mumkin — audit
        // qatori haddan tashqari shishmasligi uchun 500 tasi yoziladi. Undan
        // keyingilarining shaxsiy tarixida bu amal ko'rinmaydi (umumiy
        // /api/audit ro'yxatida esa baribir turadi).
        audit('client_settings_bulk', req, true, {
          count: changed, skipped, by: u.u || u.sub || '',
          clients: touched.slice(0, 500),
          patch: bulkSummary,
        });
        return send(res,200,{ok:true, changed, skipped});
      }

      // Barcha tashkilot sozlamalari bitta so'rovda — Filiallar jadvalidagi
      // Qora ro'yxat / Atmos ID / MyUzcard ustunlari shundan to'ldiriladi.
      if(method==='GET' && p==='/api/clients/settings'){
        return send(res,200, readJSON(CLIENT_SETTINGS_FILE, {}));
      }

      // ---- TRANZAKSIYALAR ----
      // Filial hisobvarag'i bo'yicha kirim/chiqim. Tashkilot kartasidagi
      // "Tranzaksiyalar" yorlig'i va "Filial tranzaksiyalari" sahifasi shu
      // yerdan oziqlanadi.
      const mtx = p.match(/^\/api\/clients\/([a-f0-9]{16})\/transactions$/);
      if(mtx){
        const cid = mtx[1];
        if(!clients.some(x => x.id === cid)) return send(res,404,{error:'Topilmadi'});
        if(method==='GET'){
          const all = readTx().filter(t => t.clientId === cid);
          const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 20));
          const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
          // Yangi yozuv oxirida turadi — foydalanuvchiga teskari tartibda
          const rows = all.slice().reverse().slice(offset, offset + limit);
          const b = all.reduce(addTx, emptyBal());
          return send(res,200,{ rows, total: all.length,
            daromad: b.daromad, chiqim: b.chiqim, balans: b.balans,
            asosiy: b.asosiy, xizmatlar: b.xizmatlar });
        }
        if(method==='POST'){
          const b = await readBody(req);
          const r = cleanTx(b, cid);
          if(r.err) return send(res,400,{error:r.err});
          const all = readTx();
          if(all.length >= TX_MAX) return send(res,507,{error:'Tranzaksiyalar chegarasiga yetildi'});
          r.tx.createdBy = u.u || u.sub || '';
          all.push(r.tx);
          writeJSON(TRANSACTIONS_FILE, all);
          audit('tx_add', req, true, { client: cid, by: r.tx.createdBy, tx: r.tx.id, type: r.tx.type, sum: r.tx.sum });
          return send(res,200,{ok:true, tx:r.tx});
        }
        return send(res,405,{error:'Method not allowed'});
      }


      // ---- Barcha filiallarning balansi (Filiallar jadvalidagi ustun) ----
      // Faqat tranzaksiyasi BOR tashkilotlar qaytadi — 1593 ta bo'sh
      // yozuvni tashib yurishning hojati yo'q.
      if(method==='GET' && p==='/api/clients/balances'){
        const map = Object.create(null);
        for(const t of readTx()){
          if(!map[t.clientId]) map[t.clientId] = emptyBal();
          addTx(map[t.clientId], t);
        }
        return send(res,200, map);
      }

      // ---- SARFLASH HISOBOTI (oylar kesimida) ----
      // Hisob-faktura shaklidagi savol: shu filial qaysi pullik amaldan
      // necha marta foydalangan va qancha to'lagan. Manba — tranzaksiyalar
      // (CHIQIM yozuvlari), guruhlash esa "sabab" (amal nomi) bo'yicha.
      const mu = p.match(/^\/api\/clients\/([a-f0-9]{16})\/usage$/);
      if(mu && method==='GET'){
        const uid = mu[1];
        if(!clients.some(x => x.id === uid)) return send(res,404,{error:'Topilmadi'});
        const n = Math.min(24, Math.max(2, Number(url.searchParams.get('months')) || 13));
        const oylar = lastMonths(n);
        const bor = new Set(oylar);
        const karta = Object.create(null);   // ym -> { jami, amallar }
        for(const ym of oylar) karta[ym] = { ym, soni: 0, summa: 0, amallar: Object.create(null) };
        for(const t of readTx()){
          if(t.clientId !== uid || t.type !== 'CHIQIM') continue;
          const ym = ymOf(t.createdAt);
          if(!bor.has(ym)) continue;
          const k = karta[ym];
          const nom = String(t.reason || '').trim() || 'Boshqa';
          if(!k.amallar[nom]) k.amallar[nom] = { soni: 0, summa: 0 };
          k.amallar[nom].soni++; k.amallar[nom].summa += t.sum;
          k.soni++; k.summa += t.sum;
        }
        return send(res,200,{ oylar: oylar.map(ym => karta[ym]) });
      }

      // ---- Bitta tashkilotning sozlama tarixi (audit jurnalidan) ----
      // Kim, qachon, nimani yoqdi/o'chirdi. Ommaviy amallar ham ko'rinadi.
      const mh = p.match(/^\/api\/clients\/([a-f0-9]{16})\/settings\/history$/);
      if(mh && method==='GET'){
        // Jurnalda IP va xodim loginlari bor — /api/audit kabi faqat asosiy admin
        if(u.role !== 'admin') return send(res,403,{error:'Tarix faqat asosiy admin uchun'});
        const hid = mh[1];
        if(!clients.some(x => x.id === hid)) return send(res,404,{error:'Topilmadi'});
        // Eski yozuvlarda (changes maydoni qo'shilishidan oldingi) nima
        // o'zgargani ham, kim qilgani ham yo'q — ular ekranda 'Sozlama
        // o'zgartirildi / noma'lum' bo'lib takrorlanaverardi. Foydasi yo'q,
        // shuning uchun bunday yozuvlar qaytarilmaydi.
        const foydali = e => (Array.isArray(e.changes) && e.changes.length) || e.extra > 0;
        const rows = auditTail(512 * 1024)
          .filter(e => (e.action === 'client_settings_update' && e.client === hid && foydali(e))
                    || (e.action === 'client_settings_bulk' && Array.isArray(e.clients) && e.clients.includes(hid)))
          .slice(-50).reverse();
        return send(res,200, rows);
      }

      // ---- Tashkilot sozlamalari: imkoniyatlar, narxlar, xizmatlar ----
      // Super Admin kartasidagi checkbox/switch'lar shu yerda saqlanadi.
      const ms = p.match(/^\/api\/clients\/([a-f0-9]{16})\/settings$/);
      if(ms){
        const id = ms[1];
        if(!clients.some(x => x.id === id)) return send(res,404,{error:'Topilmadi'});
        const all = readJSON(CLIENT_SETTINGS_FILE, {});
        if(method==='GET') return send(res,200, all[id] || {});
        if(method==='PUT'){
          const b = await readBody(req);
          const cur = all[id] || {};
          // Faqat tanilgan bo'limlar saqlanadi — kutilmagan maydonlar tashlanadi
          const next = {
            capabilities: (b && typeof b.capabilities === 'object' && b.capabilities) || cur.capabilities || {},
            prices:       (b && typeof b.prices === 'object' && b.prices)             || cur.prices || {},
            blockers:     (b && typeof b.blockers === 'object' && b.blockers)         || cur.blockers || {},
            payOrgs:      (b && typeof b.payOrgs === 'object' && b.payOrgs)           || cur.payOrgs || {},
            // Filiallar jadvalidagi uchta ustun (tashkilot yozuvida yo'q maydonlar)
            blacklist: typeof b.blacklist === 'boolean' ? b.blacklist : cur.blacklist,
            myuzcard:  typeof b.myuzcard  === 'boolean' ? b.myuzcard  : cur.myuzcard,
            atmosId:   typeof b.atmosId   === 'string'  ? b.atmosId.trim().slice(0,32) : cur.atmosId,
            // Xizmatlar yorlig'idagi "MyUzcard PINFL bo'yicha avtomatik
            // yechib olish" — MyUzcard'ga kirishdan alohida moslama
            myuzcardAuto: typeof b.myuzcardAuto === 'boolean' ? b.myuzcardAuto : cur.myuzcardAuto,
            // "Qo'shimcha sozlamalar" bloki: qiymatlar ro'yxatdan tanlanadi,
            // shuning uchun matn sifatida saqlanadi (uzunligi cheklangan)
            extras: (b && typeof b.extras === 'object' && b.extras)
              ? Object.fromEntries(Object.entries(b.extras)
                  .filter(([k, v]) => typeof k === 'string' && k.length <= 32 && typeof v === 'string')
                  .slice(0, 20)
                  .map(([k, v]) => [k, v.trim().slice(0, 64)]))
              : (cur.extras || {}),
            updatedAt: Date.now(),
            updatedBy: u.u || u.sub || '',
          };
          all[id] = next;
          writeJSON(CLIENT_SETTINGS_FILE, all);
          const d = diffSettings(cur, next);
          // Hech narsa o'zgarmagan bo'lsa (masalan sahifa qayta chizilgani
          // uchun kelgan takroriy so'rov) tarixga yozmaymiz — shovqin bo'ladi.
          if(d.changes.length || d.extra)
            audit('client_settings_update', req, true, { client: id, by: u.u || u.sub || '', changes: d.changes, extra: d.extra });
          return send(res,200,{ok:true, settings:next});
        }
        return send(res,405,{error:'Method not allowed'});
      }
      const mc = p.match(/^\/api\/clients\/([a-f0-9]{16})$/);
      if(mc){
        const id = mc[1]; const idx = clients.findIndex(x => x.id === id);
        if(idx < 0) return send(res,404,{error:'Topilmadi'});
        if(method==='PUT'){
          const b = await readBody(req);
          let c; try { c = cleanClient(b); } catch(err){ return send(res,400,{error:String(err)}); }
          clients[idx] = Object.assign(clients[idx], c, { updatedAt: Date.now() });
          writeJSON(CLIENTS_FILE, clients);
          return send(res,200,{ok:true, client:clients[idx]});
        }
        if(method==='DELETE'){
          const rm = clients.splice(idx,1)[0]; writeJSON(CLIENTS_FILE, clients);
          return send(res,200,{ok:true, deleted:rm.id});
        }
      }
      return send(res,405,{error:'Method not allowed'});
    }

    // ---- BO'LIMLAR (xodim biriktiriladigan bo'limlar ro'yxati — sodda, faqat
    // ma'lumot/filtr uchun) — istalgan tizimga kirgan foydalanuvchi (admin yoki
    // xodim) ko'ra va qo'sha oladi, chunki bu nozik ma'lumot emas. ----
    if(p.startsWith('/api/departments')){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      let depts = readJSON(DEPT_FILE, []);

      if(method==='GET' && p==='/api/departments'){ return send(res,200, depts); }

      if(method==='POST' && p==='/api/departments'){
        const b = await readBody(req);
        const name = String(b.name||'').trim().slice(0,60);
        if(!name) return send(res,400,{error:'Bo\'lim nomi kerak'});
        if(depts.some(d=>d.name.toLowerCase()===name.toLowerCase())) return send(res,409,{error:'Bu bo\'lim allaqachon bor'});
        const dept = { id:genId(), name, createdAt:Date.now() };
        depts.push(dept); writeJSON(DEPT_FILE, depts);
        return send(res,200,{ok:true, department:dept});
      }

      const md = p.match(/^\/api\/departments\/([a-f0-9]{16})$/);
      if(md){
        const id = md[1]; const idx = depts.findIndex(x=>x.id===id);
        if(idx<0) return send(res,404,{error:'Topilmadi'});
        if(method==='DELETE'){
          const rm = depts.splice(idx,1)[0]; writeJSON(DEPT_FILE, depts);
          return send(res,200,{ok:true, removed:rm.id});
        }
      }
      return send(res,405,{error:'Method not allowed'});
    }

    // ---- JAMOA: vazifa biriktirish va "Jamoa" ko'rinishi uchun soddalashtirilgan
    // ro'yxat (login/telefon kabi nozik maydonlarsiz) — istalgan kirgan
    // foydalanuvchi (admin yoki xodim) ko'ra oladi (staff.json'ning o'zi kabi
    // admin-only emas, chunki bu yerda faqat ism/rol/lavozim chiqadi). ----
    if(method==='GET' && p==='/api/team'){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      return send(res,200, allActors());
    }

    // ---- VAZIFALAR: LOYIHALAR ----
    if(p.startsWith('/api/projects')){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      let projects = readJSON(PROJECTS_FILE, []);

      if(method==='GET' && p==='/api/projects'){ return send(res,200, projects); }

      if(method==='POST' && p==='/api/projects'){
        const b = await readBody(req);
        let proj; try { proj = cleanProject(b); } catch(err){ return send(res,400,{error:String(err)}); }
        proj.id = genId(); proj.favorite = false; proj.archived = false;
        proj.createdBy = u.sub; proj.createdAt = Date.now(); proj.updatedAt = Date.now();
        projects.push(proj); writeJSON(PROJECTS_FILE, projects);
        addActivity(u.sub, 'project_create', 'Loyiha yaratdi: '+proj.name, {projectId:proj.id});
        return send(res,200,{ok:true, project:proj});
      }

      const mp = p.match(/^\/api\/projects\/([a-f0-9]{16})(\/archive|\/favorite|\/duplicate)?$/);
      if(mp){
        const id = mp[1]; const idx = projects.findIndex(x=>x.id===id);
        if(idx<0) return send(res,404,{error:'Topilmadi'});
        if(method==='PATCH' && mp[2]==='/archive'){
          projects[idx].archived = !projects[idx].archived; projects[idx].updatedAt = Date.now();
          writeJSON(PROJECTS_FILE, projects);
          return send(res,200,{ok:true, archived: projects[idx].archived});
        }
        if(method==='PATCH' && mp[2]==='/favorite'){
          projects[idx].favorite = !projects[idx].favorite; projects[idx].updatedAt = Date.now();
          writeJSON(PROJECTS_FILE, projects);
          return send(res,200,{ok:true, favorite: projects[idx].favorite});
        }
        if(method==='POST' && mp[2]==='/duplicate'){
          const src = projects[idx];
          const copy = Object.assign({}, src, { id:genId(), name: src.name+' (nusxa)', favorite:false, archived:false, createdBy:u.sub, createdAt:Date.now(), updatedAt:Date.now() });
          projects.push(copy); writeJSON(PROJECTS_FILE, projects);
          // shu loyihaning vazifalarini ham nusxalaymiz (izoh/tarix bo'sh holda — yangi boshlanish)
          let tasks = readJSON(TASKS_FILE, []);
          const srcTasks = tasks.filter(t=>t.projectId===src.id);
          const newTasks = srcTasks.map(t=>Object.assign({}, t, {
            id:genId(), projectId:copy.id, comments:[], history:[],
            checklist:(t.checklist||[]).map(c=>({id:genId(),text:c.text,done:false})),
            createdBy:u.sub, createdAt:Date.now(), updatedAt:Date.now(),
          }));
          if(newTasks.length){ tasks = tasks.concat(newTasks); writeJSON(TASKS_FILE, tasks); }
          addActivity(u.sub, 'project_duplicate', 'Loyihani nusxaladi: '+src.name, {projectId:copy.id});
          return send(res,200,{ok:true, project:copy, tasks:newTasks});
        }
        if(method==='PUT' && !mp[2]){
          const b = await readBody(req);
          let proj; try { proj = cleanProject(b); } catch(err){ return send(res,400,{error:String(err)}); }
          projects[idx] = Object.assign(projects[idx], proj, {updatedAt: Date.now()});
          writeJSON(PROJECTS_FILE, projects);
          addActivity(u.sub, 'project_update', 'Loyihani tahrirladi: '+projects[idx].name, {projectId:id});
          return send(res,200,{ok:true, project: projects[idx]});
        }
        if(method==='DELETE' && !mp[2]){
          const removed = projects.splice(idx,1)[0]; writeJSON(PROJECTS_FILE, projects);
          // shu loyihaga tegishli barcha vazifalarni ham o'chiramiz (cascade)
          let tasks = readJSON(TASKS_FILE, []);
          const remain = tasks.filter(t=>t.projectId!==id);
          if(remain.length!==tasks.length) writeJSON(TASKS_FILE, remain);
          addActivity(u.sub, 'project_delete', 'Loyihani o\'chirdi: '+removed.name, {projectId:id});
          return send(res,200,{ok:true, removed:id});
        }
      }
      return send(res,405,{error:'Method not allowed'});
    }

    // ---- VAZIFALAR: LABELLAR (yorliqlar) ----
    if(p.startsWith('/api/labels')){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      let labels = readJSON(LABELS_FILE, []);

      if(method==='GET' && p==='/api/labels'){ return send(res,200, labels); }

      if(method==='POST' && p==='/api/labels'){
        const b = await readBody(req);
        const name = String(b.name||'').trim().slice(0,40);
        if(!name) return send(res,400,{error:'Yorliq nomi kerak'});
        const color = validColor(b.color) ? b.color : '#0C6440';
        const lbl = { id:genId(), name, color, createdAt:Date.now() };
        labels.push(lbl); writeJSON(LABELS_FILE, labels);
        return send(res,200,{ok:true, label:lbl});
      }

      const ml = p.match(/^\/api\/labels\/([a-f0-9]{16})$/);
      if(ml){
        const id = ml[1]; const idx = labels.findIndex(x=>x.id===id);
        if(idx<0) return send(res,404,{error:'Topilmadi'});
        if(method==='DELETE'){
          const removed = labels.splice(idx,1)[0]; writeJSON(LABELS_FILE, labels);
          // shu yorliqni ishlatgan vazifalardan ham olib tashlaymiz
          let tasks = readJSON(TASKS_FILE, []);
          let changed = false;
          tasks.forEach(t=>{ if(Array.isArray(t.labels) && t.labels.indexOf(id)>=0){ t.labels = t.labels.filter(x=>x!==id); changed = true; } });
          if(changed) writeJSON(TASKS_FILE, tasks);
          return send(res,200,{ok:true, removed:removed.id});
        }
      }
      return send(res,405,{error:'Method not allowed'});
    }

    // ---- VAZIFALAR: VAZIFALAR (tasks) ----
    if(p.startsWith('/api/tasks')){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      let tasks = readJSON(TASKS_FILE, []);
      const projects = readJSON(PROJECTS_FILE, []);

      if(method==='GET' && p==='/api/tasks'){
        const projectId = url.searchParams.get('projectId');
        const out = projectId ? tasks.filter(t=>t.projectId===projectId) : tasks;
        return send(res,200, out);
      }

      if(method==='POST' && p==='/api/tasks'){
        const b = await readBody(req);
        let t; try { t = cleanTask(b, projects); } catch(err){ return send(res,400,{error:String(err)}); }
        const colCount = tasks.filter(x=>x.projectId===t.projectId && x.status===t.status).length;
        t.id = genId(); t.ord = colCount; t.star = false;
        t.checklist = []; t.comments = []; t.history = [{ at:Date.now(), actor:u.sub, action:'created', detail:'Vazifa yaratildi' }];
        t.createdBy = u.sub; t.createdAt = Date.now(); t.updatedAt = Date.now();
        tasks.push(t); writeJSON(TASKS_FILE, tasks);
        addActivity(u.sub, 'task_create', 'Vazifa yaratdi: '+t.title, {taskId:t.id, projectId:t.projectId});
        if(t.assignee && t.assignee!==u.sub) addNotification(t.assignee, 'task_assigned', 'Sizga yangi vazifa biriktirildi: '+t.title, {taskId:t.id});
        return send(res,200,{ok:true, task:t});
      }

      const mt = p.match(/^\/api\/tasks\/([a-f0-9]{16})(\/move|\/star|\/checklist|\/comments)?(?:\/([a-f0-9]{16})(\/toggle)?)?$/);
      if(mt){
        const id = mt[1]; const idx = tasks.findIndex(x=>x.id===id);
        if(idx<0) return send(res,404,{error:'Topilmadi'});
        const sub = mt[2]; const subId = mt[3]; const isToggle = !!mt[4];

        if(method==='PATCH' && sub==='/move' && !subId){
          const b = await readBody(req);
          const status = TASK_STATUS.indexOf(b.status)>=0 ? b.status : tasks[idx].status;
          let destOrd = Number(b.ord); if(!Number.isFinite(destOrd) || destOrd<0) destOrd = 0;
          const projectId = tasks[idx].projectId;
          const prevStatus = tasks[idx].status;
          tasks[idx].status = status; tasks[idx].updatedAt = Date.now();
          const col = tasks.filter(x=>x.projectId===projectId && x.status===status && x.id!==id).sort((x,y)=>x.ord-y.ord);
          col.splice(Math.min(destOrd,col.length), 0, tasks[idx]);
          col.forEach((x,i)=>{ x.ord = i; });
          if(status!==prevStatus) tasks[idx].history.push({ at:Date.now(), actor:u.sub, action:'status', detail:prevStatus+' → '+status });
          writeJSON(TASKS_FILE, tasks);
          if(status!==prevStatus) addActivity(u.sub, 'task_move', tasks[idx].title+': '+prevStatus+' → '+status, {taskId:id});
          return send(res,200,{ok:true, task:tasks[idx]});
        }

        if(method==='PATCH' && sub==='/star' && !subId){
          tasks[idx].star = !tasks[idx].star; tasks[idx].updatedAt = Date.now();
          writeJSON(TASKS_FILE, tasks);
          return send(res,200,{ok:true, star: tasks[idx].star});
        }

        if(method==='POST' && sub==='/checklist' && !subId){
          const b = await readBody(req);
          const text = String(b.text||'').trim().slice(0,200);
          if(!text) return send(res,400,{error:'Matn kerak'});
          if(!Array.isArray(tasks[idx].checklist)) tasks[idx].checklist = [];
          const item = { id:genId(), text, done:false };
          tasks[idx].checklist.push(item); tasks[idx].updatedAt = Date.now();
          writeJSON(TASKS_FILE, tasks);
          return send(res,200,{ok:true, item});
        }
        if(sub==='/checklist' && subId){
          const cidx = (tasks[idx].checklist||[]).findIndex(c=>c.id===subId);
          if(cidx<0) return send(res,404,{error:'Topilmadi'});
          if(method==='PATCH' && isToggle){
            tasks[idx].checklist[cidx].done = !tasks[idx].checklist[cidx].done; tasks[idx].updatedAt = Date.now();
            writeJSON(TASKS_FILE, tasks);
            return send(res,200,{ok:true, done: tasks[idx].checklist[cidx].done});
          }
          if(method==='DELETE' && !isToggle){
            tasks[idx].checklist.splice(cidx,1); tasks[idx].updatedAt = Date.now();
            writeJSON(TASKS_FILE, tasks);
            return send(res,200,{ok:true});
          }
        }

        if(method==='POST' && sub==='/comments' && !subId){
          const b = await readBody(req);
          const text = String(b.text||'').trim().slice(0,1000);
          if(!text) return send(res,400,{error:'Matn kerak'});
          if(!Array.isArray(tasks[idx].comments)) tasks[idx].comments = [];
          const cmt = { id:genId(), author:u.sub, text, at:Date.now() };
          tasks[idx].comments.push(cmt); tasks[idx].updatedAt = Date.now();
          writeJSON(TASKS_FILE, tasks);
          if(tasks[idx].assignee && tasks[idx].assignee!==u.sub) addNotification(tasks[idx].assignee, 'task_comment', 'Vazifangizga izoh qoldirildi: '+tasks[idx].title, {taskId:id});
          return send(res,200,{ok:true, comment:cmt});
        }

        if(method==='PUT' && !sub){
          const b = await readBody(req);
          let t; try { t = cleanTask(b, projects); } catch(err){ return send(res,400,{error:String(err)}); }
          const prevAssignee = tasks[idx].assignee;
          tasks[idx] = Object.assign(tasks[idx], t, {updatedAt: Date.now()});
          tasks[idx].history.push({ at:Date.now(), actor:u.sub, action:'edit', detail:'Vazifa tahrirlandi' });
          writeJSON(TASKS_FILE, tasks);
          addActivity(u.sub, 'task_update', 'Vazifani tahrirladi: '+tasks[idx].title, {taskId:id});
          if(t.assignee && t.assignee!==prevAssignee && t.assignee!==u.sub) addNotification(t.assignee, 'task_assigned', 'Sizga vazifa biriktirildi: '+t.title, {taskId:id});
          return send(res,200,{ok:true, task: tasks[idx]});
        }

        if(method==='DELETE' && !sub){
          const removed = tasks.splice(idx,1)[0]; writeJSON(TASKS_FILE, tasks);
          addActivity(u.sub, 'task_delete', 'Vazifani o\'chirdi: '+removed.title, {taskId:id});
          return send(res,200,{ok:true, removed:id});
        }
      }
      return send(res,405,{error:'Method not allowed'});
    }

    // ---- VAZIFALAR: BILDIRISHNOMALAR (har bir foydalanuvchi faqat o'zinikini ko'radi) ----
    if(p.startsWith('/api/notifications')){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      let list = readJSON(NOTIFS_FILE, []);

      if(method==='GET' && p==='/api/notifications'){
        const mine = list.filter(n=>n.userId===u.sub).slice(0,100);
        return send(res,200, mine);
      }
      if(method==='PATCH' && p==='/api/notifications/read-all'){
        let changed=false;
        list.forEach(n=>{ if(n.userId===u.sub && !n.read){ n.read=true; changed=true; } });
        if(changed) writeJSON(NOTIFS_FILE, list);
        return send(res,200,{ok:true});
      }
      const mn = p.match(/^\/api\/notifications\/([a-f0-9]{16})\/read$/);
      if(mn && method==='PATCH'){
        const idx = list.findIndex(n=>n.id===mn[1] && n.userId===u.sub);
        if(idx<0) return send(res,404,{error:'Topilmadi'});
        list[idx].read = true; writeJSON(NOTIFS_FILE, list);
        return send(res,200,{ok:true});
      }
      return send(res,405,{error:'Method not allowed'});
    }

    // ---- VAZIFALAR: FAOLIYAT JURNALI (workspace bo'yicha umumiy, oxirgi 200 ta) ----
    if(method==='GET' && p==='/api/activity'){
      const u = auth(req); if(!u) return send(res,401,{error:'Avtorizatsiya kerak'});
      const list = readJSON(ACTS_FILE, []).slice(0,200);
      return send(res,200, list);
    }

    // CORS preflight
    if(method==='OPTIONS'){ return send(res,204,{}, {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}); }

    return send(res,404,{error:'not found'});
  } catch(err){
    return send(res, typeof err==='string'?400:500, {error: typeof err==='string'?err:'server xatosi'});
  }
});
server.listen(PORT, HOST, ()=> console.log('ZOOD admin backend: http://'+HOST+':'+PORT));

// ---- bir martalik backfill: eski tashkilotlarda mapUrl bor-u, hali
// mapLat/mapLng yechilmagan bo'lsa, ishga tushganda (bosqichma-bosqich,
// har birini 1.5s oralatib — tashqi xizmatni zichlamaslik uchun) yechadi ----
(function backfillMapUrls(){
  const orgs = readJSON(ORGS_FILE, []);
  const todo = orgs.filter(o=> o.mapUrl && o.mapUrlResolvedFor!==o.mapUrl);
  todo.forEach((o,i)=>{
    setTimeout(()=> scheduleMapUrlResolve(o.id, o.mapUrl), 1500*(i+1));
  });
  if(todo.length) console.log('Xarita havolasi yechilishi kutilmoqda: '+todo.length+' ta tashkilot');
})();
