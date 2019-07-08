import * as AWS from 'aws-sdk';
import { SectionModel } from './models/SectionModel';

export class AwsFactory {
    private readonly options: any;

    constructor(readonly stackName: string, readonly region: string, readonly profileName: string) {
        const credentials = new AWS.SharedIniFileCredentials({profile: this.profileName});
        this.options = {
            region,
            credentials
        };
    }

    static fromSection(sectionModel: SectionModel) {
        return new AwsFactory(sectionModel.physicalName, sectionModel.section.region,
            sectionModel.bigband.profileName);
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

