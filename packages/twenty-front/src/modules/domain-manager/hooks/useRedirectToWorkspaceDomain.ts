import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { useBuildSearchParamsFromUrlSyncedStates } from '@/domain-manager/hooks/useBuildSearchParamsFromUrlSyncedStates';
import { useBuildWorkspaceUrl } from '@/domain-manager/hooks/useBuildWorkspaceUrl';
import { useRedirect } from '@/domain-manager/hooks/useRedirect';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const useRedirectToWorkspaceDomain = () => {
  const isMultiWorkspaceEnabled = useAtomStateValue(
    isMultiWorkspaceEnabledState,
  );
  const { buildWorkspaceUrl } = useBuildWorkspaceUrl();
  const { redirect } = useRedirect();

  const { buildSearchParamsFromUrlSyncedStates } =
    useBuildSearchParamsFromUrlSyncedStates();

  const redirectToWorkspaceDomain = async (
    baseUrl: string,
    pathname?: string,
    searchParams?: Record<string, string | boolean>,
    target?: string,
  ) => {
    if (!isMultiWorkspaceEnabled) return;
    const url = buildWorkspaceUrl(baseUrl, pathname, {
      ...searchParams,
      ...(await buildSearchParamsFromUrlSyncedStates()),
    });

    // A same-origin account change must bootstrap from an empty tab session.
    // The destination's login token is verified by the server before loading data.
    if (
      new URL(url).origin === window.location.origin &&
      (!target || target === '_self')
    ) {
      sessionStorage.clear();
    }
    redirect(url, target);
  };

  return {
    redirectToWorkspaceDomain,
  };
};
