import { shallowRef } from 'vue';
import type { MessageKey } from '../i18n/index.ts';

// A line that tells the user what an action did, shown on the screen they end
// on. A screen that leaves one for the next screen sets it; the next screen
// takes it once, when it opens (D220).
export type Notice = {
  key: MessageKey;
  // Set when the message has plural forms.
  count?: number;
  parameters?: Record<string, string | number>;
};

const pending = shallowRef<Notice | null>(null);

export function leaveNotice(notice: Notice): void {
  pending.value = notice;
}

export function takeNotice(): Notice | null {
  const notice = pending.value;
  pending.value = null;
  return notice;
}
