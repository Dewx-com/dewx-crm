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
