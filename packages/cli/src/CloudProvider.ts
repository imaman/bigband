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

    static async getAccountId(profileName: string): Promise<string> {
        const f = new AwsFactory("", "", profileName)
        f.validate()
        const sts = f.newSts()
        try {
            const resp = await sts.getCallerIdentity().promise()
            const ret = resp.Account
            if (!ret) {
                throw new Error(`No account ID found for proile "${profileName}"`)
            }
            return ret
        } catch (e) {
            throw new Error(`Failed to get the account ID for profile "${profileName}"`)
        }
    }

    static isUnitTestingProfile(profileName: string) {
        return profileName === CloudProvider.UNIT_TESTING_PROFILE_NAME
    }


    static get UNIT_TESTING_PROFILE_NAME(): string {
        return "___ this is the unit testing profile! ___"
    }    
}
