const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/ms-playwright/chromium-1148/chrome-linux/chrome',
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', async (response) => {
      if (!response.url().endsWith('/metadata')) return;
      const operation = response.request().postDataJSON()?.operationName;
      const body = await response.json().catch(() => ({}));
      if (body.errors)
        console.log(
          'API_ERROR',
          operation,
          body.errors.map((error) => error.message),
        );
    });
    await page.goto('https://pe-saas-0910-app:3047', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await page
      .getByText(
        'Manage your contacts, sales pipeline, and team in your own CRM.',
        { exact: true },
      )
      .waitFor({ timeout: 30000 });
    const accountPath = '/test-state/form-only.json';
    const account = fs.existsSync(accountPath)
      ? JSON.parse(fs.readFileSync(accountPath, 'utf8'))
      : {
          email: 'stage-form-only@example.invalid',
          password: `Stage-${randomBytes(12).toString('hex')}!3`,
        };
    fs.writeFileSync(accountPath, JSON.stringify(account), { mode: 0o600 });
    await page.getByRole('button', { name: 'Continue with Email' }).click();
    await page.getByPlaceholder('Email', { exact: true }).fill(account.email);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page
      .getByPlaceholder('Password', { exact: true })
      .fill(account.password);
    await page.getByRole('button', { name: /^(Sign up|Sign in)$/ }).click();
    await page
      .getByPlaceholder('Apple', { exact: true })
      .waitFor({ timeout: 45000 });
    await page.getByText('Create your account', { exact: true }).waitFor();
    await page
      .getByText("Set up your company's CRM.", { exact: true })
      .waitFor();
    await page
      .getByRole('button', { name: 'Create account', exact: true })
      .waitFor();
    await page.screenshot({
      path: '/evidence/signup-form.png',
      fullPage: true,
    });
    assert.equal(pageErrors.length, 0, 'Browser must not have uncaught errors');
    console.log(
      'PASS compiled browser: CRM sign-in wording, readable account form and accessible Create account button',
    );
    await page
      .getByPlaceholder('Apple', { exact: true })
      .fill('Form retry CRM');
    const requestIds = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const responsePromise = page.waitForResponse((response) => {
        if (!response.url().endsWith('/metadata')) return false;
        return (
          response.request().postDataJSON()?.operationName ===
          'SignUpInNewWorkspace'
        );
      });
      await page
        .getByRole('button', { name: 'Create account', exact: true })
        .click();
      const response = await responsePromise;
      const body = await response.json();
      assert.ok(
        body.errors?.some((error) =>
          /workspace limit|enterprise key/i.test(error.message),
        ),
      );
      requestIds.push(
        response.request().postDataJSON().variables.input.requestId,
      );
    }
    assert.match(requestIds[0], /^[0-9a-f-]{36}$/);
    assert.equal(requestIds[1], requestIds[0]);
    console.log(
      'PASS compiled form sends a stable request ID across retries and respects the account capacity limit',
    );
    console.log('TITLE', await page.title());
    console.log(
      'BODY',
      (await page.locator('body').innerText()).slice(0, 5000),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.message.split('\n')[0]);
  process.exitCode = 1;
});
