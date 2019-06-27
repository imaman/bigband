import { Instrument, WireSpec, Section } from "bigband-core";
import { Misc } from "../Misc";

export class InstrumentModel {
    constructor(public readonly section: Section, public readonly instrument: Instrument, public readonly wirings: WireSpec[]) {}

    get physicalName(): string {
        return this.instrument.physicalName(this.section)
    }

    validate() {
        const dups = Misc.checkDuplicates(this.wirings.map(w => w.name))
        if (dups.length) {
            throw new Error(`Name collision(s) in wiring of "${this.instrument.physicalName(this.section)}": ${JSON.stringify(dups)}`)
        }
    }
}
