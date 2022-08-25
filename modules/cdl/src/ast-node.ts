import { Token } from './scanner'

export type Let = { ident: Ident; value: AstNode }

export type Ident = {
  tag: 'ident'
  t: Token
}

export type Lambda = {
  tag: 'lambda'
  formalArgs: Ident[]
  body: AstNode
}

export type AstNode =
  | Ident
  | {
      tag: 'arrayLiteral'
      elements: AstNode[]
    }
  | {
      tag: 'objectLiteral'
      pairs: { k: Ident; v: AstNode }[]
    }
  | {
      tag: 'literal'
      type: 'str' | 'bool' | 'num'
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
  | Lambda
  | {
      tag: 'functionCall'
      actualArgs: AstNode[]
      callee: AstNode
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
