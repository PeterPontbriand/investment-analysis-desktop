import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createEngine, engineKey } from '../../src/api/engine.ts';
import { sectionElementId } from '../../src/api/helpLinks.ts';
import ExternalLink from '../../src/components/ExternalLink.vue';
import HelpMarkdown from '../../src/components/HelpMarkdown.vue';
import TermTrigger from '../../src/components/TermTrigger.vue';
import TableScroll from '../../src/components/TableScroll.vue';
import {
  closePanel,
  openPanelContent,
} from '../../src/composables/useDetailsPanel.ts';
import { createAppI18n } from '../../src/i18n/index.ts';
import { applyLocale } from '../../src/i18n/locale.ts';
import { getPlatform, type Platform } from '../../src/platform/index.ts';
import { helpIndex } from '../fixtures/api/data.ts';
import { respond } from '../fixtures/api/server.ts';
import en from '../../src/locales/en.json';

const host: Platform = {
  engineConnection: () =>
    Promise.resolve({
      state: 'ready',
      baseUrl: 'http://127.0.0.1:1',
      token: 't',
    }),
  engineStatus: () => Promise.resolve('running'),
  setWindowTitle: () => Promise.resolve(),
  onCloseRequested: () => {},
  closeWindow: () => Promise.resolve(),
  openExternal: () => Promise.resolve(),
};

const blank = { render: () => null };

async function show(markdown: string, lang: string | null = 'en') {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL | Request) => {
      const reply = respond(new URL(String(input)));
      return Promise.resolve(
        new Response(JSON.stringify(reply.body), {
          status: reply.status,
          headers: { 'Content-Language': 'en' },
        }),
      );
    }),
  );
  const i18n = createAppI18n();
  applyLocale(i18n, 'en');
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: blank },
      {
        path: '/help/documents/:documentId',
        name: 'help-document',
        component: blank,
      },
    ],
  });
  await router.push('/');
  const engine = createEngine(host, () => 'en');
  const wrapper = mount(HelpMarkdown, {
    props: { markdown, lang },
    attachTo: document.body,
    global: {
      plugins: [i18n, router],
      provide: { [engineKey as symbol]: engine },
    },
  });
  await flushPromises();
  return { wrapper, router };
}

const nameOf = (id: string) =>
  helpIndex.groups
    .flatMap((group) => group.terms)
    .find((term) => term.id === id)?.name;

