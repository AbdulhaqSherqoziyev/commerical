#!/usr/bin/env bash
# Serverda ishga tushiring (root):
#   curl -fsSL https://raw.githubusercontent.com/AbdulhaqSherqoziyev/commerical/claude/dns-probe-nxdomain-error-ehcq1j/deploy/deploy.sh | bash
# yoki repo ichida:  sudo bash deploy/deploy.sh
#
# Nima qiladi:
#   1) repo'ni /opt/commerical ga yangilaydi (BRANCH)
#   2) presentation/ ni /var/www/zoodprez/ ga nusxalaydi (server-only fayllar o'chirilmaydi)
#   3) commercial.icanbusiness.uz uchun SSL sertifikat oladi (yo'q bo'lsa)
#   4) eski commercial(-)icanbusiness nginx konfiguratsiyalarini zaxiralab, yangisini yoqadi
#   5) nginx -t muvaffaqiyatsiz bo'lsa — eski holatga qaytaradi
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/AbdulhaqSherqoziyev/commerical.git}"
BRANCH="${BRANCH:-claude/dns-probe-nxdomain-error-ehcq1j}"
SRC="${SRC:-/opt/commerical}"
WEBROOT="${WEBROOT:-/var/www/zoodprez}"
DOMAIN="commercial.icanbusiness.uz"
SITE_NAME="$DOMAIN.nginx"
BACKUP="/root/nginx-backup-$(date +%Y%m%d-%H%M%S)"

[ "$(id -u)" = 0 ] || { echo "root sifatida ishga tushiring (sudo)"; exit 1; }

echo "==> 1/5 Repo: $BRANCH"
if [ -d "$SRC/.git" ]; then
  git -C "$SRC" fetch origin "$BRANCH"
  git -C "$SRC" checkout -B "$BRANCH" "origin/$BRANCH"
else
  git clone -b "$BRANCH" "$REPO_URL" "$SRC"
fi

echo "==> 2/5 Prezentatsiya -> $WEBROOT"
mkdir -p "$WEBROOT"
cp -a "$WEBROOT" "$WEBROOT.bak-$(date +%Y%m%d-%H%M%S)"
cp -a "$SRC/presentation/." "$WEBROOT/"

echo "==> 3/5 SSL sertifikat"
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email
fi

echo "==> 4/5 nginx konfiguratsiyasi (zaxira: $BACKUP)"
mkdir -p "$BACKUP"
for d in /etc/nginx/sites-enabled /etc/nginx/conf.d; do
  [ -d "$d" ] || continue
  for f in "$d"/*; do
    [ -e "$f" ] || continue
    [ "$(basename "$f")" = "$SITE_NAME" ] && continue
    if grep -qE "server_name[^;]*(commercial-icanbusiness\.uz|commercial\.icanbusiness\.uz)" "$f"; then
      echo "    eski konfiguratsiya o'chirildi: $f"
      mv "$f" "$BACKUP/"
    fi
  done
done
install -m 644 "$SRC/deploy/$SITE_NAME" "/etc/nginx/sites-available/$SITE_NAME"
ln -sf "/etc/nginx/sites-available/$SITE_NAME" "/etc/nginx/sites-enabled/$SITE_NAME"

echo "==> 5/5 nginx tekshiruv va reload"
if nginx -t; then
  systemctl reload nginx
else
  echo "!! nginx -t xato — eski konfiguratsiya tiklanmoqda"
  rm -f "/etc/nginx/sites-enabled/$SITE_NAME"
  for f in "$BACKUP"/*; do [ -e "$f" ] && mv "$f" /etc/nginx/sites-enabled/; done
  nginx -t && systemctl reload nginx
  exit 1
fi

echo
echo "Tekshiruv:"
for p in / /desarrollo/ "/api/brand?sub=desarrollo" /superadmin/; do
  printf "  %-28s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN$p")"
done
echo "Tayyor: https://$DOMAIN/desarrollo"
echo "Brauzerda Super Admin'ni Ctrl+Shift+R bilan yangilang."
