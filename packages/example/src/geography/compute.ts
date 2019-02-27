import {lookup} from './model';
import AWS = require('aws-sdk');
import { PutRecordInput } from 'aws-sdk/clients/kinesis';
import * as byline from 'byline';


export async function runLambda(context, event, mapping) {
    const client = new AWS.DynamoDB.DocumentClient({region: mapping.distanceTable.region});
    const q = event.query;
    const answers = lookup(q);

    const req = {
        TableName: mapping.distanceTable.name,
        Item: {
            dist: answers[0].score,
            query: q,
            answers: answers,
            numAnswers: answers.length
        }
    };
    await client.put(req).promise();

    const kinesis = new AWS.Kinesis({region: mapping.queryStream.region})
    const putReq: PutRecordInput = {
        StreamName: mapping.queryStream.name,
        Data: JSON.stringify({streamedQuery: q, timestamp: Date.now()}),
        PartitionKey: 'q1'
    };
    const putResp = kinesis.putRecord(putReq).promise();
    // console.log('putResp=' + JSON.stringify(putResp));

    const timePassed = 'N/A'; //moment(`2015-09-21`).fromNow();

    return {
        statusCode: 200,
        headers: { 
          "content-type": 'application/json', 
        },
        body: {query: q, timePassed, bylineKeys: Object.keys(byline), inputLength: 'B1:'+q.length, answers: answers.map(curr => curr.answer)}
    };
}

// Run command (from the bigband directory):
// bigband-example.sh invoke --function-name placeFinder --input '{"query": "United Kingdom"}'

