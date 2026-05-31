import { setupBackground } from './background.js';
import { content } from './content.js';
import { renderPage } from './render.js';
import { setupSearchLoader } from './search-loader.js';
import { setupTheme } from './theme.js';

const pageKey = (document.body?.dataset.page || 'home').toLowerCase();
const theme = setupTheme();

renderPage(pageKey, content);
setupSearchLoader(content, pageKey);
setupBackground(theme.getTheme);
