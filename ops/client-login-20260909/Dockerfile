ARG BASE_IMAGE=pe-crm:dewx-inbox-61121d53a2
FROM ${BASE_IMAGE}
ARG SOURCE_REVISION
LABEL org.opencontainers.image.source="https://github.com/Dewx-com/dewx-crm" \
      org.opencontainers.image.revision="${SOURCE_REVISION}"
COPY --chown=1000:1000 user.resolver.js user.resolver.js.map /app/packages/twenty-server/dist/engine/core-modules/user/
COPY --chown=1000:1000 user.service.js user.service.js.map /app/packages/twenty-server/dist/engine/core-modules/user/services/
