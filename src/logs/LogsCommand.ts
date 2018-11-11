import * as AWS from 'aws-sdk'
import { DescribeLogStreamsRequest, GetLogEventsRequest, GetLogEventsResponse } from 'aws-sdk/clients/cloudwatchlogs';



async function main(lambdaName: string, region: string) {
    var cloudWatchLogs = new AWS.CloudWatchLogs({region});
    const logGroupName = `/aws/lambda/${lambdaName}`;

    const describeLogStreamsReq: DescribeLogStreamsRequest = {
        logGroupName,
        orderBy: 'LastEventTime',
        descending: true,
        limit: 1
    }

    console.log('describeLogStreamsReq=\n' + JSON.stringify(describeLogStreamsReq, null, 2));
    let describeLogStreamsResp;
    try {
        describeLogStreamsResp = await cloudWatchLogs.describeLogStreams(describeLogStreamsReq).promise();
    } catch (e) {
        throw new Error(`Failed to find log streams (logGroupName = ${logGroupName}):\n${e.message}`);
    }

    if (!describeLogStreamsResp.logStreams || describeLogStreamsResp.logStreams.length < 1) {
        console.log('No log stream was found');
        return;
    }

    const logStreamName = describeLogStreamsResp.logStreams[0].logStreamName;
    if (!logStreamName) {
        throw new Error('log stream is empty');
    }

    const getLogEventsReq: GetLogEventsRequest = {
        logGroupName,
        logStreamName,
        limit: 1000,
        startFromHead: false
    }

    console.log('getLogEventsReq=\n' + JSON.stringify(getLogEventsReq, null, 2));
    const getLogEventsResp: GetLogEventsResponse = await cloudWatchLogs.getLogEvents(getLogEventsReq).promise();

    if (!getLogEventsResp.events) {
        return [];
    }
    return getLogEventsResp.events.filter(event => shouldKeep(event.message)).map(format);
}

function format(event) {
    const message = event.message;
    const formattedMessage = message.split('\n').map(x => formatTabs(x)).filter(Boolean);
    return formattedMessage;
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


export class LogsCommand {
    static async run(argv) {
        const temp = await main(argv.functionName, argv.region);
        return JSON.stringify(temp, null, 2);
    }
}
