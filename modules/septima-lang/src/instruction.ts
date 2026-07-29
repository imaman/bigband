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
      tag: 'exitScope'
      param: number
    }
  | {
      /**
       * Pops n*2 values from the opstack ("object inputs"), constructs an object of off these and pushes it back onto
       * the opstack. Each two consecrtive inputs are treated as key-value pair. Last pair popped will be added *first*
       * in the resulting object.
       */
      tag: 'object'
      n: number
      /**
       * Indexes of object inputs which should be spreaded into it. 0 means "spread the last pair popped". Should be
       * sorted (lowest first).
       */
      spreads: number[]
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
