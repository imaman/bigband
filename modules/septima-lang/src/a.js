// something interesting goes here.
let generation = 'prod';
let stackName = 'd';
let account = '091530143433';
let casPrefix = 'build-raptor/cache-v1/cas';
let codeBucket = 'moojo-dev-infra';

//  options: { 
//    // size of the ephemeral storage allocated for the lambda function, in MB. Defaults to 512.
//    storageInMb: number 
//    // size of the RAM allocated for the lambda function, in MB. Defaults to 128.
//    ramInMb: number 
//    // max amount of time for handling a request, in seconds. Defaults to 3.
//    timeoutInSeconds: number
//  }
let lambda = (name, cas, options) => {
    let roleName = name + 'Role';
    
  return {
    [name]: {
      Type: 'AWS::Lambda::Function',
      Properties: {
        Code: {
          S3Bucket: codeBucket,
          S3Key: casPrefix + '/' + cas
        },
        EphemeralStorage: { Size: options.storageInMb ?? 512 },
        FunctionName: stackName + '-' + generation + '-' + name,
        Handler: 'index.handler',
        MemorySize: options.ramInMb ?? 128,
        Role: 'arn:aws:iam::' + account + ':role/' + stackName + '-' + generation + '-' + roleName,
        Runtime: 'nodejs16.x',
        Timeout: options.timeoutInSeconds ?? 3
      },
      DependsOn: [roleName]
    },
    [roleName]: {
      Type: 'AWS::IAM::Role',
      Properties: {
        RoleName: stackName + '-' + generation + '-' + roleName,
        AssumeRolePolicyDocument: {
          Statement: [{ Action: 'sts:AssumeRole', Effect: 'Allow', Principal: { Service: 'lambda.amazonaws.com' } }],
          Version: '2012-10-17'
        },
        ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
        Policies: [
          {
            PolicyName: 'computed-policy',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [{ Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::prod-moojo-dev-infra' }]
            }
          }
        ]
      }
    }
}};

let template = (resources) => ({
  Resources: {
    ...Object.fromEntries(resources.flatMap((r) => Object.entries(r)))
  }
})


template([ lambda('foo', '1b393be42ae91bf07cb367466bf1c61b171aa95555f2377955648ae4', {}) ])

