import * as AWS from 'aws-sdk'
import {AwsFactory} from '../AwsFactory'
import {loadSpec} from '../MixFileRunner';
import { InvocationRequest } from 'aws-sdk/clients/lambda';

async function main(mixFile: string, runtimeDir: string, lambdaName: string, input: string) {
    const spec = loadSpec(mixFile, runtimeDir);

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
        Payload: JSON.stringify(JSON.parse(input))
    };

    console.log('params=', JSON.stringify(params));

    const ret = await lambda.invoke(params).promise();
    return ret;
}

function format(event): any[] {
    const message = event.message;
    let lines: any[] = message.split('\n').map(x => formatTabs(x)).filter(Boolean);
    if (!lines.length) {
        return [];
    }

    const firstLine = lines[0];
    const timeIndication = computeTimeIndication(firstLine);
    if (firstLine.endsWith('_BIGBAND_ERROR_SINK_')) {
        const data = JSON.parse(lines.slice(1).join('\n'));
        lines = [firstLine, data];
    }
    
    if (timeIndication) {
        lines.unshift(`<${timeIndication} ago> `);
    }

    return lines;
}

function computeTimeIndication(s: string): string {
    const tokens = s.split(' ');
    if (tokens.length <= 0) {
        return '';
    }

    const first = tokens[0];
    const d = Date.parse(first);
    const secs = (Date.now() - d) / 1000;
    return secs > 59 ? `${Math.round(secs / 60)} minutes` : `${Math.round(secs)} seconds`;
}

function formatTabs(s: string) {
    return s.replace(/\t/g, ' ');
}

function shouldKeep(message?: string) {
    if (!message) {
        return false;
    }
    if (message.startsWith("START RequestId:")) {
        return false;
    }
    if (message.startsWith("END RequestId:")) {
        return false;
    }
    if (message.startsWith("REPORT RequestId:")) {
        return false;
    }
    return true;
}


export class Invoke {
    static async run(argv) {
        const temp = await main(argv.mixFile, argv.runtimeDir, argv.functionName, argv.input);
        return JSON.stringify(temp, null, 2);
    }
}
