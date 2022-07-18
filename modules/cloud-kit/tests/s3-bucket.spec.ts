import { Bigband } from '../src/bigband'
import { S3Bucket } from '../src/s3-bucket'

describe('s3-bucket', () => {
  test('computes an ARN', async () => {
    const l = new S3Bucket('my-bucket', {})
    const arn = l.arn({ account: '222244448888', partition: 'aws', region: 'ca-central-4', sectionName: 'red' })
    expect(arn).toEqual('arn:aws:s3:::red-my-bucket')
  })
  describe('resolve', () => {
    test('returns a cloudformation template', async () => {
      const b = new Bigband([new S3Bucket('my-bucket', {})])

      const template = b.resolve({ account: '22224444', region: 'ca-central-3', partition: 'aws', sectionName: 'foo' })
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
