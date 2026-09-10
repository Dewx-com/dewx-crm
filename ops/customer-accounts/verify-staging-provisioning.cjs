const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomBytes, randomUUID } = require('node:crypto');
const { request } = require('playwright');
const {
  clients,
  gql,
  origin,
  owner,
  tokenSelection,
} = require('./verify-staging-accounts.cjs');

(async () => {
  try {
    // The fifth and final account allowed by the unchanged instance license gate.
    const path = '/test-state/owner-e.json';
    const fixture = fs.existsSync(path)
      ? JSON.parse(fs.readFileSync(path, 'utf8'))
      : {
          email: 'stage-owner-e@example.invalid',
          password: `Stage-${randomBytes(12).toString('hex')}!3`,
          requestId: randomUUID(),
        };
    fs.writeFileSync(path, JSON.stringify(fixture), { mode: 0o600 });
    const client = await request.newContext({
      baseURL: origin,
      ignoreHTTPSErrors: true,
    });
    clients.push(client);
    const exists = await gql(
      client,
      'query($email: String!) { checkUserExists(email:$email) { exists } }',
      { email: fixture.email },
    );
    const operation = exists.data.checkUserExists.exists ? 'signIn' : 'signUp';
    const signed = await gql(
      client,
      `mutation($email:String!,$password:String!) { ${operation}(email:$email,password:$password) { ${tokenSelection} } }`,
      fixture,
    );
    const auth = {
      authorization: `Bearer ${signed.data[operation].tokens.accessOrWorkspaceAgnosticToken.token}`,
    };
    const query =
      'mutation($input: SignUpInNewWorkspaceInput) { signUpInNewWorkspace(input:$input) { workspace { id } } }';
    const input = {
      displayName: 'Acceptance CRM E',
      requestId: fixture.requestId,
    };
    const started = performance.now();
    const [first, retry] = await Promise.all([
      gql(client, query, { input }, auth),
      gql(client, query, { input }, auth),
    ]);
    const workspaceId = first.data.signUpInNewWorkspace.workspace.id;
    assert.equal(retry.data.signUpInNewWorkspace.workspace.id, workspaceId);
    if (fixture.workspaceId) assert.equal(workspaceId, fixture.workspaceId);
    else fixture.creationMs = Math.round(performance.now() - started);
    fixture.workspaceId = workspaceId;
    fs.writeFileSync(path, JSON.stringify(fixture), { mode: 0o600 });
    console.log('PASS concurrent account setup requests return one account');

    const mismatch = await gql(
      client,
      query,
      { input: { ...input, displayName: 'Changed request' } },
      auth,
      '/metadata',
      true,
    );
    assert.ok(
      mismatch.errors?.some((error) =>
        error.message.includes('already used with different details'),
      ),
    );
    const overCapacity = await gql(
      client,
      query,
      { input: { ...input, requestId: randomUUID() } },
      auth,
      '/metadata',
      true,
    );
    assert.ok(
      overCapacity.errors?.some((error) =>
        /workspace limit|enterprise key/i.test(error.message),
      ),
    );
    const replayAtCapacity = await gql(client, query, { input }, auth);
    assert.equal(
      replayAtCapacity.data.signUpInNewWorkspace.workspace.id,
      workspaceId,
    );
    console.log(
      'PASS changed payload refused; new account at capacity refused; committed request still replays',
    );

    const account = await owner('e');
    const workspace = await gql(
      account.client,
      'query { currentWorkspace { id allowImpersonation isPublicInviteLinkEnabled workspaceDiscoverability } }',
      {},
      account.auth,
    );
    assert.equal(workspace.data.currentWorkspace.allowImpersonation, false);
    assert.equal(
      workspace.data.currentWorkspace.isPublicInviteLinkEnabled,
      false,
    );
    assert.equal(
      workspace.data.currentWorkspace.workspaceDiscoverability,
      'MEMBERS_AND_INVITEES',
    );
    const agreements = await gql(
      account.client,
      'query { dpaAgreements { id } }',
      {},
      account.auth,
      '/graphql',
    );
    assert.equal(agreements.data.dpaAgreements.length, 0);
    if (!fixture.firstWriteVerified) {
      const empty = await gql(
        account.client,
        'query { people { edges { node { id } } } companies { edges { node { id } } } opportunities { edges { node { id } } } }',
        {},
        account.auth,
        '/graphql',
      );
      for (const object of ['people', 'companies', 'opportunities'])
        assert.equal(empty.data[object].edges.length, 0);
      console.log(
        'PASS fresh customer CRM contains no demonstration contacts, companies or deals',
      );
    }
    const created = await gql(
      account.client,
      'mutation { createPerson(data:{name:{firstName:"Synthetic",lastName:"Provisioned"}}) { id } }',
      {},
      account.auth,
      '/graphql',
    );
    assert.ok(created.data.createPerson.id);
    fixture.firstWriteVerified = true;
    fs.writeFileSync(path, JSON.stringify(fixture), { mode: 0o600 });
    console.log(
      'PASS fresh account activates and writes; private defaults enabled and no Twenty agreement fabricated',
    );

    const signedAgain = await gql(
      client,
      `mutation($email:String!,$password:String!) { signIn(email:$email,password:$password) { availableWorkspaces { availableWorkspacesForSignIn { id } } } }`,
      fixture,
    );
    assert.deepEqual(
      signedAgain.data.signIn.availableWorkspaces.availableWorkspacesForSignIn.map(
        (account) => account.id,
      ),
      [workspaceId],
    );
    console.log(
      'PASS owner has exactly one account after concurrent requests and retries',
    );
  } finally {
    await Promise.all(clients.map((client) => client.dispose()));
  }
})().catch((error) => {
  console.error(error.message.split('\n')[0]);
  process.exitCode = 1;
});
