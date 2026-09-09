const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomBytes } = require('node:crypto');
const { request } = require('playwright');

const origin = 'https://pe-saas-0910-app:3047';
const tokenSelection =
  'tokens { accessOrWorkspaceAgnosticToken { token } refreshToken { token } }';
const clients = [];

async function gql(
  client,
  query,
  variables = {},
  auth = {},
  path = '/metadata',
  allowErrors = false,
) {
  const response = await client.post(path, {
    headers: { origin, ...auth },
    data: { query, variables },
    timeout: 120000,
  });
  const body = await response.json();
  if (!allowErrors)
    assert.ok(!body.errors, JSON.stringify(body.errors?.map((e) => e.message)));
  return body;
}

async function owner(letter) {
  const client = await request.newContext({
    baseURL: origin,
    ignoreHTTPSErrors: true,
  });
  clients.push(client);
  const path = `/test-state/owner-${letter}.json`;
  const fixture = fs.existsSync(path)
    ? JSON.parse(fs.readFileSync(path, 'utf8'))
    : {
        email: `stage-owner-${letter}@example.invalid`,
        password: `Stage-${randomBytes(12).toString('hex')}!3`,
      };
  const save = () =>
    fs.writeFileSync(path, JSON.stringify(fixture), { mode: 0o600 });
  save();
  const exists = await gql(
    client,
    'query($email: String!) { checkUserExists(email: $email) { exists } }',
    { email: fixture.email },
  );
  const operation = exists.data.checkUserExists.exists ? 'signIn' : 'signUp';
  const signedIn = await gql(
    client,
    `mutation($email: String!, $password: String!) {
    ${operation}(email: $email, password: $password) { ${tokenSelection}
      availableWorkspaces { availableWorkspacesForSignIn { id displayName loginToken } }
    }
  }`,
    { email: fixture.email, password: fixture.password },
  );
  const result = signedIn.data[operation];
  const userAuth = {
    authorization: `Bearer ${result.tokens.accessOrWorkspaceAgnosticToken.token}`,
  };
  let loginToken;
  if (fixture.workspaceId) {
    loginToken = result.availableWorkspaces.availableWorkspacesForSignIn.find(
      (w) => w.id === fixture.workspaceId,
    )?.loginToken;
    assert.ok(
      loginToken,
      'Existing fixture membership must still be available',
    );
  } else {
    const start = performance.now();
    const created = await gql(
      client,
      `mutation($input: SignUpInNewWorkspaceInput) {
      signUpInNewWorkspace(input: $input) { workspace { id } loginToken { token } }
    }`,
      { input: { displayName: `Acceptance CRM ${letter.toUpperCase()}` } },
      userAuth,
    );
    fixture.workspaceId = created.data.signUpInNewWorkspace.workspace.id;
    loginToken = created.data.signUpInNewWorkspace.loginToken.token;
    fixture.creationMs = Math.round(performance.now() - start);
    save();
  }
  const login = await gql(
    client,
    `mutation($loginToken: String!, $origin: String!) {
    getAuthTokensFromLoginToken(loginToken: $loginToken, origin: $origin) { ${tokenSelection} }
  }`,
    { loginToken, origin },
  );
  const token =
    login.data.getAuthTokensFromLoginToken.tokens.accessOrWorkspaceAgnosticToken
      .token;
  const auth = {
    authorization: `Bearer ${token}`,
    'x-workspace-id': fixture.workspaceId,
  };
  const started = performance.now();
  const activated = await gql(
    client,
    'mutation { activateWorkspace(data: {}) { id activationStatus } }',
    {},
    auth,
  );
  assert.equal(activated.data.activateWorkspace.id, fixture.workspaceId);
  console.log(
    `PASS owner ${letter}: recorded creation ${fixture.creationMs} ms; this activation ${Math.round(performance.now() - started)} ms; ${activated.data.activateWorkspace.activationStatus}`,
  );
  return { client, auth, fixture };
}

