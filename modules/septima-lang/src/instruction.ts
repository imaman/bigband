export type Instruction =
  | {
      tag: 'import'
      /**
       * Chunk ID of the imported unit
       */
      chunkId: number
    }
  | {
      /**
       * Pushes onto the opstack an object that bundles the exported definitions of the current unit
       */
      tag: 'export*'
      /**
       * Number of definition in the current unit (including non-exported ones)
       */
      n: number
    }
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
       * Constructs an object from n "inputs" (one per part of the object literal, in source order) and pushes it onto
       * the opstack. A plain input occupies two stack slots: its key (pushed first) and its value. A spread input
       * occupies a single slot: the value to be spread. Thus, this instruction pops n*2 - spreads.length values
       * overall. Input 0 is the deepest on the stack (popped last). Attributes are added to the object in input order,
       * so when the same key appears in multiple inputs the last one wins.
       */
      tag: 'object'
      n: number
      /**
       * Indexes (into the n inputs) of the spread inputs, sorted ascending. A spread input must evaluate to an object
       * - whose attributes are then copied into the constructed object - or to undefined, which is a no-op.
       */
      spreads: number[]
    }
  | {
      /**
       * Pops n values from the opstack ("array inputs"), constructs an array out of these and pushes it back onto the
       * opstack. Last value popped will be placed *first* in the array. The resulting array length may not necessarily
       * be n due to spreading.
       */
      tag: 'array'
      n: number
      /**
       * Indexes (into the n inputs) of the spread inputs, sorted ascending. A spread input must evaluate to an array
       * - whose elements are then placed into the constructed array - or to undefined, which is a no-op.
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
      isExported: boolean
    }
  | {
      tag: 'fillIn'
      name: string
    }
