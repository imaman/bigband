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
        if (!this.spec.instruments.find(curr => curr === instrument)) {
            throw new Error(`The given instrument ("${instrument.fullyQualifiedName()}") is not a member of the "${this.section.name}" section`)
        }
        return this.spec.wiring.filter(w => w.consumer === instrument)
    }
}
