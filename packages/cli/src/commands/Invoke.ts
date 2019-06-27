import * as AWS from 'aws-sdk'
import { AwsFactory } from '../AwsFactory'
import { loadSpec } from '../BigbandFileRunner';
import { InvocationRequest } from 'aws-sdk/clients/lambda';
import { BigbandModel } from '../BigbandModel';

export function lookupFunction(instrumentName: string, model: BigbandModel) {
    return model.searchInstrument(instrumentName)
}
async function invokeFunction(bigbandFile: string, lambdaName: string, input: string) {
    const spec = await loadSpec(bigbandFile);

    const data = lookupFunction(lambdaName, spec);

    var lambda: AWS.Lambda = new AwsFactory(data.section.region, data.section.bigband.profileName).newLambda();
    const params: InvocationRequest = {
        FunctionName: data.instrument.physicalName(data.section),
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
