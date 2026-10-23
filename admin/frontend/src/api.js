const BASE = '/api';
// Tenant subdomenlar domeni — kelajakda faqat shu qatorni o'zgartiring
export const DOMAIN = 'commercial-icanbusiness.uz';
let token = null;
try { token = localStorage.getItem('icb-admin-token'); } catch(e){}
export function getToken(){ return token; }
export function setToken(t){ token = t; try{ t?localStorage.setItem('icb-admin-token',t):localStorage.removeItem('icb-admin-token'); }catch(e){} }
async function req(method, path, body){
  const h = { 'Content-Type':'application/json' };
  if(token) h['Authorization'] = 'Bearer '+token;
  let r;
  try {
    r = await fetch(BASE+path, { method, headers:h, body: body?JSON.stringify(body):undefined });
  } catch(e){ throw { status:0, error:'Ulanish xatosi yoki fayl juda katta' }; }
  let data = null; try { data = await r.json(); } catch(e){}
  if(r.status===401){ setToken(null); throw { status:401, error:'Sessiya tugadi — qayta kiring' }; }
  if(r.status===413){ throw { status:413, error:'Fayl juda katta' }; }
  if(!r.ok) throw { status:r.status, error:(data&&data.error)||('Xatolik ('+r.status+')') };
  return data;
}
export const api = {
  login: (username,password)=>req('POST','/auth/login',{username,password}),
  changePass: (oldp,newp)=>req('POST','/auth/password',{old:oldp,new:newp}),
  list: ()=>req('GET','/orgs'),
  create: (org)=>req('POST','/orgs',org),
  update: (id,org)=>req('PUT','/orgs/'+id,org),
  toggle: (id)=>req('PATCH','/orgs/'+id+'/toggle'),
  visited: (id)=>req('PATCH','/orgs/'+id+'/visited'),
  setStatus: (id,status)=>req('PATCH','/orgs/'+id+'/status',{status}),
  addVisit: (id,note)=>req('POST','/orgs/'+id+'/visits',{note}),
  remove: (id)=>req('DELETE','/orgs/'+id),
  restore: (id)=>req('PATCH','/orgs/'+id+'/restore'),
  purge: (id)=>req('DELETE','/orgs/'+id+'/purge'),
};
