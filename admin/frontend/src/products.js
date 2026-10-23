// Tashkilotga taqdim etiladigan mahsulot/xizmatlar ro'yxati (kelishuv uchun)

export const PRODUCTS = [
  "Agent veb-panel",
  "Agent mobil ilova",
  "Mijoz ilovasi",
  "iCAN Mobil",
  "Investor kabineti",
  "Veb-do'kon (Market)",
  "Mobil market ilovasi",
  "SMS xabarnoma xizmati",
  "To'lov tizimi integratsiyasi",
  "Texnik qo'llab-quvvatlash",
];

export function fmtSum(n){
  const num = Number(n) || 0;
  return num.toLocaleString('ru-RU').replace(/,/g, ' ');
}
