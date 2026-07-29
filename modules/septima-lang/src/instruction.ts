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
      tag: 'throw' | 'constUndefined' | 'indexAccess'
    }
  | {
      tag: 'load' | 'dot' | 'store'
      param: string
    }
  | {
      tag: 'object' | 'exitScope'
      param: number
    }
  | {
      /**
       * Pops n values from the opstack ("array inputs"), constructs an array of off these and pushes it back onto the
       * opstack. Last value popped will be placed *first* in the array. The resulitng array length may not necessarily
       * be n due to spreading.
       */
      tag: 'array'
      n: number
      /**
       * Indexes of array inpiuts which should be spreaded into it. 0 means "spread the last value popped". Should be
       * sorted (lowest first).
       */
      spreads: number[]
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
      /** Pushes a positional arg passed to a lambda onto the opstack */
      tag: 'loadArg'
      param: number
    }
  | {
      tag: 'reserve'
      name: string
    }
  | {
      tag: 'fillIn'
      name: string
    }
