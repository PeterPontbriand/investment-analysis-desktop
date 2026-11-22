// The application's own labels that name an engine concept, and the term each
// one explains itself with (D314). A label not in this map gets no help.
// "Refresh comparison" is not here: it appears only as a breadcrumb link.
export const labelTerms = {
  asOf: 'as-of-date',
  adHocEntries: 'refresh',
  warnings: 'analysis-warning',
  limitations: 'analysis-limitation',
} as const satisfies Record<string, string>;

export type LabelTermKey = keyof typeof labelTerms;
