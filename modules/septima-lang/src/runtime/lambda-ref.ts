import { ValTable } from './val-table.js'

export class LambdaRef {
  constructor(readonly id: number, public readonly table: ValTable) {}

  toJSON() {
    return { id: this.id, _lambdaRef: '' }
  }
}
