/* global HTMLElement -- DOM types; src/ configures no browser globals */
import { shallowRef, type Component } from 'vue';

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

// The trigger focus is being returned to. A trigger shows no preview for the
// focus it is given back, because the user did not move there (D284).
export const restoringFocus = shallowRef<HTMLElement | null>(null);

export function openPanel(content: PanelContent): void {
  serial += 1;
  current.value = { ...content, serial };
}

// Opens the panel for a trigger, or closes it when it is that trigger's own.
export function togglePanel(content: PanelContent): void {
  if (current.value?.owner === content.owner) closePanel();
  else openPanel(content);
}

export function closePanel(
  options: { returnFocus: boolean } = { returnFocus: true },
): void {
  const trigger = current.value?.trigger;
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
