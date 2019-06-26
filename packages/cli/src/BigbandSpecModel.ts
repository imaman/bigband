import { BigbandSpec, Instrument } from "bigband-core";
import { Misc } from "./Misc";

export class BigbandSpecModel {
    constructor(private readonly spec: BigbandSpec) {}

    get instruments(): Instrument[] {
        return Misc.flatten(this.spec.sections.map(s => s.instruments))
    }
}
