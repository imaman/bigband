import { SectionModel } from "./models/SectionModel";
import { AwsFactory } from "bigband-core";

export class CloudProvider {
    constructor(private readonly sectionModel: SectionModel) {}

    newAwsFactory(): AwsFactory {
        return AwsFactory.create(this.sectionModel.physicalName, this.sectionModel.section.region,
            this.sectionModel.bigband.profileName);
    }
}
