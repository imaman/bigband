import { AwsFactory } from './AwsFactory';

export class S3Ref {
  constructor(public readonly s3Bucket, public readonly s3Key) {}

  static EMPTY = new S3Ref("", "");

  isOk() {
    return Boolean(this.s3Bucket) && Boolean(this.s3Key);
  }

  toUri() {
    return `s3://${this.s3Bucket}/${this.s3Key}`
  }

  toString() {
    return this.toUri();
  }

  static async put(factory: AwsFactory, s3Ref: S3Ref, buf: Buffer, contentType = "application/zip") {
    const s3 = factory.newS3();
    try {
        return s3.putObject({
          Bucket: s3Ref.s3Bucket,
          Key: s3Ref.s3Key,
          Body: buf,
          ContentType: contentType
        }).promise();
      } catch (e) {
        console.log(`S3 putObject error. Profile: ${factory.profileName}, Region: ${factory.region}, Bucket:${s3Ref.s3Bucket}, Key:${s3Ref.s3Key}`);
        throw e;
      }      
  }

  static async get(factory: AwsFactory, s3Ref: S3Ref): Promise<Buffer|undefined> {
    const s3 = factory.newS3();
    try {
        const req: AWS.S3.GetObjectRequest = {
            Bucket: s3Ref.s3Bucket,
            Key: s3Ref.s3Key
        }
        const resp: AWS.S3.GetObjectOutput = await s3.getObject(req).promise();
        return resp.Body as Buffer;
      } catch (e) {
        console.log(`S3 getObject error. Profile: ${factory.profileName}, Region: ${factory.region}, Bucket:${s3Ref.s3Bucket}, Key:${s3Ref.s3Key}`);
        throw e;
      }      
  }
}
