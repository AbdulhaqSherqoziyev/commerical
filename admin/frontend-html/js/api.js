const BASE = '/api';
// Tenant subdomenlar domeni — kelajakda faqat shu qatorni o'zgartiring
export const DOMAIN = 'commercial-icanbusiness.uz';
let token = null;
try { token = localStorage.getItem('zood-admin-token'); } catch(e){}
export function getToken(){ return token; }
export function setToken(t){ token = t; try{ t?localStorage.setItem('zood-admin-token',t):localStorage.removeItem('zood-admin-token'); }catch(e){} }
// Token hali amal qiladimi (client tomonda exp tekshiruvi — server tv/imzoni baribir tekshiradi)
export function tokenValid(){
  if(!token) return false;
  try { const p = JSON.parse(atob(String(token).split('.')[0].replace(/-/g,'+').replace(/_/g,'/'))); return typeof p.exp==='number' && p.exp > Date.now(); }
  catch(e){ return false; }
}
// Token ichidan joriy foydalanuvchi (login) ni olish
export function getUser(){
  if(!token) return '';
  try { const p = JSON.parse(atob(String(token).split('.')[0].replace(/-/g,'+').replace(/_/g,'/'))); return p.u || ''; }
  catch(e){ return ''; }
}
// Token ichidan rol ('admin' | 'xodim'). Eski (shu funksiya qo'shilishidan
// oldingi) tokenlarda role maydoni yo'q — ular hammasi asosiy admin edi,
// shuning uchun sukut bo'yicha 'admin' qaytadi (server tokenni baribir
// live tekshiradi — bu faqat interfeys ko'rinishi/menyu uchun).
export function getRole(){
  if(!token) return 'admin';
  try { const p = JSON.parse(atob(String(token).split('.')[0].replace(/-/g,'+').replace(/_/g,'/'))); return p.role || 'admin'; }
  catch(e){ return 'admin'; }
}
// Token ichidan joriy "ijrochi" (actor) id'si — 'owner' yoki xodim id'si.
// Vazifalar bo'limida vazifa.assignee shu qiymat bilan solishtiriladi
// ("Vazifalarim" bo'limi uchun — kim menga biriktirilgan vazifalarni ko'radi).
export function getSub(){
  if(!token) return 'owner';
  try { const p = JSON.parse(atob(String(token).split('.')[0].replace(/-/g,'+').replace(/_/g,'/'))); return p.sub || 'owner'; }
  catch(e){ return 'owner'; }
}
async function req(method, path, body){
  const h = { 'Content-Type':'application/json' };
  if(token) h['Authorization'] = 'Bearer '+token;
  let r;
  try {
    r = await fetch(BASE+path, { method, headers:h, body: body?JSON.stringify(body):undefined });
  } catch(e){ throw { status:0, error:'Ulanish xatosi yoki fayl juda katta' }; }
  let data = null; try { data = await r.json(); } catch(e){}
  if(r.status===401){ setToken(null); try{ window.dispatchEvent(new Event('zood-auth-expired')); }catch(e){} throw { status:401, error:'Sessiya tugadi — qayta kiring' }; }
  if(r.status===413){ throw { status:413, error:'Fayl juda katta' }; }
  if(!r.ok) throw { status:r.status, error:(data&&data.error)||('Xatolik ('+r.status+')') };
  return data;
}
export const api = {
  login: (username,password)=>req('POST','/auth/login',{username,password}),
  changePass: (oldp,newp,newUser)=>req('POST','/auth/password',{old:oldp,new:newp,newUser}),
  logoutAll: ()=>req('POST','/auth/logout-all'),
  audit: ()=>req('GET','/audit'),
  me: ()=>req('GET','/auth/me'),
  saveProfile: (p)=>req('POST','/auth/profile',p),
  list: ()=>req('GET','/orgs'),
  create: (org)=>req('POST','/orgs',org),
  update: (id,org)=>req('PUT','/orgs/'+id,org),
  toggle: (id)=>req('PATCH','/orgs/'+id+'/toggle'),
  remove: (id)=>req('DELETE','/orgs/'+id),
  visited: (id)=>req('PATCH','/orgs/'+id+'/visited'),
  setStatus: (id,status)=>req('PATCH','/orgs/'+id+'/status',{status}),
  visit: (id,note)=>req('POST','/orgs/'+id+'/visit',{note}),
  restore: (id)=>req('PATCH','/orgs/'+id+'/restore'),
  purge: (id)=>req('DELETE','/orgs/'+id+'/purge'),
  // Mijozlar (clients) — prezentatsiyadan alohida CRM
  clientsList: ()=>req('GET','/clients'),
  // Tashkilot sozlamalari — imkoniyatlar (dostup), narxlar, bloklash
  // moslamalari va to'lov tashkilotlari. clients.json dan ALOHIDA faylda
  // saqlanadi (backend: client-settings.json).
  clientSettingsAll: ()=>req('GET','/clients/settings'),   // barchasi (jadval ustunlari uchun)
  clientSettings: (id)=>req('GET','/clients/'+id+'/settings'),
  clientSettingsSave: (id, body)=>req('PUT','/clients/'+id+'/settings', body),
  // Tranzaksiyalar — filial hisobvarag'i bo'yicha kirim/chiqim
  txList: (id, q)=>req('GET','/clients/'+id+'/transactions'+(q||'')),
  txAdd: (id, body)=>req('POST','/clients/'+id+'/transactions', body),
  txAll: (q)=>req('GET','/transactions'+(q||'')),
  // Barcha filiallarning balansi (tranzaksiyalardan hisoblanadi)
  txBalances: ()=>req('GET','/clients/balances'),
  // Sarflash hisoboti — oylar kesimida, amallar bo'yicha
  txUsage: (id, months)=>req('GET','/clients/'+id+'/usage?months='+(months||13)),
  txDelete: (txId)=>req('DELETE','/transactions/'+txId),
  // Bir nechta tashkilotga bir xil sozlamani qo'llash
  clientSettingsBulk: (ids, patch)=>req('PUT','/clients/settings/bulk', { ids, patch }),
  clientCreate: (c)=>req('POST','/clients',c),
  clientUpdate: (id,c)=>req('PUT','/clients/'+id,c),
  clientRemove: (id)=>req('DELETE','/clients/'+id),
  clientsImport: (clients)=>req('POST','/clients/import',{clients}),
  // Xarita: haqiqiy yo'l geometriyasi (server orqali — CSP/CORS'siz)
  route: (coords)=>req('GET','/route?coords='+encodeURIComponent(coords)),
  // Xodimlar (Super Admin panelga kiradigan kichik hisoblar) — faqat asosiy admin
  staffList: ()=>req('GET','/staff'),
  staffCreate: (s)=>req('POST','/staff',s),
  staffUpdate: (id,s)=>req('PUT','/staff/'+id,s),
  staffToggle: (id)=>req('PATCH','/staff/'+id+'/toggle'),
  staffRemove: (id)=>req('DELETE','/staff/'+id),
  // Bo'limlar (xodim biriktiriladigan bo'lim nomlari — faqat ma'lumot/filtr uchun)
  deptList: ()=>req('GET','/departments'),
  deptCreate: (name)=>req('POST','/departments',{name}),
  deptRemove: (id)=>req('DELETE','/departments/'+id),
  // Jamoa (vazifa biriktirish uchun soddalashtirilgan ro'yxat — owner + faol xodimlar)
  team: ()=>req('GET','/team'),
  // Vazifalar (Tasks) — loyihalar
  projectsList: ()=>req('GET','/projects'),
  projectCreate: (p)=>req('POST','/projects',p),
  projectUpdate: (id,p)=>req('PUT','/projects/'+id,p),
  projectArchive: (id)=>req('PATCH','/projects/'+id+'/archive'),
  projectFavorite: (id)=>req('PATCH','/projects/'+id+'/favorite'),
  projectDuplicate: (id)=>req('POST','/projects/'+id+'/duplicate'),
  projectRemove: (id)=>req('DELETE','/projects/'+id),
  // Vazifalar — vazifalarning o'zi
  tasksList: (projectId)=>req('GET','/tasks'+(projectId?('?projectId='+encodeURIComponent(projectId)):'')),
  taskCreate: (t)=>req('POST','/tasks',t),
  taskUpdate: (id,t)=>req('PUT','/tasks/'+id,t),
  taskMove: (id,status,ord)=>req('PATCH','/tasks/'+id+'/move',{status,ord}),
  taskStar: (id)=>req('PATCH','/tasks/'+id+'/star'),
  taskRemove: (id)=>req('DELETE','/tasks/'+id),
  checklistAdd: (id,text)=>req('POST','/tasks/'+id+'/checklist',{text}),
  checklistToggle: (id,cid)=>req('PATCH','/tasks/'+id+'/checklist/'+cid+'/toggle'),
  checklistRemove: (id,cid)=>req('DELETE','/tasks/'+id+'/checklist/'+cid),
  commentAdd: (id,text)=>req('POST','/tasks/'+id+'/comments',{text}),
  // Vazifalar — yorliqlar
  labelsList: ()=>req('GET','/labels'),
  labelCreate: (name,color)=>req('POST','/labels',{name,color}),
  labelRemove: (id)=>req('DELETE','/labels/'+id),
  // Vazifalar — bildirishnomalar / faoliyat jurnali
  notifsList: ()=>req('GET','/notifications'),
  notifRead: (id)=>req('PATCH','/notifications/'+id+'/read'),
  notifsReadAll: ()=>req('PATCH','/notifications/read-all'),
  activityList: ()=>req('GET','/activity'),
};
