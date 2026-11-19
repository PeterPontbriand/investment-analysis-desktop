// Fills an error's message template in the application's own words (D230): a
// parameter's placeholder becomes the label of the field it names, exactly as
// shown, and an argument's placeholder becomes its value.
export type RuleError = {
  rule: string;
  parameters: string[];
  arguments: Record<string, unknown>;
  message: string;
  template: string;
};

export function formatArgument(locale: string, value: unknown): string {
  if (typeof value === 'number')
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 20 }).format(
      value,
    );
  if (typeof value === 'string') return value;
  return JSON.stringify(value) ?? String(value);
}

// `label` gives the label of a parameter, or undefined when the form has none;
// the parameter is then shown as spelled. A template with a placeholder that
// is neither a parameter nor an argument is not filled: the engine's own
// message is shown instead.
export function fillTemplate(
  error: RuleError,
  label: (parameter: string) => string | undefined,
  locale: string,
): string {
  let unknown = false;
  const filled = error.template.replace(
    /\{([^{}]*)\}/g,
    (_match, name: string) => {
      if (error.parameters.includes(name)) return label(name) ?? name;
      if (Object.hasOwn(error.arguments, name))
        return formatArgument(locale, error.arguments[name]);
      unknown = true;
      return '';
    },
  );
  return unknown ? error.message : filled;
}
