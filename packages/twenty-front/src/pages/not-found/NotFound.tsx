import { Trans, useLingui } from '@lingui/react/macro';
import { lazy, Suspense } from 'react';

const BackgroundMockPage = lazy(() =>
  import('@/sign-in-background-mock/components/BackgroundMockPage').then(
    (module) => ({ default: module.BackgroundMockPage }),
  ),
);
import { AppPath } from 'twenty-shared/types';

import { RootStackingContextZIndices } from '@/ui/layout/constants/RootStackingContextZIndices';
import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';
import { styled } from '@linaria/react';
import { MainButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import {
  AnimatedPlaceholder,
  AnimatedPlaceholderEmptyTextContainer,
  AnimatedPlaceholderErrorContainer,
  AnimatedPlaceholderErrorSubTitle,
  AnimatedPlaceholderErrorTitle,
} from 'twenty-ui/feedback';
import { UndecoratedLink } from 'twenty-ui/navigation';

const StyledBackDrop = styled.div`
  align-items: center;
  backdrop-filter: ${themeCssVariables.blur.light};
  background: ${themeCssVariables.background.transparent.secondary};
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
  left: 0;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: ${RootStackingContextZIndices.NotFound};
`;

const StyledButtonContainer = styled.div`
  width: 200px;
`;

export const NotFound = () => {
  const { t } = useLingui();

  return (
    <>
      <PageTitle title={t`Page not found | Prospect Engine`} />
      <StyledBackDrop>
        <AnimatedPlaceholderErrorContainer>
          <AnimatedPlaceholder type="error404" />
          <AnimatedPlaceholderEmptyTextContainer>
            <AnimatedPlaceholderErrorTitle>
              <Trans>That page is not here</Trans>
            </AnimatedPlaceholderErrorTitle>
            <AnimatedPlaceholderErrorSubTitle>
              <Trans>
                Either the link is wrong or what it pointed at has been removed.
              </Trans>
            </AnimatedPlaceholderErrorSubTitle>
          </AnimatedPlaceholderEmptyTextContainer>
          <StyledButtonContainer>
            <UndecoratedLink to={AppPath.Index}>
              <MainButton title={t`Back to your workspace`} fullWidth />
            </UndecoratedLink>
          </StyledButtonContainer>
        </AnimatedPlaceholderErrorContainer>
      </StyledBackDrop>
      <Suspense fallback={null}>
        <BackgroundMockPage />
      </Suspense>
    </>
  );
};
