import type { ApiClient, ApiResult, GetResponse } from './client.ts';

export type ResolvedName = {
  text: string;
  // The glossary term that explains the value; null when there is none.
  termId: string | null;
  // The language of the text, from the response it came from.
  lang: string | null;
};

type References = ApiResult<GetResponse<'/v1/help/references'>>;
type HelpIndex = ApiResult<GetResponse<'/v1/help'>>;
type Strategies = ApiResult<GetResponse<'/v1/strategies'>>;

export type TermDocument = 'references' | 'help' | 'strategies';

export type Terms = {
  // Fetches the named documents now, so a screen can show a failed request as
  // its own failure state before it shows any name.
  preload(needs: TermDocument[]): Promise<void>;
  // A code of a code set as its term's name; as served, with no term id, when
  // the engine lists no reference or no term for it. A failed request rejects.
  term(codeSet: string, code: string): Promise<ResolvedName>;
  // A strategy's name, by method; as served when the engine does not list it.
  // A failed request rejects.
  strategy(methodId: string): Promise<ResolvedName>;
  // The strategies in declared order.
  strategies(): Promise<{ method: string; name: ResolvedName }[]>;
  // A code set's values in the order the engine serves them.
  codeSetValues(codeSet: string): Promise<string[]>;
};

const asServed = (text: string): ResolvedName => ({
  text,
  termId: null,
  lang: null,
});

// Term names come from three documents, each fetched once per locale and kept
// in memory. A failed fetch is not kept, so the next use asks again.
export function createTerms(
  client: () => Promise<ApiClient>,
  locale: () => string,
): Terms {
  function cache<T>(load: (api: ApiClient) => Promise<T>) {
    const entries = new Map<string, Promise<T>>();
    return (): Promise<T> => {
      const tag = locale();
      let entry = entries.get(tag);
      if (!entry) {
        entry = client().then(load);
        entries.set(tag, entry);
        entry.catch(() => entries.delete(tag));
      }
      return entry;
    };
  }
  const references = cache<References>((api) => api.get('/v1/help/references'));
  const helpIndex = cache<HelpIndex>((api) => api.get('/v1/help'));
  const strategyList = cache<Strategies>((api) => api.get('/v1/strategies'));

  const namesByIndex = new WeakMap<HelpIndex, Map<string, string>>();
  function namesOf(index: HelpIndex): Map<string, string> {
    let names = namesByIndex.get(index);
    if (!names) {
      names = new Map(
        index.data.groups.flatMap((group) =>
          group.terms.map((term) => [term.id, term.name] as const),
        ),
      );
      namesByIndex.set(index, names);
    }
    return names;
  }

  const labelled = (
    item: { label: string; term: string },
    lang: string | null,
  ): ResolvedName => ({ text: item.label, termId: item.term, lang });

  return {
    async preload(needs) {
      await Promise.all(
        needs.map((need) =>
          need === 'references'
            ? references()
            : need === 'help'
              ? helpIndex()
              : strategyList(),
        ),
      );
    },
    async term(codeSet, code) {
      const [refs, index] = await Promise.all([references(), helpIndex()]);
      const termId = refs.data.code_sets[codeSet]?.[code];
      const name =
        termId === undefined ? undefined : namesOf(index).get(termId);
      if (termId === undefined || name === undefined) return asServed(code);
      return { text: name, termId, lang: index.contentLanguage };
    },
    async strategy(methodId) {
      const { data, contentLanguage } = await strategyList();
      const item = data.items.find((entry) => entry.method === methodId);
      return item ? labelled(item, contentLanguage) : asServed(methodId);
    },
    async strategies() {
      const { data, contentLanguage } = await strategyList();
      return data.items.map((item) => ({
        method: item.method,
        name: labelled(item, contentLanguage),
      }));
    },
    async codeSetValues(codeSet) {
      const { data } = await references();
      return Object.keys(data.code_sets[codeSet] ?? {});
    },
  };
}
