import { domainConfigurationState } from '@/domain-manager/states/domainConfigurationState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useIsCurrentLocationOnAWorkspace } from '@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace';

export const useReadWorkspaceUrlFromCurrentLocation = () => {
  const { isOnAWorkspace } = useIsCurrentLocationOnAWorkspace();

  const { isSharedDomainEnabled } = useAtomStateValue(domainConfigurationState);

  return {
    currentLocationHostname:
      isOnAWorkspace && !isSharedDomainEnabled
        ? window.location.hostname
        : undefined,
  };
};
