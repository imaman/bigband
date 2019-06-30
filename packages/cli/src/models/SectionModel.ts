import { SectionSpec, Instrument, Bigband } from "bigband-core";
import { InstrumentModel } from "./InstrumentModel";

export class SectionModel {
    constructor(readonly bigband: Bigband, private readonly spec: SectionSpec) {}

    get section() {
        return this.spec.section
    }

    get instruments(): InstrumentModel[] {
        return this.spec.instruments.map(i => new InstrumentModel(this.bigband, this.spec.section, i, 
            this.spec.wiring.filter(w => w.consumer === i), false))
    }

    get physicalName(): string {
        return `${this.bigband.name}-${this.section.name}`;
    }

    validate() {
        const name = this.section.name

        if(!name.match(/^([a-z][a-z0-9]*)(-[a-z][a-z0-9]*)*$/)) {
            throw new Error(`Bad section name: "${name}"`)
        }
        this.instruments.forEach(curr => curr.validate())

        const set = new Set<Instrument>(this.spec.instruments)
        const wiringsWithbadSuppliers = this.spec.wiring.filter(w => !set.has(w.supplier))
        if (wiringsWithbadSuppliers.length) {
            const w = wiringsWithbadSuppliers[0]
            throw new Error(`Instrument "${w.supplier.fullyQualifiedName()}" cannot be used as a supplier because ` + 
                `it is not a member of the "${this.section.name}" section`)
        }

        const wiringsWithbadConsumer = this.spec.wiring.filter(w => !set.has(w.consumer))
        if (wiringsWithbadConsumer.length) {
            const w = wiringsWithbadConsumer[0]
            throw new Error(`Instrument "${w.supplier.fullyQualifiedName()}" cannot be used as a consumer because ` + 
                `it is not a member of the "${this.section.name}" section`)
        }
    }
}
