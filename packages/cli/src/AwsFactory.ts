import {Section} from 'bigband-core'
import * as AWS from 'aws-sdk';

export class AwsFactory {
    private readonly options: any;
    constructor(readonly region: string, readonly profileName: string) {
        const credentials = new AWS.SharedIniFileCredentials({profile: profileName});
        this.options = {
            region,
            credentials
        };
    }

    static fromRig(section: Section) {
        return new AwsFactory(section.region, section.isolationScope.profileName);
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
} 

