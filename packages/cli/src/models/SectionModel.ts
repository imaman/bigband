import { SectionSpec, Instrument, Bigband, CompositeName } from "bigband-core";
import { InstrumentModel } from "./InstrumentModel";
import { NameValidator } from "../NameValidator";
import { NavigationNode } from "../NavigationNode";
import { Role } from "./BigbandModel";
import { NavigationPoint } from "../NavigationPoint";
import { InstrumentListNavigationPoint } from "./InstrumentListNavigationPoint";

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

    getInstrumentModel(instrument: Instrument): InstrumentModel {
        const subPath = instrument.sectionRelativeName
        const ret = this.instruments.find(curr => curr.instrument.sectionRelativeName === subPath)
        if (!ret) {
            throw new Error(`Section ${this.path} does not contain an instrument at sub path ("${subPath}")`)
        }

        return ret
    }

    getNavigationPoint(): NavigationPoint|null {
        class B implements NavigationPoint {
            constructor(private readonly sec: SectionModel) {}
            describe(): string { return "" }
            describeLong(): string[] { return [] }
            act(): string { return "-" }
            downTo(name: CompositeName): NavigationPoint|null {
                if (name.isEmpty) {
                    return this
                }

                const token = name.first("")
                const matching = this.sec.instruments.filter(im => im.instrument.cname.first("") === token)
                if (!matching.length) {
                    return null
                } 

                return new InstrumentListNavigationPoint(matching)
            }
        }

        class A implements NavigationPoint {
            constructor(private readonly sec: SectionModel) {}
            describe(): string { return "" }
            describeLong(): string[] { return [] }
            act(): string { return "-" }
            downTo(name: CompositeName): NavigationPoint|null {
                if (name.isEmpty) {
                    return this
                }

                const token = name.first("")
                if (this.sec.section.name !== token) {
                    return null
                } 

                return new B(this.sec)
            }
        }


        return new A(this)
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
