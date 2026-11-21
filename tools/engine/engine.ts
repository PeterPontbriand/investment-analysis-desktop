// Finding the engine checkout through `ian about`. `pnpm sandbox`, `pnpm vendor-ian`
// and `pnpm test:engine` share this, so none can check one engine while running
// another.
import { resolveIan, resolveIanInUv, type IanLocation } from './source.ts';
import type { FileSystem, Runner } from './types.ts';

export type EngineEnvironment = Record<string, string | undefined>;

// What `ian about --json` reports, with the field names the engine uses.
export type About = {
  engineVersion: string;
  // The folder of the source checkout the engine runs from; "" when the engine
  // reports none.
  installationFolder: string;
  // The full commit the folder is at; "" when the engine reports none.
  commit: string;
  // null when Git could not report the status.
  uncommittedChanges: boolean | null;
};

export type LocatedEngine = { ian: IanLocation; about: About };

// The engine cannot be used for the tool's purpose; the message says why and
// what to do.
export class EngineProblem extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineProblem';
  }
}

export const engineMessages = {
  ianNotExecutable: () =>
    'IAD_IAN_PATH names a .cmd or .bat file. The application and these tools start the engine without a shell, so IAD_IAN_PATH must name an executable (.exe), not a .cmd or .bat file.',
  noIan: () =>
    'The `ian` command was not found on PATH or in uv\'s command folder. Follow the engine\'s installation guide, "Make the `ian` command available" step, then open a new terminal and try again.',
  aboutUnknown: () =>
    'This engine does not know `ian about`, so it is older than the vendored commit. Update it by pulling main in your engine checkout, then try again.',
  aboutFailed: (detail: string) =>
    `\`ian about --json\` did not succeed (${detail}). Make the \`ian\` command available as the engine's installation guide describes.`,
  installedAsPackage: () =>
    'The engine is installed as a package, so there is no source checkout to use. This tool needs an engine installed from a source checkout of the investment-analysis-engine repository: follow the engine\'s installation guide, "Make the `ian` command available" step, from a checkout.',
  notCheckout: () =>
    "The engine's installation folder is not a Git checkout (`ian about` reports no commit). Install the engine from a Git checkout of the investment-analysis-engine repository.",
} as const;

function describe(code: number | null): string {
  return code === null ? 'could not be started' : `exited with status ${code}`;
}

// Reads the `ian about --json` document, or null when it is not one.
export function parseAbout(text: string): About | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const document = value as Record<string, unknown>;
  if (typeof document.engine_version !== 'string') return null;
  const folder = document.installation_folder;
  const commit = document.commit;
  const changes = document.uncommitted_changes;
  return {
    engineVersion: document.engine_version,
    installationFolder: typeof folder === 'string' ? folder : '',
    commit: typeof commit === 'string' ? commit.toLowerCase() : '',
    uncommittedChanges: typeof changes === 'boolean' ? changes : null,
  };
}

// What `ian about` said, without the installation folder: the output is kept in
// a record that is pasted into public pull requests.
export function aboutSummary(about: About): string {
  return `engine_version: ${about.engineVersion}, commit: ${about.commit || 'none'}, uncommitted_changes: ${about.uncommittedChanges ?? 'unknown'} (the installation folder is not recorded)`;
}

// Runs `ian about --json` and reads the document. `log` receives the command
// with output safe to record. Stops when the engine is older than the command,
// is installed as a package, or is not at a Git checkout.
export async function readAbout(
  run: Runner,
  ianPath: string,
  env: EngineEnvironment,
  log: (command: string, output: string) => void = () => {},
): Promise<About> {
  const result = await run(ianPath, ['about', '--json'], { env });
  const parsed = result.code === 0 ? parseAbout(result.stdout) : null;
  const output = `${result.stdout}${result.stderr}`;
  log('ian about --json', parsed === null ? output : aboutSummary(parsed));
  if (result.code !== 0 && /no such command/i.test(output))
    throw new EngineProblem(engineMessages.aboutUnknown());
  if (parsed === null)
    throw new EngineProblem(
      engineMessages.aboutFailed(
        result.code === 0
          ? 'its output is not the `ian about` document'
          : describe(result.code),
      ),
    );
  if (parsed.installationFolder === '')
    throw new EngineProblem(engineMessages.installedAsPackage());
  if (parsed.commit === '')
    throw new EngineProblem(engineMessages.notCheckout());
  return parsed;
}

// Looks for `ian` in IAD_IAN_PATH, then on PATH, then in uv's command folder,
// then asks it where it is installed.
export async function locateEngine(
  deps: {
    run: Runner;
    fs: FileSystem;
    env: EngineEnvironment;
    platform: string;
  },
  log: (command: string, output: string) => void = () => {},
): Promise<LocatedEngine> {
  const { run, fs, env, platform } = deps;
  const configured = env.IAD_IAN_PATH;
  if (configured !== undefined && /\.(cmd|bat)$/i.test(configured))
    throw new EngineProblem(engineMessages.ianNotExecutable());
  const exists = (path: string) => fs.exists(path);
  const ian =
    resolveIan(env, platform, exists) ??
    (await resolveIanInUv(run, env, platform, exists));
  if (ian === null) throw new EngineProblem(engineMessages.noIan());
  return { ian, about: await readAbout(run, ian.path, env, log) };
}
