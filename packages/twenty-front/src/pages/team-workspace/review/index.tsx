import '@fontsource/dm-mono/400.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import 'twenty-ui/style.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';
import '../../../index.css';

import ReactDOM from 'react-dom/client';

import { TeamWorkspaceReviewApp } from './TeamWorkspaceReviewApp';

const root = ReactDOM.createRoot(
  document.getElementById('root') ?? document.body,
);

root.render(<TeamWorkspaceReviewApp />);
