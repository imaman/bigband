# Bigband

Build production grade serveless systems.

* [Why Bigband](#why)
* [What is Bigband](#what)
* [Three core concepts](#concepts)
* [Quick Start](#quick-start)
* [API Reference](https://imaman.github.io/bigband/core/)

## <a name="why"></a>Why Bigband?
- Super-fast deployments.
- Proven - came out of [testim.io](https://www.testim.io/) where it is used to drive two business-critical large-scale projects.
- Reusability - say goodbye to copy-pasting huge YAML snippets.
- IAM permissions are automatically managed for you - say goodebye to getting an `___ is not authorized to perform: ___ on resource ___` error at runtime.
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
- Optional: have [npx](https://www.npmjs.com/package/npx) installed. If you do not want to use `npx` you can run `bigband` directly via `node_modules/.bin/bigband`.

### Create a folder and Install

```
mkdir hello-bigband
cd hello-bigband
npm init -y
npm install --save-dev bigband
mkdir src
```

### Define your bigband
Create a `bigband.config.ts` file, as shown below. Place it at the same directory as your `package.json` file. 

Do not forget to *replace the placeholder values* (`<YOUR-AWS-PROFILE-NAME>`, `<A-GUID>`) with your own values.

- :information_source: you can a GUID value from (say) [here](https://www.uuidgenerator.net/guid)
- :information_source: Your [AWS profile names](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html) are defined in `~/.aws/credentials` (Linux & Mac) or `%USERPROFILE%\.aws\credentials` (Windows).


```typescript
import { Bigband, LambdaInstrument, Section } from 'bigband-core';

const bigband = new Bigband({
        name: 'hello-bigband',
        profileName: '<YOUR-AWS-PROFILE-NAME>',
        s3BucketGuid: '<A-GUID>'
    });

const prod = new Section('eu-west-2', 'prod');
 
const greeter = new LambdaInstrument('myapp', 'greeter', 'src/greeter', {
    Description: "plain old greeter",
    MemorySize: 256,
    Timeout: 15   
});
 

export function run() {
    return {
        bigband,
        sections: [
            {
                section: prod,
                instruments: [greeter],
                wiring: []
            }
        ]
    }
}
```

### Implement a greeter 
Add an `src/greeter.ts` file, as follows:

```typescript
import { AbstractController } from 'bigband-lambda';

interface GreeterRequest {
    firstName?: string
    lastName?: string
}

interface GreeterResponse {
    greeting: string
}

class GreeterController extends AbstractController<GreeterRequest, GreeterResponse> {
    executeScheduledEvent(): void {}
    
    async executeInputEvent(event: GreeterRequest): Promise<GreeterResponse> {
        return {
            greeting: `The name is ${event.lastName}, ${event.firstName} ${event.lastName}`
        }
    }
}

export const controller = new GreeterController()
```

This lambda function expects to receive an input with two string fields `lastName`, `firstName`. It generates an output which is an object with a single field, `greeting`.


### Time to ship
We deploy via Bigband's `ship` command. This will setup everything in the AWS cloud as needed.

```bash
npx bigband ship eu-west-2/prod
```

First-time deployments usually take on the order of 60-90s to complete (as all necessary AWS resources need to be created via `cloudformation`). Subsequent deployments should be much faster. Here is a full transcript of the `ship` command:

```
$ npx bigband ship eu-west-2/prod
Shipping section "prod" to eu-west-2
Compiling myapp-greeter
Compiling bigband-system-teleport
Non-teleporting deployment (0.541MB) of bigband-system-teleport
Non-teleporting deployment (0.002MB) of myapp-greeter
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

Further reading: [shipping](shipping)



### Let's greet
Use Bigband's `exec` command to send a payload of your choice to the `greeter` lambda instrument. 

```bash
npx bigband exec eu-west-2/prod/myapp/greeter --input '{"firstName": "James", "lastName": "Bond"}'
```

You should see an output such as this:

```
$ npx bigband exec eu-west-2/prod/myapp/greeter --input '{"firstName": "James", "lastName": "Bond"}'
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

