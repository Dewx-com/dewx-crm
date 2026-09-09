import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { generateMessageId } from '@lingui/message-utils/generateMessageId';
import { setupI18n } from '@lingui/core';

const catalogRoot = new URL(
  '../../packages/twenty-front/src/locales/generated/',
  import.meta.url,
);
const customerMessages = [
  'Create your account',
  "Set up your company's CRM.",
  'Create account',
  'Download this file to view it.',
  'Manage your contacts, sales pipeline, and team in your own CRM.',
];

for (const file of await readdir(catalogRoot)) {
  if (!file.endsWith('.ts')) continue;
  const locale = file.slice(0, -3);
  const { messages } = await import(new URL(file, catalogRoot));
  const i18n = setupI18n({ locale, messages: { [locale]: messages } });

  for (const message of customerMessages) {
    const id = generateMessageId(message);
    assert.ok(Object.hasOwn(messages, id), `${locale}: missing ${message}`);
    assert.notEqual(i18n._(id), id, `${locale}: renders an untranslated ID`);
    if (locale === 'en') assert.equal(i18n._(id), message);
  }
  console.log(`PASS ${locale}: customer account and download wording`);
}
