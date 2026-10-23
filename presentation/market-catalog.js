/* Veb market (React build) uchun katalog adapteri.
   Do'kon yo'nalishi tanlangan bo'lsa (catalog.js), market build kutadigan shakldagi ma'lumotni window.ICB_MARKET ga yozadi:
   products, categories, brands, hero, reviews, faq, nav, footer, searchHints, en (ru->en tarjimalar).
   Build ichida har bir ma'lumot massivi `X=window.ICB_MARKET?ICB_MARKET.x:[standart]` ko'rinishida — yo'nalish
   tanlanmagan bo'lsa market o'zgarishsiz (standart katalog) ishlaydi. */
(function(){
  var K = window.ICB_CATALOG && window.ICB_CATALOG.current();
  if(!K) return;
  var L = 'uz'; try { L = localStorage.getItem('glowen-locale') === 'ru' ? 'ru' : 'uz'; } catch(e){}
  function T(o){ return { uz:o.uz, ru:o.ru }; }
  function hex(h){ // hue -> och pastel hex (market accent `${accent}33` ko'rinishida ishlatadi)
    var s=.62, l=.78, a=s*Math.min(l,1-l);
    function f(n){ var k=(n+h/30)%12, c=l-a*Math.max(-1,Math.min(k-3,9-k,1)); return Math.round(255*c).toString(16).padStart(2,'0'); }
    return '#'+f(0)+f(8)+f(4);
  }
  function title(b){ return b.split(' ').map(function(w){ return w.length>3 && w===w.toUpperCase() ? w.charAt(0)+w.slice(1).toLowerCase() : w; }).join(' '); }
  function cap(s){ s=s.toLowerCase(); return s.charAt(0).toUpperCase()+s.slice(1); }
  // market'dagi mavjud ikonkalar: perfume skincare makeup haircare body suncare men nails tools gifts premium kids package
  var ICON = { phones:'premium', computers:'tools', appliances:'package', stationery:'tools', women:'gifts', men:'men', kids:'kids',
    shoes:'package', print:'gifts', cosmetics:'perfume', furniture:'package', grocery:'package', building:'tools', auto:'tools',
    sport:'body', jewelry:'premium', books:'gifts' };

  var cats = K.categories.map(function(c){
    return { id:'c-'+c.id, slug:c.slug, name:T(c.name), icon:ICON[c.niche]||'package', productCount: c.count*37+12, accent: hex(c.hue),
      children:[{ id:'s-'+c.id, slug:'barchasi', name:{uz:'Barcha mahsulotlar',ru:'Все товары'}, items:[] }] };
  });
  var products = K.products.map(function(x){
    var badges = []; if(x.tag) badges.push(x.tag); if(x.discount>=15) badges.push('hot');
    var brand = title(x.brand), nm = x.name[L] || x.name.uz;
    var p = { id:'p-'+x.id, slug:x.slug, name:nm, brand:brand, categoryId:'c-'+x.cat, subcategoryId:'s-'+x.cat, images:[x.image],
      price:x.price, installment: Math.round(x.price/12/1000)*1000, rating:Math.round(x.rating*10)/10, reviewCount:x.reviews,
      badges:badges, inStock:true,
      highlights: L==='ru' ? [x.spec, 'Официальная гарантия', 'Доставка 1–2 дня'] : [x.spec, 'Rasmiy kafolat', 'Yetkazish 1–2 kun'],
      description:{ uz: brand+' — '+x.name.uz+'. Original mahsulot rasmiy kafolat bilan. Rasmiy distribyutordan keltirilgan, sifati tekshirilgan.',
                    ru: brand+' — '+x.name.ru+'. Оригинальный товар с официальной гарантией. От официального дистрибьютора, качество проверено.' },
      usage:[{ uz:'Qo‘llanmaga muvofiq foydalaning.', ru:'Используйте согласно инструкции.' },
             { uz:'Kafolat muddati — 12 oy.', ru:'Гарантийный срок — 12 месяцев.' }],
      ingredients:{ uz:'Qadoqda: mahsulot, kafolat taloni va qo‘llanma.', ru:'В комплекте: товар, гарантийный талон и инструкция.' },
      specifications:[{ label:{uz:'Brend',ru:'Бренд'}, value:brand }, { label:{uz:'Xususiyat',ru:'Характеристика'}, value:x.spec },
                      { label:{uz:'Kafolat',ru:'Гарантия'}, value: L==='ru'?'12 мес':'12 oy' }] };
    if(x.oldPrice) p.oldPrice = x.oldPrice;
    return p;
  });
  var bcount = {};
  K.products.forEach(function(x){ bcount[x.brand]=(bcount[x.brand]||0)+1; });
  var brands = Object.keys(bcount).map(function(b){
    var n = title(b), mono = n.replace(/[^A-Za-z0-9 ]/g,'').split(' ').filter(Boolean).map(function(w){ return w[0]; }).join('').slice(0,3).toUpperCase() || n.slice(0,2).toUpperCase();
    if(mono.length < 2) mono = n.replace(/[^A-Za-z0-9]/g,'').slice(0,3).toUpperCase();
    return { id:'b-'+n.toLowerCase().replace(/[^a-z0-9]+/g,'-'), name:n, monogram:mono, productCount: bcount[b]*24+6 };
  });
  var themes = ['aurora','mint','lavender'];
  var nicheName = {}; window.ICB_CATALOG.NICHES.forEach(function(n){ nicheName[n.key] = n; });
  var hero = K.banners.slice(0,4).map(function(b,i){
    var c = K.categories.filter(function(x){ return x.id===b.cat; })[0];
    return { id:'h-'+(i+1), eyebrow:{uz:nicheName[b.niche].uz, ru:nicheName[b.niche].ru}, title:{uz:cap(b.title.uz), ru:cap(b.title.ru)},
      subtitle:T(b.text), cta:{uz:'Ko‘rish',ru:'Смотреть'}, href:'/c/'+(c?c.slug:''), theme:themes[i%3] };
  });
  var people = [['Dilnoza Karimova','Toshkent','Ташкент'],['Jasur Rahimov','Samarqand','Самарканд'],['Madina Yusupova','Buxoro','Бухара'],['Sardor Aliyev','Andijon','Андижан']];
  var texts = [['Sifati zo‘r, aynan rasmdagidek. Yetkazib berish tez bo‘ldi.','Качество отличное, как на фото. Доставили быстро.'],
               ['Original mahsulot, kafolat taloni bilan keldi. Tavsiya qilaman!','Оригинальный товар, пришёл с гарантийным талоном. Рекомендую!'],
               ['Narxi qulay, bo‘lib to‘lash juda qulay bo‘ldi.','Цена выгодная, рассрочка очень удобная.'],
               ['Qadoqlash puxta, operator tez bog‘landi. Rahmat!','Упаковка надёжная, оператор быстро связался. Спасибо!']];
  var reviews = people.map(function(p,i){ var x = K.products[(i*3)%K.products.length];
    return { id:'r-'+(i+1), author:p[0], location:{uz:p[1],ru:p[2]}, rating:5-(i%2), date:'2025-0'+(6-i)+'-1'+i, verified:true,
      productName: x.name[L]||x.name.uz, text:{uz:texts[i][0], ru:texts[i][1]} }; });
  var nav = [{label:{uz:'Aksiyalar',ru:'Акции'},href:'/aksiyalar',highlight:true},{label:{uz:'Yangi mahsulotlar',ru:'Новинки'},href:'/yangi'}]
    .concat(cats.slice(0,6).map(function(c){ return { label:c.name, href:'/c/'+c.slug }; }));
  var footer = cats.slice(0,5).map(function(c){ return { label:c.name, href:'/c/'+c.slug }; });
  var faq = [
    { id:'f-1', question:{uz:'Mahsulotlar 100% original ekaniga kafolat bormi?',ru:'Есть ли гарантия, что товары 100% оригинальные?'},
      answer:{uz:'Barcha mahsulotlar faqat rasmiy distribyutorlardan keladi va rasmiy kafolat taloni bilan beriladi — soxta mahsulot sotilmaydi.',ru:'Все товары поступают только от официальных дистрибьюторов и продаются с официальным гарантийным талоном — подделки не продаются.'} },
    { id:'f-2', question:{uz:'Yetkazib berish qancha vaqt oladi?',ru:'Сколько времени занимает доставка?'},
      answer:{uz:'Toshkent shahri bo‘ylab buyurtmalar 2 soat ichida, viloyatlarga esa 1–2 ish kunida yetkazib beriladi. Yetkazish holatini profil bo‘limidan kuzatishingiz mumkin.',ru:'По Ташкенту заказы доставляются в течение 2 часов, по регионам — за 1–2 рабочих дня. Статус можно отслеживать в профиле.'} },
    { id:'f-3', question:{uz:'Mahsulotni qaytarish mumkinmi?',ru:'Можно ли вернуть товар?'},
      answer:{uz:'Ha, ishlatilmagan va qadog‘i buzilmagan mahsulotni 14 kun ichida qaytarishingiz mumkin. Kafolat bo‘yicha nosozlik bo‘lsa — bepul ta’mirlaymiz yoki almashtiramiz.',ru:'Да, неиспользованный товар в целой упаковке можно вернуть в течение 14 дней. При гарантийной неисправности — бесплатно отремонтируем или заменим.'} },
    { id:'f-4', question:{uz:'Menga mos mahsulotni qanday tanlayman?',ru:'Как выбрать подходящий товар?'},
      answer:{uz:'Har bir mahsulot sahifasida asosiy xususiyatlar va kafolat ma’lumoti bor. Bepul maslahat uchun mutaxassislarimizga murojaat qilishingiz mumkin.',ru:'На странице каждого товара указаны основные характеристики и гарантия. За бесплатной консультацией можно обратиться к нашим специалистам.'} },
    { id:'f-5', question:{uz:'Qanday to‘lov usullari mavjud?',ru:'Какие способы оплаты доступны?'},
      answer:{uz:'Uzcard va Humo kartalari, mashhur to‘lov ilovalari, naqd pul (yetkazib berishda) hamda bo‘lib to‘lash orqali to‘lashingiz mumkin.',ru:'Оплатить можно картами Uzcard и Humo, платёжными приложениями, наличными при доставке, а также в рассрочку.'} }];
  var searchHints = K.products.slice(0,6).map(function(x){ return { uz:x.name.uz, ru:x.name.ru }; });
  // EN overlay (market-i18n.js): ruscha -> inglizcha
  var en = {};
  K.categories.forEach(function(c){ en[c.name.ru] = c.name.en; });
  K.products.forEach(function(x){ if(x.name.ru !== x.name.en) en[x.name.ru] = x.name.en; });
  K.banners.forEach(function(b){ en[cap(b.title.ru)] = cap(b.title.en); en[b.text.ru] = b.text.en; });
  window.ICB_CATALOG.NICHES.forEach(function(n){ en[n.ru] = n.en; });
  Object.assign(en, { 'Все товары':'All products', 'Смотреть':'View', 'Официальная гарантия':'Official warranty', 'Доставка 1–2 дня':'Delivery 1–2 days',
    'Бренд':'Brand', 'Характеристика':'Feature', 'Гарантия':'Warranty', '12 мес':'12 mo', 'Используйте согласно инструкции.':'Use according to the manual.',
    'Гарантийный срок — 12 месяцев.':'Warranty period — 12 months.', 'В комплекте: товар, гарантийный талон и инструкция.':'Included: product, warranty card and manual.' });

  window.ICB_MARKET = { products:products, categories:cats, brands:brands, hero:hero, reviews:reviews, faq:faq, nav:nav, footer:footer, searchHints:searchHints, en:en };
})();
