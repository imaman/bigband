// This is just an atriticial dependency for testing purposes.
import * as byline from 'byline';

export async function runLambda(context, event, mapping) {
    const records = event.Records.map(r => JSON.parse(new Buffer(r.kinesis.data, 'base64').toString()))
    console.log(`Got ${records.length} records: ` + JSON.stringify(records));
    console.log('byline=' + byline.name);
    return {
        statusCode: 200,
        headers: { 
          "content-type": 'application/json', 
        },
        body: JSON.stringify({numRecords: records.length})
    }
}

// {
//     "analyzerInput": {
//         "Records": [
//             {
//                 "kinesis": {
//                     "kinesisSchemaVersion": "1.0",
//                     "partitionKey": "q1",
//                     "sequenceNumber": "49590105952562820362651263037644176500195957194455253010",
//                     "data": "eyJzdHJlYW1lZFF1ZXJ5IjoiSXRhbCIsInRpbWVzdGFtcCI6MTU0MjEyNzYyMDgxNH0=",
//                     "approximateArrivalTimestamp": 1542127620.893
//                 },
//                 "eventSource": "aws:kinesis",
//                 "eventVersion": "1.0",
//                 "eventID": "shardId-000000000001:49590105952562820362651263037644176500195957194455253010",
//                 "eventName": "aws:kinesis:record",
//                 "invokeIdentityArn": "arn:aws:iam::274788167589:role/bb-example-prod-major-geographyAnalyzerRole-1IJ0TR07UC7ZF",
//                 "awsRegion": "eu-west-2",
//                 "eventSourceARN": "arn:aws:kinesis:eu-west-2:274788167589:stream/bb-example-prod-major-geography-QueryStream"
//             }
//         ]
//     }
// }
