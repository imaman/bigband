import { AwsFactory } from 'bigband-core'

import { CreateChangeSetInput, ExecuteChangeSetInput, DescribeChangeSetInput, DescribeChangeSetOutput, DescribeStacksInput, DescribeStacksOutput, Stack } from 'aws-sdk/clients/cloudformation';
import * as uuid from 'uuid/v1';
import * as hash from 'hash.js';
import {logger} from './logger';

const CHANGE_SET_CREATION_TIMEOUT_IN_SECONDS = 5 * 60;
const NO_FINGERPRINT = ''

function computeFingerprint(spec, name): string {
    const str = JSON.stringify({spec, name});
    return hash.sha256().update(str).digest('hex');
}

const FINGERPRINT_KEY = 'bigband_fingerprint'

export class CloudFormationPusher {

    private readonly cloudFormation: AWS.CloudFormation;
    private readonly stackName: string;
    private resolve: (s: Stack|undefined) => void;
    private reject: (e: Error) => void;
    private stackDescription: Promise<Stack|null>

    constructor(awsFactory: AwsFactory) {
        this.cloudFormation = awsFactory.newCloudFormation();
        this.stackName = awsFactory.stackName

        this.stackDescription = new Promise<Stack>((resolve, reject) => {
            this.resolve = resolve
            this.reject = reject
        });
    }

    async peekAtExistingStack() {
        const req: DescribeStacksInput = {
            StackName: this.stackName
        };
        let resp: DescribeStacksOutput;
        try {
            resp  = await this.cloudFormation.describeStacks(req).promise();
        } catch (e) {
            logger.silly(`Could not get the details of the stack (${this.stackName}`, e);
            this.resolve(undefined);
            return;    
        }

        logger.silly('describeStacks response=\n' + JSON.stringify(resp, null, 2))

        if (!resp.Stacks) {
            this.resolve(undefined);
            return;
        }
        
        if (resp.Stacks.length !== 1) {
            this.reject(new Error(`More than one stacks matched this name ${req.StackName}`))
            return
        }

        const stack: Stack = resp.Stacks[0];
        this.resolve(stack)
    }

    private async locatePreexistingStack() {
        const stackDescription: Stack|null = await this.stackDescription

        if (!stackDescription) {
            return NO_FINGERPRINT
        }

        if (stackDescription.StackStatus !== 'ROLLBACK_COMPLETE') {
            return extractFingerprint(stackDescription)
        }

        logger.info(`Cleaning up a cloudformation stack with the same name ("${this.stackName}") which was stuck ` + 
            `in "${stackDescription.StackStatus}" status`)
        await this.cloudFormation.deleteStack({StackName: this.stackName}).promise()
        await this.waitForStackDeletion(this.stackName)

        return NO_FINGERPRINT
    }

    async deploy(templateBody) {
        const existingFingerprint = await this.locatePreexistingStack()
        const newFingerprint = computeFingerprint(templateBody, this.stackName);

        logger.silly(`Fingerprint comparsion:\n  ${newFingerprint}\n  ${existingFingerprint}`);
        let shouldDeploy = areFingrprintsDifferent(existingFingerprint, newFingerprint)

        if (!shouldDeploy) {
            logger.info(`No stack changes`);
            return;
        }    

        const changeSetName = `cs-${uuid()}`;
        const stackId: string = await this.createChangeSet(templateBody, changeSetName, newFingerprint)
        if (!stackId) {
            // Falsy means 'empty-change-set'
            return
        }

        await this.enactChangeset(changeSetName, stackId)
    }


