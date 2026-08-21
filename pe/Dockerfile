# Prospect Engine CRM — image overlay on upstream Twenty (AGPL-3.0). No source is compiled here:
# the upstream community image is taken as-is and the built front end + email strings are rebranded at build time.
# Enterprise-licensed files (/* @license Enterprise */) are neither enabled nor modified; no enterprise key is set.
#
#   docker build -t pe-crm:<tag> -f overlay/Dockerfile overlay/
#
# Upgrade = bump BASE_IMAGE, rebuild, test on the staging port, then "deploy prod go".
# BASE_IMAGE is either the upstream community image (branding only) or our own source build
# (pe-crm-src:<tag>, built from branch pe-scope with upstream's packages/twenty-docker/twenty/Dockerfile),
# so the same overlay applies to both.
ARG BASE_IMAGE=twentycrm/twenty:v2.32.0
FROM ${BASE_IMAGE}
COPY pe-icon.png /tmp/pe-icon.png

# 1 · name, PWA manifest, icons
RUN set -e; F=/app/packages/twenty-server/dist/front; \
    sed -i 's|<title>Twenty</title>|<title>Prospect Engine</title>|; s|content="Twenty"|content="Prospect Engine"|g' $F/index.html && \
    (sed -i 's|"Twenty"|"Prospect Engine"|g' $F/manifest.json 2>/dev/null || true) && \
    for f in $(find $F/images/icons -type f -name "*.png" 2>/dev/null); do cp /tmp/pe-icon.png "$f"; done; \
    echo "title: $(grep -oE '<title>[^<]*</title>' $F/index.html)"

# 2 · links that would lead a client to Twenty's own pages → Prospect Engine's
RUN set -e; F=/app/packages/twenty-server/dist/front; \
    find $F -type f \( -name "*.js" -o -name "*.html" \) -print0 | xargs -0 sed -i \
      -e 's|https://twenty.com/legal/terms|https://prospectengine.com/terms|g' \
      -e 's|https://twenty.com/legal/privacy|https://prospectengine.com/privacy|g' \
      -e 's|https://twenty.com/legal/dpa|https://prospectengine.com/terms|g' \
      -e 's|https://docs.twenty.com[a-zA-Z0-9/_-]*|https://prospectengine.com|g' \
      -e 's|https://cal.com/team/twenty[a-zA-Z0-9/_-]*|https://prospectengine.com|g' \
      -e 's|https://twenty.com/developers[a-zA-Z0-9/_-]*|https://prospectengine.com|g' \
      -e 's|https://twenty.com/partners[a-zA-Z0-9/_-]*|https://prospectengine.com|g' \
      -e 's|https://twenty.com/releases|https://prospectengine.com|g' \
      -e 's|https://twentyhq.github.io/placeholder-images/workspaces/twenty-logo.png|https://prospectengine.com/favicon.ico|g' \
      -e 's|https://raw.githubusercontent.com/twentyhq/twenty/main/docs/static/img/social-card.png|https://prospectengine.com/og.png|g' ; \
    echo "remaining twenty.com legal/docs links: $(grep -rhoE 'https://(docs\.)?twenty\.com/(legal|developers|releases|partners)[a-zA-Z0-9/_-]*' $F 2>/dev/null | sort -u | wc -l)"

# 3 · palette: Twenty blue → Prospect Engine teal (#2DD4BF is the site's primary; darker/lighter steps for hover and tints)
RUN set -e; F=/app/packages/twenty-server/dist/front; \
    find $F -type f \( -name "*.css" -o -name "*.js" \) -print0 | xargs -0 sed -i \
      -e 's|#4c6ef5|#14b8a6|g' -e 's|#4C6EF5|#14b8a6|g' \
      -e 's|#3e63dd|#0f8f82|g' -e 's|#3E63DD|#0f8f82|g' \
      -e 's|#9eb1ff|#99f6e4|g' -e 's|#9EB1FF|#99f6e4|g' ; \
    echo "remaining blue accents: $(grep -rhoE '#4c6ef5|#3e63dd' $F/assets/*.css 2>/dev/null | wc -l)"

# 4 · transactional emails (invite / welcome / OTP) say Prospect Engine. Scoped to the emails package, word-boundary only.
RUN set -e; E=/app/packages/twenty-emails/dist && test -d "$E" && \
    find "$E" -type f \( -name "*.js" -o -name "*.mjs" \) -print0 | xargs -0 sed -i \
      -e 's/\bTwenty\b/Prospect Engine/g' \
      -e 's|https://twenty\.com|https://prospectengine.com|g' && \
    echo "emails: $(grep -rhoE 'Prospect Engine' "$E/locales/generated/en.js" 2>/dev/null | head -1)" && \
    echo "server engine untouched: $(! grep -rq 'Prospect Engine' /app/packages/twenty-server/dist/engine && echo yes)"

# 5 · the in-app UI strings: every "Twenty" in the compiled English UI bundle → "Prospect Engine" (word-boundary; URLs already handled above)
RUN set -e; F=/app/packages/twenty-server/dist/front; \
    find $F/assets -type f -name "*.js" -print0 | xargs -0 sed -i -e 's/\bTwenty\b/Prospect Engine/g' ; \
    echo "ui literal Twenty left: $(grep -rhow 'Twenty' $F/assets 2>/dev/null | wc -l)"
