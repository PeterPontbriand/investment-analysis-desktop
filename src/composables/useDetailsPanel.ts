/* global HTMLElement -- DOM types; src/ configures no browser globals */
import { computed, shallowRef, type Component } from 'vue';

// What the details panel shows (D285). The panel is generic: a title and a
// body component, so GUI.4c can show help content in the same panel.
export type PanelContent = {
  // Names the trigger the content belongs to, so the trigger knows whether its
  // own content is open.
  owner: object;
  // Where focus returns to when the panel closes.
  trigger: HTMLElement;
  title: string;
  // The language of the title, when it differs from the application's.
  lang?: string | null;
  body: Component;
  props: Record<string, unknown>;
};

// The one panel's element id, which every trigger's `aria-controls` names.
export const panelId = 'details-panel';

// Open content carries a serial number, so a body is made again whenever the
// content is replaced, even by another trigger with the same title.
type OpenContent = PanelContent & { serial: number };

let serial = 0;
const current = shallowRef<OpenContent | null>(null);
// The contents a trigger inside the panel replaced, oldest first, so Back can
// restore them (D362). The first one's trigger is outside the panel.
const history = shallowRef<OpenContent[]>([]);

// The trigger focus is being returned to. A trigger shows no preview for the
// focus it is given back, because the user did not move there (D284).
export const restoringFocus = shallowRef<HTMLElement | null>(null);

function show(content: PanelContent): void {
  serial += 1;
  current.value = { ...content, serial };
}

// Opens the panel for a trigger outside it, with no history.
export function openPanel(content: PanelContent): void {
  history.value = [];
  show(content);
}

// Replaces the content for a trigger inside the panel, keeping the content it
// replaces for Back (D362).
export function stepPanel(content: PanelContent): void {
  const held = current.value;
  if (held === null) {
    openPanel(content);
    return;
  }
  history.value = [...history.value, held];
  show(content);
}

// Restores the content the last step replaced.
export function backPanel(): void {
  const previous = history.value.at(-1);
  if (previous === undefined) return;
  history.value = history.value.slice(0, -1);
  show(previous);
}

// The title Back returns to; null when there is no step to go back from.
export const previousTitle = computed(
  () => history.value.at(-1)?.title ?? null,
);

// Opens the panel for a trigger, or closes it when it is that trigger's own.
export function togglePanel(content: PanelContent): void {
  if (current.value?.owner === content.owner) closePanel();
  else openPanel(content);
}

export function closePanel(
  options: { returnFocus: boolean } = { returnFocus: true },
): void {
  // Focus returns to the trigger outside the panel that first opened it.
  const trigger = (history.value[0] ?? current.value)?.trigger;
  history.value = [];
  current.value = null;
  if (options.returnFocus && trigger?.isConnected) {
    restoringFocus.value = trigger;
    trigger.focus();
    restoringFocus.value = null;
  }
}

export const isPanelOpenFor = (owner: object): boolean =>
  current.value?.owner === owner;

export const openPanelContent = current;
