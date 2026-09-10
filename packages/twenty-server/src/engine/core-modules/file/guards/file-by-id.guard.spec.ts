import { type ExecutionContext } from '@nestjs/common';

import { type Request } from 'express';
import { FileFolder } from 'twenty-shared/types';

import { AccessTokenService } from 'src/engine/core-modules/auth/token/services/access-token.service';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { FileByIdGuard } from 'src/engine/core-modules/file/guards/file-by-id.guard';
import { JwtWrapperService } from 'src/engine/core-modules/jwt/services/jwt-wrapper.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { FileRecordAccessService } from 'src/engine/core-modules/file/services/file-record-access.service';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const otherWorkspaceId = '22222222-2222-4222-8222-222222222222';

describe('shared-host private file access', () => {
  const verifyJwtToken = jest.fn();
  const validateTokenByRequest = jest.fn();
  const get = jest.fn();
  const canRead = jest.fn();
  let guard: FileByIdGuard;
  let request: Request & { workspaceId?: string };
  let context: ExecutionContext;

  beforeEach(() => {
    verifyJwtToken.mockResolvedValue({
      type: JwtTokenTypeEnum.FILE,
      workspaceId,
      fileId: 'file-id',
    });
    validateTokenByRequest.mockResolvedValue({
      workspace: { id: workspaceId },
      userWorkspaceId: 'membership-id',
    });
    get.mockReturnValue(true);
    canRead.mockResolvedValue(true);
    guard = new FileByIdGuard(
      {
        verifyJwtToken,
        decode: () => ({
          type: JwtTokenTypeEnum.FILE,
          workspaceId,
          fileId: 'file-id',
        }),
      } as unknown as JwtWrapperService,
      { validateTokenByRequest } as unknown as AccessTokenService,
      { get } as unknown as TwentyConfigService,
      { canRead } as unknown as FileRecordAccessService,
    );
    request = {
      params: { id: 'file-id', fileFolder: FileFolder.FilesField },
      query: { token: 'signed-file-token' },
      headers: { cookie: 'account-cookies' },
    } as unknown as Request;
    context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
  });

  it('selects the signed account session for browser downloads without changing request headers', async () => {
    expect(await guard.canActivate(context)).toBe(true);
    expect(validateTokenByRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { cookie: 'account-cookies', 'x-workspace-id': workspaceId },
      }),
    );
    expect(request.headers['x-workspace-id']).toBeUndefined();
    expect(request.workspaceId).toBe(workspaceId);
  });

  it('denies the same signed link after membership removal', async () => {
    expect(await guard.canActivate(context)).toBe(true);
    validateTokenByRequest.mockRejectedValue(new Error('Membership removed'));
    expect(await guard.canActivate(context)).toBe(false);
  });

  it('rechecks record access on every download and denies revoked access', async () => {
    expect(await guard.canActivate(context)).toBe(true);
    canRead.mockResolvedValue(false);
    expect(await guard.canActivate(context)).toBe(false);
    expect(canRead).toHaveBeenCalledWith(
      'file-id',
      expect.objectContaining({ userWorkspaceId: 'membership-id' }),
    );
  });

  it('fails closed when record authorization cannot be checked', async () => {
    canRead.mockRejectedValue(new Error('Unavailable'));
    expect(await guard.canActivate(context)).toBe(false);
  });

  it.each(['missing session', 'expired session', 'authorization unavailable'])(
    'denies private downloads with %s',
    async (reason) => {
      validateTokenByRequest.mockRejectedValue(new Error(reason));
      expect(await guard.canActivate(context)).toBe(false);
    },
  );

  it('denies a valid session for a different account', async () => {
    validateTokenByRequest.mockResolvedValue({
      workspace: { id: otherWorkspaceId },
      userWorkspaceId: 'other-membership',
    });
    expect(await guard.canActivate(context)).toBe(false);
  });

  it('denies a conflicting explicit account selection', async () => {
    request.headers['x-workspace-id'] = otherWorkspaceId;
    expect(await guard.canActivate(context)).toBe(false);
    expect(validateTokenByRequest).not.toHaveBeenCalled();
  });

  it('denies an account context without an authenticated principal', async () => {
    validateTokenByRequest.mockResolvedValue({
      workspace: { id: workspaceId },
    });
    expect(await guard.canActivate(context)).toBe(false);
  });

  it.each([FileFolder.CorePicture, FileFolder.EmailImage])(
    'preserves signed public-facing assets in %s',
    async (fileFolder) => {
      request.params.fileFolder = fileFolder;
      expect(await guard.canActivate(context)).toBe(true);
      expect(validateTokenByRequest).not.toHaveBeenCalled();
    },
  );

  it('preserves signed-link behavior when shared-host mode is disabled', async () => {
    get.mockReturnValue(false);
    expect(await guard.canActivate(context)).toBe(true);
    expect(validateTokenByRequest).not.toHaveBeenCalled();
  });

  it.each([
    { type: JwtTokenTypeEnum.ACCESS, workspaceId, fileId: 'file-id' },
    { type: JwtTokenTypeEnum.FILE, workspaceId, fileId: 'different-file' },
    { type: JwtTokenTypeEnum.FILE, fileId: 'file-id' },
  ])(
    'denies a token that is not a capability for this file: %j',
    async (payload) => {
      verifyJwtToken.mockResolvedValue(payload);
      expect(await guard.canActivate(context)).toBe(false);
      expect(validateTokenByRequest).not.toHaveBeenCalled();
    },
  );

  it('denies invalid signatures before looking up a session', async () => {
    verifyJwtToken.mockRejectedValue(new Error('Invalid signature'));
    expect(await guard.canActivate(context)).toBe(false);
    expect(validateTokenByRequest).not.toHaveBeenCalled();
  });
});
