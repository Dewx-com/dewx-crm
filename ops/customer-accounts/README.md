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
its evidence. Email/calendar sync, outreach, WhatsApp automation, and AI are
outside this release. Enterprise-marked source is not reused for new features.

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

This is a draft foundation, not a customer-account release. Ownership,
provisioning, subscriptions, support, migration, the frontend production build,
and browser acceptance remain open. In particular, native signed file URLs do not recheck membership on
access; private-file revocation, existing SSE connections, and queued work
need their own acceptance checks before claiming immediate removal. No
production configuration or customer data is changed by this source patch.
