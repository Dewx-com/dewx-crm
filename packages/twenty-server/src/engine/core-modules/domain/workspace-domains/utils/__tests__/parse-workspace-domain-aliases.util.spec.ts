import { ConfigVariableExceptionCode } from 'src/engine/core-modules/twenty-config/twenty-config.exception';

import { parseTeamWorkspaceDomainAliases } from '../parse-workspace-domain-aliases.util';

const WORKSPACE_ID = '35f718e0-e29b-41d4-a716-446655440000';

describe('parseTeamWorkspaceDomainAliases', () => {
  it('normalizes exact hostnames and keeps immutable workspace ids', () => {
    const aliases = parseTeamWorkspaceDomainAliases({
      ' Team.ProspectEngine.com. ': WORKSPACE_ID.toUpperCase(),
    });

    expect(aliases.get('team.prospectengine.com')).toBe(WORKSPACE_ID);
  });

  it.each([
    ['wildcards', { '*.prospectengine.com': WORKSPACE_ID }],
    ['URLs', { 'https://team.prospectengine.com': WORKSPACE_ID }],
    ['single-label hosts', { team: WORKSPACE_ID }],
    [
      'mutable workspace names',
      { 'team.prospectengine.com': 'Prospect Engine' },
    ],
    ['arrays', ['team.prospectengine.com', WORKSPACE_ID]],
  ])('rejects %s', (_label, value) => {
    expect(() => parseTeamWorkspaceDomainAliases(value)).toThrow(
      expect.objectContaining({
        code: ConfigVariableExceptionCode.VALIDATION_FAILED,
      }),
    );
  });

  it('rejects hostnames that collide after normalization', () => {
    expect(() =>
      parseTeamWorkspaceDomainAliases({
        'team.prospectengine.com': WORKSPACE_ID,
        'TEAM.PROSPECTENGINE.COM.': '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).toThrow('duplicates another normalized hostname');
  });
});
