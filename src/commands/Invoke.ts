import * as AWS from 'aws-sdk'
import {AwsFactory} from '../AwsFactory'
import {loadSpec} from '../MixFileRunner';
import { InvocationRequest } from 'aws-sdk/clients/lambda';

async function invokeFunction(mixFile: string, runtimeDir: string, lambdaName: string, input: string) {
    const spec = await loadSpec(mixFile, runtimeDir);

    let data;
    spec.rigs.forEach(r => {
        spec.instruments.forEach(curr => {
            if (curr.physicalName(r) === lambdaName) {
                data = {rig: r, instrument: curr}
            }
        });
    });

    if (!data) {
        throw new Error(`Function ${lambdaName} not found in ${JSON.stringify(spec.instruments.map(i => i.name()))}`);
    }

    var lambda: AWS.Lambda = new AwsFactory(data.rig.region, data.rig.isolationScope.profile).newLambda();
    const params: InvocationRequest = {
        FunctionName: data.instrument.physicalName(data.rig),
        InvocationType: 'RequestResponse', 
        LogType: 'Tail',
        Payload: JSON.stringify(JSON.parse(input))
    };

    const ret: any = await lambda.invoke(params).promise();
    if (ret.LogResult) {
        ret.LogResult = new Buffer(ret.LogResult, 'base64').toString().split('\n');
    }

    const parsedPayload = JSON.parse(ret.Payload);
    if ((parsedPayload.headers || {})["content-type"] === 'application/json') {
        ret.Payload = parsedPayload;
    }
    return ret;
}


export class Invoke {
    static async run(argv) {
        const temp = await invokeFunction(argv.mixFile, argv.runtimeDir, argv.functionName, argv.input);
        return JSON.stringify(temp, null, 2);
    }
}
