import { Span } from './location'
import { Token } from './scanner'
import { shouldNeverHappen } from './should-never-happen'
import { switchOn } from './switch-on'

export type Let = { start: Token; ident: Ident; value: AstNode }

export type Import = {
  start: Token
  ident: Ident
  pathToImportFrom: Token
}

export type Literal = {
  tag: 'literal'
  type: 'str' | 'bool' | 'num' | 'sink' | 'sink!' | 'sink!!'
  t: Token
}

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

export type Unit = {
  tag: 'unit'
  imports: Import[]
  expression: AstNode
}

export type AstNode =
  | Ident
  | Literal
  | Unit
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
      computation?: AstNode
    }
  | Lambda
  | {
      tag: 'ternary'
      condition: AstNode
      positive: AstNode
      negative: AstNode
    }
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
  | {
      // A sepcial AST node meant to be generated internally (needed for exporting definition from one unit to another).
      // Not intended to be parsed from source code. Hence, it is effectively empty, and its location cannot be
      // determined.
      tag: 'export*'
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
  if (ast.tag === 'export*') {
    return `(export*)`
  }
  if (ast.tag === 'ternary') {
    return `${show(ast.condition)} ? ${show(ast.positive)} : ${show(ast.negative)}`
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
    return switchOn(ast.type, {
      bool: () => ast.t.text,
      num: () => ast.t.text,
      sink: () => 'sink',
      'sink!': () => 'sink!',
      'sink!!': () => 'sink!!',
      str: () => `'${ast.t.text}'`,
    })
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
    const sep = defs && ast.computation ? ' ' : ''
    return `${defs ? defs + ';' : ''}${sep}${ast.computation ? show(ast.computation) : ''}`
  }
  if (ast.tag === 'unaryOperator') {
    return `${ast.operator}${show(ast.operand)}`
  }
  if (ast.tag === 'unit') {
    const imports = ast.imports
      .map(imp => `import * as ${show(imp.ident)} from '${imp.pathToImportFrom.text}';`)
      .join('\n')
    return `${imports ? imports + '\n' : ''}${show(ast.expression)}`
  }

  shouldNeverHappen(ast)
}

export function span(ast: AstNode): Span {
  const ofRange = (a: Span, b: Span) => ({ from: a.from, to: b.to })
  const ofToken = (t: Token) => ({ from: t.location, to: { offset: t.location.offset + t.text.length - 1 } })

  if (ast.tag === 'arrayLiteral') {
    return ofRange(ofToken(ast.start), ofToken(ast.end))
  }
  if (ast.tag === 'binaryOperator') {
    return ofRange(span(ast.lhs), span(ast.rhs))
  }
  if (ast.tag === 'dot') {
    return ofRange(span(ast.receiver), span(ast.ident))
  }
  if (ast.tag === 'functionCall') {
    return ofRange(span(ast.callee), ofToken(ast.end))
  }
  if (ast.tag === 'ident') {
    return ofToken(ast.t)
  }
  if (ast.tag === 'export*') {
    return { from: { offset: 0 }, to: { offset: 0 } }
  }
  if (ast.tag === 'if') {
    return ofRange(span(ast.condition), span(ast.negative))
  }
  if (ast.tag === 'indexAccess') {
    return ofRange(span(ast.receiver), span(ast.index))
  }
  if (ast.tag === 'lambda') {
    return ofRange(ofToken(ast.start), span(ast.body))
  }
  if (ast.tag === 'ternary') {
    return ofRange(span(ast.condition), span(ast.negative))
  }
  if (ast.tag === 'literal') {
    return ofToken(ast.t)
  }
  if (ast.tag === 'objectLiteral') {
    return ofRange(ofToken(ast.start), ofToken(ast.end))
  }
  if (ast.tag === 'topLevelExpression') {
    if (ast.computation) {
      const d0 = ast.definitions.find(Boolean)
      const comp = span(ast.computation)
      return ofRange(d0 ? ofToken(d0.start) : comp, comp)
    } else if (ast.definitions.length) {
      const first = ast.definitions[0]
      const last = ast.definitions[ast.definitions.length - 1]
      return ofRange(ofToken(first.start), span(last.value))
    } else {
      return { from: { offset: 0 }, to: { offset: 0 } }
    }
  }
  if (ast.tag === 'unaryOperator') {
    return ofRange(ofToken(ast.operatorToken), span(ast.operand))
  }
  if (ast.tag === 'unit') {
    const i0 = ast.imports.find(Boolean)
    const exp = span(ast.expression)
    return ofRange(i0 ? ofToken(i0.start) : exp, exp)
  }

  shouldNeverHappen(ast)
}
