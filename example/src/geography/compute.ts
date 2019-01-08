import {lookup} from './model';
import AWS = require('aws-sdk');
import { PutRecordInput } from 'aws-sdk/clients/kinesis';


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
    console.log('putResp=' + JSON.stringify(putResp));

    return {
        statusCode: 200,
        headers: { 
          "content-type": 'application/json', 
        },
        body: {query: q, answers: answers.map(curr => curr.answer)}
    };
}

