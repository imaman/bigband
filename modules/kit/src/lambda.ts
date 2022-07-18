import { z } from 'zod'

import { AbstractInstrument } from './abstract-instrument'
import { Resolution } from './instrument'
import { Role } from './role'
import { Section } from './section'

const s3CodeLocation = z.object({
  S3Bucket: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[0-9A-Za-z\.\-_]*(?<!\.)$/),
  S3Key: z.string().min(1).max(1024),
  S3ObjectVersion: z.string().optional(),
})

const Description = z.string().max(256).optional()
const EphemeralStorageSize = z.number().int().min(512).max(10240)
const MemorySize = z.number().int().min(128).max(10240).optional()
const Timeout = z.number().int().min(0).optional()

const LambdaProperties = z.object({
  description: Description,
  ephemeralStorage: EphemeralStorageSize.optional(),
  memorySize: MemorySize,
  timeout: Timeout,
  maxConcurrency: z.number().or(z.literal('REGIONAL_ACCOUNT_LIMIT')).optional(),
  codeLocation: s3CodeLocation.optional(),
})
type LambdaProperties = z.infer<typeof LambdaProperties>

const CloudformationProperties = z.object({
  Architectures: z.string().array().optional(),
  Code: z
    .object({
      ImageUri: z.string(),
    })
    .or(s3CodeLocation)
    .or(
      z.object({
        ZipFile: z.string(),
      }),
    ),
  CodeSigningConfigArn: z.string().max(200).optional(),
  DeadLetterConfig: z.object({ TargetArn: z.string() }).optional(),
  Description,
  Environment: z
    .object({
      Variables: z.record(z.string()),
    })
    .optional(),
  EphemeralStorage: z
    .object({
      Size: EphemeralStorageSize,
    })
    .optional(),
  FileSystemConfigs: z
    .object({
      Arn: z.string(),
      LocalMountPath: z.string(),
    })
    .array()
    .max(1)
    .optional(),
  FunctionName: z.string().optional(),
  Handler: z.string().max(128),
  ImageConfig: z
    .object({
      Command: z.string().array(),
      EntryPoint: z.string().array(),
      WorkingDirectory: z.string(),
    })
    .optional(),
  KmsKeyArn: z.string().optional(),
  Layers: z.string().array().optional(),
  MemorySize,
  PackageType: z.literal('Image').or(z.literal('Zip')).optional(),
  ReservedConcurrentExecutions: z.number().optional(),
  Role: z.string(),
  Runtime: z.string(),
  Tags: z
    .object({ Key: z.string().max(128), Value: z.string().max(256) })
    .array()
    .optional(),
  Timeout,
  TracingConfig: z
    .object({
      Mode: z.literal('Active').or(z.literal('PassThrough')),
    })
    .optional(),
  VpcConfig: z
    .object({
      SecurityGroupIds: z.string().array(),
      SubnetIds: z.string().array(),
    })
    .optional(),
})
type CloudformationProperties = z.infer<typeof CloudformationProperties>

export class Lambda extends AbstractInstrument {
  readonly role: Role
  readonly props

  constructor(name: string, props: LambdaProperties) {
    super(name)
    this.props = LambdaProperties.parse(props)
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
    const properties: CloudformationProperties = {
      Description: this.props.description,
      Code: this.props.codeLocation ?? {
        ZipFile: `exports.handler = function(event, context) { return {} }`,
      },
      Role: this.role.arn(section),
      FunctionName: this.name.qualifiedName(section),
      Handler: 'index.handler',
      Runtime: 'nodejs16.x',
      MemorySize: this.props.memorySize ?? 128,
      Timeout: this.props.timeout ?? 3,
      EphemeralStorage: { Size: this.props.ephemeralStorage ?? 512 },
      ...(this.props.maxConcurrency === 'REGIONAL_ACCOUNT_LIMIT'
        ? {}
        : { ReservedConcurrentExecutions: this.props.maxConcurrency }),
    }

    return {
      name: this.name,
      type: 'AWS::Lambda::Function',
      children: [this.role],
      properties: CloudformationProperties.parse(properties),
    }
  }
}
