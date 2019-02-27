import * as AWS from 'aws-sdk';
import { ZipBuilder } from './ZipBuilder'

const CONTRIVED_FILE_NAME = '_BIGBAND_CONTRIVED_scotty';

export const CONTRIVED_IN_FILE_NAME = `${CONTRIVED_FILE_NAME}`;
export const CONTRIVED_OUT_FILE_NAME = `${CONTRIVED_FILE_NAME}.js`;
export const CONTRIVED_NPM_PACAKGE_NAME = '_BIGBAND_CONTRIVED_';

export async function runLambda(context, event) {
    const { teleportRequest } = event;

    const s3 = new AWS.S3();

    const promises: Promise<AWS.S3.GetObjectOutput>[] = teleportRequest.deployables
        .map(curr => s3.getObject({Bucket: curr.bucket, Key: curr.key}).promise());
    let responses;
    try {
        responses = await Promise.all(promises);
    } catch (e) {
        throw new Error(`Failed while attempting to read fragments: ${e.message}\n${JSON.stringify(teleportRequest.deployables)}`);
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
        throw new Error(`Failed to write to destination (${JSON.stringify({Bucket, Key})}): ${e.message}`);
    }
    return {
        statusCode: 200,
        body: JSON.stringify({writtenTo: teleportRequest.destination, numFragments: responses.length, mergedSize: merged.length})
    };
}


