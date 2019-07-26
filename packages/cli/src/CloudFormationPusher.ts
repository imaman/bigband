import { AwsFactory } from 'bigband-core'

import { CreateChangeSetInput, ExecuteChangeSetInput, DescribeChangeSetOutput, DescribeStacksInput, DescribeStacksOutput, Stack } from 'aws-sdk/clients/cloudformation';
import * as uuid from 'uuid/v1';
import * as hash from 'hash.js';
import {logger} from './logger';
import { WaiterConfiguration } from 'aws-sdk/lib/service';

const NO_FINGERPRINT = ''

// TODO(imaman): make it possible to control these with a flag 
//   (in case some huge CF stack needs more than 10m)
const WAITER: WaiterConfiguration = {
    delay: 5, 
    maxAttempts: 120 
}

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

        if (stackDescription.StackStatus === 'ROLLBACK_COMPLETE') {
            await this.removeStack()            
            return NO_FINGERPRINT
        }
        return extractFingerprint(stackDescription)
    }

    // TODO(imaman): if we somehow call this from the wrong place we will destroy a stack
    // and data will be lost. need to add safe guards:
    //   (i) better testing (despite the difficulty of testing AWS-intenstive code)
    //   (ii) hace this method check description of the stack on its own. delete the stack only if the status is
    //        ROLLBACK_COMPLETE + other conditions are met (no resources exist)
    private async removeStack() {
        logger.info(`Cleaning up a rolledback Cloudformation stack`)
        await this.cloudFormation.deleteStack({StackName: this.stackName}).promise()

        const req = {StackName: this.stackName, $waiter: WAITER}
        await this.waitFor('removal of rolledback stack',
            () => this.cloudFormation.waitFor('stackDeleteComplete', req).promise())
    }

    async deploy(templateBody) {
        const existingFingerprint = await this.locatePreexistingStack()
        const newFingerprint = computeFingerprint(templateBody, this.stackName);

        logger.silly(`Fingerprint comparsion:\n  ${newFingerprint}\n  ${existingFingerprint}`);
        let identical = areFingrprintsIdentical(existingFingerprint, newFingerprint)
        if (identical) {
            logger.info(`No stack changes`);
            return;
        }    

        const changeSetName = `cs-${uuid()}`;
        const hasChanges: boolean = await this.createChangeSet(templateBody, changeSetName, newFingerprint)
        if (!hasChanges) {
            return
        }

        // TODO(imaman): we need to verify here that we do not accidentally delete resource that maintain persistent
        // data (to prevent accidental loss of data). allow such deletion only if the instrument has
        // been marked for deletion.

        await this.enactChangeset(changeSetName)
    }


    async createChangeSet(templateBody, changeSetName: string, newFingerprint: string): Promise<boolean> {
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

        const req = {ChangeSetName: changeSetName, StackName: this.stackName, $waiter: WAITER}
        let description: DescribeChangeSetOutput|null = await this.waitFor('changeset creation',
                () => this.cloudFormation.waitFor('changeSetCreateComplete', req).promise())

        if (!description) {
            description = await this.cloudFormation.describeChangeSet(req).promise()
            logger.silly('got an explicit description')
        }

        logger.silly('description=' + JSON.stringify(description, null, 2))
        const isFailed = description.Status === 'FAILED';
        if (isFailed && (description.Changes || []).length === 0) {
            logger.silly('Change set is empty');
            return false
        }

        if (isFailed) {
            throw new Error(`Bad changeset (${changeSetName}):\n${description.StatusReason}`);
        }

        return true
    }

    private async enactChangeset(changeSetName: string) {
        const executeChangeSetReq: ExecuteChangeSetInput = {
            StackName: this.stackName,
            ChangeSetName: changeSetName,
        };

        logger.info('Enacting the change set');
        try {
            await this.cloudFormation.executeChangeSet(executeChangeSetReq).promise();

            const req = {StackName: this.stackName, $waiter: WAITER}
            await this.waitFor('changeset enactment',
                () => this.cloudFormation.waitFor('stackUpdateComplete', req).promise())
        } catch (e) {
            logger.silly(`Changeset enactment error`);
            throw new Error(`Changeset enactment failed: ${e.message}`)
        }
    }

    private async waitFor<T>(whatAreWeDoing: string, call: () => Promise<T>): Promise<T|null> {
        // TODO(imaman): this functionality is duplicated in this file
        
        return new Promise<T|null>(async (resolve, reject) => {
            let isWaiting = true

            call()
                .then((t: T) => {
                    isWaiting = false
                    logger.silly('waitfor succeeded')
                    resolve(t)
                })
                .catch(e => {
                    logger.silly('waitfor errored ', e)
                    isWaiting = false
                    // We intentially do not report an error here. Rationale: waiting for change-set-creation fails
                    // when the change set is empty which is not the behavior that we need. instead callers of 
                    // the CloudFormationPusher.waitFor() need to inspect the situation and determine  
                    resolve(null)
                })

            let iteration = 0;
            logger.silly(`Waiting for operation "${whatAreWeDoing}" to take place (stack name: "${this.stackName}")`);
            while (isWaiting) {
                showProgress(iteration);
        
                ++iteration;
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, iteration) * 5000));
            }
        })
    }
}

function showProgress(n: number) {
    logger.info(new Array(n + 1).fill('.').join(''));
}


function areFingrprintsIdentical(existingFingerprint: string, newFingerprint: string) {
    if (existingFingerprint === NO_FINGERPRINT) {
        return false
    }

    return existingFingerprint === newFingerprint
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
