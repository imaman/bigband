import { Instrument, WireSpec, Section } from "bigband-core";

export class InstrumentModel {
    constructor(public readonly section: Section, public readonly instrument: Instrument, public readonly wirings: WireSpec[]) {}
}
