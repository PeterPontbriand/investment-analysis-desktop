import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import {
  backPanel,
  closePanel,
  isPanelOpenFor,
  openPanel,
  openPanelContent,
  previousTitle,
  stepPanel,
  togglePanel,
  type PanelContent,
} from '../../src/composables/useDetailsPanel.ts';

// D362: the details panel's history. A trigger inside the panel steps to its
// content and Back restores the one it replaced; closing clears the history
// and gives focus back to the trigger outside the panel that first opened it.

const body = defineComponent({ render: () => null });

function content(title: string): PanelContent {
  const trigger = document.createElement('button');
  document.body.append(trigger);
  return { owner: {}, trigger, title, body, props: {} };
}

afterEach(() => {
  closePanel({ returnFocus: false });
  document.body.replaceChildren();
});

describe('details panel history', () => {
  it('has no Back when the panel opens from a trigger outside it', () => {
    openPanel(content('ticker ACME'));
    expect(openPanelContent.value?.title).toBe('ticker ACME');
    expect(previousTitle.value).toBeNull();
  });

  it('steps to new content and goes back to what it replaced', () => {
    const ticker = content('ticker ACME');
    const venue = content('venue term');
    openPanel(ticker);
    stepPanel(venue);
    expect(openPanelContent.value?.title).toBe('venue term');
    expect(isPanelOpenFor(venue.owner)).toBe(true);
    expect(previousTitle.value).toBe('ticker ACME');

    const stepped = openPanelContent.value?.serial;
    backPanel();
    expect(openPanelContent.value?.title).toBe('ticker ACME');
    expect(isPanelOpenFor(ticker.owner)).toBe(true);
    expect(previousTitle.value).toBeNull();
    // The restored content is shown afresh, so its heading takes focus.
    expect(openPanelContent.value?.serial).not.toBe(stepped);
  });

  it('keeps every step, with no limit', () => {
    openPanel(content('One'));
    stepPanel(content('Two'));
    stepPanel(content('Three'));
    expect(previousTitle.value).toBe('Two');
    backPanel();
    expect(previousTitle.value).toBe('One');
    backPanel();
    expect(openPanelContent.value?.title).toBe('One');
    expect(previousTitle.value).toBeNull();
  });

  it('clears the history on close and gives focus to the first trigger', () => {
    const ticker = content('ticker ACME');
    openPanel(ticker);
    stepPanel(content('venue term'));
    stepPanel(content('field term'));
    closePanel();
    expect(openPanelContent.value).toBeNull();
    expect(previousTitle.value).toBeNull();
    expect(document.activeElement).toBe(ticker.trigger);
  });

  it('starts afresh for a trigger outside the panel', () => {
    openPanel(content('ticker ACME'));
    stepPanel(content('venue term'));
    const other = content('ticker ZED');
    togglePanel(other);
    expect(openPanelContent.value?.title).toBe('ticker ZED');
    expect(previousTitle.value).toBeNull();
    closePanel();
    expect(document.activeElement).toBe(other.trigger);
  });

  it('opens the panel when a step comes with the panel closed', () => {
    stepPanel(content('field term'));
    expect(openPanelContent.value?.title).toBe('field term');
    expect(previousTitle.value).toBeNull();
  });
});
