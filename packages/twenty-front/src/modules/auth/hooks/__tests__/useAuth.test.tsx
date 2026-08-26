import { useAuth } from '@/auth/hooks/useAuth';

import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { type ReactNode, act } from 'react';
import { MemoryRouter } from 'react-router-dom';

import {
  email,
  mocks,
  password,
  results,
  token,
} from '@/auth/hooks/__mocks__/useAuth';
import {
  type CurrentUser,
  currentUserState,
} from '@/auth/states/currentUserState';
import {
  type CurrentWorkspace,
  currentWorkspaceState,
} from '@/auth/states/currentWorkspaceState';
import { selectedTeamWorkspaceLaneState } from '@/auth/sign-in-up/team-workspace/states/selectedTeamWorkspaceLaneState';
import { returnToPathState } from '@/auth/states/returnToPathState';
import { tokenPairState } from '@/auth/states/tokenPairState';
import {
  type WorkspacePublicData,
  workspacePublicDataState,
} from '@/auth/states/workspacePublicDataState';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { GET_CURRENT_TEAM_WORKSPACE_MEMBER_ROLES } from '@/team-workspace/role/graphql/queries/getCurrentTeamWorkspaceMemberRoles';
import { SnackBarComponentInstanceContext } from '@/ui/feedback/snack-bar-manager/contexts/SnackBarComponentInstanceContext';
import { renderHook } from '@testing-library/react';
import { getDefaultStore } from 'jotai';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { SignOutDocument } from '~/generated-metadata/graphql';

const redirectSpy = jest.fn();

const signOutWithoutRefreshTokenMock: MockedResponse = {
  request: {
    query: SignOutDocument,
    variables: {},
  },
  result: { data: { signOut: true } },
};

jest.mock('@/domain-manager/hooks/useRedirect', () => ({
  useRedirect: jest.fn().mockImplementation(() => ({
    redirect: redirectSpy,
  })),
}));

jest.mock('@/domain-manager/hooks/useOrigin', () => ({
  useOrigin: jest.fn().mockImplementation(() => ({
    origin: 'http://localhost',
  })),
}));

jest.mock('@/captcha/hooks/useRequestFreshCaptchaToken', () => ({
  useRequestFreshCaptchaToken: jest.fn().mockImplementation(() => ({
    requestFreshCaptchaToken: jest.fn(),
  })),
}));

jest.mock('@/auth/sign-in-up/hooks/useSignUpInNewWorkspace', () => ({
  useSignUpInNewWorkspace: jest.fn().mockImplementation(() => ({
    createWorkspace: jest.fn(),
  })),
}));

jest.mock('@/domain-manager/hooks/useRedirectToWorkspaceDomain', () => ({
  useRedirectToWorkspaceDomain: jest.fn().mockImplementation(() => ({
    redirectToWorkspaceDomain: jest.fn(),
  })),
}));

jest.mock('@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace', () => ({
  useIsCurrentLocationOnAWorkspace: jest.fn().mockImplementation(() => ({
    isOnAWorkspace: true,
  })),
}));

jest.mock('@/domain-manager/hooks/useLastAuthenticatedWorkspaceDomain', () => ({
  useLastAuthenticatedWorkspaceDomain: jest.fn().mockImplementation(() => ({
    setLastAuthenticateWorkspaceDomain: jest.fn(),
  })),
}));

