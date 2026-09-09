const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomBytes } = require('node:crypto');
const { chromium, request } = require('playwright');
const {
  clients,
  gql,
  origin,
  owner,
  tokenSelection,
} = require('./verify-staging-accounts.cjs');

(async () => {
  let browser;
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

    browser = await chromium.launch({
      executablePath: '/ms-playwright/chromium-1148/chrome-linux/chrome',
      headless: true,
      args: ['--no-sandbox'],
    });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    page.on('pageerror', (error) => console.log('PAGE_ERROR', error.message));
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame())
        console.log('NAV', new URL(frame.url()).pathname);
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('button', { name: 'Continue with Email' }).click();
    await page.getByPlaceholder('Email', { exact: true }).fill(fixture.email);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page
      .getByPlaceholder('Password', { exact: true })
      .fill(fixture.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page
      .getByRole('button', { name: 'Sign in', exact: true })
      .waitFor({ state: 'hidden', timeout: 60000 });
    await page
      .getByText('Acceptance CRM A', { exact: true })
      .first()
      .waitFor({ timeout: 60000 });
    console.log('PASS shared member can choose either account');
    await page.getByText('Acceptance CRM A', { exact: true }).first().click();
    await page.waitForURL(
      (url) =>
        url.pathname === '/create/profile' ||
        url.pathname.startsWith('/objects/'),
      { timeout: 60000 },
    );
    if (new URL(page.url()).pathname === '/create/profile') {
      await page.getByPlaceholder('Jane', { exact: true }).fill('Synthetic');
      await page
        .getByPlaceholder('Cooper', { exact: true })
        .fill('Shared member');
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
    }
    await page
      .getByText('Companies', { exact: true })
      .first()
      .waitFor({ timeout: 60000 });
    await page.getByText('Acceptance CRM A', { exact: true }).first().click();
    await page
      .getByText('Acceptance CRM B', { exact: true })
      .first()
      .waitFor({ timeout: 30000 });

    const secondTabUrl = await page
      .getByRole('link')
      .filter({ hasText: 'Acceptance CRM B' })
      .getAttribute('href');
    assert.equal(new URL(secondTabUrl, origin).origin, origin);
    const second = await context.newPage();
    second.on('framenavigated', (frame) => {
      if (frame === second.mainFrame())
        console.log('SECOND_NAV', new URL(frame.url()).pathname);
    });
    second.on('pageerror', (error) =>
      console.log('SECOND_PAGE_ERROR', error.message),
    );
    await second.goto(new URL(secondTabUrl, origin).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await second.waitForURL(
      (url) =>
        url.pathname === '/create/profile' ||
        url.pathname.startsWith('/objects/'),
      { timeout: 60000 },
    );
    if (new URL(second.url()).pathname === '/create/profile') {
      await second.getByPlaceholder('Jane', { exact: true }).fill('Synthetic');
      await second
        .getByPlaceholder('Cooper', { exact: true })
        .fill('Shared member');
      await second
        .getByRole('button', { name: 'Continue', exact: true })
        .click();
    }
    await second
      .getByText('Companies', { exact: true })
      .first()
      .waitFor({ timeout: 60000 });

    async function assertAccount(tab, expected, other) {
      const selectedId = await tab.evaluate(
        () =>
          JSON.parse(sessionStorage.getItem('currentWorkspaceState') ?? 'null')
            ?.id,
      );
      assert.equal(selectedId, expected.fixture.workspaceId);
      const result = await tab.evaluate(
        async ({ selectedId, ownId, foreignId }) => {
          const query = async (path, query, variables = {}) =>
            (
              await fetch(path, {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'content-type': 'application/json',
                  'x-workspace-id': selectedId,
                },
                body: JSON.stringify({ query, variables }),
              })
            ).json();
          return {
            workspace: await query(
              '/metadata',
              'query { currentWorkspace { id } }',
            ),
            own: await query(
              '/graphql',
              'query($id: UUID!) { people(filter:{id:{eq:$id}}) { edges { node { id } } } }',
              { id: ownId },
            ),
            foreign: await query(
              '/graphql',
              'query($id: UUID!) { people(filter:{id:{eq:$id}}) { edges { node { id } } } }',
              { id: foreignId },
            ),
          };
        },
        {
          selectedId,
          ownId: expected.fixture.personId,
          foreignId: other.fixture.personId,
        },
      );
      assert.ok(
        !result.workspace.errors &&
          !result.own.errors &&
          !result.foreign.errors,
      );
      assert.equal(result.workspace.data.currentWorkspace.id, selectedId);
      assert.equal(
        result.own.data.people.edges[0]?.node.id,
        expected.fixture.personId,
      );
      assert.equal(result.foreign.data.people.edges.length, 0);
    }
    await assertAccount(page, a, b);
    await assertAccount(second, b, a);
    console.log(
      'PASS two browser tabs retain separate accounts and cookie-only record isolation',
    );

    // Use the compact dropdown in B; A's open tab must retain its own context.
    await second.getByText('Acceptance CRM B', { exact: true }).first().click();
    await second
      .getByRole('link')
      .filter({ hasText: 'Acceptance CRM A' })
      .click();
    await second.waitForFunction(
      (id) =>
        JSON.parse(sessionStorage.getItem('currentWorkspaceState') ?? 'null')
          ?.id === id,
      a.fixture.workspaceId,
      { timeout: 60000 },
    );
    await second
      .getByText('Companies', { exact: true })
      .first()
      .waitFor({ timeout: 60000 });
    await assertAccount(second, a, b);
    await second.getByText('Acceptance CRM A', { exact: true }).first().click();
    await second
      .getByRole('link')
      .filter({ hasText: 'Acceptance CRM B' })
      .click();
    await second.waitForFunction(
      (id) =>
        JSON.parse(sessionStorage.getItem('currentWorkspaceState') ?? 'null')
          ?.id === id,
      b.fixture.workspaceId,
      { timeout: 60000 },
    );
    await second
      .getByText('Companies', { exact: true })
      .first()
      .waitFor({ timeout: 60000 });
    await assertAccount(page, a, b);
    await assertAccount(second, b, a);
    console.log('PASS compact account switching preserves the other open tab');

    for (const tab of [page, second]) {
      await tab.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await tab
        .getByText('Companies', { exact: true })
        .first()
        .waitFor({ timeout: 60000 });
      assert.equal(
        await tab
          .getByRole('link', { name: 'Client workspace', exact: true })
          .count(),
        0,
      );
      assert.equal(
        await tab.getByRole('link', { name: 'Today', exact: true }).count(),
        0,
      );
    }
    await assertAccount(page, a, b);
    await assertAccount(second, b, a);
    console.log(
      'PASS reload preserves both accounts; customer navigation omits the agency pages',
    );
    await page.bringToFront();
    await page.screenshot({
      animations: 'disabled',
      path: '/evidence/member-tab-a.png',
      fullPage: true,
    });
    await second.bringToFront();
    await second.screenshot({
      animations: 'disabled',
      path: '/evidence/member-tab-b.png',
      fullPage: true,
    });
  } catch (error) {
    for (const context of browser?.contexts() ?? []) {
      for (const [index, tab] of context.pages().entries()) {
        console.log(
          'FAIL_PAGE',
          new URL(tab.url()).pathname,
          (await tab.locator('body').innerText()).slice(0, 3000),
        );
        await tab.bringToFront();
        await tab.screenshot({
          path: `/evidence/tabs-failure-${index}.png`,
          fullPage: true,
        });
      }
    }
    throw error;
  } finally {
    await browser?.close();
    await Promise.all(clients.map((client) => client.dispose()));
  }
})().catch((error) => {
  console.error(
    error.message.split('\n')[0],
    error.stack?.match(/verify-staging-browser-tabs.cjs:\d+:\d+/)?.[0],
  );
  process.exitCode = 1;
});
