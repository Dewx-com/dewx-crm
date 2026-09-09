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
provisioning, subscriptions, support, migration, the frontend production build,
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
