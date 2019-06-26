import { BigbandSpec, Instrument, Section, WireSpec, SectionSpec } from "bigband-core";


export class SectionSpecModel {
    constructor(private readonly spec: SectionSpec) {}

    getWiringsOf(instrument: Instrument): WireSpec[] {
        return this.spec.wiring.filter(w => w.consumer === instrument)
    }
}
