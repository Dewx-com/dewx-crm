# Customer-account acceptance environment

This is a synthetic test environment on Contabo, separate from the running CRM.
It uses the compiled source from `/opt/pe-crm-build/saas-0909`. State is under
`/opt/pe-crm-build/saas-stage-0910`, restricted to the operator. No customer records
or production credentials were copied into it.

The internal Docker network is `pe-saas-0910`. Its only application dependencies
are `pe-saas-0910-db` (Postgres 16) and `pe-saas-0910-redis`. The app is
`pe-saas-0910-app`, with HTTPS on port 3047 inside that network. Docker suppresses
the requested loopback mapping on this internal network; use a test container on
the network. There are no public application or database ports.

The generated environment enables multiworkspace/shared-host mode, disables
native billing, email verification, icon requests and onboarding AI, uses local
storage and a logger email driver, and has no cron registration. Its secrets and
self-signed TLS key were generated on the server and remain there. The native
five-workspace limit is unchanged. These settings cannot establish live email,
billing or production acceptance.

Native setup completed through `dist/database/scripts/setup-db.js` and
`dist/command/command.js run-instance-commands --force --include-slow`. The force
option was used only on the empty synthetic database. The source, frontend
artifacts and client SDK assets were compiled before app startup.

## Reproduce the installed checks

Run these through SSH on Contabo, not in the operator's desktop browser. The
existing Playwright image contains Chromium 1148; the scripts explicitly use that
binary. Test credentials remain in the private `test-state` directory and must not
be copied into evidence, PRs or transcripts.

```sh
docker run --rm --network pe-saas-0910 --memory=2g --cpus=2 --shm-size=1g \
  -v /opt/pe-crm-build/saas-0909:/app:ro \
  -v /opt/pe-crm-build/saas-stage-0910/test-state:/test-state \
  -v /opt/pe-crm-build/saas-stage-0910/browser-evidence:/evidence \
  -w /app mcr.microsoft.com/playwright:v1.49.1-jammy \
  node ops/customer-accounts/verify-staging-signup-form.cjs

docker run --rm --network pe-saas-0910 --memory=1g --cpus=1 \
  -v /opt/pe-crm-build/saas-0909:/app:ro \
  -v /opt/pe-crm-build/saas-stage-0910/test-state:/test-state \
  -w /app mcr.microsoft.com/playwright:v1.49.1-jammy \
  node ops/customer-accounts/verify-staging-accounts.cjs
```

The account script reuses owners A/B and their contact IDs. Optional argument `c`
or `d` replaces A with that fixture to exercise a fresh signup. A recorded creation
time is retained across reruns; the activation time is from the current call.
Activation of an existing account is an idempotency check, not a fresh provisioning
benchmark. Do not create more fixture accounts to work around license capacity.

Current assertions cover signup-form wording, separate account activation,
account-selection denial, contact isolation and native private attachment upload
and download. The cookie-only file response contains exact uploaded bytes, does
not redirect, disables caching and denies anonymous/foreign-account access.

## Synthetic restore

`restore-staging.sh` runs on Contabo with fixed synthetic targets. It briefly
stops only the test app, snapshots Postgres and local attachments, restarts the
original app and restores both into a fresh environment on the internal network
`pe-saas-0910-restore`. Credentials and TLS material are reused in place from the
test environment. There are no public ports. It refuses to replace an existing
restore fixture.

The account check above passed on the restore network: both owners sign in,
contacts stay isolated, attachment bytes match and foreign downloads are denied.
The restore containers are now stopped to free memory. Snapshots remain private
under `/opt/pe-crm-build/saas-restore-0910`; do not publish them as evidence. To
repeat the acceptance, start the three `pe-saas-0910-restore-*` containers, wait
for HTTPS health and run the account check with the restore network name.

Full browser CRUD, shared-member tabs, jobs,
email/calendar, subscriptions and production recovery remain separate required
checks. The fixture email driver logs only; no external mail delivery is proven.


## Shared member and removal

Use the account command above with `verify-staging-member-removal.cjs` on the
original staging network. It reuses a synthetic member, joins accounts A/B through
native invite links, verifies both credentials/cookies, opens two real SSE streams
and removes the member from A. A's stale credentials and private file URL are
denied, its stream stops before the next heartbeat, and B continues working. The
check takes at least one native 30-second heartbeat. A/B fixtures must exist first.
It can be rerun: A membership is recreated through the synthetic invite link.
This verifies existing-session revocation; disabling/rotating public invitation
links and delivering personal invitations are separate checks.


Run `verify-staging-agreement-policy.cjs` with the same API container command to
check the shared-host Twenty agreement refusal. It preserves existing synthetic
agreement rows and asserts that signing cannot add another. Prospect Engine's own
approved terms and agreement remain a release requirement.
