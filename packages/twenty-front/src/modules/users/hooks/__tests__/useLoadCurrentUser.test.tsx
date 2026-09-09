import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, renderHook } from '@testing-library/react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { Observable } from 'rxjs';

import { useLoadCurrentUser } from '@/users/hooks/useLoadCurrentUser';
import { GetCurrentUserDocument } from '~/generated-metadata/graphql';

jest.mock('~/generated-metadata/graphql', () => {
  const { gql } = jest.requireActual('@apollo/client');
  return {
    GetCurrentUserDocument: gql`
      query GetCurrentUser {
        currentUser {
          id
          email
          currentWorkspace {
            id
            workspaceCustomApplication {
              id
            }
            isGoogleAuthBypassEnabled
            isMicrosoftAuthBypassEnabled
            isPasswordAuthBypassEnabled
          }
        }
      }
    `,
  };
});
jest.mock('@/localization/hooks/useInitializeFormatPreferences', () => ({
  useInitializeFormatPreferences: () => ({
    initializeFormatPreferences: jest.fn(),
  }),
}));
jest.mock('@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace', () => ({
  useIsCurrentLocationOnAWorkspace: () => ({ isOnAWorkspace: false }),
}));
jest.mock('@/domain-manager/hooks/useLastAuthenticatedWorkspaceDomain', () => ({
  useLastAuthenticatedWorkspaceDomain: () => ({
    setLastAuthenticateWorkspaceDomain: jest.fn(),
  }),
}));
jest.mock('~/utils/i18n/dynamicActivate', () => ({
  dynamicActivate: jest.fn(),
}));

it('loads the selected account without reusing an in-flight sign-in query', async () => {
  const replies: ((workspace: Record<string, unknown> | null) => void)[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    queryDeduplication: true,
    link: new ApolloLink(
      () =>
        new Observable((observer) => {
          replies.push((workspace) => {
            observer.next({
              data: {
                currentUser: {
                  __typename: 'User',
                  id: 'user',
                  email: 'owner@example.invalid',
                  currentWorkspace: workspace,
                },
              },
            });
            observer.complete();
          });
        }),
    ),
  });
  const store = createStore();
  const { result, unmount } = renderHook(() => useLoadCurrentUser(), {
    wrapper: ({ children }) => (
      <JotaiProvider store={store}>
        <ApolloProvider client={client}>{children}</ApolloProvider>
      </JotaiProvider>
    ),
  });
  try {
    // Same query and user; this request began before the account was selected.
    const signInQuery = client.query({
      query: GetCurrentUserDocument,
      fetchPolicy: 'network-only',
    });
    const selectedAccountQuery = result.current.loadCurrentUser();
    await act(async () => {
      replies[0](null);
      replies[1]?.({
        __typename: 'Workspace',
        id: 'selected-account',
        workspaceCustomApplication: null,
        isGoogleAuthBypassEnabled: false,
        isMicrosoftAuthBypassEnabled: false,
        isPasswordAuthBypassEnabled: false,
      });
      await Promise.all([signInQuery, selectedAccountQuery]);
    });
    expect(replies).toHaveLength(2);
    expect((await selectedAccountQuery).workspace?.id).toBe('selected-account');
  } finally {
    unmount();
    client.stop();
  }
});
