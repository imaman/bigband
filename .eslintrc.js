module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
  },
  env: {
    es6: true,
    node: true,
  },
  plugins: ['@typescript-eslint', 'json', 'prettier', 'jest', 'simple-import-sort', 'unused-imports'],
  extends: ['eslint:recommended', 'plugin:json/recommended', 'prettier', 'plugin:jest/recommended'],
  globals: {},
  rules: {
    'jest/no-disabled-tests': 'off',
    'no-console': 'error',
    'no-process-env': 'error',
    'no-process-exit': 'error',
    'no-useless-escape': 'off', // rule has false positives
    'object-shorthand': 'error',
    'prettier/prettier': 'error',
  },
  overrides: [
    {
      files: ['*.ts', '*.mts', '*.tsx'],
      extends: ['plugin:@typescript-eslint/recommended'],
      rules: {
        '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
        '@typescript-eslint/member-delimiter-style': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-use-before-define': 'off',
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/ban-ts-ignore': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/camelcase': 'off',
        '@typescript-eslint/no-namespace': 'off',
        // This rule's purpose is to prevent "(not) properly using arrow lambdas ... or not managing scope well". Both
        // of these are issues which do not arise in this code base.
        '@typescript-eslint/no-this-alias': 'off',
        // '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-unused-vars': 'off',
        'jest/require-top-level-describe': [
          'error',
          {
            maxNumberOfTopLevelDescribes: 1,
          },
        ],
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
          'warn',
          { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
        ],
        'no-constant-condition': ['error', { checkLoops: false }],
        // Relative imports must spell out the extension of the emitted file (e.g. './name.js'). Under NodeNext tsc
        // enforces this itself, but modules that use `moduleResolution: Bundler` (brainbox) accept extensionless
        // paths, so the convention is enforced here.
        'no-restricted-syntax': [
          'error',
          ...['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].map(t => ({
            selector: `${t} > Literal.source[value=/^\\.(?!.*\\.([cm]?js|json)$)/]`,
            message: "Relative imports must include the file extension (e.g. './name.js').",
          })),
        ],
        'no-inner-declarations': 'off',
      },
    },
    {
      files: ['*.spec.ts'],
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    {
      // React components (e.g. modules/brainbox/ui/). Only the two classic hooks rules: the plugin's `recommended`
      // preset also turns on its React Compiler rules, which this repo does not use.
      files: ['*.tsx'],
      plugins: ['react-hooks'],
      rules: {
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'error',
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
}
