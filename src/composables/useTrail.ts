import { onScopeDispose, shallowRef } from 'vue';
import type { Crumb, CrumbLabel, CrumbPart } from '../components/crumbs.ts';

// One navigation trail for the whole application (D380 to D384): the screens
// the reader came through, oldest first, each a link back to the exact place
// it was left (its path and query). It lives in memory only.

// A crumb in the trail: its label as it was when the screen was left, the
// screen's path, which identifies the screen, and the location to go back to.
export type TrailCrumb = Crumb & {
  path: string;
  to: { path: string; query: Record<string, unknown> };
};

// The next trail for a navigation (D380, D381). A navigation the sidebar caused
// starts afresh; one that stays on the same path changes nothing; one that
// opens a screen the trail holds cuts the trail back to before it; any other
// appends the screen being left. Nothing is ever dropped otherwise (D383).
export function nextTrail(
  trail: TrailCrumb[],
  leaving: TrailCrumb | null,
  toPath: string,
  fromSidebar: boolean,
): TrailCrumb[] {
  if (fromSidebar) return [];
  if (leaving === null || leaving.path === toPath) return trail;
  const held = trail.findIndex((crumb) => crumb.path === toPath);
  if (held >= 0) return trail.slice(0, held);
  return [...trail, leaving];
}

export const trail = shallowRef<TrailCrumb[]>([]);

// What the screen on show says of itself: its crumb label (a fixed generic name
// until its data has loaded, D382) and the screens above it, shown when the
// trail is empty (D157, D173).
export type Screen = {
  label: () => CrumbLabel;
  parents: () => Crumb[];
};

export type RegisteredScreen = Screen & { release(): void };

export const currentScreen = shallowRef<RegisteredScreen | null>(null);

// Called once from a screen's `script setup`; released with the screen.
export function registerScreen(screen: Screen): void {
  const registered: RegisteredScreen = {
    ...screen,
    release: () => {
      // A screen that went away after the next one registered leaves it be.
      if (currentScreen.value === registered) currentScreen.value = null;
    },
  };
  currentScreen.value = registered;
  onScopeDispose(registered.release);
}

// The sidebar marks the navigation it starts, so the trail starts afresh
// (D381); the router hook reads and clears the mark.
let sidebarNavigation = false;

export function markSidebarNavigation(): void {
  sidebarNavigation = true;
}

export function takeSidebarNavigation(): boolean {
  const marked = sidebarNavigation;
  sidebarNavigation = false;
  return marked;
}

// A crumb that was used, so the screen it opens gets focus on its main
// heading once it shows (D384).
let crumbNavigation = false;

export function markCrumbNavigation(): void {
  crumbNavigation = true;
}

export function takeCrumbNavigation(): boolean {
  const marked = crumbNavigation;
  crumbNavigation = false;
  return marked;
}

// A label from a catalog message whose named values are parts of their own,
// each with its language, so a served part keeps it (D370, D382).
export function labelParts(
  message: (values: Record<string, string>) => string,
  values: Record<string, CrumbPart>,
): CrumbPart[] {
  // A private-use character marks where each value goes in the message.
  const mark = (name: string) => `\u{e000}${name}\u{e000}`;
  const text = message(
    Object.fromEntries(Object.keys(values).map((name) => [name, mark(name)])),
  );
  return text
    .split(/\u{e000}(\w+)\u{e000}/u)
    .map((piece, index) =>
      index % 2 === 1
        ? (values[piece] ?? { text: piece, lang: null })
        : { text: piece, lang: null },
    )
    .filter((part) => part.text !== '');
}
