import {
  ApiError,
  type ApiClient,
  type ApiResult,
  type GetResponse,
} from './client.ts';

export type ResolvedName = {
  text: string;
  // The glossary term that explains the value; null when there is none.
  termId: string | null;
  // The language of the text, from the response it came from.
  lang: string | null;
};

// A term as the help index lists it: its name and short definition, in the
// index's language (B8). The full entry is the term's own document (D364).
export type TermEntry = {
  termId: string;
  name: string;
  definition: string;
  lang: string | null;
};

type References = ApiResult<GetResponse<'/v1/help/references'>>;
export type HelpIndex = ApiResult<GetResponse<'/v1/help'>>;
export type HelpTerm = ApiResult<GetResponse<'/v1/help/terms/{term_id}'>>;
export type HelpGuide = ApiResult<
  GetResponse<'/v1/help/documents/{document_id}'>
>;
type Strategies = ApiResult<GetResponse<'/v1/strategies'>>;

export type TermDocument = 'references' | 'help' | 'strategies';

export type Terms = {
  // Fetches the named documents now, so a screen can show a failed request as
  // its own failure state before it shows any name.
  preload(needs: TermDocument[]): Promise<void>;
  // A code of a code set as its term's name; as served, with no term id, when
  // the engine lists no reference or no term for it. A failed request rejects.
  term(codeSet: string, code: string): Promise<ResolvedName>;
  // A term's name and definition by its id, from the cached help index with no
  // request of its own; null when the index does not list the term. A failed
  // request rejects.
  entry(termId: string): Promise<TermEntry | null>;
  // A term's full entry (D364); null when the engine has no entry for the id.
  // Any other failed request rejects.
  termDocument(termId: string): Promise<HelpTerm | null>;
  // A guide (D369); null when the engine has no guide with the id. Any other
  // failed request rejects.
  helpDocument(documentId: string): Promise<HelpGuide | null>;
  // The cached help index, with its language. A failed request rejects.
  helpIndex(): Promise<HelpIndex>;
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

// A help document the engine has no such id for, which is an answer and not a
// failure: null.
async function orNotFound<T>(
  request: Promise<T>,
  code: 'help_term_not_found' | 'help_document_not_found',
): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 404 &&
      error.reasonCode === code
    )
      return null;
    throw error;
  }
}

// Term names come from three documents, each fetched once per locale and kept
// in memory, as each term's entry and each guide is. A failed fetch is not kept,
// so the next use asks again.
export function createTerms(
  client: () => Promise<ApiClient>,
  locale: () => string,
): Terms {
  function cacheById<T>(load: (api: ApiClient, id: string) => Promise<T>) {
    const entries = new Map<string, Promise<T>>();
    return (id: string): Promise<T> => {
      const key = JSON.stringify([locale(), id]);
      let entry = entries.get(key);
      if (!entry) {
        entry = client().then((api) => load(api, id));
        entries.set(key, entry);
        entry.catch(() => entries.delete(key));
      }
      return entry;
    };
  }
  function cache<T>(load: (api: ApiClient) => Promise<T>) {
    const read = cacheById(load);
    return (): Promise<T> => read('');
  }
  const references = cache<References>((api) => api.get('/v1/help/references'));
  const helpIndex = cache<HelpIndex>((api) => api.get('/v1/help'));
  const strategyList = cache<Strategies>((api) => api.get('/v1/strategies'));
  const termDocument = cacheById<HelpTerm | null>((api, id) =>
    orNotFound(
      api.get('/v1/help/terms/{term_id}', { path: { term_id: id } }),
      'help_term_not_found',
    ),
  );
  const helpDocument = cacheById<HelpGuide | null>((api, id) =>
    orNotFound(
      api.get('/v1/help/documents/{document_id}', {
        path: { document_id: id },
      }),
      'help_document_not_found',
    ),
  );

  const itemsByIndex = new WeakMap<
    HelpIndex,
    Map<string, { name: string; definition: string }>
  >();
  function itemsOf(index: HelpIndex) {
    let items = itemsByIndex.get(index);
    if (!items) {
      items = new Map(
        index.data.groups.flatMap((group) =>
          group.terms.map(
            (term) =>
              [
                term.id,
                { name: term.name, definition: term.definition },
              ] as const,
          ),
        ),
      );
      itemsByIndex.set(index, items);
    }
    return items;
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
        termId === undefined ? undefined : itemsOf(index).get(termId)?.name;
      if (termId === undefined || name === undefined) return asServed(code);
      return { text: name, termId, lang: index.contentLanguage };
    },
    async entry(termId) {
      const index = await helpIndex();
      const item = itemsOf(index).get(termId);
      return item === undefined
        ? null
        : { termId, ...item, lang: index.contentLanguage };
    },
    termDocument,
    helpDocument,
    helpIndex,
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