async function verifyAccounts() {
  try {
    assert.ok(
      !process.argv[2] || ['c', 'd'].includes(process.argv[2]),
      'Only the optional c or d fixture is supported',
    );
    const a = await owner(process.argv[2] ?? 'a');
    const b = await owner('b');
    assert.notEqual(a.fixture.workspaceId, b.fixture.workspaceId);
    for (const current of [a, b]) {
      if (!current.fixture.personId) {
        const created = await gql(
          current.client,
          `mutation($name: String!) {
          createPerson(data: { name: { firstName: $name, lastName: "Private" } }) { id }
        }`,
          { name: current.fixture.email },
          current.auth,
          '/graphql',
        );
        current.fixture.personId = created.data.createPerson.id;
        const letter = current.fixture.email.match(/stage-owner-([abcd])@/)[1];
        fs.writeFileSync(
          `/test-state/owner-${letter}.json`,
          JSON.stringify(current.fixture),
          { mode: 0o600 },
        );
      }
    }
    for (const [current, other] of [
      [a, b],
      [b, a],
    ]) {
      const own = await gql(
        current.client,
        'query { currentWorkspace { id displayName } }',
        {},
        current.auth,
      );
      assert.equal(own.data.currentWorkspace.id, current.fixture.workspaceId);
      const denied = await gql(
        current.client,
        'query { currentWorkspace { id displayName } }',
        {},
        {
          ...current.auth,
          'x-workspace-id': other.fixture.workspaceId,
        },
        '/metadata',
        true,
      );
      assert.ok(denied.errors?.length, 'Foreign account selection must fail');
      assert.ok(
        !denied.data?.currentWorkspace,
        'No foreign account may be returned',
      );
      const query =
        'query($id: UUID!) { people(filter: { id: { eq: $id } }) { edges { node { id } } } }';
      const ownRecord = await gql(
        current.client,
        query,
        { id: current.fixture.personId },
        current.auth,
        '/graphql',
      );
      assert.equal(
        ownRecord.data.people.edges[0]?.node.id,
        current.fixture.personId,
      );
      const foreignRecord = await gql(
        current.client,
        query,
        { id: other.fixture.personId },
        current.auth,
        '/graphql',
      );
      assert.equal(
        foreignRecord.data.people.edges.length,
        0,
        'Another account record must not be returned',
      );
    }
    console.log(
      'PASS two owners: separate accounts, valid own-account access, foreign selection denied both ways',
    );
    console.log(
      'PASS contacts: each owner creates and reads their own contact; foreign record IDs return no data',
    );

    const anonymous = await request.newContext({
      baseURL: origin,
      ignoreHTTPSErrors: true,
    });
    clients.push(anonymous);
    const fileBody = `Private attachment for ${a.fixture.email}\n`;
    if (!a.fixture.attachmentId) {
      const metadata = await gql(
        a.client,
        'query { objects(paging: { first: 100 }) { edges { node { id nameSingular } } } }',
        {},
        a.auth,
      );
      const objectId = metadata.data.objects.edges.find(
        ({ node }) => node.nameSingular === 'attachment',
      )?.node.id;
      assert.ok(objectId, 'Native attachment object must exist');
      const fields = await gql(
        a.client,
        'query($id: UUID!) { object(id: $id) { fields(paging: { first: 100 }) { edges { node { id name } } } } }',
        { id: objectId },
        a.auth,
      );
      const fieldId = fields.data.object.fields.edges.find(
        ({ node }) => node.name === 'file',
      )?.node.id;
      assert.ok(fieldId, 'Native attachment file field must exist');
      const targetResult = await gql(
        a.client,
        `mutation($size: Float!, $field: String!) {
        createFileUpload(filename: "private-proof.txt", size: $size, fileFolder: FilesField, fieldMetadataId: $field) {
          fileId uploadUrl contentType
        }
      }`,
        { size: Buffer.byteLength(fileBody), field: fieldId },
        a.auth,
      );
      const target = targetResult.data.createFileUpload;
      const uploaded = await anonymous.put(target.uploadUrl, {
        headers: { 'content-type': target.contentType },
        data: Buffer.from(fileBody),
      });
      assert.equal(
        uploaded.status(),
        204,
        'Native direct upload must accept the declared bytes',
      );
      await gql(
        a.client,
        'mutation($id: String!) { completeFileUpload(fileId: $id) { id } }',
        { id: target.fileId },
        a.auth,
      );
      const attached = await gql(
        a.client,
        `mutation {
        createAttachment(data: {
          targetPersonId: ${JSON.stringify(a.fixture.personId)},
          file: [{ fileId: ${JSON.stringify(target.fileId)}, label: "private-proof.txt" }]
        }) { id }
      }`,
        {},
        a.auth,
        '/graphql',
      );
      a.fixture.attachmentId = attached.data.createAttachment.id;
      const letter = a.fixture.email.match(/stage-owner-([abcd])@/)[1];
      fs.writeFileSync(
        `/test-state/owner-${letter}.json`,
        JSON.stringify(a.fixture),
        { mode: 0o600 },
      );
    }
    const attachmentQuery =
      'query($id: UUID!) { attachments(filter: { id: { eq: $id } }) { edges { node { id file { url } } } } }';
    const attachment = await gql(
      a.client,
      attachmentQuery,
      { id: a.fixture.attachmentId },
      a.auth,
      '/graphql',
    );
    const fileUrl = attachment.data.attachments.edges[0]?.node.file[0]?.url;
    assert.ok(fileUrl, 'Attached file must have a signed download URL');
    const ownDownload = await a.client.get(fileUrl, { maxRedirects: 0 });
    assert.equal(
      ownDownload.status(),
      200,
      'Account cookie alone must authenticate a native download',
    );
    assert.equal(
      await ownDownload.text(),
      fileBody,
      'Stored attachment bytes must match',
    );
    assert.equal(ownDownload.headers()['cache-control'], 'private, no-store');
    assert.ok(
      !ownDownload.headers().location,
      'Private files must not redirect to storage',
    );
    for (const client of [anonymous, b.client]) {
      const denied = await client.get(fileUrl, { maxRedirects: 0 });
      assert.equal(
        denied.status(),
        403,
        'Anonymous and other-account downloads must be denied',
      );
    }
    const foreignAttachment = await gql(
      b.client,
      attachmentQuery,
      { id: a.fixture.attachmentId },
      b.auth,
      '/graphql',
    );
    assert.equal(foreignAttachment.data.attachments.edges.length, 0);
    console.log(
      'PASS attached files: native upload and record attachment; cookie download with no redirect/cache; anonymous and foreign-account denial',
    );
  } finally {
    await Promise.all(clients.map((client) => client.dispose()));
  }
}

module.exports = { clients, gql, origin, owner, tokenSelection };

if (require.main === module) {
  verifyAccounts().catch((error) => {
    console.error(error.message.split('\n')[0]);
    process.exitCode = 1;
  });
}
