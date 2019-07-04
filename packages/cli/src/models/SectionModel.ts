import { SectionSpec, Instrument, Bigband } from "bigband-core";
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

    findInstrument(path: string): InstrumentModel|null {
        return this.instruments.find(im => im.instrument.path === path) || null
    }

    validate() {
        const name = this.section.name
        if(!NameValidator.isOk(name)) {
            throw new Error(`Bad section name: "${name}"`)
        }
        this.instruments.forEach(curr => curr.validate())
    }
}
