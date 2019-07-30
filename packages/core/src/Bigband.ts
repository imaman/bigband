
/**
 * A set of sections. This is the unit of isolation: instruments that are part of the same Bigband instance can be
 * wired together to create a cohesive application/service-mesh. This wiring takes place by invoking the
 * [[Instrument]]'s uses() method
 *
 * @export
 * @class Bigband
 */
export class Bigband {

    /**
     * The name of this bigband. It is the responsbility of the caller to ensure that this name is unique (within the AWS account).
     *
     * @type {string}
     * @memberof Bigband
     */
    readonly name: string

    /**
     * The name of an AWS named profile defined on the local machine
     *
     * @type {string}
     * @memberof Bigband
     */
    readonly profileName: string

    /**
     * A prefix that will be used for the names of all objects written into S3 buckets by the bigband tool
     *
     * @type {string}
     * @memberof Bigband
     */
    readonly s3Prefix: string

    readonly s3BucketGuid: string
    readonly s3BucketPrefix: string
    readonly description: string

    constructor(init: BigbandInit) {
        this.name = init.name
        this.profileName = init.profileName
        this.s3Prefix = init.s3Prefix || 'bigband-root'
        this.s3BucketGuid = init.s3BucketGuid
        this.s3BucketPrefix = init.s3BucketPrefix || 'npm-bigband'
        this.description = init.description || 'An unspecified bigband description'

        if (this.s3BucketGuid.startsWith("<")) {
            throw new Error(`Bad value for s3BucketGuid: "${this.s3BucketGuid}"`)
        }

        // TODO(imaman): check validity of the s3BucketGuid and s3BucketPrefix
        // TODO(imaman): check length of description
    }
}

export interface BigbandInit {
    /**
     * The name of this bigband. It is the responsbility of the caller to ensure that this name is unique (within the AWS account).
     *
     * @type {string}
     * @memberof BigbandInit
     */
    name: string
    /**
     * The name of an AWS named profile defined on the local machine
     *
     * @type {string}
     * @memberof BigbandInit
     */
    profileName: string
    /**
     * A prefix that will be used for the names of all objects written into S3 buckets by the bigband tool
     *
     * @type {string}
     * @memberof BigbandInit
     */
    s3Prefix?: string

    s3BucketGuid: string
    s3BucketPrefix?: string

    /**
     * A human-readable text explaining what this bigband is about.
     */
    description?: string
}
