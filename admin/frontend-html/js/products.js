/* Mahsulot/xizmatlar ro'yxati + summa formatlash (tiklangan). */
export const PRODUCTS = [
  'Agent veb panel','Agent mobil ilova','Mijoz ilovasi','Investor kabineti',
  'Veb do‘kon','Mobil market','Prezentatsiya sayti','Domen + hosting',
];
export function fmtSum(n){
  const x = Math.round(Number(n) || 0);
  return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
