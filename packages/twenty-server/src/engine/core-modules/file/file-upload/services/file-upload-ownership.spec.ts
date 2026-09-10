import { FileUploadService } from 'src/engine/core-modules/file/file-upload/services/file-upload.service';
import { FileFolder } from 'twenty-shared/types';
import { FILE_STATUS } from 'src/engine/core-modules/file/types/file-status.types';

describe('upload confirmation ownership', () => {
  const file = {
    id: 'file',
    path: `${FileFolder.FilesField}/field/file.txt`,
    status: FILE_STATUS.UPLOADED,
    settings: {
      isTemporaryFile: true,
      uploadedByPrincipalId: 'membership:uploader',
    },
  };
  const findOne = jest.fn();
  const signFileByIdUrl = jest.fn();
  let service: FileUploadService;

  beforeEach(() => {
    findOne.mockResolvedValue(file);
    signFileByIdUrl.mockResolvedValue('signed-preview');
    service = new FileUploadService(
      {} as never,
      { signFileByIdUrl } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { findOne } as never,
    );
  });

  it.each(['membership:another', 'apiKey:uploader', undefined])(
    'does not mint a preview for another or absent principal: %s',
    async (uploadedByPrincipalId) => {
      await expect(
        service.completeFileUpload({
          workspaceId: 'account',
          fileId: 'file',
          uploadedByPrincipalId,
        }),
      ).rejects.toThrow('File not found');
      expect(signFileByIdUrl).not.toHaveBeenCalled();
    },
  );

  it('preserves idempotent confirmation for the authenticated uploader', async () => {
    expect(
      await service.completeFileUpload({
        workspaceId: 'account',
        fileId: 'file',
        uploadedByPrincipalId: 'membership:uploader',
      }),
    ).toEqual({ ...file, url: 'signed-preview' });
    expect(findOne).toHaveBeenCalledWith('account', { where: { id: 'file' } });
  });
});
