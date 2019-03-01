import { S3Ref } from "./S3Ref";
import { ZipBuilder } from "./ZipBuilder";
import { AwsFactory } from "./AwsFactory";
import { logger } from './logger';
import * as hash from 'hash.js'

type BlobPoolHandle = string;

interface PutResult {
    handle: BlobPoolHandle,
    bytesSent: number
}

function toS3FriendlyName(s: string) {
    // Based on:
    //   https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html
    //   https://en.wikipedia.org/wiki/Base64
    return s.replace(/\//g, '_').replace(/=/g, '.').replace(/\+/g, '-');
}

export class S3BlobPool {
    constructor(public readonly factory: AwsFactory, private readonly s3Bucket: string, private readonly s3Prefix: string) {
        if (s3Prefix.endsWith('/')) {
            throw new Error(`Bad argument: s3Prefix ("${s3Prefix}")`);
        }
    }

    public async put(buf: Buffer): Promise<PutResult> {
        const base64 = Buffer.from(hash.sha384().update(buf).digest()).toString('base64');
        const handle: string = toS3FriendlyName(base64);

        const s3Ref = new S3Ref(this.s3Bucket, `${this.s3Prefix}/${handle}`);
        if (await S3Ref.exists(this.factory, s3Ref)) {
            return {handle, bytesSent: 0};
        }

        logger.silly(`  > uploading (${(buf.byteLength / (1024 * 1024)).toFixed(3)}MB) into ${s3Ref}`);
        await S3Ref.put(this.factory, s3Ref, buf, 'application/octet-stream');
        return {handle, bytesSent: buf.byteLength};
    }

    public async get(handle: BlobPoolHandle): Promise<Buffer> {
        const s3Ref = this.handleToS3Ref(handle);
        logger.silly('  > downloading ' + s3Ref);
        return S3Ref.get(this.factory, s3Ref);
    }

    public handleToS3Ref(handle: BlobPoolHandle): S3Ref {
        return new S3Ref(this.s3Bucket, `${this.s3Prefix}/${handle}`);
    }
}

const CONTENT_TYPE = 'application/zip';

export class Teleporter {

    private numBytes = 0;
    constructor(private readonly blobPool: S3BlobPool) {}


    get bytesSent() {
        return this.numBytes;
    }

    public async uploadFragments(zipBuilder: ZipBuilder): Promise<BlobPoolHandle[]> {
        const promises = zipBuilder.getFragments().map(async curr => {
            const buf = await ZipBuilder.fragmentToBuffer(curr);            
            const ret = this.blobPool.put(buf);
            return ret;
        });

        const results: PutResult[] = await Promise.all(promises);
        results.forEach(curr => this.numBytes += curr.bytesSent);
        return results.map(curr => curr.handle);
    }

    private async mergeFragments(handles: BlobPoolHandle[], s3Ref: S3Ref, instrumentName: string): Promise<number> {
        const buffers: Buffer[] = await Promise.all(handles.map(k => this.blobPool.get(k)));
        const buf: Buffer = await ZipBuilder.merge(buffers);

        await S3Ref.put(this.blobPool.factory, s3Ref, buf, CONTENT_TYPE);
        return buf.byteLength;
    }

    public async nonIncrementalTeleport(zipBuilder: ZipBuilder, destination: S3Ref, instrumentName: string): Promise<number> {
        const delta = await this.uploadFragments(zipBuilder);
        return await this.mergeFragments(delta, destination, instrumentName);    
    }

    public async teleport(zipBuilder: ZipBuilder) {
        const handles = await this.uploadFragments(zipBuilder);
        return handles.map(k => this.blobPool.handleToS3Ref(k));
    }
}
