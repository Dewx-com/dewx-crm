# Prospect Engine team domain

`team.prospectengine.com` is a second hostname for the existing Prospect
Engine workspace. It does not rename the workspace, replace
`app.prospectengine.com`, or create another CRM/database.

The server owns the binding. `TEAM_WORKSPACE_DOMAIN_ALIASES` maps an exact
hostname to the workspace's immutable UUID. A display-name change cannot move
the alias. Wildcards, URLs, workspace names, invalid UUIDs, and normalized
duplicate hosts fail configuration validation. If the configured UUID is
missing or soft-deleted, the alias fails closed instead of falling through to
a same-named subdomain.

## Application configuration

First obtain the one live workspace UUID by its existing canonical route, not
by `displayName`:

```sql
SELECT id, subdomain, "customDomain", "deletedAt"
FROM core.workspace
WHERE "deletedAt" IS NULL
  AND (subdomain = 'app' OR "customDomain" = 'app.prospectengine.com');
```

Stop if this does not return exactly one row. Put that full UUID into the
server/worker environment as one-line JSON:

```dotenv
TEAM_WORKSPACE_DOMAIN_ALIASES={"team.prospectengine.com":"<full-workspace-uuid>"}
```

Keep the existing values of `SERVER_URL`, `FRONTEND_URL`,
`IS_MULTIWORKSPACE_ENABLED`, `DEFAULT_SUBDOMAIN`, and the workspace row. In
particular, do not replace the existing `app.prospectengine.com` custom domain
or `app` subdomain. The variable is environment-only and cannot be changed in
the Twenty admin panel.

## DNS and Caddy

Required DNS record when no covering wildcard already exists:

```text
type: A
host: team
value: 169.58.19.63
TTL: 1800
```

An existing `*.prospectengine.com` A record with that value already covers the
hostname; do not add a conflicting duplicate. Verify that the explicit
`app.prospectengine.com` record is unchanged.

Use the same upstream as the existing app host. With the measured Contabo
layout, `/etc/caddy/Caddyfile.d/team.caddy` is:

```caddyfile
team.prospectengine.com {
    reverse_proxy 127.0.0.1:3000
}
```

Confirm `/etc/caddy/Caddyfile` imports `/etc/caddy/Caddyfile.d/*.caddy`, then
validate before reloading. Back up both the live `.env` and Caddy configuration
before changing either.

Roll out the application image and environment first. Prove the alias marker
against the private upstream by sending the team origin in the GraphQL query,
then add the Caddy route and DNS record. This prevents public traffic from
reaching a server version that does not understand the capability.

## Release proof

After restarting the server and worker, query each origin through its own host:

```graphql
query WorkspaceForHost($origin: String!) {
  getPublicWorkspaceDataByDomain(origin: $origin) {
    id
    displayName
    isTeamWorkspaceDomainAlias
    workspaceUrls { customUrl subdomainUrl }
  }
}
```

The two responses must have the same UUID. For
`https://team.prospectengine.com`, `isTeamWorkspaceDomainAlias` must be `true`
and `customUrl` must be the team host. For
`https://app.prospectengine.com`, the marker must be `false` and its existing
URL must remain unchanged. Then verify on a remote browser fleet node:

- `team.prospectengine.com` shows the Sales/Operations picker and enforces the
  selected account's server role.
- `app.prospectengine.com` keeps the normal Twenty login and does not enter a
  team lane, even though both hosts resolve the same workspace.
- An unconfigured hostname does not inherit the team experience.

## Rollback

Remove only the `team.prospectengine.com` Caddy block first, validate, and
reload Caddy so new alias traffic stops. Then remove
`TEAM_WORKSPACE_DOMAIN_ALIASES` and restart the server and worker. Remove only
the `team` DNS record if it was added explicitly. No database rollback is
required because the alias never changes a workspace row. Confirm
`app.prospectengine.com/healthz` and its normal login after every rollback step.
