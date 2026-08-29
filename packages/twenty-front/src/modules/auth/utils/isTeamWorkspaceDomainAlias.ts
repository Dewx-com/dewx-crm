// The server binds an exact hostname (app.dewx.com) to one workspace id through
// TEAM_WORKSPACE_DOMAIN_ALIASES and tells the front about it on the public workspace data. Two
// sign-in rules hang off it and survive the removal of the team lanes (2026-08-29): on our own
// host an unknown email is never offered a sign-up, and only password sign-in is shown.
export const isTeamWorkspaceDomainAlias = (value: unknown): value is true =>
  value === true;
