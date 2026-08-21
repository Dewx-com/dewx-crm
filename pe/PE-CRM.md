# Prospect Engine CRM — the product, the rules, the plan (2026-08-21)

Roki, by voice, 14:55–15:40: *"develop our own… we want to improve the Twenty CRM based on our need, even completely
removing the branding of Twenty and bringing our own branding of Prospect Engine… app.prospectengine.com should have two
user options, client or employee… the employees, most of the tasks will be: is it software development or outreach…
even the GTM / inside sales for Dewx, those employees will also log into app.prospectengine.com."*

## What it is
One login at **app.prospectengine.com**, two doors:
- **Employee** — every person who works for Roki, outreach or software. Sees the whole book (people, companies,
  pipeline, tasks, notes), updates tasks, never touches settings. Tasks carry `workType` = outreach | software.
- **Client** — a Prospect Engine client. Sees only records where `client = <their slug>`, read-only.
Everything is tagged: `client` (SELECT) on person / opportunity / task, stamped by the HeyReach receiver from the sender
seat. Dewx's *build* clients (Klaus, EPD, AnyHelpNow) are a different system by Roki's rule (`dev.dewx.com`, Plane).

## Licence rules (measured in the source, 2026-08-21, checkout `/opt/dewx-crm-build/twenty` = upstream main@2026-07-22)
- Twenty is AGPL-3.0 with marked exceptions. Files starting `/* @license Enterprise */` are under Twenty's commercial
  licence. **The whole row-level-permission module is Enterprise** — entities (`core.rowLevelPermissionPredicate`),
  services, DTOs — **and so are the two ORM utilities that apply predicates**
  (`twenty-orm/utils/apply-row-level-permission-predicates.util.ts`, `build-row-level-permission-record-filter.util.ts`).
  The gate itself: `enterprisePlanService.isValid() && billing entitlement RLS`.
- We therefore do **not** enable, edit, call, or write into those. Our client isolation is a **clean-room feature in the
  AGPL code**: our own table, our own util, our own mutation, plugged into the AGPL seam
  (`twenty-orm/repository/workspace-select-query-builder.ts` + `permissions.utils.ts`, both AGPL, no licence checks).
- AGPL §13: the corresponding source of what runs at app.prospectengine.com is public — `Dewx-com/dewx-crm` on GitHub
  (already the declared source for crm.dewx.com), branch `pe`. `NOTICE.md` lists our modifications. Twenty's name and
  marks are removed from the product (trademark law asks for exactly that in a fork).

## Two build paths
1. **Overlay** (`overlay/Dockerfile`, minutes): FROM the upstream image, rebrand at build time. Branding, icons, palette,
   links, emails. Already the mechanism behind crm.dewx.com since 07-26 (then "Dewx CRM"). Upgrade = tag bump.
2. **Source branch** (days): a short patch series on top of an upstream tag for features that need code — the client
   scope. Built with upstream's own Dockerfile on Contabo (heavy: yarn + nx, 30–60 min, nice'd), then the overlay on top.
   Kept small and rebased on each upstream tag we adopt, so upgrades stay cheap.

## The client-scope design (clean-room, AGPL)
- **Storage (ours):** `core.roleScope(roleId, objectMetadataId, fieldMetadataId, value)` — one row per scoped object. A
  metadata mutation `upsertRoleScope` (ours) and a CLI; no UI needed at first.
- **Enforcement (ours, in the AGPL seam):** when the request's role has scope rows for the object, the select query
  builder ANDs `"<field>" = <value>` into every read (find, findMany, aggregate, group-by, search), and the update /
  delete builders refuse rows outside the scope. Related reads (opportunity → person) inherit the scope through the
  same builder. Cache: the role's scopes ride in the existing `rolesPermissions` workspace cache entry, so a scope
  change is one cache recompute (the AGPL `upsertObjectPermissions` already triggers it).
- **Tests first:** a workspace with two clients; a Client role scoped to one; every read path returns only its rows;
  search returns nothing from the other; mutations outside scope are refused; an Employee sees both.
- **Not covered on purpose in v1:** attachments/notes without a `client` field (keep `canRead = false` for clients on
  those objects until they carry the tag); companies (no tag; `canRead = false` for clients).
- Appetite: 3–5 working days including the build pipeline and tests. Decision points: none until the tests exist.

## Sequence
1. Today: overlay with Prospect Engine branding → `pe-crm:<date>` built on Contabo → staging on `127.0.0.1:3010`
   against a DB copy → Roki looks. Employee role + `workType` + `client` field are already live in the data (done).
2. "deploy prod go": Caddy `app.prospectengine.com` → the new image; nightly backup; receiver client-tag patch; the
   two Dewx/PE workspaces merge into one (the PE workspace is the product; the Dewx one becomes history) — Roki's call
   on the merge, it moves data.
3. Source branch: client scope (above) → tests → staging → go.
4. After: client dashboards ("My pipeline"), proposals, invoices (with the "client data stays on the Mac" rule decided
   per object), the Dewx dev-client portal at dev.dewx.com stays separate.

## Not doing
Enabling or editing Enterprise-marked files; a licence key workaround; inviting any client before the scope feature
has passing tests; forking more than the patch series needs; building on the Mac (orchestrator, 36 GB).
