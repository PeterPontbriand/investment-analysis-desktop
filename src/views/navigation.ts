import type { LocationQuery, RouteLocationRaw } from 'vue-router';
import type { Crumb } from '../components/crumbs.ts';

// The Saved runs filters, kept in the route query so that a run opened from
// the list can send the reader back to the same list.
export type RunsFilters = { ticker: string; method: string; outcome: string };

function first(value: LocationQuery[string]): string {
  const item = Array.isArray(value) ? value[0] : value;
  return typeof item === 'string' ? item : '';
}

export function filtersFromQuery(query: LocationQuery): RunsFilters {
  return {
    ticker: first(query.ticker),
    method: first(query.method),
    outcome: first(query.outcome),
  };
}

// Only the filters that are set; an empty filter is left out of the query.
export function filtersToQuery(filters: RunsFilters): Record<string, string> {
  const query: Record<string, string> = {};
  if (filters.ticker !== '') query.ticker = filters.ticker;
  if (filters.method !== '') query.method = filters.method;
  if (filters.outcome !== '') query.outcome = filters.outcome;
  return query;
}

// The link to a run's detail from the Saved runs list: it says where it came
// from and carries the filters.
export function runFromRunsLocation(
  runId: string,
  filters: RunsFilters,
): RouteLocationRaw {
  return {
    name: 'run',
    params: { runId },
    query: { from: 'runs', ...filtersToQuery(filters) },
  };
}

export function runLocation(runId: string): RouteLocationRaw {
  return { name: 'run', params: { runId } };
}

export function compareLocation(refreshId: string): RouteLocationRaw {
  return { name: 'refresh', params: { refreshId } };
}

export type RunCrumbLabels = {
  runs: string;
  refreshes: string;
  refreshComparison: string;
};

// Run detail's trail by where the reader came from (D157, D173): the screens
// above it, not the run itself.
export function runCrumbs(
  labels: RunCrumbLabels,
  origin: { fromRuns: boolean; refreshId: string | null; query: LocationQuery },
): Crumb[] {
  if (!origin.fromRuns && origin.refreshId !== null)
    return [
      { label: labels.refreshes, to: { name: 'refreshes' } },
      {
        label: labels.refreshComparison,
        to: compareLocation(origin.refreshId),
      },
    ];
  return [
    {
      label: labels.runs,
      to: {
        name: 'runs',
        query: filtersToQuery(filtersFromQuery(origin.query)),
      },
    },
  ];
}

// The comparison's trail: Refreshes (D173).
export function compareCrumbs(refreshesLabel: string): Crumb[] {
  return [{ label: refreshesLabel, to: { name: 'refreshes' } }];
}

// The watchlist screen's trail: Watchlists (D173).
export function watchlistCrumbs(watchlistsLabel: string): Crumb[] {
  return [{ label: watchlistsLabel, to: { name: 'watchlists' } }];
}
