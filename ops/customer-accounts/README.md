# Customer accounts: approved implementation

Status: implementation in progress. No customer-account release is deployed.

## Ideal and actual

Customers own independent CRM accounts and subscriptions at one application
hostname. The deployed application currently pins that hostname to one shared
workspace and exposes read-only client pages. Reuse native workspace schemas,
identity, membership, permissions, CRM screens, and activation. Add only the
ownership, shared-origin routing, subscription, and support behavior they lack.

The planned release includes core CRM, public and assisted signup, assigned-record
member access, owner-approved one-hour support grants, and independent monthly
Stripe subscriptions. Trial: 14 days, no card. Payment grace: seven days. Expired access:
30 days of read/export, then locked; no automatic data deletion. Price, currency,
seat limit, merchant verification, and terms gate live checkout.

## Required scenarios

- Two owners create independent accounts without a build or restart.
- One member works in both accounts, including separate browser tabs.
- Removing that member denies old tokens, files, jobs, and exports in one account
  while preserving the other membership and all work already recorded.
- Owners control invitations, roles, ownership transfer, support, and billing.
- Ending agency service preserves the CRM and its subscription.
- Signup retries create one account; imports run separately; p95 setup <=10s.
- Billing handles duplicate/out-of-order events, expiry, cancellation, renewal,
  failed payments, seat limits, and reactivation.
- Customer records never enter the internal master sync implicitly.
- Initial customer migration copies client-visible data only, with counts and relationship
  reconciliation before switching the owner's entry point.

## Delivery order and checks

1. Shared-origin authentication, switching, tab isolation, immediate revocation.
2. Ownership, invitations, idempotent provisioning, assigned-member roles.
3. Core CRM feature verification and owner-approved support access.
4. Independent Stripe Checkout/portal and server-enforced subscription access.
5. Migration tooling, isolated staging, restore proof, and production acceptance.

Run focused regression tests, changed-file lint, server/frontend type checks,
builds, isolated API/browser scenarios, and the 50-account/5-concurrent timing
check. Record actual results here. Never present a phase as complete without
its evidence. The expanded plan approved on 10 September includes customer-owned
email/calendar connections and CRM workflows, including disconnect, failure and
execution-history checks. Campaign outreach, WhatsApp automation, and AI remain
outside this release. Enterprise-marked source is not reused for new features.

The completion goal is the full verified production product, including ownership,
teams, core CRM, reports, connected workflows, subscriptions, migration, support,
monitoring and restore. Continue independent implementation while verifying the
licensing path; this authorizes neither a license purchase nor a gate bypass.

## Account capacity gate found during implementation

The current `SignInUpService.assertWorkspaceCountWithinLimit` enforces
`MAX_WORKSPACES_WITHOUT_ENTERPRISE_KEY = 5`. No licensing gate was changed.
An applicable Enterprise agreement must be confirmed before this engine can
satisfy the scalable-account launch and 50-account benchmark. The capacity
decision remains open; this patch does not modify license enforcement.

## Authentication changes prepared

- `IS_SHARED_DOMAIN_ENABLED` defaults to false. Enable only with multiworkspace
  support and the canonical `FRONTEND_URL`/`SERVER_URL` after staging acceptance.
- The shared origin selects no default account; verified login tokens select
  their account and still pass membership, email, provider, and MFA validation.
- Customer navigation remains on one hostname. Account-bearing browser state
  uses session storage; an account switch reloads from an empty tab session.
- Each account has its own HttpOnly/Secure host-only cookie. The non-secret
  `x-workspace-id` header selects it; the server checks the authenticated account
  against that selection. Existing generic cookies may only authenticate the
  same account, never authorize a different selection.
- Signing out revokes presented browser sessions. Switching accounts preserves
  other account sessions. Cookie requests retain CSRF origin checks.
- Removing a membership scopes the delete to its account and invalidates its
  cached authorization. JWTs must match both membership user and account.

Verification so far: 59 server tests and 28 frontend tests passed across the
focused suites, including same-user switching and different-user sign-in.
Server and frontend type checks pass, as do the server build and type-aware
lint on all 43 changed TypeScript files. Native oxfmt formatting passes. The form suite preserves the real controls and
handlers while stubbing Linaria's compile-time styling layer in Jest.

