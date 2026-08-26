import { type Repository } from 'typeorm';

import {
  KeyValuePairEntity,
  KeyValuePairType,
} from 'src/engine/core-modules/key-value-pair/key-value-pair.entity';
import { buildMillisecondRecordVersionCondition } from 'src/modules/team-workspace/commands/utils/build-millisecond-record-version-condition.util';

import { getCoreRepository } from 'test/integration/utils/get-core-repository.util';

const ROW_ID = 'eb433afc-ca2a-456b-892a-f59e9c42e83a';
const ROW_KEY = 'team-workspace-command-record-version-integration';
const PUBLIC_VERSION = '2026-08-26T09:00:00.000Z';

describe('team workspace command record-version condition (integration)', () => {
  let repository: Repository<KeyValuePairEntity>;

  const seedRecord = async (updatedAt: string): Promise<void> => {
    await global.testDataSource.query(
      `DELETE FROM "core"."keyValuePair" WHERE "id" = $1`,
      [ROW_ID],
    );
    await global.testDataSource.query(
      `INSERT INTO "core"."keyValuePair"
        ("id", "key", "type", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz)`,
      [
        ROW_ID,
        ROW_KEY,
        KeyValuePairType.USER_VARIABLE,
        PUBLIC_VERSION,
        updatedAt,
      ],
    );
  };

  beforeAll(() => {
    repository = getCoreRepository(KeyValuePairEntity);
  });

  afterAll(async () => {
    await global.testDataSource.query(
      `DELETE FROM "core"."keyValuePair" WHERE "id" = $1`,
      [ROW_ID],
    );
  });

  it('matches a PostgreSQL timestamp inside the public millisecond', async () => {
    await seedRecord('2026-08-26T09:00:00.000789Z');

    const result = await repository.update(
      {
        id: ROW_ID,
        type: KeyValuePairType.USER_VARIABLE,
        updatedAt: buildMillisecondRecordVersionCondition<Date>(PUBLIC_VERSION),
      },
      { textValueDeprecated: 'matched' },
    );

    expect(result.affected).toBe(1);
  });

  it('excludes the first timestamp in the next millisecond', async () => {
    await seedRecord('2026-08-26T09:00:00.001000Z');

    const result = await repository.update(
      {
        id: ROW_ID,
        type: KeyValuePairType.USER_VARIABLE,
        updatedAt: buildMillisecondRecordVersionCondition<Date>(PUBLIC_VERSION),
      },
      { textValueDeprecated: 'must-not-write' },
    );

    expect(result.affected).toBe(0);

    const record = await repository.findOneByOrFail({ id: ROW_ID });

    expect(record.textValueDeprecated).toBeNull();
  });
});
