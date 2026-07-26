import { AstNode } from './ast-node.js'
import { shouldNeverHappen } from './should-never-happen.js'

type Command =
  | {
      tag: 'binop'
      mod: '+' | '-' | '*' | '/' | '%' | '**' | '&&' | '||' | '>' | '<' | '>=' | '<=' | '==' | '!=' | '??'
    }
  | {
      tag: 'unop'
      mod: '!' | '-' | '+'
    }
  | {
      tag: 'const'
      param: string | number | boolean
    }
  | {
      tag: 'throw' | 'spreadmark' | 'constUndefined' | 'indexAccess'
    }
  | {
      tag: 'load' | 'dot' | 'store'
      param: string
    }
  | {
      tag: 'object' | 'array'|'exitScope'
      param: number
    }

export class CodeFile {
  readonly codes: Command[] = []

  push(c: Command) {
    this.codes.push(c)
  }
}

export class CodeEmitter {
  run(ast: AstNode, cf: CodeFile) {
    if (ast.tag === 'topLevelExpression') {
      for (const d of ast.definitions) {
        this.run(d, cf)
      }

      if (ast.computation) {
        this.run(ast.computation, cf)
      }

      if (ast.definitions.length) {
        cf.push({tag: 'exitScope', param: ast.definitions.length})
      }

      if (ast.throwToken) {
        cf.push({ tag: 'throw' })
      }
    } else if (ast.tag === 'arrayLiteral') {
      for (const part of ast.parts) {
        if (part.tag === 'element') {
          this.run(part.v, cf)
        } else if (part.tag === 'spread') {
          this.run(part.v, cf)
          cf.push({ tag: 'spreadmark' })
        } else {
          shouldNeverHappen(part)
        }
      }
      cf.push({tag: 'array', param: ast.parts.length})
    } else if (ast.tag === 'ident') {
      cf.push({ tag: 'load', param: ast.t.text })
    } else if (ast.tag === 'literal') {
      if (ast.type === 'bool' || ast.type === 'num') {
        cf.push({ tag: 'const', param: JSON.parse(ast.t.text) })
      } else if (ast.type === 'str') {
        cf.push({ tag: 'const', param: ast.t.text })
      } else if (ast.type === 'undef') {
        cf.push({ tag: 'constUndefined' })
      } else {
        shouldNeverHappen(ast.type)
      }
    } else if (ast.tag === 'unit') {
      this.run(ast.expression, cf)
    } else if (ast.tag === 'binaryOperator') {
      this.run(ast.lhs, cf)
      this.run(ast.rhs, cf)
      cf.push({ tag: 'binop', mod: ast.operator })
    } else if (ast.tag === 'dot') {
      this.run(ast.receiver, cf)
      cf.push({ tag: 'dot', param: ast.ident.t.text })
    } else if (ast.tag === 'export*') {
      throw new Error(`not yet: ${ast.tag}`)
    } else if (ast.tag === 'formalArg') {
      throw new Error(`not yet: ${ast.tag}`)
    } else if (ast.tag === 'functionCall') {
      throw new Error(`not yet: ${ast.tag}`)
    } else if (ast.tag === 'if') {
      throw new Error(`not yet: ${ast.tag}`)
    } else if (ast.tag === 'indexAccess') {
      this.run(ast.receiver, cf)
      this.run(ast.index, cf)
      cf.push({tag: 'indexAccess'})
    } else if (ast.tag === 'lambda') {
      throw new Error(`not yet: ${ast.tag}`)
    } else if (ast.tag === 'let') {
      this.run(ast.value, cf)
      cf.push({ tag: 'store', param: ast.ident.t.text })
    } else if (ast.tag === 'objectLiteral') {
      for (const part of ast.parts) {
        if (part.tag === 'hardName') {
          cf.push({ tag: 'const', param: part.k.t.text })
          this.run(part.v, cf)
        } else if (part.tag === 'computedName' || part.tag === 'quotedString' || part.tag === 'spread') {
          throw new Error(`not supported: ${JSON.stringify(part)}`)
        } else {
          shouldNeverHappen(part)
        }
      }
      cf.push({ tag: 'object', param: ast.parts.length })
    } else if (ast.tag === 'templateLiteral') {
      for (const part of ast.parts) {
        if (part.tag === 'string') {
          cf.push({ tag: 'const', param: part.value })
        } else if (part.tag === 'expression') {
          this.run(part.expr, cf)
        } else {
          shouldNeverHappen(part)
        }
        cf.push({ tag: 'array', param: ast.parts.length })
      }
    } else if (ast.tag === 'ternary') {
      throw new Error(`not yet: ${ast.tag}`)
    } else if (ast.tag === 'unaryOperator') {
      this.run(ast.operand, cf)
      cf.push({ tag: 'unop', mod: ast.operator })
    } else {
      shouldNeverHappen(ast)
    }
  }
}