## Private downloads prepared, 10 September

In shared-domain mode, signed private-file links also require a current account
session or valid account API/application credential. The existing authentication
service checks membership, expiry and account selection on every download. Private
files stream through the CRM with `private, no-store`; no reusable storage redirect
is issued. Signed logos and email images retain their public-facing behavior.
Office documents offer an authenticated download because the external Office
previewer cannot use the account session; browser-rendered previews remain.

Checks: 64 server regression tests and 11 frontend preview/download tests pass.
Native server typecheck (`tsgo`), frontend typecheck, changed-file type-aware lint
and server compilation (7,453 files) pass. The old guard failed 10 of the 15 new
access checks before the fix. Evidence: `state/evidence/pe-saas-0910-files/` in
the Dewx operator repository. Plain server `tsc` also exposed an Express request
clone typing issue, which was fixed; that compiler additionally reports existing
dependency-resolution errors, so use the repository's native `tsgo` target.

This is a draft foundation, not a customer-account release. Ownership,
provisioning, subscriptions, support, migration,
and browser acceptance remain open. Existing SSE connections and queued work
still need acceptance checks. Before rollout, allow previously issued storage
URLs and old cached responses to expire; downloaded copies cannot be recalled.
The private-file change still needs installed browser acceptance. No production
configuration or customer data is changed by this source patch.

## Subscription delivery prepared, 10 September

Core and metadata GraphQL subscriptions now revalidate the original account
credential before releasing each event in shared-domain mode. Removed membership,
expired/revoked credentials, changed account/principal, and failed authorization
lookups stop delivery and close the source iterator. Another account's stream
continues. Idle streams close when their next event arrives; this is a delivery
check, not an immediate idle-connection termination claim. The existing client
handles completion through its destroy/recreate flow.

Ten tests using the actual GraphQL/Envelop subscription pipeline pass, including
queued-event denial and iterator cleanup. Full native server types, changed-file
type-aware lint and server compilation (7,455 files) pass. Evidence lives in
`state/evidence/pe-saas-0910-streams/` in the operator repository. Installed
acceptance and queued-job authorization remain open.

## Team assignment and frontend build, 10 September

Bulk role assignment now resolves every target membership inside the selected
account. A foreign membership or mixed-account batch is rejected before any role
is changed. The existing caller-role resolver test expectation was updated to
match the explicit caller permission context already implemented in PR5.

Thirteen team/user resolver tests pass; two of the five new assignment cases
failed before the account filter was added. Native server types, changed role-file
lint and server compilation pass. The full native Nx frontend production build,
including its 11 dependency tasks, also passes. Evidence:
`state/evidence/pe-saas-0910-team/` in the operator repository.

Private staging runs the compiled source with synthetic data, HTTPS and an
internal Docker network. The first startup exposed a circular import between file
request authentication and the auth graph. File HTTP routes now have their own
module importing authentication; the file services used by the auth graph remain
independent of that request boundary.

Fresh native database migrations, the HTTPS health check, all three compiled
entry-module imports, native server types and changed-file lint pass. Run the
import check inside the built Linux runtime with
`node ops/customer-accounts/check-runtime-imports.mjs`; it checks web, command and
worker modules in fresh processes. A remote Chromium session loaded the actual
sign-in page. This establishes startup, not the remaining account/file browser
acceptance. Runtime evidence: `state/evidence/pe-saas-0910-runtime/`.

## Installed signup findings, 10 September

Two synthetic owners created and activated different accounts through the real
staging APIs. Each could read their own account; sending the other account's ID
with their valid credential was denied in both directions. Record and file checks below extend this evidence; shared-member tabs and billing
remain separate acceptance checks.

The compiled browser exposed three untranslated IDs on account creation. Five
customer-account/download messages are now in the source catalog and all 31
compiled catalogs, with native English fallback. The shared-host sign-in page
describes a customer CRM. `node ops/customer-accounts/check-customer-catalogs.mjs`
checks actual compiled messages; the remote browser verifies the readable form
and its Create account button. Native frontend types, changed-file lint and the
production build pass. Existing translations are preserved; native compilation
also refreshes the pseudo-locale's earlier hand-added messages.

