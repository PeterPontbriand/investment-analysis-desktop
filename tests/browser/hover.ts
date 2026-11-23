import type { Locator, Page } from '@playwright/test';

// Where a control and its scroll container are, for a failure message.
export async function position(control: Locator): Promise<string> {
  return control.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const container = element.closest('.table-scroll');
    return JSON.stringify({
      box: [box.left, box.right, box.top, box.bottom],
      scrollLeft: container === null ? null : container.scrollLeft,
    });
  });
}

// Hovers a control once it has stopped moving. The control is scrolled into
// view, then its box and its scroll containers' offsets must be the same in two
// consecutive animation frames, because some engines settle a scroll a moment
// after it is read, which moves the control under a pointer that has not
// moved. This waits for layout to be stable; it is not a retry. The wait ends,
// with a message, after two seconds.
// With `trace`, the positions after the scroll, after the wait and 200 ms
// after the hover are added to it.
export async function hoverSettled(
  page: Page,
  control: Locator,
  trace?: string[],
): Promise<void> {
  await control.scrollIntoViewIfNeeded();
  if (trace) trace.push(`after scroll into view: ${await position(control)}`);
  const stable = await control.evaluate(
    (element) =>
      new Promise<boolean>((resolve) => {
        const snapshot = () => {
          const box = element.getBoundingClientRect();
          const offsets: number[] = [];
          for (
            let parent = element.parentElement;
            parent !== null;
            parent = parent.parentElement
          )
            offsets.push(parent.scrollLeft, parent.scrollTop);
          return JSON.stringify([box.left, box.top, box.width, offsets]);
        };
        const started = performance.now();
        let last = snapshot();
        let same = 0;
        const frame = () => {
          const now = snapshot();
          same = now === last ? same + 1 : 0;
          last = now;
          if (same >= 2) resolve(true);
          else if (performance.now() - started > 2000) resolve(false);
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  if (!stable)
    throw new Error(
      `the control kept moving for two seconds before the hover: ${await position(control)}`,
    );
  if (trace) trace.push(`after the stability wait: ${await position(control)}`);
  await control.hover();
  if (trace) {
    await page.waitForTimeout(200);
    trace.push(`200 ms after the hover: ${await position(control)}`);
  }
}
