<script lang="ts">
/* global HTMLElement, ResizeObserver -- DOM types; src/ configures no browser globals */
/* eslint vue/one-component-per-file: off -- a code block is only ever part of this renderer */
import MarkdownIt, { type Token } from 'markdown-it';
import {
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  type VNode,
} from 'vue';
import { RouterLink, useRouter, type RouteLocationRaw } from 'vue-router';
import {
  classifyHelpLink,
  focusHelpTarget,
  sectionElementId,
} from '../api/helpLinks.ts';
import { closePanel } from '../composables/useDetailsPanel.ts';
import { useMessages } from '../i18n/index.ts';
import ExternalLink from './ExternalLink.vue';
import { insidePanel } from './panelScope.ts';
import TableScroll from './TableScroll.vue';
import TermTrigger from './TermTrigger.vue';

// The engine's Markdown as Vue elements (D366). The parser only parses: its
// tokens become elements from an allow-list, and any other token shows its text
// content, so nothing in served text can become markup of its own. Every href
// reaches classifyHelpLink, which alone decides what a link does (D367), so the
// parser's own check, which would leave a refused link as raw Markdown, is off.
const parser = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
});
parser.validateLink = () => true;

type Node = { token: Token; children: Node[] };
type Content = (VNode | string)[];

// The parser's flat list of opening, closing and self-contained tokens, as a tree.
function treeOf(tokens: Token[]): Node[] {
  const root: Node[] = [];
  const open: Node[][] = [root];
  for (const token of tokens) {
    if (token.nesting < 0) {
      open.pop();
      continue;
    }
    const node: Node = { token, children: treeOf(token.children ?? []) };
    open.at(-1)?.push(node);
    if (token.nesting > 0) open.push(node.children);
  }
  return root;
}

const textOf = (node: Node): string =>
  node.children.length > 0
    ? node.children.map(textOf).join('')
    : node.token.type === 'softbreak' || node.token.type === 'hardbreak'
      ? ' '
      : node.token.content;

// The elements that keep nothing but their content.
const plainElements: Record<string, string> = {
  strong_open: 'strong',
  em_open: 'em',
  bullet_list_open: 'ul',
  list_item_open: 'li',
  thead_open: 'thead',
  tbody_open: 'tbody',
  tr_open: 'tr',
};

const alignments: Record<string, string> = {
  'text-align:left': 'align-start',
  'text-align:center': 'align-center',
  'text-align:right': 'align-end',
};

// A code block keeps its lines and scrolls sideways in its own box, which is a
// tab stop with a name only while it overflows (D370).
const CodeBlock = defineComponent({
  props: { code: { type: String, required: true } },
  setup(props) {
    const { t } = useMessages();
    const box = ref<HTMLElement | null>(null);
    const overflows = ref(false);
    let observer: ResizeObserver | null = null;

    function measure(): void {
      const element = box.value;
      if (element !== null)
        overflows.value = element.scrollWidth > element.clientWidth;
    }

    onMounted(() => {
      measure();
      if (box.value === null || typeof ResizeObserver === 'undefined') return;
      observer = new ResizeObserver(measure);
      observer.observe(box.value);
    });
    onUpdated(measure);
    onBeforeUnmount(() => observer?.disconnect());

    return () =>
      h(
        'pre',
        {
          ref: box,
          class: 'help-code',
          dir: 'ltr',
          ...(overflows.value
            ? { tabindex: 0, role: 'group', 'aria-label': t('help.codeBlock') }
            : {}),
        },
        h('code', props.code),
      );
  },
});

export default defineComponent({
  props: {
    markdown: { type: String, required: true },
    lang: { type: [String, null], required: true },
  },
  setup(props) {
    const router = useRouter();
    const inPanel = inject(insidePanel, false);

    // A link out of the panel leaves the panel's content behind, also when only
    // the address's hash changes (D301). A link to the address already shown
    // makes no navigation, so its target gets focus here.
    function follow(to: RouteLocationRaw): void {
      const target = router.resolve(to);
      if (inPanel) closePanel({ returnFocus: false });
      if (target.fullPath === router.currentRoute.value.fullPath)
        focusHelpTarget(target.hash);
    }

    function link(node: Node): Content {
      const content = () => renderAll(node.children);
      const target = classifyHelpLink(String(node.token.attrGet('href') ?? ''));
      switch (target.kind) {
        case 'term':
          return [
            h(
              TermTrigger,
              { termId: target.termId, name: textOf(node) },
              content,
            ),
          ];
        case 'document': {
          const to = {
            name: 'help-document',
            params: { documentId: target.documentId },
            hash:
              target.sectionId === null
                ? ''
                : `#${sectionElementId(target.sectionId)}`,
          };
          return [h(RouterLink, { to, onClick: () => follow(to) }, content)];
        }
        case 'external':
          return [h(ExternalLink, { href: target.url }, content)];
        default:
          return content();
      }
    }

    function render(node: Node): Content {
      const { token, children } = node;
      const element = plainElements[token.type];
      if (element !== undefined) return [h(element, renderAll(children))];
      switch (token.type) {
        case 'paragraph_open':
          // A tight list's paragraphs are hidden.
          return token.hidden
            ? renderAll(children)
            : [h('p', renderAll(children))];
        case 'ordered_list_open':
          return [
            h(
              'ol',
              { start: token.attrGet('start') ?? undefined },
              renderAll(children),
            ),
          ];
        case 'table_open':
          return [h(TableScroll, () => h('table', renderAll(children)))];
        case 'th_open':
        case 'td_open':
          return [
            h(
              token.tag,
              { class: alignments[token.attrGet('style') ?? ''] },
              renderAll(children),
            ),
          ];
        case 'fence':
        case 'code_block':
          return [h(CodeBlock, { code: token.content.replace(/\n$/, '') })];
        case 'code_inline':
          return [h('code', token.content)];
        case 'softbreak':
          return [' '];
        case 'hardbreak':
          return [h('br')];
        case 'link_open':
          return link(node);
        case 'image':
          return [textOf(node)];
        default:
          return children.length > 0 ? renderAll(children) : [token.content];
      }
    }

    const renderAll = (nodes: Node[]): Content => nodes.flatMap(render);

    return () =>
      h(
        'div',
        { class: 'help-markdown', lang: props.lang ?? undefined },
        renderAll(treeOf(parser.parse(props.markdown, {}))),
      );
  },
});
</script>

<style scoped>
.help-markdown :deep(code) {
  font-family: var(--font-mono);
}

.help-markdown :deep(.help-code) {
  background: var(--color-surface);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  overflow-x: auto;
  padding: var(--space-2) var(--space-3);
  white-space: pre;
}

/* Served cells hold running text, so they wrap; a table too wide even so
   scrolls in its own box. A link in running text keeps its underline. */
.help-markdown :deep(th),
.help-markdown :deep(td) {
  vertical-align: baseline;
  white-space: normal;
}

.help-markdown :deep(td a),
.help-markdown :deep(th a) {
  text-decoration-line: underline;
}

.help-markdown :deep(.align-start) {
  text-align: start;
}

.help-markdown :deep(.align-center) {
  text-align: center;
}

.help-markdown :deep(.align-end) {
  text-align: end;
}
</style>
