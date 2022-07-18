import { Bigband } from '../src/bigband'
import { Lambda } from '../src/lambda'
import { S3Bucket } from '../src/s3-bucket'

describe('lambda', () => {
  const loc = { bucket: new S3Bucket('aaa', {}), path: 'bbb' }

  test('computes an ARN', async () => {
    const l = new Lambda('my-function')
    const s = new Bigband('yellow-submarine', []).resolveSection({
      account: '222244448888',
      partition: 'aws',
      region: 'ca-central-4',
      sectionName: 'red',
    })
    const arn = l.arn(s)
    expect(arn).toEqual('arn:aws:lambda:ca-central-4:222244448888:function:yellowSubmarine-red-myFunction')
  })
  test('yells if the memory size is below 128', () => {
    expect(() => new Lambda('my-lambda', loc, { memorySize: 127 })).toThrowError(
      'Number must be greater than or equal to 128',
    )
    expect(() => new Lambda('my-lambda', loc, { memorySize: 128 })).not.toThrow()
  })
  describe('resolve', () => {
    test('returns a cloudformation template for a default lambda instrument', async () => {
      const b = new Bigband('b', [new Lambda('my-lambda')])

      const s = b.resolveSection({ account: '22224444', region: 'ca-central-3', partition: 'aws', sectionName: 'foo' })
      const template = b.resolve(s)
      expect(template).toEqual({
        Resources: {
          myLambda: {
            Type: 'AWS::Lambda::Function',
            DependsOn: ['myLambdaRole'],
            Properties: {
              Code: {
                ZipFile: 'exports.handler = function(event, context) { return {} }',
              },
              Role: 'arn:aws:iam::22224444:role/b-foo-myLambdaRole',
              FunctionName: 'b-foo-myLambda',
              Handler: 'index.handler',
              Runtime: 'nodejs16.x',
              Timeout: 3,
              MemorySize: 128,
              EphemeralStorage: {
                Size: 512,
              },
            },
          },
          myLambdaRole: {
            Type: 'AWS::IAM::Role',
            Properties: {
              RoleName: 'b-foo-myLambdaRole',
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
    test('respects properties', async () => {
      const b = new Bigband('b', [
        new Lambda('my-lambda', loc, {
          description: 'blah blah',
          ephemeralStorage: 2048,
          memorySize: 5000,
          timeout: 10,
        }),
      ])

      const s = b.resolveSection({ account: '22224444', region: 'ca-central-3', partition: 'aws', sectionName: 'foo' })
      const template = b.resolve(s)
      expect(template.Resources.myLambda.Properties).toMatchObject({
        Description: 'blah blah',
        EphemeralStorage: {
          Size: 2048,
        },
        MemorySize: 5000,
        Timeout: 10,
      })
    })
    test.skip('respects the max concurrency value', async () => {
      const b = new Bigband('b', [new Lambda('my-lambda', loc, { maxConcurrency: 987 })])

      const s = b.resolveSection({ account: '22224444', region: 'ca-central-3', partition: 'aws', sectionName: 'foo' })
      const template = b.resolve(s)
      expect(template.Resources.myLambda.Properties).toMatchObject({
        ReservedConcurrentExecutions: 987,
      })
    })
    describe('code location', () => {
      test('defaults to an empty hanlder implementation that is inlined into the template', () => {
        const lambda = new Lambda('my-lambda')
        const b = new Bigband('b', [lambda])

        const s = b.resolveSection({
          account: '22224444',
          region: 'ca-central-3',
          partition: 'aws',
          sectionName: 'foo',
        })
        const template = b.resolve(s)
        expect(template.Resources.myLambda.Properties).toMatchObject({
          Code: {
            ZipFile: 'exports.handler = function(event, context) { return {} }',
          },
        })
      })
      test('uses the given s3Bucket', () => {
        const bucket = new S3Bucket('my-bucket', {})
        const lambda = new Lambda('my-lambda', { bucket, path: 'goo/hoo' })
        const b = new Bigband('b', [lambda])

        const s = b.resolveSection({
          account: '22224444',
          region: 'ca-central-3',
          partition: 'aws',
          sectionName: 'foo',
        })
        const template = b.resolve(s)
        expect(template.Resources.myLambda.Properties).toMatchObject({
          Code: {
            S3Bucket: 'foo-my-bucket',
            S3Key: 'goo/hoo',
          },
        })
      })
    })
    test.skip('permissions', async () => {
      const bucket = new S3Bucket('my-bucket', {})
      const lambda = new Lambda('my-lambda')
      const b = new Bigband('b', [lambda, bucket])
      lambda.role.allowedTo(bucket, 's3:PutObject')

      const s = b.resolveSection({ account: '22224444', region: 'ca-central-3', partition: 'aws', sectionName: 'foo' })
      const template = b.resolve(s)
      expect(template.Resources.myLambda.Properties).toMatchObject({
        // ReservedConcurrentExecutions: 987,
      })
    })
  })
})
