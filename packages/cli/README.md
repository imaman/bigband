# Bigband

Build production grade serveless systems.

* [Why Bigband](#why)
* [What is Bigband](#what)
* [Three core concepts](#concepts)
* [Quick Start](#quick-start)

## <a name="why"></a>Why Bigband?
- Super-fast deployments.
- Proven - came out of [testim.io](https://www.testim.io/) where it is used to drive two business-critical large-scale projects.
- Reusability - say goodbye to copy-pasting huge YAML snippets.
- IAM permissions are automatically managed for you - say goodebye to getting a `___ is not authorized to perform: ___ on resource ___` at runtime.
- Dependencies are injected into your code wrapped by high-level APIs - say goodebye to getting a runtime errors due to a mis-constructed an ARN.
- Secure - Bigband does its best to protect you from potentially costly mistakes. For instance, it will guard against cycles of lambda functions.

## <a name="what"></a>What is Bigband?
The Bigband system has three main parts:
- A command line tool
- A Typescript API for configuring the architecture of your system
- A Typescript API to be used at runtime by Lambda functions 

## <a name="concepts"></a>Three core concepts
- *Instrument*: the basic building-block, usually corresponds to an AWS resources such as: a Lambda function, a DynamoDB table, a Kinesis stream, etc.
- *Section*: A set of instruments. This is the unit of deployment: depending on your exact needs you can define, for instance, a `prod` section and a `staging` section, or you can define a `storage` section and a `business-logic` section.
- *Bigband*: a set of sections. This is the unit of isolation: instruments within the same bigband can be wired together to create a cohesive application/service-mesh. 

## <a name="quick-start"></a>Quick start

### Prerequisites

- Have an AWS profile setup on your local machine ([instructions](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html))
- Optional: have [npx](https://www.npmjs.com/package/npx) installed (if you do not want to use `npx` you can run `bigband` directly via `node_modules/.bin/bigband`)


### Install

```
npm install --save-dev bigband
```

### Prepare an S3 bucket
Bigband uses AWS' S3 for pushing data/code into the AWS cloud. You can either:

- use a pre-existing S3 bucket (all Bigband writes take place under a key-prefix which you control) 
- or, you can create a new bucket.

If you chose the latter use the following command:
```bash
aws s3 mb s3://<YOUR-S3-BUCKET-NAME>
```

### Define your bigband
Create a `bigband.config.ts` file, as shown below. Place it at the same directory as your `package.json` file. Don't forget to *replace the placeholder values* (`<YOUR-AWS-ACCOUNT-ID>`, `<YOUR-AWS-PROFILE-NAME>`, and `<YOUR-S3-BUCKET-NAME>`) with your own values.

```typescript
import { Bigband, LambdaInstrument, Section } from 'bigband-core/lib/index';

const bigband = new Bigband({
    name: 'hello-bigband',
    awsAccount: '<YOUR-AWS-ACCOUNT-ID>',
    profileName: '<YOUR-AWS-PROFILE-NAME>',
    s3Bucket: '<YOUR-S3-BUCKET-NAME>',
    s3Prefix: 'hello-bigband-root'});
const prod = new Section(bigband, 'eu-west-2', 'prod');

const greeter = new LambdaInstrument('misc', 'greeter', 'src/greeter', {
    Description: "plain old greeter",
    MemorySize: 1024,
    Timeout: 15   
});

export function run() {
    return {
        sections: [prod],
        instruments: [greeter]
    }
}
```

### Implement a greeter function
Add an `src/greeter.ts` file, as follows:

```typescript
export async function runLambda(context, event, mapping) {
    return {
        greeting: `The name is ${event.lastName}, ${event.firstName} ${event.lastName}`
    };
}
```

This function expects to receive an input with two string fields `lastName`, `firstName`. It generates an output which is an object with a single field, `greeting`.



### Time to ship
We deploy via Bigband's `ship` command. This will setup everything in the AWS cloud as needed.

```bash
npx bigband ship
```

Once you run it, deployment will begin. First-time deployments usually take on the order of 60-90s to complete (as all necessary AWS resources need to be created via `cloudformation`). Subsequent deployments should be much faster. Here is a full transcript of the `ship` command:

```
$ npx bigband ship
Shipping section "prod" to eu-west-2
Compiling misc-greeter
Compiling bigband-system-teleport
Non-teleporting deployment (0.541MB) of bigband-system-teleport
Non-teleporting deployment (0.002MB) of misc-greeter
Creating change set
.
..
Enacting Change set
.
..
...
Stack status: CREATE_COMPLETE
Section "prod" shipped in 75.5s
```


Important: `bigband ship` is the one-and-only command used for deplyoing bigbands. You use it for first-time deployments (as you just did) as well as for every subsequent update. It ships code changes (e.g., changes to `src/greeter.ts`) as well as architecutral changes (e.g., changes to `bigband.config.ts` file). Behind the scenes, Bigband makes sure that the deployment is minimal: only things that were actully changed will be redeployed. Specifically, if you have multiple lambda instruments defined in your bigband and you have changed just a few them, then running `bigband ship` will only *update the lambdas that were changed*.

Bottom line: freely run `bigband ship` whenever you need to deploy.



### Let's greet
Use Bigband's `invoke` command to send a payload of your choice to a lambda instrument. The general format is as follows:

```
npx bigband invoke --function-name <name-of-a-lambda-instrument> --input <JSON>
```

In this tutorial, the function name is `greeter` and the input JSON is an object with two fields (`firstName`, `lastName`):

```
$ npx bigband invoke --function-name greeter --input '{"firstName": "James", "lastName": "Bond"}'
{
  "StatusCode": 200,
  "LogResult": [
    "START RequestId: 3c2d1393-9348-4630-8c64-19d7c761a6db Version: $LATEST",
    "END RequestId: 3c2d1393-9348-4630-8c64-19d7c761a6db",
    "REPORT RequestId: 3c2d1393-9348-4630-8c64-19d7c761a6db\tDuration: 2.50 ms\tBilled Duration: 100 ms \tMemory Size: 1024 MB\tMax Memory Used: 57 MB\t",
    ""
  ],
  "ExecutedVersion": "$LATEST",
  "Payload": {
    "greeting": "The name is Bond, James Bond"
  }
}
```


### Congratulations!
Your first bigband is up-and-playing.

