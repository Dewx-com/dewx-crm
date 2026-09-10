import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, renderHook } from '@testing-library/react';

import { useSignUpInNewWorkspace } from '@/auth/sign-in-up/hooks/useSignUpInNewWorkspace';
import { SignUpInNewWorkspaceDocument } from '~/generated-metadata/graphql';

const createMutation = jest.fn();
const uploadMutation = jest.fn();
const redirect = jest.fn().mockResolvedValue(undefined);

jest.mock('@apollo/client/react', () => ({
  useMutation: (document: unknown) => [
    document === SignUpInNewWorkspaceDocument ? createMutation : uploadMutation,
  ],
}));
jest.mock('@/auth/hooks/useAuth', () => ({
  useAuth: () => ({ getAuthTokensFromLoginToken: jest.fn() }),
}));
jest.mock('@/domain-manager/hooks/useRedirectToWorkspaceDomain', () => ({
  useRedirectToWorkspaceDomain: () => ({ redirectToWorkspaceDomain: redirect }),
}));
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: () => true,
}));
jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: () => ({ enqueueErrorSnackBar: jest.fn() }),
}));

it('keeps the same request after a network failure and form remount, clearing it after success', async () => {
  sessionStorage.clear();
  i18n.loadAndActivate({ locale: 'en', messages: {} });
  createMutation.mockRejectedValueOnce(new Error('Network interrupted'));
  createMutation.mockResolvedValueOnce({
    data: {
      signUpInNewWorkspace: {
        workspace: {
          id: 'created-account',
          workspaceUrls: { subdomainUrl: 'https://crm.example.invalid/' },
        },
        loginToken: { token: 'test-login-token' },
      },
    },
  });

  const wrapper = ({ children }: React.PropsWithChildren) => (
    <I18nProvider i18n={i18n}>{children}</I18nProvider>
  );
  const first = renderHook(() => useSignUpInNewWorkspace(), { wrapper });
  await act(async () => {
    expect(
      await first.result.current.createWorkspace({
        displayName: 'Customer CRM',
      }),
    ).toBe(false);
  });
  const originalRequest =
    createMutation.mock.calls[0][0].variables.input.requestId;
  expect(originalRequest).toMatch(/^[0-9a-f-]{36}$/);
  expect(sessionStorage.getItem('workspaceCreationRequestId')).toBe(
    originalRequest,
  );
  first.unmount();

  const retry = renderHook(() => useSignUpInNewWorkspace(), { wrapper });
  await act(async () => {
    expect(
      await retry.result.current.createWorkspace({
        displayName: 'Customer CRM',
      }),
    ).toBe(true);
  });
  expect(createMutation.mock.calls[1][0].variables.input.requestId).toBe(
    originalRequest,
  );
  expect(sessionStorage.getItem('workspaceCreationRequestId')).toBeNull();
  expect(redirect).toHaveBeenCalledTimes(1);
  retry.unmount();
});
