const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { request } = require('playwright');
const {
  clients,
  gql,
  origin,
  owner,
  tokenSelection,
} = require('./verify-staging-accounts.cjs');

(async () => {
  let cleanup = async () => {};
  try {
    const e = await owner('e');
    const member = await owner('c');
    const eUser = (
      await gql(e.client, 'query { currentUser { id } }', {}, e.auth)
    ).data.currentUser.id;
    const memberUser = (
      await gql(member.client, 'query { currentUser { id } }', {}, member.auth)
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
    const signInMember = async () =>
      (
        await gql(
          member.client,
          `mutation($email:String!,$password:String!) { signIn(email:$email,password:$password) {
        availableWorkspaces { availableWorkspacesForSignIn { id loginToken } availableWorkspacesForSignUp { id personalInviteToken } }
      } }`,
          member.fixture,
        )
      ).data.signIn.availableWorkspaces;
    let available = await signInMember();
    let loginToken = available.availableWorkspacesForSignIn.find(
      (w) => w.id === workspaceId,
    )?.loginToken;
    if (!loginToken) {
      const sent = await gql(
        e.client,
        'mutation($emails:[String!]!,$role:UUID!) { sendInvitations(emails:$emails,roleId:$role) { success errors } }',
        { emails: [member.fixture.email], role: memberRole.id },
        e.auth,
      );
      assert.equal(sent.data.sendInvitations.success, true);
      available = await signInMember();
      const invitation = available.availableWorkspacesForSignUp.find(
        (w) => w.id === workspaceId,
      );
      assert.ok(invitation?.personalInviteToken);
      const accepted = await gql(
        member.client,
        'mutation($email:String!,$password:String!,$workspace:UUID!,$invite:String!) { signUpInWorkspace(email:$email,password:$password,workspaceId:$workspace,workspacePersonalInviteToken:$invite) { loginToken { token } } }',
        {
          ...member.fixture,
          workspace: workspaceId,
          invite: invitation.personalInviteToken,
        },
      );
      loginToken = accepted.data.signUpInWorkspace.loginToken.token;
    }
    const login = await gql(
      member.client,
      `mutation($token:String!,$origin:String!) { getAuthTokensFromLoginToken(loginToken:$token,origin:$origin) { ${tokenSelection} } }`,
      { token: loginToken, origin },
    );
    const memberAuth = {
      authorization: `Bearer ${login.data.getAuthTokensFromLoginToken.tokens.accessOrWorkspaceAgnosticToken.token}`,
      'x-workspace-id': workspaceId,
    };

    const query = (
      document,
      variables = {},
      auth = e.auth,
      path = '/metadata',
      errors = false,
    ) => gql(e.client, document, variables, auth, path, errors);
    const memberRecord = (
      await query(
        'query { workspaceMembers { edges { node { id userId } } } }',
        {},
        e.auth,
        '/graphql',
      )
    ).data.workspaceMembers.edges.find(
      ({ node }) => node.userId === memberUser,
    )?.node;
    assert.ok(memberRecord);
    await query(
      'mutation($member:UUID!,$role:UUID!) { updateWorkspaceMemberRole(workspaceMemberId:$member,roleId:$role) { id } }',
      { member: memberRecord.id, role: memberRole.id },
    );
    const scopes = (
      await query(
        'query($role:UUID!) { roleRecordScopes(roleId:$role) { id } }',
        { role: memberRole.id },
      )
    ).data.roleRecordScopes;
    assert.equal(
      scopes.length,
      0,
      'Only an unscoped synthetic Member role may be used',
    );
    const objects = (
      await query(
        'query { objects(paging:{first:1000}) { edges { node { id nameSingular fieldsList { id name } } } } }',
      )
    ).data.objects.edges.map(({ node }) => node);
    const attachment = objects.find((o) => o.nameSingular === 'attachment');
    const person = objects.find((o) => o.nameSingular === 'person');
    const fileField = attachment.fieldsList.find((f) => f.name === 'file');
    const avatarField = person.fieldsList.find((f) => f.name === 'avatarFile');
    assert.ok(avatarField);
    const scopeInputs = [];
    let fieldRestricted = false;
    const setFilePermission = (canReadFieldValue, canUpdateFieldValue) =>
      query(
        'mutation($input:UpsertFieldPermissionsInput!) { upsertFieldPermissions(upsertFieldPermissionsInput:$input) { id } }',
        {
          input: {
            roleId: memberRole.id,
            fieldPermissions: [
              {
                objectMetadataId: person.id,
                fieldMetadataId: avatarField.id,
                canReadFieldValue,
                canUpdateFieldValue,
              },
            ],
          },
        },
      );
    const originalField = (
      await query(
        'query { getRoles { id fieldPermissions { fieldMetadataId canReadFieldValue canUpdateFieldValue } } }',
      )
    ).data.getRoles
      .find((role) => role.id === memberRole.id)
      .fieldPermissions?.find(
        (field) => field.fieldMetadataId === avatarField.id,
      );

    cleanup = async () => {
      if (fieldRestricted)
        await setFilePermission(
          originalField?.canReadFieldValue ?? null,
          originalField?.canUpdateFieldValue ?? null,
        );
      for (const input of scopeInputs)
        await query(
          'mutation($input:DeleteRoleRecordScopeInput!) { deleteRoleRecordScope(input:$input) }',
          { input },
        );
      // Keep this dedicated synthetic member joined for reruns; repeat invitations consume the real sending limit.
    };
    const anonymous = await request.newContext({ ignoreHTTPSErrors: true });
    clients.push(anonymous);
    const proof = [];
    const outcomes = [];
    for (const label of ['visible', 'hidden']) {
      const record = (
        await query(
          'mutation($title:String!) { createPerson(data:{name:{firstName:$title},jobTitle:$title}) { id } }',
          { title: `File permission ${label} ${randomUUID()}` },
          e.auth,
          '/graphql',
        )
      ).data.createPerson;
      const bytes = Buffer.from(`Private ${label} attachment ${randomUUID()}`);
      const target = (
        await query(
          'mutation($size:Float!,$field:String!) { createFileUpload(filename:"permission-proof.txt",size:$size,fileFolder:FilesField,fieldMetadataId:$field) { fileId uploadUrl contentType } }',
          { size: bytes.length, field: fileField.id },
        )
      ).data.createFileUpload;
      assert.equal(
        (
          await anonymous.put(target.uploadUrl, {
            headers: { 'content-type': target.contentType },
            data: bytes,
          })
        ).status(),
        204,
      );
      const otherConfirmation = await query(
        'mutation($id:String!) { completeFileUpload(fileId:$id) { id } }',
        { id: target.fileId },
        memberAuth,
        '/metadata',
        true,
      );
      outcomes.push([
        `${label} upload cannot be confirmed by another member`,
        Boolean(otherConfirmation.errors?.length),
      ]);
      const confirmed = await query(
        'mutation($id:String!) { completeFileUpload(fileId:$id) { id url } }',
        { id: target.fileId },
      );
      assert.equal(
        (
          await e.client.get(confirmed.data.completeFileUpload.url, {
            headers: e.auth,
          })
        ).status(),
        200,
        'Uploaded file preview remains readable before attachment',
      );
      outcomes.push([
        `${label} upload preview is private to its uploader`,
        (
          await e.client.get(confirmed.data.completeFileUpload.url, {
            headers: memberAuth,
          })
        ).status(),
      ]);
      const attached = (
        await query(
          'mutation($person:UUID!,$file:UUID!) { createAttachment(data:{targetPersonId:$person,file:[{fileId:$file,label:"permission-proof.txt"}]}) { id file { url } } }',
          { person: record.id, file: target.fileId },
          e.auth,
          '/graphql',
        )
      ).data.createAttachment;
      proof.push({
        ...attached,
        personId: record.id,
        fileId: target.fileId,
        url: attached.file[0].url,
        bytes,
      });
    }
    const [visible, hidden] = proof;
    const download = async (item, auth) => {
      const response = await e.client.get(item.url, {
        headers: auth,
        maxRedirects: 0,
      });
      if (response.status() === 200)
        assert.deepEqual(await response.body(), item.bytes);
      return response.status();
    };
    for (const item of proof)
      assert.equal(await download(item, memberAuth), 200);
    console.log(
      'PASS member can read both attachments before permission changes',
    );
    const relink = await query(
      'mutation($person:UUID!,$file:UUID!) { createAttachment(data:{targetPersonId:$person,file:[{fileId:$file,label:"relink.txt"}]}) { id } }',
      { person: visible.personId, file: hidden.fileId },
      memberAuth,
      '/graphql',
      true,
    );
    assert.ok(
      relink.errors?.some((error) => /already associated/.test(error.message)),
      JSON.stringify(relink.errors?.map((e) => e.message)),
    );
    console.log(
      'PASS native file validation rejects reuse of an already attached file ID',
    );
    const restrict = async (object, field, value) => {
      const input = {
        roleId: memberRole.id,
        objectMetadataId: object.id,
        fieldMetadataId: field.id,
      };
      scopeInputs.push(input);
      await query(
        'mutation($input:UpsertRoleRecordScopeInput!) { upsertRoleRecordScope(input:$input) { id } }',
        { input: { ...input, value } },
      );
      return input;
    };
    const attachmentScope = await restrict(
      attachment,
      attachment.fieldsList.find((f) => f.name === 'id'),
      visible.id,
    );
    const records = (
      await query(
        'query { attachments { edges { node { id } } } }',
        {},
        memberAuth,
        '/graphql',
      )
    ).data.attachments.edges;
    assert.ok(records.some(({ node }) => node.id === visible.id));
    assert.ok(!records.some(({ node }) => node.id === hidden.id));
    outcomes.push([
      'record scope saved URL',
      await download(hidden, memberAuth),
    ]);
    assert.equal(await download(visible, memberAuth), 200);
    assert.equal(await download(hidden, e.auth), 200);
    await query(
      'mutation($input:DeleteRoleRecordScopeInput!) { deleteRoleRecordScope(input:$input) }',
      { input: attachmentScope },
    );
    scopeInputs.splice(scopeInputs.indexOf(attachmentScope), 1);
    const parentScope = await restrict(
      person,
      person.fieldsList.find((f) => f.name === 'id'),
      visible.personId,
    );
    const people = (
      await query(
        'query { people { edges { node { id } } } }',
        {},
        memberAuth,
        '/graphql',
      )
    ).data.people.edges;
    assert.ok(people.some(({ node }) => node.id === visible.personId));
    assert.ok(!people.some(({ node }) => node.id === hidden.personId));
    outcomes.push([
      'parent record saved URL',
      await download(hidden, memberAuth),
    ]);
    const parentAttachments = (
      await query(
        'query($id:UUID!) { attachments(filter:{id:{eq:$id}}) { edges { node { id } } } }',
        { id: hidden.id },
        memberAuth,
        '/graphql',
      )
    ).data.attachments.edges;
    outcomes.push([
      'hidden parent also hides attachment records',
      parentAttachments.length === 0,
    ]);

    const moved = await query(
      'mutation($id:UUID!,$person:UUID!) { updateAttachment(id:$id,data:{targetPersonId:$person}) { id } }',
      { id: hidden.id, person: visible.personId },
      memberAuth,
      '/graphql',
      true,
    );
    const afterMove = await download(hidden, memberAuth);
    outcomes.push([
      'hidden attachment cannot be moved to regain its bytes',
      afterMove,
    ]);
    const targetAfterMove = (
      await query(
        'query($id:UUID!) { attachments(filter:{id:{eq:$id}}) { edges { node { targetPersonId } } } }',
        { id: hidden.id },
        e.auth,
        '/graphql',
      )
    ).data.attachments.edges[0]?.node.targetPersonId;
    outcomes.push([
      'denied move preserves the original contact',
      targetAfterMove === hidden.personId,
    ]);

    if (moved.data?.updateAttachment?.id)
      await query(
        'mutation($id:UUID!,$person:UUID!) { updateAttachment(id:$id,data:{targetPersonId:$person}) { id } }',
        { id: hidden.id, person: hidden.personId },
        e.auth,
        '/graphql',
      );

    assert.equal(await download(visible, memberAuth), 200);
    assert.equal(await download(hidden, e.auth), 200);
    await query(
      'mutation($input:DeleteRoleRecordScopeInput!) { deleteRoleRecordScope(input:$input) }',
      { input: parentScope },
    );
    scopeInputs.splice(scopeInputs.indexOf(parentScope), 1);
    const avatarBytes = Buffer.from(`Field permission proof ${randomUUID()}`);
    const avatarTarget = (
      await query(
        'mutation($size:Float!,$field:String!) { createFileUpload(filename:"field-proof.txt",size:$size,fileFolder:FilesField,fieldMetadataId:$field) { fileId uploadUrl contentType } }',
        { size: avatarBytes.length, field: avatarField.id },
      )
    ).data.createFileUpload;
    assert.equal(
      (
        await anonymous.put(avatarTarget.uploadUrl, {
          headers: { 'content-type': avatarTarget.contentType },
          data: avatarBytes,
        })
      ).status(),
      204,
    );
    await query(
      'mutation($id:String!) { completeFileUpload(fileId:$id) { id } }',
      { id: avatarTarget.fileId },
    );
    const otherAvatar = await query(
      'mutation($id:UUID!,$file:UUID!) { updatePerson(id:$id,data:{avatarFile:[{fileId:$file,label:"field-proof.txt"}]}) { id } }',
      { id: visible.personId, file: avatarTarget.fileId },
      memberAuth,
      '/graphql',
      true,
    );
    outcomes.push([
      'another member cannot attach a draft through a record update',
      Boolean(otherAvatar.errors?.length),
    ]);
    const avatar = (
      await query(
        'mutation($id:UUID!,$file:UUID!) { updatePerson(id:$id,data:{avatarFile:[{fileId:$file,label:"field-proof.txt"}]}) { avatarFile { url } } }',
        { id: visible.personId, file: avatarTarget.fileId },
        e.auth,
        '/graphql',
      )
    ).data.updatePerson;
    const avatarProof = { url: avatar.avatarFile[0].url, bytes: avatarBytes };
    assert.equal(await download(avatarProof, memberAuth), 200);
    await setFilePermission(false, false);
    fieldRestricted = true;
    const fieldQuery = await query(
      'query { people { edges { node { id avatarFile { fileId } } } } }',
      {},
      memberAuth,
      '/graphql',
      true,
    );
    assert.ok(
      fieldQuery.errors?.length,
      'Native CRM query must reject the hidden file field',
    );
    outcomes.push([
      'file field saved URL',
      await download(avatarProof, memberAuth),
    ]);
    assert.equal(await download(avatarProof, e.auth), 200);
    await setFilePermission(
      originalField?.canReadFieldValue ?? null,
      originalField?.canUpdateFieldValue ?? null,
    );
    fieldRestricted = false;
    assert.equal(
      await download(avatarProof, memberAuth),
      200,
      'Restored permission restores download access',
    );
    assert.equal(
      (
        await gql(
          member.client,
          'query { currentWorkspace { id } }',
          {},
          member.auth,
        )
      ).data.currentWorkspace.id,
      member.fixture.workspaceId,
    );
    console.log(
      'PASS upload preview and owner access preserved; restoring the member permission restores downloads; other account remains accessible',
    );
    const draftBytes = Buffer.from(`Unattached upload ${randomUUID()}`);
    const draftTarget = (
      await query(
        'mutation($size:Float!,$field:String!) { createFileUpload(filename:"draft-proof.txt",size:$size,fileFolder:FilesField,fieldMetadataId:$field) { fileId uploadUrl contentType } }',
        { size: draftBytes.length, field: fileField.id },
      )
    ).data.createFileUpload;
    assert.equal(
      (
        await anonymous.put(draftTarget.uploadUrl, {
          headers: { 'content-type': draftTarget.contentType },
          data: draftBytes,
        })
      ).status(),
      204,
    );
    await query(
      'mutation($id:String!) { completeFileUpload(fileId:$id) { id } }',
      { id: draftTarget.fileId },
    );
    const stolen = await query(
      'mutation($person:UUID!,$file:UUID!) { createAttachment(data:{targetPersonId:$person,file:[{fileId:$file,label:"draft-proof.txt"}]}) { id file { url } } }',
      { person: visible.personId, file: draftTarget.fileId },
      memberAuth,
      '/graphql',
      true,
    );
    outcomes.push([
      'another member cannot attach an uploader’s unfinished draft',
      Boolean(stolen.errors?.length),
    ]);
    if (stolen.errors?.length) {
      const saved = (
        await query(
          'mutation($person:UUID!,$file:UUID!) { createAttachment(data:{targetPersonId:$person,file:[{fileId:$file,label:"draft-proof.txt"}]}) { id file { url } } }',
          { person: visible.personId, file: draftTarget.fileId },
          e.auth,
          '/graphql',
        )
      ).data.createAttachment;
      assert.equal(
        await download(
          { url: saved.file[0].url, bytes: draftBytes },
          memberAuth,
        ),
        200,
        'After the uploader attaches the file, its record permissions govern access',
      );
    }
    const multipartBytes = Buffer.from(`Multipart draft ${randomUUID()}`);
    const multipartResponse = await e.client.post('/metadata', {
      headers: { ...e.auth, origin, 'apollo-require-preflight': 'true' },
      multipart: {
        operations: JSON.stringify({
          query:
            'mutation($file:Upload!,$field:String!) { uploadFilesFieldFile(file:$file,fieldMetadataId:$field) { id url } }',
          variables: { file: null, field: fileField.id },
        }),
        map: JSON.stringify({ upload: ['variables.file'] }),
        upload: {
          name: 'multipart-proof.txt',
          mimeType: 'text/plain',
          buffer: multipartBytes,
        },
      },
    });
    const multipartResult = await multipartResponse.json();
    assert.equal(
      multipartResponse.status(),
      200,
      'Native multipart upload must succeed',
    );
    assert.ok(
      !multipartResult.errors,
      JSON.stringify(multipartResult.errors?.map((error) => error.message)),
    );
    assert.ok(
      multipartResult.data,
      'Multipart response must contain GraphQL data',
    );
    const multipartFile = multipartResult.data.uploadFilesFieldFile;
    assert.equal(
      await download({ url: multipartFile.url, bytes: multipartBytes }, e.auth),
      200,
    );
    outcomes.push([
      'multipart draft preview is private to its uploader',
      await download(
        { url: multipartFile.url, bytes: multipartBytes },
        memberAuth,
      ),
    ]);
    const multipartStolen = await query(
      'mutation($person:UUID!,$file:UUID!) { createAttachment(data:{targetPersonId:$person,file:[{fileId:$file,label:"multipart-proof.txt"}]}) { id } }',
      { person: visible.personId, file: multipartFile.id },
      memberAuth,
      '/graphql',
      true,
    );
    outcomes.push([
      'another member cannot attach a multipart draft',
      Boolean(multipartStolen.errors?.length),
    ]);
    if (multipartStolen.errors?.length) {
      const saved = (
        await query(
          'mutation($person:UUID!,$file:UUID!) { createAttachment(data:{targetPersonId:$person,file:[{fileId:$file,label:"multipart-proof.txt"}]}) { file { url } } }',
          { person: visible.personId, file: multipartFile.id },
          e.auth,
          '/graphql',
        )
      ).data.createAttachment;
      assert.equal(
        await download(
          { url: saved.file[0].url, bytes: multipartBytes },
          memberAuth,
        ),
        200,
      );
    }
    for (const [label, result] of outcomes)
      console.log(
        `${result === true || result === 403 ? 'PASS' : 'FAIL'} ${label}: ${typeof result === 'number' ? `HTTP ${result}` : result ? 'verified' : 'violated'}`,
      );
    assert.ok(
      outcomes.every(([, result]) => result === true || result === 403),
      'Saved file URLs must enforce current record and parent permissions',
    );
  } finally {
    try {
      await cleanup();
    } finally {
      await Promise.all(clients.map((client) => client.dispose()));
    }
  }
})().catch((error) => {
  console.error(
    error instanceof assert.AssertionError
      ? error.message
      : error.message.split('\n')[0],
  );
  console.error(
    error.stack
      ?.split('\n')
      .filter((line) => /^\s+at /.test(line))
      .join('\n'),
  );
  process.exitCode = 1;
});
