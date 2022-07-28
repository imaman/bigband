import { Bigband } from '../src/bigband'
import { S3Bucket } from '../src/s3-bucket'

describe('s3-bucket', () => {
  test('computes an ARN', async () => {
    const bucket = new S3Bucket('my-bucket', {})
    const s = new Bigband('boo', []).resolveSection({
      account: '222244448888',
      partition: 'aws',
      region: 'ca-central-4',
      sectionName: 'red',
    })
    const arn = bucket.arn(s)
    expect(arn).toEqual('arn:aws:s3:::red-my-bucket')
  })
  test('exact name', async () => {
    const s = new Bigband('boo', []).resolveSection({
      account: '222244448888',
      partition: 'aws',
      region: 'ca-central-4',
      sectionName: 'red',
    })
    expect(new S3Bucket('my-bucket', {}).bucketName(s)).toEqual('red-my-bucket')
    expect(new S3Bucket('my-bucket', { isExactName: true }).bucketName(s)).toEqual('my-bucket')
  })
  describe('resolve', () => {
    test('returns a cloudformation template', async () => {
      const b = new Bigband('boo', [new S3Bucket('my-bucket', {})])

      const s = b.resolveSection({ account: '22224444', region: 'ca-central-3', partition: 'aws', sectionName: 'foo' })
      const template = b.resolve(s)
      expect(template).toEqual({
        Resources: {
          myBucket: {
            Type: 'AWS::S3::Bucket',
            DeletionPolicy: 'Retain',
            Properties: {
              BucketEncryption: {
                ServerSideEncryptionConfiguration: [
                  {
                    ServerSideEncryptionByDefault: {
                      SSEAlgorithm: 'AES256',
                    },
                  },
                ],
              },
              BucketName: 'foo-my-bucket',
              OwnershipControls: {
                Rules: [
                  {
                    ObjectOwnership: 'BucketOwnerEnforced',
                  },
                ],
              },
            },
          },
        },
      })
    })
  })
})
