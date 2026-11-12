export default {
  plugins: ['stylelint-use-logical'],
  overrides: [{ files: ['**/*.vue'], customSyntax: 'postcss-html' }],
  rules: { 'csstools/use-logical': 'always' },
};
