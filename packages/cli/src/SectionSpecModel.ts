import { BigbandSpec, Instrument, Section, WireSpec, SectionSpec } from "bigband-core";


export class SectionSpecModel {
    constructor(private readonly spec: SectionSpec) {}

    get section() {
        return this.spec.section
    }

    get instruments(): Instrument[] {
        return this.spec.instruments;
    }

    getWiringsOf(instrument: Instrument): WireSpec[] {
        return this.spec.wiring.filter(w => w.consumer === instrument)
    }
}
