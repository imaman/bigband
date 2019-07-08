import * as AWS from 'aws-sdk'
import { BigbandFileRunner } from '../BigbandFileRunner';
import { InvocationRequest } from 'aws-sdk/clients/lambda';
import { LookupResult } from '../models/BigbandModel';
import { CloudProvider } from '../CloudProvider';

async function invokeFunction(bigbandFile: string, path: string, input: string) {
    const model = await BigbandFileRunner.loadModel(bigbandFile);

    const lookupResult: LookupResult = model.searchInspect(path)
    
    var lambda: AWS.Lambda = CloudProvider.newAwsFactory(lookupResult.sectionModel).newLambda();
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


export class Exec {
    static async run(argv) {
        const temp = await invokeFunction(argv.bigbandFile, argv.path, argv.input);
        return JSON.stringify(temp, null, 2);
    }
}
