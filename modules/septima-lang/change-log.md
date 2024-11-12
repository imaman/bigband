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
- support `String(x)`, `Boolean(x)`, `Number(x)`

### PR/168

- support `Array.isArray(x)`
- support `console.log('my message')`

### PR/172

- supoort `JSON.parse(s)`
- supoort sorting an array: `[97, 100, 50].sort()`, `['the', 'quick', 'brown', 'fox'].sort((a, b) => a.length - b.length)`
- fix object comparsion

### PR/173

- allow a dangling comma after last formal arg of an arrow function `(a,b,) => a + b`
