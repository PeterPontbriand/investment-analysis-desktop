import { createMemoryHistory, createRouter } from 'vue-router';
import AddEntriesView from './views/AddEntriesView.vue';
import AboutView from './views/AboutView.vue';
import RefreshesView from './views/RefreshesView.vue';
import RefreshProgressView from './views/RefreshProgressView.vue';
import RefreshCompareView from './views/RefreshCompareView.vue';
import RunDetailView from './views/RunDetailView.vue';
import RunsView from './views/RunsView.vue';
import WatchlistView from './views/WatchlistView.vue';
import WatchlistsView from './views/WatchlistsView.vue';

export function createAppRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: { name: 'watchlists' } },
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
      { path: '/about', name: 'about', component: AboutView },
    ],
  });
}
