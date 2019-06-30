import { Instrument, WireSpec, Section } from "bigband-core";
import { Misc } from "../Misc";
import { Namer } from "../Namer";

export class InstrumentModel {
    constructor(public readonly section: Section, public readonly instrument: Instrument, public readonly wirings: WireSpec[], 
        private readonly isSystemInstrument) {}

    get physicalName(): string {
        return new Namer(this.section.bigband, this.section).physicalName(this.instrument)
    }

    validate() {
        // Reserve the "bigband" top-level package for system instruments.
        if (!this.isSystemInstrument) {
            const topLevel = this.instrument.topLevelPackageName
            const fqn = this.instrument.fullyQualifiedName()
            if (topLevel.toLowerCase() == 'bigband') {
                throw new Error(`Instrument "${fqn}" has a bad name: the fully qualified name of ` +
                    'an instrument is not allowed to start with "bigband"');
            }    
        }

        const dups = Misc.checkDuplicates(this.wirings.map(w => w.name))
        if (dups.length) {
            throw new Error(`Name collision(s) in wiring of "${this.physicalName}": ${JSON.stringify(dups)}`)
        }
    }
}
