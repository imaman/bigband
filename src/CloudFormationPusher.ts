import {AwsFactory} from './AwsFactory';

import { CreateChangeSetInput, UpdateStackInput, ExecuteChangeSetInput, CreateChangeSetOutput, ChangeSetType, DescribeChangeSetInput, DescribeChangeSetOutput, DescribeStacksInput, DescribeStacksOutput } from 'aws-sdk/clients/cloudformation';
import {Rig} from './runtime/Instrument';
import * as uuid from 'uuid/v1';

const CHANGE_SET_CREATION_TIMEOUT_IN_SECONDS = 5 * 60;

export class CloudFormationPusher {

    private readonly cloudFormation: AWS.CloudFormation;

    constructor(rig: Rig) {
        this.cloudFormation = AwsFactory.fromRig(rig).newCloudFormation();
    }

    async deploy(stackSpec, stackName: string) {
        const changeSetName = `cs-${uuid()}`;
        const createChangeSetReq: CreateChangeSetInput = {
            StackName: stackName,            
            ChangeSetName: changeSetName,
            ChangeSetType: 'UPDATE',
            Capabilities: ['CAPABILITY_IAM'],
            TemplateBody: JSON.stringify(stackSpec)
        };
        console.log('Creating change set');
        try {
            await this.cloudFormation.createChangeSet(createChangeSetReq).promise();
        } catch (e) {
            if (e.code !== 'ValidationError' || !e.message.startsWith('Stack') || !e.message.endsWith('does not exist')) {
                throw e;
            }

            console.log('Trying to create (instead of update)');
            createChangeSetReq.ChangeSetType = 'CREATE';
            await this.cloudFormation.createChangeSet(createChangeSetReq).promise();
        }

        const describeReq: DescribeChangeSetInput = {
            StackName: stackName,
            ChangeSetName: changeSetName
        };
        let description: DescribeChangeSetOutput;
        let iteration = 0;
        let t0 = Date.now();
        while (true) {
            console.log('Polling iteration #', iteration);
            description = await this.cloudFormation.describeChangeSet(describeReq).promise();
            console.log('ChangeSet created. description=\n' + JSON.stringify(description, null, 2));
            if (description.Status != "CREATE_IN_PROGRESS") {
                break;
            }
            
            const timeInSeconds = Math.trunc((Date.now() - t0) / 1000);
            if (timeInSeconds > CHANGE_SET_CREATION_TIMEOUT_IN_SECONDS) {
                throw new Error(`change set creation did not complete in ${timeInSeconds}s. Bailing out.`)
            }
            ++iteration;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, iteration) * 5000));
        }

        if (description.Status == 'FAILED' && description.StatusReason == 'No updates are to be performed.')  {
            console.log('Change set is empty');
            return;
        }
        const executeChangeSetReq: ExecuteChangeSetInput = {
            StackName: stackName,
            ChangeSetName: changeSetName,
        };
        const executeResp = await this.cloudFormation.executeChangeSet(executeChangeSetReq).promise();
        console.log('executeResp=', JSON.stringify(executeResp, null, 2));
        await this.waitForStack(description.StackId);

    }

    private async waitForStack(stackId?: string) {
        if (!stackId) {
            throw new Error('StackId should not be falsy');
        }

        let iteration = 0;
        const t0 = Date.now();
        let stackDescription: DescribeStacksOutput;
        let status: string;
        while (true) {
            console.log('Polling iteration #', iteration);
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

        console.log(`Stack status: ${status}; stack ID: ${stackId}`);
        if (status !== 'CREATE_COMPLETE' && status !== 'UPDATE_COMPLETE') {
            throw new Error(`Stack alarm for stack ID ${stackId}. Current status: ${status}`);
        }
    }
}

