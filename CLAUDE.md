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
yarn build && yarn jest modules/septima-lang/dist/tests/septima.spec.js

# Run tests for a specific module
cd modules/septima-lang && yarn test
```

Note: Tests run against compiled JavaScript in `dist/` directories, not TypeScript source. Always build before running tests.

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

**Adding new literal types:** `maybePrimitiveLiteral()` returns `Literal | undefined` and is called by `imports()` which accesses `.type` and `.t` properties. To add a non-`Literal` AST node (like template literals), add it to `maybeLiteral()` instead, not `maybePrimitiveLiteral()`.

### kit

AWS CloudFormation infrastructure-as-code abstractions:

- `Bigband`: Container that resolves instruments into CloudFormation resources
- `Instrument`: Base abstraction for AWS resources (Lambda, S3Bucket, Role)
- `Section`: Configuration context for resource resolution

## Code Conventions

- ESLint enforces `no-console`, `no-process-env`, `no-process-exit` - use proper abstractions
- Type assertions are forbidden (`assertionStyle: 'never'`) - use type guards instead
- One top-level `describe` block per test file
- Unused imports are errors; unused variables prefixed with `_` are allowed
- Imports must be sorted (eslint-plugin-simple-import-sort)
