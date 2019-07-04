import { WireSpec } from "bigband-core";
import { InstrumentModel } from "./InstrumentModel";

export class WireModel {
    constructor(private readonly spec: WireSpec, public readonly consumer: InstrumentModel,
            public readonly supplier: InstrumentModel) {}

    get name(): string {
        return this.spec.name
    }

    toString(): string {
        return `${this.consumer.path}: ${this.name} -> ${this.supplier.path}`
    }
}
