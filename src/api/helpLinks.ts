// The links the engine's Markdown holds, by what following one does (D367).
export type HelpLink =
  // Opens the term's details.
  | { kind: 'term'; termId: string }
  // Opens the guide on the Help screen, at its section when it names one.
  | { kind: 'document'; documentId: string; sectionId: string | null }
  // Further reading, which opens in the browser (D368).
  | { kind: 'external'; url: string }
  // Anything else shows its text only.
  | { kind: 'text' };

const text: HelpLink = { kind: 'text' };

// A Markdown parser percent-encodes what an address may not hold, so an id is
// read back; a part that cannot be read back is malformed.
function decoded(part: string): string | null {
  try {
    return decodeURIComponent(part);
  } catch {
    return null;
  }
}

function isHttps(href: string): boolean {
  if (!/^https:\/\//i.test(href)) return false;
  try {
    return new URL(href).protocol === 'https:';
  } catch {
    return false;
  }
}

export function classifyHelpLink(href: string): HelpLink {
  const term = /^help:terms\/([^/#?]+)$/.exec(href);
  if (term) {
    const termId = decoded(term[1] ?? '');
    return termId === null ? text : { kind: 'term', termId };
  }
  const document = /^help:documents\/([^/#?]+)(?:#([^#]+))?$/.exec(href);
  if (document) {
    const documentId = decoded(document[1] ?? '');
    const sectionId = document[2] === undefined ? null : decoded(document[2]);
    return documentId === null ||
      (sectionId === null && document[2] !== undefined)
      ? text
      : { kind: 'document', documentId, sectionId };
  }
  return isHttps(href) ? { kind: 'external', url: href } : text;
}

// The element ids of a guide's section and a glossary group, so a served id
// never meets one of the application's own.
export const sectionElementId = (sectionId: string): string =>
  `help-section-${sectionId}`;
export const groupElementId = (groupId: string): string =>
  `help-group-${groupId}`;
