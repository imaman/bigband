import { SectionModel } from "./models/SectionModel";
import { AwsFactory } from "bigband-core";

export class CloudProvider {
    static get(sectionModel: SectionModel): AwsFactory {
        return new AwsFactory(sectionModel.physicalName, sectionModel.section.region,
            sectionModel.bigband.profileName);
    }
}
