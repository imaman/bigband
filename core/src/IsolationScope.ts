export class IsolationScope {
    constructor(public readonly awsAccount: string, public readonly name: string,
        public readonly s3Bucket: string, public readonly s3Prefix: string,
        public readonly profile: string) {}
}

