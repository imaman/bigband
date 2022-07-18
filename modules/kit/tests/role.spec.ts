import { Bigband } from '../src'
import { Lambda } from '../src/lambda'
import { Role } from '../src/role'

describe('role', () => {
  test('computes an ARN', async () => {
    const r = new Role('my-role', {})
    const s = new Bigband('boo', []).resolveSection({
      account: '222244448888',
      partition: 'aws',
      region: 'ca-central-4',
      sectionName: 'red',
    })
    const arn = r.arn(s)
    expect(arn).toEqual('arn:aws:iam::222244448888:role/boo-red-myRole')
  })
  describe('resolve', () => {
    test('returns a cloudformation template', () => {
      const r = new Role('my-role', {
        ManagedPolicyArns: ['iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
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
        Policies: [
          {
            PolicyName: 'access-to-s3',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: 'S3:GetObject',
                  Resource: 'arn:aws:s3:::moojo-bootstrapping-41cfb181-37e7-46e6-a95e-8eace55500cf/cas/*',
                },
              ],
            },
          },
        ],
      })

      const b = new Bigband('boo', [r])

      const s = b.resolveSection({ account: '22224444', region: 'ca-central-3', partition: 'aws', sectionName: 'foo' })
      const template = b.resolve(s)
      expect(template).toEqual({
        Resources: {
          myRole: {
            Type: 'AWS::IAM::Role',
            Properties: {
              RoleName: 'boo-foo-myRole',
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
              Policies: [
                {
                  PolicyDocument: {
                    Statement: [
                      {
                        Action: 'S3:GetObject',
                        Effect: 'Allow',
                        Resource: 'arn:aws:s3:::moojo-bootstrapping-41cfb181-37e7-46e6-a95e-8eace55500cf/cas/*',
                      },
                    ],
                    Version: '2012-10-17',
                  },
                  PolicyName: 'access-to-s3',
                },
              ],
            },
          },
        },
      })
    })
    test('permissions', () => {
      const r = new Role('my-role', {})
      const l = new Lambda('my-lambda')
      r.allowedTo(l, 'lambda:invoke')

      const b = new Bigband('boo', [r])

      const s = b.resolveSection({ account: '22224444', region: 'ca-central-3', partition: 'aws', sectionName: 'foo' })
      const template = b.resolve(s)
      expect(template).toEqual({
        Resources: {
          myRole: {
            Type: 'AWS::IAM::Role',
            Properties: {
              RoleName: 'boo-foo-myRole',
              Policies: [
                {
                  PolicyDocument: {
                    Statement: [
                      {
                        Action: 'lambda:invoke',
                        Effect: 'Allow',
                        Resource: 'arn:aws:lambda:ca-central-3:22224444:function:boo-foo-myLambda',
                      },
                    ],
                    Version: '2012-10-17',
                  },
                  PolicyName: 'bigband-computed-policy',
                },
              ],
            },
          },
        },
      })
    })
  })
})
