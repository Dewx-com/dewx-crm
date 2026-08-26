# Team workspace transactional commands

`TeamWorkspaceCommandService` is the only write boundary for the v1 team app:

```ts
completeTaskWithEvidence(
  authContext: WorkspaceAuthContext,
  input: CompleteTaskWithEvidenceInput,
): Promise<TeamWorkspaceCommandReceiptDto>

winOpportunityWithHandoff(
  authContext: WorkspaceAuthContext,
  input: WinOpportunityWithHandoffInput,
): Promise<TeamWorkspaceCommandReceiptDto>

createProtocolTask(
  authContext: WorkspaceAuthContext,
  input: CreateTeamWorkspaceProtocolTaskInput,
): Promise<TeamWorkspaceCommandReceiptDto>

transitionTaskStatus(
  authContext: WorkspaceAuthContext,
  input: TransitionTeamWorkspaceTaskInput,
): Promise<TeamWorkspaceCommandReceiptDto>

updateOpportunityStage(
  authContext: WorkspaceAuthContext,
  input: UpdateTeamWorkspaceOpportunityStageInput,
): Promise<TeamWorkspaceCommandReceiptDto>
```

Callers provide the business payload, the exact state/version they read, and an
idempotency key. The server normalizes the payload and computes the canonical
SHA-256. The hash is saved in and returned from the receipt; callers do not
compute or submit a hash.

## Security boundary

All methods fail before opening a transaction unless all of these conditions
hold:

1. `WorkspaceDomainsService.isTeamWorkspaceId(workspace.id)` confirms the
   immutable workspace UUID is the target of a configured team-domain alias.
   A display name never grants access.
2. A human has exactly one of `Sales`, `Operations`, or `Admin`. The
   `Team Automation` label is rejected for humans even if it is accidentally
   assigned.
3. An API key has the exact `Team Automation` role. That role must be
   API-key-assignable and have zero generic object grants. Other API-key roles,
   including `Admin`, fail closed.
4. Human task ownership is validated after the privileged read. Operations has
   lane-wide access only to `SOFTWARE` work and canonical operational/handoff
   records. Sales-owned work remains private to its assignee/author. Sales
   pipeline actions are lane-wide in v1. Expected state and version protect
   every transition.

Only after those checks does the service request repositories with
`shouldBypassPermissionChecks: true`. Generic GraphQL, REST, and MCP record CRUD
must remain denied for these zero-grant roles.

## Atomicity and idempotency

Each method runs one `GlobalWorkspaceOrmManager` workspace transaction. It:

- takes transaction-scoped advisory locks for the target and idempotency key;
- reads and validates the target; state transitions also verify exact expected
  state and `updatedAt` version;
- creates the deterministic protocol/evidence/handoff record when required;
- updates a source record using optimistic state-and-version criteria when
  required;
- reads the result back; and
- inserts the durable command receipt before commit.

Any failure rolls back the sidecar, source transition, and receipt together. An
exact retry returns the saved receipt with `replayed: true`. Reusing a key for a
different actor, target, or canonical payload fails with
`IDEMPOTENCY_CONFLICT`.

Receipts currently use a reserved, workspace-scoped row in the existing
`core.keyValuePair` table. The partial unique index on `(key, workspaceId)` is
the durable idempotency constraint, and the insert occurs through the same
Postgres transaction connection as the workspace writes. This avoids a schema
migration for v1 and is not exposed through CRM object grants. A dedicated
append-only command-receipt table would be cleaner long-term; if introduced,
it must keep the same unique key, actor/workspace binding, and single-transaction
contract.

## Protocol task command

`CreateTeamWorkspaceProtocolTaskInput` accepts only `kind`, `lane`, `targetId`,
`content`, `evidence`, `source`, optional `meetingOutcome`, and
`idempotencyKey`. It never accepts a title, body, client scope, work type,
status, due date, assignee, actor, or payload hash. Those fields are derived
inside the transaction:

