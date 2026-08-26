import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { isNonEmptyString } from '@sniptt/guards';
import { assertIsDefinedOrThrow, isDefined } from 'twenty-shared/utils';
import { Repository } from 'typeorm';

import { DomainServerConfigService } from 'src/engine/core-modules/domain/domain-server-config/services/domain-server-config.service';
import { buildUrlWithPathnameAndSearchParams } from 'src/engine/core-modules/domain/domain-server-config/utils/build-url-with-pathname-and-search-params.util';
import { WorkspaceDomainConfig } from 'src/engine/core-modules/domain/workspace-domains/types/workspace-domain-config.type';
import {
  normalizeWorkspaceDomainAliasHostname,
  parseTeamWorkspaceDomainAliases,
} from 'src/engine/core-modules/domain/workspace-domains/utils/parse-workspace-domain-aliases.util';
import { PublicDomainEntity } from 'src/engine/core-modules/public-domain/public-domain.entity';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceNotFoundDefaultError } from 'src/engine/core-modules/workspace/workspace.exception';
import { SEED_APPLE_WORKSPACE_ID } from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';

@Injectable()
export class WorkspaceDomainsService {
  private readonly workspaceDomainAliases: ReadonlyMap<string, string>;

  constructor(
    private readonly domainServerConfigService: DomainServerConfigService,
    private readonly twentyConfigService: TwentyConfigService,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    // Request routing resolves workspace via the public domain registry.
    // eslint-disable-next-line twenty/prefer-workspace-scoped-repository
    @InjectRepository(PublicDomainEntity)
    private readonly publicDomainRepository: Repository<PublicDomainEntity>,
  ) {
    this.workspaceDomainAliases = parseTeamWorkspaceDomainAliases(
      this.twentyConfigService.get('TEAM_WORKSPACE_DOMAIN_ALIASES'),
    );
  }

  buildWorkspaceURL({
    workspace,
    pathname,
    searchParams,
    hash,
  }: {
    workspace: WorkspaceDomainConfig;
    pathname?: string;
    searchParams?: Record<string, string | number | boolean>;
    hash?: string;
  }) {
    const workspaceUrls = this.getWorkspaceUrls(workspace);

    const url = buildUrlWithPathnameAndSearchParams({
      baseUrl: new URL(workspaceUrls.customUrl ?? workspaceUrls.subdomainUrl),
      pathname,
      searchParams,
      hash,
    });

    return url;
  }

  buildTeamWorkspaceDomainAliasURL({
    workspace,
    pathname,
    searchParams,
    hash,
  }: {
    workspace: WorkspaceDomainConfig & Pick<WorkspaceEntity, 'id'>;
    pathname?: string;
    searchParams?: Record<string, string | number | boolean>;
    hash?: string;
  }) {
    const workspaceUrls =
      this.getWorkspaceUrlsForTeamWorkspaceDomainAlias(workspace);

    return buildUrlWithPathnameAndSearchParams({
      baseUrl: new URL(workspaceUrls.customUrl ?? workspaceUrls.subdomainUrl),
      pathname,
      searchParams,
      hash,
    });
  }

  computeWorkspaceRedirectErrorUrl(
    errorMessage: string,
    workspace: WorkspaceDomainConfig,
    pathname: string,
  ) {
    const url = this.buildWorkspaceURL({
      workspace,
      pathname,
      searchParams: { errorMessage },
    });

    return url.toString();
  }

  private async getDefaultWorkspace() {
    if (this.twentyConfigService.get('IS_MULTIWORKSPACE_ENABLED')) {
      throw new Error(
        'Default workspace does not exist when multi-workspace is enabled',
      );
    }

    const workspaces = await this.workspaceRepository.find({
      order: {
        createdAt: 'DESC',
      },
      relations: ['workspaceSSOIdentityProviders'],
    });

    if (workspaces.length > 1) {
      Logger.warn(
        `${workspaces.length} workspaces found in database. In single-workspace mode, there should be only one workspace. The Apple seed workspace will be used as fallback if present.`,
      );
    }

    const foundWorkspace =
      workspaces.find(
        (workspace) => workspace.id === SEED_APPLE_WORKSPACE_ID,
      ) ?? workspaces[0];

    assertIsDefinedOrThrow(foundWorkspace, WorkspaceNotFoundDefaultError);

    return foundWorkspace;
  }

  async getWorkspaceByOriginOrDefaultWorkspace(origin: string) {
    const { workspace } = await this.resolveWorkspaceAndPublicDomain(origin);

    return workspace;
  }

