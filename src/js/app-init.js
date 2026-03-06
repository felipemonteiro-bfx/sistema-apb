import {
  setActiveMenuItem,
  setupSyncIndicator,
  initSidebarMobile,
  initTheme,
  initKeyboardShortcuts,
} from './utils.js';
import { loadSearchData, initGlobalSearch } from './search.js';
import { initAssistente } from './assistente.js';

/** Inicialização centralizada: componentes, tema, busca e assistente. */
export async function initApp(activeMenu) {
  try {
    const [navbarRes, sidebarRes] = await Promise.all([
      fetch('../components/navbar.html'),
      fetch('../components/sidebar.html'),
    ]);
    const navbarHtml = await navbarRes.text();
    const sidebarHtml = await sidebarRes.text();

    const navbarEl = document.getElementById('navbar-container');
    const sidebarEl = document.getElementById('sidebar-container');
    if (navbarEl) navbarEl.innerHTML = navbarHtml;
    if (sidebarEl) sidebarEl.innerHTML = sidebarHtml;

    setActiveMenuItem(activeMenu);
    initTheme();
    initKeyboardShortcuts();
    setupSyncIndicator();
    initSidebarMobile();
    initAssistente();
    await loadSearchData();
    initGlobalSearch();
  } catch (error) {
    console.error('Erro ao carregar componentes:', error);
  }
}
