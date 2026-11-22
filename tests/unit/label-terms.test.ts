import { describe, expect, it } from 'vitest';
import { labelTerms } from '../../src/api/labelTerms.ts';

describe('the application labels that name an engine concept', () => {
  it('maps each label to its engine term id (D314)', () => {
    expect(labelTerms).toEqual({
      asOf: 'as-of-date',
      adHocEntries: 'refresh',
      warnings: 'analysis-warning',
      limitations: 'analysis-limitation',
    });
  });

  it('has no entry for "Refresh comparison", a breadcrumb link, nor for ordinary words', () => {
    for (const key of ['refreshComparison', 'saved', 'savedBy', 'notRun'])
      expect(labelTerms).not.toHaveProperty(key);
  });
});
