import { Scanner, Token } from './scanner'

const IDENT = /[a-zA-Z][0-9A-Za-z_]*/

type Let = { ident: Token; value: AstNode }

export type AstNode =
  | {
      tag: 'literal'
      t: Token
    }
  | {
      tag: 'ident'
      t: Token
    }
  | {
      tag: 'binaryOperator'
      operator: '+' | '-' | '*' | '/' | '**' | '%' | '&&' | '||' | '>' | '<' | '>=' | '<=' | '==' | '!='
      lhs: AstNode
      rhs: AstNode
    }
  | {
      tag: 'unaryOperator'
      operator: '+' | '-' | '!'
      operand: AstNode
    }
  | {
      tag: 'topLevelExpression'
      definitions: Let[]
      computation: AstNode
    }

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
      const ident = this.scanner.consume(IDENT)
      this.scanner.consume('=')
      const value = this.or()
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
      //
    }

    return this.or()
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

    return this.functionCall()
  }

  functionCall(): AstNode {
    return this.parenthesized()
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

    t = this.scanner.consumeIf(IDENT)
    if (t) {
      return { tag: 'ident', t }
    }

    const s = this.scanner.synopsis()
    throw new Error(`Unparsable input at position ${s.position}: ${s.lookingAt}`)
  }
}
