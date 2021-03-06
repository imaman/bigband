
// Deprecated. Replaced by the Bigband class.
export class IsolationScope {
    readonly profileName: string
    constructor(public readonly awsAccount: string, public readonly name: string,
        public readonly s3Bucket: string, public readonly s3Prefix: string,
        public readonly profile: string) {
      this.profileName = profile        
    }

    static create(init: IsolationScopeInit): IsolationScope {
        return new IsolationScope(init.awsAccount, init.scopeName, init.s3Bucket, init.s3Prefix, init.profileName)
    }
}

export interface IsolationScopeInit {
    awsAccount: string
    scopeName: string
    s3Bucket: string
    s3Prefix: string
    profileName: string
}
