const assert = require('node:assert/strict');
const { clients, gql, owner } = require('./verify-staging-accounts.cjs');

(async () => {
  try {
    const account = await owner('a');
    const before = await gql(
      account.client,
      'query { dpaAgreements { id } dpaPreview { notice } }',
      {},
      account.auth,
      '/graphql',
    );
    assert.match(before.data.dpaPreview.notice, /NOT A VALID AGREEMENT/);
    const result = await gql(
      account.client,
      `mutation {
      generateSignedDpa(input: {
        customerLegalEntityName: "Synthetic CRM",
        signatoryName: "Synthetic Owner",
        signatoryTitle: "Owner"
      }) { agreement { id } }
    }`,
      {},
      account.auth,
      '/graphql',
      true,
    );
    assert.ok(
      result.errors?.some((error) =>
        error.message.includes('not available for self-hosted'),
      ),
    );
    assert.ok(
      !result.data?.generateSignedDpa,
      'Shared-host CRM must not execute a Twenty agreement',
    );
    const after = await gql(
      account.client,
      'query { dpaAgreements { id } }',
      {},
      account.auth,
      '/graphql',
    );
    assert.deepEqual(
      after.data.dpaAgreements,
      before.data.dpaAgreements,
      'Existing agreement records must be preserved without adding a false signed record',
    );
    console.log(
      'PASS shared-host agreement policy: reference-only notice, Twenty signing denied and existing records unchanged',
    );
  } finally {
    await Promise.all(clients.map((client) => client.dispose()));
  }
})().catch((error) => {
  console.error(error.message.split('\n')[0]);
  process.exitCode = 1;
});
