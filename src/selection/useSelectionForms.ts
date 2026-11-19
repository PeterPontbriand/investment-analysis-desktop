import { shallowRef, type ShallowRef } from 'vue';
import type { PathParameters } from '../api/client.ts';
import { useEngine } from '../api/engine.ts';
import {
  readSelectionSchema,
  type ReadForm,
  type SchemaNode,
} from './schema.ts';

// The path type names the strategies this API description declares; the
// engine may declare more, which the application treats alike.
type MethodId = PathParameters<
  'get',
  '/v1/strategies/{method_id}/selection'
>['method_id'];

export type FormLoad =
  | { kind: 'loading' }
  | { kind: 'error'; error: unknown }
  | { kind: 'ready'; form: ReadForm };

export type SelectionForms = {
  forms: ShallowRef<Record<string, FormLoad>>;
  // Fetches a strategy's selection form document once, and again after a
  // failure; a form that is loading or ready is kept while the screen is open.
  load(methodId: string): Promise<void>;
};

// The selection form of each strategy, read from
// GET /v1/strategies/{method_id}/selection (D189, D233).
export function useSelectionForms(): SelectionForms {
  const engine = useEngine();
  const forms = shallowRef<Record<string, FormLoad>>({});

  function set(methodId: string, state: FormLoad): void {
    forms.value = { ...forms.value, [methodId]: state };
  }

  async function load(methodId: string): Promise<void> {
    const current = forms.value[methodId];
    if (current !== undefined && current.kind !== 'error') return;
    set(methodId, { kind: 'loading' });
    try {
      const client = await engine.client();
      const { data } = await client.get(
        '/v1/strategies/{method_id}/selection',
        { path: { method_id: methodId as MethodId } },
      );
      set(methodId, {
        kind: 'ready',
        form: readSelectionSchema(
          data.schema as unknown as SchemaNode,
          data.defaults,
        ),
      });
    } catch (error) {
      set(methodId, { kind: 'error', error });
    }
  }

  return { forms, load };
}
