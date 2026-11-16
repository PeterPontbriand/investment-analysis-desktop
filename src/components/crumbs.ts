import type { RouteLocationRaw } from 'vue-router';

// One screen above the current one in a breadcrumb trail: a label and the
// route it opens.
export type Crumb = { label: string; to: RouteLocationRaw };
