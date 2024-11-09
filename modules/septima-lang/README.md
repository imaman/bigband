# Septima Programming Language

Septima is a modern programming language that closely follows JavaScript, not just in syntax but also in behavior. If you're familiar with JavaScript, you'll feel right at home with Septima's objects, arrays, functions, and built-in methods. However, Septima makes some deliberate departures from JavaScript to promote cleaner, more predictable code:

- It's immutable by default - variables cannot be reassigned after definition
- All expressions, including `if...else`, return values
- There are no `null` values - only `undefined`
- There's no automatic type coercion
- Side effects are minimized - the language promotes pure functional programming
- No global scope or `var` keyword - only lexical block scoping with `let`
- No classes or prototypes - object composition is preferred

## Table of Contents

- [Getting Started](#getting-started)
  - [Numbers and Arithmetic](#numbers-and-arithmetic)
  - [Booleans and Logic](#booleans-and-logic)
  - [Control Flow and Expressions](#control-flow-and-expressions)
  - [Variables and Immutability](#variables-and-immutability)
  - [Arrays and Objects](#arrays-and-objects)
  - [Functions](#functions)
  - [Built-in Methods](#built-in-methods)
  - [Modern Features](#modern-features)
  - [Console Output](#console-output-for-debugging)
  - [Type Conversion](#type-conversion)
  - [Modules and Exports](#modules-and-exports)
  - [Error Handling](#error-handling)
- [Quick Start Tutorial: Task Tracker](#quick-start-tutorial-build-a-task-tracker)
- [Best Practices](#best-practices)

## Getting Started

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
  .toUpperCase() // Returns new string
  [(1, 2, 3)].map(x => x * 2) // Returns new array

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

## Quick Start Tutorial: Build a Task Tracker

Let's build a simple task management system to learn Septima's key concepts. This tutorial demonstrates immutable state management, pure functions, and functional programming patterns.

### Step 1: Representing Tasks

First, let's create a function that creates task objects:

```javascript
let createTask = (title, priority) => {
  return {
    title,
    priority,
    completed: false,
    created: Date.now(),
  }
}

// Create some sample tasks
let tasks = [
  createTask('Learn Septima', 'high'),
  createTask('Write documentation', 'medium'),
  createTask('Create examples', 'low'),
]
```

### Step 2: Task Operations

Now let's write some pure functions to handle task operations. Notice how each function returns a new array instead of modifying the existing one:

```javascript
// Add a new task to the list
let addTask = (tasks, title, priority) => {
  return [...tasks, createTask(title, priority)]
}

// Toggle task completion status
let toggleTask = (tasks, index) => {
  return tasks.map((task, i) => (i === index ? { ...task, completed: !task.completed } : task))
}

// Filter tasks by priority
let filterByPriority = (tasks, priority) => {
  return tasks.filter(task => task.priority === priority)
}
```

### Step 3: Task Statistics

Let's add some analysis functions:

```javascript
// Calculate completion statistics
let getStats = tasks => {
  let total = tasks.length
  let completed = tasks.filter(task => task.completed).length
  return {
    total,
    completed,
    pending: total - completed,
    percentComplete: total === 0 ? 0 : ((completed / total) * 100).toFixed(1),
  }
}

// Group tasks by priority
let groupByPriority = tasks => {
  return tasks.reduce(
    (groups, task) => ({
      ...groups,
      [task.priority]: [...(groups[task.priority] ?? []), task],
    }),
    {},
  )
}
```

### Step 4: Putting It All Together

Now let's use our functions to manage tasks:

```javascript
// Start with empty task list
let taskList = []

// Add some tasks
taskList = addTask(taskList, 'Learn Septima basics', 'high')
taskList = addTask(taskList, 'Practice with examples', 'medium')
taskList = addTask(taskList, 'Read documentation', 'medium')

// Complete a task (notice how we create new state each time)
taskList = toggleTask(taskList, 0)

// Get statistics
let statistics = getStats(taskList)
console.log(statistics) // Shows completion stats

// Get tasks grouped by priority
let groupedTasks = groupByPriority(taskList)
console.log(groupedTasks) // Shows tasks organized by priority

// Get only medium priority tasks
let mediumTasks = filterByPriority(taskList, 'medium')
console.log(mediumTasks) // Shows medium priority tasks
```

### Key Points Illustrated

This small program demonstrates several important Septima concepts:

1. **Immutability**: Notice how we never modify existing objects or arrays. Instead, we create new ones using spread operators and pure functions.

```javascript
// Creating new arrays
taskList = [...tasks, newTask]

// Creating new objects
return { ...task, completed: !task.completed }
```

2. **Pure Functions**: All our functions take inputs and return new values without modifying existing state.

```javascript
// Pure function example
let filterByPriority = (tasks, priority) => {
  return tasks.filter(task => task.priority === priority)
}
```

3. **Expression-Based**: We use expressions to compute values rather than statements to modify state.

```javascript
// Computing values through expressions
let statistics = getStats(taskList)
```

4. **Functional Methods**: We use array methods like `map`, `filter`, and `reduce` instead of loops.

```javascript
// Using functional array methods
tasks.filter(task => task.completed).length
```

5. **Type Safety**: The program would fail explicitly if we tried to:
   - Modify existing objects or arrays
   - Use undefined variables
   - Mix incompatible types

## Best Practices

When writing Septima code:

1. Embrace immutability - create new values instead of mutating existing ones
2. Use pure functions that don't depend on or modify external state
3. Take advantage of expression-based control flow
4. Rely on the strict type checking to catch errors early
5. Use explicit type conversions instead of relying on coercion
6. Choose descriptive variable names that reflect their purpose
7. Break complex expressions into smaller parts using intermediate variables
8. Take advantage of built-in array methods for data transformation
9. Use the nullish coalescing operator for handling undefined values
10. Export only the definitions that need to be public

## Conclusion

While Septima shares much of JavaScript's syntax and basic concepts, its focus on immutability, expression-based programming, and strict type checking creates a more predictable and maintainable programming environment. These intentional differences from JavaScript help prevent common bugs and promote functional programming patterns.

Whether you're a JavaScript developer looking to write more functional code, or you're new to programming entirely, Septima's clear semantics and predictable behavior make it an excellent language for both learning and practical development.
