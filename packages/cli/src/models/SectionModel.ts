import { SectionSpec, Instrument, Bigband, Section } from "bigband-core";
import { InstrumentModel } from "./InstrumentModel";
import { NameValidator } from "../NameValidator";
import { NavigationNode } from "../NavigationNode";
import { Role } from "bigband-core";
import { BigbandModel } from "./BigbandModel";

export class SectionModel {
    constructor(readonly bigband: BigbandModel, public readonly section: Section,
            private readonly instruments_: InstrumentModel[] = []) {}

    get path(): string {
        return this.section.path
    }

    get instruments(): InstrumentModel[] {
        return [...this.instruments_]
    }

    get physicalName(): string {
        return `${this.bigband.bigband.name}-${this.section.name}`;
    }

    getInstrumentModel(instrument: Instrument): InstrumentModel {
        const subPath = instrument.sectionRelativeName
        const ret = this.instruments.find(curr => curr.instrument.sectionRelativeName === subPath)
        if (!ret) {
            throw new Error(`Section ${this.path} does not contain an instrument at sub path ("${subPath}")`)
        }

        return ret
    }

    validate() {
        const name = this.section.name
        if(!NameValidator.isOk(name)) {
            throw new Error(`Bad section name: "${name}"`)
        }
        this.instruments.forEach(curr => curr.validate())
    }

    generateNavigationNodes(root: NavigationNode) {
        const regNode = root.addChild(this.section.region, {
            path: this.section.region,
            role: Role.REGION,
        })
        return regNode.addChild(this.section.name, {
            path: this.path,
            role: Role.SECTION,
        })
    }
}
