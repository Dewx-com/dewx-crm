// Runs against the private synthetic database, rolling back every probe row.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { DataSource, EntitySchema } = require('typeorm');
const {
  UpgradeMigrationService,
} = require('../../packages/twenty-server/dist/engine/core-modules/upgrade/services/upgrade-migration.service');

(async () => {
  const url = new URL(process.env.PG_DATABASE_URL);
  assert.equal(url.hostname, 'pe-saas-0910-db');
  assert.equal(url.pathname, '/pe_stage');
  const schema = new EntitySchema({
    name: 'UpgradeMigrationAcceptance',
    tableName: 'upgradeMigration',
    schema: 'core',
    columns: {
      id: { type: 'uuid', primary: true },
      name: { type: String },
      status: { type: String },
      attempt: { type: Number },
      workspaceId: { type: 'uuid', nullable: true },
      isInitial: { type: Boolean },
      executedByVersion: { type: String },
    },
  });
  const dataSource = new DataSource({
    type: 'postgres',
    url: url.toString(),
    entities: [schema],
    extra: { max: 1 },
  });
  await dataSource.initialize();
  const runner = dataSource.createQueryRunner();
  try {
    await runner.connect();
    await runner.startTransaction();
    const accounts = await runner.query(
      'SELECT id FROM core.workspace ORDER BY id LIMIT 2',
    );
    assert.equal(accounts.length, 2);
    const ids = accounts.map(({ id }) => id);
    const repository = runner.manager.getRepository(schema);
    const service = new UpgradeMigrationService(repository);
    const prefix = `acceptance-${randomUUID()}`;
    const required = `${prefix}-required`;
    const later = `${prefix}-later`;
    const check = () =>
      service.areAllWorkspacesAtCommand({
        commandName: required,
        workspaceIds: ids,
        initialCommandNamesAtOrAfter: [required, later],
      });
    const add = (workspaceId, name, overrides = {}) =>
      repository.insert({
        id: randomUUID(),
        workspaceId,
        name,
        status: 'completed',
        attempt: 1,
        isInitial: false,
        executedByVersion: 'acceptance',
        ...overrides,
      });
    assert.equal(await check(), false);
    await add(ids[0], required);
    await add(ids[1], `${prefix}-older`, { isInitial: true });
    assert.equal(
      await check(),
      false,
      'Earlier initialization is insufficient',
    );
    await add(ids[1], later);
    assert.equal(
      await check(),
      false,
      'Later execution does not prove initialization',
    );
    await repository.delete({ workspaceId: ids[1], name: later });
    await add(ids[1], later, { isInitial: true });
    assert.equal(
      await check(),
      true,
      'Fresh account initialized beyond the required command is ready',
    );
    await add(ids[0], later, { isInitial: true });
    assert.equal(await check(), true, 'Each account is counted once');
    await add(ids[1], later, { attempt: 2, status: 'failed' });
    assert.equal(
      await check(),
      false,
      'A later failed attempt must not be hidden',
    );
    await add(ids[1], required);
    assert.equal(
      await check(),
      true,
      'Actual required command completion is sufficient',
    );
    await add(ids[1], required, { attempt: 2, status: 'failed' });
    assert.equal(
      await check(),
      false,
      'Latest failed required attempt is refused',
    );
    console.log(
      'PASS upgrade prerequisite: exact completion or newer initialization; duplicates, older state and failed attempts handled',
    );
  } finally {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.release();
    await dataSource.destroy();
  }
})().catch((error) => {
  console.error(error.message.split('\n')[0]);
  process.exitCode = 1;
});
