import { type Role, type WorkspaceMember } from '~/generated-metadata/graphql';

export type PartialWorkspaceMember = Omit<
  WorkspaceMember,
  | 'colorScheme'
  | 'uiScale'
  | 'openRecordIn'
  | 'locale'
  | 'timeZone'
  | 'dateFormat'
  | 'timeFormat'
  | 'calendarStartDay'
  | 'createdAt'
  | 'updatedAt'
  | 'roles'
>;

export type RoleWithPartialMembers = Omit<Role, 'workspaceMembers'> & {
  workspaceMembers: PartialWorkspaceMember[];
};
