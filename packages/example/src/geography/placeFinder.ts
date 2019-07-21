import {lookup} from './model';
import AWS = require('aws-sdk');
import * as byline from 'byline';


export async function runLambda(context, event, mapping, fp) {
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

    const timePassed = 'N/A'; //moment(`2015-09-21`).fromNow();

    if (answers.length) {
        console.log(`top answer for "${q}" is "${answers[0].answer}"`)
    } else {
        console.log(`No answer for "${q}"`)
    }
    return {
        statusCode: 200,
        headers: { 
          "content-type": 'application/json', 
        },
        body: {query: q, timePassed, bylineKeys: Object.keys(byline), inputLength: "__3_" + q.length, answers: answers.map(curr => curr.answer)}
    };
}

// Run command (from the bigband directory):
// bigband-example.sh invoke --function-name placeFinder --input '{"query": "United Kingdom"}'

