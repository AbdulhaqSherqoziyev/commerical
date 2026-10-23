/* Mobil market — i18n qatlami (uz/ru/en). ?lang= orqali.
   Mahsulot nomlari, brendlar va narxlarга tegmaydi. */
(function(){
  var q = (location.search.match(/[?&]lang=([a-z]{2})/) || [])[1] || 'uz';
  if (q !== 'ru' && q !== 'en') return; // uz => original
  var LI = (q === 'ru') ? 0 : 1;
  document.documentElement.setAttribute('lang', q);

  function norm(s){ return s.replace(/[‘’′`ʻ']/g, "'"); }

  // exact-match lug'at: uz(normalized ASCII ') -> [ru, en]
  var D = {
    // navigatsiya / sarlavhalar
    "Bosh":["Главная","Home"], "Katalog":["Каталог","Catalog"], "Savat":["Корзина","Cart"],
    "Sevimli":["Избранное","Wishlist"], "Profil":["Профиль","Profile"],
    "KATALOG":["КАТАЛОГ","CATALOG"], "SAVAT":["КОРЗИНА","CART"],
    "SEVIMLILAR":["ИЗБРАННОЕ","WISHLIST"], "PROFIL":["ПРОФИЛЬ","PROFILE"],
    "Toshkent":["Ташкент","Tashkent"],
    "CHAQMOQ CHEGIRMA":["МОЛНИЕНОСНЫЕ СКИДКИ","FLASH DEALS"],
    "OMMABOP MAHSULOTLAR":["ПОПУЛЯРНЫЕ ТОВАРЫ","POPULAR PRODUCTS"],
    "Barchasi":["Все","All"], "Barchasi ›":["Все ›","All ›"],
    "Batafsil":["Подробнее","Details"], "Batafsil ›":["Подробнее ›","Details ›"],
    "Barchasini":["Смотреть","See"], "ko'rish":["всё","all"],
    "Barcha mahsulotlarni ko'rish":["Показать все товары","View all products"],
    // kategoriyalar / chiplar
    "Parfyumeriya":["Парфюмерия","Perfume"], "Yuz parvarishi":["Уход за лицом","Face care"],
    "Makiyaj":["Макияж","Makeup"], "Soch parvarishi":["Уход за волосами","Hair care"],
    "Tana parvarishi":["Уход за телом","Body care"], "Quyoshdan himoya":["Защита от солнца","Sun protection"],
    "Erkaklar uchun":["Для мужчин","For men"], "Premium":["Премиум","Premium"],
    // badge
    "Yangi":["Новинка","New"], "Top":["Топ","Top"],
    // mahsulot kartasi / tugma
    "so'm":["сум","sum"], "Savatga":["В корзину","Add"], "Savatga qo'shish":["Добавить в корзину","Add to cart"],
    "Chegirma":["Скидка","Discount"], "Yetkazib berish":["Доставка","Delivery"],
    "Bepul":["Бесплатно","Free"], "Jami":["Итого","Total"],
    // profil
    "Tasdiqlangan":["Подтверждён","Verified"], "Buyurtmalarim":["Мои заказы","My orders"],
    "Manzillar":["Адреса","Addresses"], "Sharhlarim":["Мои отзывы","My reviews"],
    "Sozlamalar":["Настройки","Settings"], "Chiqish":["Выход","Log out"],
    "MEHMON":["ГОСТЬ","GUEST"], "Hisobingizga kiring":["Войдите в аккаунт","Sign in to your account"],
    "Kirish / Ro'yxatdan o'tish":["Вход / Регистрация","Sign in / Sign up"],
    // bildirishnomalar
    "Bildirishnomalar":["Уведомления","Notifications"],
    "Buyurtmangiz yo'lda":["Ваш заказ в пути","Your order is on the way"],
    "Chaqmoq chegirma boshlandi!":["Молниеносные скидки начались!","Flash deals have started!"],
    "Sevimli mahsulotlaringizga 40% gacha chegirma":["Скидки до 40% на избранные товары","Up to 40% off your favorites"],
    "Bugun, 09:00":["Сегодня, 09:00","Today, 09:00"],
    "Sharhingiz chop etildi":["Ваш отзыв опубликован","Your review is published"],
    "Kecha":["Вчера","Yesterday"],
    "Xush kelibsiz!":["Добро пожаловать!","Welcome!"],
    "Bizga qo'shilganingiz uchun rahmat":["Спасибо, что присоединились к нам","Thanks for joining us"],
    "Chaqmoq chegirma":["Молниеносные скидки","Flash deals"],
    // bannerlar
    "YOZGI SOTUV":["ЛЕТНЯЯ РАСПРОДАЖА","SUMMER SALE"],
    "Sevimli mahsulotlarga 40% gacha chegirma":["Скидки до 40% на любимые товары","Up to 40% off favorite products"],
    "Xarid qilish":["Купить","Shop now"],
    "YANGI KOLLEKSIYA":["НОВАЯ КОЛЛЕКЦИЯ","NEW COLLECTION"],
    "Eng so'nggi brendlar endi bizda":["Новейшие бренды теперь у нас","The latest brands are now here"],
    "Ko'rish":["Смотреть","View"],
    "BEPUL YETKAZISH":["БЕСПЛАТНАЯ ДОСТАВКА","FREE DELIVERY"],
    "200 000 so'mdan yuqori xaridlarga":["На заказы от 200 000 сум","On orders over 200,000 sum"],
    "1–2 kun ichida bepul yetkazamiz":["Доставим бесплатно за 1–2 дня","Free delivery in 1–2 days"],
    "PREMIUM PARFYUM":["ПРЕМИУМ ПАРФЮМ","PREMIUM PERFUME"],
    "100% original, rasmiy kafolat bilan":["100% оригинал, с официальной гарантией","100% original, with official warranty"],
    // tungi rejim
    "Tungi rejim yoqildi":["Ночной режим включён","Dark mode on"],
    "Tungi rejim o'chirildi":["Ночной режим выключен","Dark mode off"],
    // ro'yxatlar bo'sh
    "Sevimlilar bo'sh":["Избранное пусто","Wishlist is empty"],
    "Savat bo'sh":["Корзина пуста","Cart is empty"],
    "Bu kategoriyada hozircha mahsulot yo'q":["В этой категории пока нет товаров","No products in this category yet"],
    "Hech narsa topilmadi":["Ничего не найдено","Nothing found"],
    // qidiruv
    "Qidiruv":["Поиск","Search"],
    // sevimli toast
    "Sevimlilardan olindi":["Удалено из избранного","Removed from wishlist"],
    "Sevimlilarga qo'shildi":["Добавлено в избранное","Added to wishlist"],
    // mahsulot sahifasi
    "Naqd":["Наличные","Cash"], "Bo'lib to'lash":["Рассрочка","Installment"],
    "Kuryer orqali 1–2 kunda yetkazamiz":["Доставка курьером за 1–2 дня","Courier delivery in 1–2 days"],
    "100% original, rasmiy kafolat":["100% оригинал, официальная гарантия","100% original, official warranty"],
    "14 kun ichida qaytarish":["Возврат в течение 14 дней","Return within 14 days"],
    "TO'LOV USULLARI":["СПОСОБЫ ОПЛАТЫ","PAYMENT METHODS"],
    "Rasmiy do'kon":["Официальный магазин","Official store"],
    "Do'kon sahifasi":["Страница магазина","Store page"],
    "Do'konga o'tish":["Перейти в магазин","Go to store"],
    "Mahsulot tavsifi":["Описание товара","Product description"],
    "Tarkib":["Состав","Ingredients"], "Ko'rsatma":["Инструкция","Instructions"],
    "Xususiyatlar":["Характеристики","Specifications"], "Hajmi":["Объём","Volume"],
    "Brend":["Бренд","Brand"], "Kategoriya":["Категория","Category"],
    "Originallik":["Оригинальность","Authenticity"], "Rasmiy kafolat":["Официальная гарантия","Official warranty"],
    "1–2 kun":["1–2 дня","1–2 days"],
    "Sharhlar":["Отзывы","Reviews"], "Sharh qoldiring":["Оставьте отзыв","Leave a review"],
    "Yuborish":["Отправить","Send"],
    "Faqat mahsulotni sotib olgan mijozlar sharh qoldira oladi.":["Отзыв могут оставить только покупатели товара.","Only customers who bought the product can leave a review."],
    "Hoziroq sotib olish":["Купить сейчас","Buy now"],
    "Suv (Aqua), glitserin, faol parvarish tarkibiy qismlari. To'liq tarkib mahsulot qadog'ida ko'rsatilgan.":["Вода (Aqua), глицерин, активные ухаживающие компоненты. Полный состав указан на упаковке.","Water (Aqua), glycerin, active care ingredients. Full composition is shown on the package."],
    "Toza teriga kuniga 1–2 marta surting. Ko'zga tegishidan saqlaning. Salqin, quruq joyda saqlang.":["Наносите на чистую кожу 1–2 раза в день. Избегайте попадания в глаза. Храните в прохладном сухом месте.","Apply to clean skin 1–2 times a day. Avoid contact with eyes. Store in a cool, dry place."],
    // sharh toast
    "Sharh matnini yozing":["Напишите текст отзыва","Write your review text"],
    "Sharhingiz yuborildi, rahmat!":["Ваш отзыв отправлен, спасибо!","Your review has been sent, thank you!"],
    // buyurtma statuslari
    "Naqd pul":["Наличные","Cash"],
    "Tasdiqlanishi kutilmoqda":["Ожидает подтверждения","Awaiting confirmation"],
    "Yig'ilmoqda":["Собирается","Packing"], "Yo'lda":["В пути","On the way"],
    "Yetkazildi":["Доставлено","Delivered"],
    "To'langan":["Оплачено","Paid"], "To'lanmagan":["Не оплачено","Unpaid"],
    "To'lov grafigi":["График платежей","Payment schedule"],
    // buyurtma tafsiloti
    "Holat":["Статус","Status"], "Mahsulotlar":["Товары","Products"],
    "To'lov usuli":["Способ оплаты","Payment method"],
    "Naqd pul (yetkazishda)":["Наличные (при доставке)","Cash (on delivery)"],
    "Shartnomani yuklab olish":["Скачать договор","Download contract"],
    "Buyurtma tasdiqlanishini kutmoqda":["Ожидает подтверждения заказа","Awaiting order confirmation"],
    "Mahsulotlar tayyorlanmoqda":["Товары готовятся","Products are being prepared"],
    "Kuryer sizga yetkazmoqda":["Курьер везёт вам","Courier is delivering to you"],
    "Buyurtma topshirildi":["Заказ доставлен","Order delivered"],
    "Bajarildi":["Выполнено","Done"], "Hozirgi holat":["Текущий статус","Current status"],
    "Kutilmoqda":["Ожидается","Pending"],
    "Shartnoma yuklab olindi":["Договор скачан","Contract downloaded"],
    // manzillar
    "asosiy":["основной","main"], "+ Manzil qo'shish":["+ Добавить адрес","+ Add address"],
    // sharhlarim
    "Ajoyib mahsulot, terimga juda mos keldi!":["Отличный товар, отлично подошёл моей коже!","Great product, suited my skin perfectly!"],
    "Hidi zor, uzoq turadi":["Аромат отличный, держится долго","Great scent, lasts long"],
    // sozlamalar
    "Qorong'i rejim":["Тёмный режим","Dark mode"], "Push xabarlar":["Push-уведомления","Push messages"],
    "Email yangiliklar":["Email-рассылка","Email news"], "Til":["Язык","Language"],
    "O'zbekcha ›":["Русский ›","English ›"],
    "Til: O'zbekcha":["Язык: Русский","Language: English"],
    // yetkazish
    "Do'kon manzili":["Адрес магазина","Store address"],
    "Asosiy do'kon":["Главный магазин","Main store"],
    "Toshkent sh., Amir Temur ko'chasi 108":["г. Ташкент, ул. Амира Темура 108","Tashkent, Amir Temur street 108"],
    "Ish vaqti: Har kuni 09:00–21:00":["Часы работы: Ежедневно 09:00–21:00","Hours: Daily 09:00–21:00"],
    "Mo'ljal: Amir Temur xiyoboni ro'parasida":["Ориентир: напротив сквера Амира Темура","Landmark: opposite Amir Temur square"],
    "Buyurtma 2 soat ichida tayyor bo'ladi":["Заказ будет готов через 2 часа","Order will be ready in 2 hours"],
    "Xaritada ko'rish":["Показать на карте","View on map"],
    "Saqlangan manzillardan tanlang:":["Выберите из сохранённых адресов:","Choose from saved addresses:"],
    "yoki yangi manzil kiriting:":["или введите новый адрес:","or enter a new address:"],
    "Yetkazish manzili":["Адрес доставки","Delivery address"],
    "Xaritada ochilmoqda...":["Открывается на карте...","Opening on map..."],
    // checkout
    "Kuryer orqali":["Курьером","By courier"],
    "1–2 kun · Bepul":["1–2 дня · Бесплатно","1–2 days · Free"],
    "Olib ketish":["Самовывоз","Pickup"],
    "Do'kondan · Bepul":["Из магазина · Бесплатно","From store · Free"],
    "Yetkazishda to'lash":["Оплата при доставке","Pay on delivery"],
    "Karta orqali":["Картой","By card"],
    "3–24 oy muddatga":["На срок 3–24 мес","For 3–24 months"],
    "Muddatni tanlang":["Выберите срок","Choose term"],
    "Buyurtma tarkibi":["Состав заказа","Order items"],
    "Savat bo'sh!":["Корзина пуста!","Cart is empty!"],
    // buyurtma qabul
    "Buyurtma qabul qilindi!":["Заказ принят!","Order accepted!"],
    "Buyurtma qabul qilindi":["Заказ принят","Order accepted"],
    "Buyurtma raqami":["Номер заказа","Order number"],
    "Summa":["Сумма","Amount"], "To'lov":["Оплата","Payment"],
    "Bosh sahifaga":["На главную","To home"],
    "Yetkazish manzilini kiriting":["Введите адрес доставки","Enter delivery address"],
    "Do'kondan olib ketish":["Самовывоз из магазина","Pickup from store"],
    // login / auth
    "Hisobdan chiqasizmi?":["Выйти из аккаунта?","Log out?"],
    "Bekor qilish":["Отмена","Cancel"],
    "Hisobdan chiqildi":["Вы вышли из аккаунта","Logged out"],
    "Hisobdan chiqdingiz":["Вы вышли из аккаунта","You have logged out"],
    "Tizimga kirish":["Вход в систему","Sign in"],
    "Telefon raqamingizga tasdiqlash kodi yuboramiz":["Мы отправим код подтверждения на ваш номер","We'll send a verification code to your number"],
    "Telefon raqami":["Номер телефона","Phone number"],
    "Kodni olish":["Получить код","Get code"],
    "Telefon raqamini to'liq kiriting":["Введите номер телефона полностью","Enter full phone number"],
    "Tasdiqlash":["Подтвердить","Confirm"],
    "Demo: istalgan 6 xonali kod ishlaydi":["Демо: подойдёт любой 6-значный код","Demo: any 6-digit code works"],
    "6 xonali kodni kiriting":["Введите 6-значный код","Enter the 6-digit code"],
    "Mijoz":["Клиент","Customer"],
    // verify
    "Shaxsni tasdiqlash":["Подтверждение личности","Identity verification"],
    "Bo'lib to'lash uchun MyID orqali shaxsingizni tasdiqlang":["Подтвердите личность через MyID для рассрочки","Verify your identity via MyID for installment"],
    "Passport seriyasi va raqami":["Серия и номер паспорта","Passport series and number"],
    "Tug'ilgan sana":["Дата рождения","Date of birth"],
    "Yuzni skanerlash":["Сканирование лица","Face scan"],
    "Kamera ochilmoqda...":["Камера открывается...","Opening camera..."],
    "Kamera ochilmoqda…":["Камера открывается…","Opening camera…"],
    "Passport ma'lumotini kiriting":["Введите данные паспорта","Enter passport info"],
    "Tug'ilgan sanani kiriting":["Введите дату рождения","Enter date of birth"],
    "Yuzni skanerlang":["Отсканируйте лицо","Scan your face"],
    "Shaxs tasdiqlandi":["Личность подтверждена","Identity verified"],
    "Rasmga olish":["Сфотографировать","Take photo"],
    "Yuz tasdiqlandi":["Лицо подтверждено","Face verified"],
    "Bu qurilmada kamera ochilmadi":["На этом устройстве камера недоступна","Camera unavailable on this device"],
    "Kameraga ruxsat berilmadi. Ruxsat bering yoki demo bilan davom eting":["Доступ к камере запрещён. Разрешите или продолжите с демо","Camera access denied. Allow it or continue with demo"],
    "Demo bilan davom etish":["Продолжить с демо","Continue with demo"],
    // karta
    "Karta qo'shish":["Добавить карту","Add card"],
    "Bo'lib to'lash uchun kartangizni bog'lang":["Привяжите карту для рассрочки","Link your card for installment"],
    "Karta raqami":["Номер карты","Card number"], "Muddati":["Срок","Expiry"],
    "Karta raqamini to'liq kiriting":["Введите номер карты полностью","Enter full card number"],
    "Amal qilish muddatini kiriting":["Введите срок действия","Enter expiry date"],
    "Kartani tasdiqlash":["Подтверждение карты","Card confirmation"],
    "Kartaga yuborilgan tasdiqlash kodini kiriting":["Введите код, отправленный на карту","Enter the code sent to the card"],
    "Karta qo'shildi":["Карта добавлена","Card added"],
    // manzil form
    "Yangi manzil":["Новый адрес","New address"], "Nomi":["Название","Name"],
    "To'liq manzil":["Полный адрес","Full address"], "Saqlash":["Сохранить","Save"],
    "Manzilni to'liq kiriting":["Введите адрес полностью","Enter full address"],
    "Manzil qo'shildi":["Адрес добавлен","Address added"],
    "Manzil":["Адрес","Address"],
    // placeholderlar
    "Mahsulot, brend qidiring":["Поиск товаров, брендов","Search products, brands"],
    "Mahsulot, brend qidirish":["Поиск товаров, брендов","Search products, brands"],
    "Mahsulot haqida fikringiz...":["Ваше мнение о товаре...","Your opinion about the product..."],
    "Shahar, tuman, ko'cha, uy, kvartira":["Город, район, улица, дом, квартира","City, district, street, house, apt"],
    "kun.oy.yil":["дд.мм.гггг","dd.mm.yyyy"],
    "OO/YY":["ММ/ГГ","MM/YY"],
    "Uy / Ish / Ota-onamniki":["Дом / Работа / Родители","Home / Work / Parents"]
  };

  // regex qoidalari (raqamli/tarkibli iboralar). Tartib muhim.
  // do'kon katalogi (yo'nalishga qarab) tarjimalari
  try { var X = window.ICB_CATALOG && window.ICB_CATALOG.i18n(); for (var xk in X) D[norm(xk)] = X[xk]; } catch(e) {}
  var R = [
    [/Original mahsulot rasmiy kafolat bilan\. Yuqori sifat va kunlik parvarish uchun ideal\. Rasmiy distribyutordan keltirilgan\./, "Оригинальный товар с официальной гарантией. Идеален для высокого качества и ежедневного ухода. Поставляется от официального дистрибьютора.", "Original product with official warranty. Ideal for high quality and daily care. Delivered from the official distributor."],
    [/Yana ko'rsatish \((\d+) ta\)/, "Показать ещё ($1)", "Show more ($1)"],
    [/(\d+) ta chegirmali mahsulot/, "$1 товаров со скидкой", "$1 discounted products"],
    [/(\d+) ta mahsulot/, "$1 товаров", "$1 products"],
    [/Mahsulotlar \((\d+)\)/, "Товары ($1)", "Products ($1)"],
    [/Rasmiylashtirish · (.+?) so'm/, "Оформить · $1 сум", "Checkout · $1 sum"],
    [/Buyurtma berish · (.+?) so'm\/oy/, "Оформить заказ · $1 сум/мес", "Place order · $1 sum/mo"],
    [/Buyurtma berish · (.+?) so'm/, "Оформить заказ · $1 сум", "Place order · $1 sum"],
    [/Omborda (\d+) dona bor/, "На складе $1 шт", "$1 in stock"],
    [/(\d+)-to'lov/, "$1-й платёж", "Payment $1"],
    [/(\d+)\/(\d+) to'lov amalga oshirilgan/, "$1/$2 платежей выполнено", "$1/$2 payments made"],
    [/(\d+) soat oldin/, "$1 ч назад", "$1 h ago"],
    [/(\d+) kun oldin/, "$1 дн назад", "$1 days ago"],
    [/ kuryerga topshirildi/, " передан курьеру", " handed to courier"],
    [/(.+?) uchun sharhingiz/, "Отзыв на $1", "Review for $1"],
    [/Xush kelibsiz, (.+?)!/, "Добро пожаловать, $1!", "Welcome, $1!"],
    [/(.+?) raqamiga yuborilgan kodni kiriting/, "Введите код, отправленный на $1", "Enter the code sent to $1"],
    [/Buyurtma sanasi: (.+)/, "Дата заказа: $1", "Order date: $1"],
    [/^Buyurtma (\d{3,4})$/, "Заказ $1", "Order $1"],
    [/(\d+)\+ buyurtma/, "$1+ заказов", "$1+ orders"],
    [/\((\d+) sharh\)/, "($1 отзыв)", "($1 reviews)"],
    [/(\d+) sharh/, "$1 отзыв", "$1 reviews"],
    [/Bo'lib to'lash · (.+?) so'm\/oy × (\d+) oy/, "Рассрочка · $1 сум/мес × $2 мес", "Installment · $1 sum/mo × $2 mo"],
    [/Bo'lib to'lash · (\d+) oy/, "Рассрочка · $1 мес", "Installment · $1 mo"],
    [/Tanlangan: (\d+) oy · (.+?) so'm\/oy · umumiy (.+?) so'm/, "Выбрано: $1 мес · $2 сум/мес · итого $3 сум", "Selected: $1 mo · $2 sum/mo · total $3 sum"],
    [/ · (\d+) oy · bo'lib to'lash/, " · $1 мес · рассрочка", " · $1 mo · installment"],
    [/ · To'liq to'lov/, " · Полная оплата", " · Full payment"],
    [/0% ustama/, "0% наценки", "0% markup"],
    [/(\d+) oy/, "$1 мес", "$1 mo"],
    [/ — savatga/, " — в корзину", " — to cart"],
    [/so'm\/oy/, "сум/мес", "sum/mo"],
    [/so'm/, "сум", "sum"]
  ];

  function ruleTr(raw){
    var s = norm(raw), out = s;
    for (var i=0;i<R.length;i++){ out = out.replace(R[i][0], R[i][1+LI]); }
    return out !== s ? out : null;
  }
  function phrase(raw){
    var lead = (raw.match(/^\s*/)||[""])[0], trail = (raw.match(/\s*$/)||[""])[0];
    var key = norm(raw).trim();
    if (!key) return null;
    if (D[key] != null) return lead + D[key][LI] + trail;
    var rt = ruleTr(raw);
    if (rt != null) return rt;
    // " · " bilan ajratilgan birikmalarni bo'lib tarjima qilish (masalan "Bajarildi · Buyurtma ...")
    if (key.indexOf(' · ') >= 0) {
      var parts = key.split(' · '), changed = false;
      var mapped = parts.map(function(pt){
        if (D[pt] != null) { changed = true; return D[pt][LI]; }
        var rr = ruleTr(pt); if (rr != null) { changed = true; return rr; }
        return pt;
      });
      if (changed) return lead + mapped.join(' · ') + trail;
    }
    return null;
  }
  function trTextNode(n){
    var r = phrase(n.nodeValue);
    if (r != null && r !== n.nodeValue) n.nodeValue = r;
  }
  function walk(root){
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false), n;
    var arr = [];
    while ((n = w.nextNode())) arr.push(n);
    arr.forEach(trTextNode);
    // placeholderlar
    var ph = root.querySelectorAll ? root.querySelectorAll('[placeholder]') : [];
    for (var i=0;i<ph.length;i++){
      var v = ph[i].getAttribute('placeholder');
      var key = norm(v).trim();
      if (D[key] != null) ph[i].setAttribute('placeholder', D[key][LI]);
      else { var rr = ruleTr(v); if (rr) ph[i].setAttribute('placeholder', rr); }
    }
  }

  var wrap;
  function run(){
    wrap = document.getElementById('wrap') || document.body;
    walk(wrap);
    var obs = new MutationObserver(function(muts){
      obs.disconnect();
      // butun wrapни qayta yurish (yangi qo'shilgan tugunlar uchun)
      walk(wrap);
      obs.observe(wrap, {childList:true, subtree:true, characterData:true});
    });
    obs.observe(wrap, {childList:true, subtree:true, characterData:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