afterEach(() => {
  closePanel({ returnFocus: false });
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('served Markdown', () => {
  it('carries the language of the served text', async () => {
    expect((await show('Text', 'pt-BR')).wrapper.attributes('lang')).toBe(
      'pt-BR',
    );
    expect(
      (await show('Text', null)).wrapper.attributes('lang'),
    ).toBeUndefined();
  });

  it('shows nothing for empty text', async () => {
    expect((await show('')).wrapper.element.childNodes).toHaveLength(0);
  });

  it('shows paragraphs, strong text, emphasis and inline code', async () => {
    const { wrapper } = await show(
      'One **strong *nested***.\n\nTwo *emphasis* and `a < b`.',
    );
    expect(wrapper.findAll('p').map((p) => p.text())).toEqual([
      'One strong nested.',
      'Two emphasis and a < b.',
    ]);
    expect(wrapper.get('strong').text()).toBe('strong nested');
    expect(wrapper.get('strong em').text()).toBe('nested');
    expect(wrapper.get('code').text()).toBe('a < b');
  });

  it('shows a soft break as a space and a hard break as a line break', async () => {
    const { wrapper } = await show('one\ntwo\\\nthree');
    const parts = [...wrapper.get('p').element.childNodes].map((node) =>
      node.nodeName === 'BR' ? 'BR' : node.textContent,
    );
    expect(parts.join('|')).toBe('one| |two|BR|three');
  });

  it('keeps the lines of a code block, left to right, with no tab stop while it fits', async () => {
    const { wrapper } = await show(
      '```text\na = 1\n  b = 2\n```\n\n    indented\n',
    );
    const blocks = wrapper.findAll('pre.help-code');
    expect(blocks.map((block) => block.element.textContent)).toEqual([
      'a = 1\n  b = 2',
      'indented',
    ]);
    for (const block of blocks) {
      expect(block.attributes('dir')).toBe('ltr');
      expect(block.attributes('tabindex')).toBeUndefined();
      expect(block.attributes('aria-label')).toBeUndefined();
    }
  });

  it('makes a code block that overflows a named tab stop', async () => {
    const scroll = vi
      .spyOn(window.HTMLElement.prototype, 'scrollWidth', 'get')
      .mockReturnValue(500);
    const client = vi
      .spyOn(window.HTMLElement.prototype, 'clientWidth', 'get')
      .mockReturnValue(100);
    const { wrapper } = await show('```\nlong\n```');
    expect(wrapper.get('pre').attributes()).toMatchObject({
      tabindex: '0',
      'aria-label': en.help.codeBlock,
    });
    scroll.mockRestore();
    client.mockRestore();
  });

  it('shows nested bullet lists, and a tight list with no paragraphs', async () => {
    const { wrapper } = await show('- one\n  - inner\n- two');
    expect(wrapper.findAll('ul')).toHaveLength(2);
    expect(wrapper.get('ul > li > ul > li').text()).toBe('inner');
    expect(wrapper.find('p').exists()).toBe(false);
  });

  it('keeps the paragraphs of a loose list', async () => {
    const { wrapper } = await show('- one\n\n- two');
    expect(wrapper.findAll('li > p').map((p) => p.text())).toEqual([
      'one',
      'two',
    ]);
  });

  it('keeps the start of an ordered list', async () => {
    const { wrapper } = await show('3. three\n4. four\n');
    expect(wrapper.get('ol').attributes('start')).toBe('3');
    expect(wrapper.findAll('ol > li').map((item) => item.text())).toEqual([
      'three',
      'four',
    ]);
    expect(
      (await show('1. one')).wrapper.get('ol').attributes('start'),
    ).toBeUndefined();
  });

  it('shows a table in its own scroll box, with each column alignment', async () => {
    const { wrapper } = await show(
      '| a | b | c | d |\n| --- | :--- | :---: | ---: |\n| 1 | 2 | 3 | 4 |',
    );
    const table = wrapper.getComponent(TableScroll).get('table');
    const classes = [[], ['align-start'], ['align-center'], ['align-end']];
    expect(table.findAll('thead th').map((cell) => cell.classes())).toEqual(
      classes,
    );
    expect(table.findAll('tbody td').map((cell) => cell.classes())).toEqual(
      classes,
    );
    expect(table.find('[style]').exists()).toBe(false);
  });

  it('shows raw HTML as text', async () => {
    const { wrapper } = await show(
      '<script>alert(1)</script>\n\nAn <b>inline</b> tag <img src=x onerror=alert(1)>.',
    );
    expect(wrapper.find('script, b, img').exists()).toBe(false);
    expect(wrapper.findAll('p').map((p) => p.text())).toEqual([
      '<script>alert(1)</script>',
      'An <b>inline</b> tag <img src=x onerror=alert(1)>.',
    ]);
  });

  it('shows a construct outside the allow-list as its text', async () => {
    const { wrapper } = await show(
      '# Heading\n\n> Quoted\n\n---\n\n~~struck~~ ![a picture](https://example.com/x.png)',
    );
    expect(wrapper.find('h1, blockquote, hr, s, img').exists()).toBe(false);
    expect(wrapper.text()).toContain('Heading');
    expect(wrapper.text()).toContain('Quoted');
    expect(wrapper.text()).toContain('struck a picture');
  });

  it.each([
    ['[the text](javascript:alert(1))'],
    ['[the text](http://example.com/)'],
    ['[the text](help:terms/)'],
    ['[the text](relative/page)'],
    ['[the **text**](data:text/html,x)'],
  ])('shows %s as its text only', async (markdown) => {
    const { wrapper } = await show(markdown);
    expect(wrapper.text()).toBe('the text');
    expect(wrapper.find('a, button').exists()).toBe(false);
  });

  it('makes a term link a trigger with the text of the link', async () => {
    const { wrapper } = await show('See [those `symbols`](help:terms/ticker).');
    const trigger = wrapper.getComponent(TermTrigger);
    expect(trigger.props()).toMatchObject({
      termId: 'ticker',
      name: 'those symbols',
    });
    expect(trigger.get('button').text()).toBe('those symbols');
    expect(wrapper.find('a').exists()).toBe(false);
    await trigger.get('button').trigger('click');
    expect(openPanelContent.value?.title).toBe(nameOf('ticker'));
  });

  it('shows a link to a term the index does not list as its text', async () => {
    const { wrapper } = await show('[a later term](help:terms/not-listed)');
    expect(wrapper.text()).toBe('a later term');
    expect(wrapper.find('a, button').exists()).toBe(false);
  });

  it('makes a guide link a link in the application, with and without a section', async () => {
    const { wrapper, router } = await show(
      '[guide](help:documents/finance-math) and [part](help:documents/finance-math#a-part)',
    );
    const [guide, part] = wrapper.findAll('a');
    expect(guide?.attributes('href')).toBe('/help/documents/finance-math');
    expect(part?.attributes('href')).toBe(
      `/help/documents/finance-math#${sectionElementId('a-part')}`,
    );
    await part?.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value).toMatchObject({
      name: 'help-document',
      params: { documentId: 'finance-math' },
      hash: `#${sectionElementId('a-part')}`,
    });
  });

  it('makes an https link further reading, which only the platform opens', async () => {
    const open = vi.spyOn(getPlatform(), 'openExternal');
    const { wrapper } = await show('[more](https://example.com/more)');
    const link = wrapper.getComponent(ExternalLink);
    expect(link.attributes()).toMatchObject({
      href: 'https://example.com/more',
      rel: 'noreferrer',
    });
    expect(link.text()).toContain('more');
    expect(link.text()).toContain(en.help.opensInBrowser);
    expect(link.get('[aria-hidden="true"]').text()).toBe(en.help.externalMark);
    expect(open).not.toHaveBeenCalled();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.element.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(open.mock.calls).toEqual([['https://example.com/more']]);
    const middle = new MouseEvent('auxclick', {
      bubbles: true,
      cancelable: true,
      button: 1,
    });
    link.element.dispatchEvent(middle);
    expect(middle.defaultPrevented).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
    open.mockRestore();
  });
});