  async resolveWorkspaceAndPublicDomain(origin: string): Promise<{
    workspace: WorkspaceEntity | undefined;
    publicDomain: PublicDomainEntity | null;
    isIsolatedOrigin: boolean;
  }> {
    const aliasWorkspaceId = this.getAliasWorkspaceIdFromOrigin(origin);

    if (isDefined(aliasWorkspaceId)) {
      const workspace =
        (await this.workspaceRepository.findOne({
          where: { id: aliasWorkspaceId },
          relations: ['workspaceSSOIdentityProviders'],
        })) ?? undefined;

      // A configured alias is authoritative. If its immutable target no
      // longer exists, fail closed instead of falling through to a mutable
      // subdomain or custom-domain record with the same hostname.
      return {
        workspace,
        publicDomain: null,
        isIsolatedOrigin: false,
      };
    }

    const { subdomain, domain, isPublicDomainOrigin } =
      this.domainServerConfigService.getSubdomainAndDomainFromUrl(origin);

    if (!this.twentyConfigService.get('IS_MULTIWORKSPACE_ENABLED')) {
      // Single-workspace: workspace is always the default. Still resolve a
      // matching public domain so the route trigger can scope by application.
      const publicDomain = isDefined(domain)
        ? await this.publicDomainRepository.findOne({ where: { domain } })
        : null;

      return {
        workspace: await this.getDefaultWorkspace(),
        publicDomain: publicDomain ?? null,
        isIsolatedOrigin: isPublicDomainOrigin || isDefined(publicDomain),
      };
    }

    if (isPublicDomainOrigin) {
      const hostname = new URL(origin).hostname;

      const registeredPublicDomain = await this.publicDomainRepository.findOne({
        where: { domain: hostname },
        relations: ['workspace', 'workspace.workspaceSSOIdentityProviders'],
      });

      if (isDefined(registeredPublicDomain)) {
        return {
          workspace: registeredPublicDomain.workspace ?? undefined,
          publicDomain: registeredPublicDomain,
          isIsolatedOrigin: true,
        };
      }

      const workspaceFromSubdomain = isDefined(subdomain)
        ? ((await this.workspaceRepository.findOne({
            where: { subdomain },
            relations: ['workspaceSSOIdentityProviders'],
          })) ?? undefined)
        : undefined;

      return {
        workspace: workspaceFromSubdomain,
        publicDomain: null,
        isIsolatedOrigin: true,
      };
    }

    if (!domain && !subdomain) {
      return {
        workspace: undefined,
        publicDomain: null,
        isIsolatedOrigin: false,
      };
    }

    const where = isDefined(domain) ? { customDomain: domain } : { subdomain };

    const workspaceFromCustomDomainOrSubdomain =
      (await this.workspaceRepository.findOne({
        where,
        relations: ['workspaceSSOIdentityProviders'],
      })) ?? undefined;

    if (isDefined(workspaceFromCustomDomainOrSubdomain) || !isDefined(domain)) {
      return {
        workspace: workspaceFromCustomDomainOrSubdomain,
        publicDomain: null,
        isIsolatedOrigin: false,
      };
    }

    const publicDomain = await this.publicDomainRepository.findOne({
      where: { domain },
      relations: ['workspace', 'workspace.workspaceSSOIdentityProviders'],
    });

    return {
      workspace: publicDomain?.workspace ?? undefined,
      publicDomain: publicDomain ?? null,
      isIsolatedOrigin: isDefined(publicDomain),
    };
  }

  buildPublicFunctionBaseUrl({
    workspace,
    primaryPublicDomain,
  }: {
    workspace: Pick<WorkspaceEntity, 'subdomain'>;
    primaryPublicDomain?: string | null;
  }): string | undefined {
    if (isNonEmptyString(primaryPublicDomain)) {
      return `https://${primaryPublicDomain}`;
    }

    const publicBaseHostname =
      this.domainServerConfigService.getPublicBaseHostnameOrUndefined();

    if (!isNonEmptyString(publicBaseHostname)) {
      return undefined;
    }

    const url = this.domainServerConfigService.getPublicDomainUrl();

    url.hostname = `${workspace.subdomain}.${publicBaseHostname}`;

    return url.origin;
  }