    async createChangeSet(templateBody, changeSetName: string, newFingerprint: string): Promise<string> {
        const createChangeSetReq: CreateChangeSetInput = {
            StackName: this.stackName,            
            ChangeSetName: changeSetName,
            ChangeSetType: 'UPDATE',
            Capabilities: ['CAPABILITY_IAM'],
            // TODO(imaman): put it in S3 to get a higher upper limit on the size of the stack.
            TemplateBody: JSON.stringify(templateBody),
            Tags: [
                {Key: FINGERPRINT_KEY, Value: newFingerprint}
            ]
        };

        logger.silly('StackSpec: ' + JSON.stringify(templateBody, null, 2));
        logger.silly('stack size in bytes: ' + JSON.stringify(templateBody).length);
        logger.silly('createChangeSetReq=\n' + JSON.stringify(createChangeSetReq, null, 2));
        logger.info(`Preparing a change set`);
        try {
            await this.cloudFormation.createChangeSet(createChangeSetReq).promise();
        } catch (e) {
            logger.silly(`createChangeSet() failed: ${e.code} -- "${e.message}"`)
            if (e.code !== 'ValidationError' || !e.message.startsWith('Stack') || !e.message.endsWith('does not exist')) {
                throw e;
            }

            logger.silly('Trying to create (instead of update)');
            createChangeSetReq.ChangeSetType = 'CREATE';
            await this.cloudFormation.createChangeSet(createChangeSetReq).promise();
        }

        const describeReq: DescribeChangeSetInput = {
            StackName: this.stackName,
            ChangeSetName: changeSetName
        };
        let description: DescribeChangeSetOutput;
        let iteration = 0;
        let t0 = Date.now();
        while (true) {
            showProgress(iteration);
            description = await this.cloudFormation.describeChangeSet(describeReq).promise();
            logger.silly('ChangeSet description=\n' + JSON.stringify(description, null, 2));
            if (description.Status !== "CREATE_IN_PROGRESS" && description.Status !== 'CREATE_PENDING') {
                break;
            }
            
            const timeInSeconds = Math.trunc((Date.now() - t0) / 1000);
            if (timeInSeconds > CHANGE_SET_CREATION_TIMEOUT_IN_SECONDS) {
                throw new Error(`change set creation did not complete in ${timeInSeconds}s. Bailing out.`)
            }
            ++iteration;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, iteration) * 5000));
        }

        const isFailed = description.Status === 'FAILED';
        if (isFailed && description.StatusReason === 'No updates are to be performed.')  {
            logger.info('Change set is empty');
            return ''
        }

        if (isFailed) {
            throw new Error(`Bad changeset (${changeSetName}):\n${description.StatusReason}`);
        }

        if (!description.StackId) {
            throw new Error('Found a fasly stack ID')
        }

        return description.StackId
    }

    private async enactChangeset(changeSetName: string, stackId: string) {
        const executeChangeSetReq: ExecuteChangeSetInput = {
            StackName: this.stackName,
            ChangeSetName: changeSetName,
        };

        logger.info('Enacting the change set');
        try {
            await this.cloudFormation.executeChangeSet(executeChangeSetReq).promise();
            await this.waitForStack(stackId);
        } catch (e) {
            logger.silly(`Changeset enactment error`);
            throw new Error(`Changeset enactment failed: ${e.message}`)
        }
    }

    private async waitForStack(stackId?: string) {
        // TODO(imaman): this functionality is duplicated in this file
        // TODO(imaman): use cloudformation.waitFor()

        if (!stackId) {
            throw new Error('StackId should not be falsy');
        }

        let iteration = 0;
        const t0 = Date.now();
        let stackDescription: DescribeStacksOutput;
        let status: string;
        logger.silly(`Waiting for stack (${stackId}) to be updated`);
        while (true) {
            showProgress(iteration);
            const describeReq: DescribeStacksInput = {
                StackName: stackId,
            };
            stackDescription = await this.cloudFormation.describeStacks(describeReq).promise();
            if (!stackDescription.Stacks) {
                throw new Error('Missing list of stacks in DescribeStacksOutput');
            }
            if (stackDescription.Stacks.length !== 1) {
                throw new Error(`Expected length to be exactly 1 but got ${stackDescription.Stacks.length}`);
            }

            status = stackDescription.Stacks[0].StackStatus;
            logger.silly('stackDescription.Stacks[0]=\n' + JSON.stringify(stackDescription.Stacks[0], null, 2))
            if (status === 'ROLLBACK_COMPLETE') {
                // See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-describing-stacks.html
                throw new Error(`Creation of Cloudformation stack "${stackId}" has failed. Aborting.`)
            }
            if (status.endsWith('_COMPLETE')) {
                break;
            }
            
            const timeInSeconds = Math.trunc((Date.now() - t0) / 1000);
            if (timeInSeconds > CHANGE_SET_CREATION_TIMEOUT_IN_SECONDS) {
                throw new Error(`change set execution did not complete in ${timeInSeconds}s. Bailing out.`)
            }
            ++iteration;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, iteration) * 5000));
        }

        logger.info(`Stack status: ${status}`);
        logger.silly(`stack ID: ${stackId}`);
        if (status !== 'CREATE_COMPLETE' && status !== 'UPDATE_COMPLETE') {
            throw new Error(`Stack alarm for stack ID ${stackId}. Current status: ${status}`);
        }
    }

    private async waitForStackDeletion(stackId?: string) {
        // TODO(imaman): this functionality is duplicated in this file
        
        if (!stackId) {
            throw new Error('StackId should not be falsy');
        }

        logger.silly(`stack ID: ${stackId}`);
 
        return new Promise(async (resolve, reject) => {
            let isWaiting = true
            this.cloudFormation.waitFor('stackDeleteComplete', {StackName: stackId}).promise()
                .then(() => {
                    isWaiting = false
                    resolve()
                })
                .catch(e => {
                    isWaiting = false
                    logger.silly('waitfor failed', e)
                    reject(new Error('Failed while waiting for stack to be deleted'))
                })

            let iteration = 0;
            const t0 = Date.now();
            logger.silly(`Waiting for stack (${stackId}) to be deleted`);
            while (isWaiting) {
                showProgress(iteration);
                
                const timeInSeconds = Math.trunc((Date.now() - t0) / 1000);
                if (timeInSeconds > CHANGE_SET_CREATION_TIMEOUT_IN_SECONDS) {
                    reject(new Error(`stack deletion did not complete in ${timeInSeconds}s. Bailing out.`))
                }
                ++iteration;
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, iteration) * 5000));
            }
        })
    }
}

