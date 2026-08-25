import { useObjectLabel } from '@/object-metadata/hooks/useObjectLabel';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { RecordTableEmptyStateDisplay } from '@/object-record/record-table/empty-state/components/RecordTableEmptyStateDisplay';
import { t } from '@lingui/core/macro';
import { IconPlus } from 'twenty-ui/icon';

export const RecordTableEmptyStateReadOnly = () => {
  const { objectMetadataItem } = useRecordTableContextOrThrow();

  const objectLabelSingular = useObjectLabel(objectMetadataItem);

  const buttonTitle = `Add a ${objectLabelSingular}`;

  return (
    <RecordTableEmptyStateDisplay
      title={t`Nothing here yet`}
      subTitle={t`This list is read-only for you and there is nothing in it. If you expected rows here, ask whoever set up your access.`}
      animatedPlaceholderType="noRecord"
      buttonTitle={buttonTitle}
      ButtonIcon={IconPlus}
      buttonIsDisabled={true}
    />
  );
};
