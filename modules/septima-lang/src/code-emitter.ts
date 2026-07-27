import { AstNode } from './ast-node.js'
import { Instruction } from './instruction.js'
import { shouldNeverHappen } from './should-never-happen.js'

export class CodeFile {
  readonly instructions: Instruction[] = []

  add<T extends Instruction>(instruction: T): T {
    this.instructions.push(instruction)
    return instruction
  }

  get offset() {
    return this.instructions.length
  }
}

export class CodeEmitter {

  run(ast: AstNode) {
    const ret = new CodeFile()
    this.emit(ast, ret)
    return ret
  }

  private emit(ast: AstNode, cf: CodeFile) {
    if (ast.tag === 'topLevelExpression') {
      for (const d of ast.definitions) {
        this.emit(d, cf)
      }

      if (ast.computation) {
        this.emit(ast.computation, cf)
      }

      if (ast.definitions.length > 0) {
        cf.add({ tag: 'exitScope', param: ast.definitions.length })
      }

      if (ast.throwToken) {
        cf.add({ tag: 'throw' })
      }
    } else if (ast.tag === 'arrayLiteral') {
      for (const part of ast.parts) {
        if (part.tag === 'element') {
          this.emit(part.v, cf)
        } else if (part.tag === 'spread') {
          this.emit(part.v, cf)
          cf.add({ tag: 'spreadmark' })
        } else {
          shouldNeverHappen(part)
        }
      }
      cf.add({ tag: 'array', param: ast.parts.length })
    } else if (ast.tag === 'ident') {
      cf.add({ tag: 'load', param: ast.t.text })
    } else if (ast.tag === 'literal') {
      if (ast.type === 'bool' || ast.type === 'num') {
        cf.add({ tag: 'const', param: JSON.parse(ast.t.text) })
      } else if (ast.type === 'str') {
        cf.add({ tag: 'const', param: ast.t.text })
      } else if (ast.type === 'undef') {
        cf.add({ tag: 'constUndefined' })
      } else {
        shouldNeverHappen(ast.type)
      }
    } else if (ast.tag === 'unit') {
      this.emit(ast.expression, cf)
    } else if (ast.tag === 'binaryOperator') {
      const op = ast.operator
      if (op === '&&') {
        this.emit(ast.lhs, cf)
        const cond = cf.add({ tag: 'ifFalse', to: -1 })
        cf.add({ tag: 'drop' })
        this.emit(ast.rhs, cf)
        cf.add({tag: 'assertType', param: 'boolean'})
        cond.to = cf.offset
      } else if (op === '||') {
        this.emit(ast.lhs, cf)
        const cond = cf.add({ tag: 'ifTrue', to: -1 })
        cf.add({ tag: 'drop' })
        this.emit(ast.rhs, cf)
        cf.add({tag: 'assertType', param: 'boolean'})
        cond.to = cf.offset
      } else if (op === '??') {
        throw new Error(`not yet ${JSON.stringify(ast)}`)
      } else if (
        op === '!=' ||
        op === '%' ||
        op === '*' ||
        op === '**' ||
        op === '+' ||
        op === '-' ||
        op === '/' ||
        op === '<' ||
        op === '<=' ||
        op === '==' ||
        op === '>' ||
        op === '>='
      ) {
        this.emit(ast.lhs, cf)
        this.emit(ast.rhs, cf)
        cf.add({ tag: 'binop', mod: op })
      } else {
        shouldNeverHappen(op)
      }
    } else if (ast.tag === 'dot') {
      this.emit(ast.receiver, cf)
      cf.add({ tag: 'dot', param: ast.ident.t.text })
    } else if (ast.tag === 'export*') {
      throw new Error(`not yet: ${ast.tag}`)
    } else if (ast.tag === 'formalArg') {
      throw new Error(`not yet: ${ast.tag}`)
    } else if (ast.tag === 'functionCall') {
      throw new Error(`not yet: ${ast.tag}`)
    } else if (ast.tag === 'if' || ast.tag === 'ternary') {
      this.emit(ast.condition, cf)
      const cond = cf.add({ tag: 'ifFalse', to: 0 })
      cf.add({ tag: 'drop' })
      this.emit(ast.positive, cf)
      const positiveEnd = cf.add({ tag: 'jump', to: 0 })
      cond.to = cf.offset
      cf.add({ tag: 'drop' })
      this.emit(ast.negative, cf)
      positiveEnd.to = cf.offset
    } else if (ast.tag === 'indexAccess') {
      this.emit(ast.receiver, cf)
      this.emit(ast.index, cf)
      cf.add({ tag: 'indexAccess' })
    } else if (ast.tag === 'lambda') {
      throw new Error(`not yet: ${ast.tag}`)
    } else if (ast.tag === 'let') {
      this.emit(ast.value, cf)
      cf.add({ tag: 'store', param: ast.ident.t.text })
    } else if (ast.tag === 'objectLiteral') {
      for (const part of ast.parts) {
        if (part.tag === 'hardName') {
          cf.add({ tag: 'const', param: part.k.t.text })
          this.emit(part.v, cf)
        } else if (part.tag === 'computedName' || part.tag === 'quotedString' || part.tag === 'spread') {
          throw new Error(`not supported: ${JSON.stringify(part)}`)
        } else {
          shouldNeverHappen(part)
        }
      }
      cf.add({ tag: 'object', param: ast.parts.length })
    } else if (ast.tag === 'templateLiteral') {
      for (const part of ast.parts) {
        if (part.tag === 'string') {
          cf.add({ tag: 'const', param: part.value })
        } else if (part.tag === 'expression') {
          this.emit(part.expr, cf)
        } else {
          shouldNeverHappen(part)
        }
        cf.add({ tag: 'array', param: ast.parts.length })
      }
    } else if (ast.tag === 'unaryOperator') {
      this.emit(ast.operand, cf)
      cf.add({ tag: 'unop', mod: ast.operator })
    } else {
      shouldNeverHappen(ast)
    }
  }
}
