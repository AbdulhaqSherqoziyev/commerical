/* O'zbekiston viloyat/tuman ma'lumotlari + xarita markazlari (tiklangan). */
export const UZ_REGIONS = {
  'Toshkent shahri': ['Bektemir','Chilonzor','Yashnobod','Mirobod','Mirzo Ulug‘bek','Sergeli','Shayxontohur','Olmazor','Uchtepa','Yakkasaroy','Yunusobod','Yangihayot'],
  'Toshkent viloyati': ['Angren','Bekobod','Bo‘ka','Bo‘stonliq','Chinoz','Qibray','Ohangaron','Oqqo‘rg‘on','Parkent','Piskent','Quyichirchiq','O‘rtachirchiq','Yuqorichirchiq','Yangiyo‘l','Zangiota','Chirchiq','Nurafshon','Olmaliq','G‘azalkent'],
  'Andijon viloyati': ['Andijon shahri','Andijon tumani','Asaka','Baliqchi','Bo‘ston','Buloqboshi','Izboskan','Jalaquduq','Xo‘jaobod','Qo‘rg‘ontepa','Marhamat','Oltinko‘l','Paxtaobod','Shahrixon','Ulug‘nor','Xonobod'],
  'Buxoro viloyati': ['Buxoro shahri','Buxoro tumani','Vobkent','G‘ijduvon','Jondor','Kogon','Qorako‘l','Qorovulbozor','Olot','Peshku','Romitan','Shofirkon'],
  'Farg‘ona viloyati': ['Farg‘ona shahri','Farg‘ona tumani','Beshariq','Bog‘dod','Buvayda','Dang‘ara','Furqat','Qo‘shtepa','Quva','Rishton','So‘x','Toshloq','Uchko‘prik','O‘zbekiston','Yozyovon','Oltiariq','Marg‘ilon','Quvasoy','Qo‘qon'],
  'Jizzax viloyati': ['Jizzax shahri','Arnasoy','Baxmal','Do‘stlik','Forish','G‘allaorol','Sharof Rashidov','Mirzacho‘l','Paxtakor','Yangiobod','Zafarobod','Zarbdor','Zomin'],
  'Qashqadaryo viloyati': ['Qarshi shahri','Qarshi tumani','Chiroqchi','Dehqonobod','G‘uzor','Qamashi','Kasbi','Kitob','Ko‘kdala','Mirishkor','Muborak','Nishon','Shahrisabz','Yakkabog‘','Koson'],
  'Navoiy viloyati': ['Navoiy shahri','Karmana','Konimex','Navbahor','Nurota','Qiziltepa','Tomdi','Uchquduq','Xatirchi','Zarafshon'],
  'Namangan viloyati': ['Namangan shahri','Namangan tumani','Chortoq','Chust','Kosonsoy','Mingbuloq','Norin','Pop','To‘raqo‘rg‘on','Uychi','Uchqo‘rg‘on','Yangiqo‘rg‘on','Davlatobod'],
  'Samarqand viloyati': ['Samarqand shahri','Samarqand tumani','Bulung‘ur','Ishtixon','Jomboy','Kattaqo‘rg‘on shahri','Kattaqo‘rg‘on tumani','Qo‘shrabot','Narpay','Nurobod','Oqdaryo','Paxtachi','Payariq','Pastdarg‘om','Toyloq','Urgut'],
  'Sirdaryo viloyati': ['Guliston shahri','Guliston tumani','Boyovut','Sardoba','Sayxunobod','Sirdaryo','Xovos','Mirzaobod','Oqoltin','Yangiyer','Shirin','Baxt'],
  'Surxondaryo viloyati': ['Termiz shahri','Termiz tumani','Angor','Bandixon','Boysun','Denov','Jarqo‘rg‘on','Qiziriq','Qumqo‘rg‘on','Muzrabot','Oltinsoy','Sariosiyo','Sherobod','Sho‘rchi','Uzun'],
  'Xorazm viloyati': ['Urganch shahri','Urganch tumani','Bog‘ot','Gurlan','Xonqa','Hazorasp','Xiva','Qo‘shko‘pir','Shovot','Yangiariq','Yangibozor','Tuproqqal‘a','Pitnak'],
  'Qoraqalpog‘iston Respublikasi': ['Nukus shahri','Nukus tumani','Amudaryo','Beruniy','Chimboy','Ellikqal‘a','Kegeyli','Mo‘ynoq','Qanliko‘l','Qorao‘zak','Qo‘ng‘irot','Shumanay','Taxtako‘pir','To‘rtko‘l','Xo‘jayli','Bo‘zatov'],
};
export const REGION_NAMES = Object.keys(UZ_REGIONS);
export const ALL_DISTRICTS = REGION_NAMES.flatMap(r => UZ_REGIONS[r].map(d => ({ value: d, region: r, label: d + ' (' + r + ')' })));
export const REGION_COORDS = {
  'Toshkent shahri':[41.311,69.280],'Toshkent viloyati':[41.20,69.80],'Andijon viloyati':[40.783,72.350],
  'Buxoro viloyati':[39.767,64.421],'Farg‘ona viloyati':[40.386,71.787],'Jizzax viloyati':[40.116,67.842],
  'Qashqadaryo viloyati':[38.860,65.790],'Navoiy viloyati':[40.084,65.379],'Namangan viloyati':[40.998,71.672],
  'Samarqand viloyati':[39.627,66.975],'Sirdaryo viloyati':[40.489,68.783],'Surxondaryo viloyati':[37.224,67.278],
  'Xorazm viloyati':[41.550,60.631],'Qoraqalpog‘iston Respublikasi':[42.460,59.617],
};
export function yandexSearchUrl(region, district){
  const q = [district, region, 'Uzbekistan'].filter(Boolean).join(', ');
  return 'https://yandex.uz/maps/?text=' + encodeURIComponent(q);
}
