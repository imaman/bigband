import { S3Ref } from "./S3Ref";
import { ZipBuilder } from "./ZipBuilder";
import { AwsFactory } from "./AwsFactory";
import { logger } from './logger';
import * as hash from 'hash.js'

type BlobPoolHandle = string;

export class S3BlobPool {
    constructor(public readonly factory: AwsFactory, private readonly s3Bucket: string, private readonly s3Prefix: string) {
        if (s3Prefix.endsWith('/')) {
            throw new Error(`Bad argument: s3Prefix ("${s3Prefix}")`);
        }
    }

    public async put(buf: Buffer): Promise<BlobPoolHandle> {
        const base64 = Buffer.from(hash.sha384().update(buf).digest()).toString('base64');
        const ret: string = base64.replace(/\//g, '_').replace(/=/g, '.');
        const s3Ref = new S3Ref(this.s3Bucket, `${this.s3Prefix}/${ret}`);
        if (await S3Ref.exists(this.factory, s3Ref)) {
            return ret;
        }

        logger.silly('  > uploading ' + s3Ref);
        await S3Ref.put(this.factory, s3Ref, buf, 'application/octet-stream');
        return ret;
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
            this.numBytes += buf.byteLength;
            return ret;
        });
        const handles: BlobPoolHandle[] = await Promise.all(promises);
        return handles;
    }

    private async mergeFragments(handles: BlobPoolHandle[], s3Ref: S3Ref, instrumentName: string) {
        const buffers: Buffer[] = await Promise.all(handles.map(k => this.blobPool.get(k)));
        const buf: Buffer = await ZipBuilder.merge(buffers);

        return S3Ref.put(this.blobPool.factory, s3Ref, buf, CONTENT_TYPE);
    }

    public async fakeTeleport(zipBuilder: ZipBuilder, destination: S3Ref, instrumentName: string) {
        const delta = await this.uploadFragments(zipBuilder);
        await this.mergeFragments(delta, destination, instrumentName);    
    }

    public async teleport(zipBuilder: ZipBuilder) {
        const handles = await this.uploadFragments(zipBuilder);
        return handles.map(k => this.blobPool.handleToS3Ref(k));
    }
}
