import { AbstractInstrument } from './abstract-instrument'
import { Resolution } from './instrument'
import { Role } from './role'
import { Section } from './section'

interface LambdaProperties {
  description?: string
  ephemeralStorage?: number
  memorySize?: number
  timeout?: number
  maxConcurrency?: number
}

export class Lambda extends AbstractInstrument {
  readonly role: Role

  constructor(name: string, private readonly properties: LambdaProperties) {
    super(name)
    this.role = new Role(`${name}-role`, {
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
    })
  }

  // "arn:aws:lambda:eu-central-1:222244448888:function:my-function",
  getArnDetails(s: Section) {
    return { serviceName: 'lambda', resourceType: 'function', resourceId: `:${this.name.qualifiedName(s)}` }
  }

  resolve(section: Section): Resolution {
    return {
      name: this.name,
      type: 'AWS::Lambda::Function',
      children: [this.role],
      properties: {
        Description: this.properties.description,
        Code: {
          ZipFile: `exports.handler = function(event, context) { return {} }`,
        },
        Role: this.role.arn(section),
        FunctionName: this.name.qualifiedName(section),
        Handler: 'index.handler',
        Runtime: 'nodejs16.x',
        MemorySize: this.properties.memorySize ?? 128,
        Timeout: this.properties.timeout ?? 3,
        EphemeralStorage: { Size: this.properties.ephemeralStorage ?? 512 },
        // ReservedConcurrentExecutions: this.properties.maxConcurrency ?? 2,
      },
    }
  }
}
