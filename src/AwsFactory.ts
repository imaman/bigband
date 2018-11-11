import {Rig} from './runtime/Instrument'
import * as AWS from 'aws-sdk';

export class AwsFactory {
    private readonly options: any;
    private constructor(private readonly region: string) {
        this.options = {region};
    }

    static fromRegion(r: string) {
        return new AwsFactory(r);
    }

    newCloudFormation() {
        return new AWS.CloudFormation(this.options);
    }

    newCloudWatchLogs() {
        return new AWS.CloudWatchLogs(this.options);
    }

    newLambda() {
        return new AWS.Lambda(this.options);
    }

    newS3() {
        return new AWS.S3(this.options);
    }
} 

