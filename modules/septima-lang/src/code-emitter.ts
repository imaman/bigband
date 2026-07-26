import { AstNode } from "./ast-node.js";
import { shouldNeverHappen } from "./should-never-happen.js";



export class CodeFile {
  readonly codes: ([string, string|number]|string)[] = []

  push(opcode: string, param?: string|number) {
    if (param === undefined) {
      this.codes.push(opcode)
    } else {
      this.codes.push([opcode, param])
    }
  }
}

type Command = {
  tag: ''
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

      if (ast.throwToken) {
        cf.push('throw')
      }
    } else if (ast.tag === 'arrayLiteral') {
      for (const part of ast.parts) {
        if (part.tag === 'element') {
          this.run(part.v, cf)
        } else if (part.tag === 'spread') {
          this.run(part.v, cf)
          cf.push('spreadmark')
        } else {
          shouldNeverHappen(part)
        }
      }
      
    } else if (ast.tag === 'ident') {
      cf.push('load', ast.t.text)
    } else if (ast.tag === 'literal') {
      if (ast.type === 'bool' || ast.type === 'num' || ast.type === 'str') {
        cf.push('const', ast.t.text)
      } else if (ast.type === 'undef') {
        cf.push('constUndefined')
      } else {
        shouldNeverHappen(ast.type)
      }
    } else if (ast.tag === 'unit') {
      this.run(ast.expression, cf)
    } else if (ast.tag === 'binaryOperator') {
      this.run(ast.lhs, cf)
      this.run(ast.rhs, cf)
      cf.push('binop' + ast.operator)
    } else if (ast.tag === 'dot') {
      this.run(ast.receiver, cf)
      cf.push('dot', ast.ident.t.text)
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
    } else if (ast.tag === 'lambda') {
      throw new Error(`not yet: ${ast.tag}`)
    } else if (ast.tag === 'let') {
      this.run(ast.value, cf)
      cf.push('store', ast.ident.t.text)
    } else if (ast.tag === 'objectLiteral') {
      for (const part of ast.parts) {
        if (part.tag === 'hardName') {
          cf.push(part.k.t.text)
          this.run(part.v, cf)
        } else if (part.tag === 'computedName' || part.tag === 'quotedString' || part.tag === 'spread') {
          throw new Error(`not supported: ${JSON.stringify(part)}`)
        } else {
          shouldNeverHappen(part)
        }
      }
      cf.push('object', ast.parts.length)
    } else if (ast.tag === 'templateLiteral') {
      for (const part of ast.parts) {
        if (part.tag === 'string') {
          cf.push('const', part.value)
        } else if (part.tag === 'expression') {
          this.run(part.expr, cf)
        } else {
          shouldNeverHappen(part)
        }
        cf.push('array', ast.parts.length)
      }
    } else if (ast.tag === 'ternary') {
       throw new Error(`not yet: ${ast.tag}`)
   } else if (ast.tag === 'unaryOperator') {
      this.run(ast.operand, cf)
      cf.push('unop' + ast.operator)
    } else {
      shouldNeverHappen(ast)
    }
  }
}


