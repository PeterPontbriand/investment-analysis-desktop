import { ref } from 'vue';

// What the user chose, kept across restarts in the webview's local storage:
// the same store in the Tauri application and in a browser (D330). Reads and
// writes never throw: an unreadable or unavailable store means the default.
type Store = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const showPreviewsKey = 'iad.showPreviews';

export function createPreferences(store: () => Store) {
  function read(): boolean {
    try {
      // Only an explicit "off" turns previews off.
      return store().getItem(showPreviewsKey) !== 'off';
    } catch {
      return true;
    }
  }

  // Whether previews (D284) open on hover and keyboard focus. The label of the
  // switch calls them popups.
  const showPreviews = ref(read());

  function setShowPreviews(value: boolean): void {
    showPreviews.value = value;
    try {
      store().setItem(showPreviewsKey, value ? 'on' : 'off');
    } catch {
      // The choice holds until the application closes.
    }
  }

  return { showPreviews, setShowPreviews };
}

export const { showPreviews, setShowPreviews } = createPreferences(
  () => globalThis.localStorage,
);
