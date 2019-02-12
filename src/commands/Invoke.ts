import * as AWS from 'aws-sdk'
import {AwsFactory} from '../AwsFactory'
import {loadSpec, MixSpec} from '../MixFileRunner';
import { InvocationRequest } from 'aws-sdk/clients/lambda';


export function lookupFunction(lambdaName: string, spec: MixSpec) {
    let matches: any[] = [];
    const names: string[] = [];
    spec.rigs.forEach(r => {
        spec.instruments.forEach(curr => {
            const name = curr.physicalName(r);
            names.push(name);
            if (name.indexOf(lambdaName) >= 0) {
                matches.push({rig: r, instrument: curr, name});
            }
        });
    });

    if (!matches.length) {
        throw new Error(`Function ${lambdaName} not found in ${JSON.stringify(names)}`);
    }

    if (matches.length > 1) {
        throw new Error(`Multiple matches on ${lambdaName}: ${JSON.stringify(matches.map(x => x.name))}`);
    }

    return matches[0];
}
async function invokeFunction(mixFile: string, runtimeDir: string, lambdaName: string, input: string) {
    const spec = await loadSpec(mixFile, runtimeDir);

    const data = lookupFunction(lambdaName, spec);

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
        const temp = await invokeFunction(argv.bigbandFile, argv.runtimeDir, argv.functionName, argv.input);
        return JSON.stringify(temp, null, 2);
    }
}
