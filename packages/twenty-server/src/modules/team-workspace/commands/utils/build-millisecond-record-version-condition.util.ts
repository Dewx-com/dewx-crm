import { type FindOperator, Raw } from 'typeorm';

const RECORD_VERSION_START_PARAMETER = 'teamWorkspaceRecordVersionStart';
const RECORD_VERSION_END_PARAMETER = 'teamWorkspaceRecordVersionEnd';

export const buildMillisecondRecordVersionCondition = <
  Timestamp extends Date | string = string,
>(
  version: string,
): FindOperator<Timestamp> => {
  const versionDate = new Date(version);

  if (Number.isNaN(versionDate.getTime())) {
    throw new TypeError(`Invalid record version: ${version}`);
  }

  const start = versionDate.toISOString();
  const end = new Date(versionDate.getTime() + 1).toISOString();

  return Raw(
    (alias) =>
      `${alias} >= :${RECORD_VERSION_START_PARAMETER}::timestamptz AND ${alias} < :${RECORD_VERSION_END_PARAMETER}::timestamptz`,
    {
      [RECORD_VERSION_START_PARAMETER]: start,
      [RECORD_VERSION_END_PARAMETER]: end,
    },
  );
};
