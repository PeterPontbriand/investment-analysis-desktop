// The tickers of the Tickers field: split on commas and white space, sent as
// typed, because the engine trims and upper-cases them (D194).
export function splitTickers(text: string): string[] {
  return text.split(/[\s,]+/).filter((ticker) => ticker !== '');
}

// What is wrong with the text of a field that takes one ticker (D266): none
// typed, or more than one.
export function singleTickerProblem(text: string): 'none' | 'several' | null {
  const count = splitTickers(text).length;
  return count === 0 ? 'none' : count > 1 ? 'several' : null;
}
