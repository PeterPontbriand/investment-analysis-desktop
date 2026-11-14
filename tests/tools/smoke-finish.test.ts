import { describe, expect, it } from 'vitest';
import { startAndFinish } from '../../tools/smoke/finish.ts';
import { parseSteps } from '../../tools/smoke/document.ts';
import { renderRecord } from '../../tools/smoke/record.ts';
import { newSession } from '../../tools/smoke/setup.ts';

const steps = parseSteps('Step 10. Start the desktop application.\n');

function session() {
  const made = newSession();
  made.scripted.set('Step 10', {
    fact: 'the tool started the application; mark whether its window opened',
    leftToYou: true,
  });
  return made;
}

function recordOf(made: ReturnType<typeof session>): string {
  return renderRecord({
    date: 'd',
    timeZone: 'z',
    operatingSystem: 'o',
    applicationCommit: 'c',
    dirty: false,
    engineCommit: 'beb58a2',
    enginePath: 'C:/ian.exe',
    ianSource: 'PATH',
    engineVersion: '0.1.0',
    data: null,
    throwawayFolder: '.tmp/smoke/x',
    steps,
    scripted: made.scripted,
    log: [],
    stopped: null,
  });
}

describe('starting the application', () => {
  it('marks Step 10 failed in the record after a failure exit, and says where', async () => {
    const made = session();
    const printed: string[] = [];
    let rewritten = '';

    const code = await startAndFinish({
      session: made,
      start: () => Promise.resolve(101),
      rewrite: () => {
        rewritten = recordOf(made);
        return Promise.resolve('.tmp/smoke/x/SMOKE_RECORD.md');
      },
      print: (text) => printed.push(text),
    });

    expect(code).toBe(101);
    expect(rewritten).toContain(
      '- **Step 10** Start the desktop application: fail (scripted): `pnpm tauri dev` exited with status 101; see the terminal',
    );
    expect(rewritten).not.toContain('mark whether its window opened');
    expect(printed.join('')).toContain('The record was updated');
    expect(printed.join('')).toContain('.tmp/smoke/x/SMOKE_RECORD.md');
  });

  it('leaves Step 10 to the contributor after a zero exit', async () => {
    const made = session();
    const printed: string[] = [];
    let rewrites = 0;

    const code = await startAndFinish({
      session: made,
      start: () => Promise.resolve(0),
      rewrite: () => {
        rewrites += 1;
        return Promise.resolve(null);
      },
      print: (text) => printed.push(text),
    });

    expect(code).toBe(0);
    expect(rewrites).toBe(0);
    expect(printed).toEqual([]);
    expect(recordOf(made)).toContain(
      '- **Step 10** Start the desktop application: (the tool started the application; mark whether its window opened)',
    );
  });
});
