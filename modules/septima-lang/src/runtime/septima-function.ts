import { ValTable } from './val-table.js'

export class SeptimaFunction {
  constructor(readonly id: number, public readonly table: ValTable) {}

  toJSON() {
    return { cls: SeptimaFunction.name, chunkId: this.id }
  }
}