Initial account creation took 15.8/15.3 seconds and activation 16.9/13.0 seconds
under the staging CPU cap while build checks were running. This is above the
10-second target, not a passing performance benchmark. An external company-logo
lookup ignored `ALLOW_REQUESTS_TO_TWENTY_ICONS=false` and accounted for about 15
seconds before activation. Signup now honors that setting. Its three regression
cases pass, including the disabled case that failed before the change; native
server types, lint and compilation pass. A new account took 621ms to create and
11,622ms to activate with the setting disabled. Activation therefore still needs
optimization, and this sample does not prove p95. The 50-account benchmark still
requires legitimate license capacity.

The staging fixture currently disables email verification and uses a logger
email driver, so verification/recovery delivery has not been proven. No customer
data, live checkout, external mail or production configuration is involved.

The real contact API also passes create/read isolation checks for the first two
owners. A first write immediately after activating a new account exposed an actor
ID missing from its pre-activation access token. Token validation already resolves
the current member; it now uses that verified member ID for record attribution.
Twenty-nine authentication tests, including missing/stale actor claims, pass along
with native server types, lint and compilation. A fourth fresh owner then activated and created its first contact using the same
pre-activation credential. Creation took 366ms and activation 11,976ms; first-write
and cross-account isolation checks passed. This is still above the setup target.


## Attachment and restore acceptance, 10 September

The staging API uploads a private file through the native signed-upload flow,
attaches it to a contact and returns its signed download URL. The owner downloads
exact stored bytes using the account cookie alone. Anonymous access and another
account's cookie are denied; foreign attachment IDs return no records. The
response has `private, no-store` and no storage redirect.

A database dump and attachment snapshot were taken with only the synthetic app
briefly stopped, then restored into a fresh Postgres volume and storage directory
on a separate internal network. The same login, contact isolation and attachment
byte/denial checks passed against the restore. Restore containers were stopped
after verification; private snapshots remain on the server. This proves synthetic
restore only, not customer migration or production recovery. Reproduction and
remaining checks are in `STAGING.md`.

## Shared-member removal acceptance, 10 September

An invited member joined two synthetic accounts and used both account cookies in
one jar. Invitation signup initially produced a login token without its provider,
so session creation failed on the required auth-provider column. The password
signup resolver now sets the provider it actually validated. Ten resolver tests,
native types, lint and compilation pass; the new regression failed before the fix.

The installed check now passes with current code: both account cookies and Bearer
tokens work, then account A's owner removes the member. Previously issued account
A tokens/cookies lose account and contact access, and its retained signed file URL
returns 403. The same member's account B access remains usable. Already-open SSE
streams close for A before the next heartbeat while B continues delivering.
This proves live stream revocation at the next delivery, not immediate idle socket
termination. Run `verify-staging-member-removal.cjs` after the account fixtures.

No message was sent: the synthetic test uses native public invite links and the
logger email driver. Personal invitation delivery, browser-tab behavior, queued
jobs/exports, retained work and role-change access still need separate acceptance.

## Customer defaults and router, 10 September

New shared-host accounts use native members-and-invitees discoverability, public
invite links off and server support impersonation off. Existing account settings
are preserved. Shared-host signup no longer records a Twenty click-through DPA;
Twenty document preview/signing uses the native self-hosted notice/refusal.
Eight signup/deployment-policy tests pass, including both previously failing
shared-host agreement cases, along with native types, lint and server compilation.
Prospect Engine's own approved terms and processor agreement are still required.

Full owner browser login exposed a repeated welcome/verify redirect: the shared
hostname mounted the central router, which has no verification route. Shared-host
mode now mounts the native CRM router for sign-in, verification and account pages.
The legacy remembered-domain redirect is disabled in shared mode so it cannot
reload the same hostname and clear the tab's selected account. Ten route tests,
frontend types, lint and the complete native frontend build pass. The compiled browser now exchanges its login token, but its next user request
still lacks an account-selection header and loads the workspace-agnostic context.
That remaining browser bootstrap defect is under investigation; full browser
workflow acceptance remains open.

