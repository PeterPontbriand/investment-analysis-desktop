import { createMemoryHistory, createRouter } from 'vue-router';
import AboutView from './views/AboutView.vue';
import RefreshesView from './views/RefreshesView.vue';
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
      { path: '/refreshes', name: 'refreshes', component: RefreshesView },
      { path: '/runs', name: 'runs', component: RunsView },
      { path: '/about', name: 'about', component: AboutView },
    ],
  });
}
