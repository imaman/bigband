import { Instrument, Section, Bigband, CompositeName } from "bigband-core";
import { Misc } from "../Misc";
import { Namer } from "../Namer";
import { NameValidator } from "../NameValidator";
import { WireModel } from "./WireModel";
import { NavigationNode, NavigationItem } from "../NavigationNode";
import { Role } from "./BigbandModel";
import { NavigationPoint } from "../NavigationPoint";

export class InstrumentModel {
    constructor(private readonly bigband: Bigband, public readonly section: Section, public readonly instrument: Instrument,
        // TODO(imaman): make wirings private
        // TODO(imaman): rename to wires
        public readonly wirings: WireModel[], private readonly isSystemInstrument) {}

    get physicalName(): string {
        return new Namer(this.bigband, this.section).physicalName(this.instrument)
    }

    get path(): string {
        return new Namer(this.bigband, this.section).path(this.instrument)
    }

    get arn(): string {
        const namer = new Namer(this.bigband, this.section)
        return namer.resolve(this.instrument).arn
    }

    validate() {
        if (!NameValidator.isCompositeNameOk(this.instrument.cname)) {
            throw new Error(`Bad instrument name: "${this.instrument.fullyQualifiedName()}"`)
        }
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

    generateNavigationNodes(root: NavigationNode) {
        let node = root.navigate(this.section.path)
        if (!node) {
            throw new Error(`Path ${this.section.path} leads to nowhere`)
        }

        let path = CompositeName.fromString(this.section.path)

        for (const curr of this.instrument.cname.butLast().all) {
            path = path.append(curr)
            let item: NavigationItem  = {
                path: path.toString(),
                role: Role.PATH,
            }
            node = node.addChild(curr, item)
        }

        const last = this.instrument.cname.last("")
        path = path.append(last)
        const item = {
            path: path.toString(),
            role: Role.INSTRUMENT,
            type: this.instrument.arnService()
        }

        node = node.addChild(last, item)        
    }

    getNavigationPoint(): NavigationPoint|null {
        class B implements NavigationPoint {
            constructor(private readonly model: InstrumentModel) {}
            describe(): string { return "" }
            describeLong(): string[] { return [] }
            act(): string { return "-" }
            downTo(name: CompositeName): NavigationPoint|null {
                if (name.isEmpty) {
                    return this
                }

                const token = name.first("")
                const im = this.sec.instruments.find(im => im.instrument.cname.first("") === token)
                if (!im) {
                    return null
                } 

                return im.getNavigationPoint()
            }
        }

        class A implements NavigationPoint {
            constructor(private readonly model: InstrumentModel, suffix: CompositeName) {}
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


        return new A(this, this.instrument.cname)
    }
}
