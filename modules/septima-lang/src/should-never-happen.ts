export function shouldNeverHappen(n: never): never {
  // This following line never gets executed. It is here just to make the compiler happy.
  throw new Error(`This should never happen ${n}`)
}
