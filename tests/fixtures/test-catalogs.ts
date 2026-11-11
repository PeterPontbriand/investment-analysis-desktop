// Test-only catalogs; aliased into the build only with --mode browser-test.
const modules = import.meta.glob('./locales/*.json', {
  eager: true,
  import: 'default',
});

export default Object.fromEntries(
  Object.entries(modules).map(([path, catalog]) => [
    path.replace(/^.*\//, '').replace(/\.json$/, ''),
    catalog,
  ]),
);
