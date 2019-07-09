import {DeployableAtom, DeployableFragment} from './DeployableFragment';
import { Section } from './Section'
import { Definition } from './Definition'
import { Instrument } from './Instrument'
import { NavigationItem, Role } from './NavigationItem';
import { stringify } from 'querystring';
import { CompositeName } from './CompositeName';
import { AwsFactory } from './AwsFactory';
import { DescribeLogStreamsResponse, GetLogEventsRequest, GetLogEventsResponse, DescribeLogStreamsRequest } from 'aws-sdk/clients/cloudwatchlogs';

export class LambdaInstrument extends Instrument {
    private static readonly BASE_DEF = {
        Type: "AWS::Serverless::Function",
        Properties: {
            Runtime: "nodejs8.10",
            Policies: [],
            Events: {}
        }
    }

    private npmPackageName: string = '';

    // TODO(imaman): replace :any with something more precise
    constructor(packageName: string|string[], name: string, private readonly controllerPath: string, cloudFormationProperties: any = {}) {
        super(packageName, name);

        this.definition.overwrite(LambdaInstrument.BASE_DEF);
        this.definition.mutate(o => o.Properties.Handler = `${this.getHandlerFile()}.handle`);
        this.definition.mutate(o => Object.assign(o.Properties, cloudFormationProperties));
    }

    fromNpmPackage(npmPackageName: string) {
        this.npmPackageName = npmPackageName;
        return this;
    }

    getNpmPackage() {
        return this.npmPackageName;
    }

    
    invokeEveryMinutes(durationInMinutes: number) {
        if (!Number.isInteger(durationInMinutes)) {
            throw new Error('durationInMinutes must be an integer');
        }

        if (durationInMinutes < 0 || durationInMinutes > 59) {
            throw new Error(`durationInMinutes must be >= 0 and <= 59`);
        }
        const obj = {
            Timer: {
                Type: "Schedule",
                Properties: {
                    Schedule: `cron(0/${durationInMinutes} * * * ? *)`
                }    
            }
        };

        // Resulting event object passed to the lambda function:
        // { 
        //   version: '0',
        //   id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        //   'detail-type': 'Scheduled Event',
        //   source: 'aws.events',
        //   account: '222266664444',
        //   time: '2018-03-20T05:06:00Z',
        //   region: 'eu-west-2',
        //   resources: [ 
        //     'arn:aws:events:eu-west-2:222266664444:rule/my-function-name' 
        //   ],
        //   detail: {} 
        // }
      

        this.definition.mutate(o => Object.assign(o.Properties.Events, obj));
        return this;
    }
    
    arnService(): string {
        return 'lambda'
    }

    arnType(): string {
        return 'function:';
    }

    nameProperty(): string {
        return 'FunctionName';
    }

    getEntryPointFile(): string {
        return this.controllerPath;
    }

    private getHandlerFile() {
        return this.fullyQualifiedName() + '_Handler';
    }

    createFragment(pathPrefix: string) {
        const fragment = new DeployableFragment();
        let requireExpression = `./${pathPrefix}/${this.getEntryPointFile()}`;
        if (this.npmPackageName) {
            requireExpression = `${this.npmPackageName}/${this.getEntryPointFile()}`;
        }
        if (requireExpression.includes('"') || requireExpression.includes("'") || requireExpression.includes('\\')) {
            throw new Error(`Illegal characters in a require expression ("${requireExpression}")`);
        }


        const content = `
            const {runLambda} = require('${requireExpression}');
            const mapping = require('./bigband/deps.js');
            const fp = require('./bigband/build_manifest.js');

            function handle(event, context, callback) {
                try {
                    Promise.resolve()
                    .then(() => runLambda(context, event, mapping, fp))
                    .then(response => callback(null, response))
                    .catch(e => {
                        console.error('Exception caught from promise flow (event=\\n:' + JSON.stringify(event).substring(0, 1000) + ")\\n\\n", e);
                        callback(e);
                    });
                } catch (e) {
                    console.error('Exception caught:', e);
                    callback(e);
                }
            }

            module.exports = {handle};
        `;

        fragment.add(new DeployableAtom(this.getHandlerFile() + '.js', content));
        return fragment;
    }

    contributeToConsumerDefinition(section: Section, consumerDef: Definition, myArn: string) {
        consumerDef.mutate(o => o.Properties.Policies.push({
            Version: '2012-10-17',
            Statement: [{ 
                Effect: "Allow",
                Action: [
                  'lambda:InvokeFunction'
                ],
                Resource: myArn
            }]
        }));
    }

    getNavigationItems(path: CompositeName, arn: string, physicalName: string, awsFactory: AwsFactory): Map<string, NavigationItem> {
        const info = (s: string) => this.getDefinition().get()
        const desc = (s: string) => awsFactory.newLambda().getFunction({FunctionName: arn}).promise()
        const logs = (s: string) => getLogs(awsFactory, physicalName, 50)

        const ret = new Map<string, NavigationItem>()
        ret.set('def', {role: Role.LOCAL_COMMAND, path: path.append('def').toString(), action: info})
        ret.set('desc', {role: Role.COMMAND, path: path.append('desc').toString(), action: desc})
        ret.set('exec', {role: Role.COMMAND, path: path.append('exec').toString()})
        ret.set('logs', {role: Role.COMMAND, path: path.append('logs').toString(), action: logs})
        return ret
    }
}



async function getLogs(awsFactory: AwsFactory, physicalName: string, limit: number) {
    const cloudWatchLogs = awsFactory.newCloudWatchLogs();
    const logGroupName = `/aws/lambda/${physicalName}`

    const describeLogStreamsReq: DescribeLogStreamsRequest = {
        logGroupName,
        orderBy: 'LastEventTime',
        descending: true,
        limit: 1
    }

    let describeLogStreamsResp: DescribeLogStreamsResponse
    try {
        describeLogStreamsResp = await cloudWatchLogs.describeLogStreams(describeLogStreamsReq).promise();
    } catch (e) {
        throw new Error(`Failed to find log streams (logGroupName = ${logGroupName}):\n${e.message}`);
    }

    if (!describeLogStreamsResp.logStreams || describeLogStreamsResp.logStreams.length < 1) {
        console.log('No log stream was found');
        return;
    }

    const stream = describeLogStreamsResp.logStreams[0];
    const logStreamName = stream.logStreamName;
    if (!logStreamName) {
        throw new Error('log stream is empty');
    }

    const getLogEventsReq: GetLogEventsRequest = {
        logGroupName,
        logStreamName,
        limit,
        startFromHead: false
    }
    const getLogEventsResp: GetLogEventsResponse = await cloudWatchLogs.getLogEvents(getLogEventsReq).promise();

    if (!getLogEventsResp.events) {
        return [];
    }
    return getLogEventsResp.events.filter(event => shouldKeep(event.message)).map(format);
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

