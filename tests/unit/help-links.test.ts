import { describe, expect, it } from 'vitest';
import {
  classifyHelpLink,
  groupElementId,
  sectionElementId,
} from '../../src/api/helpLinks.ts';

describe('help links', () => {
  it('reads a term link', () => {
    expect(classifyHelpLink('help:terms/cell-max_price')).toEqual({
      kind: 'term',
      termId: 'cell-max_price',
    });
  });

  it('reads a guide link, with and without a section', () => {
    expect(classifyHelpLink('help:documents/finance-math')).toEqual({
      kind: 'document',
      documentId: 'finance-math',
      sectionId: null,
    });
    expect(
      classifyHelpLink(
        'help:documents/finance-math#free-cash-flow--earnings-growth-strategy',
      ),
    ).toEqual({
      kind: 'document',
      documentId: 'finance-math',
      sectionId: 'free-cash-flow--earnings-growth-strategy',
    });
  });

  it('reads back an id the parser percent-encoded', () => {
    expect(classifyHelpLink('help:terms/d%C3%A9finition')).toEqual({
      kind: 'term',
      termId: 'définition',
    });
  });

  it('reads an https link as further reading, with its address as served', () => {
    const url = 'https://example.com/a/b?c=d#e';
    expect(classifyHelpLink(url)).toEqual({ kind: 'external', url });
  });

  it.each([
    'http://example.com/',
    'javascript:alert(1)',
    'data:text/html,x',
    'file:///etc/hosts',
    'mailto:someone@example.com',
    '//example.com/',
    'relative/page',
    '/absolute/page',
    '#section',
    '',
    'https:',
    'https://',
    'https:example.com',
    'help:',
    'help:terms',
    'help:terms/',
    'help:terms/a/b',
    'help:terms/a#b',
    'help:terms/%E0%A4%A',
    'help:documents',
    'help:documents/',
    'help:documents/#section',
    'help:documents/a#',
    'help:documents/a#%E0%A4%A',
    'help:documents/%E0%A4%A',
    'help:other/a',
  ])('shows %j as its text only', (href) => {
    expect(classifyHelpLink(href)).toEqual({ kind: 'text' });
  });

  it('keeps served ids apart from the application’s own', () => {
    expect(sectionElementId('a-section')).toBe('help-section-a-section');
    expect(groupElementId('a-group')).toBe('help-group-a-group');
  });
});
