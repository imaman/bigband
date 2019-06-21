export class Bigband {
    readonly name: string
    readonly awsAccount: string
    readonly profileName: string
    readonly s3Bucket: string
    readonly s3Prefix: string

    constructor(init: BigbandInit) {
        this.name = init.name
        this.awsAccount = init.awsAccount
        this.profileName = init.profileName
        this.s3Bucket = init.s3Bucket
        this.s3Prefix = init.s3Prefix
    }
}

export interface BigbandInit {
    name: string
    awsAccount: string
    profileName: string
    s3Bucket: string
    s3Prefix: string
}
