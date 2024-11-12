import {
  ArrayLiteralPart,
  AstNode,
  FormalArg,
  Ident,
  Import,
  Let,
  Literal,
  ObjectLiteralPart,
  span,
  Unit,
} from './ast-node'
import { Scanner, Token } from './scanner'
import { switchOn } from './switch-on'

export class Parser {
  constructor(private readonly scanner: Scanner) {}

  private get unitId() {
    return this.scanner.sourceCode.pathFromSourceRoot
  }

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
    return { tag: 'unit', imports, expression, unitId: this.scanner.sourceCode.pathFromSourceRoot }
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
        undef: notString,
        str: () => {},
      })
      ret.push({ start, ident, pathToImportFrom: pathToImportFrom.t, unitId: this.unitId })

      this.scanner.consumeIf(';')
    }
  }

  definitions(kind: 'TOP_LEVEL' | 'NESTED'): Let[] {
    const ret: Let[] = []
    while (true) {
      if (this.scanner.consumeIf(';')) {
        continue
      }
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

      if (this.scanner.headMatches(';')) {
        continue
      }
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
      return { tag: 'topLevelExpression', definitions, unitId: this.unitId }
    }
    this.scanner.consumeIf('return')
    const computation = this.lambda()

    if (definitions.length === 0) {
      return computation
    }

    return { tag: 'topLevelExpression', definitions, computation, unitId: this.unitId }
  }

  formalArg(): FormalArg {
    const arg = this.identifier()
    let defaultValue: AstNode | undefined = undefined

    if (!this.scanner.headMatches('=>') && this.scanner.consumeIf('=')) {
      defaultValue = this.expression()
    }
    return { tag: 'formalArg', ident: arg, defaultValue, unitId: this.unitId }
  }

  lambda(): AstNode {
    const start = this.scanner.consumeIf('fun')
    if (!start) {
      return this.arrowFunction()
    }

    this.scanner.consume('(')
    const args: FormalArg[] = []

    if (this.scanner.consumeIf(')')) {
      // no formal args
    } else {
      while (true) {
        const arg = this.formalArg()
        args.push(arg)
        if (this.scanner.consumeIf(')')) {
          break
        }

        this.scanner.consume(',')
      }
    }

    const body = this.expression()
    return { tag: 'lambda', start, formalArgs: args, body, unitId: this.unitId }
  }

  arrowFunction(): AstNode {
    const unitId = this.unitId

    if (this.scanner.headMatches('(', ')', '=>')) {
      const start = this.scanner.consume('(')
      this.scanner.consume(')')
      this.scanner.consume('=>')
      const body = this.lambdaBody()
      return { tag: 'lambda', start, formalArgs: [], body, unitId }
    }
    if (this.scanner.headMatches(IDENT_PATTERN, '=>')) {
      const formal = this.formalArg()
      this.scanner.consume('=>')
      const body = this.lambdaBody()
      return { tag: 'lambda', start: formal.ident.t, formalArgs: [formal], body, unitId }
    }
    if (this.scanner.headMatches('(', IDENT_PATTERN, ')', '=>')) {
      const start = this.scanner.consume('(')
      const formal = this.formalArg()
      this.scanner.consume(')')
      this.scanner.consume('=>')
      const body = this.lambdaBody()
      return { tag: 'lambda', start, formalArgs: [formal], body, unitId }
    }
    if (this.scanner.headMatches('(', IDENT_PATTERN, { either: [',', '='], noneOf: ['=='] })) {
      const start = this.scanner.consume('(')
      const formalArgs: FormalArg[] = []
      let defaultSeen = false
      while (true) {
        const pos = this.scanner.sourceRef
        const formal = this.formalArg()
        if (defaultSeen && !formal.defaultValue) {
          throw new Error(`A required parameter cannot follow an optional parameter: ${pos}`)
        }

        defaultSeen = defaultSeen || Boolean(formal.defaultValue)
        formalArgs.push(formal)

        if (this.scanner.consumeIf(')')) {
          break
        }

        this.scanner.consume(',')
        if (this.scanner.consumeIf(')')) {
          break
        }
      }

      this.scanner.consume('=>')
      const body = this.lambdaBody()
      return { tag: 'lambda', start, formalArgs, body, unitId }
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

    return { tag: 'if', condition, positive, negative, unitId: this.unitId }
  }

  ternary(): AstNode {
    const condition = this.undefinedCoallesing()
    if (this.scanner.headMatches('??')) {
      return condition
    }

    if (!this.scanner.consumeIf('?')) {
      return condition
    }

    const positive = this.expression()
    this.scanner.consume(':')
    const negative = this.expression()

    return { tag: 'ternary', condition, positive, negative, unitId: this.unitId }
  }

  undefinedCoallesing(): AstNode {
    const lhs = this.or()
    if (this.scanner.consumeIf('??')) {
      return { tag: 'binaryOperator', operator: '??', lhs, rhs: this.undefinedCoallesing(), unitId: this.unitId }
    }
    return lhs
  }

  or(): AstNode {
    const lhs = this.and()
    if (this.scanner.consumeIf('||')) {
      return { tag: 'binaryOperator', operator: '||', lhs, rhs: this.or(), unitId: this.unitId }
    }
    return lhs
  }

  and(): AstNode {
    const lhs = this.equality()
    if (this.scanner.consumeIf('&&')) {
      return { tag: 'binaryOperator', operator: '&&', lhs, rhs: this.and(), unitId: this.unitId }
    }
    return lhs
  }

  equality(): AstNode {
    const lhs = this.comparison()
    if (this.scanner.consumeIf('==')) {
      return { tag: 'binaryOperator', operator: '==', lhs, rhs: this.equality(), unitId: this.unitId }
    }
    if (this.scanner.consumeIf('!=')) {
      return { tag: 'binaryOperator', operator: '!=', lhs, rhs: this.equality(), unitId: this.unitId }
    }
    return lhs
  }

  comparison(): AstNode {
    const lhs = this.addition()
    if (this.scanner.consumeIf('>=')) {
      return { tag: 'binaryOperator', operator: '>=', lhs, rhs: this.comparison(), unitId: this.unitId }
    }
    if (this.scanner.consumeIf('<=')) {
      return { tag: 'binaryOperator', operator: '<=', lhs, rhs: this.comparison(), unitId: this.unitId }
    }
    if (this.scanner.consumeIf('>')) {
      return { tag: 'binaryOperator', operator: '>', lhs, rhs: this.comparison(), unitId: this.unitId }
    }
    if (this.scanner.consumeIf('<')) {
      return { tag: 'binaryOperator', operator: '<', lhs, rhs: this.comparison(), unitId: this.unitId }
    }
    return lhs
  }

  addition(): AstNode {
    const lhs = this.multiplication()
    if (this.scanner.consumeIf('+')) {
      return { tag: 'binaryOperator', operator: '+', lhs, rhs: this.addition(), unitId: this.unitId }
    }
    if (this.scanner.consumeIf('-')) {
      return { tag: 'binaryOperator', operator: '-', lhs, rhs: this.addition(), unitId: this.unitId }
    }
    return lhs
  }

  multiplication(): AstNode {
    const lhs = this.power()
    if (this.scanner.consumeIf('*')) {
      return { tag: 'binaryOperator', operator: '*', lhs, rhs: this.multiplication(), unitId: this.unitId }
    }
    if (this.scanner.consumeIf('/')) {
      return { tag: 'binaryOperator', operator: '/', lhs, rhs: this.multiplication(), unitId: this.unitId }
    }
    if (this.scanner.consumeIf('%')) {
      return { tag: 'binaryOperator', operator: '%', lhs, rhs: this.multiplication(), unitId: this.unitId }
    }
    return lhs
  }

  power(): AstNode {
    const lhs = this.unary()
    if (this.scanner.consumeIf('**')) {
      return { tag: 'binaryOperator', operator: '**', lhs, rhs: this.power(), unitId: this.unitId }
    }
    return lhs
  }

  unary(): AstNode {
    let operatorToken = this.scanner.consumeIf('!')
    if (operatorToken) {
      return { tag: 'unaryOperator', operand: this.unary(), operator: '!', operatorToken, unitId: this.unitId }
    }
    operatorToken = this.scanner.consumeIf('+')
    if (operatorToken) {
      return { tag: 'unaryOperator', operand: this.unary(), operator: '+', operatorToken, unitId: this.unitId }
    }
    operatorToken = this.scanner.consumeIf('-')
    if (operatorToken) {
      return { tag: 'unaryOperator', operand: this.unary(), operator: '-', operatorToken, unitId: this.unitId }
    }

    return this.call()
  }

  call(): AstNode {
    const callee = this.memberAccess()

    if (!this.scanner.consumeIf('(')) {
      return callee
    }

    const { actualArgs, end } = this.actualArgList()
    return { tag: 'functionCall', actualArgs, callee, end, unitId: this.unitId }
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
        ret = { tag: 'dot', receiver: ret, ident: this.identifier(), unitId: this.unitId }
        continue
      }

      if (this.scanner.consumeIf('[')) {
        ret = { tag: 'indexAccess', receiver: ret, index: this.expression(), unitId: this.unitId }
        this.scanner.consume(']')
        continue
      }

      if (this.scanner.consumeIf('(')) {
        const { actualArgs, end } = this.actualArgList()
        ret = { tag: 'functionCall', actualArgs, callee: ret, end, unitId: this.unitId }
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
    let t = this.scanner.consumeIf('undefined')
    if (t) {
      return { tag: 'literal', type: 'undef', t, unitId: this.unitId }
    }
    t = this.scanner.consumeIf('true')
    if (t) {
      return { tag: 'literal', type: 'bool', t, unitId: this.unitId }
    }
    t = this.scanner.consumeIf('false')
    if (t) {
      return { tag: 'literal', type: 'bool', t, unitId: this.unitId }
    }

    t = this.scanner.consumeIf(/([0-9]*[.])?[0-9]+/)
    if (t) {
      return { tag: 'literal', type: 'num', t, unitId: this.unitId }
    }

    const stringLiteral = this.maybeStringLiteral()
    if (stringLiteral) {
      return stringLiteral
    }

    return undefined
  }

  maybeStringLiteral(): Literal | undefined {
    // double-quotes-enclosd string
    if (this.scanner.consumeIf(`"`, false)) {
      const t = this.scanner.consume(/[^"]*/)
      this.scanner.consume(`"`)
      return { tag: 'literal', type: 'str', t, unitId: this.unitId }
    }

    // single-quotes-enclosd string
    if (this.scanner.consumeIf(`'`, false)) {
      const t = this.scanner.consume(/[^']*/)
      this.scanner.consume(`'`)
      return { tag: 'literal', type: 'str', t, unitId: this.unitId }
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
      return { tag: 'arrayLiteral', start, parts: [], end: t, unitId: this.unitId }
    }

    const parts: ArrayLiteralPart[] = []
    while (true) {
      if (this.scanner.consumeIf(',')) {
        const end = this.scanner.consumeIf(']')
        if (end) {
          return { tag: 'arrayLiteral', start, parts, end, unitId: this.unitId }
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
        return { tag: 'arrayLiteral', start, parts, end, unitId: this.unitId }
      }

      this.scanner.consume(',')
      end = this.scanner.consumeIf(']')
      if (end) {
        return { tag: 'arrayLiteral', start, parts, end, unitId: this.unitId }
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
      return { tag: 'objectLiteral', start, parts: [], end: t, unitId: this.unitId }
    }

    const parts: ObjectLiteralPart[] = []

    const consumePart = () => {
      if (this.scanner.consumeIf('...')) {
        parts.push({ tag: 'spread', o: this.expression() })
        return
      }

      if (this.scanner.consumeIf('[')) {
        const k = this.expression()
        this.scanner.consume(']')
        this.scanner.consume(':')
        const v = this.expression()
        parts.push({ tag: 'computedName', k, v })
        return
      }

      const stringLiteral = this.maybeStringLiteral()
      if (stringLiteral) {
        this.scanner.consume(':')
        const v = this.expression()
        parts.push({ tag: 'quotedString', k: stringLiteral, v })
        return
      }

      const k = this.identifier()
      if (this.scanner.consumeIf(':')) {
        const v = this.expression()
        parts.push({ tag: 'hardName', k, v })
      } else {
        parts.push({ tag: 'hardName', k, v: k })
      }
    }

    while (true) {
      consumePart()
      let end = this.scanner.consumeIf('}')
      if (end) {
        return { tag: 'objectLiteral', start, parts, end, unitId: this.unitId }
      }

      this.scanner.consume(',')
      end = this.scanner.consumeIf('}')
      if (end) {
        return { tag: 'objectLiteral', start, parts, end, unitId: this.unitId }
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
      return { tag: 'ident', t, unitId: this.unitId }
    }

    return undefined
  }
}

const IDENT_PATTERN = /[a-zA-Z][0-9A-Za-z_]*/
