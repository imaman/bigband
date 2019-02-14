import { S3Ref } from "./S3Ref";
import { ZipBuilder } from "./ZipBuilder";
import { AwsFactory } from "./AwsFactory";
import * as uuid from 'uuid/v1';

class Delta {
    constructor(readonly buffer: Buffer) {}
}


const CONTENT_TYPE = 'application/zip';

export class Teleporter {

    private readonly deltaS3: S3Ref;
    constructor(private readonly factory: AwsFactory, private readonly s3Bucket: string, private readonly s3Prefix: string) {
        this.deltaS3 = new S3Ref(this.s3Bucket, `${this.s3Prefix}/deployables/${uuid()}`);
    }

    async computeDelta(zipBuilder: ZipBuilder, s3Ref: S3Ref): Promise<Delta> {
        console.log('computeDelta on ' + s3Ref);
        return new Delta(await zipBuilder.toBuffer());
    }

    async pushDelta(delta: Delta) {
        console.log('pushDelta into ' + this.deltaS3);
        return S3Ref.put(this.factory, this.deltaS3, delta.buffer, CONTENT_TYPE);
    }

    async mergeDelta(delta: Delta, s3Ref: S3Ref, instrumentName: string) {
        console.log('mergeDelta: ' + this.deltaS3 + ' + ' + s3Ref);
        const buf = await S3Ref.get(this.factory, this.deltaS3);        
        if (!buf) {
            console.log('buf is falsy');
            throw new Error('Got a falsy buffer from ' + this.deltaS3);
        }

        console.log(`Uploading ${(buf.length / (1024 * 1024)).toFixed(3)}MB for ${instrumentName}`);
        return S3Ref.put(this.factory, s3Ref, buf, CONTENT_TYPE);
    }    
}


