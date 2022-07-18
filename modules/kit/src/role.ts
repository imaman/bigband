import { AbstractInstrument } from './abstract-instrument'
import { Instrument, Resolution } from './instrument'
import { Section } from './section'

interface RoleProperties {
  ManagedPolicyArns?: string[]
  AssumeRolePolicyDocument?: PolicyDocument
  Policies?: Policy[]
}

/**
 *  {
 *    PolicyName: 'access-to-s3',
 *    PolicyDocument: {
 *      Version: '2012-10-17',
 *      Statement: [
 *        {
 *          Effect: 'Allow',
 *          Action: 'S3:GetObject',
 *          Resource: 'arn:aws:s3:::foo/goo/*',
 *  }]}
 */
interface Policy {
  PolicyName: string
  PolicyDocument: PolicyDocument
}

interface PolicyDocument {
  Statement: StatementElement[]
  Version: string
}

interface Principal {
  Service: string
}

interface StatementElement {
  Action: string
  Effect: 'Allow' | 'Deny'
  Principal?: Principal
  Resource?: string
}

export class Role extends AbstractInstrument {
  private permissions: [Instrument, string][] = []

  constructor(name: string, private readonly properties: RoleProperties) {
    super(name)
  }

  allowedTo(instrument: Instrument, action: string) {
    this.permissions.push([instrument, action])
  }

  private computePolicy(section: Section): Policy | undefined {
    if (!this.permissions.length) {
      return undefined
    }

    const statements: StatementElement[] = this.permissions.map(([i, a]) => ({
      Effect: 'Allow',
      Action: a,
      Resource: i.arn(section),
    }))

    return {
      PolicyName: 'bigband-computed-policy',
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: statements,
      },
    }
  }

  resolve(section: Section): Resolution {
    const d = this.properties.AssumeRolePolicyDocument
    const p = this.computePolicy(section)
    const mpas = this.properties.ManagedPolicyArns?.map(x => `arn:${section.partition}:${x}`) ?? []
    const policies = [...(this.properties.Policies ?? []), ...(p ? [p] : [])]
    return {
      name: this.name,
      type: 'AWS::IAM::Role',
      properties: {
        RoleName: this.name.qualifiedName(section),
        ...(d ? { AssumeRolePolicyDocument: d } : undefined),
        ...(mpas.length ? { ManagedPolicyArns: mpas } : undefined),
        ...(policies.length ? { Policies: policies } : undefined),
      },
    }
  }

  // "arn:aws:iam::222244448888:role/foo-goo-hoo",
  getArnDetails(s: Section) {
    return { serviceName: 'iam', region: '', resourceType: 'role', resourceId: `/${this.name.qualifiedName(s)}` }
  }
}
