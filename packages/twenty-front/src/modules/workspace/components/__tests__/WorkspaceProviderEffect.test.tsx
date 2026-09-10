import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';

import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { domainConfigurationState } from '@/domain-manager/states/domainConfigurationState';
import { lastAuthenticatedWorkspaceDomainState } from '@/domain-manager/states/lastAuthenticatedWorkspaceDomainState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import { WorkspaceProviderEffect } from '@/workspace/components/WorkspaceProviderEffect';

const redirect = jest.fn();
const initializeQueryParamState = jest.fn();

jest.mock('@/domain-manager/hooks/useRedirectToWorkspaceDomain', () => ({
  useRedirectToWorkspaceDomain: () => ({ redirectToWorkspaceDomain: redirect }),
}));
jest.mock('@/app/hooks/useInitializeQueryParamState', () => ({
  useInitializeQueryParamState: () => ({ initializeQueryParamState }),
}));
jest.mock('@/domain-manager/hooks/useGetPublicWorkspaceDataByDomain', () => ({
  useGetPublicWorkspaceDataByDomain: () => ({ data: undefined }),
}));
jest.mock('@/domain-manager/hooks/useIsCurrentLocationOnDefaultDomain', () => ({
  useIsCurrentLocationOnDefaultDomain: () => ({ isDefaultDomain: true }),
}));
jest.mock(
  '@/domain-manager/hooks/useReadWorkspaceUrlFromCurrentLocation',
  () => ({
    useReadWorkspaceUrlFromCurrentLocation: () => ({
      currentLocationHostname: 'app.example.invalid',
    }),
  }),
);

describe('remembered workspace redirect', () => {
  beforeEach(() => {
    resetJotaiStore();
    jest.clearAllMocks();
    window.history.pushState({}, '', '/welcome');
    jotaiStore.set(isMultiWorkspaceEnabledState.atom, true);
    jotaiStore.set(lastAuthenticatedWorkspaceDomainState.atom, {
      workspaceId: 'previous-account',
      workspaceUrl: 'https://app.example.invalid',
    });
  });

  it.each([false, true])(
    'only uses remembered-domain redirects outside shared mode (shared=%s)',
    (shared) => {
      jotaiStore.set(domainConfigurationState.atom, {
        ...jotaiStore.get(domainConfigurationState.atom),
        isSharedDomainEnabled: shared,
      });

      render(
        <JotaiProvider store={jotaiStore}>
          <WorkspaceProviderEffect />
        </JotaiProvider>,
      );

      if (shared) {
        expect(redirect).not.toHaveBeenCalled();
        expect(initializeQueryParamState).not.toHaveBeenCalled();
      } else {
        expect(redirect).toHaveBeenCalledWith(
          'https://app.example.invalid',
          '/welcome',
          {},
        );
        expect(initializeQueryParamState).toHaveBeenCalled();
      }
    },
  );
});
