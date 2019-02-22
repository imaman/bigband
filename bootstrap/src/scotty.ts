import * as AWS from 'aws-sdk';
import { ZipBuilder } from './ZipBuilder'


export async function runLambda(context, event) {
    const { teleportRequest } = event;

    const s3 = new AWS.S3();

    const promises: Promise<AWS.S3.GetObjectOutput>[] = teleportRequest.deployables
        .map(curr => s3.getObject({Bucket: curr.bucket, Key: curr.key}).promise());
    let responses;
    try {
        responses = await Promise.all(promises);
    } catch (e) {
        throw new Error('Failed to read deployables: ' + e.message + '\n' + JSON.stringify(teleportRequest.deployables));
    }
    const buffers = responses.map(r => r.Body as Buffer);
    const merged = await ZipBuilder.merge(buffers);
    const putObjectRequest: AWS.S3.PutObjectRequest = {
        Bucket: teleportRequest.destination.bucket, 
        Key: teleportRequest.destination.key,
        Body: merged
    };

    try {
        await s3.putObject(putObjectRequest).promise();
    } catch (e) {
        const {Bucket, Key} = putObjectRequest;
        throw new Error(`failed to write to destination (${JSON.stringify({Bucket, Key})}): ${e.message}`);
    }
    return {
        statusCode: 200,
        body: JSON.stringify({writtenTo: teleportRequest.destination, numFragments: responses.length, mergedSize: merged.length})
    };

    // responses.
    // deployables: handlePojos,
    // destination: ret.toPojo()


    // const t = eventByYear[event.year || 'NONE'] || 'NOTHING';
    // const timePassed = event.year ? moment(`${event.year}-01-01`).fromNow(): undefined;
    // console.log(`Time since ${event.year}: ${timePassed}`);
    // return {
    //     statusCode: 200,
    //     headers: { 
    //       "content-type": 'application/json', 
    //     },
    //     body: JSON.stringify({year: event.year, description: t, howLongAgo: timePassed})
    // };
}


