import type { RouteLocationRaw } from 'vue-router';

// One step of a breadcrumb: a label, and the route it opens when it is not
// the current screen.
export type Crumb = { label: string; to?: RouteLocationRaw };