const renderHooks = (
  apolloMocks: readonly MockedResponse[] = [
    ...Object.values(mocks),
    signOutWithoutRefreshTokenMock,
  ],
) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={apolloMocks}>
      <MemoryRouter>
        <SnackBarComponentInstanceContext.Provider
          value={{ instanceId: 'test-instance-id' }}
        >
          {children}
        </SnackBarComponentInstanceContext.Provider>
      </MemoryRouter>
    </MockedProvider>
  );

  const { result } = renderHook(
    () => {
      return useAuth();
    },
    {
      wrapper: Wrapper,
    },
  );
  return { result };
};

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDefaultStore().set(returnToPathState.atom, '');
    getDefaultStore().set(selectedTeamWorkspaceLaneState.atom, null);
    getDefaultStore().set(workspacePublicDataState.atom, null);
    getDefaultStore().set(tokenPairState.atom, null);
    getDefaultStore().set(currentWorkspaceMemberState.atom, null);
  });

  it('should return login token object', async () => {
    const { result } = renderHooks();

    await act(async () => {
      expect(
        await result.current.getLoginTokenFromCredentials(email, password),
      ).toStrictEqual(results.getLoginTokenFromCredentials);
    });

    expect(mocks.getLoginTokenFromCredentials.result).toHaveBeenCalled();
  });

  it('should verify user', async () => {
    const { result } = renderHooks();

    await act(async () => {
      await result.current.getAuthTokensFromLoginToken(token);
    });

    expect(mocks.getAuthTokensFromLoginToken.result).toHaveBeenCalled();
    expect(mocks.getCurrentUser.result).toHaveBeenCalled();
  });

  it('should handle credential sign-in', async () => {
    const { result } = renderHooks();

    await act(async () => {
      await result.current.signInWithCredentialsInWorkspace(email, password);
    });

    expect(mocks.getLoginTokenFromCredentials.result).toHaveBeenCalled();
    expect(mocks.getAuthTokensFromLoginToken.result).toHaveBeenCalled();
  });

  it('should handle google sign-in', async () => {
    const { result } = renderHooks();

    await act(async () => {
      await result.current.signInWithGoogle({
        workspaceInviteHash: 'workspaceInviteHash',
        action: 'join-workspace',
      });
    });

    expect(redirectSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '/auth/google?workspaceInviteHash=workspaceInviteHash',
      ),
    );
  });

  it('should forward returnToPath to /auth/google when set in state', async () => {
    getDefaultStore().set(
      returnToPathState.atom,
      '/authorize?response_type=code&client_id=abc&state=xyz',
    );

    const { result } = renderHooks();

    await act(async () => {
      await result.current.signInWithGoogle({
        action: 'list-available-workspaces',
      });
    });

    const calledWithUrl = redirectSpy.mock.calls[0]?.[0] as string;
    const parsed = new URL(calledWithUrl);

    expect(parsed.pathname).toBe('/auth/google');
    expect(parsed.searchParams.get('action')).toBe('list-available-workspaces');
    expect(parsed.searchParams.get('returnToPath')).toBe(
      '/authorize?response_type=code&client_id=abc&state=xyz',
    );
  });

  it('should not forward an invalid (protocol-relative) returnToPath', async () => {
    getDefaultStore().set(returnToPathState.atom, '//evil.example.com');

    const { result } = renderHooks();

    await act(async () => {
      await result.current.signInWithGoogle({
        action: 'list-available-workspaces',
      });
    });

    const calledWithUrl = redirectSpy.mock.calls[0]?.[0] as string;
    const parsed = new URL(calledWithUrl);

    expect(parsed.searchParams.has('returnToPath')).toBe(false);
  });

  it('should handle sign-out', async () => {
    sessionStorage.setItem('lingering-key', 'should-be-cleared');
    getDefaultStore().set(currentWorkspaceState.atom, {
      id: 'workspace-id',
      activationStatus: WorkspaceActivationStatus.SUSPENDED,
    } as CurrentWorkspace);
    getDefaultStore().set(currentUserState.atom, {
      id: 'user-id',
    } as CurrentUser);

    const { result } = renderHooks();

    await act(async () => {
      await result.current.signOut();
    });

    expect(sessionStorage.length).toBe(0);
    expect(getDefaultStore().get(currentWorkspaceState.atom)).toBeNull();
    expect(getDefaultStore().get(currentUserState.atom)).toBeNull();
  });

  it('should handle credential sign-up', async () => {
    const { result } = renderHooks();

    await act(async () => {
      await result.current.signUpWithCredentialsInWorkspace({
        email,
        password,
      });
    });

    expect(mocks.signUpInWorkspace.result).toHaveBeenCalled();
  });

  it('accepts the selected team lane only when the server role matches', async () => {
    getDefaultStore().set(workspacePublicDataState.atom, {
      displayName: 'Prospect Engine',
      isTeamWorkspaceDomainAlias: true,
    } as WorkspacePublicData);
    getDefaultStore().set(selectedTeamWorkspaceLaneState.atom, 'sales');

    const salesRoleResult = jest.fn(() => ({
      data: {
        currentUser: {
          workspaceMember: {
            roles: [{ id: 'sales-role', label: 'Sales' }],
          },
        },
      },
    }));
    const salesRoleMock: MockedResponse = {
      request: { query: GET_CURRENT_TEAM_WORKSPACE_MEMBER_ROLES },
      result: salesRoleResult,
    };
    const { result } = renderHooks([...Object.values(mocks), salesRoleMock]);

    await act(async () => {
      await result.current.getAuthTokensFromLoginToken(token);
    });

    expect(salesRoleResult).toHaveBeenCalled();
    expect(mocks.getCurrentUser.result).toHaveBeenCalled();
    expect(getDefaultStore().get(selectedTeamWorkspaceLaneState.atom)).toBe(
      'sales',
    );
    expect(getDefaultStore().get(tokenPairState.atom)).toEqual(
      results.getAuthTokensFromLoginToken.tokens,
    );
  });

  it('rejects and clears a team session when the selected lane mismatches the server role', async () => {
    getDefaultStore().set(workspacePublicDataState.atom, {
      displayName: 'Prospect Engine',
      isTeamWorkspaceDomainAlias: true,
    } as WorkspacePublicData);
    getDefaultStore().set(selectedTeamWorkspaceLaneState.atom, 'sales');

    const operationsRoleMock: MockedResponse = {
      request: { query: GET_CURRENT_TEAM_WORKSPACE_MEMBER_ROLES },
      result: {
        data: {
          currentUser: {
            workspaceMember: {
              roles: [{ id: 'operations-role', label: 'Operations' }],
            },
          },
        },
      },
    };
    const signOutMock: MockedResponse = {
      request: {
        query: SignOutDocument,
        variables: { refreshToken: token },
      },
      result: { data: { signOut: true } },
    };
    const { result } = renderHooks([
      ...Object.values(mocks),
      operationsRoleMock,
      signOutMock,
    ]);

    await act(async () => {
      await expect(
        result.current.getAuthTokensFromLoginToken(token),
      ).rejects.toThrow('This account belongs to Operations');
    });

    expect(
      getDefaultStore().get(selectedTeamWorkspaceLaneState.atom),
    ).toBeNull();
    expect(getDefaultStore().get(tokenPairState.atom)).toBeNull();
    expect(getDefaultStore().get(currentWorkspaceMemberState.atom)).toBeNull();
  });

  it('keeps the canonical app login outside the team lane flow', async () => {
    getDefaultStore().set(workspacePublicDataState.atom, {
      displayName: 'Prospect Engine',
      isTeamWorkspaceDomainAlias: false,
    } as WorkspacePublicData);
    getDefaultStore().set(selectedTeamWorkspaceLaneState.atom, 'sales');

    const { result } = renderHooks();

    await act(async () => {
      await result.current.getAuthTokensFromLoginToken(token);
    });

    expect(mocks.getCurrentUser.result).toHaveBeenCalled();
    expect(getDefaultStore().get(selectedTeamWorkspaceLaneState.atom)).toBe(
      null,
    );
  });
});
