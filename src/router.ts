import { createMemoryHistory, createRouter, START_LOCATION } from 'vue-router';
import {
  currentScreen,
  nextTrail,
  takeSidebarNavigation,
  trail,
} from './composables/useTrail.ts';
import AddEntriesView from './views/AddEntriesView.vue';
import AnalyzeView from './views/AnalyzeView.vue';
import AboutView from './views/AboutView.vue';
import GettingStartedView from './views/GettingStartedView.vue';
import HelpDocumentView from './views/HelpDocumentView.vue';
import HelpView from './views/HelpView.vue';
import RefreshesView from './views/RefreshesView.vue';
import RefreshProgressView from './views/RefreshProgressView.vue';
import RefreshCompareView from './views/RefreshCompareView.vue';
import RunDetailView from './views/RunDetailView.vue';
import RunsView from './views/RunsView.vue';
import WatchlistView from './views/WatchlistView.vue';
import WatchlistsView from './views/WatchlistsView.vue';

export function createAppRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: { name: 'watchlists' } },
      {
        path: '/getting-started',
        name: 'getting-started',
        component: GettingStartedView,
      },
      { path: '/analyze', name: 'analyze', component: AnalyzeView },
      { path: '/watchlists', name: 'watchlists', component: WatchlistsView },
      {
        path: '/watchlists/:watchlistId',
        name: 'watchlist',
        component: WatchlistView,
      },
      {
        path: '/watchlists/:watchlistId/add',
        name: 'watchlist-add',
        component: AddEntriesView,
      },
      { path: '/refreshes', name: 'refreshes', component: RefreshesView },
      {
        path: '/refreshes/:refreshId',
        name: 'refresh',
        component: RefreshCompareView,
      },
      {
        path: '/refreshes/:refreshId/progress',
        name: 'refresh-progress',
        component: RefreshProgressView,
      },
      { path: '/runs', name: 'runs', component: RunsView },
      { path: '/runs/:runId', name: 'run', component: RunDetailView },
      { path: '/help', name: 'help', component: HelpView },
      {
        path: '/help/documents/:documentId',
        name: 'help-document',
        component: HelpDocumentView,
      },
      { path: '/about', name: 'about', component: AboutView },
    ],
  });
  // Keeps the one navigation trail (D380, D381): the screen being left, as it
  // labels itself now and at its full location, joins the trail, unless the
  // sidebar started the navigation or the path stays the same.
  router.beforeEach((to, from) => {
    const fromSidebar = takeSidebarNavigation();
    const screen = currentScreen.value;
    const leaving =
      from === START_LOCATION || screen === null
        ? null
        : {
            label: screen.label(),
            path: from.path,
            to: { path: from.path, query: { ...from.query } },
          };
    trail.value = nextTrail(trail.value, leaving, to.path, fromSidebar);
  });
  // A sidebar click that made no navigation (a modifier key, say) leaves no
  // mark behind for the next one.
  router.afterEach(() => {
    takeSidebarNavigation();
  });
  return router;
}
