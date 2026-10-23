# Commercial — ICAN Business

Ko'p-tenantli (white-label) BNPL / e-commerce **prezentatsiya tizimi**. Har bir mijoz-tashkilotga o'z rangi, logotipi va nomi bilan alohida subdomen beriladi (`<tashkilot>.commercial-icanbusiness.uz`).

## Tuzilma

```
presentation/     Prezentatsiya (statik) — nginx orqali beriladi
  index.html        Asosiy sahifa (DC framework: support.js {{ }} shablonlari)
  brand.js          Tashkilot brendi: nom, rang, logo, bo'limlarni yashirish
  brand-*.svg       Neytral logolar (tashkilot sozlanmagan holat uchun)
  market/           Market (React build) + demo-backend (login/buyurtma)
  *.html            Demolar: Agent panel/mobil, Investor Mobil, Mijoz ilova, Glowen
  security.js       Anti-skrinshot / himoya
  watermark.js      Dinamik suv belgisi (MAXFIY)

admin/
  backend/server.js   Super Admin backend (toza Node, tashqi kutubxonasiz)
                      scrypt parol, HMAC token, rate-limit, /api/brand, /api/orgs
  frontend/           Super Admin (React + Vite, base /superadmin/)

deploy/
  commercial-icanbusiness.uz.nginx   nginx konfiguratsiyasi (wildcard + SSL)
```

## Brend (white-label)

Manba fayllarda hech qanday brend nomi/logosi yo'q. Tashkilot sahifasi: `https://commercial.icanbusiness.uz/<slug>/`.

- `brand.js` sahifa chizilishidan **oldin** (sinxron) `/api/brand?sub=<slug>` konfiguratsiyasini oladi va
  `window.BRAND_NAME`, `window.BRAND_DOMAIN`, `window.BRAND_LOGO` ni beradi — ilovalar nomni shu yerdan o'qiydi.
- Logolar uchun `brand-logo.svg`, `brand-logo-white.svg`, `brand-mark.svg`, `brand-mark-white.svg` ishlatiladi;
  `brand.js` ularni tashkilot logosiga almashtiradi (yangi chizilgan ekranlarda ham).
- Yangi sahifa/matn qo'shganda brend nomini qo'lda yozmang — `window.BRAND_NAME` dan foydalaning.

## Bo'limlar (modullar)

Tashkilot yaratishda 8 ta bo'lim yoqib/o'chiriladi. O'chirilgani mijoz sahifasida ko'rinmaydi:
`ican_mobil, agent_web, agent_mobil, agent_app, client, investor, webstore, market`.

## Ishga tushirish

**Backend (Super Admin):**
```bash
cd admin/backend
ADMIN_USER=admin ADMIN_PASS=... node server.js   # port 3000, localhost
```

**Admin frontend build:**
```bash
cd admin/frontend
npm install
npm run build         # -> dist/ ni /var/www/zoodprez/superadmin/ ga qo'yiladi
```

**Prezentatsiya:** `presentation/` ni `/var/www/zoodprez/` ga nusxalang; nginx `deploy/`dagi konfiguratsiya bo'yicha xizmat qiladi (wildcard subdomen + Let's Encrypt SSL).

## Eslatma

`data/` (tashkilotlar ro'yxati, admin parol-hash) va `node_modules/`, `dist/`, sertifikatlar repo'ga kiritilmaydi (`.gitignore`).
