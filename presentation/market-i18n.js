/* ZOODMALL desktop market — EN overlay.
   Prezentatsiya EN tanlaganda market ruscha render bo'ladi (localStorage['glowen-locale']='ru')
   va localStorage['zood-ui-en']='1' bo'ladi. Bu skript ruscha matnni inglizchaga o'giradi.
   Mahsulot nomlari, brendlar, narxlarga tegmaydi. Build ichiga tegilmaydi. */
(function(){
  function active(){ try { return localStorage.getItem('zood-ui-en') === '1'; } catch(e){ return false; } }
  if (!active()) return;
  try { document.documentElement.setAttribute('lang','en'); } catch(e){}

  // ru -> en (aniq moslik)
  var D = {
    "Мобильные приложения":"Mobile apps","Каталог":"Catalog","Избранное":"Wishlist","Корзина":"Cart",
    "Войти":"Sign in","Акции":"Deals","Новинки":"New","Главная":"Home","Все":"All","Магазин":"Store",
    "Популярные":"Popular","Контакты":"Contacts","Все права защищены":"All rights reserved",
    // kategoriyalar
    "Парфюмерия":"Perfume","Уход за лицом":"Face care","Макияж":"Makeup","Уход за волосами":"Hair care",
    "Для мужчин":"For men","Уход за телом":"Body care","Защита от солнца":"Sun protection","Ногти":"Nails",
    "Аксессуары":"Accessories","Детям":"For kids","Подарочные наборы":"Gift sets","Премиум и Люкс":"Premium & Luxury",
    "Уход за кожей":"Skincare","Все товары":"All products",
    // hero / bannerlar
    "Новая коллекция":"New collection","Ваш аромат —\nваша подпись":"Your scent —\nyour signature",
    "Самые известные ароматы мира — оригинал и официальная гарантия":"The world's most famous fragrances — original and official warranty",
    "Смотреть ароматы":"Shop fragrances","Гарантированный опыт":"Guaranteed experience","Гарантия":"Warranty",
    "Здоровая кожа\nкаждый день":"Healthy skin\nevery day",
    "CeraVe, La Roche-Posay и Estée Lauder — со скидкой до 20%":"CeraVe, La Roche-Posay and Estée Lauder — up to 20% off",
    "Начать уход":"Start caring","Играйте\nс цветом":"Play\nwith color",
    "Maybelline, MAC и NYX — любимая косметика по выгодным ценам":"Maybelline, MAC and NYX — favorite cosmetics at great prices",
    "Каталог макияжа":"Makeup catalog","Молниеносная распродажа":"Flash sale",
    "Ограниченное время — до конца акции":"Limited time — until the sale ends","Смотреть все":"View all",
    // seksiyalar
    "Популярные товары":"Popular products","Бестселлеры недели":"Bestsellers of the week","Показать ещё":"Show more",
    "Новые поступления":"New arrivals","Самые свежие товары в магазине":"The freshest products in the store",
    "Будьте в курсе лучших предложений":"Stay updated on the best deals",
    "Узнавайте о новых скидках и товарах первыми":"Be the first to know about new deals and products",
    "Подписаться":"Subscribe",
    "Подписываясь, вы соглашаетесь с политикой конфиденциальности.":"By subscribing, you agree to the privacy policy.",
    "Премиальный онлайн-маркетплейс":"Premium online marketplace",
    // mahsulot kartasi / badge
    "В корзину":"Add to cart","НОВОЕ":"NEW","ТОП":"TOP","ЛИМИТ":"LIMITED","Хит":"HIT",
    // mahsulot sahifasi
    "Наличные":"Cash","Рассрочка":"Installment","Полная оплата":"Full payment","Купить сейчас":"Buy now",
    "Доставка курьером за 1–2 дня":"Courier delivery in 1–2 days",
    "100% оригинал, официальная гарантия":"100% original, official warranty",
    "Возврат в течение 14 дней":"Return within 14 days","Оплата":"Payment",
    "Описание товара":"Product description","Состав":"Ingredients","Применение":"Usage",
    "Характеристики":"Specifications","Объём":"Volume","Бренд":"Brand","Категория":"Category",
    "Тип кожи":"Skin type","Нормальная–сухая":"Normal–dry","Оригинальность":"Authenticity",
    "Официальная гарантия":"Official warranty","Доставка":"Delivery","1–2 дня":"1–2 days",
    "Отзывы":"Reviews","Оставить отзыв":"Leave a review","Отправить":"Send",
    "Отзыв могут оставить только покупатели товара.":"Only customers who bought the product can leave a review.",
    "Отзывов пока нет. Будьте первым.":"No reviews yet. Be the first.","Похожие товары":"Similar products",
    "Оригинальный товар с официальной гарантией. Высокое качество и удобство.":"Original product with official warranty. High quality and convenience.",
    "0% наценка":"0% markup","Способ оплаты":"Payment method","Количество":"Quantity",
    "Добавить в корзину":"Add to cart","В наличии":"In stock","Нет в наличии":"Out of stock",
    // katalog / filtrlar
    "Цена":"Price","Ещё бренды":"More brands","Рейтинг":"Rating","и выше":"and up","Метки":"Tags",
    "Со скидкой":"On sale","Сбросить всё":"Reset all","товаров найдено":"products found",
    "Фильтры":"Filters","Сортировка":"Sorting","Сначала дешёвые":"Cheapest first",
    "Сначала дорогие":"Most expensive first","По рейтингу":"By rating","По скидке":"By discount",
    "Применить":"Apply","Бренды":"Brands","Показать":"Show","Скрыть":"Hide","Ничего не найдено":"Nothing found",
    // footer
    "г. Ташкент, ул. Амира Темура 1":"Tashkent, Amir Temur street 1","Ежедневно 09:00 — 21:00":"Daily 09:00 — 21:00",
    "заказов":"orders","заказы":"orders","заказа":"orders","отзыв.":"reviews","отзыв":"review","отзыва":"reviews","отзывов":"reviews",
    // login / cart / checkout (ehtimoliy)
    "Оформить заказ":"Checkout","Итого":"Total","Товары":"Products","Скидка":"Discount","Бесплатно":"Free",
    "Корзина пуста":"Cart is empty","Продолжить покупки":"Continue shopping","Удалить":"Remove",
    "Регистрация":"Sign up","Выйти":"Log out","Профиль":"Profile","Мои заказы":"My orders",
    "Номер телефона":"Phone number","Получить код":"Get code","Подтвердить":"Confirm",
    // jins / boshqa filtrlar
    "Женская":"Women's","Мужская":"Men's","Унисекс":"Unisex","Пол":"Gender",
    // placeholderlar
    "Поиск товаров, брендов и категорий":"Search products, brands and categories",
    "Ваш email":"Your email","Ваше мнение о товаре…":"Your opinion about the product…",
    "Поиск":"Search"
  };
  // qoidalar (raqamli/tarkibli). $1 saqlanadi.
  var R = [
    [/— средство для ухода за телом\. Увлажняет, смягчает и защищает кожу\. Идеально для ежедневного использования\./g,"— a body care product. It moisturizes, softens and protects the skin. Ideal for daily use."],
    [/— средство для ухода за волосами\. Укрепляет, питает и придаёт блеск\. Подходит для всех типов волос\./g,"— a hair care product. It strengthens, nourishes and adds shine. Suitable for all hair types."],
    [/— эффективное средство для ухода за кожей\. При регулярном применении улучшает состояние кожи и обеспечивает увлажнение\. Протестировано дерматологами\./g,"— an effective skincare product. With regular use it improves skin condition and provides hydration. Dermatologist tested."],
    [/— профессиональное средство для макияжа\. Стойкий результат и удобное нанесение\. Оригинальный товар с официальной гарантией\./g,"— a professional makeup product. Long-lasting result and easy application. Original product with official warranty."],
    [/Оригинальный парфюм от официального дистрибьютора\. Аромат держится в течение дня и оставляет характерный шлейф\. Подходит для любого случая\./g,"Original perfume from the official distributor. The scent lasts throughout the day and leaves a distinctive trail. Suitable for any occasion."],
    [/Оригинальный товар с официальной гарантией\. Высокое качество и удобство\./g,"Original product with official warranty. High quality and convenience."],
    [/Можно купить (\d+) шт\./g,"Up to $1 available"],
    [/На этой неделе купили (\d+) чел\./g,"$1 people bought it this week"],
    [/(\d[\d\s.,]*)\s*тыс\./g,"$1k"],
    [/(\d+)\s*товаров найдено/g,"$1 products found"],
    [/товаров найдено/g,"products found"],
    [/сум\/мес/g,"sum/mo"],
    [/сум(?![а-яё])/gi,"sum"],
    [/мес(?![а-яё])/gi,"mo"],
    [/шт\.(?![а-яё])/gi,"pcs"]
  ];

  function ruleTr(s){ var out=s; for(var i=0;i<R.length;i++){ out=out.replace(R[i][0],R[i][1]); } return out!==s?out:null; }
  function phrase(raw){
    var lead=(raw.match(/^\s*/)||[""])[0], trail=(raw.match(/\s*$/)||[""])[0];
    var key=raw.trim();
    if(!key) return null;
    if(D[key]!=null) return lead+D[key]+trail;
    var rt=ruleTr(raw); if(rt!=null) return rt;
    if(key.indexOf(' · ')>=0){
      var parts=key.split(' · '), ch=false;
      var m=parts.map(function(pt){ if(D[pt]!=null){ch=true;return D[pt];} var r=ruleTr(pt); if(r!=null){ch=true;return r;} return pt; });
      if(ch) return lead+m.join(' · ')+trail;
    }
    return null;
  }
  function trNode(n){ var r=phrase(n.nodeValue); if(r!=null && r!==n.nodeValue) n.nodeValue=r; }
  function walk(root){
    if(!root||!root.querySelectorAll) root=document.body;
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(node){var p=node.parentNode;if(p&&(p.nodeName==='SCRIPT'||p.nodeName==='STYLE'||p.nodeName==='NOSCRIPT'))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT;}},false),n,a=[];
    while((n=w.nextNode())) a.push(n);
    a.forEach(trNode);
    var ph=root.querySelectorAll('[placeholder]');
    for(var i=0;i<ph.length;i++){ var v=ph[i].getAttribute('placeholder'); if(D[v.trim()]!=null) ph[i].setAttribute('placeholder',D[v.trim()]); else { var r=ruleTr(v); if(r) ph[i].setAttribute('placeholder',r); } }
  }
  function run(){
    var body=document.body; walk(body);
    var obs=new MutationObserver(function(){ obs.disconnect(); walk(document.body); obs.observe(document.body,{childList:true,subtree:true,characterData:true}); });
    obs.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run);
  else run();
})();
