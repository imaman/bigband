import { Bigband } from '../src/bigband'
import { Lambda } from '../src/lambda'
import { S3Bucket } from '../src/s3-bucket'

describe('lambda', () => {
  test('computes an ARN', async () => {
    const l = new Lambda('my-function', {})
    const arn = l.arn({ account: '222244448888', partition: 'aws', region: 'ca-central-4', sectionName: 'red' })
    expect(arn).toEqual('arn:aws:lambda:ca-central-4:222244448888:function:red-myFunction')
  })
  test('yells if the memory size is below 128', () => {
    expect(() => new Lambda('my-lambda', { memorySize: 127 })).toThrowError(
      'Number must be greater than or equal to 128',
    )
    expect(() => new Lambda('my-lambda', { memorySize: 128 })).not.toThrow()
  })
  describe('resolve', () => {
    test('returns a cloudformation template', async () => {
      const b = new Bigband([
        new Lambda('my-lambda', {
          description: 'blah blah',
          ephemeralStorage: 2048,
          memorySize: 5000,
          timeout: 10,
        }),
      ])

      const template = b.resolve({ account: '22224444', region: 'ca-central-3', partition: 'aws', sectionName: 'foo' })
      expect(template).toEqual({
        Resources: {
          myLambda: {
            Type: 'AWS::Lambda::Function',
            DependsOn: ['myLambdaRole'],
            Properties: {
              Description: 'blah blah',
              Code: {
                ZipFile: 'exports.handler = function(event, context) { return {} }',
              },
              Role: 'arn:aws:iam::22224444:role/foo-myLambdaRole',
              FunctionName: 'foo-myLambda',
              Handler: 'index.handler',
              Runtime: 'nodejs16.x',
              Timeout: 10,
              MemorySize: 5000,
              EphemeralStorage: {
                Size: 2048,
              },
            },
          },
          myLambdaRole: {
            Type: 'AWS::IAM::Role',
            Properties: {
              RoleName: 'foo-myLambdaRole',
              AssumeRolePolicyDocument: {
                Statement: [
                  {
                    Action: 'sts:AssumeRole',
                    Effect: 'Allow',
                    Principal: {
                      Service: 'lambda.amazonaws.com',
                    },
                  },
                ],
                Version: '2012-10-17',
              },
              ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
            },
          },
        },
      })
    })
    test.skip('respects the max concurrency value', async () => {
      const b = new Bigband([new Lambda('my-lambda', { maxConcurrency: 987 })])

      const template = b.resolve({ account: '22224444', region: 'ca-central-3', partition: 'aws', sectionName: 'foo' })
      expect(template.Resources.myLambda.Properties).toMatchObject({
        ReservedConcurrentExecutions: 987,
      })
    })
    test('permissions', async () => {
      const bucket = new S3Bucket('my-bucket', {})
      const lambda = new Lambda('my-lambda', { maxConcurrency: 987 })
      const b = new Bigband([lambda, bucket])
      lambda.role.allowedTo(bucket, 's3:PutObject')

      const template = b.resolve({ account: '22224444', region: 'ca-central-3', partition: 'aws', sectionName: 'foo' })
      expect(template.Resources.myLambda.Properties).toMatchObject({
        // ReservedConcurrentExecutions: 987,
      })
    })
  })
})
