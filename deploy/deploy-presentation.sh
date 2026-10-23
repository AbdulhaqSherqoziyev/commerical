#!/usr/bin/env bash
# Prezentatsiyani serverga qo'yish: avval serverdagi joriy holatning zaxira nusxasi olinadi, keyin presentation/ yuboriladi.
# Ishlatish: deploy/deploy-presentation.sh [user@server] [server_papka]
set -euo pipefail
SERVER="${1:-root@170.168.6.244}"
DEST="${2:-/var/www/zoodprez}"
SRC="$(cd "$(dirname "$0")/../presentation" && pwd)/"
STAMP="$(date +%Y%m%d-%H%M%S)"

echo "-> Server: $SERVER  Papka: $DEST"
ssh "$SERVER" "test -f '$DEST/index.html' && test -f '$DEST/brand.js'" \
  || { echo "XATO: $DEST da index.html/brand.js topilmadi — papka to'g'riligini tekshiring"; exit 1; }

echo "-> Zaxira: /root/presentation-backup-$STAMP.tgz"
ssh "$SERVER" "tar czf '/root/presentation-backup-$STAMP.tgz' -C '$DEST' ."

echo "-> Fayllar yuborilmoqda (hammasi birga — brand.js yangi HTML'lar bilan birga ishlaydi)"
rsync -av "$SRC" "$SERVER:$DEST/"

echo "-> Tekshiruv"
curl -s "https://commercial.icanbusiness.uz/brand.js" | grep -q "BRAND_NAME" && echo "brand.js: yangi versiya" || echo "OGOH: brand.js hali eski"
curl -s -o /dev/null -w "Investor Mobil.html: %{http_code}\n" "https://commercial.icanbusiness.uz/Investor%20Mobil.html"
echo "Tayyor. Qaytarish kerak bo'lsa: ssh $SERVER \"tar xzf /root/presentation-backup-$STAMP.tgz -C $DEST\""
