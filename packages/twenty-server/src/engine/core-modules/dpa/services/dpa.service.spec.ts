import { DpaRegion } from 'src/engine/core-modules/dpa/enums/dpa-region.enum';
import { DpaService } from 'src/engine/core-modules/dpa/services/dpa.service';

jest.mock('src/engine/core-modules/dpa/pdf/render-dpa-to-pdf.util', () => ({
  renderDpaToPdfBuffer: jest.fn(),
}));

describe('DPA deployment identity', () => {
  it.each([
    { multi: false, shared: false, isSelfHosted: true },
    { multi: true, shared: true, isSelfHosted: true },
    { multi: true, shared: false, isSelfHosted: false },
  ])(
    'preserves the correct agreement status for $multi/$shared',
    async ({ multi, shared, isSelfHosted }) => {
      const save = jest.fn();
      const writeFile = jest.fn();
      const config: Record<string, boolean> = {
        IS_MULTIWORKSPACE_ENABLED: multi,
        IS_SHARED_DOMAIN_ENABLED: shared,
      };
      const service: DpaService = Object.assign(
        Object.create(DpaService.prototype),
        {
          twentyConfigService: { get: (key: string) => config[key] },
          dpaRegionService: { getRegionForWorkspace: () => DpaRegion.EU },
          dpaAgreementRepository: { save },
          fileStorageService: { writeFile },
        },
      );
      const workspace = { id: 'synthetic-workspace' };
      const preview = service.getPreviewForWorkspace(workspace);

      expect(Boolean(preview.notice)).toBe(isSelfHosted);
      if (isSelfHosted) {
        await expect(
          service.generateSignedDpa({
            workspace,
            userId: 'synthetic-owner',
            userEmail: 'owner@example.invalid',
            input: {
              customerLegalEntityName: 'Synthetic CRM',
              signatoryName: 'Test Owner',
              signatoryTitle: 'Owner',
            },
          }),
        ).rejects.toThrow('Twenty does not host or process');
        expect(save).not.toHaveBeenCalled();
        expect(writeFile).not.toHaveBeenCalled();
      }
    },
  );
});
