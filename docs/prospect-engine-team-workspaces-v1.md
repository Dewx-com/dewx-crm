# Prospect Engine team workspaces v1

## Outcome

This release adds two role-specific workspaces to the existing Prospect Engine
CRM and database:

- Abrar uses Sales for upcoming meetings, preparation, follow-ups, pipeline,
  outcomes, handoffs, and evidence-backed call coaching.
- Fahim uses Operations for client health, delivery work, blockers, meetings,
  verified updates, and Sales-to-Operations handoffs.
- An Admin may enter either lane.

`team.prospectengine.com` is the team login and application surface.
`app.prospectengine.com` remains the normal CRM surface. Both exact hostnames
resolve to the same immutable workspace UUID; neither creates a second CRM.
See [prospect-engine-team-domain.md](./prospect-engine-team-domain.md) for the
domain binding and rollback procedure.

## Authentication and roles

The lane picker is a UX request, never authorization:

1. The user chooses Sales or Operations.
2. Twenty authenticates the existing email/password account.
3. The server reads the account's one assigned role.
4. A matching role enters the lane; a mismatch clears the session and returns
   to the picker.

Reserved labels are exact and case-sensitive:

| Role              | Assignment              | Team access                 |
| ----------------- | ----------------------- | --------------------------- |
| `Sales`           | Human users only        | Sales                       |
| `Operations`      | Human users only        | Operations                  |
| `Admin`           | Trusted human admins    | Sales and Operations        |
| `Team Automation` | API keys only           | Both lanes through MCP only |

Missing, unknown, multiple, or wrongly assigned reserved roles fail closed.
In particular, a human assigned `Team Automation` receives no team or generic
MCP tools.

Provision each team member through the normal invitation flow, assigning the
salesperson to `Sales` only and the delivery lead to `Operations` only. Keep
their addresses in the deployment secret input, not in source control.

Each person sets their own password from the one-time invitation. Never create,
share, log, or commit a password on their behalf.

## Security boundary

Sales, Operations, and Team Automation have zero generic object grants and no
settings, role, member, API-key, delete, or arbitrary tool access. Their data
is available only through the purpose-built projection and command services.
The frontend navigation is an additional guard, not the boundary.

`teamWorkspaceSnapshot(lane)` returns only these bounded DTOs:

- role-appropriate tasks and handoffs;
- Sales pipeline or Operations handoff context;
- relevant clients and assigned meetings;
- for Sales only, call status, summary, transcript availability, and a safe
  evidence reference.

Raw transcript content and provider payloads are never fields in the browser or
MCP response. Sales meetings and tasks are owned; the single Sales seat's
pipeline is lane-wide. Operations clients and operational work are lane-wide,
but Sales/`OUTREACH` tasks are excluded even if accidentally assigned to an
Operations user.

Generic GraphQL, REST, record CRUD, tool catalogs, workspace skills, and
`execute_tool` remain unavailable to these roles. Native MCP switches to a
closed-world tool list as soon as it sees any reserved team role; malformed
role sets and stale member context return no tools rather than falling back to
the generic catalog.

## Shared record protocol

The server derives titles, client scope, due time, status, work type, assignee,
actor metadata, and side-effect IDs. Clients never submit arbitrary Task rows.

| Action                  | Canonical task title                                      |
| ----------------------- | --------------------------------------------------------- |
| Meeting preparation     | `Meeting prep · <calendar-event-id> · <meeting-title>`    |
| Meeting outcome         | `Meeting outcome · <calendar-event-id> · <meeting-title>` |
| Coaching lesson         | `Coaching · <call-recording-id> · <recording-title>`      |
| Sales handoff            | `Handoff · <opportunity-id> · <company>`                  |
| Returned handoff        | `Handoff returned · <handoff-task-id> · <client>`         |
| Verified client update  | `Client update · <client-scope> · <client>`               |
| Completion evidence     | `Completion evidence · <original-task-id>`                |
| Blocker                 | `Blocked · <original-task-id> · <task>`                   |

Task states are `TODO`, `IN_PROGRESS`, and `DONE`; opportunity stages use the
existing CRM values. `DONE` is available only through evidence completion.
`CUSTOMER` is available only through the atomic win-and-handoff command.

Handoffs require contact, problem, agreed scope, promises, next commitment,
evidence, and a checkable source. A submitted client scope must match the
opportunity; when the opportunity is unscoped, exactly one real Client record
must match and the scope is backfilled in the same transaction. Operations
returns incomplete handoffs instead of guessing.

Meeting outcomes are recorded only after the scheduled start. An invitation is
not attendance evidence. Coaching lessons require a linked completed recording
with transcript evidence; the raw transcript still remains outside the DTO.

## Writes and idempotency

The web app and native MCP call the same five server commands:

| GraphQL command                    | Purpose                                             |
| ---------------------------------- | --------------------------------------------------- |
| `createProtocolTask`               | Prep, outcome, coaching, update, blocker, or return |
| `transitionTaskStatus`             | `TODO` ↔ `IN_PROGRESS`                              |
| `completeTaskWithEvidence`         | Evidence sidecar + `DONE`                           |
| `updateOpportunityStage`           | Non-`CUSTOMER` pipeline transition                  |
| `winOpportunityWithHandoff`        | Handoff + client scope + `CUSTOMER`                 |

Each command validates workspace capability, principal type, exact role, lane,
ownership/context, expected state, and `updatedAt` version before privileged
repositories are opened. Target change, side effect, and durable receipt commit
in one workspace transaction under advisory locks. Any failure rolls all of it
back.

Callers provide a stable idempotency key. An exact retry returns the saved
receipt with `replayed: true`; reusing the key with another actor, target, or
payload fails. A transport timeout is unknown state, so retry the exact payload
and key rather than inventing a new write.

Receipts currently use reserved workspace-scoped rows in `core.keyValuePair`,
inside the same Postgres transaction. They are not exposed through CRM object
permissions.

## Native MCP

The native `/mcp` endpoint exposes only these tools to recognized team
principals:

- `team_workspace_snapshot`
- `team_workspace_create_protocol_task`
- `team_workspace_transition_task_status`
- `team_workspace_complete_task`
- `team_workspace_update_opportunity_stage`
- `team_workspace_win_opportunity`

Sales and Operations receive only their permitted lane/actions. `Team
Automation` receives both lanes and must be an API-key-only, zero-grant role.
Roki may also use the same tools through a human Admin OAuth session. No second
MCP server or data store exists.

## Release checks

Before production cutover, prove all of the following against the staging copy
of the live database:

- frontend and server type checks, type-aware lint, focused tests, and the
  production frontend build pass;
- exact Sales, Operations, and Team Automation roles have zero object and
  permission grants and correct assignment flags;
- Sales/Operations snapshots succeed only in their lane, while generic REST,
  GraphQL CRUD, cross-lane access, raw transcript selection, and generic MCP
  `execute_tool` fail;
- command success, exact replay, payload conflict, stale version, and forced
  transaction rollback behave as documented;
- the private origin reports the same workspace UUID for both hosts, with the
  team marker true only for `team.prospectengine.com`;
- `app.prospectengine.com` remains healthy and keeps the normal login.

Production order is immutable image build, fresh database backup, server and
worker swap, health/log checks, role provisioning, exact-host environment,
Caddy validation/reload, DNS A record, account invitations, and public TLS/UI
verification. The printed immutable previous image is the application rollback;
the pre-swap SQL dump is the data recovery point.
