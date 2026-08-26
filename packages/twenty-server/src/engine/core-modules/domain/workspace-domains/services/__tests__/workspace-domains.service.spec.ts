import { type Repository } from 'typeorm';

import { DomainServerConfigService } from 'src/engine/core-modules/domain/domain-server-config/services/domain-server-config.service';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { PublicDomainEntity } from 'src/engine/core-modules/public-domain/public-domain.entity';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

const PROSPECT_ENGINE_WORKSPACE_ID = '35f718e0-e29b-41d4-a716-446655440000';

const prospectEngineWorkspace = {
  id: PROSPECT_ENGINE_WORKSPACE_ID,
  subdomain: 'app',
  customDomain: null,
  isCustomDomainEnabled: false,
} as WorkspaceEntity;

describe('WorkspaceDomainsService workspace aliases', () => {
  let workspaceRepository: jest.Mocked<
    Pick<Repository<WorkspaceEntity>, 'find' | 'findOne'>
  >;
  let publicDomainRepository: jest.Mocked<
    Pick<Repository<PublicDomainEntity>, 'findOne'>
  >;
  let domainServerConfigService: jest.Mocked<
    Pick<
      DomainServerConfigService,
      'getFrontUrl' | 'getSubdomainAndDomainFromUrl'
    >
  >;
  let service: WorkspaceDomainsService;
  let isMultiWorkspaceEnabled: boolean;

  beforeEach(() => {
    isMultiWorkspaceEnabled = true;
    workspaceRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    publicDomainRepository = {
      findOne: jest.fn(),
    };
    domainServerConfigService = {
      getFrontUrl: jest.fn(() => new URL('https://prospectengine.com')),
      getSubdomainAndDomainFromUrl: jest.fn((origin: string) => {
        const hostname = new URL(origin).hostname;

        if (hostname.endsWith('.prospectengine.com')) {
          return {
            subdomain: hostname.replace('.prospectengine.com', ''),
            domain: null,
            isPublicDomainOrigin: false,
          };
        }

        return {
          subdomain: undefined,
          domain: hostname,
          isPublicDomainOrigin: false,
        };
      }),
    };

    const twentyConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, unknown> = {
          TEAM_WORKSPACE_DOMAIN_ALIASES: {
            'team.prospectengine.com': PROSPECT_ENGINE_WORKSPACE_ID,
          },
          IS_MULTIWORKSPACE_ENABLED: isMultiWorkspaceEnabled,
          DEFAULT_SUBDOMAIN: 'login',
        };

        return config[key];
      }),
    } as unknown as TwentyConfigService;

    service = new WorkspaceDomainsService(
      domainServerConfigService as unknown as DomainServerConfigService,
      twentyConfigService,
      workspaceRepository as unknown as Repository<WorkspaceEntity>,
      publicDomainRepository as unknown as Repository<PublicDomainEntity>,
    );
  });

  it('resolves an exact configured alias by immutable workspace id', async () => {
    workspaceRepository.findOne.mockResolvedValue(prospectEngineWorkspace);

    const result = await service.resolveWorkspaceAndPublicDomain(
      'https://TEAM.prospectengine.com./team/sales/today',
    );

    expect(result).toEqual({
      workspace: prospectEngineWorkspace,
      publicDomain: null,
      isIsolatedOrigin: false,
    });
    expect(workspaceRepository.findOne).toHaveBeenCalledWith({
      where: { id: PROSPECT_ENGINE_WORKSPACE_ID },
      relations: ['workspaceSSOIdentityProviders'],
    });
    expect(
      domainServerConfigService.getSubdomainAndDomainFromUrl,
    ).not.toHaveBeenCalled();
  });

  it('fails closed when a configured alias points to a missing workspace', async () => {
    workspaceRepository.findOne.mockResolvedValue(null);

    const result = await service.resolveWorkspaceAndPublicDomain(
      'https://team.prospectengine.com',
    );

    expect(result.workspace).toBeUndefined();
    expect(workspaceRepository.findOne).toHaveBeenCalledTimes(1);
    expect(
      domainServerConfigService.getSubdomainAndDomainFromUrl,
    ).not.toHaveBeenCalled();
  });

  it('resolves the alias by id in the current single-workspace topology', async () => {
    isMultiWorkspaceEnabled = false;
    workspaceRepository.findOne.mockResolvedValue(prospectEngineWorkspace);

    const result = await service.resolveWorkspaceAndPublicDomain(
      'https://team.prospectengine.com',
    );

    expect(result.workspace?.id).toBe(PROSPECT_ENGINE_WORKSPACE_ID);
    expect(workspaceRepository.find).not.toHaveBeenCalled();
  });

  it('preserves ordinary app subdomain resolution', async () => {
    workspaceRepository.findOne.mockResolvedValue(prospectEngineWorkspace);

    const result = await service.resolveWorkspaceAndPublicDomain(
      'https://app.prospectengine.com',
    );

    expect(result.workspace).toBe(prospectEngineWorkspace);
    expect(workspaceRepository.findOne).toHaveBeenCalledWith({
      where: { subdomain: 'app' },
      relations: ['workspaceSSOIdentityProviders'],
    });
  });

  it('preserves the canonical app login in single-workspace mode', async () => {
    isMultiWorkspaceEnabled = false;
    workspaceRepository.find.mockResolvedValue([prospectEngineWorkspace]);

    const result = await service.resolveWorkspaceAndPublicDomain(
      'https://app.prospectengine.com',
    );

    expect(result.workspace).toBe(prospectEngineWorkspace);
    expect(workspaceRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
      relations: ['workspaceSSOIdentityProviders'],
    });
  });

  it('advertises the alias only while serving its configured workspace', () => {
    expect(
      service.getWorkspaceUrlsForOrigin(
        prospectEngineWorkspace,
        'https://team.prospectengine.com',
      ),
    ).toEqual({
      customUrl: 'https://team.prospectengine.com/',
      subdomainUrl: 'https://app.prospectengine.com/',
    });

    expect(
      service.getWorkspaceUrlsForOrigin(
        prospectEngineWorkspace,
        'https://app.prospectengine.com',
      ),
    ).toEqual({
      customUrl: undefined,
      subdomainUrl: 'https://app.prospectengine.com/',
    });

    expect(
      service.isTeamWorkspaceDomainAliasForWorkspace({
        workspaceId: PROSPECT_ENGINE_WORKSPACE_ID,
        origin: 'https://team.prospectengine.com',
      }),
    ).toBe(true);
    expect(
      service.isTeamWorkspaceDomainAliasForWorkspace({
        workspaceId: PROSPECT_ENGINE_WORKSPACE_ID,
        origin: 'https://app.prospectengine.com',
      }),
    ).toBe(false);
    expect(service.isTeamWorkspaceId(PROSPECT_ENGINE_WORKSPACE_ID)).toBe(true);
    expect(
      service.isTeamWorkspaceId('550e8400-e29b-41d4-a716-446655440000'),
    ).toBe(false);
  });

  it('builds a direct team URL only for the immutable configured workspace', () => {
    expect(
      service
        .buildTeamWorkspaceDomainAliasURL({
          workspace: prospectEngineWorkspace,
          pathname: '/invite/workspace-invite-hash',
          searchParams: {
            inviteToken: 'invitation-token',
          },
        })
        .toString(),
    ).toBe(
      'https://team.prospectengine.com/invite/workspace-invite-hash?inviteToken=invitation-token',
    );

    expect(
      service.getWorkspaceUrlsForTeamWorkspaceDomainAlias({
        ...prospectEngineWorkspace,
        id: '550e8400-e29b-41d4-a716-446655440000',
        subdomain: 'client',
      }),
    ).toEqual({
      customUrl: undefined,
      subdomainUrl: 'https://client.prospectengine.com/',
    });
  });
});
