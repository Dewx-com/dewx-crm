# Prospect Engine app domain

This change serves the existing CRM at `app.prospectengine.com` and changes the
server's public URL to that address. The database, image and permissions stay
the same. This is a domain move; the current Dewx branding stays in the image.

The reference is the deployed CRM at commit `61121d53a2`, its workspace domain
alias service and the current Caddy configuration. No new application code or
external library is needed.

## Why both addresses keep working

The Prospect Engine address currently returns a permanent redirect to Dewx.
Browsers may have cached it. Reversing the redirect immediately can create a
loop, so the first cutover serves the CRM on both addresses. Keep both workspace
aliases: these also control password sign-in and suppress public sign-up.

The old Caddy block contains private proposal pages and a tracking endpoint.
Existing API clients also call the old host. This package changes only the
Prospect Engine redirect block, leaving those routes intact.

The workspace's stored custom domain remains the old address. Some generated
invitation, reset or workspace links can still use that working address. A later
canonical-link cleanup should use the supported workspace settings API and
verify real seat flows before introducing an old-host redirect. This package
does not claim to complete that cleanup or a branding change.

## Scenarios and checks

| Scenario | Required result |
| --- | --- |
| New visitor | Prospect Engine serves the CRM without a redirect to Dewx |
| Cached permanent redirect | Dewx still serves the CRM, so no redirect loop |
| Sign-in | Both origins resolve the same workspace with alias protections |
| Existing API client | Old-host API requests continue to reach the same service |
| Private proposal | Existing handler and access gate remain unchanged |
| Role boundary | Admin, team and client access stay as configured |
| Rollback | Restore routing and remove only this Compose override |

Before activation, `prepare.py` must pass Caddy and Compose validation and prove
all other routes are unchanged. After activation, health, domain resolution,
browser sign-in and one real seat of each role must pass. Sending messages and
running workflows are outside these checks.

## Prepare on Contabo

Copy this directory to `/var/tmp/pe-domain-20260909/source`, then run:

```sh
python3 /var/tmp/pe-domain-20260909/source/prepare.py /var/tmp/pe-domain-20260909
```

This writes a restricted candidate Caddyfile on the server and validates it.
It does not install configuration, reload Caddy or restart a container.
Keep the candidate on the server: other Caddy routes contain private gates.

## Activate after Roki's deploy instruction

Re-run preparation immediately before activation. Confirm the current image is
still `pe-crm:dewx-inbox-61121d53a2`, no Compose override has appeared, and the
workspace aliases still point to `35f718e0-e670-4aae-bbe7-0a9d0543a4ae`.
If these have changed, inspect the new state before proceeding.

1. Back up `/etc/caddy/Caddyfile` on Contabo with its permissions preserved.
   Record the backup path and current container image in the deployment evidence.
2. Install the candidate Caddyfile and reload Caddy. Confirm the new domain
   returns HTTP 200 and its public workspace query resolves the existing ID.
   If either fails, restore the Caddy backup and stop.
3. Install `docker-compose.override.yml` as
   `/opt/crm.dewx.com/docker-compose.override.yml`. There was no existing override
   during preparation; refuse to overwrite one if that has changed.
4. From `/opt/crm.dewx.com`, run `docker compose up -d --no-deps server worker`.
   The default Compose invocation loads the override. Future deploy commands
   with explicit `-f` arguments must include it too.
5. Verify both `/healthz` endpoints return `status: ok` and the new host's
   `/client-config` returns `frontDomain: app.prospectengine.com`. Confirm the
   public workspace query for each origin returns the same existing ID and
   `isTeamWorkspaceDomainAlias: true`.
6. Verify password sign-in in a fresh remote browser, then real admin, team and
   client permissions. Confirm existing old-host API reads still work and
   private proposal handlers remain intact. Compare aggregate counts with the
   preflight; allow only independently explained concurrent business changes.

There is a brief CRM restart in step 4. No database migration or image build runs.
Users may need to sign in at the new domain because browser sessions belong to
their origin. A browser with the old permanent redirect cached may keep landing
on Dewx until its cached redirect is cleared.

## Rollback

If verification fails, archive this task's installed Compose override on the
same server, run `docker compose up -d --no-deps server worker` using the original
base configuration, restore the Caddy backup and reload Caddy. Verify Dewx health
and its original `frontDomain`, then confirm Prospect Engine again redirects to
Dewx. Never overwrite another session's later changes during rollback.

## Preparation evidence

Validated against the live Contabo configuration on 9 September 2026:

- Caddy candidate accepted by `caddy validate`.
- Compose override accepted by `docker compose ... config --quiet`.
- All Caddy text outside the old Prospect Engine redirect block unchanged.
- Both public origins resolve the same workspace with alias protection enabled.
- Live Dewx health returns `status: ok`.

Production activation and authenticated seat verification remain pending.
