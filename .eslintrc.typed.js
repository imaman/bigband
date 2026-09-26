// Type-aware lint configuration, used by `yarn lint` (and therefore CI) but NOT by the pre-commit hook.
//
// Type information requires building a TypeScript program per module, which roughly doubles ESLint's run time.
// That is fine for a CI run but not for every commit, so lint-staged keeps using the plain `.eslintrc.js` and the
// rules below run only here.
module.exports = {
  extends: ['./.eslintrc.js'],
  plugins: ['deprecation'],
  overrides: [
    {
      files: ['*.ts', '*.mts'],
      parserOptions: {
        // `project: true` resolves each file against the nearest tsconfig.json, i.e. the one build-raptor generates
        // per module. The `lint` script runs `build-raptor generate-tsconfig` first so this works on a fresh clone.
        project: true,
        tsconfigRootDir: __dirname,
      },
      rules: {
        // Node removes an API only after it has been runtime-deprecated (and marked @deprecated in @types/node) for
        // at least one major, so this rule catches "compiles against @types/node@22 but gone at runtime on 24".
        'deprecation/deprecation': 'error',
      },
    },
    {
      // Tool configs at a module's root (e.g. lucidbit/vite.config.ts) are outside the generated tsconfig's include
      // list, so they cannot be type-checked; lint them without type information.
      files: ['modules/*/*.ts', 'modules/*/*.mts'],
      parserOptions: {
        project: null,
      },
      rules: {
        'deprecation/deprecation': 'off',
      },
    },
  ],
}
