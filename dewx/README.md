# Dewx CRM build

The production image for crm.dewx.com is produced from this directory:

    docker image build -t dewx-crm:latest -f dewx/Dockerfile dewx/

The Dockerfile starts FROM the upstream community image (twentycrm/twenty) and
applies Dewx branding (name, icons, colors, legal links) to the built frontend.
No proprietary/enterprise (twenty-ee) features are enabled or shipped; no
enterprise license key is configured.

Deployment: docker compose on /opt/crm.dewx.com (twenty-server, twenty-worker,
postgres:16, redis) behind Caddy.

This repo + this directory constitute the corresponding source of the hosted
service (AGPL-3.0 §13). See ../NOTICE.md.
