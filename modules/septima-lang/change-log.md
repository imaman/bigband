### PR/153

- allow semicolons before the expression: `;;; 4.8`
- allow shorthand notation attributes in an object: `let n = 42; { n }`

### PR/163

- retire `sink` - it was too confusing + there are some things that undefined (in JS) can do but sink could not

### PR/164

- `undefined` is now a first class value: `let x = undefined`
- `{a: undefined, n: 42}` is identical to `{n: 42}`
- `undefined ?? 42` is `42`

### PR/165

- spreading `undefined` in an array is a no-op: `[42, ...undefined, 'poo']` is `[42, 'poo']`
- spreading `undefined` in an object is a no-op: `{n: 42, ...undefined, p: 'poo'}` is `{n: 42, p: 'poo'}`
