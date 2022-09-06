import { Token } from './scanner'
import { shouldNeverHappen } from './should-never-happen'

export type Let = { start: Token; ident: Ident; value: AstNode }

export type ObjectLiteralPart =
  | { tag: 'hardName'; k: Ident; v: AstNode }
  | { tag: 'computedName'; k: AstNode; v: AstNode }
  | { tag: 'spread'; o: AstNode }

export type ArrayLiteralPart = { tag: 'element'; v: AstNode } | { tag: 'spread'; v: AstNode }

export type Ident = {
  tag: 'ident'
  t: Token
}

export type Lambda = {
  tag: 'lambda'
  start: Token
  formalArgs: Ident[]
  body: AstNode
}

export type AstNode =
  | Ident
  | {
      start: Token
      tag: 'arrayLiteral'
      parts: ArrayLiteralPart[]
      end: Token
    }
  | {
      start: Token
      tag: 'objectLiteral'
      parts: ObjectLiteralPart[]
      end: Token
    }
  | {
      tag: 'literal'
      type: 'str' | 'bool' | 'num' | 'sink'
      t: Token
    }
  | {
      tag: 'binaryOperator'
      operator: '+' | '-' | '*' | '/' | '**' | '%' | '&&' | '||' | '>' | '<' | '>=' | '<=' | '==' | '!=' | '??'
      lhs: AstNode
      rhs: AstNode
    }
  | {
      tag: 'unaryOperator'
      operatorToken: Token
      operator: '+' | '-' | '!'
      operand: AstNode
    }
  | {
      tag: 'topLevelExpression'
      definitions: Let[]
      computation: AstNode
    }
  | Lambda
  | {
      tag: 'functionCall'
      actualArgs: AstNode[]
      callee: AstNode
      end: Token
    }
  | {
      tag: 'if'
      condition: AstNode
      positive: AstNode
      negative: AstNode
    }
  | {
      tag: 'dot'
      receiver: AstNode
      ident: Ident
    }
  | {
      tag: 'indexAccess'
      receiver: AstNode
      index: AstNode
    }

export function show(ast: AstNode | AstNode[]): string {
  if (Array.isArray(ast)) {
    return ast.map(curr => show(curr)).join(', ')
  }
  if (ast.tag === 'arrayLiteral') {
    const parts = ast.parts.map(p => {
      if (p.tag === 'element') {
        return show(p.v)
      }

      if (p.tag === 'spread') {
        return `...${show(p.v)}`
      }

      shouldNeverHappen(p)
    })
    return `[${parts.join(', ')}]`
  }

  if (ast.tag === 'binaryOperator') {
    return `(${show(ast.lhs)} ${ast.operator} ${show(ast.rhs)})`
  }

  if (ast.tag === 'dot') {
    return `${show(ast.receiver)}.${show(ast.ident)}`
  }

  if (ast.tag === 'functionCall') {
    return `${show(ast.callee)}(${show(ast.actualArgs)})`
  }
  if (ast.tag === 'ident') {
    return ast.t.text
  }
  if (ast.tag === 'if') {
    return `if (${show(ast.condition)}) ${show(ast.positive)} else ${show(ast.negative)}`
  }
  if (ast.tag === 'indexAccess') {
    return `${show(ast.receiver)}[${show(ast.index)}]`
  }
  if (ast.tag === 'lambda') {
    return `fun (${show(ast.formalArgs)}) ${show(ast.body)}`
  }
  if (ast.tag === 'literal') {
    return ast.t.text
  }
  if (ast.tag === 'objectLiteral') {
    const pairs = ast.parts.map(p => {
      if (p.tag === 'computedName') {
        return `[${show(p.k)}]: ${show(p.v)}`
      }

      if (p.tag === 'hardName') {
        return `${show(p.k)}: ${show(p.v)}`
      }

      if (p.tag === 'spread') {
        return `...${show(p.o)}`
      }

      shouldNeverHappen(p)
    })
    return `{${pairs.join(', ')}}`
  }
  if (ast.tag === 'topLevelExpression') {
    const defs = ast.definitions.map(d => `let ${show(d.ident)} = ${show(d.value)}`).join('; ')
    return `${defs ? defs + '; ' : ''}${show(ast.computation)}`
  }
  if (ast.tag === 'unaryOperator') {
    return `${ast.operator}${show(ast.operand)}`
  }

  shouldNeverHappen(ast)
}