function showProgress(n: number) {
    logger.info(new Array(n + 1).fill('.').join(''));
}


function areFingrprintsDifferent(existingFingerprint: string, newFingerprint: string) {
    if (existingFingerprint === NO_FINGERPRINT) {
        return true
    }

    return existingFingerprint !== newFingerprint
}

function extractFingerprint(stackDescription: Stack): string {
    if (!stackDescription || !stackDescription.Tags) {
        return NO_FINGERPRINT
    }

    const t = stackDescription.Tags.find(t => t.Key === FINGERPRINT_KEY);
    if (!t || !t.Value) {
        return NO_FINGERPRINT
    }

    return t.Value
}

// Errors found while running example/bigband.config.ts { InvalidChangeSetStatus: ChangeSet [arn:aws:cloudformation:eu-west-2:274788167589:stack/bb-example-prod-major/4361c080-e6bc-11e8-bca5-504dcd6bf9fe] cannot be executed in its current status of [FAILED]
//     at Request.extractError (/home/imaman/code/bigband/node_modules/aws-sdk/lib/protocol/query.js:47:29)
//     at Request.callListeners (/home/imaman/code/bigband/node_modules/aws-sdk/lib/sequential_executor.js:106:20)
//     at Request.emit (/home/imaman/code/bigband/node_modules/aws-sdk/lib/sequential_executor.js:78:10)
//     at Request.emit (/home/imaman/code/bigband/node_modules/aws-sdk/lib/request.js:683:14)
//     at Request.transition (/home/imaman/code/bigband/node_modules/aws-sdk/lib/request.js:22:10)
//     at AcceptorStateMachine.runTo (/home/imaman/code/bigband/node_modules/aws-sdk/lib/state_machine.js:14:12)
//     at /home/imaman/code/bigband/node_modules/aws-sdk/lib/state_machine.js:26:10
//     at Request.<anonymous> (/home/imaman/code/bigband/node_modules/aws-sdk/lib/request.js:38:9)
//     at Request.<anonymous> (/home/imaman/code/bigband/node_modules/aws-sdk/lib/request.js:685:12)
//     at Request.callListeners (/home/imaman/code/bigband/node_modules/aws-sdk/lib/sequential_executor.js:116:18)
//   message: 'ChangeSet [arn:aws:cloudformation:eu-west-2:274788167589:stack/bb-example-prod-major/4361c080-e6bc-11e8-bca5-504dcd6bf9fe] cannot be executed in its current status of [FAILED]',
//   code: 'InvalidChangeSetStatus',
//   time: 2019-02-18T17:09:10.902Z,
//   requestId: 'e8db3f9a-339f-11e9-b41a-ad391c940b6c',
//   statusCode: 400,
//   retryable: false,
//   retryDelay: 74.17778732792387 }
