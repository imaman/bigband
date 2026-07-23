# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
# Build the entire monorepo
yarn build

# Run all tests
yarn test

# Run linting
yarn lint

# Run a single test file (build first, then run jest on compiled output)
yarn build && NODE_OPTIONS=--experimental-vm-modules yarn jest modules/septima-lang/dist/tests/septima.spec.js

# Run tests for a specific module
cd modules/septima-lang && yarn test
```

Note: Tests run against compiled JavaScript in `dist/` directories, not TypeScript source. Always build before running tests.

The repo is ESM (`"type": "module"` in each module's package.json, `module: NodeNext` in tsconfig-base.json). Relative imports in TypeScript source must include the `.js` extension (e.g. `import { Name } from './name.js'`). Jest runs compiled ESM and requires `NODE_OPTIONS=--experimental-vm-modules`; the module-level and root `test` scripts already set it. Root-level config files (`jest.preset.js`, `.eslintrc.js`, `lint-staged.config.js`) remain CommonJS since the root package.json has no `type` field.

## Architecture

This is a TypeScript monorepo using Yarn workspaces with two modules:

### septima-lang

A secure, functional programming language designed for safely executing user-provided code. Key characteristics:

- Immutable variables and data structures
- No side effects - computations only produce values
- JavaScript-like syntax but stricter semantics (no type coercion, no null)
- Module system with namespace imports only (`import * as x from './file.septima.js'`)

**Core pipeline:** `Scanner` → `Parser` → `Runtime`

- `scanner.ts`: Lexical analysis, tokenization
- `parser.ts`: Produces AST (`ast-node.ts` defines node types)
- `runtime.ts`: Tree-walking interpreter with `SymbolTable` for scope management
- `value.ts`: Tagged union representing runtime values (num, str, bool, arr, obj, lambda, foreign, undef)
- `septima.ts`: Main entry point - `Septima.run()` for simple evaluation, `compile()` for multi-file programs

**Adding new syntax:** The scanner has no token type enum - tokens are just `{text, location}` objects. New syntax (like template literals) is added at the parser level using pattern matching, not by defining new token types in the scanner.

**Adding new literal types:** `maybePrimitiveLiteral()` returns `Literal | undefined` and is called by `imports()` which accesses `.type` and `.t` properties. To add a non-`Literal` AST node (like template literals), add it to `maybeLiteral()` instead, not `maybePrimitiveLiteral()`.

**Adding new AST node types:** When adding a new AST node, update these locations:

1. Add to `AstNode` union in `ast-node.ts`
2. Handle in `evalNodeImpl()` in `runtime.ts`
3. Handle in `importDefinitions()` in `runtime.ts` (for nodes that don't export)
4. Extend `show()` and `span()` functions in `ast-node.ts`
5. Add `show()`/`span()` tests in `parser.spec.ts`

Both `evalNodeImpl()` and `importDefinitions()` use `shouldNeverHappen(ast)` with TypeScript's `never` type, so missing cases cause compile-time errors.

**Scanner whitespace handling:** `scanner.consume()` and `consumeIf()` have an `eatWhitespace` parameter (default `true`). When parsing inside string/template literals, pass `false` to preserve whitespace in the content.

### kit

AWS CloudFormation infrastructure-as-code abstractions:

- `Bigband`: Container that resolves instruments into CloudFormation resources
- `Instrument`: Base abstraction for AWS resources (Lambda, S3Bucket, Role)
- `Section`: Configuration context for resource resolution

## Linting

Linting runs automatically via a pre-commit hook. Do NOT run `yarn lint` or `yarn lint:fix` after each change. Lint-level fixes (unused imports, import sorting, etc.) can be safely deferred until commit time — the hook will catch them and `yarn lint:fix` can be used to auto-fix before retrying the commit.

## Code Conventions

- ESLint enforces `no-console`, `no-process-env`, `no-process-exit` - use proper abstractions
- Type assertions are forbidden (`assertionStyle: 'never'`) - use type guards instead
- One top-level `describe` block per test file
- Unused imports are errors; unused variables prefixed with `_` are allowed
- Imports must be sorted (eslint-plugin-simple-import-sort)
