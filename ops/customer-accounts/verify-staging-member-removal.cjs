const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomBytes, randomUUID } = require('node:crypto');
const https = require('node:https');
const { setTimeout: delay } = require('node:timers/promises');
const { request } = require('playwright');
const {
  clients,
  gql,
  origin,
  owner,
  tokenSelection,
} = require('./verify-staging-accounts.cjs');
const streams = [];

async function waitFor(predicate, description, timeout = 45000) {
  const deadline = Date.now() + timeout;
  while (!predicate() && Date.now() < deadline) await delay(100);
  assert.ok(predicate(), description);
}

async function openStream(auth) {
  const stream = {
    frames: [],
    ended: false,
    error: undefined,
    status: undefined,
  };
  const eventStreamId = randomUUID();
  const req = https.request(
    `${origin}/metadata`,
    {
      method: 'POST',
      rejectUnauthorized: false, // Fixed private synthetic HTTPS origin only.
      headers: {
        origin,
        ...auth,
        accept: 'text/event-stream',
        'content-type': 'application/json',
      },
    },
    (response) => {
      stream.status = response.statusCode;
      response.setEncoding('utf8');
      let pending = '';
      response.on('data', (chunk) => {
        pending += chunk.replaceAll('\r\n', '\n');
        let boundary;
        while ((boundary = pending.indexOf('\n\n')) !== -1) {
          const frame = pending.slice(0, boundary);
          pending = pending.slice(boundary + 2);
          if (frame.startsWith('event: next')) {
            try {
              stream.frames.push(
                JSON.parse(
                  frame
                    .split('\n')
                    .find((line) => line.startsWith('data:'))
                    .slice(5),
                ),
              );
            } catch {
              stream.error = 'Invalid SSE frame';
            }
          }
          if (frame.startsWith('event: complete')) stream.ended = true;
        }
      });
      response.on('end', () => {
        stream.ended = true;
      });
      response.on('error', () => {
        stream.error = 'SSE response failed';
      });
    },
  );
  req.on('error', () => {
    stream.error = 'SSE request failed';
  });
  stream.close = () => req.destroy();
  streams.push(stream);
  req.end(
    JSON.stringify({
      query:
        'subscription($id: String!) { onEventSubscription(eventStreamId: $id) { eventStreamId } }',
      variables: { id: eventStreamId },
    }),
  );
  await waitFor(
    () => stream.frames.length || stream.error || stream.ended,
    'SSE must deliver its initial event',
  );
  assert.equal(stream.status, 200);
  assert.equal(stream.error, undefined);
  assert.equal(
    stream.frames[0]?.data?.onEventSubscription?.eventStreamId,
    eventStreamId,
  );
  return stream;
}

