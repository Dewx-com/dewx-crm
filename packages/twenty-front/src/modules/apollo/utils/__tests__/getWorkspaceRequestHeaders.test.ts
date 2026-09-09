import { getWorkspaceRequestHeaders } from '@/apollo/utils/getWorkspaceRequestHeaders';
import { TOKEN_PAIR_LOCAL_STORAGE_KEY } from '@/auth/states/tokenPairState';
import { domainConfigurationState } from '@/domain-manager/states/domainConfigurationState';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';

const accountId = '11111111-1111-4111-8111-111111111111';
const saveToken = (payload: object) =>
  sessionStorage.setItem(
    TOKEN_PAIR_LOCAL_STORAGE_KEY,
    JSON.stringify({
      accessOrWorkspaceAgnosticToken: {
        token: `header.${btoa(JSON.stringify(payload))}.signature`,
      },
    }),
  );

describe('account request selection', () => {
  afterEach(() => {
    sessionStorage.clear();
  });
  it('selects the tab account without sending its credential in the selection header', () => {
    jotaiStore.set(domainConfigurationState.atom, {
      frontDomain: 'app.example.com',
      isSharedDomainEnabled: true,
    });
    saveToken({ workspaceId: accountId });
    expect(getWorkspaceRequestHeaders()).toEqual({
      'x-workspace-id': accountId,
    });
    saveToken({ type: 'WORKSPACE_AGNOSTIC' });
    expect(getWorkspaceRequestHeaders()).toEqual({});
    saveToken({ workspaceId: 'invalid' });
    expect(getWorkspaceRequestHeaders()).toEqual({});
  });
  it('keeps legacy domain-based requests unchanged', () => {
    jotaiStore.set(domainConfigurationState.atom, {
      frontDomain: 'app.example.com',
      isSharedDomainEnabled: false,
    });
    saveToken({ workspaceId: accountId });
    expect(getWorkspaceRequestHeaders()).toEqual({});
  });
});
