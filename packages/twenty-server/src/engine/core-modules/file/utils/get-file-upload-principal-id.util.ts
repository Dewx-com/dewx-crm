import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';

export const getFileUploadPrincipalId = (
  auth: WorkspaceAuthContext | undefined,
): string | undefined => {
  switch (auth?.type) {
    case 'user':
    case 'pendingActivationUser':
      return `membership:${auth.userWorkspaceId}`;
    case 'apiKey':
      return `apiKey:${auth.apiKey.id}`;
    case 'application':
      return `application:${auth.application.id}`;
    default:
      return undefined;
  }
};
