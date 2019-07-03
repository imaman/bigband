import { SectionSpec, Instrument, Bigband, WireSpec } from "bigband-core";
import { InstrumentModel } from "./InstrumentModel";
import { NameValidator } from "../NameValidator";

export class SectionModel {
    constructor(readonly bigband: Bigband, private readonly spec: SectionSpec,
            private readonly instruments_: InstrumentModel[] = []) {}

    get section() {
        return this.spec.section
    }

    get path(): string {
        return this.section.path
    }

    get instruments(): InstrumentModel[] {
        return [...this.instruments_]
    }

    get physicalName(): string {
        return `${this.bigband.name}-${this.section.name}`;
    }

    get wires(): WireSpec[] {
        return this.spec.wiring
    }

    validate() {
        const name = this.section.name

        if(!NameValidator.isOk(name)) {
            throw new Error(`Bad section name: "${name}"`)
        }
        this.instruments.forEach(curr => curr.validate())

        // TODO(imaman): move it elsewhere
        const set = new Set<Instrument>(this.spec.instruments)
        const wiringsWithbadConsumer = this.spec.wiring.filter(w => !set.has(w.consumer))
        if (wiringsWithbadConsumer.length) {
            const w = wiringsWithbadConsumer[0]
            throw new Error(`Instrument "${w.consumer.fullyQualifiedName()}" cannot be used as a consumer because ` + 
                `it is not a member of the "${this.section.name}" section`)
        }
    }
}
