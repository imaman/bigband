import { SectionSpec } from "bigband-core";
import { InstrumentModel } from "./InstrumentModel";

export class SectionSpecModel {
    constructor(private readonly spec: SectionSpec) {}

    get section() {
        return this.spec.section
    }

    get instruments(): InstrumentModel[] {
        return this.spec.instruments.map(i => new InstrumentModel(this.spec.section, i, this.spec.wiring.filter(w => w.consumer === i)))
    }


    validate() {
        // TODO(imaman): check ofr duplicate wiring
    //     if (existingDep) {
    //         throw new Error(`Name conflict. This instrument (${this.fullyQualifiedName()}) already has a dependency named ${name} (on ${existingDep.supplier.fullyQualifiedName()})`);
    //     }

    }
}
