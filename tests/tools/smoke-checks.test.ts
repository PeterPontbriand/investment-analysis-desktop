import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  checksArgument,
  describeValid,
  parseChecks,
} from '../../tools/smoke/checks.ts';
import { parseSteps } from '../../tools/smoke/document.ts';
import { checkArguments } from '../../tools/smoke/run.ts';
import { renderRecord } from '../../tools/smoke/record.ts';

const document = readFileSync('docs/project/SMOKE_TESTING.md', 'utf8');
const steps = parseSteps(document);
const valid = steps
  .filter((step) => step.id.startsWith('Check '))
  .map((step) => step.id.replace(/^Check /, ''));

const ok = (list: string) => {
  const result = parseChecks(list, valid);
  if (!result.ok) throw new Error(result.message);
  return result.targeted;
};
const refusal = (list: string) => {
  const result = parseChecks(list, valid);
  if (result.ok) throw new Error('accepted');
  return result.message;
};

describe('--checks', () => {
  it('reads the checks of the document', () => {
    expect(valid).toContain('C1');
    expect(valid).toContain('D7');
  });

  it('accepts singles, ranges and a mix, and words them as given', () => {
    expect(ok('C1')).toEqual({ ids: ['C1'], label: 'Check C1' });
    expect(ok('C1,H8')).toEqual({
      ids: ['C1', 'H8'],
      label: 'Checks C1 and H8',
    });
    expect(ok('C1-C3').ids).toEqual(['C1', 'C2', 'C3']);
    const mixed = ok('C1-C6,D1-D6,H1,H8,L1,L3');
    expect(mixed.ids).toHaveLength(6 + 6 + 4);
    expect(mixed.label).toBe('Checks C1 to C6, D1 to D6, H1, H8, L1 and L3');
  });

  it.each([
    ['', 'empty'],
    [' , ,', 'empty'],
    ['C9', 'is not a check'],
    ['Z1', 'is not a check'],
    ['c1', 'is not a check id'],
    ['C1-D2', 'crosses two letter groups'],
    ['C6-C1', 'is reversed'],
    ['C1,C1', 'named twice'],
    ['C1-C3,C2', 'named twice'],
    ['C1-C99', 'is not a check'],
  ])('refuses %j', (list, reason) => {
    expect(refusal(list)).toContain(reason);
  });

  it('accepts spaces, as PowerShell passes a comma list, and any mix', () => {
    const expected = ok('C1-C6,D1-D6,H1,H8,L1,L3');
    expect(ok('C1-C6 D1-D6 H1 H8 L1 L3')).toEqual(expected);
    expect(ok('C1-C6, H1 H8').ids).toEqual([
      'C1',
      'C2',
      'C3',
      'C4',
      'C5',
      'C6',
      'H1',
      'H8',
    ]);
    expect(ok('C1,,H1 , ,H8,').ids).toEqual(['C1', 'H1', 'H8']);
  });

  it('lists the valid checks with each letter group as a range', () => {
    expect(describeValid(['C1', 'C2', 'C3', 'D1', 'H1', 'H3'])).toBe(
      'C1 to C3, D1, H1, H3',
    );
    expect(refusal('Z1')).toContain('C1 to C6');
    expect(refusal('Z1')).toContain('D1 to D7');
  });

  it('prints the refusal for an unknown id', () => {});

  it('reads the option once, in either form', () => {
    expect(checksArgument(['--checks', 'C1'])).toBe('C1');
    expect(checksArgument(['--checks=C1-C2'])).toBe('C1-C2');
    expect(checksArgument(['--checks'])).toBe('');
    expect(checksArgument(['--checks', 'C1', 'x'])).toBeUndefined();
    expect(checkArguments(['--checks', 'C1'], valid)).toEqual({
      targeted: { ids: ['C1'], label: 'Check C1' },
    });
    expect(checkArguments(['--checks', 'Z1'], valid)).toHaveProperty('message');
  });
});

describe('the record of a targeted run', () => {
  const base = {
    date: 'd',
    timeZone: 'z',
    operatingSystem: 'o',
    applicationCommit: 'c',
    dirty: false,
    engineCommit: 'abc1234',
    ianSource: 'PATH' as const,
    engineVersion: '0.1.0',
    engineUncommitted: false,
    engineSwitch: null,
    data: null,
    throwawayFolder: null,
    steps: parseSteps(
      'Step 1. Get the engine.\n\nCheck C1. Open it.\n\nCheck C2. Look.\n\nCheck H1. List.\n',
    ),
    scripted: new Map(),
    log: [],
    stopped: null,
  };

  it('names the targeted checks, leaves them to mark and writes not run for the rest', () => {
    const text = renderRecord({ ...base, targeted: ok('C1,H1') });
    expect(text).toContain('- **Targeted run:** Checks C1 and H1\n');
    expect(text).toContain('- **Check C1** Open it:\n');
    expect(text).toContain('- **Check C2** Look: not run\n');
    expect(text).toContain('- **Check H1** List:\n');
    expect(text).toContain(
      '**Result:** Checks C1 and H1: all passed | failing check numbers, with notes; all other checks not run',
    );
  });

  it('leaves a full run as it was', () => {
    const full = renderRecord({ ...base, targeted: null });
    expect(full).not.toContain('Targeted run');
    expect(full).not.toContain(': not run');
    expect(full).toContain('- **Check C2** Look:\n');
    expect(full).toBe(renderRecord({ ...base, targeted: null }));
  });
});
