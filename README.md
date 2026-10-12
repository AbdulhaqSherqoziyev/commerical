# Commercial — ICAN Business

Ko'p-tenantli (white-label) BNPL / e-commerce **prezentatsiya tizimi**. Har bir mijoz-tashkilotga o'z rangi, logotipi va nomi bilan alohida havola beriladi (`https://commercial.icanbusiness.uz/<tashkilot>`).

## Tuzilma

```
presentation/     Prezentatsiya (statik) — nginx orqali beriladi
  index.html        Asosiy sahifa (DC framework: support.js {{ }} shablonlari)
  brand.js          Brend theming dvigateli (rang + logo + bo'limlarni yashirish)
  market/           ZOODMALL market (React build) + demo-backend (login/buyurtma)
  *.html            Demolar: Agent panel/mobil, Investor, Mijoz, Glowen
  security.js       Anti-skrinshot / himoya
  watermark.js      Dinamik suv belgisi (MAXFIY)

admin/
  backend/server.js   Super Admin backend (toza Node, tashqi kutubxonasiz)
                      scrypt parol, HMAC token, rate-limit, /api/brand, /api/orgs
  frontend/           Super Admin (React + Vite, base /superadmin/)

deploy/
  commercial.icanbusiness.uz.nginx   nginx konfiguratsiyasi (tashkilot = URL yo'li + SSL)
```

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

**Prezentatsiya:** `presentation/` ni `/var/www/zoodprez/` ga nusxalang; nginx `deploy/`dagi konfiguratsiya bo'yicha xizmat qiladi.

## Domen va DNS

Tashkilotlar alohida subdomen emas, **URL yo'li** orqali ochiladi:
`https://commercial.icanbusiness.uz/<slug>/` (slug — Super Admin'dagi tashkilot "manzil" maydoni).
nginx `/<slug>/...` so'rovlarini o'sha prezentatsiya fayllariga yo'naltiradi, `brand.js` esa
brendni URL'dagi slug bo'yicha `/api/brand?sub=<slug>` dan oladi.

- DNS (`icanbusiness.uz` zonasi): `commercial  A  <server IP>` — boshqa yozuv kerak emas.
- SSL: `certbot certonly --nginx -d commercial.icanbusiness.uz` (wildcard shart emas).
- `market`, `superadmin`, `uploads`, `api` va h.k. slug sifatida band (backend `RESERVED`).

## Eslatma

`data/` (tashkilotlar ro'yxati, admin parol-hash) va `node_modules/`, `dist/`, sertifikatlar repo'ga kiritilmaydi (`.gitignore`).
