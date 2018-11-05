import * as AWS from 'aws-sdk'
import { CreateChangeSetInput, UpdateStackInput, ExecuteChangeSetInput, CreateChangeSetOutput, ChangeSetType, DescribeChangeSetInput, DescribeChangeSetOutput } from 'aws-sdk/clients/cloudformation';
import * as uuid from 'uuid/v1';

AWS.config.setPromisesDependency(Promise);

const CHANGE_SET_CREATION_TIMEOUT_IN_SECONDS = 5 * 60;

export class CloudFormationPusher {

    private readonly cloudFormation: AWS.CloudFormation;

    constructor(region) {
        this.cloudFormation = new AWS.CloudFormation({region});
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
        const t0 = Date.now();
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
    }
}

