import { expectTypeOf, it } from 'vitest';
import type { components } from '../../src/api/schema.ts';

// D261: a request body field with a default is optional, a response field with
// a default is still always present.
type Schemas = components['schemas'];

it('accepts a refresh request that names only a watchlist, or only entries', () => {
  expectTypeOf<{ watchlist_id: string }>().toExtend<
    Schemas['RefreshRequest']
  >();
  expectTypeOf<{
    entries: Schemas['RefreshEntryRequest'][];
  }>().toExtend<Schemas['RefreshRequest']>();
});

it('keeps a response field with a default required', () => {
  expectTypeOf<
    Schemas['WatchlistListDocument']['schema_version']
  >().toEqualTypeOf<1>();
  expectTypeOf<{ items: [] }>().not.toExtend<
    Schemas['WatchlistListDocument']
  >();
});
