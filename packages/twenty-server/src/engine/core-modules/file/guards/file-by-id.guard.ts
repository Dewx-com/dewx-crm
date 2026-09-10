import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { type Request } from 'express';
import { FileFolder } from 'twenty-shared/types';

import {
  fileFolderConfigs,
  requiresFileSession,
} from 'src/engine/core-modules/file/interfaces/file-folder.interface';

import { AccessTokenService } from 'src/engine/core-modules/auth/token/services/access-token.service';
import { FileTokenJwtPayload } from 'src/engine/core-modules/auth/types/file-token-jwt-payload.type';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { JwtWrapperService } from 'src/engine/core-modules/jwt/services/jwt-wrapper.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { FileRecordAccessService } from 'src/engine/core-modules/file/services/file-record-access.service';

export const SUPPORTED_FILE_FOLDERS = [
  FileFolder.CorePicture,
  FileFolder.FilesField,
  FileFolder.Workflow,
  FileFolder.AgentChat,
  FileFolder.EmailAttachment,
  FileFolder.EmailImage,
  FileFolder.AppTarball,
  FileFolder.Dpa,
] as const;

export type SupportedFileFolder = (typeof SUPPORTED_FILE_FOLDERS)[number];

@Injectable()
export class FileByIdGuard implements CanActivate {
  constructor(
    private readonly jwtWrapperService: JwtWrapperService,
    private readonly accessTokenService: AccessTokenService,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly fileRecordAccessService: FileRecordAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { workspaceId?: string }>();
    const fileId = request.params.id;
    const fileFolder = request.params.fileFolder as FileFolder;
    const fileToken = request.query.token;

    if (!this.isSupportedFileFolder(fileFolder)) {
      return false;
    }

    if (typeof fileToken !== 'string' || !fileToken) {
      return false;
    }

    try {
      const payload: FileTokenJwtPayload =
        await this.jwtWrapperService.verifyJwtToken(fileToken, {
          ignoreExpiration: fileFolderConfigs[fileFolder].ignoreExpirationToken,
        });

      if (
        payload.type !== JwtTokenTypeEnum.FILE ||
        !payload.workspaceId ||
        payload.fileId !== fileId
      ) {
        return false;
      }

      if (
        requiresFileSession(
          fileFolder,
          this.twentyConfigService.get('IS_SHARED_DOMAIN_ENABLED'),
        )
      ) {
        const selectedWorkspaceId = request.headers['x-workspace-id'];
        if (
          selectedWorkspaceId !== undefined &&
          selectedWorkspaceId !== payload.workspaceId
        ) {
          return false;
        }

        // Native image/download requests have no account header. The verified file
        // capability selects its cookie; the normal auth path still checks membership.
        const scopedRequest: Request = Object.create(request);
        scopedRequest.headers = {
          ...request.headers,
          'x-workspace-id': payload.workspaceId,
        };
        const authContext =
          await this.accessTokenService.validateTokenByRequest(scopedRequest);
        if (
          authContext.workspace?.id !== payload.workspaceId ||
          (!authContext.userWorkspaceId &&
            !authContext.apiKey &&
            !authContext.application)
        ) {
          return false;
        }
        if (
          fileFolder === FileFolder.FilesField &&
          !(await this.fileRecordAccessService.canRead(fileId, authContext))
        ) {
          return false;
        }
      }

      request.workspaceId = payload.workspaceId;
      return true;
    } catch {
      return false;
    }
  }

  private isSupportedFileFolder(
    fileFolder: string,
  ): fileFolder is SupportedFileFolder {
    return SUPPORTED_FILE_FOLDERS.includes(fileFolder as SupportedFileFolder);
  }
}
