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

- [Basic Topics](#basic-started)
  - [Numbers and Arithmetic](#numbers-and-arithmetic)
  - [Booleans and Logic](#booleans-and-logic)
  - [Control Flow and Expressions](#control-flow-and-expressions)
  - [Variables and Immutability](#variables-and-immutability)
  - [Arrays and Objects](#arrays-and-objects)
  - [Type Conversion](#type-conversion)
- [Advanced Topics](#advanced-started)
  - [Functions](#functions)
  - [Built-in Methods](#built-in-methods)
  - [Modern Features](#modern-features)
  - [Console Output](#console-output-for-debugging)
  - [Modules and Exports](#modules-and-exports)
  - [Error Handling](#error-handling)

## Basic Topics

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

### Type Conversion

Unlike JavaScript's automatic type coercion, Septima requires explicit type conversion. It provides three main conversion functions that work similarly to their JavaScript counterparts, but with stricter rules.

```javascript
// Number to String conversion
String(42) // "42"
String(3.14) // "3.14"
String(true) // "true"
String(undefined) // "undefined"
String({ a: 1 }) // "{"a":1}"
String([1, 2]) // "[1,2]"

// Convert to Boolean
Boolean(42) // true
Boolean(0) // false
Boolean('hello') // true
Boolean('') // false
Boolean(undefined) // false
Boolean({}) // true
Boolean([]) // true

// String to Number conversion
Number('42') // 42
Number('3.14') // 3.14
Number('abc') // NaN
Number(true) // 1
Number(false) // 0
Number(undefined) // NaN

// Different from JavaScript - no implicit conversion
'42' + 7 // Error: Cannot add string and number
7 + '42' // Error: Cannot add number and string
if ('hello') {
} // Error: Condition must be boolean
```

## Advanced Topics

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

### Built-in Methods

Septima provides many of the same array and string methods as JavaScript, but ensures they're pure functions that return new values rather than mutating existing ones.

```javascript
// Similar to JavaScript - immutable operations
'hello'
  .toUpperCase() // Returns "HELLO"

  [(1, 2, 3)].map(x => x * 2) // Returns new array [2, 4, 6]

// Different from JavaScript - no mutating methods
let arr = [1, 2, 3]
arr.push(4) // Error: No mutating methods
arr.sort() // Error: No mutating methods
```

### Modern Features

Septima includes many modern JavaScript features but implements them in a more consistent way.

```javascript
// Similar to JavaScript - spread operator
let obj = { a: 1, b: 2 }
let newObj = { ...obj, c: 3 }

// Different from JavaScript - nullish coalescing
undefined ?? 42 // Returns 42
null ?? 42 // Error: null doesn't exist in Septima
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

### Modules and Exports

Septima's module system is simpler than JavaScript's, focusing only on exports.

```javascript
// Similar to JavaScript - named exports
export let x = 5
export let double = x => x * 2

// Different from JavaScript - no default exports
export default x => x * 2 // Error: No default exports

// Different from JavaScript - no imports
import { x } from './module' // Not supported in this version
```

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
