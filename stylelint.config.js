export default {
  plugins: ['stylelint-use-logical'],
  overrides: [
    { files: ['**/*.vue'], customSyntax: 'postcss-html' },
    // Colour literals are allowed only in the token file (D142).
    {
      files: ['src/styles/tokens.css'],
      rules: {
        'color-no-hex': null,
        'color-named': null,
        'function-disallowed-list': null,
      },
    },
  ],
  rules: {
    'csstools/use-logical': 'always',
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'],
  },
};
