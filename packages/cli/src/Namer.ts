import { BigbandModel } from "./models/BigbandModel";
import { SectionModel } from "./models/SectionModel";
import { Instrument } from "bigband-core";
import { ResolvedName } from "./ResolvedName";

export class Namer {
    constructor(private readonly bigband: BigbandModel, private readonly section: SectionModel) {}

    physicalName(instrument: Instrument): string {
        return `${this.bigband.bigband.name}-${this.section.section.name}-${instrument.fullyQualifiedName()}`;
    }

    resolve(instrument: Instrument) {
        const physicalName = this.physicalName(instrument)
        const arn = `arn:aws:${instrument.arnService()}:${this.section.section.region}:` + 
                `${this.bigband.bigband.awsAccount}:${instrument.arnType()}${physicalName}`;

        return new ResolvedName(instrument.fullyQualifiedName(), physicalName, arn)
    }
}
