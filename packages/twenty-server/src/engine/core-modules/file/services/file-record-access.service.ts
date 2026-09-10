import { Injectable } from '@nestjs/common';

import { FieldMetadataType } from 'twenty-shared/types';
import { Raw } from 'typeorm';

import { type RawAuthContext } from 'src/engine/core-modules/auth/types/raw-auth-context.type';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { buildApiKeyAuthContext } from 'src/engine/core-modules/auth/utils/build-api-key-auth-context.util';
import { buildApplicationAuthContext } from 'src/engine/core-modules/auth/utils/build-application-auth-context.util';
import { buildUserAuthContext } from 'src/engine/core-modules/auth/utils/build-user-auth-context.util';
import { FileEntity } from 'src/engine/core-modules/file/entities/file.entity';
import { FILE_STATUS } from 'src/engine/core-modules/file/types/file-status.types';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { isMorphOrRelationFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-morph-or-relation-flat-field-metadata.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { getWorkspaceContext } from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { resolveRolePermissionConfig } from 'src/engine/twenty-orm/utils/resolve-role-permission-config.util';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

@Injectable()
export class FileRecordAccessService {
  constructor(
    @InjectWorkspaceScopedRepository(FileEntity)
    private readonly fileRepository: WorkspaceScopedRepository<FileEntity>,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async canRead(fileId: string, rawAuth: RawAuthContext): Promise<boolean> {
    const {
      workspace,
      apiKey,
      application,
      user,
      userWorkspaceId,
      workspaceMemberId,
      workspaceMember,
    } = rawAuth;
    if (!workspace) return false;

    let auth: WorkspaceAuthContext;
    if (apiKey) {
      auth = buildApiKeyAuthContext({ workspace, apiKey });
    } else if (
      user &&
      userWorkspaceId &&
      workspaceMemberId &&
      workspaceMember
    ) {
      auth = buildUserAuthContext({
        workspace,
        user,
        userWorkspaceId,
        workspaceMemberId,
        workspaceMember,
        application,
      });
    } else if (application) {
      auth = buildApplicationAuthContext({ workspace, application });
    } else {
      return false;
    }

    const file = await this.fileRepository.findOne(workspace.id, {
      where: { id: fileId },
    });
    if (!file || file.status !== FILE_STATUS.UPLOADED) return false;

    const { flatFieldMetadataMaps, flatObjectMetadataMaps } =
      await this.workspaceCacheService.getOrRecompute(workspace.id, [
        'flatFieldMetadataMaps',
        'flatObjectMetadataMaps',
      ]);
    const field =
      flatFieldMetadataMaps.byUniversalIdentifier[file.path.split('/')[1]];
    if (!field || field.type !== FieldMetadataType.FILES) return false;
    const object = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: field.objectMetadataId,
      flatEntityMaps: flatObjectMetadataMaps,
    });
    if (!object) return false;

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const { userWorkspaceRoleMap, apiKeyRoleMap } = getWorkspaceContext();
        const permissions = resolveRolePermissionConfig({
          authContext: auth,
          userWorkspaceRoleMap,
          apiKeyRoleMap,
        });
        if (!permissions) return false;
        const repository = await this.globalWorkspaceOrmManager.getRepository(
          workspace.id,
          object.nameSingular,
          permissions,
        );
        const targets =
          object.nameSingular === 'attachment'
            ? Object.values(
                flatFieldMetadataMaps.byUniversalIdentifier,
              ).flatMap((candidate) => {
                if (
                  !candidate ||
                  candidate.objectMetadataId !== object.id ||
                  !isMorphOrRelationFlatFieldMetadata(candidate) ||
                  !candidate.name.startsWith('target') ||
                  !candidate.settings.joinColumnName
                )
                  return [];
                return [
                  {
                    column: candidate.settings.joinColumnName,
                    objectId: candidate.relationTargetObjectMetadataId,
                  },
                ];
              })
            : [];
        const select = {
          id: true,
          [field.name]: true,
          ...Object.fromEntries(targets.map((target) => [target.column, true])),
        };

        // ponytail: one JSON containment lookup in the file's own field; add a
        // reference index if attachment volume makes this scan material.
        const record = await repository.findOne({
          select,
          where: {
            [field.name]: Raw((column) => `${column} @> :requestedFile`, {
              requestedFile: JSON.stringify([{ fileId }]),
            }),
          },
        });

        // Before attachment, the native upload preview still needs to work. The
        // query above checks the field permission even when it finds no record.
        if (!record) return file.settings?.isTemporaryFile === true;

        for (const target of targets) {
          const parentId = record[target.column];
          if (!parentId) continue;
          const parent = findFlatEntityByIdInFlatEntityMaps({
            flatEntityId: target.objectId,
            flatEntityMaps: flatObjectMetadataMaps,
          });
          if (!parent) return false;
          const parentRepository =
            await this.globalWorkspaceOrmManager.getRepository(
              workspace.id,
              parent.nameSingular,
              permissions,
            );
          if (
            !(await parentRepository.findOne({
              select: { id: true },
              where: { id: parentId },
            }))
          )
            return false;
        }
        return true;
      },
      auth,
    );
  }
}