  buildPublicFunctionUrl({
    workspace,
    path,
  }: {
    workspace: Pick<WorkspaceEntity, 'subdomain'>;
    path: string;
  }): string | undefined {
    const baseUrl = this.buildPublicFunctionBaseUrl({ workspace });

    if (!isDefined(baseUrl)) {
      return undefined;
    }

    return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private getCustomWorkspaceUrl(customDomain: string) {
    const url = this.domainServerConfigService.getFrontUrl();

    url.hostname = customDomain;

    return url.toString();
  }

  private getAliasWorkspaceIdFromOrigin(origin: string): string | undefined {
    const hostname = normalizeWorkspaceDomainAliasHostname(
      new URL(origin).hostname,
    );

    return this.workspaceDomainAliases.get(hostname);
  }

  private getTeamWorkspaceDomainAliasHostname(
    workspaceId: string,
  ): string | undefined {
    const normalizedWorkspaceId = workspaceId.trim().toLowerCase();
    const matchingAliases = [...this.workspaceDomainAliases.entries()].filter(
      ([, aliasWorkspaceId]) => aliasWorkspaceId === normalizedWorkspaceId,
    );

    // An ambiguous configuration must not pick an arbitrary login origin.
    return matchingAliases.length === 1 ? matchingAliases[0][0] : undefined;
  }

  private getTwentyWorkspaceUrl(subdomain: string) {
    const url = this.domainServerConfigService.getFrontUrl();

    url.hostname = this.twentyConfigService.get('IS_MULTIWORKSPACE_ENABLED')
      ? `${subdomain}.${url.hostname}`
      : url.hostname;

    return url.toString();
  }

  getSubdomainAndCustomDomainFromWorkspaceFallbackOnDefaultSubdomain(
    workspace?: WorkspaceDomainConfig | null,
  ) {
    if (!workspace) {
      return {
        subdomain: this.twentyConfigService.get('DEFAULT_SUBDOMAIN'),
        customDomain: null,
        isCustomDomainEnabled: false,
      };
    }

    if (!workspace.isCustomDomainEnabled) {
      return {
        subdomain: workspace.subdomain,
        customDomain: null,
        isCustomDomainEnabled: false,
      };
    }

    return workspace;
  }

  getWorkspaceUrls({
    subdomain,
    customDomain,
    isCustomDomainEnabled,
  }: WorkspaceDomainConfig) {
    return {
      customUrl:
        isCustomDomainEnabled && customDomain
          ? this.getCustomWorkspaceUrl(customDomain)
          : undefined,
      subdomainUrl: this.getTwentyWorkspaceUrl(subdomain),
    };
  }

  getWorkspaceUrlsForTeamWorkspaceDomainAlias(
    workspace: WorkspaceDomainConfig & Pick<WorkspaceEntity, 'id'>,
  ) {
    const workspaceUrls = this.getWorkspaceUrls(workspace);
    const aliasHostname = this.getTeamWorkspaceDomainAliasHostname(
      workspace.id,
    );

    if (!isDefined(aliasHostname)) {
      return workspaceUrls;
    }

    return {
      ...workspaceUrls,
      customUrl: this.getCustomWorkspaceUrl(aliasHostname),
    };
  }

  getWorkspaceUrlsForOrigin(
    workspace: WorkspaceDomainConfig & Pick<WorkspaceEntity, 'id'>,
    origin: string,
  ) {
    const aliasWorkspaceId = this.getAliasWorkspaceIdFromOrigin(origin);
    const workspaceUrls = this.getWorkspaceUrls(workspace);

    if (aliasWorkspaceId !== workspace.id) {
      return workspaceUrls;
    }

    const aliasHostname = normalizeWorkspaceDomainAliasHostname(
      new URL(origin).hostname,
    );

    return {
      ...workspaceUrls,
      customUrl: this.getCustomWorkspaceUrl(aliasHostname),
    };
  }

  isTeamWorkspaceDomainAliasForWorkspace({
    workspaceId,
    origin,
  }: {
    workspaceId: string;
    origin: string;
  }): boolean {
    return this.getAliasWorkspaceIdFromOrigin(origin) === workspaceId;
  }

  isTeamWorkspaceId(workspaceId: string): boolean {
    const normalizedWorkspaceId = workspaceId.trim().toLowerCase();

    return [...this.workspaceDomainAliases.values()].some(
      (aliasWorkspaceId) => aliasWorkspaceId === normalizedWorkspaceId,
    );
  }

  async findByCustomDomain(customDomain: string) {
    return this.workspaceRepository.findOne({ where: { customDomain } });
  }
}
