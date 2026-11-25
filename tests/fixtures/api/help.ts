// The engine's help documents: a term's full entry, and the guides (GUI.4c2).
// The text is made up; the ids and the links between them are what the tests
// follow.
import type { components } from '../../../src/api/schema.ts';
import { helpIndex } from './data.ts';

type Schemas = components['schemas'];

// A term whose entry uses every construct and every kind of link the
// application shows (D366, D367), and some it shows as text only.
export const everyConstructId = 'analysis-strategy';
export const externalUrl = 'https://example.com/further-reading';
export const guideId = 'beginner-guide';
export const mathGuideId = 'finance-math';
export const mathSectionId = 'graham-number-strategy';
// A section id the guide itself links, from a term the guide shows.
export const guideSectionId = 'words-youll-meet-first';
export const wideSectionId = 'a-wide-table';
export const codeSectionId = 'a-calculation';

const bodies: Record<string, string> = {
  ticker:
    'A ticker is not permanent identity (see [Listing Venue](help:terms/listing-venue)).',
  'listing-venue':
    'The provider words it. See [the venue named Nasdaq](help:terms/listing-venue-nasdaq) and [the words you meet first](help:documents/beginner-guide#words-youll-meet-first).',
  'provider-no-data':
    'A run it stops is [unavailable](help:terms/outcome-unavailable), with the reason code `provider_no_data`.',
  [everyConstructId]: [
    'A paragraph with **strong**, *emphasis*, `inline code` and a',
    'soft break, then a hard break\\',
    'after it.',
    '',
    '- A bullet with a [term](help:terms/ticker)',
    '  - A nested bullet',
    '- Another bullet',
    '',
    '3. The third',
    '4. The fourth',
    '',
    '| Start | Center | End |',
    '| :--- | :---: | ---: |',
    '| one | two | three |',
    '',
    '```text',
    'value = first line',
    '        second line',
    '```',
    '',
    'Read [the whole guide](help:documents/finance-math), [one section](help:documents/finance-math#graham-number-strategy) or [further reading](https://example.com/further-reading).',
    '',
    'Not links: [plain](http://example.com/), [script](javascript:alert(1)), [no id](help:terms/) and <b>raw</b>.',
  ].join('\n'),
};

// A term's document: its index entry, its group and its body, which is empty
// for a term with none above.
export function termDocument(id: string): Schemas['HelpTermDocument'] | null {
  for (const group of helpIndex.groups) {
    const term = group.terms.find((item) => item.id === id);
    if (term !== undefined)
      return {
        schema_version: 1,
        ...term,
        body: bodies[id] ?? '',
        group: { id: group.id, title: group.title },
      };
  }
  return null;
}

const longLine = Array.from(
  { length: 30 },
  (_unused, index) => `value_${index}`,
).join(' + ');
const columns = Array.from({ length: 14 }, (_unused, index) => index);
const row = (cell: (index: number) => string) =>
  `| ${columns.map(cell).join(' | ')} |`;

export const guides: Record<string, Schemas['HelpDocumentDocument']> = {
  [guideId]: {
    schema_version: 1,
    id: guideId,
    title: "A Beginner's Guide to Investment Analysis in This Project",
    introduction:
      'The ideas behind the numbers, with each [ticker](help:terms/ticker).',
    sections: [
      {
        id: guideSectionId,
        level: 2,
        heading: "Words you'll meet first",
        markdown: 'Start with the [Listing Venue](help:terms/listing-venue).',
      },
      {
        id: 'prices-and-yields',
        level: 3,
        heading: 'Prices and yields',
        markdown: 'A price is what one share costs.',
      },
      {
        id: wideSectionId,
        level: 2,
        heading: 'A wide table',
        markdown: [
          row((index) => `Column_heading_${index}`),
          row(() => '---:'),
          row((index) => `cell_${index}`),
        ].join('\n'),
      },
      {
        id: codeSectionId,
        level: 2,
        heading: 'A calculation',
        markdown: `\`\`\`text\ntotal = ${longLine}\n\`\`\`\n\nA short one:\n\n\`\`\`text\na = b\n\`\`\``,
      },
      {
        id: 'further-reading',
        level: 4,
        heading: 'Further reading',
        markdown: `[A public glossary](${externalUrl}).`,
      },
    ],
  },
  [mathGuideId]: {
    schema_version: 1,
    id: mathGuideId,
    title: 'Financial Math & Data Conventions',
    introduction: 'How each number is worked out.',
    sections: [
      {
        id: 'shared-data-conventions',
        level: 2,
        heading: 'Shared data conventions',
        markdown: 'Conventions shared by every strategy.',
      },
      {
        id: mathSectionId,
        level: 2,
        heading: 'Graham Number Strategy',
        markdown: 'How the Graham Number is worked out.',
      },
    ],
  },
};
