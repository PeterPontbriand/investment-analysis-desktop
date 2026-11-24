import type { InjectionKey } from 'vue';

// Provided by the details panel to its body: a term trigger inside the panel
// steps to its content, with Back to the content it replaced, instead of
// opening the panel afresh (D362).
export const insidePanel: InjectionKey<boolean> = Symbol('insidePanel');
