import { isValidUuid } from 'twenty-shared/utils';

import {
  ConfigVariableException,
  ConfigVariableExceptionCode,
} from 'src/engine/core-modules/twenty-config/twenty-config.exception';

const DNS_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const normalizeWorkspaceDomainAliasHostname = (
  hostname: string,
): string => hostname.trim().toLowerCase().replace(/\.$/, '');

const isValidWorkspaceDomainAliasHostname = (hostname: string): boolean => {
  if (hostname.length > 253) {
    return false;
  }

  const labels = hostname.split('.');

  return (
    labels.length >= 2 &&
    labels.every((label) => label.length <= 63 && DNS_LABEL_PATTERN.test(label))
  );
};

const invalidAliasesConfig = (message: string): ConfigVariableException =>
  new ConfigVariableException(
    `Invalid TEAM_WORKSPACE_DOMAIN_ALIASES: ${message}`,
    ConfigVariableExceptionCode.VALIDATION_FAILED,
  );

export const parseTeamWorkspaceDomainAliases = (
  rawAliases: unknown,
): ReadonlyMap<string, string> => {
  if (
    typeof rawAliases !== 'object' ||
    rawAliases === null ||
    Array.isArray(rawAliases)
  ) {
    throw invalidAliasesConfig('expected a JSON object');
  }

  const aliases = new Map<string, string>();

  for (const [rawHostname, rawWorkspaceId] of Object.entries(rawAliases)) {
    const hostname = normalizeWorkspaceDomainAliasHostname(rawHostname);

    if (!isValidWorkspaceDomainAliasHostname(hostname)) {
      throw invalidAliasesConfig(
        `"${rawHostname}" is not an exact DNS hostname`,
      );
    }

    if (typeof rawWorkspaceId !== 'string' || !isValidUuid(rawWorkspaceId)) {
      throw invalidAliasesConfig(
        `the target for "${rawHostname}" must be a workspace UUID`,
      );
    }

    if (aliases.has(hostname)) {
      throw invalidAliasesConfig(
        `"${rawHostname}" duplicates another normalized hostname`,
      );
    }

    aliases.set(hostname, rawWorkspaceId.toLowerCase());
  }

  return aliases;
};
