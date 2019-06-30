import * as AWS from 'aws-sdk'
import { AwsFactory } from '../AwsFactory'
import { BigbandFileRunner } from '../BigbandFileRunner';
import { InvocationRequest } from 'aws-sdk/clients/lambda';
import { LookupResult } from '../models/BigbandModel';

async function invokeFunction(bigbandFile: string, lambdaName: string, input: string) {
    const model = await BigbandFileRunner.loadSpec(bigbandFile);

    const lookupResult: LookupResult = model.searchInstrument(lambdaName);

    var lambda: AWS.Lambda = AwsFactory.fromSection(lookupResult.sectionModel).newLambda();
    const params: InvocationRequest = {
        FunctionName: lookupResult.physicalName,
        InvocationType: 'RequestResponse', 
        LogType: 'Tail',
        Payload: JSON.stringify(JSON.parse(input))
    };

    const ret: any = await lambda.invoke(params).promise();
    if (ret.LogResult) {
        ret.LogResult = new Buffer(ret.LogResult, 'base64').toString().split('\n');
    }

    try {
        const parsedPayload = JSON.parse(ret.Payload);
        ret.Payload = parsedPayload;
    } catch (e) {
        // 
    }
    return ret;
}


export class Invoke {
    static async run(argv) {
        const temp = await invokeFunction(argv.bigbandFile, argv.functionName, argv.input);
        return JSON.stringify(temp, null, 2);
    }
}