(async () => {
  try {
    const a = await owner('a');
    const b = await owner('b');
    const path = '/test-state/shared-member.json';
    const fixture = fs.existsSync(path)
      ? JSON.parse(fs.readFileSync(path, 'utf8'))
      : {
          email: 'stage-shared-member@example.invalid',
          password: `Stage-${randomBytes(12).toString('hex')}!3`,
        };
    fs.writeFileSync(path, JSON.stringify(fixture), { mode: 0o600 });
    // One browser-equivalent cookie jar retains both account sessions.
    const member = await request.newContext({
      baseURL: origin,
      ignoreHTTPSErrors: true,
    });
    clients.push(member);
    const sessions = [];
    for (const account of [a, b]) {
      const workspace = await gql(
        account.client,
        'query { currentWorkspace { id inviteHash } }',
        {},
        account.auth,
      );
      assert.ok(
        workspace.data.currentWorkspace.inviteHash,
        'Synthetic account must have a native invite link',
      );
      const joined = await gql(
        member,
        `mutation($email: String!, $password: String!, $workspace: UUID!, $hash: String!) {
        signUpInWorkspace(email: $email, password: $password, workspaceId: $workspace, workspaceInviteHash: $hash) {
          loginToken { token } workspace { id }
        }
      }`,
        {
          ...fixture,
          workspace: account.fixture.workspaceId,
          hash: workspace.data.currentWorkspace.inviteHash,
        },
      );
      assert.equal(
        joined.data.signUpInWorkspace.workspace.id,
        account.fixture.workspaceId,
      );
      console.log(
        `PASS member joined account ${sessions.length === 0 ? 'A' : 'B'}`,
      );
      const login = await gql(
        member,
        `mutation($loginToken: String!, $origin: String!) {
        getAuthTokensFromLoginToken(loginToken: $loginToken, origin: $origin) { ${tokenSelection} }
      }`,
        { loginToken: joined.data.signUpInWorkspace.loginToken.token, origin },
      );
      sessions.push({
        authorization: `Bearer ${login.data.getAuthTokensFromLoginToken.tokens.accessOrWorkspaceAgnosticToken.token}`,
        'x-workspace-id': account.fixture.workspaceId,
      });
      console.log(
        `PASS member login token exchanged for account ${sessions.length === 1 ? 'A' : 'B'}`,
      );
    }

    const peopleQuery =
      'query($id: UUID!) { people(filter: { id: { eq: $id } }) { edges { node { id } } } }';
    for (const [index, account] of [a, b].entries()) {
      const own = await gql(
        member,
        peopleQuery,
        { id: account.fixture.personId },
        sessions[index],
        '/graphql',
      );
      assert.equal(own.data.people.edges[0]?.node.id, account.fixture.personId);
      console.log(
        `PASS member Bearer contact access in account ${index === 0 ? 'A' : 'B'}`,
      );
      const cookie = await gql(
        member,
        'query { currentWorkspace { id } }',
        {},
        { 'x-workspace-id': account.fixture.workspaceId },
      );
      assert.equal(
        cookie.data.currentWorkspace.id,
        account.fixture.workspaceId,
      );
    }
    const attachment = await gql(
      member,
      'query($id: UUID!) { attachments(filter: { id: { eq: $id } }) { edges { node { file { url } } } } }',
      { id: a.fixture.attachmentId },
      sessions[0],
      '/graphql',
    );
    const fileUrl = attachment.data.attachments.edges[0]?.node.file[0]?.url;
    assert.ok(
      fileUrl,
      'Account A must already have the private attachment fixture',
    );
    assert.equal((await member.get(fileUrl)).status(), 200);
    console.log(
      'PASS shared member: two account sessions in one cookie jar; own contacts and private attachment accessible',
    );
    const streamA = await openStream(sessions[0]);
    const streamB = await openStream(sessions[1]);

    const members = await gql(
      a.client,
      'query($email: String!) { workspaceMembers(filter: { userEmail: { eq: $email } }) { edges { node { id } } } }',
      { email: fixture.email },
      a.auth,
      '/graphql',
    );
    const memberId = members.data.workspaceMembers.edges[0]?.node.id;
    assert.ok(memberId, 'Invited member must exist in account A');
    await gql(
      a.client,
      'mutation($id: String!) { deleteUserFromWorkspace(workspaceMemberIdToDelete: $id) { id } }',
      { id: memberId },
      a.auth,
    );
    const framesAAtRemoval = streamA.frames.length;
    const framesBAtRemoval = streamB.frames.length;

    for (const auth of [
      sessions[0],
      { 'x-workspace-id': a.fixture.workspaceId },
    ]) {
      for (const [query, variables, endpoint, field] of [
        [
          'query { currentWorkspace { id } }',
          {},
          '/metadata',
          'currentWorkspace',
        ],
        [peopleQuery, { id: a.fixture.personId }, '/graphql', 'people'],
      ]) {
        const denied = await gql(
          member,
          query,
          variables,
          auth,
          endpoint,
          true,
        );
        assert.ok(
          denied.errors?.length,
          'Removed member must lose account and record access',
        );
        assert.ok(
          !denied.data?.[field],
          'Removed member must receive no private data',
        );
      }
    }
    assert.equal(
      (await member.get(fileUrl, { maxRedirects: 0 })).status(),
      403,
      'Previously issued private URL and stale cookie must fail after removal',
    );
    for (const auth of [
      sessions[1],
      { 'x-workspace-id': b.fixture.workspaceId },
    ]) {
      const retained = await gql(
        member,
        peopleQuery,
        { id: b.fixture.personId },
        auth,
        '/graphql',
      );
      assert.equal(retained.data.people.edges[0]?.node.id, b.fixture.personId);
    }
    console.log(
      'PASS removal: stale account A Bearer/cookie and signed private download denied; account B remains usable',
    );
    await waitFor(
      () => streamA.ended && streamB.frames.length > framesBAtRemoval,
      'Removed account SSE must complete while the retained account receives its next heartbeat',
    );
    assert.equal(
      streamA.frames.length,
      framesAAtRemoval,
      'No further event may reach the removed member',
    );
    assert.equal(streamA.error, undefined);
    assert.equal(streamB.error, undefined);
    assert.equal(streamB.ended, false);
    assert.ok(
      streamB.frames.every(
        (frame) => !frame.errors && frame.data?.onEventSubscription,
      ),
    );
    console.log(
      'PASS live SSE: account A closes before its next heartbeat; account B continues delivering',
    );
  } finally {
    streams.forEach((stream) => stream.close());
    await Promise.all(clients.map((client) => client.dispose()));
  }
})().catch((error) => {
  console.error(error.message.split('\n')[0]);
  process.exitCode = 1;
});
