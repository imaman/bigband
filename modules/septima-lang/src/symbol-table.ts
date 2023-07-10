import { Value } from './value'

export type Visibility = 'EXPORTED' | 'INTERNAL'

export interface SymbolTable {
  lookup(sym: string): Value
  export(): Record<string, unknown>
  exportValue(): Record<string, Value>
}
