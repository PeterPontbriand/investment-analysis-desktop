// The tickers of the Tickers field: split on commas and white space, sent as
// typed, because the engine trims and upper-cases them (D194).
export function splitTickers(text: string): string[] {
  return text.split(/[\s,]+/).filter((ticker) => ticker !== '');
}
