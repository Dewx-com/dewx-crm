const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const {
  clients,
  gql,
  origin,
  owner,
} = require('./verify-staging-accounts.cjs');

(async () => {
  let browser;
  try {
    const e = await owner('e');
    const b = await owner('b');
    const eUser = (
      await gql(e.client, 'query { currentUser { id } }', {}, e.auth)
    ).data.currentUser.id;
    const workspaceId = e.fixture.workspaceId;
    const roles = (
      await gql(
        e.client,
        'query { getRoles { id universalIdentifier } }',
        {},
        e.auth,
      )
    ).data.getRoles;
    const admin = roles.find(
      (r) => r.universalIdentifier === '20202020-02c2-43f2-b94d-cab1f2b532eb',
    );
    let available = (
      await gql(
        b.client,
        'mutation($email:String!,$password:String!) { signIn(email:$email,password:$password) { availableWorkspaces { availableWorkspacesForSignIn { id } availableWorkspacesForSignUp { id personalInviteToken } } } }',
        b.fixture,
      )
    ).data.signIn.availableWorkspaces;
    if (
      !available.availableWorkspacesForSignIn.some((w) => w.id === workspaceId)
    ) {
      await gql(
        e.client,
        'mutation($emails:[String!]!,$role:UUID!) { sendInvitations(emails:$emails,roleId:$role) { success } }',
        { emails: [b.fixture.email], role: admin.id },
        e.auth,
      );
      available = (
        await gql(
          b.client,
          'mutation($email:String!,$password:String!) { signIn(email:$email,password:$password) { availableWorkspaces { availableWorkspacesForSignUp { id personalInviteToken } } } }',
          b.fixture,
        )
      ).data.signIn.availableWorkspaces;
      const invitation = available.availableWorkspacesForSignUp.find(
        (w) => w.id === workspaceId,
      );
      assert.ok(invitation?.personalInviteToken);
      await gql(
        b.client,
        'mutation($email:String!,$password:String!,$workspace:UUID!,$invite:String!) { signUpInWorkspace(email:$email,password:$password,workspaceId:$workspace,workspacePersonalInviteToken:$invite) { workspace { id } } }',
        {
          ...b.fixture,
          workspace: workspaceId,
          invite: invitation.personalInviteToken,
        },
      );
    }
    const members = (
      await gql(
        e.client,
        'query { workspaceMembers { edges { node { id userId userEmail } } } }',
        {},
        e.auth,
        '/graphql',
      )
    ).data.workspaceMembers.edges.map(({ node }) => node);
    const eMember = members.find((m) => m.userId === eUser);
    const bMember = members.find((m) => m.userEmail === b.fixture.email);
    assert.ok(eMember && bMember);
    assert.equal(
      (
        await gql(
          e.client,
          'query { currentWorkspace { primaryOwnerUserId } }',
          {},
          e.auth,
        )
      ).data.currentWorkspace.primaryOwnerUserId,
      eUser,
      'Start with E owning its synthetic CRM; API acceptance restores this fixture',
    );
    browser = await chromium.launch({
      executablePath: '/ms-playwright/chromium-1148/chrome-linux/chrome',
      headless: true,
      args: ['--no-sandbox'],
    });
    const pageErrors = [];
    async function signIn(account) {
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame())
          console.log(
            account === e ? 'OWNER_NAV' : 'ADMIN_NAV',
            new URL(frame.url()).pathname,
          );
      });
      await page.goto(origin, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.getByRole('button', { name: 'Continue with Email' }).click();
      await page
        .getByPlaceholder('Email', { exact: true })
        .fill(account.fixture.email);
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page
        .getByPlaceholder('Password', { exact: true })
        .fill(account.fixture.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page
        .getByRole('button', { name: 'Sign in', exact: true })
        .waitFor({ state: 'hidden', timeout: 60000 });
      if (account === b) {
        await page
          .getByText('Acceptance CRM E', { exact: true })
          .first()
          .waitFor({ timeout: 60000 });
        await page
          .getByText('Acceptance CRM E', { exact: true })
          .first()
          .click();
      }
      for (let step = 0; step < 5; step++) {
        await page.waitForURL(
          (url) =>
            url.pathname === '/create/profile' ||
            url.pathname === '/invite-team' ||
            url.pathname.startsWith('/objects/'),
          { timeout: 60000 },
        );
        const pathname = new URL(page.url()).pathname;
        if (pathname.startsWith('/objects/')) break;
        if (pathname === '/create/profile') {
          await page
            .getByPlaceholder('Jane', { exact: true })
            .fill('Synthetic');
          await page
            .getByPlaceholder('Cooper', { exact: true })
            .fill(account === e ? 'Owner E' : 'Administrator B');
          await page
            .getByRole('button', { name: 'Continue', exact: true })
            .click();
        } else {
          await page.getByRole('button', { name: /Skip/ }).click();
        }
        await page.waitForURL((url) => url.pathname !== pathname, {
          timeout: 60000,
        });
      }
      await page
        .getByText('Companies', { exact: true })
        .first()
        .waitFor({ timeout: 60000 });
      assert.equal(
        await page.evaluate(
          () => JSON.parse(sessionStorage.getItem('currentWorkspaceState'))?.id,
        ),
        workspaceId,
      );
      return page;
    }
    const ePage = await signIn(e);
    const bPage = await signIn(b);
    async function permissions(page, member) {
      await page.bringToFront();
      await page.goto(`${origin}/settings/members/${member.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.getByTestId('tab-permissions').click({ timeout: 60000 });
      await page
        .getByText('Open in Roles', { exact: true })
        .waitFor({ timeout: 30000 });
    }
    await permissions(bPage, eMember);
    await bPage
      .getByText(
        'The account owner keeps full administrator access. Transfer ownership before changing their role.',
        { exact: true },
      )
      .waitFor();
    assert.equal(
      await bPage
        .getByRole('button', { name: 'Transfer ownership', exact: true })
        .count(),
      0,
    );
    await bPage.getByTestId('tab-infos').click();
    await bPage.getByText('Account owner', { exact: true }).waitFor();
    assert.equal(
      await bPage
        .getByRole('button', { name: 'Remove member', exact: true })
        .count(),
      0,
    );
    assert.equal(
      await bPage
        .getByRole('button', { name: 'Impersonate', exact: true })
        .count(),
      0,
    );
    console.log(
      'PASS administrator sees the protected owner and cannot offer removal or ownership takeover',
    );
    async function transfer(page, member) {
      await permissions(page, member);
      await page
        .getByRole('button', { name: 'Transfer ownership', exact: true })
        .click();
      await page
        .getByText('Transfer account ownership', { exact: true })
        .waitFor();
      console.log('PASS transfer confirmation opened');
      const confirm = page.getByTestId('confirmation-modal-confirm-button');
      assert.equal(await confirm.isDisabled(), true);
      await page.getByTestId('confirmation-modal-input').fill(member.userEmail);
      const response = page.waitForResponse(
        async (response) =>
          response.url().endsWith('/metadata') &&
          response.request().postData()?.includes('TransferWorkspaceOwnership'),
        { timeout: 30000 },
      );
      await confirm.click();
      const result = await (await response).json();
      assert.ok(
        !result.errors,
        JSON.stringify(result.errors?.map((e) => e.message)),
      );
      assert.equal(
        result.data.transferWorkspaceOwnership.primaryOwnerUserId,
        member.userId,
      );
      await page.getByText('Ownership transferred', { exact: true }).waitFor();
    }
    await transfer(ePage, bMember);
    console.log(
      'PASS owner confirms the recipient email and transfers ownership through Settings',
    );
    await permissions(bPage, eMember);
    await bPage
      .getByRole('button', { name: 'Transfer ownership', exact: true })
      .waitFor();
    await bPage
      .getByRole('button', { name: 'Transfer ownership', exact: true })
      .scrollIntoViewIfNeeded();
    await bPage.screenshot({
      path: '/evidence/new-owner-settings.png',
      fullPage: true,
      animations: 'disabled',
      timeout: 30000,
    });
    await transfer(bPage, eMember);
    await ePage.bringToFront();
    await ePage.goto(`${origin}/settings/members/${bMember.id}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await ePage
      .getByRole('button', { name: 'Remove member', exact: true })
      .click({ timeout: 60000 });
    const removed = ePage.waitForResponse(
      (r) =>
        r.url().endsWith('/metadata') &&
        r.request().postData()?.includes('DeleteUserWorkspace'),
    );
    await ePage.getByTestId('confirmation-modal-confirm-button').click();
    const result = await (await removed).json();
    assert.ok(
      !result.errors,
      JSON.stringify(result.errors?.map((e) => e.message)),
    );
    await ePage.waitForURL((url) => url.pathname === '/settings/members', {
      timeout: 30000,
    });
    const finalMembers = (
      await gql(
        e.client,
        'query { workspaceMembers { edges { node { id } } } }',
        {},
        e.auth,
        '/graphql',
      )
    ).data.workspaceMembers.edges;
    assert.ok(!finalMembers.some(({ node }) => node.id === bMember.id));
    assert.equal(
      (
        await gql(
          e.client,
          'query { currentWorkspace { primaryOwnerUserId } }',
          {},
          e.auth,
        )
      ).data.currentWorkspace.primaryOwnerUserId,
      eUser,
    );
    assert.deepEqual(pageErrors, []);
    console.log(
      'PASS new owner transfers back; original owner removes the former owner through Settings; no browser errors',
    );
  } finally {
    if (browser) await browser.close();
    await Promise.all(clients.map((c) => c.dispose()));
  }
})().catch((error) => {
  console.error(error.message.split('\n')[0]);
  console.error(
    (
      error.stack?.match(
        /at .+verify-staging-ownership-browser.cjs:\d+:\d+/g,
      ) ?? []
    )
      .slice(0, 3)
      .join('\n'),
  );
  process.exitCode = 1;
});
