const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const {
  clients,
  gql,
  origin,
  owner,
  tokenSelection,
} = require('./verify-staging-accounts.cjs');

(async () => {
  let lockClient;
  try {
    const db = new URL(process.env.PG_DATABASE_URL);
    assert.equal(db.hostname, 'pe-saas-0910-db');
    assert.equal(db.pathname, '/pe_stage');
    const e = await owner('e');
    const b = await owner('b');
    const eUser = (
      await gql(e.client, 'query { currentUser { id } }', {}, e.auth)
    ).data.currentUser.id;
    const bUser = (
      await gql(b.client, 'query { currentUser { id } }', {}, b.auth)
    ).data.currentUser.id;
    const workspaceId = e.fixture.workspaceId;
    const roles = (
      await gql(
        e.client,
        'query { getRoles { id label universalIdentifier } }',
        {},
        e.auth,
      )
    ).data.getRoles;
    const admin = roles.find(
      (role) =>
        role.universalIdentifier === '20202020-02c2-43f2-b94d-cab1f2b532eb',
    );
    const memberRole = roles.find((role) => role.label === 'Member');
    assert.ok(admin && memberRole);
    const signInB = async () =>
      (
        await gql(
          b.client,
          `mutation($email:String!,$password:String!) { signIn(email:$email,password:$password) {
        availableWorkspaces { availableWorkspacesForSignIn { id loginToken } availableWorkspacesForSignUp { id personalInviteToken } }
      } }`,
          b.fixture,
        )
      ).data.signIn.availableWorkspaces;
    let available = await signInB();
    let loginToken = available.availableWorkspacesForSignIn.find(
      (w) => w.id === workspaceId,
    )?.loginToken;
    if (!loginToken) {
      const sent = await gql(
        e.client,
        'mutation($emails:[String!]!,$role:UUID!) { sendInvitations(emails:$emails,roleId:$role) { success errors } }',
        { emails: [b.fixture.email], role: admin.id },
        e.auth,
      );
      assert.equal(sent.data.sendInvitations.success, true);
      available = await signInB();
      const invitation = available.availableWorkspacesForSignUp.find(
        (w) => w.id === workspaceId,
      );
      assert.ok(invitation?.personalInviteToken);
      const accepted = await gql(
        b.client,
        'mutation($email:String!,$password:String!,$workspace:UUID!,$invite:String!) { signUpInWorkspace(email:$email,password:$password,workspaceId:$workspace,workspacePersonalInviteToken:$invite) { loginToken { token } } }',
        {
          ...b.fixture,
          workspace: workspaceId,
          invite: invitation.personalInviteToken,
        },
      );
      loginToken = accepted.data.signUpInWorkspace.loginToken.token;
    }
    const login = await gql(
      b.client,
      `mutation($token:String!,$origin:String!) { getAuthTokensFromLoginToken(loginToken:$token,origin:$origin) { ${tokenSelection} } }`,
      { token: loginToken, origin },
    );
    const bInE = {
      authorization: `Bearer ${login.data.getAuthTokensFromLoginToken.tokens.accessOrWorkspaceAgnosticToken.token}`,
      'x-workspace-id': workspaceId,
    };
    const ownership = async () =>
      (
        await gql(
          e.client,
          'query { currentWorkspace { primaryOwnerUserId allowImpersonation } }',
          {},
          e.auth,
        )
      ).data.currentWorkspace;
    const transfer = (client, auth, next) =>
      gql(
        client,
        'mutation($next:UUID!) { transferWorkspaceOwnership(nextOwnerUserId:$next) { id primaryOwnerUserId } }',
        { next },
        auth,
      );
    // Recover only this known, reversible synthetic transfer from an interrupted run.
    if ((await ownership()).primaryOwnerUserId === bUser)
      await transfer(b.client, bInE, eUser);
    assert.equal((await ownership()).primaryOwnerUserId, eUser);
    console.log(
      'PASS creator ownership recorded; administrator joins using a private invitation',
    );

    const denied = async (client, auth, query, variables = {}) => {
      const result = await gql(
        client,
        query,
        variables,
        auth,
        '/metadata',
        true,
      );
      assert.ok(
        result.errors?.some((error) =>
          /owner|administrator|being updated|permission|impersonation not allowed/i.test(
            error.message,
          ),
        ),
        JSON.stringify(result.errors?.map((error) => error.message)),
      );
      assert.ok(
        !result.errors.some(
          (error) => error.extensions?.code === 'GRAPHQL_VALIDATION_FAILED',
        ),
      );
    };
    const transferQuery =
      'mutation($next:UUID!) { transferWorkspaceOwnership(nextOwnerUserId:$next) { id } }';
    await denied(b.client, bInE, transferQuery, { next: bUser });
    await denied(
      b.client,
      bInE,
      'mutation($user:UUID!,$workspace:UUID!) { impersonate(userId:$user,workspaceId:$workspace) { loginToken { token } } }',
      { user: eUser, workspace: workspaceId },
    );
    await denied(b.client, bInE, 'mutation { deleteCurrentWorkspace { id } }');
    await denied(
      b.client,
      bInE,
      'mutation { updateWorkspace(data:{allowImpersonation:true}) { id } }',
    );
    assert.equal((await ownership()).allowImpersonation, false);
    await denied(e.client, e.auth, transferQuery, { next: randomUUID() });
    const members = (
      await gql(
        e.client,
        'query { workspaceMembers { edges { node { id userId } } } }',
        {},
        e.auth,
        '/graphql',
      )
    ).data.workspaceMembers.edges.map(({ node }) => node);
    const eMember = members.find((member) => member.userId === eUser);
    const bMember = members.find((member) => member.userId === bUser);
    assert.ok(eMember && bMember);
    await denied(
      b.client,
      bInE,
      'mutation($id:String!) { deleteUserFromWorkspace(workspaceMemberIdToDelete:$id) { id } }',
      { id: eMember.id },
    );
    await denied(
      b.client,
      bInE,
      'mutation($member:UUID!,$role:UUID!) { updateWorkspaceMemberRole(workspaceMemberId:$member,roleId:$role) { id } }',
      { member: eMember.id, role: memberRole.id },
    );
    console.log(
      'PASS administrator cannot take ownership, delete the CRM, enable support impersonation, remove or demote the owner',
    );

    const metadata = (
      await gql(
        e.client,
        'query { objects(paging:{first:1000}) { edges { node { id nameSingular fieldsList { id name } } } } }',
        {},
        e.auth,
      )
    ).data.objects.edges.map(({ node }) => node);
    const person = metadata.find((object) => object.nameSingular === 'person');
    const name = person?.fieldsList.find((field) => field.name === 'name');
    assert.ok(person && name);
    await denied(
      b.client,
      bInE,
      'mutation($input:UpsertObjectPermissionsInput!) { upsertObjectPermissions(upsertObjectPermissionsInput:$input) { id } }',
      {
        input: {
          roleId: admin.id,
          objectPermissions: [
            {
              objectMetadataId: person.id,
              canReadObjectRecords: false,
              canUpdateObjectRecords: false,
              canSoftDeleteObjectRecords: false,
              canDestroyObjectRecords: false,
            },
          ],
        },
      },
    );
    await denied(
      b.client,
      bInE,
      'mutation($input:UpsertFieldPermissionsInput!) { upsertFieldPermissions(upsertFieldPermissionsInput:$input) { id } }',
      {
        input: {
          roleId: admin.id,
          fieldPermissions: [
            {
              objectMetadataId: person.id,
              fieldMetadataId: name.id,
              canReadFieldValue: false,
              canUpdateFieldValue: false,
            },
          ],
        },
      },
    );
    await denied(
      b.client,
      bInE,
      'mutation($input:UpsertRoleRecordScopeInput!) { upsertRoleRecordScope(input:$input) { id } }',
      {
        input: {
          roleId: admin.id,
          objectMetadataId: person.id,
          fieldMetadataId: name.id,
          value: 'must-not-restrict-owner',
        },
      },
    );
    const readable = await gql(
      e.client,
      'query { people { edges { node { id name { firstName } } } } }',
      {},
      e.auth,
      '/graphql',
    );
    assert.ok(readable.data.people.edges.length > 0);
    console.log(
      'PASS object, field and record restrictions cannot reduce owner access; records remain readable',
    );

    // A permitted impersonation of an ordinary administrator must stop once
    // that person becomes the owner, including tokens issued before the transfer.
    const impersonated = await gql(
      e.client,
      'mutation($user:UUID!,$workspace:UUID!) { impersonate(userId:$user,workspaceId:$workspace) { loginToken { token } } }',
      { user: bUser, workspace: workspaceId },
      e.auth,
    );
    const impersonatedLogin = await gql(
      e.client,
      `mutation($token:String!,$origin:String!) { getAuthTokensFromLoginToken(loginToken:$token,origin:$origin) { ${tokenSelection} } }`,
      { token: impersonated.data.impersonate.loginToken.token, origin },
      e.auth,
    );
    const oldImpersonation = {
      authorization: `Bearer ${impersonatedLogin.data.getAuthTokensFromLoginToken.tokens.accessOrWorkspaceAgnosticToken.token}`,
      'x-workspace-id': workspaceId,
    };
    assert.equal(
      (
        await gql(
          e.client,
          'query { currentWorkspace { id } }',
          {},
          oldImpersonation,
        )
      ).data.currentWorkspace.id,
      workspaceId,
    );

    lockClient = new Client({ connectionString: db.toString() });
    await lockClient.connect();
    await lockClient.query('BEGIN');
    await lockClient.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      ['customer-account-access'],
    );
    await denied(e.client, e.auth, transferQuery, { next: bUser });
    assert.equal((await ownership()).primaryOwnerUserId, eUser);
    await lockClient.query('ROLLBACK');
    await lockClient.end();
    lockClient = undefined;
    await transfer(e.client, e.auth, bUser);
    assert.equal((await ownership()).primaryOwnerUserId, bUser);
    await denied(
      e.client,
      oldImpersonation,
      'query { currentWorkspace { id } }',
    );
    console.log(
      'PASS becoming the owner revokes an already-issued impersonation token',
    );
    await denied(e.client, e.auth, transferQuery, { next: eUser });
    await denied(b.client, bInE, 'mutation { deleteUser { id } }');
    const bStillAvailable = await gql(
      b.client,
      'query { currentWorkspace { id } }',
      {},
      b.auth,
    );
    assert.equal(
      bStillAvailable.data.currentWorkspace.id,
      b.fixture.workspaceId,
    );
    console.log(
      'PASS database lock prevents concurrent transfer; only the new owner controls handoff; user deletion preserves all accounts',
    );

    const body =
      'Work remains with the customer after ownership and membership changes.';
    const note = await gql(
      b.client,
      'mutation($title:String!,$body:String!) { createNote(data:{title:$title,bodyV2:{markdown:$body}}) { id } }',
      { title: `Ownership handoff ${randomUUID()}`, body },
      bInE,
      '/graphql',
    );
    await transfer(b.client, bInE, eUser);
    await gql(
      e.client,
      'mutation($id:String!) { deleteUserFromWorkspace(workspaceMemberIdToDelete:$id) { id } }',
      { id: bMember.id },
      e.auth,
    );
    for (const auth of [bInE, { 'x-workspace-id': workspaceId }]) {
      const old = await gql(
        b.client,
        'query { currentWorkspace { id } }',
        {},
        auth,
        '/metadata',
        true,
      );
      assert.ok(old.errors?.length);
    }
    const retained = await gql(
      e.client,
      'query($id:UUID!) { notes(filter:{id:{eq:$id}}) { edges { node { bodyV2 { markdown } } } } }',
      { id: note.data.createNote.id },
      e.auth,
      '/graphql',
    );
    assert.equal(retained.data.notes.edges[0].node.bodyV2.markdown, body);
    assert.equal((await ownership()).primaryOwnerUserId, eUser);
    assert.equal(
      (await gql(b.client, 'query { currentWorkspace { id } }', {}, b.auth))
        .data.currentWorkspace.id,
      b.fixture.workspaceId,
    );
    console.log(
      'PASS ownership transfers back; former owner can be removed; old access fails, recorded work and the other account remain',
    );
  } finally {
    if (lockClient) {
      await lockClient.query('ROLLBACK').catch(() => {});
      await lockClient.end();
    }
    await Promise.all(clients.map((client) => client.dispose()));
  }
})().catch((error) => {
  console.error(error.message.split('\n')[0]);
  process.exitCode = 1;
});
