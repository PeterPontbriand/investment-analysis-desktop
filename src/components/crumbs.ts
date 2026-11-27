import type { RouteLocationRaw } from 'vue-router';

// A part of a crumb's label: text, with its language when the engine served it
// (D370, D382).
export type CrumbPart = { text: string; lang: string | null };

// A crumb's label: the application's own text, or parts some of which are
// served text.
export type CrumbLabel = string | CrumbPart[];

// One screen in a breadcrumb trail: a label and the route it opens.
export type Crumb = { label: CrumbLabel; to: RouteLocationRaw };
