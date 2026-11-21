import type {
  InstrumentProfile,
  SecurityIdentity,
} from '../api/tickerIdentities.ts';

// What the preview and the panel show of one ticker's details (D290). Every
// line is the engine's value as served; a null field has no line. The issuer
// identifier and the instrument identifier are never shown.
export type DetailLines = {
  name: string | null;
  venue: string | null;
  // The instrument kind's code; a current profile only.
  kind: string | null;
  // The quote currency; a current profile only.
  currency: string | null;
  // When and by which provider the details were taken: "Checked" for a current
  // profile, "Identified for this run" for a run's identity.
  stamp: {
    source: 'profile' | 'run';
    at: string;
    providerId: string | null;
  } | null;
};

export function profileLines(profile: InstrumentProfile): DetailLines {
  return {
    name: profile.instrument_name,
    venue: profile.listing_venue,
    kind: profile.kind,
    currency: profile.quote_currency,
    stamp: {
      source: 'profile',
      at: profile.refreshed_at,
      providerId: profile.provider_id,
    },
  };
}

export function runIdentityLines(identity: SecurityIdentity): DetailLines {
  return {
    name: identity.instrument_name,
    venue: identity.listing_venue,
    kind: null,
    currency: null,
    stamp:
      identity.resolved_at === null
        ? null
        : {
            source: 'run',
            at: identity.resolved_at,
            providerId: identity.provider_id,
          },
  };
}

// Whether the details describe the instrument at all, beyond when they were
// taken.
export const isDescribed = (lines: DetailLines): boolean =>
  lines.name !== null ||
  lines.venue !== null ||
  lines.kind !== null ||
  lines.currency !== null;

// The lines the preview shows under the name: the venue, the kind and the
// currency, in that order, those that exist.
export function previewParts(
  lines: DetailLines,
): ({ text: string } | { kind: string })[] {
  return [
    ...(lines.venue === null ? [] : [{ text: lines.venue }]),
    ...(lines.kind === null ? [] : [{ kind: lines.kind }]),
    ...(lines.currency === null ? [] : [{ text: lines.currency }]),
  ];
}
