import { Value } from './value'

export interface SymbolTable {
  lookup(sym: string): Value
  export(): Record<string, unknown>
}
