import { S3Ref } from "./S3Ref";
import { ZipBuilder } from "./ZipBuilder";
import { AwsFactory } from "./AwsFactory";
import { logger } from './logger';
import * as hash from 'hash.js'

type BlobPoolKey = string;

export class S3BlobPool {
    constructor(public readonly factory: AwsFactory, private readonly s3Bucket: string, private readonly s3Prefix: string) {
        if (s3Prefix.endsWith('/')) {
            throw new Error(`Bad argument: s3Prefix ("${s3Prefix}")`);
        }
    }

    async put(buf: Buffer): Promise<BlobPoolKey> {
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

    async get(key: BlobPoolKey): Promise<Buffer> {
        const s3Ref = new S3Ref(this.s3Bucket, `${this.s3Prefix}/${key}`);
        logger.silly('  > downloading ' + s3Ref);
        return S3Ref.get(this.factory, s3Ref);
    }
}

const CONTENT_TYPE = 'application/zip';

export class Teleporter {

    constructor(private readonly blobPool: S3BlobPool) {}

    private async uploadFragments(zipBuilder: ZipBuilder): Promise<BlobPoolKey[]> {
        const promises = zipBuilder.getFragments().map(async curr => this.blobPool.put(await ZipBuilder.fragmentToBuffer(curr)));
        const keys: BlobPoolKey[] = await Promise.all(promises);
        return keys;
    }

    private async mergeFragments(keys: BlobPoolKey[], s3Ref: S3Ref, instrumentName: string) {
        const buffers: Buffer[] = await Promise.all(keys.map(k => this.blobPool.get(k)));
        const buf: Buffer = await ZipBuilder.merge(buffers);

        console.log(`Uploading ${(buf.length / (1024 * 1024)).toFixed(3)}MB for ${instrumentName}`);
        return S3Ref.put(this.blobPool.factory, s3Ref, buf, CONTENT_TYPE);
    }    

    public async teleport(zipBuilder: ZipBuilder, destination: S3Ref, instrumentName: string) {
        const delta = await this.uploadFragments(zipBuilder);
        await this.mergeFragments(delta, destination, instrumentName);    
    }
}
