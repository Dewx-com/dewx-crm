import { FieldMetadataType } from 'twenty-shared/types';

import { type RawAuthContext } from 'src/engine/core-modules/auth/types/raw-auth-context.type';
import { FileRecordAccessService } from 'src/engine/core-modules/file/services/file-record-access.service';
import { FILE_STATUS } from 'src/engine/core-modules/file/types/file-status.types';
import { getWorkspaceContext } from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';

jest.mock(
  'src/engine/twenty-orm/storage/orm-workspace-context.storage',
  () => ({ getWorkspaceContext: jest.fn() }),
);

describe('current file record access', () => {
  const auth = {
    workspace: { id: 'account' },
    user: { id: 'user' },
    userWorkspaceId: 'membership',
    workspaceMemberId: 'member',
    workspaceMember: { id: 'member' },
  } as RawAuthContext;
  const file = {
    status: FILE_STATUS.UPLOADED,
    path: 'files-field/file-field/file.txt',
    settings: { isTemporaryFile: false },
  };
  const field = {
    id: 'file-field',
    type: FieldMetadataType.FILES,
    name: 'file',
    objectMetadataId: 'attachment',
  };
  const target = {
    type: FieldMetadataType.MORPH_RELATION,
    name: 'target',
    objectMetadataId: 'attachment',
    settings: { joinColumnName: 'targetPersonId' },
    relationTargetObjectMetadataId: 'person',
  };
  const findFile = jest.fn();
  const findAttachment = jest.fn();
  const findPerson = jest.fn();
  const getRepository = jest.fn();
  let service: FileRecordAccessService;

  beforeEach(() => {
    jest
      .mocked(getWorkspaceContext)
      .mockReturnValue({
        userWorkspaceRoleMap: { membership: 'member-role' },
        apiKeyRoleMap: { key: 'api-role' },
      } as unknown as ReturnType<typeof getWorkspaceContext>);
    findFile.mockResolvedValue(file);
    findAttachment.mockResolvedValue({
      id: 'attachment-record',
      targetPersonId: 'person-record',
    });
    findPerson.mockResolvedValue({ id: 'person-record' });
    getRepository.mockImplementation((_workspace, object) =>
      Promise.resolve({
        findOne: object === 'attachment' ? findAttachment : findPerson,
      }),
    );
    service = new FileRecordAccessService(
      { findOne: findFile } as never,
      {
        getOrRecompute: async () => ({
          flatFieldMetadataMaps: {
            byUniversalIdentifier: { 'file-field': field, target },
          },
          flatObjectMetadataMaps: {
            universalIdentifierById: {
              attachment: 'attachment',
              person: 'person',
            },
            byUniversalIdentifier: {
              attachment: { id: 'attachment', nameSingular: 'attachment' },
              person: { id: 'person', nameSingular: 'person' },
            },
          },
        }),
      } as never,
      {
        getRepository,
        executeInWorkspaceContext: async (callback: () => Promise<boolean>) =>
          callback(),
      } as never,
    );
  });

  it('passes the current member role to BOTH permission-aware repositories', async () => {
    expect(await service.canRead('file', auth)).toBe(true);
    expect(getRepository.mock.calls).toEqual([
      ['account', 'attachment', { intersectionOf: ['member-role'] }],
      ['account', 'person', { intersectionOf: ['member-role'] }],
    ]);
  });

  it('denies saved links when the file record or its parent is no longer readable', async () => {
    findAttachment.mockResolvedValue(null);
    expect(await service.canRead('file', auth)).toBe(false);
    findAttachment.mockResolvedValue({
      id: 'attachment-record',
      targetPersonId: 'person-record',
    });
    findPerson.mockResolvedValue(null);
    expect(await service.canRead('file', auth)).toBe(false);
  });

  it('preserves temporary previews while enforcing field permission errors', async () => {
    findFile.mockResolvedValue({
      ...file,
      settings: { isTemporaryFile: true },
    });
    findAttachment.mockResolvedValue(null);
    expect(await service.canRead('file', auth)).toBe(true);
    findAttachment.mockRejectedValue(new Error('Field permission denied'));
    await expect(service.canRead('file', auth)).rejects.toThrow(
      'Field permission denied',
    );
  });

  it('denies a missing current role instead of running an unrestricted query', async () => {
    jest
      .mocked(getWorkspaceContext)
      .mockReturnValue({
        userWorkspaceRoleMap: {},
        apiKeyRoleMap: {},
      } as unknown as ReturnType<typeof getWorkspaceContext>);
    expect(await service.canRead('file', auth)).toBe(false);
    expect(getRepository).not.toHaveBeenCalled();
  });

  it('uses the API key role rather than a user or system context', async () => {
    expect(
      await service.canRead('file', {
        workspace: auth.workspace,
        apiKey: { id: 'key' },
      } as RawAuthContext),
    ).toBe(true);
    expect(getRepository).toHaveBeenCalledWith('account', 'person', {
      intersectionOf: ['api-role'],
    });
  });

  it('denies missing files and unfinished uploads', async () => {
    findFile.mockResolvedValue(null);
    expect(await service.canRead('file', auth)).toBe(false);
    findFile.mockResolvedValue({ ...file, status: FILE_STATUS.PENDING });
    expect(await service.canRead('file', auth)).toBe(false);
    expect(getRepository).not.toHaveBeenCalled();
  });
});
