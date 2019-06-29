import { BigbandModel } from "./models/BigbandModel";
import { SectionModel } from "./models/SectionModel";
import { Instrument } from "bigband-core";

// TODO(imaman): coverage
export class Namer {
    constructor(private readonly bigband: BigbandModel, private readonly section: SectionModel) {}

    physicalName(instrument: Instrument): string{
        return `${this.bigband.bigband.name}-${this.section.section.name}-${instrument.fullyQualifiedName()}`;
    }
}
