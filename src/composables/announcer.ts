// Announces a refresh's progress to assistive technology without chatter
// (D253): the first count is the baseline and is not announced; a change in
// the finished count is announced, no more than once in the interval, with the
// latest text; the end is always announced at once.
export type Announcer = {
  update(finished: number, text: string): void;
  end(text: string): void;
  dispose(): void;
};

export const announceInterval = 10_000;

export function createAnnouncer(
  announce: (text: string) => void,
  interval: number = announceInterval,
): Announcer {
  let announcedCount: number | null = null;
  let announcedAt = Number.NEGATIVE_INFINITY;
  let pending: { finished: number; text: string } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function clear(): void {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  function say(finished: number, text: string): void {
    clear();
    pending = null;
    announcedCount = finished;
    announcedAt = Date.now();
    announce(text);
  }

  return {
    update(finished, text) {
      if (announcedCount === null) {
        announcedCount = finished;
        return;
      }
      if (finished === announcedCount) {
        // Back to what was announced: nothing waits to be said.
        pending = null;
        clear();
        return;
      }
      const wait = announcedAt + interval - Date.now();
      if (wait <= 0) {
        say(finished, text);
        return;
      }
      pending = { finished, text };
      if (timer === null)
        timer = setTimeout(() => {
          timer = null;
          if (pending !== null) say(pending.finished, pending.text);
        }, wait);
    },
    end(text) {
      clear();
      pending = null;
      announcedAt = Date.now();
      announce(text);
    },
    dispose: clear,
  };
}
