export type Instruction =
  | {
      tag: 'binop'
      mod: '+' | '-' | '*' | '/' | '%' | '**' | '>' | '<' | '>=' | '<=' | '==' | '!='
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
      tag: 'object' | 'array' | 'exitScope'
      param: number
    }
  | {
      tag: 'ifFalse' | 'jump' | 'ifTrue'
      to: number
    }
  | {
      tag: 'drop'
    }
  | {
      tag: 'assertType'
      param: 'string' | 'number' | 'boolean'
    }
  | {
      tag: 'lambdaRef'
      id: number
    }
  | {
      tag: 'call'
      param: number
    }
  | {
      /** Loads a positional arg passed to a lambda onto the opstack */
      tag: 'loadArg'
      param: number
    }
  | {
      tag: 'prepare'
      name: string
    }
  | {
      tag: 'resolve'
      name: string
    }
