import { jwtDecode } from 'jwt-decode';
import { isValidUuid } from 'twenty-shared/utils';

import { getTokenPair } from '@/apollo/utils/getTokenPair';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { domainConfigurationState } from '@/domain-manager/states/domainConfigurationState';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';

// This selects an HttpOnly account cookie, never authorizes an account.
// The server validates that cookie's membership and account on every request.
export const getWorkspaceRequestHeaders = (): Record<string, string> => {
  if (!jotaiStore.get(domainConfigurationState.atom).isSharedDomainEnabled)
    return {};
  const token = getTokenPair()?.accessOrWorkspaceAgnosticToken?.token;
  try {
    const workspaceId = token
      ? jwtDecode<{ workspaceId?: string }>(token).workspaceId
      : jotaiStore.get(currentWorkspaceState.atom)?.id;
    return workspaceId && isValidUuid(workspaceId)
      ? { 'x-workspace-id': workspaceId }
      : {};
  } catch {
    return {};
  }
};
