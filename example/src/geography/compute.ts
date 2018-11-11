import {lookup,Answer} from './model';
import AWS = require('aws-sdk');


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

    return {
        statusCode: 200,
        headers: { 
          "content-type": 'application/json', 
        },
        body: JSON.stringify({query: q, answers: answers.map(curr => curr.answer)})
    };
}

