import { ref, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';

// A parameter of the route that shows this screen. The route object is shared
// and changes before the screen goes away, so this keeps the screen's own
// value and follows the route only while it still shows this screen.
export function useRouteParam(routeName: string, name: string): Ref<string> {
  const route = useRoute();
  const value = ref(String(route.params[name]));
  watch(
    () => route.params[name],
    (next) => {
      if (route.name === routeName && typeof next === 'string')
        value.value = next;
    },
  );
  return value;
}
