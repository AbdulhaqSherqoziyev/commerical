// O'zbekiston viloyatlari / tumanlari — manzil tanlash uchun statik ma'lumot.
// Ro'yxatlar to'liqlikka da'vo qilmaydi, lekin amaliy foydalanish uchun yetarli.

export const UZ_REGIONS = {
  "Qoraqalpog'iston Respublikasi": ["Nukus shahri","Amudaryo","Beruniy","Chimboy","Ellikqal'a","Kegeyli","Moʻynoq","Nukus tumani","Qanlikoʻl","Qoraoʻzak","Qoʻngʻirot","Shumanay","Taxtakoʻpir","Toʻrtkoʻl","Xoʻjayli"],
  "Andijon viloyati": ["Andijon shahri","Andijon tumani","Asaka","Baliqchi","Boʻz","Buloqboshi","Izboskan","Jalaquduq","Xoʻjaobod","Qoʻrgʻontepa","Marhamat","Oltinkoʻl","Paxtaobod","Shahrixon","Ulugʻnor","Xonobod","Qorasuv"],
  "Buxoro viloyati": ["Buxoro shahri","Buxoro tumani","Gʻijduvon","Jondor","Kogon","Olot","Peshku","Qorakoʻl","Qorovulbozor","Romitan","Shofirkon","Vobkent"],
  "Farg'ona viloyati": ["Farg'ona shahri","Qoʻqon","Margʻilon","Farg'ona tumani","Bagʻdod","Beshariq","Buvayda","Dangʻara","Furqat","Oltiariq","Quva","Qoʻshtepa","Rishton","Soʻx","Toshloq","Uchkoʻprik","Oʻzbekiston","Yozyovon"],
  "Jizzax viloyati": ["Jizzax shahri","Arnasoy","Baxmal","Doʻstlik","Forish","Gʻallaorol","Zomin","Mirzachoʻl","Paxtakor","Yangiobod","Zafarobod","Zarbdor","Sharof Rashidov"],
  "Xorazm viloyati": ["Urganch shahri","Urganch tumani","Bogʻot","Gurlan","Xazorasp","Xonqa","Qoʻshkoʻpir","Shovot","Yangiariq","Yangibozor","Xiva"],
  "Namangan viloyati": ["Namangan shahri","Chortoq","Chust","Kosonsoy","Mingbuloq","Namangan tumani","Norin","Pop","Toʻraqoʻrgʻon","Uychi","Uchqoʻrgʻon","Yangiqoʻrgʻon"],
  "Navoiy viloyati": ["Navoiy shahri","Zarafshon","Konimex","Karmana","Xatirchi","Nurota","Qiziltepa","Tomdi","Uchquduq","Navbahor"],
  "Qashqadaryo viloyati": ["Qarshi shahri","Qarshi tumani","Dehqonobod","Gʻuzor","Kasbi","Kitob","Koson","Mirishkor","Muborak","Nishon","Chiroqchi","Shahrisabz","Yakkabogʻ"],
  "Samarqand viloyati": ["Samarqand shahri","Bulungʻur","Ishtixon","Jomboy","Kattaqoʻrgʻon","Narpay","Nurobod","Oqdaryo","Payariq","Paxtachi","Pastdargʻom","Qoʻshrabot","Toyloq","Urgut"],
  "Sirdaryo viloyati": ["Guliston shahri","Boyovut","Guliston tumani","Mirzaobod","Oqoltin","Sardoba","Sayxunobod","Sirdaryo","Xovos","Yangiyer"],
  "Surxondaryo viloyati": ["Termiz shahri","Angor","Bandixon","Boysun","Denov","Jarqoʻrgʻon","Muzrabot","Oltinsoy","Qiziriq","Qumqoʻrgʻon","Sariosiyo","Sherobod","Shoʻrchi","Uzun"],
  "Toshkent viloyati": ["Angren","Bekobod","Chirchiq","Olmaliq","Bekobod tumani","Boʻka","Boʻstonliq","Chinoz","Ohangaron","Oqqoʻrgʻon","Parkent","Piskent","Qibray","Quyichirchiq","Toʻytepa","Oʻrtachirchiq","Yangiyoʻl","Yuqorichirchiq","Zangiota"],
  "Toshkent shahri": ["Bektemir","Chilonzor","Yakkasaroy","Mirzo Ulug'bek","Mirobod","Olmazor","Sergeli","Shayxontohur","Uchtepa","Yashnobod","Yunusobod","Yangihayot"]
};

export const REGION_NAMES = Object.keys(UZ_REGIONS);

// Viloyat markazlarining taxminiy koordinatalari — xarita markazlash uchun
export const REGION_COORDS = {
  "Qoraqalpog'iston Respublikasi": [42.4531, 59.6103],
  "Andijon viloyati": [40.7821, 72.3442],
  "Buxoro viloyati": [39.7747, 64.4286],
  "Farg'ona viloyati": [40.3864, 71.7864],
  "Jizzax viloyati": [40.1158, 67.8422],
  "Xorazm viloyati": [41.5500, 60.6333],
  "Namangan viloyati": [40.9983, 71.6726],
  "Navoiy viloyati": [40.1030, 65.3686],
  "Qashqadaryo viloyati": [38.8606, 65.7891],
  "Samarqand viloyati": [39.6542, 66.9597],
  "Sirdaryo viloyati": [40.4897, 68.7842],
  "Surxondaryo viloyati": [37.2242, 67.2783],
  "Toshkent viloyati": [41.0167, 69.3417],
  "Toshkent shahri": [41.2995, 69.2401]
};

// Barcha tumanlar bitta tekis ro'yxatda — viloyat tanlanmagan holatda qidiruv uchun
export const ALL_DISTRICTS = REGION_NAMES.flatMap(region =>
  UZ_REGIONS[region].map(d => ({ value: d, region }))
);

export function yandexSearchUrl(region, district){
  const q = [district, region, "O'zbekiston"].filter(Boolean).join(', ');
  return 'https://yandex.uz/maps/?text=' + encodeURIComponent(q);
}
