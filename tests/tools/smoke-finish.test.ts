import { describe, expect, it } from 'vitest';
import {
  failureExitMessage,
  startAndFinish,
} from '../../tools/smoke/finish.ts';

describe('starting the application', () => {
  it('tells the contributor to mark Step 10 failed after a failure exit', async () => {
    const printed: string[] = [];

    const code = await startAndFinish({
      start: () => Promise.resolve(101),
      print: (text) => printed.push(text),
    });

    expect(code).toBe(101);
    expect(printed).toEqual([failureExitMessage(101)]);
    expect(printed.join('')).toContain('exited with status 101');
    expect(printed.join('')).toContain('mark Step 10 fail');
  });

  it('says nothing and leaves Step 10 to the contributor after a zero exit', async () => {
    const printed: string[] = [];

    const code = await startAndFinish({
      start: () => Promise.resolve(0),
      print: (text) => printed.push(text),
    });

    expect(code).toBe(0);
    expect(printed).toEqual([]);
  });
});