The removal check also creates a note as the shared member and links it to the
client's contact. After removal, the owner reads the same note title/body and
contact link; the other account sees no note. Old credentials/files are denied
and the retained account's SSE stream continues, as before.


The installed `verify-staging-agreement-policy.cjs` check passes: shared-host
preview is marked reference-only, Twenty signing is refused, and existing
agreement records are unchanged. New-account privacy defaults have unit coverage;
fresh installed signup will be checked with idempotent provisioning.


## Installed credential-change and core CRM checks, 10 September

The browser now completes login-token exchange on the shared origin and reaches
profile setup with the selected account. Apollo had reused an in-flight generic
current-user query after the token changed. Explicit user reloads and the
cookie-only startup probe now request independent network responses. The real
Apollo regression failed before the change; five focused tests, frontend types,
lint and the full native build pass. Browser onboarding and full CRM UI acceptance
continue separately.

`verify-staging-core.cjs` passes against the installed server: a company and linked
contact, an owned opportunity with currency and a stage transition, and an assigned
dated task linked to the contact and completed. All four record types are readable
in their account and hidden from the second owner. These are API checks, not a
claim that browser CRUD has passed.

## Signup retries and empty customer accounts, 10 September

A signed-in user's setup request now carries a UUID retained across form retries
and remounts. A receipt is committed in the same transaction as the account and
membership. Concurrent copies return that account; changed details, deleted
accounts, removed memberships and suspended accounts are refused. A short
PostgreSQL advisory lock also serializes capacity checks. Activation stays
outside that transaction. The five-account license gate is unchanged.

Shared-host customer accounts skip native demonstration records. Native CRM
schemas and views still initialize. Fresh fifth-account acceptance confirms an
empty contacts/companies/deals list, private account defaults, first record write,
one membership after concurrent retries, payload mismatch rejection and capacity
rejection. Creation took 533 ms; activation took 15.2 seconds during the frontend
build. This is a functional check, not a passing p95 benchmark.

Checks: 24 focused server authentication/retry/policy tests and the frontend form
retry regression pass, along with native types, changed-file lint and complete
server/frontend builds. The compiled browser sends the same request ID on retry
and displays the capacity refusal. The native schema generator added the input
field to frontend GraphQL types. Receipt migration and subsequent instance upgrade
checks pass on private staging; see STAGING.md for the migration correction and
its database regression. Ownership, billing, support and full release acceptance
remain open.

## Persistent customer ownership

New shared-host accounts record their creator as the primary owner. The native
2.33 migration backfills only explicit creation receipts with active administrator
memberships; legacy accounts require an owner chosen during migration. The owner
can hand over to an existing administrator, remains a member after transfer, and
can then be removed by the new owner.

Ownership, team changes and global user deletion share a PostgreSQL advisory
lock. User deletion checks every account before making changes. Native permission
transactions roll back if they would remove the owner's full administrator
access; separate record-scope writes also protect that role. Only the owner can
delete the customer CRM or change its security settings. Native impersonation
cannot assume the owner identity, including through a token issued before the
target became the owner.

Installed API acceptance passes transfer, competing-change refusal, owner
removal/demotion and record-restriction denial, impersonation revocation, retained
work and continued access to the other account. The focused suites pass 31
ownership/signup/user checks and 30 impersonation/JWT checks. The member Settings
page adds recipient-email confirmation, shows protected ownership, and suppresses
owner removal, role changes and impersonation. Its compiled browser acceptance
is recorded in `STAGING.md`. Durable customer-visible ownership audit, timed
support grants, legacy owner reconciliation and the remaining full release
criteria are still open.

## Files follow current record permissions

Shared-host file downloads now resolve the current member or API role and check
the file field, record, and attachment parent before streaming bytes. The CRM's
record filters also make attachments inherit their parent record's visibility,
which prevents a restricted member from moving a hidden attachment to a visible
contact to regain its contents. Native permanent-file reuse checks remain in
place. Upload previews and access restoration are covered by the installed API
acceptance in `STAGING.md`; pending-upload ownership and the other remaining
permission checks are not yet release-complete.
