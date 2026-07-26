FROM twentycrm/twenty:latest
COPY dewx-icon.png /tmp/dewx-icon.png
RUN set -e; F=/app/packages/twenty-server/dist/front; \
    sed -i "s|<title>Twenty</title>|<title>Dewx CRM</title>|; s|content=\"Twenty\"|content=\"Dewx CRM\"|g" $F/index.html && \
    (sed -i "s|\"Twenty\"|\"Dewx CRM\"|g" $F/manifest.json 2>/dev/null || true) && \
    for f in $F/images/icons/android/android-launchericon-48-48.png \
             $F/images/icons/android/android-launchericon-72-72.png \
             $F/images/icons/android/android-launchericon-96-96.png \
             $F/images/icons/android/android-launchericon-144-144.png \
             $F/images/icons/android/android-launchericon-192-192.png \
             $F/images/icons/android/android-launchericon-512-512.png \
             $F/images/icons/ios/192.png $F/images/icons/ios/512.png; do \
      [ -e "$f" ] && cp /tmp/dewx-icon.png "$f"; done; \
    find $F -type f \( -name "*.js" -o -name "*.html" \) -print0 | xargs -0 sed -i \
      -e "s|https://twenty.com/legal/terms|https://dewx.com/legal/terms|g" \
      -e "s|https://twenty.com/legal/privacy|https://dewx.com/legal/privacy|g" \
      -e "s|https://twenty.com/legal/dpa|https://dewx.com/legal/terms|g" \
      -e "s|https://docs.twenty.com[a-zA-Z0-9/_-]*|https://dewx.com|g" \
      -e "s|https://cal.com/team/twenty[a-zA-Z0-9/_-]*|https://dewx.com/meeting|g" \
      -e "s|https://twenty.com/developers[a-zA-Z0-9/_-]*|https://dewx.com|g" \
      -e "s|https://twenty.com/partners[a-zA-Z0-9/_-]*|https://dewx.com|g" \
      -e "s|https://twenty.com/releases|https://dewx.com|g" \
      -e "s|https://twentyhq.github.io/placeholder-images/workspaces/twenty-logo.png|https://dewx.com/dewx-mark.svg|g" \
      -e "s|https://raw.githubusercontent.com/twentyhq/twenty/main/docs/static/img/social-card.png|https://dewx.com/og.png|g" ; \
    echo "OK title:"; grep -oE "<title>[^<]*</title>" $F/index.html; \
    echo "remaining twenty.com legal/docs links:"; grep -rhoE "https://(docs\.)?twenty\.com/(legal|developers|releases|partners)[a-zA-Z0-9/_-]*" $F 2>/dev/null | sort -u | head
RUN F=/app/packages/twenty-server/dist/front; \
    find $F -type f \( -name "*.css" -o -name "*.js" \) -print0 | xargs -0 sed -i \
      -e "s|#4c6ef5|#5a6b50|g" -e "s|#4C6EF5|#5a6b50|g" \
      -e "s|#3e63dd|#3d4a37|g" -e "s|#3E63DD|#3d4a37|g" \
      -e "s|#9eb1ff|#a8b5a0|g" -e "s|#9EB1FF|#a8b5a0|g" ; \
    echo "moss theme applied; remaining blue accents:"; grep -rhoE "#4c6ef5|#3e63dd" $F/assets/*.css 2>/dev/null | wc -l

# Rebrand transactional emails (invite/welcome/OTP): locale strings say "Twenty"
RUN F=/app/packages/twenty-emails/dist;     find  -type f \( -name "*.js" -o -name "*.mjs" \) -print0 | xargs -0 sed -i       -e "s/Twenty/Dewx CRM/g" -e "s|https://twenty\.com|https://dewx.com|g";     echo "emails rebranded:"; grep -rhoE "Dewx CRM[.!]?" /locales/generated/en.js 2>/dev/null | head -2
