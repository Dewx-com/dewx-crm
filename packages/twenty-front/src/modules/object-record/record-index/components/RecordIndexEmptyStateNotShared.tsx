import { type NonReadableViewFieldInfo } from '@/object-record/record-index/hooks/useHasCurrentViewNonReadableFields';
import { getNonReadableViewFieldSubTitle } from '@/object-record/record-index/utils/getNonReadableViewFieldSubTitle';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import {
  AnimatedPlaceholder,
  AnimatedPlaceholderEmptyContainer,
  AnimatedPlaceholderEmptySubTitle,
  AnimatedPlaceholderEmptyTextContainer,
  AnimatedPlaceholderEmptyTitle,
} from 'twenty-ui/feedback';

const StyledEmptyPlaceholderOuterContainer = styled.div`
  height: 100%;
  width: 100%;
`;

type RecordIndexEmptyStateNotSharedProps = {
  nonReadableViewFieldInfo?: NonReadableViewFieldInfo;
};

export const RecordIndexEmptyStateNotShared = ({
  nonReadableViewFieldInfo,
}: RecordIndexEmptyStateNotSharedProps) => {
  return (
    <StyledEmptyPlaceholderOuterContainer>
      <AnimatedPlaceholderEmptyContainer>
        <AnimatedPlaceholder type="notShared" />
        <AnimatedPlaceholderEmptyTextContainer>
          <AnimatedPlaceholderEmptyTitle>
            {isDefined(nonReadableViewFieldInfo)
              ? t`View not available`
              : t`Not part of your access`}
          </AnimatedPlaceholderEmptyTitle>
          <AnimatedPlaceholderEmptySubTitle>
            {isDefined(nonReadableViewFieldInfo)
              ? getNonReadableViewFieldSubTitle(nonReadableViewFieldInfo)
              : t`Your role does not include this. Ask whoever set up your access if you need it.`}
          </AnimatedPlaceholderEmptySubTitle>
        </AnimatedPlaceholderEmptyTextContainer>
      </AnimatedPlaceholderEmptyContainer>
    </StyledEmptyPlaceholderOuterContainer>
  );
};
