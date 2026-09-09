import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const serverRoot = fileURLToPath(
  new URL('../../packages/twenty-server/', import.meta.url),
);

// SWC's runtime exports can expose cycles that Jest and typechecking do not.
// Use a fresh process for each entry so an earlier import cannot mask a cycle.
for (const entry of [
  './dist/app.module.js',
  './dist/command/command.module.js',
  './dist/queue-worker/queue-worker.module.js',
]) {
  const result = spawnSync(
    process.execPath,
    ['-e', `require(${JSON.stringify(entry)})`],
    {
      cwd: serverRoot,
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: 'inherit',
      timeout: 120_000,
    },
  );

  assert.ifError(result.error);
  assert.equal(result.status, 0, `Compiled runtime import failed: ${entry}`);
  console.log(`PASS ${entry}`);
}
