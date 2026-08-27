import {
  canRolesEnterTeamManagement,
  canRolesEnterTeamWorkspaceLane,
  teamWorkspaceLaneMismatchMessage,
  teamWorkspaceLanesFromRoles,
} from '@/team-workspace/role/utils/teamWorkspaceRoleAccess';

const role = (label: string) => ({ id: `role-${label}`, label });

describe('teamWorkspaceRoleAccess', () => {
  it('maps the Sales role only to the sales lane', () => {
    expect(teamWorkspaceLanesFromRoles([role('Sales')])).toEqual(['sales']);
  });

  it('maps the Operations role only to the operations lane', () => {
    expect(teamWorkspaceLanesFromRoles([role('Operations')])).toEqual([
      'operations',
    ]);
  });

  it('allows an Admin role to enter either lane', () => {
    const roles = [role('Admin')];

    expect(teamWorkspaceLanesFromRoles(roles)).toEqual(['sales', 'operations']);
    expect(canRolesEnterTeamWorkspaceLane({ roles, lane: 'sales' })).toBe(true);
    expect(canRolesEnterTeamWorkspaceLane({ roles, lane: 'operations' })).toBe(
      true,
    );
  });

  it('allows only one exact Admin role into team management', () => {
    expect(canRolesEnterTeamManagement([role('Admin')])).toBe(true);
    expect(canRolesEnterTeamManagement([role('Sales')])).toBe(false);
    expect(canRolesEnterTeamManagement([role('Operations')])).toBe(false);
    expect(canRolesEnterTeamManagement([role('Admin'), role('Sales')])).toBe(
      false,
    );
    expect(canRolesEnterTeamManagement(undefined)).toBe(false);
  });

  it('fails closed for missing, unknown, or differently cased labels', () => {
    expect(teamWorkspaceLanesFromRoles(undefined)).toEqual([]);
    expect(teamWorkspaceLanesFromRoles([role('Member')])).toEqual([]);
    expect(teamWorkspaceLanesFromRoles([role('sales')])).toEqual([]);
    expect(
      teamWorkspaceLanesFromRoles([role('Sales'), role('Member')]),
    ).toEqual([]);
  });

  it('explains how a user can recover from choosing the wrong lane', () => {
    expect(
      teamWorkspaceLaneMismatchMessage({
        roles: [role('Operations')],
        selectedLane: 'sales',
      }),
    ).toBe(
      'This account belongs to Operations. Choose Operations to continue.',
    );
  });
});

describe('the Team role', () => {
  const rolesOf = (...labels: string[]) =>
    labels.map((label, index) => ({ id: `role-${index}`, label }));

  it('should open both lanes', () => {
    expect(teamWorkspaceLanesFromRoles(rolesOf('Team'))).toEqual([
      'sales',
      'operations',
    ]);
  });

  it('should NOT open Team Management, where the notes about that person live', () => {
    expect(canRolesEnterTeamManagement(rolesOf('Team'))).toBe(false);
    expect(canRolesEnterTeamManagement(rolesOf('Admin'))).toBe(true);
  });

  it('should still fail closed when stacked with a lane role', () => {
    expect(teamWorkspaceLanesFromRoles(rolesOf('Team', 'Sales'))).toEqual([]);
  });

  it('should leave a client seat with no lanes at all', () => {
    expect(teamWorkspaceLanesFromRoles(rolesOf('Client · Fr8labs'))).toEqual(
      [],
    );
    expect(canRolesEnterTeamManagement(rolesOf('Client · Fr8labs'))).toBe(
      false,
    );
  });
});

describe('per-person scoped roles', () => {
  const rolesOf = (...labels: string[]) =>
    labels.map((label, index) => ({ id: `role-${index}`, label }));

  it('should open the same lanes for "Team · Abrar" as for "Team"', () => {
    expect(teamWorkspaceLanesFromRoles(rolesOf('Team · Abrar'))).toEqual([
      'sales',
      'operations',
    ]);
  });

  it('should keep a suffixed lane role in its own lane only', () => {
    expect(teamWorkspaceLanesFromRoles(rolesOf('Operations · Fahim'))).toEqual([
      'operations',
    ]);
  });

  it('should let "Admin · Roki" reach management, but never "Team · Abrar"', () => {
    expect(canRolesEnterTeamManagement(rolesOf('Admin · Roki'))).toBe(true);
    expect(canRolesEnterTeamManagement(rolesOf('Team · Abrar'))).toBe(false);
  });

  it('should not be fooled by a lookalike label', () => {
    expect(teamWorkspaceLanesFromRoles(rolesOf('TeamLead'))).toEqual([]);
    expect(teamWorkspaceLanesFromRoles(rolesOf('Client · Team'))).toEqual([]);
  });
});
