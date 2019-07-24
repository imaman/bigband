import { AwsFactory } from 'bigband-core'
import { logger } from './logger';
import { GetBucketLocationRequest } from 'aws-sdk/clients/s3';

export class S3Ref {
  constructor(public readonly s3Bucket: string, public readonly s3Key: string) {
    if (s3Key.indexOf("//") >= 0 || s3Key.startsWith("/") || s3Key.endsWith("/")) {
      throw new Error(`Bad S3 KEY: "${s3Key}"`)
    }
  }

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

  toPojo() {
    return {bucket: this.s3Bucket, key: this.s3Key}
  }

  static async put(factory: AwsFactory, s3Ref: S3Ref, buf: Buffer, contentType = "application/zip") {
    logger.silly('Putting into ' + s3Ref)
    const s3 = factory.newS3();
    try {
        await s3.putObject({
          Bucket: s3Ref.s3Bucket,
          Key: s3Ref.s3Key,
          Body: buf,
          ContentType: contentType
        }).promise();
      } catch (e) {
        logger.error(`S3 putObject error. Profile: ${factory.profileName}, Region: ${factory.region}, Bucket:${s3Ref.s3Bucket}, Key:${s3Ref.s3Key}`);
        throw e;
      }      
  }

  static async get(factory: AwsFactory, s3Ref: S3Ref): Promise<Buffer> {
    logger.silly('Getting from ' + s3Ref)
    const s3 = factory.newS3();
    let resp: AWS.S3.GetObjectOutput;
    try {
        const req: AWS.S3.GetObjectRequest = {
            Bucket: s3Ref.s3Bucket,
            Key: s3Ref.s3Key
        }
        resp = await s3.getObject(req).promise();
      } catch (e) {
        logger.error(`S3 getObject error. Profile: ${factory.profileName}, Region: ${factory.region}, Bucket:${s3Ref.s3Bucket}, Key:${s3Ref.s3Key}`);
        throw e;
      }  

      const ret = resp.Body;
      if (!ret) {
        throw new Error(`Empty body when reading an S3 object. ${factory.profileName}, Region: ${factory.region}, Bucket:${s3Ref.s3Bucket}, Key:${s3Ref.s3Key}`);
      }

      return ret as Buffer;
  }

  static async getRegion(factory: AwsFactory, bucketName: string): Promise<string> {
    const s3 = factory.newS3()
    const req: GetBucketLocationRequest = {
      Bucket: bucketName
    }
    try {
      const resp = await s3.getBucketLocation(req).promise()
      return resp.LocationConstraint || ''  
    } catch (e) {
      if (e.code === 'NoSuchBucket') {
        return ''
      }

      throw e
    }
  }

  static async exists(factory: AwsFactory, s3Ref: S3Ref): Promise<boolean> {
    const s3 = factory.newS3();

    try {

        if (s3Ref.s3Key === '') {
          const req: AWS.S3.HeadBucketRequest = {
            Bucket: s3Ref.s3Bucket
          }
          await s3.headBucket(req).promise();
        } else {
          const req: AWS.S3.HeadObjectRequest = {
            Bucket: s3Ref.s3Bucket,
            Key: s3Ref.s3Key
          }
          await s3.headObject(req).promise();
        }
        return true;
      } catch (e) {
        return false;
      }  
  }
}
