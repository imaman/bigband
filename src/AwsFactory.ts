import {Rig} from './runtime/Instrument'
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

    static fromRig(r: Rig) {
        return new AwsFactory(r.region, r.isolationScope.profile);
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

    newS3() {
        return new AWS.S3(this.options);
    }
} 

