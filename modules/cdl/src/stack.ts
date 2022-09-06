import { AstNode } from './ast-node'
export type T = { ast: AstNode; next: T } | undefined

export function push(ast: AstNode, s: T) {
  return { ast, next: s }
}

export function pop(s: T) {
  if (typeof s === 'undefined') {
    throw new Error(`Cannot pop from an empty stack`)
  }

  return s.next
}

export function empty(): T {
  return undefined
}
