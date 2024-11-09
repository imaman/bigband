# A Quick Overview of Programming in Septima

Septima is a programming language that closely follows JavaScript, not just in syntax but also in behavior. If you're familiar with JavaScript, you'll feel right at home with Septima's objects, arrays, functions, and built-in methods. However, Septima makes some deliberate departures from JavaScript to promote cleaner, more predictable code:

- It is immutable - variables cannot be reassigned after definition
- Side effect free - a computation is only affected by its inputs. The only "trace" that a computation leaves is the value that it computed.
- All expressions, including `if...else`, return values
- There are no `null` values - only `undefined`
- There's no automatic type coercion
- No global scope or `var` keyword - only lexical block scoping with `let`
- No classes or prototypes - You can create objects using JavaScript's standard object notation (`{a: 'foo'}`).

## Table of Contents

- [Language Fundamentals](#language-fundamentals)
  - [Numbers and Arithmetic](#numbers-and-arithmetic)
  - [Booleans and Logic](#booleans-and-logic)
  - [Control Flow and Expressions](#control-flow-and-expressions)
  - [Variables and Immutability](#variables-and-immutability)
  - [Arrays and Objects](#arrays-and-objects)
  - [Conversions](#conversions)
- [Coding in Septima](#coding-in-septima)
  - [Functions](#functions)
  - [Extended Operators](#extended-operators)
  - [Built-in Methods](#built-in-methods)
  - [Console Output](#console-output-for-debugging)
  - [Modules](#modules)
  - [Error Handling](#error-handling)

## Language Fundamentals

Like JavaScript, Septima works with familiar data types like numbers, strings, and booleans. However, its treatment of these types is more strict and predictable than JavaScript's loose type handling.

### Numbers and Arithmetic

Numbers in Septima work similarly to JavaScript, but without the quirks. There's no automatic type coercion in arithmetic operations.

```javascript
// Similar to JavaScript
5 // Integer literal
3.14 // Floating point literal
8 * 2 // Multiplication
3 + 1 // Addition

// Different from JavaScript - no type coercion
'5' + 3 // Error: Cannot add string and number
5 + '3' // Error: Cannot add number and string
```

### Booleans and Logic

Boolean operations in Septima are similar to JavaScript but stricter. They only work with actual boolean values.

```javascript
// Similar to JavaScript
true || false // Logical OR
true && false // Logical AND

// Different from JavaScript - no truthy/falsy values
1 && 2 // Error: Expected boolean values
'' || 'default' // Error: Expected boolean values
```

### Control Flow and Expressions

Unlike JavaScript, all control structures in Septima are expressions that return values.

```javascript
// Different from JavaScript - if expressions return values
let result = if (4 > 3) 200 else -100  // Valid in Septima

// Different from JavaScript - no if statements without else
if (x > 0) doSomething()  // Error in Septima - must have else

// Ternary operator works the same as JavaScript
let result = (4 > 3) ? 200 : -100
```

### Variables and Immutability

One of the biggest differences from JavaScript is Septima's immutability. Variables cannot be reassigned after definition.

```javascript
// Similar to JavaScript - initial definition
let x = 5

// Different from JavaScript - no reassignment
x = 6 // Error: Cannot reassign variables

// Different from JavaScript - no var or const
var y = 10 // Error: var is not supported
const z = 15 // Error: const is not supported
```

### Arrays and Objects

Arrays and objects in Septima are immutable by default, unlike their mutable JavaScript counterparts.

```javascript
// Similar to JavaScript - creation and access
let arr = [1, 2, 3]
arr[0] // Returns 1

// Different from JavaScript - no mutation methods
arr.push(4) // Error: Arrays are immutable
arr[0] = 2 // Error: Arrays are immutable

// Object behavior
let obj = { a: 1, b: 2 }
obj.a // Returns 1

// Different from JavaScript - no mutation
obj.c = 3 // Error: Objects are immutable
obj.a = 2 // Error: Objects are immutable
```

### Conversions

Unlike JavaScript's automatic type coercion, Septima requires explicit conversion between different types. It provides three conversion functions that closely mirror their JavaScript counterparts in behavior.

The `String` function converts any value to its string representation:

```javascript
String(42) // "42"
String(3.14) // "3.14"
String(true) // "true"
String(undefined) // "undefined"
```

For objects and arrays, `String` produces a JSON representation of its argument:

```javascript
String({ a: 1 }) // "{"a":1}"
String([1, 2]) // "[1,2]"
```

The `Boolean` function implements standard truthiness rules, converting values to `true` or `false`:

```javascript
Boolean(42) // true
Boolean(0) // false
Boolean('hello') // true
Boolean('') // false
Boolean(undefined) // false
Boolean({}) // true
Boolean([]) // true
```

The `Number` function converts values to numbers where possible, returning `NaN` when conversion fails:

```javascript
Number('42') // 42
Number('3.14') // 3.14
Number('abc') // NaN
Number(true) // 1
Number(false) // 0
Number(undefined) // NaN
```

Unlike JavaScript, Septima requires these explicit conversions and does not perform automatic type coercion:

```javascript
"42" + 7                  // Error: Cannot add string and number
7 + "42"                  // Error: Cannot add number and string
let x = if ("hello") 1 else -1 // Error: Condition must be boolean
```

## Coding in Septima

### Functions

Functions in Septima are similar to JavaScript arrow functions, but with some key differences in scope and purity.

```javascript
// Similar to JavaScript - arrow functions
const double = x => x * 2

// Different from JavaScript - no function declarations
function double(x) {
  return x * 2
} // Error: Use arrow syntax

// Different from JavaScript - pure functions
let counter = 0
let increment = () => counter++ // Error: Cannot modify external state

// Different from JavaScript - no this binding
let obj = {
  name: 'test',
  getName: function () {
    return this.name
  }, // Error: No this keyword
}
```

### Extended Operators

#### Spread Operator (...)

The spread operator creates shallow copies of arrays and objects:

```javascript
// Objects
let user = { name: 'Sam', id: 123 }
let userWithRole = { ...user, role: 'admin' } // { name: 'Sam', id: 123, role: 'admin' }

// Arrays
let numbers = [1, 2, 3]
let moreNumbers = [...numbers, 4, 5] // [1, 2, 3, 4, 5]
```

#### Nullish Coalescing (??)

The nullish coalescing operator provides a way to handle undefined values:

```javascript
let config = {
  port: undefined,
  host: 'localhost',
}

let port = config.port ?? 8080 // Returns 8080 (fallback when undefined)
let host = config.host ?? 'default' // Returns 'localhost' (keeps defined value)
```

Note: Unlike JavaScript, Septima doesn't have `null`, so the nullish coalescing operator only works with `undefined`.

### Built-in Methods

Septima provides common methods for working with arrays, strings, and objects. These methods follow JavaScript conventions while maintaining Septima's no-side-effects guarantee. As such, methods such as Array.push() are not supported.

#### Modifying Arrays

Instead of mutating methods like `push()` use the spread operator to create new arrays:

```javascript
let nums = [1, 2, 3]
nums.push(4)       // Error: Array.push is not supported
[...nums, 4]       // Returns [1, 2, 3, 4]
```

#### Array and String Methods

Transform strings and arrays using familiar methods (non-exhaustive list):

```javascript
// String methods
'hello'.toUpperCase() // Returns "HELLO"
'hello_world'.split('_') // Returns ['hello', 'world']
'  piano  '
  .trim() // Returns "piano"

  [
    // Array methods
    (1, 2, 3)
  ].map(x => x * 2) // Returns [2, 4, 6]
  [(19, 6, 8, 3, 10)].filter(x => x > 5) // Returns [19, 6, 8, 10]
  [('1', '2', '3', '4', '5')].reduce((a, b) => a + b, 0) // Returns 10
```

#### Object Methods

Access and transform object properties and structure:

```javascript
let user = {
  name: 'Sam',
  role: 'admin',
  active: true,
}

// Get object keys as array
Object.keys(user) // Returns ['name', 'role', 'active']

// Get key-value pairs as array
Object.entries(user) // Returns [['name', 'Sam'], ['role', 'admin'], ['active', true]]

// Create object from key-value pairs
let pairs = [
  ['name', 'Pat'],
  ['role', 'user'],
]
Object.fromEntries(pairs) // Returns { name: 'Pat', role: 'user' }
```

#### Array.isArray()

Checks whether the given input is an array:

```javascript
Array.isArray([1, 2, 3]) // Returns true
Array.isArray('not array') // Returns false
Array.isArray({ key: 'val' }) // Returns false
```

### Console Output for Debugging

Like JavaScript, Septima provides `console.log()` for debugging and monitoring your code. However, unlike JavaScript's `console.log()` which can take multiple arguments, Septima's version accepts only a single argument. In keeping with Septima's functional nature, `console.log()` returns its argument, making it useful within expressions.

```javascript
// Basic logging - single argument only
console.log('Hello World') // Prints: Hello World

// Different from JavaScript - can't log multiple values
console.log('x', 42) // Error: Too many arguments

// Logging within expressions works because console.log returns its argument
let result = 5 * console.log(3) // Prints: 3, returns: 15

// Logging with arrays and objects
let arr = [1, 2, 3]
console.log(arr) // Prints: [1, 2, 3]
let obj = { a: 1, b: 2 }
console.log(obj) // Prints: {"a":1,"b":2}

// To log multiple values, you need to combine them first
console.log([x, y, z]) // Use an array
console.log({ x: x, y: y, z: z }) // Or an object
console.log('x=' + x + ', y=' + y) // Or string concatenation
```

### Modules

Septima provides a module system for organizing code across files, supporting exports and namespace imports.

#### Exports

Use the `export` keyword to expose values from a module:

```javascript
// utils.septima.js
export let capitalize = str => str.charAt(0).toUpperCase() + str.slice(1)

// config.septima.js
export let timeoutInSeconds = 30
export let retries = 3
```

Key points:

- Only top-level definitions can be exported
- Multiple exports per file are allowed
- No default exports

#### Imports

Import using the namespace pattern:

```javascript
import * as utils from './utils.septima.js'
import * as config from './config.septima.js'

// Use imported values
let result = utils.capitalize('hello')
let timeoutInMillis = config.timeoutInSeconds * 1000
```

Key points:

- Files must end with `.septima.js`
- Only namespace imports (`* as`) supported
- Imports must be at file top
- Paths are relative to current file
- No circular dependencies

### Error Handling

Unlike JavaScript's sometimes forgiving nature, Septima is strict about type checking and provides clear error messages. It doesn't do automatic type coercion or silent failures.

```javascript
// JavaScript allows this
'5' + 3 // "53"

// Septima throws an error
'5' + 3 // Error: Cannot add string and number

// JavaScript returns undefined
let obj = {}
obj.nonexistent.prop // TypeError: Cannot read property 'prop' of undefined

// Septima provides better error message
obj.nonexistent.prop // Error: Attempting to access property of undefined
```
