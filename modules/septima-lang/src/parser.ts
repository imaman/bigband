import { ArrayLiteralPart, AstNode, Ident, Import, Let, Literal, ObjectLiteralPart, span, Unit } from './ast-node'
import { Scanner, Token } from './scanner'
import { switchOn } from './switch-on'

export class Parser {
  constructor(private readonly scanner: Scanner) {}

  parse(): Unit {
    const ret = this.unit()
    if (!this.scanner.eof()) {
      throw new Error(`Loitering input ${this.scanner.sourceRef}`)
    }
    return ret
  }

  unit(): Unit {
    const imports = this.imports()
    const expression = this.expression('TOP_LEVEL')
    return { tag: 'unit', imports, expression, pathFromSourceRoot: this.scanner.sourceCode.pathFromSourceRoot }
  }

  imports(): Import[] {
    const ret: Import[] = []
    while (true) {
      const start = this.scanner.consumeIf('import')
      if (!start) {
        return ret
      }

      this.scanner.consume('*')
      this.scanner.consume('as')
      const ident = this.identifier()
      this.scanner.consume('from')
      const pathToImportFrom = this.maybePrimitiveLiteral()
      if (pathToImportFrom === undefined) {
        throw new Error(`Expected a literal ${this.scanner.sourceRef}`)
      }

      const notString = () => {
        throw new Error(`Expected a string literal ${this.scanner.sourceCode.sourceRef(span(pathToImportFrom))}`)
      }
      switchOn(pathToImportFrom.type, {
        bool: notString,
        num: notString,
        str: () => {},
        sink: notString,
        'sink!': notString,
        'sink!!': notString,
      })
      ret.push({ start, ident, pathToImportFrom: pathToImportFrom.t })

      this.scanner.consumeIf(';')
    }
  }

  definitions(kind: 'TOP_LEVEL' | 'NESTED'): Let[] {
    const ret: Let[] = []
    while (true) {
      if (kind === 'NESTED') {
        if (this.scanner.headMatches('export ')) {
          throw new Error(`non-top-level definition cannot be exported ${this.scanner.sourceRef}`)
        }
      }
      let start = this.scanner.consumeIf('let ')
      let isExported = false
      if (!start && kind === 'TOP_LEVEL') {
        start = this.scanner.consumeIf('export let ')
        isExported = true
      }
      if (!start) {
        return ret
      }
      const ident = this.identifier()
      this.scanner.consume('=')
      const value = this.lambda()
      ret.push({ start, ident, value, isExported })

      this.scanner.consumeIf(';')
      if (this.scanner.headMatches('let ')) {
        continue
      }

      if (this.scanner.headMatches('export ')) {
        continue
      }
      return ret
    }
  }

  expression(kind: 'TOP_LEVEL' | 'NESTED' = 'NESTED'): AstNode {
    const definitions = this.definitions(kind)
    if (kind === 'TOP_LEVEL' && this.scanner.eof()) {
      return { tag: 'topLevelExpression', definitions }
    }
    this.scanner.consumeIf('return')
    const computation = this.lambda()

    if (definitions.length === 0) {
      return computation
    }

    return { tag: 'topLevelExpression', definitions, computation }
  }

