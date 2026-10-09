// Vazifalar (Tasks) bo'limi uchun umumiy konstantalar/yordamchi funksiyalar.
export const STATUS_LIST = [
  { key:'todo',     label:'Bajarilishi kerak', color:'#8CA0A8' },
  { key:'progress', label:'Jarayonda',         color:'#3D9DC9' },
  { key:'review',   label:'Tekshiruvda',       color:'#E8A13F' },
  { key:'done',     label:'Bajarildi',         color:'#46B26C' },
];
export const PRIORITY_LIST = [
  { key:'low',    label:'Past' },
  { key:'medium', label:'O\'rta' },
  { key:'high',   label:'Yuqori' },
];
export function statusLabel(k){ const s = STATUS_LIST.find(x=>x.key===k); return s ? s.label : k; }
export function statusColor(k){ const s = STATUS_LIST.find(x=>x.key===k); return s ? s.color : '#8CA0A8'; }
export function priorityLabel(k){ const p = PRIORITY_LIST.find(x=>x.key===k); return p ? p.label : k; }
export function initials(name){
  const n = String(name||'').trim();
  if(!n) return '?';
  const parts = n.split(/\s+/);
  return ((parts[0]||'')[0]||'').toUpperCase() + ((parts[1]||'')[0]||'').toUpperCase();
}
export function actorNameOf(team, id){
  if(!id) return '';
  const a = (team||[]).find(x=>x.id===id);
  return a ? a.name : '';
}
export function fmtDate(iso){
  if(!iso) return '';
  try{
    const [y,m,d] = iso.split('-');
    return d+'.'+m+'.'+y;
  }catch(e){ return iso; }
}
export function todayISO(){
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
export function isOverdue(dueDate, status){
  if(!dueDate || status==='done') return false;
  return dueDate < todayISO();
}
export function isDueToday(dueDate){
  return !!dueDate && dueDate === todayISO();
}
// Muddati o'tgan vazifa uchun necha kun kechikkanini hisoblaydi (musbat butun son).
export function daysLate(dueDate){
  if(!dueDate) return 0;
  const a = new Date(dueDate+'T00:00:00'), b = new Date(todayISO()+'T00:00:00');
  return Math.max(0, Math.round((b-a)/86400000));
}
// Berilgan sanaga N kun qo'shib ISO (YYYY-MM-DD) qaytaradi (kalendar/hafta hisob-kitobi uchun)
export function addDaysISO(iso, n){
  const d = new Date(iso+'T00:00:00');
  d.setDate(d.getDate()+n);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
export const PROJECT_ICONS = ['📁','🚀','💼','🎯','📊','🛠️','📦','🌐','💡','🏗️','📱','🎨'];
export const PROJECT_COLORS = ['#2FA9BF','#46B26C','#E8A13F','#E05B4E','#3D9DC9','#8B5CF6','#EC4899','#0C6440'];

// Kanban ustun sarlavhalarini shu brauzerda qayta nomlash (backendga
// yozilmaydi — faqat lokal ko'rinish uchun, chunki vazifa "status" qiymati
// serverda qat'iy ro'yxat bilan tekshiriladi).
const COL_LABEL_KEY = 'zood-admin-col-labels';
function readColLabels(){
  try{ return JSON.parse(localStorage.getItem(COL_LABEL_KEY) || '{}'); }catch(e){ return {}; }
}
// `scope` — qaysi joyda qayta nomlangani: loyiha ichida bo'lsa loyiha id'si,
// "Umumiy vazifalar"da bo'lsa bo'sh/undefined ('all'). Shu tufayli bitta
// loyihada ustun nomini o'zgartirish boshqa loyihalarga ta'sir qilmaydi.
function colLabelKey(key, scope){ return (scope || 'all') + ':' + key; }
export function getColumnLabel(key, fallback, scope){
  const m = readColLabels();
  const k = colLabelKey(key, scope);
  return (m[k] && m[k].trim()) ? m[k] : fallback;
}
export function setColumnLabel(key, label, scope){
  const m = readColLabels();
  const k = colLabelKey(key, scope);
  if(label && label.trim()) m[k] = label.trim(); else delete m[k];
  try{ localStorage.setItem(COL_LABEL_KEY, JSON.stringify(m)); }catch(e){}
}

// Loyihaga hodimlarni biriktirish (shu brauzerda) — backendda loyiha sxemasi
// hali "members" maydonini bilmaydi, shuning uchun hozircha faqat lokal
// ko'rinish uchun localStorage'da saqlanadi (Kanban ustun nomlari kabi).
const PROJ_MEMBERS_KEY = 'zood-admin-proj-members';
function readProjMembers(){
  try{ return JSON.parse(localStorage.getItem(PROJ_MEMBERS_KEY) || '{}'); }catch(e){ return {}; }
}
export function getProjectMembers(projectId){
  const m = readProjMembers();
  return Array.isArray(m[projectId]) ? m[projectId] : [];
}
export function setProjectMembers(projectId, memberIds){
  const m = readProjMembers();
  if(memberIds && memberIds.length) m[projectId] = memberIds; else delete m[projectId];
  try{ localStorage.setItem(PROJ_MEMBERS_KEY, JSON.stringify(m)); }catch(e){}
}
