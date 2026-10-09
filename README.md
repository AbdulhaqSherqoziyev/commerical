# Commercial — ICAN Business

Ko'p-tenantli (white-label) BNPL / e-commerce **prezentatsiya tizimi**. Har bir mijoz-tashkilotga o'z rangi, logotipi va nomi bilan alohida subdomen beriladi (`<tashkilot>.commercial-icanbusiness.uz`).

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
  commercial-icanbusiness.uz.nginx   nginx konfiguratsiyasi (wildcard + SSL)
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

**Prezentatsiya:** `presentation/` ni `/var/www/zoodprez/` ga nusxalang; nginx `deploy/`dagi konfiguratsiya bo'yicha xizmat qiladi (wildcard subdomen + Let's Encrypt SSL).

## Eslatma

`data/` (tashkilotlar ro'yxati, admin parol-hash) va `node_modules/`, `dist/`, sertifikatlar repo'ga kiritilmaydi (`.gitignore`).