  lambda(): AstNode {
    const start = this.scanner.consumeIf('fun')
    if (!start) {
      return this.arrowFunction()
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

  arrowFunction(): AstNode {
    if (this.scanner.headMatches('(', ')', '=>')) {
      const start = this.scanner.consume('(')
      this.scanner.consume(')')
      this.scanner.consume('=>')
      const body = this.lambdaBody()
      return { tag: 'lambda', start, formalArgs: [], body }
    }
    if (this.scanner.headMatches(IDENT_PATTERN, '=>')) {
      const ident = this.identifier()
      this.scanner.consume('=>')
      const body = this.lambdaBody()
      return { tag: 'lambda', start: ident.t, formalArgs: [ident], body }
    }
    if (this.scanner.headMatches('(', IDENT_PATTERN, ')', '=>')) {
      const start = this.scanner.consume('(')
      const ident = this.identifier()
      this.scanner.consume(')')
      this.scanner.consume('=>')
      const body = this.lambdaBody()
      return { tag: 'lambda', start, formalArgs: [ident], body }
    }
    if (this.scanner.headMatches('(', IDENT_PATTERN, ',')) {
      const start = this.scanner.consume('(')
      const formalArgs: Ident[] = []
      while (true) {
        const ident = this.identifier()
        formalArgs.push(ident)

        if (this.scanner.consumeIf(')')) {
          break
        }

        this.scanner.consume(',')
      }

      this.scanner.consume('=>')
      const body = this.lambdaBody()
      return { tag: 'lambda', start, formalArgs, body }
    }

    return this.ifExpression()
  }

  private lambdaBody() {
    if (this.scanner.consumeIf('{')) {
      const ret = this.expression()
      this.scanner.consume('}')
      return ret
    }

    return this.expression()
  }

  ifExpression(): AstNode {
    if (!this.scanner.consumeIf('if')) {
      return this.ternary()
    }

    this.scanner.consume('(')
    const condition = this.expression()
    this.scanner.consume(')')

    const positive = this.expression()

    this.scanner.consume('else')

    const negative = this.expression()

    return { tag: 'if', condition, positive, negative }
  }

  ternary(): AstNode {
    const condition = this.unsink()
    if (this.scanner.headMatches('??')) {
      return condition
    }

    if (!this.scanner.consumeIf('?')) {
      return condition
    }

    const positive = this.expression()
    this.scanner.consume(':')
    const negative = this.expression()

    return { tag: 'ternary', condition, positive, negative }
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
      let end = this.scanner.consumeIf(')')
      if (end) {
        return { actualArgs, end }
      }
      this.scanner.consume(',')
      end = this.scanner.consumeIf(')')
      if (end) {
        return { actualArgs, end }
      }
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
    const ret = this.maybeLiteral() ?? this.maybeIdentifier()
    if (!ret) {
      throw new Error(`Unparsable input ${this.scanner.sourceRef}`)
    }
    return ret
  }

  maybeLiteral(): AstNode | undefined {
    return this.maybePrimitiveLiteral() ?? this.maybeCompositeLiteral()
  }

  maybePrimitiveLiteral(): Literal | undefined {
    let t = this.scanner.consumeIf('sink!!') || this.scanner.consumeIf('undefined!!')
    if (t) {
      return { tag: 'literal', type: 'sink!!', t }
    }

    t = this.scanner.consumeIf('sink!') || this.scanner.consumeIf('undefined!')
    if (t) {
      return { tag: 'literal', type: 'sink!', t }
    }

    t = this.scanner.consumeIf('sink') || this.scanner.consumeIf('undefined')
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

    return undefined
  }

  maybeCompositeLiteral(): AstNode | undefined {
    let t = this.scanner.consumeIf('[')
    if (t) {
      return this.arrayBody(t)
    }

    t = this.scanner.consumeIf('{')
    if (t) {
      return this.objectBody(t)
    }

    return undefined
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
      if (this.scanner.consumeIf(',')) {
        const end = this.scanner.consumeIf(']')
        if (end) {
          return { tag: 'arrayLiteral', start, parts, end }
        }
        continue
      }
      if (this.scanner.consumeIf('...')) {
        parts.push({ tag: 'spread', v: this.expression() })
      } else {
        const exp = this.expression()
        parts.push({ tag: 'element', v: exp })
      }

      let end = this.scanner.consumeIf(']')
      if (end) {
        return { tag: 'arrayLiteral', start, parts, end }
      }

      this.scanner.consume(',')
      end = this.scanner.consumeIf(']')
      if (end) {
        return { tag: 'arrayLiteral', start, parts, end }
      }
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

      let end = this.scanner.consumeIf('}')
      if (end) {
        return { tag: 'objectLiteral', start, parts, end }
      }

      this.scanner.consume(',')
      end = this.scanner.consumeIf('}')
      if (end) {
        return { tag: 'objectLiteral', start, parts, end }
      }
    }
  }

  private identifier(): Ident {
    const ret = this.maybeIdentifier()
    if (!ret) {
      throw new Error(`Expected an identifier ${this.scanner.sourceRef}`)
    }

    return ret
  }

  private maybeIdentifier(): Ident | undefined {
    const t = this.scanner.consumeIf(IDENT_PATTERN)
    if (t) {
      return { tag: 'ident', t }
    }

    return undefined
  }
}

const IDENT_PATTERN = /[a-zA-Z][0-9A-Za-z_]*/
