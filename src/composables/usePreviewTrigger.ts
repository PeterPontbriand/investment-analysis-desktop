/* global document, setTimeout, clearTimeout, HTMLElement, PointerEvent, KeyboardEvent -- DOM types and timers; src/ configures no browser globals */
import { onBeforeUnmount, ref, watch } from 'vue';
import { showPreviews } from '../preferences.ts';
import { restoringFocus } from './useDetailsPanel.ts';

// How long the pointer rests on a trigger before its preview opens, and how
// long the preview stays when the pointer leaves, so it can cross the gap to
// the popup (D284).
export const hoverDelay = 500;
export const leaveDelay = 100;

// The behaviour of a preview popup (D284, WCAG 1.4.13): opens after a rest of
// the pointer, or at once on keyboard focus; stays while the pointer is over
// the trigger or the popup; closes on Escape, blur or the pointer leaving both.
export function usePreviewTrigger(enabled: () => boolean = () => true) {
  const open = ref(false);
  let overTrigger = false;
  let overPopup = false;
  let openTimer: ReturnType<typeof setTimeout> | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimers(): void {
    if (openTimer !== null) clearTimeout(openTimer);
    if (closeTimer !== null) clearTimeout(closeTimer);
    openTimer = closeTimer = null;
  }

  function close(): void {
    clearTimers();
    open.value = false;
  }

  function closeUnlessOver(): void {
    if (closeTimer !== null) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      closeTimer = null;
      if (!overTrigger && !overPopup) open.value = false;
    }, leaveDelay);
  }

  const trigger = {
    onPointerenter(event: PointerEvent): void {
      // A touch has no hover; a tap opens the panel instead.
      if (event.pointerType === 'touch' || !showPreviews.value || !enabled())
        return;
      overTrigger = true;
      if (closeTimer !== null) clearTimeout(closeTimer);
      closeTimer = null;
      if (!open.value && openTimer === null)
        openTimer = setTimeout(() => {
          openTimer = null;
          open.value = true;
        }, hoverDelay);
    },
    onPointerleave(): void {
      overTrigger = false;
      if (openTimer !== null) clearTimeout(openTimer);
      openTimer = null;
      closeUnlessOver();
    },
    onFocus(event: FocusEvent): void {
      const element = event.currentTarget as HTMLElement;
      // Focus from a mouse click, or given back by the panel, opens nothing.
      if (restoringFocus.value === element || !showPreviews.value || !enabled())
        return;
      if (element.matches(':focus-visible')) {
        clearTimers();
        open.value = true;
      }
    },
    onBlur: close,
  };

  const popup = {
    onPointerenter(): void {
      overPopup = true;
      if (closeTimer !== null) clearTimeout(closeTimer);
      closeTimer = null;
    },
    onPointerleave(): void {
      overPopup = false;
      closeUnlessOver();
    },
  };

  // Escape closes an open preview wherever focus is, and no other Escape
  // handler (the panel's) sees that key press.
  function onEscape(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    close();
  }
  // Turning previews off closes the one that is open (D330).
  watch(showPreviews, (shown) => {
    if (!shown) close();
  });
  // A preview that turns out to have nothing to show closes (D331).
  watch(enabled, (on) => {
    if (!on) close();
  });
  watch(open, (isOpen) => {
    if (isOpen) document.addEventListener('keydown', onEscape, true);
    else document.removeEventListener('keydown', onEscape, true);
  });
  onBeforeUnmount(() => {
    clearTimers();
    document.removeEventListener('keydown', onEscape, true);
  });

  return { open, trigger, popup, dismiss: close };
}
