# Workspace login repair

A stale workspace-member record whose core membership no longer exists used to abort the complete login bootstrap. The resolver now omits stale or role-less members and retains valid ones. No membership or assignment is deleted.

The active and deleted member lists now use the signed-in caller's ORM permissions. Client scopes already deny these records through REST; the metadata bootstrap must apply the same scopes. Internal system callers retain the original service defaults.

The regression suite is `packages/twenty-server/src/engine/core-modules/user/user.resolver.spec.ts`. It exercises missing memberships, missing roles, empty scoped results, deleted-member permissions, and a missing workspace.

Build the server with its existing Nest/SWC build in an isolated checkout. Copy only the compiled resolver and service plus their source maps beside this Dockerfile; build with SOURCE_REVISION set to the public source commit. The base image, frontend, configuration and all other compiled files stay as deployed. No dependency or schema changes are required. Keep the previous image available for rollback.

The compiled-method regression can also run against the exact release artifacts: mount `compiled-check.cjs` at `/tmp/compiled-check.cjs` in the release image and run it with `--entrypoint node`. It fails on the production baseline with the login error and passes with these compiled changes. Before release, run the compiled-method checks. After release, prove real browser sign-in and cross-client denial with a client seat, and confirm an existing staff seat still loads. Do not store credentials, tokens or client records in this public repository.
