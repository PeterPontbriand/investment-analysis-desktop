// Typed answers to the watchlist actions, shared by Vitest and Playwright.
import type { components } from '../../../src/api/schema.ts';
import { coreId, watchlistDocuments } from './data.ts';
import { failure, type Reply } from './server.ts';

type Schemas = components['schemas'];

export const unreadableEntry: Schemas['UnreadableEntryDocument'] = {
  entry_number: 2,
  method_id: 'retired_method',
  reason: 'Entry 2 was saved by a different version and cannot be read.',
  ticker: 'ACME',
};

const core = watchlistDocuments[coreId]!;

export const newWatchlistId = '44444444-4444-4444-8444-444444444444';

export const createdWatchlist: Schemas['WatchlistDocument'] = {
  schema_version: 2,
  watchlist_id: newWatchlistId,
  display_name: 'Growth',
  created_at: '2026-11-16T17:00:00+00:00',
  updated_at: null,
  entries: [],
};

export const renamedWatchlist: Schemas['WatchlistDocument'] = {
  ...core,
  display_name: 'Core renamed',
};

export const renamed: Schemas['WatchlistRenameDocument'] = {
  schema_version: 2,
  watchlist: renamedWatchlist,
  unreadable: null,
};

export const renamedUnreadable: Schemas['WatchlistRenameDocument'] = {
  schema_version: 2,
  watchlist: null,
  unreadable: unreadableEntry,
};

// The watchlist after its entry 1 was removed, numbered again.
export const afterRemoval: Schemas['WatchlistDocument'] = {
  ...core,
  entries: core.entries
    .slice(1)
    .map((entry, i) => ({ ...entry, index: i + 1 })),
};

export const removal = (
  removed: number,
  watchlist: Schemas['WatchlistDocument'] = afterRemoval,
): Schemas['WatchlistRemovalDocument'] => ({
  schema_version: 2,
  removed,
  watchlist,
  unreadable: null,
});

export const removalUnreadable: Schemas['WatchlistRemovalDocument'] = {
  schema_version: 2,
  removed: 1,
  watchlist: null,
  unreadable: unreadableEntry,
};

export const deleted: Schemas['WatchlistDeleteDocument'] = {
  schema_version: 2,
  deleted: true,
  watchlist: core,
  unreadable: null,
};

export const deletedUnreadable: Schemas['WatchlistDeleteDocument'] = {
  schema_version: 2,
  deleted: true,
  watchlist: null,
  unreadable: unreadableEntry,
};

export const created = (
  body: unknown,
  status = 201,
  language: string | null = 'en',
): Reply => ({ status, body, language });

export const failures = {
  nameConflict: failure(
    409,
    'watchlist_name_conflict',
    'A watchlist named Core already exists.',
  ),
  empty: failure(409, 'watchlist_empty', 'The watchlist has no entries.'),
  entryNotFound: failure(
    404,
    'watchlist_entry_not_found',
    'The watchlist has no entry 9.',
  ),
  refreshRunning: failure(
    409,
    'refresh_job_running',
    'Refresh 5a6f0c1e is already running.',
  ),
  notFound: failure(404, 'watchlist_not_found', 'No such watchlist.'),
  busy: failure(503, 'database_busy', 'The database is busy.'),
};
