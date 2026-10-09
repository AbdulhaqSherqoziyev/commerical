// Tashkilot bilan ishlash bosqichlari (sotuv pipeline)

export const STATUSES = [
  { key: 'new',         label: 'Yangi',           color: '#7C8398' },
  { key: 'contacted',   label: 'Aloqa qilindi',   color: '#E2A93A' },
  { key: 'negotiating', label: 'Kelishilmoqda',   color: '#4A4FC4' },
  { key: 'client',      label: "Mijoz bo'ldi",    color: '#12A150' },
  { key: 'rejected',    label: 'Rad etildi',      color: '#E23B4E' },
];

export function statusOf(org){
  const key = (org && org.status) || 'new';
  return STATUSES.find(s => s.key === key) || STATUSES[0];
}
