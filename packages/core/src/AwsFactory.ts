import * as AWS from 'aws-sdk';
import { Credentials } from 'aws-sdk';

export class AwsFactory {
    private readonly options: any;

    constructor(readonly stackName: string, readonly region: string, readonly profileName: string, 
            credentials: Credentials) {
        this.options = {
            region,
            credentials
        };
    }

    static create(stackName: string, region: string, profileName: string): AwsFactory {
        const credentials = new AWS.SharedIniFileCredentials({profile: profileName});
        if (!credentials.accessKeyId) {
            // TODO(imaman): introduce the notion of 'user-friendly' exceptions which are dumped 
            // to the terminal w/o the stacktrace.
            throw new Error(`No credentials found for profile name "${profileName}"`)
        }

        return new AwsFactory(stackName, region, profileName, credentials)
    }

    newCloudFormation() {
        return new AWS.CloudFormation(this.options);
    }

    newCloudWatchLogs() {
        return new AWS.CloudWatchLogs(this.options);
    }

    newLambda(): AWS.Lambda {
        return new AWS.Lambda(this.options);
    }

    newS3(): AWS.S3 {
        return new AWS.S3(this.options);
    }

    newSts(): AWS.STS {
        return new AWS.STS(this.options)
    }

    static async getAccountId(profileName: string): Promise<string> {
        const sts = AwsFactory.create("", "", profileName).newSts()
        const resp = await sts.getCallerIdentity().promise()
        const ret = resp.Account
        if (!ret) {
            throw new Error(`No account ID found for proile "${profileName}"`)
        }
        return ret
    }
} 

