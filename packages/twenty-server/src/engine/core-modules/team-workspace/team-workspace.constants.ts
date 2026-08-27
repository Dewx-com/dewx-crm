export const TEAM_WORKSPACE_DISPLAY_NAME = 'Prospect Engine';

export const TEAM_WORKSPACE_ROLE_LABEL = {
  admin: 'Admin',
  automation: 'Team Automation',
  operations: 'Operations',
  sales: 'Sales',
  // Team = one person who works both lanes (Roki, 2026-08-27: Abrar covers Sales and Operations).
  // It is a union of the two lane roles and deliberately NOT Admin: it never opens Team Management,
  // where the coaching notes and attention flags about that same person live.
  team: 'Team',
} as const;

export const TEAM_WORKSPACE_RECORD_PREFIX = {
  blocker: 'Blocked ·',
  clientUpdate: 'Client update ·',
  coaching: 'Coaching ·',
  completionEvidence: 'Completion evidence ·',
  handoff: 'Handoff ·',
  handoffReturn: 'Handoff returned ·',
  meetingOutcome: 'Meeting outcome ·',
  meetingPrep: 'Meeting prep ·',
  promise: 'Promise ·',
} as const;

export const TEAM_WORKSPACE_QUERY_LIMIT = {
  callRecordings: 20,
  clients: 200,
  meetings: 200,
  opportunities: 200,
  tasks: 500,
} as const;

// A role label is "<capability> · <person>" when it carries a per-person record scope: a scope value
// is fixed per role, so each person needs their own (Employee · Siam, Client · Fr8labs already do
// this). The capability is the part before the separator. Compare capabilities, never raw labels.
export const TEAM_WORKSPACE_ROLE_LABEL_SEPARATOR = ' · ';

export const baseRoleLabel = (label: string): string =>
  label.split(TEAM_WORKSPACE_ROLE_LABEL_SEPARATOR)[0].trim();
