import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/tokens.css', 'utf8');

type Scheme = Record<string, string>;

function declarations(block: string): Scheme {
  const found: Scheme = {};
  for (const match of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    found[match[1] ?? ''] = (match[2] ?? '').trim();
  }
  return found;
}

// The first :root block is light; the one inside the dark media query
// overrides it.
const lightBlock = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
const darkBlock =
  /@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/.exec(
    css,
  )?.[1] ?? '';
const light = declarations(lightBlock);
const schemes: Record<string, Scheme> = {
  light,
  dark: { ...light, ...declarations(darkBlock) },
};

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string): number {
  const channel = (start: number) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const surfaces = ['--color-surface', '--color-surface-raised'];
const texts = [
  '--color-text',
  '--color-text-secondary',
  '--color-text-muted',
  '--color-accent',
];
const tones = ['positive', 'caution', 'negative'];

describe('token contrast', () => {
  it('reads both schemes from tokens.css', () => {
    expect(light['--color-text']).toMatch(/^#[0-9a-f]{6}$/);
    expect(schemes.dark?.['--color-text']).not.toBe(light['--color-text']);
  });

  for (const [name, scheme] of Object.entries(schemes)) {
    const value = (token: string): string => {
      const found = scheme[token];
      if (found === undefined) throw new Error(`${token} is not defined`);
      return found;
    };

    describe(name, () => {
      for (const surface of surfaces) {
        for (const text of texts) {
          it(`${text} on ${surface} reaches 4.5:1`, () => {
            expect(ratio(value(text), value(surface))).toBeGreaterThanOrEqual(
              4.5,
            );
          });
        }
        it(`the control border on ${surface} reaches 3:1`, () => {
          expect(
            ratio(value('--color-control-border'), value(surface)),
          ).toBeGreaterThanOrEqual(3);
        });
        it(`the focus outline (accent) on ${surface} reaches 3:1`, () => {
          expect(
            ratio(value('--color-accent'), value(surface)),
          ).toBeGreaterThanOrEqual(3);
        });
      }
      for (const tone of tones) {
        it(`the ${tone} pill text on its background reaches 4.5:1`, () => {
          expect(
            ratio(value(`--color-${tone}`), value(`--color-${tone}-bg`)),
          ).toBeGreaterThanOrEqual(4.5);
        });
      }
      it('the neutral pill text on the raised surface reaches 4.5:1', () => {
        expect(
          ratio(
            value('--color-text-secondary'),
            value('--color-surface-raised'),
          ),
        ).toBeGreaterThanOrEqual(4.5);
      });
    });
  }
});
