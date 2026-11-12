import { createMemoryHistory, createRouter } from 'vue-router';
import HomeView from './views/HomeView.vue';

export function createAppRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', name: 'home', component: HomeView }],
  });
}
