/* Tashkilot holatlari (pipeline) — backend ALLOWED_STATUS bilan mos. */
export const STATUSES = [
  { key:'new',      label:'Yangi',     color:'#2E7DF6' },
  { key:'talks',    label:'Muzokara',  color:'#E0A100' },
  { key:'contract', label:'Shartnoma', color:'#8B5CF6' },
  { key:'active',   label:'Faol',      color:'#12A150' },
];
export function statusOf(o){
  const k = (o && o.status) || 'new';
  return STATUSES.find(s => s.key === k) || STATUSES[0];
}
