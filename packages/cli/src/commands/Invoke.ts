import * as AWS from 'aws-sdk'
import {AwsFactory} from '../AwsFactory'
import {loadSpec, BigbandSpec} from '../BigbandFileRunner';
import { InvocationRequest } from 'aws-sdk/clients/lambda';
import { Section, Instrument } from 'bigband-core';


interface LookupResult {
    rig: Section
    instrument: Instrument
    name: string
}

export function lookupFunction(lambdaName: string, spec: BigbandSpec): LookupResult {
    let matches: any[] = [];
    const names: string[] = [];
    spec.sections.forEach(r => {
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
async function invokeFunction(bigbandFile: string, lambdaName: string, input: string) {
    const spec = await loadSpec(bigbandFile);

    const data = lookupFunction(lambdaName, spec);

    var lambda: AWS.Lambda = new AwsFactory(data.rig.region, data.rig.isolationScope.profileName).newLambda();
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
