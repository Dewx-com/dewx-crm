import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { ThemeProvider } from 'twenty-ui/theme-constants';

import { DocumentViewer } from '@/activities/files/components/DocumentViewer';
import { downloadFile } from '@/activities/files/utils/downloadFile';
import { domainConfigurationState } from '@/domain-manager/states/domainConfigurationState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

jest.mock('@linaria/react', () => ({
  styled: new Proxy((component: unknown) => () => component, {
    get: (_target, tag: string) => () => tag,
  }),
}));
jest.mock('@linaria/core', () => ({ css: () => '' }));
jest.mock('@/activities/files/utils/downloadFile', () => ({
  downloadFile: jest.fn(),
}));
jest.mock('@cyntler/react-doc-viewer', () => ({
  __esModule: true,
  default: () => <div>Document preview</div>,
  DocViewerRenderers: [],
}));

dynamicActivate(SOURCE_LOCALE);

const renderDocument = (name: string) =>
  render(
    <JotaiProvider store={jotaiStore}>
      <ThemeProvider colorScheme="light">
        <I18nProvider i18n={i18n}>
          <DocumentViewer
            documentName={name}
            documentUrl="https://app.example.com/file/files-field/file-id?token=signed"
          />
        </I18nProvider>
      </ThemeProvider>
    </JotaiProvider>,
  );

describe('private account document previews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetJotaiStore();
    jotaiStore.set(domainConfigurationState.atom, {
      frontDomain: 'example.com',
      isSharedDomainEnabled: true,
    });
  });

  it('offers a working download instead of sending a private Office URL to an external previewer', () => {
    renderDocument('proposal.docx');
    expect(screen.queryByText('Document preview')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Download/ }));
    expect(downloadFile).toHaveBeenCalledWith(
      'https://app.example.com/file/files-field/file-id?token=signed',
      'proposal.docx',
    );
  });

  it('keeps browser-rendered PDF previews', () => {
    renderDocument('proposal.pdf');
    expect(screen.getByText('Document preview')).toBeInTheDocument();
  });

  it('keeps existing Office previews outside shared-host mode', () => {
    jotaiStore.set(domainConfigurationState.atom, {
      frontDomain: 'example.com',
      isSharedDomainEnabled: false,
    });
    renderDocument('proposal.docx');
    expect(screen.getByText('Document preview')).toBeInTheDocument();
  });
});