| Kind              | Required target  | Lane       | Server validation                                             |
| ----------------- | ---------------- | ---------- | ------------------------------------------------------------- |
| `MEETING_PREP`    | Calendar event   | Either     | Human owns meeting; event is future and not canceled          |
| `MEETING_OUTCOME` | Calendar event   | Either     | Human owns meeting; time/cancellation matches outcome          |
| `COACHING_LESSON` | Call recording   | Sales      | Linked owned meeting and a nonempty transcript                |
| `CLIENT_UPDATE`   | Client           | Operations | Stable client scope exists                                    |
| `BLOCKER`         | Operational task | Operations | Target is lane-wide operational work and is not `DONE`        |
| `HANDOFF_RETURN`  | Handoff task     | Operations | Target has the canonical handoff prefix and is not `DONE`     |

Meeting records must resolve to exactly one client scope. Human Sales and
Operations may create only their own lane. Human Admin and Team Automation may
select either lane, but automation must still supply an explicit target and a
meeting-derived assignee must be unambiguous. Every inserted task ID is a
deterministic function of workspace, kind, target, and idempotency key.

## Simple transitions

`transitionTaskStatus` allows only `TODO -> IN_PROGRESS` and
`IN_PROGRESS -> TODO`, with exact `expectedStatus` and `expectedVersion`.
`DONE` is intentionally absent; use `completeTaskWithEvidence`. Accepting a
handoff is `TODO -> IN_PROGRESS`. Completing a handoff, blocker, or underlying
delivery task requires evidence through `completeTaskWithEvidence`.

`updateOpportunityStage` accepts only `NEW`, `SCREENING`, `MEETING`,
`PROPOSAL`, `DECISION`, `LOST`, `NURTURE`, and `DNC`, with exact expected stage
and version. Sales, human Admin, and Team Automation may use it lane-wide;
Operations may not. `CUSTOMER` is intentionally absent and must use
`winOpportunityWithHandoff` so a won deal cannot exist without its handoff.

`winOpportunityWithHandoff` also treats client scope as CRM identity, not free
text. A nonblank opportunity scope must exactly match the submitted scope. If
the opportunity scope is blank, the submitted scope must resolve to exactly
one Client record; the command then backfills that scope in the same optimistic
update that moves the opportunity to `CUSTOMER`. A missing, duplicated, or
mismatched scope fails before commit, rolling back the handoff and receipt.

## GraphQL exposure

Register the service and a guarded resolver in a module importing:

- `ApiKeyModule`
- `GlobalWorkspaceDataSourceModule`
- `UserRoleModule`
- `WorkspaceDomainsModule`

The resolver should pass `getWorkspaceAuthContext()` directly. Do not accept a
workspace UUID, actor, role, payload hash, or result state as GraphQL input.

```ts
@Mutation(() => TeamWorkspaceCommandReceiptDto)
completeTaskWithEvidence(
  @Args('input') input: CompleteTaskWithEvidenceInput,
) {
  return this.commandService.completeTaskWithEvidence(
    getWorkspaceAuthContext(),
    input,
  );
}
```

Use `WorkspaceAuthGuard`. Do not add `UserAuthGuard` to a resolver that must
also serve the `Team Automation` API key. The service repeats capability,
principal, role, ownership, state, and version checks, so resolver guards are
not the only authorization layer.

## Native MCP exposure

Expose five narrowly named tools, one per method above, and map their validated
arguments directly to the matching DTO. Pass the MCP request's existing
`WorkspaceAuthContext` to the service. Do not route these tools through generic
`createOneRecord` or `updateOneRecord`, and do not let the tool choose a
workspace, actor, role, derived task field, or payload hash.

Every MCP call must supply a fresh stable idempotency key for the intended
business action. A transport timeout is an unknown result: retry the exact same
payload and key, then trust the returned durable receipt. Never retry changed
data under the same key.
