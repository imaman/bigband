import { AbstractInstrument, ArnDetails } from './abstract-instrument'
import { Resolution } from './instrument'
import { Section } from './section'

interface S3BucketProperties {
  isExactName?: boolean
}

export class S3Bucket extends AbstractInstrument {
  constructor(name: string, private readonly properties: S3BucketProperties) {
    super(name)
  }

  // arn:aws:s3:::my-bucket
  getArnDetails(s: Section): ArnDetails {
    // ARNs of S3 buckets are of this form: `arn:aws:s3:::<bucket-name>` (three consecutive colons). Setting region,
    // account and resourceType to the empty string yields an ARN string with four consecutive colons
    // (`arn:aws::::<bucket-name>`). We hack around this by switching the roles of resourceType and resourceId.
    return { serviceName: 's3', region: '', account: '', resourceType: this.bucketName(s), resourceId: '' }
  }

  bucketName(s: Section) {
    if (this.properties.isExactName) {
      return this.name.parts.join('-')
    }
    return `${s.sectionName}-${this.name.parts.join('-')}`
  }

  resolve(section: Section): Resolution {
    return {
      type: 'AWS::S3::Bucket',
      name: this.name,
      deletionPolicy: 'Retain',
      properties: {
        BucketName: this.bucketName(section),
        OwnershipControls: {
          Rules: [{ ObjectOwnership: 'BucketOwnerEnforced' }],
        },
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            },
          ],
        },
      },
    }
  }
}
