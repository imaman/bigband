import { ArrayLiteralPart, AstNode, Ident, Let, ObjectLiteralPart } from './ast-node'
import { Scanner, Token } from './scanner'

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
    while (true) {
      const start = this.scanner.consumeIf('let ')
      if (!start) {
        return ret
      }
      const ident = this.identifier()
      this.scanner.consume('=')
      const value = this.lambda()
      this.scanner.consume(';')

      ret.push({ start, ident, value })
    }
  }

  expression(): AstNode {
    const definitions = this.definitions()
    const computation = this.lambda()

    if (definitions.length === 0) {
      return computation
    }

    return { tag: 'topLevelExpression', definitions, computation }
  }

  lambda(): AstNode {
    const start = this.scanner.consumeIf('fun')
    if (!start) {
      return this.ifExpression()
    }

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
    return { tag: 'lambda', start, formalArgs: args, body }
  }

  ifExpression(): AstNode {
    if (!this.scanner.consumeIf('if')) {
      return this.unsink()
    }

    this.scanner.consume('(')
    const condition = this.expression()
    this.scanner.consume(')')

    const positive = this.expression()

    this.scanner.consume('else')

    const negative = this.expression()

    return { tag: 'if', condition, positive, negative }
  }

  unsink(): AstNode {
    const lhs = this.or()
    if (this.scanner.consumeIf('??')) {
      return { tag: 'binaryOperator', operator: '??', lhs, rhs: this.unsink() }
    }
    return lhs
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
    let operatorToken = this.scanner.consumeIf('!')
    if (operatorToken) {
      return { tag: 'unaryOperator', operand: this.unary(), operator: '!', operatorToken }
    }
    operatorToken = this.scanner.consumeIf('+')
    if (operatorToken) {
      return { tag: 'unaryOperator', operand: this.unary(), operator: '+', operatorToken }
    }
    operatorToken = this.scanner.consumeIf('-')
    if (operatorToken) {
      return { tag: 'unaryOperator', operand: this.unary(), operator: '-', operatorToken }
    }

    return this.call()
  }

  call(): AstNode {
    const callee = this.memberAccess()

    if (!this.scanner.consumeIf('(')) {
      return callee
    }

    const { actualArgs, end } = this.actualArgList()
    return { tag: 'functionCall', actualArgs, callee, end }
  }

  private actualArgList() {
    const actualArgs: AstNode[] = []
    const endEmpty = this.scanner.consumeIf(')')
    if (endEmpty) {
      // no actual args
      return { actualArgs, end: endEmpty }
    }

    while (true) {
      const arg = this.expression()
      actualArgs.push(arg)
      const end = this.scanner.consumeIf(')')
      if (end) {
        return { actualArgs, end }
      }
      this.scanner.consume(',')
    }
  }

  memberAccess(): AstNode {
    let ret = this.parenthesized()

    while (true) {
      if (this.scanner.consumeIf('.')) {
        ret = { tag: 'dot', receiver: ret, ident: this.identifier() }
        continue
      }

      if (this.scanner.consumeIf('[')) {
        ret = { tag: 'indexAccess', receiver: ret, index: this.expression() }
        this.scanner.consume(']')
        continue
      }

      if (this.scanner.consumeIf('(')) {
        const { actualArgs, end } = this.actualArgList()
        ret = { tag: 'functionCall', actualArgs, callee: ret, end }
        continue
      }

      return ret
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
    let t = this.scanner.consumeIf('sink!!')
    if (t) {
      return { tag: 'literal', type: 'sink!!', t }
    }

    t = this.scanner.consumeIf('sink!')
    if (t) {
      return { tag: 'literal', type: 'sink!', t }
    }

    t = this.scanner.consumeIf('sink')
    if (t) {
      return { tag: 'literal', type: 'sink', t }
    }

    t = this.scanner.consumeIf('true')
    if (t) {
      return { tag: 'literal', type: 'bool', t }
    }
    t = this.scanner.consumeIf('false')
    if (t) {
      return { tag: 'literal', type: 'bool', t }
    }

    t = this.scanner.consumeIf(/([0-9]*[.])?[0-9]+/)
    if (t) {
      return { tag: 'literal', type: 'num', t }
    }

    // double-quotes-enclosd string
    if (this.scanner.consumeIf(`"`, false)) {
      t = this.scanner.consume(/[^"]*/)
      this.scanner.consume(`"`)
      return { tag: 'literal', type: 'str', t }
    }

    // single-quotes-enclosd string
    if (this.scanner.consumeIf(`'`, false)) {
      t = this.scanner.consume(/[^']*/)
      this.scanner.consume(`'`)
      return { tag: 'literal', type: 'str', t }
    }

    t = this.scanner.consumeIf('[')
    if (t) {
      return this.arrayBody(t)
    }

    t = this.scanner.consumeIf('{')
    if (t) {
      return this.objectBody(t)
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
  arrayBody(start: Token): AstNode {
    const t = this.scanner.consumeIf(']')
    if (t) {
      // an empty array literal
      return { tag: 'arrayLiteral', start, parts: [], end: t }
    }

    const parts: ArrayLiteralPart[] = []
    while (true) {
      if (this.scanner.consumeIf('...')) {
        parts.push({ tag: 'spread', v: this.expression() })
      } else {
        const exp = this.expression()
        parts.push({ tag: 'element', v: exp })
      }

      const end = this.scanner.consumeIf(']')
      if (end) {
        return { tag: 'arrayLiteral', start, parts, end }
      }

      this.scanner.consume(',')
    }
  }

  /**
   * This method assumes that the caller consumed the opening '{' token. It consumes the object's attributes
   * (comma-separated list of key:value parirs) as well as the closing '}' token.
   */
  objectBody(start: Token): AstNode {
    const t = this.scanner.consumeIf('}')
    if (t) {
      // an empty array literal
      return { tag: 'objectLiteral', start, parts: [], end: t }
    }

    const parts: ObjectLiteralPart[] = []
    while (true) {
      if (this.scanner.consumeIf('...')) {
        parts.push({ tag: 'spread', o: this.expression() })
      } else if (this.scanner.consumeIf('[')) {
        const k = this.expression()
        this.scanner.consume(']')
        this.scanner.consume(':')
        const v = this.expression()
        parts.push({ tag: 'computedName', k, v })
      } else {
        const k = this.identifier()
        this.scanner.consume(':')
        const v = this.expression()
        parts.push({ tag: 'hardName', k, v })
      }

      const end = this.scanner.consumeIf('}')
      if (end) {
        return { tag: 'objectLiteral', start, parts, end }
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
