import { SectionModel } from "./models/SectionModel";
import { AwsFactory } from "bigband-core";

export class CloudProvider {
    static get(sectionModel: SectionModel): AwsFactory {
        const profileName = sectionModel.bigband.profileName
        const ret = new AwsFactory(sectionModel.physicalName, sectionModel.section.region,
            profileName);
        if (!CloudProvider.isUnitTestingProfile(profileName)) {
            ret.validate()
        }
        return ret
    }

    static isUnitTestingProfile(profileName: string) {
        return profileName === CloudProvider.UNIT_TESTING_PROFILE_NAME
    }


    static get UNIT_TESTING_PROFILE_NAME(): string {
        return "___ this is the unit testing profile! ___"
    }
}
