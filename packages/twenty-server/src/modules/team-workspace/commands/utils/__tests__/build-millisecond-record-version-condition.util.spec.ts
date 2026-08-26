import { buildMillisecondRecordVersionCondition } from 'src/modules/team-workspace/commands/utils/build-millisecond-record-version-condition.util';

describe('buildMillisecondRecordVersionCondition', () => {
  it('builds a bound half-open PostgreSQL millisecond range', () => {
    const condition = buildMillisecondRecordVersionCondition(
      '2026-08-26T09:00:00.000789Z',
    );

    expect(condition.type).toBe('raw');
    expect(condition.getSql?.('"task"."updatedAt"')).toBe(
      '"task"."updatedAt" >= :teamWorkspaceRecordVersionStart::timestamptz AND "task"."updatedAt" < :teamWorkspaceRecordVersionEnd::timestamptz',
    );
    expect(condition.objectLiteralParameters).toEqual({
      teamWorkspaceRecordVersionStart: '2026-08-26T09:00:00.000Z',
      teamWorkspaceRecordVersionEnd: '2026-08-26T09:00:00.001Z',
    });
  });

  it('rejects an invalid record version', () => {
    expect(() =>
      buildMillisecondRecordVersionCondition('not-a-timestamp'),
    ).toThrow('Invalid record version');
  });
});
