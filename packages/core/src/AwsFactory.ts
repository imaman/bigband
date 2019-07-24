import * as AWS from 'aws-sdk';

export class AwsFactory {
    private readonly options: any;

    constructor(readonly stackName: string, readonly region: string, readonly profileName: string) {
        const credentials = new AWS.SharedIniFileCredentials({profile: this.profileName});
        this.options = {
            region,
            credentials
        };
    }

    validate() {
        if (!this.options.credentials.accessKeyId) {
            // TODO(imaman): introduce the notion of 'user-friendly' exceptions which are dumped 
            // to the terminal w/o the stacktrace.
            throw new Error(`No credentials found for profile name "${this.profileName}"\n` + 
                'You should check the AWS profiles (AKA: "named profiles") defined on your machine')
        }
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
} 

