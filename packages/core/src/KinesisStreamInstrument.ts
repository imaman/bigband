import {Instrument} from './Instrument'
import {Section} from './Section'
import {Definition} from './Definition'
import {DeployableFragment} from './DeployableFragment'

export class KinesisStreamInstrument extends Instrument {
    private static readonly BASE_DEF = {
        Type: "AWS::Kinesis::Stream",
        Properties: {
            RetentionPeriodHours: 24,
        }
    }

    constructor(packageName: string, name: string, shardCount: number) {
        super(packageName, name);

        this.definition.overwrite(KinesisStreamInstrument.BASE_DEF);
        this.definition.mutate(o => Object.assign(o.Properties, {
            ShardCount: shardCount
        }));
    }

    arnService() {
        return 'kinesis'
    }

    arnType() {
        return 'stream/'
    }

    createFragment(pathPrefix: string): DeployableFragment {
        return new DeployableFragment();
    }

    contributeToConsumerDefinition(section: Section, consumerDef: Definition, myArn: string): void {
        consumerDef.mutate(o => o.Properties.Policies.push({
            Version: '2012-10-17',
            Statement: [{ 
                Effect: "Allow",
                Action: [
                  'kinesis:*'
                ],
                // TODO(imaman): can be (probably) replaced with a Cloudformation reference to the logical name
                Resource: myArn
            }]
        }));
    }
    
    nameProperty(): string {
        return 'Name';
    }

    getEntryPointFile(): string {
        return "";
    }
}

