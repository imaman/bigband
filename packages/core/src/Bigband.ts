
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
     * The AWS account to use for the bigband
     *
     * @type {string}
     * @memberof Bigband
     */
    readonly awsAccount: string

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

    constructor(init: BigbandInit) {
        this.name = init.name
        this.awsAccount = init.awsAccount
        this.profileName = init.profileName
        this.s3Prefix = init.s3Prefix
        this.s3BucketGuid = init.s3BucketGuid
        this.s3BucketPrefix = init.s3BucketPrefix || 'npm-bigband'

        // TODO(imaman): check validity of the s3BucketGuid and s3BucketPrefix
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
     * The AWS account to use for the bigband
     *
     * @type {string}
     * @memberof BigbandInit
     */
    awsAccount: string
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
    s3Prefix: string

    s3BucketGuid: string
    s3BucketPrefix?: string
}
