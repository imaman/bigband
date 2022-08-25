import { AstNode, Ident, Let } from './ast-node'
import { Scanner } from './scanner'

export class Parser {
  constructor(private readonly scanner: Scanner) {}

  parse() {
    const ret = this.expression()
    if (!this.scanner.eof()) {
      const s = this.scanner.synopsis()
      throw new Error(`Loitering input at position ${s.position}: <${s.lookingAt}>`)
    }
    return ret
  }

  definitions(): Let[] {
    const ret: Let[] = []
    while (this.scanner.consumeIf('let ')) {
      const ident = this.identifier()
      this.scanner.consume('=')
      const value = this.lambda()
      this.scanner.consume(';')

      ret.push({ ident, value })
    }

    return ret
  }

  expression(): AstNode {
    return { tag: 'topLevelExpression', definitions: this.definitions(), computation: this.lambda() }
  }

  lambda(): AstNode {
    if (this.scanner.consumeIf('fun')) {
      this.scanner.consume('(')
      const args: Ident[] = []

      if (this.scanner.consumeIf(')')) {
        // no formal args
      } else {
        while (true) {
          const arg = this.identifier()
          args.push(arg)
          if (this.scanner.consumeIf(')')) {
            break
          }

          this.scanner.consume(',')
        }
      }

      const body = this.expression()
      return { tag: 'lambda', formalArgs: args, body }
    }

    return this.ifExpression()
  }

  ifExpression(): AstNode {
    if (!this.scanner.consumeIf('if')) {
      return this.or()
    }

    this.scanner.consume('(')
    const condition = this.expression()
    this.scanner.consume(')')

    const positive = this.expression()

    this.scanner.consume('else')

    const negative = this.expression()

    return { tag: 'if', condition, positive, negative }
  }

  or(): AstNode {
    const lhs = this.and()
    if (this.scanner.consumeIf('||')) {
      return { tag: 'binaryOperator', operator: '||', lhs, rhs: this.or() }
    }
    return lhs
  }

  and(): AstNode {
    const lhs = this.equality()
    if (this.scanner.consumeIf('&&')) {
      return { tag: 'binaryOperator', operator: '&&', lhs, rhs: this.and() }
    }
    return lhs
  }

  equality(): AstNode {
    const lhs = this.comparison()
    if (this.scanner.consumeIf('==')) {
      return { tag: 'binaryOperator', operator: '==', lhs, rhs: this.equality() }
    }
    if (this.scanner.consumeIf('!=')) {
      return { tag: 'binaryOperator', operator: '!=', lhs, rhs: this.equality() }
    }
    return lhs
  }

  comparison(): AstNode {
    const lhs = this.addition()
    if (this.scanner.consumeIf('>=')) {
      return { tag: 'binaryOperator', operator: '>=', lhs, rhs: this.comparison() }
    }
    if (this.scanner.consumeIf('<=')) {
      return { tag: 'binaryOperator', operator: '<=', lhs, rhs: this.comparison() }
    }
    if (this.scanner.consumeIf('>')) {
      return { tag: 'binaryOperator', operator: '>', lhs, rhs: this.comparison() }
    }
    if (this.scanner.consumeIf('<')) {
      return { tag: 'binaryOperator', operator: '<', lhs, rhs: this.comparison() }
    }
    return lhs
  }

  addition(): AstNode {
    const lhs = this.multiplication()
    if (this.scanner.consumeIf('+')) {
      return { tag: 'binaryOperator', operator: '+', lhs, rhs: this.addition() }
    }
    if (this.scanner.consumeIf('-')) {
      return { tag: 'binaryOperator', operator: '-', lhs, rhs: this.addition() }
    }
    return lhs
  }

  multiplication(): AstNode {
    const lhs = this.power()
    if (this.scanner.consumeIf('*')) {
      return { tag: 'binaryOperator', operator: '*', lhs, rhs: this.multiplication() }
    }
    if (this.scanner.consumeIf('/')) {
      return { tag: 'binaryOperator', operator: '/', lhs, rhs: this.multiplication() }
    }
    if (this.scanner.consumeIf('%')) {
      return { tag: 'binaryOperator', operator: '%', lhs, rhs: this.multiplication() }
    }
    return lhs
  }

  power(): AstNode {
    const lhs = this.unary()
    if (this.scanner.consumeIf('**')) {
      return { tag: 'binaryOperator', operator: '**', lhs, rhs: this.power() }
    }
    return lhs
  }

  unary(): AstNode {
    if (this.scanner.consumeIf('!')) {
      return { tag: 'unaryOperator', operand: this.unary(), operator: '!' }
    }
    if (this.scanner.consumeIf('+')) {
      return { tag: 'unaryOperator', operand: this.unary(), operator: '+' }
    }
    if (this.scanner.consumeIf('-')) {
      return { tag: 'unaryOperator', operand: this.unary(), operator: '-' }
    }

    return this.call()
  }

  call(): AstNode {
    const callee = this.parenthesized()

    let ret = callee
    while (true) {
      if (!this.scanner.consumeIf('(')) {
        return ret
      }

      const actualArgs: AstNode[] = []
      if (this.scanner.consumeIf(')')) {
        // no actual args
      } else {
        while (true) {
          const arg = this.expression()
          actualArgs.push(arg)
          if (this.scanner.consumeIf(')')) {
            break
          }
          this.scanner.consume(',')
        }
      }

      ret = { tag: 'functionCall', actualArgs, callee: ret }
    }
  }

  parenthesized(): AstNode {
    if (this.scanner.consumeIf('(')) {
      const ret = this.expression()
      this.scanner.consume(')')
      return ret
    }

    return this.literalOrIdent()
  }

  literalOrIdent(): AstNode {
    let t = this.scanner.consumeIf('true')
    if (t) {
      return { tag: 'literal', t }
    }
    t = this.scanner.consumeIf('false')
    if (t) {
      return { tag: 'literal', t }
    }

    t = this.scanner.consumeIf(/([0-9]*[.])?[0-9]+/)
    if (t) {
      return { tag: 'literal', t }
    }

    t = this.scanner.consumeIf(/"[^"]*"/)
    if (t) {
      return { tag: 'literal', t }
    }

    if (this.scanner.consumeIf('[')) {
      return this.arrayBody()
    }

    const ident = this.maybeIdentifier()
    if (ident) {
      return ident
    }

    const s = this.scanner.synopsis()
    throw new Error(`Unparsable input at position ${s.position}: ${s.lookingAt}`)
  }

  /**
   * This method assumes that the caller consumed the opening '[' token. It consumes the array's elements
   * (comma-separated list of expressions) as well as the closing ']' token.
   */
  arrayBody(): AstNode {
    if (this.scanner.consumeIf(']')) {
      // an empty array literal
      return { tag: 'arrayLiteral', elements: [] }
    }

    const elements: AstNode[] = []
    while (true) {
      const exp = this.expression()
      elements.push(exp)
      if (this.scanner.consumeIf(']')) {
        return { tag: 'arrayLiteral', elements }
      }

      this.scanner.consume(',')
    }
  }

  private identifier(): Ident {
    const ret = this.maybeIdentifier()
    if (!ret) {
      const s = this.scanner.synopsis()
      throw new Error(`Expected an identifier at position ${s.position} but found: ${s.lookingAt}`)
    }

    return ret
  }

  private maybeIdentifier(): Ident | undefined {
    const t = this.scanner.consumeIf(/[a-zA-Z][0-9A-Za-z_]*/)
    if (t) {
      return { tag: 'ident', t }
    }

    return undefined
  }
}
